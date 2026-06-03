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
        
        if (empty($mappedKeys['designation'])) {
            $this->errors[] = "La colonne contenant la désignation du produit (ex: 'Désignation', 'Nom') est introuvable.";
            return;
        }

        DB::beginTransaction();
        try {
            $rowIndex = 1;

            foreach ($rows as $row) {
                $rowIndex++;
                $data = $row->toArray();

                $invNo = isset($mappedKeys['inventory_number']) ? trim($data[$mappedKeys['inventory_number']] ?? '') : '';
                $categoryName = isset($mappedKeys['category']) ? trim($data[$mappedKeys['category']] ?? '') : '';
                $quantity = isset($mappedKeys['quantity']) ? intval($data[$mappedKeys['quantity']] ?? 0) : 0;
                $designation = isset($mappedKeys['designation']) ? trim($data[$mappedKeys['designation']] ?? '') : '';
                $location = isset($mappedKeys['location']) ? trim($data[$mappedKeys['location']] ?? '') : '';
                $brand = isset($mappedKeys['brand']) ? trim($data[$mappedKeys['brand']] ?? '') : '';
                $serialNumber = isset($mappedKeys['serial_number']) ? trim($data[$mappedKeys['serial_number']] ?? '') : '';
                $userService = isset($mappedKeys['user_service']) ? trim($data[$mappedKeys['user_service']] ?? '') : '';
                $purchaseReference = isset($mappedKeys['purchase_reference']) ? trim($data[$mappedKeys['purchase_reference']] ?? '') : '';
                $price = isset($mappedKeys['price']) ? floatval($data[$mappedKeys['price']] ?? 0) : 0;

                // Sauter les lignes vides
                $nonEmptyValues = array_filter($data, function ($val) {
                    return $val !== null && trim((string)$val) !== '';
                });
                if (empty($nonEmptyValues)) {
                    continue;
                }

                // Validation
                $validator = Validator::make([
                    'inventory_number'   => $invNo ?: null,
                    'category'           => $categoryName ?: 'Général',
                    'quantity'           => $quantity,
                    'designation'        => $designation,
                    'location'           => $location ?: null,
                    'brand'              => $brand ?: null,
                    'serial_number'      => $serialNumber ?: null,
                    'user_service'       => $userService ?: null,
                    'purchase_reference' => $purchaseReference ?: null,
                    'price'              => $price,
                ], [
                    'inventory_number'   => 'nullable|string|max:100',
                    'category'           => 'required|string|max:255',
                    'quantity'           => 'required|integer|min:0',
                    'designation'        => 'required|string|max:2000',
                    'location'           => 'nullable|string|max:255',
                    'brand'              => 'nullable|string|max:255',
                    'serial_number'      => 'nullable|string|max:255',
                    'user_service'       => 'nullable|string|max:255',
                    'purchase_reference' => 'nullable|string|max:255',
                    'price'              => 'required|numeric|min:0',
                ], [
                    'designation.required'     => "La désignation est requise.",
                    'category.required'        => "La famille (catégorie) est requise.",
                    'price.required'           => "Le prix d'acquisition est requis.",
                    'price.numeric'            => "Le prix doit être un nombre.",
                    'price.min'                => "Le prix doit être supérieur ou égal à 0.",
                    'quantity.required'        => "La quantité est requise.",
                    'quantity.integer'         => "La quantité doit être un nombre entier.",
                    'quantity.min'             => "La quantité doit être supérieure ou égale à 0.",
                ]);

                if ($validator->fails()) {
                    $displayName = !empty($designation) ? $designation : "Ligne sans désignation";
                    foreach ($validator->errors()->all() as $error) {
                        $this->errors[] = "Ligne {$rowIndex} ({$displayName}) : {$error}";
                    }
                    continue;
                }

                // Trouver ou créer la catégorie (Famille)
                $category = Category::firstOrCreate(
                    ['name' => $categoryName ?: 'Général'],
                    ['description' => 'Famille ' . ($categoryName ?: 'Général')]
                );

                // Recherche doublon par inventory_number ou designation
                $product = null;
                if (!empty($invNo)) {
                    $product = Product::where('inventory_number', $invNo)->first();
                }
                if (!$product) {
                    $product = Product::where('designation', $designation)->first();
                }

                $originalQuantity = 0;
                if ($product) {
                    $originalQuantity = $product->quantity;
                    $product->update([
                        'designation'        => $designation,
                        'category_id'        => $category->id,
                        'price'              => $price,
                        'quantity'           => $quantity,
                        'location'           => $location ?: $product->location,
                        'brand'              => $brand ?: $product->brand,
                        'serial_number'      => $serialNumber ?: $product->serial_number,
                        'user_service'       => $userService ?: $product->user_service,
                        'purchase_reference' => $purchaseReference ?: $product->purchase_reference,
                    ]);
                } else {
                    $product = Product::create([
                        'inventory_number'   => $invNo ?: null,
                        'designation'        => $designation,
                        'category_id'        => $category->id,
                        'price'              => $price,
                        'quantity'           => $quantity,
                        'location'           => $location,
                        'brand'              => $brand,
                        'serial_number'      => $serialNumber,
                        'user_service'       => $userService,
                        'purchase_reference' => $purchaseReference,
                        'alert_threshold'    => 0,
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
            'inventory_number'   => null,
            'category'           => null,
            'quantity'           => null,
            'designation'        => null,
            'location'           => null,
            'brand'              => null,
            'serial_number'      => null,
            'user_service'       => null,
            'purchase_reference' => null,
            'price'              => null,
        ];

        foreach ($keys as $key) {
            $normalized = strtolower(trim(str_replace(['_', ' ', '-', '°', "'"], '', $key)));
            
            if (in_array($normalized, ['ndinvdpiepeecfbs', 'ndinv', 'inventorynumber', 'codebarres', 'barcode', 'codebarre'])) {
                $map['inventory_number'] = $key;
            } elseif (in_array($normalized, ['famille', 'categorie', 'category', 'cat'])) {
                $map['category'] = $key;
            } elseif (in_array($normalized, ['quantite', 'quantity', 'qty', 'quantiteenstock'])) {
                $map['quantity'] = $key;
            } elseif (in_array($normalized, ['designation', 'nom', 'name', 'produit', 'product'])) {
                $map['designation'] = $key;
            } elseif (in_array($normalized, ['localisation', 'location', 'local'])) {
                $map['location'] = $key;
            } elseif (in_array($normalized, ['marque', 'brand', 'make'])) {
                $map['brand'] = $key;
            } elseif (in_array($normalized, ['ndeserie', 'serialnumber', 'sn', 'serial'])) {
                $map['serial_number'] = $key;
            } elseif (in_array($normalized, ['serviceutilisateur', 'userservice', 'service'])) {
                $map['user_service'] = $key;
            } elseif (in_array($normalized, ['referenceachat', 'purchasereference', 'refachat'])) {
                $map['purchase_reference'] = $key;
            } elseif (in_array($normalized, ['prixdacquisitionhtunitaire', 'prixdacquisition', 'prix', 'price'])) {
                $map['price'] = $key;
            }
        }

        return $map;
    }
}
