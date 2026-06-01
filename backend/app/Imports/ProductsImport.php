<?php

namespace App\Imports;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ProductsImport implements ToCollection, WithHeadingRow
{
    protected $errors = [];
    protected $importedCount = 0;
    protected $userId;

    public function __construct($userId)
    {
        $this->userId = $userId;
    }

    public function collection(Collection $rows)
    {
        if ($rows->isEmpty()) {
            $this->errors[] = "Le fichier Excel est vide.";
            return;
        }

        $firstRow = $rows->first()->toArray();
        $mappedKeys = $this->mapHeaders(array_keys($firstRow));
        
        if (empty($mappedKeys['name'])) {
            $this->errors[] = "La colonne contenant le nom du produit (ex: 'Nom', 'name') est introuvable.";
            return;
        }

        DB::beginTransaction();
        try {
            $rowIndex = 1; // Le header est la ligne 1, donc la première ligne de données est la ligne 2

            foreach ($rows as $row) {
                $rowIndex++;
                $data = $row->toArray();

                $name = isset($mappedKeys['name']) ? trim($data[$mappedKeys['name']] ?? '') : '';
                $description = isset($mappedKeys['description']) ? trim($data[$mappedKeys['description']] ?? '') : '';
                $categoryName = isset($mappedKeys['category']) ? trim($data[$mappedKeys['category']] ?? '') : '';
                $price = isset($mappedKeys['price']) ? $data[$mappedKeys['price']] : null;
                $quantity = isset($mappedKeys['quantity']) ? $data[$mappedKeys['quantity']] : 0;
                $threshold = isset($mappedKeys['threshold']) ? $data[$mappedKeys['threshold']] : 10;
                $barcode = isset($mappedKeys['barcode']) ? trim($data[$mappedKeys['barcode']] ?? '') : '';
                $supplier = isset($mappedKeys['supplier']) ? trim($data[$mappedKeys['supplier']] ?? '') : '';

                // Sauter les lignes complètement vides
                $nonEmptyValues = array_filter($data, function ($val) {
                    return $val !== null && trim((string)$val) !== '';
                });
                if (empty($nonEmptyValues)) {
                    continue;
                }

                // Validation
                $validator = Validator::make([
                    'name'            => $name,
                    'description'     => $description ?: null,
                    'category'        => $categoryName ?: 'Général',
                    'price'           => $price,
                    'quantity'        => $quantity,
                    'alert_threshold' => $threshold,
                    'barcode'         => $barcode ?: null,
                    'supplier'        => $supplier ?: null,
                ], [
                    'name'            => 'required|string|max:255',
                    'description'     => 'nullable|string|max:2000',
                    'category'        => 'required|string|max:255|exists:categories,name',
                    'price'           => 'required|numeric|min:0',
                    'quantity'        => 'required|integer|min:0',
                    'alert_threshold' => 'required|integer|min:0',
                    'barcode'         => 'nullable|string|max:100',
                    'supplier'        => 'nullable|string|max:255',
                ], [
                    'name.required'            => "Le nom du produit est requis.",
                    'category.required'        => "La catégorie est requise.",
                    'category.exists'          => "La catégorie \":value\" n'existe pas. Veuillez la créer d'abord.",
                    'price.required'           => "Le prix est requis.",
                    'price.numeric'            => "Le prix doit être un nombre.",
                    'price.min'                => "Le prix doit être supérieur ou égal à 0.",
                    'quantity.required'        => "La quantité est requise.",
                    'quantity.integer'         => "La quantité doit être un nombre entier.",
                    'quantity.min'             => "La quantité doit être supérieure ou égale à 0.",
                    'alert_threshold.required' => "Le seuil d'alerte est requis.",
                    'alert_threshold.integer'  => "Le seuil d'alerte doit être un nombre entier.",
                    'alert_threshold.min'      => "Le seuil d'alerte doit être supérieur ou égal à 0.",
                ]);

                if ($validator->fails()) {
                    $displayName = !empty($name) ? $name : "Ligne sans nom";
                    foreach ($validator->errors()->all() as $error) {
                        $this->errors[] = "Ligne {$rowIndex} ({$displayName}) : {$error}";
                    }
                    continue;
                }

                // Trouver la catégorie (qui existe forcément grâce à la validation exists)
                $category = Category::where('name', $categoryName ?: 'Général')->first();

                // Recherche doublon par code-barres ou par nom
                $product = null;
                if (!empty($barcode)) {
                    $product = Product::where('barcode', $barcode)->first();
                }
                if (!$product) {
                    $product = Product::where('name', $name)->first();
                }

                $originalQuantity = 0;
                if ($product) {
                    $originalQuantity = $product->quantity;
                    $product->update([
                        'name'            => $name,
                        'description'     => $description ?: $product->description,
                        'category_id'     => $category->id,
                        'price'           => $price,
                        'quantity'        => $quantity,
                        'alert_threshold' => $threshold,
                        'supplier'        => $supplier ?: $product->supplier,
                    ]);
                } else {
                    $product = Product::create([
                        'name'            => $name,
                        'description'     => $description,
                        'category_id'     => $category->id,
                        'price'           => $price,
                        'quantity'        => $quantity,
                        'alert_threshold' => $threshold,
                        'barcode'         => $barcode ?: null,
                        'supplier'        => $supplier,
                    ]);
                }

                // Ajustement du stock (mouvement)
                $diff = $quantity - $originalQuantity;
                if ($diff != 0) {
                    $product->stockMovements()->create([
                        'user_id'   => $this->userId,
                        'type'      => $diff > 0 ? 'entry' : 'exit',
                        'quantity'  => abs($diff),
                        'reference' => 'IMP-' . strtoupper(substr(md5(uniqid()), 0, 8)),
                        'notes'     => 'Ajustement de stock via importation Excel.',
                    ]);
                }

                $this->importedCount++;
            }

            if (!empty($this->errors)) {
                DB::rollBack();
            } else {
                DB::commit();
            }
        } catch (\Exception $e) {
            DB::rollBack();
            $this->errors[] = "Erreur système durant l'importation : " . $e->getMessage();
        }
    }

    public function getErrors()
    {
        return $this->errors;
    }

    public function getImportedCount()
    {
        return $this->importedCount;
    }

    private function mapHeaders(array $keys): array
    {
        $map = [
            'name'        => null,
            'description' => null,
            'category'    => null,
            'price'       => null,
            'quantity'    => null,
            'threshold'   => null,
            'barcode'     => null,
            'supplier'    => null,
        ];

        foreach ($keys as $key) {
            $normalized = strtolower(trim(str_replace(['_', ' ', '-'], '', $key)));
            
            if (in_array($normalized, ['nom', 'name', 'produit', 'product'])) {
                $map['name'] = $key;
            } elseif (in_array($normalized, ['description', 'desc', 'details', 'detail'])) {
                $map['description'] = $key;
            } elseif (in_array($normalized, ['categorie', 'category', 'cat'])) {
                $map['category'] = $key;
            } elseif (in_array($normalized, ['prix', 'price', 'prixunitaire', 'prixunitairefcfa', 'prixunitairedh'])) {
                $map['price'] = $key;
            } elseif (in_array($normalized, ['quantite', 'quantity', 'qty', 'quantiteenstock'])) {
                $map['quantity'] = $key;
            } elseif (in_array($normalized, ['seuil', 'seuildalerte', 'threshold', 'alertthreshold'])) {
                $map['threshold'] = $key;
            } elseif (in_array($normalized, ['codebarres', 'barcode', 'codebarre'])) {
                $map['barcode'] = $key;
            } elseif (in_array($normalized, ['fournisseur', 'supplier'])) {
                $map['supplier'] = $key;
            }
        }

        return $map;
    }
}
