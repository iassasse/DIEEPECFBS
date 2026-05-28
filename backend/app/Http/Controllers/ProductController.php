<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\ProductsExport;
use App\Imports\ProductsImport;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with('category');

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('supplier', 'like', "%{$search}%");
            });
        }

        // Filter by category
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by stock status
        if ($request->filled('stock_status')) {
            if ($request->stock_status === 'low') {
                $query->whereRaw('quantity <= alert_threshold');
            } elseif ($request->stock_status === 'out') {
                $query->where('quantity', 0);
            } elseif ($request->stock_status === 'ok') {
                $query->whereRaw('quantity > alert_threshold');
            }
        }

        $perPage = (int)($request->per_page ?? 15);
        $products = $query->orderBy('name')->paginate($perPage);

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'description'     => 'nullable|string|max:2000',
            'category_id'     => 'required|exists:categories,id',
            'quantity'        => 'required|integer|min:0',
            'price'           => 'required|numeric|min:0',
            'barcode'         => 'nullable|string|max:100|unique:products,barcode',
            'supplier'        => 'nullable|string|max:255',
            'alert_threshold' => 'required|integer|min:0',
        ]);

        $product = Product::create($validated);
        $product->load('category');

        // Notify if initial quantity is low
        if ($product->quantity <= $product->alert_threshold && $product->quantity > 0) {
            $this->notifyLowStock($product);
        }

        // Create initial stock movement if quantity > 0
        if ($validated['quantity'] > 0) {
            $product->stockMovements()->create([
                'user_id'   => $request->user()->id,
                'type'      => 'entry',
                'quantity'  => $validated['quantity'],
                'reference' => 'INIT-' . strtoupper(substr(md5($product->id), 0, 6)),
                'notes'     => 'Stock initial à la création du produit',
            ]);
        }

        return response()->json($product, 201);
    }

    public function show(Product $product)
    {
        $product->load(['category', 'stockMovements.user' => function ($q) {
            $q->select('id', 'name', 'email');
        }]);
        return response()->json($product);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'description'     => 'nullable|string|max:2000',
            'category_id'     => 'required|exists:categories,id',
            'quantity'        => 'required|integer|min:0',
            'price'           => 'required|numeric|min:0',
            'barcode'         => ['nullable', 'string', 'max:100', Rule::unique('products', 'barcode')->ignore($product->id)],
            'supplier'        => 'nullable|string|max:255',
            'alert_threshold' => 'required|integer|min:0',
        ]);

        $product->update($validated);
        $product->load('category');

        // Check low stock after update
        if ($product->quantity <= $product->alert_threshold) {
            $this->notifyLowStock($product);
        }

        return response()->json($product);
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(['message' => 'Produit supprimé avec succès.']);
    }

    private function notifyLowStock(Product $product): void
    {
        $admins = User::role(['Admin', 'Gestionnaire'])->get();
        foreach ($admins as $admin) {
            $admin->notifications()->create([
                'id'   => \Illuminate\Support\Str::uuid(),
                'type' => 'App\\Notifications\\LowStockNotification',
                'data' => json_encode([
                    'type'       => 'low_stock',
                    'title'      => 'Stock Faible',
                    'message'    => "Le produit \"{$product->name}\" a atteint son seuil d'alerte (quantité: {$product->quantity}, seuil: {$product->alert_threshold}).",
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity'   => $product->quantity,
                    'threshold'  => $product->alert_threshold,
                ]),
            ]);
        }
    }

    public function export(Request $request)
    {
        $format = $request->query('format', 'xlsx');
        $isTemplate = $request->boolean('template', false);
        $filename = $isTemplate ? 'modele_produits' : 'produits_' . date('Ymd_His');

        $excelFormat = \Maatwebsite\Excel\Excel::XLSX;
        if (strtolower($format) === 'csv') {
            $excelFormat = \Maatwebsite\Excel\Excel::CSV;
            $filename .= '.csv';
        } else {
            $filename .= '.xlsx';
        }

        return Excel::download(
            new ProductsExport($request->only(['search', 'category_id', 'stock_status']), $isTemplate),
            $filename,
            $excelFormat
        );
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:10240',
        ], [
            'file.required' => 'Veuillez sélectionner un fichier à importer.',
            'file.mimes' => 'Le fichier doit être de type Excel (.xlsx, .xls) ou CSV (.csv).',
            'file.max' => 'La taille du fichier ne doit pas dépasser 10 Mo.',
        ]);

        $import = new ProductsImport($request->user()->id);
        Excel::import($import, $request->file('file'));

        $errors = $import->getErrors();

        if (!empty($errors)) {
            return response()->json([
                'message' => "L'importation a échoué car le fichier contient des données invalides ou des colonnes manquantes.",
                'errors' => $errors
            ], 422);
        }

        return response()->json([
            'message' => "Importation réussie de {$import->getImportedCount()} produit(s) !",
            'count' => $import->getImportedCount()
        ]);
    }
}
