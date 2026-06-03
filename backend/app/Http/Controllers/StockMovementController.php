<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\StockMovementsExport;

class StockMovementController extends Controller
{
    public function index(Request $request)
    {
        $query = StockMovement::with(['product.category', 'user' => function ($q) {
            $q->select('id', 'name', 'email');
        }]);

        // Filter by product
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        // Filter by type
        if ($request->filled('type') && in_array($request->type, ['entry', 'exit'])) {
            $query->where('type', $request->type);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Search by reference
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhereHas('product', function ($pq) use ($search) {
                      $pq->where('designation', 'like', "%{$search}%")
                        ->orWhere('inventory_number', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = (int)($request->per_page ?? 15);
        $movements = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json($movements);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'type'       => 'required|in:entry,exit',
            'quantity'   => 'required|integer|min:1',
            'reference'  => 'nullable|string|max:100',
            'notes'      => 'nullable|string|max:1000',
        ]);

        $product = Product::findOrFail($validated['product_id']);

        // Validate stock availability for exits
        if ($validated['type'] === 'exit' && $product->quantity < $validated['quantity']) {
            return response()->json([
                'message' => "Stock insuffisant. Disponible: {$product->quantity}, Demandé: {$validated['quantity']}."
            ], 422);
        }

        DB::transaction(function () use (&$validated, &$product, $request) {
            // Auto-generate reference if empty
            if (empty($validated['reference'])) {
                $prefix = $validated['type'] === 'entry' ? 'ENT' : 'SOR';
                $validated['reference'] = $prefix . '-' . strtoupper(substr(md5(uniqid()), 0, 8));
            }

            $validated['user_id'] = $request->user()->id;

            // Create movement
            $movement = StockMovement::create($validated);

            // Update product quantity
            if ($validated['type'] === 'entry') {
                $product->increment('quantity', $validated['quantity']);
            } else {
                $product->decrement('quantity', $validated['quantity']);
            }

            $product->refresh();

            // Notify if stock is now low
            if ($product->quantity <= $product->alert_threshold) {
                $this->notifyLowStock($product, $request->user());
            }
        });

        // Return the created movement with relations
        $movement = StockMovement::with(['product.category', 'user' => function ($q) {
            $q->select('id', 'name', 'email');
        }])->where('reference', $validated['reference'])->latest()->first();

        return response()->json($movement, 201);
    }

    public function show(StockMovement $stockMovement)
    {
        return response()->json($stockMovement->load(['product.category', 'user']));
    }

    public function destroy(StockMovement $stockMovement)
    {
        // Reverse the movement on the product
        DB::transaction(function () use ($stockMovement) {
            $product = $stockMovement->product;

            if ($stockMovement->type === 'entry') {
                $product->decrement('quantity', $stockMovement->quantity);
            } else {
                $product->increment('quantity', $stockMovement->quantity);
            }

            $stockMovement->delete();
        });

        return response()->json(['message' => 'Mouvement annulé et stock mis à jour.']);
    }

    public function destroyBulk(Request $request)
    {
        if ($request->boolean('all')) {
            if (!$request->user()->hasRole('Admin')) {
                return response()->json(['message' => 'Accès non autorisé. Seuls les administrateurs peuvent tout supprimer.'], 403);
            }

            DB::transaction(function () {
                StockMovement::query()->delete();
                Product::query()->update(['quantity' => 0]);
            });

            return response()->json(['message' => 'Tous les mouvements ont été supprimés et les stocks réinitialisés à 0.']);
        }

        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:stock_movements,id'
        ]);

        DB::transaction(function () use ($validated) {
            $movements = StockMovement::whereIn('id', $validated['ids'])->get();
            foreach ($movements as $m) {
                $product = $m->product;
                if ($product) {
                    if ($m->type === 'entry') {
                        $product->decrement('quantity', $m->quantity);
                    } else {
                        $product->increment('quantity', $m->quantity);
                    }
                }
                $m->delete();
            }
        });

        return response()->json(['message' => 'Les mouvements sélectionnés ont été annulés et les stocks mis à jour.']);
    }

    private function notifyLowStock(Product $product, User $currentUser): void
    {
        $admins = User::role(['Admin', 'Gestionnaire'])->get();
        foreach ($admins as $admin) {
            $admin->notifications()->create([
                'id'   => \Illuminate\Support\Str::uuid(),
                'type' => 'App\\Notifications\\LowStockNotification',
                'data' => json_encode([
                    'type'         => 'low_stock',
                    'title'        => 'Stock Faible',
                    'message'      => "Le produit \"{$product->designation}\" a un stock faible (quantité: {$product->quantity}, seuil: {$product->alert_threshold}).",
                    'product_id'   => $product->id,
                    'product_name' => $product->designation,
                    'quantity'     => $product->quantity,
                    'threshold'    => $product->alert_threshold,
                ]),
            ]);
        }
    }

    public function export(Request $request)
    {
        $format = $request->query('format', 'xlsx');
        $filename = 'mouvements_stock_' . date('Ymd_His');

        $excelFormat = \Maatwebsite\Excel\Excel::XLSX;
        if (strtolower($format) === 'csv') {
            $excelFormat = \Maatwebsite\Excel\Excel::CSV;
            $filename .= '.csv';
        } else {
            $filename .= '.xlsx';
        }

        return Excel::download(
            new StockMovementsExport($request->only(['search', 'product_id', 'type', 'date_from', 'date_to'])),
            $filename,
            $excelFormat
        );
    }
}
