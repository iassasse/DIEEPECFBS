<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Category;
use Illuminate\Support\Facades\DB;
use Dompdf\Dompdf;
use Dompdf\Options;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\GenericReportExport;

class ReportController extends Controller
{
    private function checkPermission(Request $request)
    {
        if (!$request->user() || !$request->user()->hasPermissionTo('view reports')) {
            abort(403, 'Accès non autorisé. Vous n\'avez pas la permission de consulter les rapports.');
        }
    }

    public function index(Request $request)
    {
        $this->checkPermission($request);
        $data = $this->getReportData($request);
        return response()->json($data);
    }

    public function exportPdf(Request $request)
    {
        $this->checkPermission($request);
        $report = $this->getReportData($request);

        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isPhpEnabled', true);
        
        $dompdf = new Dompdf($options);
        
        $html = view('reports.pdf', $report)->render();
        
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        
        $filename = 'rapport_' . $report['type'] . '_' . date('Ymd_His') . '.pdf';
        
        return response($dompdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="' . $filename . '"');
    }

    public function exportExcel(Request $request)
    {
        $this->checkPermission($request);
        $report = $this->getReportData($request);
        $type = $report['type'];
        $items = $report['items'];
        
        $headings = [];
        $data = [];
        $color = '3B82F6'; // Default Blue
        $filename = 'rapport_';
        
        if ($type === 'stock') {
            $filename .= 'stock_' . date('Ymd_His') . '.xlsx';
            $headings = [
                'Nom du produit',
                'Code-barres',
                'Catégorie',
                'Quantité en stock',
                'Prix unitaire (DH)',
                'Valeur du stock (DH)',
                'Seuil d\'alerte',
                'Statut'
            ];
            foreach ($items as $item) {
                $statusStr = $item['status'] === 'out' ? 'Rupture' : ($item['status'] === 'low' ? 'Faible' : 'Normal');
                $data[] = [
                    $item['name'],
                    $item['barcode'],
                    $item['category_name'],
                    $item['quantity'],
                    $item['price'],
                    $item['stock_value'],
                    $item['alert_threshold'],
                    $statusStr
                ];
            }
            $color = '3B82F6'; // Blue
        } elseif ($type === 'movements') {
            $filename .= 'mouvements_' . date('Ymd_His') . '.xlsx';
            $headings = [
                'Référence',
                'Nom du produit',
                'Code-barres',
                'Catégorie',
                'Type',
                'Quantité',
                'Opérateur',
                'Date',
                'Notes'
            ];
            foreach ($items as $item) {
                $typeStr = $item['type'] === 'entry' ? 'Entrée' : 'Sortie';
                $data[] = [
                    $item['reference'],
                    $item['product_name'],
                    $item['product_barcode'],
                    $item['category_name'],
                    $typeStr,
                    $item['quantity'],
                    $item['user_name'],
                    $item['created_at'],
                    $item['notes']
                ];
            }
            $color = '10B981'; // Emerald
        } elseif ($type === 'valuation') {
            $filename .= 'valorisation_' . date('Ymd_His') . '.xlsx';
            $headings = [
                'Nom du produit',
                'Code-barres',
                'Catégorie',
                'Fournisseur',
                'Quantité en stock',
                'Prix unitaire (DH)',
                'Valeur totale (DH)'
            ];
            foreach ($items as $item) {
                $data[] = [
                    $item['name'],
                    $item['barcode'],
                    $item['category_name'],
                    $item['supplier'],
                    $item['quantity'],
                    $item['price'],
                    $item['stock_value']
                ];
            }
            $color = '8B5CF6'; // Violet
        }
        
        return Excel::download(
            new GenericReportExport($data, $headings, $color),
            $filename
        );
    }

    private function getReportData(Request $request)
    {
        $type = $request->query('type', 'stock'); // stock, movements, valuation
        $categoryId = $request->query('category_id');
        $productId = $request->query('product_id');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $stockStatus = $request->query('stock_status'); // low, out, ok
        
        if ($type === 'stock') {
            $query = Product::with('category');
            
            if ($categoryId) {
                $query->where('category_id', $categoryId);
            }
            if ($productId) {
                $query->where('id', $productId);
            }
            if ($stockStatus) {
                if ($stockStatus === 'low') {
                    $query->whereRaw('quantity <= alert_threshold');
                } elseif ($stockStatus === 'out') {
                    $query->where('quantity', 0);
                } elseif ($stockStatus === 'ok') {
                    $query->whereRaw('quantity > alert_threshold');
                }
            }
            
            $products = $query->orderBy('name')->get();
            
            $items = [];
            $totalProducts = 0;
            $totalStockValue = 0;
            $lowStockCount = 0;
            $outOfStockCount = 0;
            
            foreach ($products as $p) {
                $totalProducts++;
                $val = $p->quantity * $p->price;
                $totalStockValue += $val;
                
                $status = 'normal';
                if ($p->quantity == 0) {
                    $status = 'out';
                    $outOfStockCount++;
                } elseif ($p->quantity <= $p->alert_threshold) {
                    $status = 'low';
                    $lowStockCount++;
                }
                
                $items[] = [
                    'id'              => $p->id,
                    'name'            => $p->name,
                    'barcode'         => $p->barcode,
                    'category_name'   => $p->category?->name ?? 'Général',
                    'quantity'        => $p->quantity,
                    'price'           => $p->price,
                    'stock_value'     => $val,
                    'alert_threshold' => $p->alert_threshold,
                    'status'          => $status
                ];
            }
            
            return [
                'type' => 'stock',
                'stats' => [
                    'total_products'     => $totalProducts,
                    'total_stock_value'  => $totalStockValue,
                    'low_stock_count'    => $lowStockCount,
                    'out_of_stock_count' => $outOfStockCount,
                ],
                'items' => $items
            ];
        } elseif ($type === 'movements') {
            $query = StockMovement::with(['product.category', 'user']);
            
            if ($productId) {
                $query->where('product_id', $productId);
            }
            if ($categoryId) {
                $query->whereHas('product', function ($q) use ($categoryId) {
                    $q->where('category_id', $categoryId);
                });
            }
            if ($startDate) {
                $query->where('created_at', '>=', $startDate . ' 00:00:00');
            }
            if ($endDate) {
                $query->where('created_at', '<=', $endDate . ' 23:59:59');
            }
            if ($request->query('movement_type')) { // entry or exit
                $query->where('type', $request->query('movement_type'));
            }
            
            $movements = $query->orderBy('created_at', 'desc')->get();
            
            $items = [];
            $totalMovements = 0;
            $totalEntries = 0;
            $totalExits = 0;
            
            foreach ($movements as $m) {
                $totalMovements++;
                if ($m->type === 'entry') {
                    $totalEntries += $m->quantity;
                } else {
                    $totalExits += $m->quantity;
                }
                
                $items[] = [
                    'id'              => $m->id,
                    'reference'       => $m->reference,
                    'product_name'    => $m->product?->name ?? 'Produit supprimé',
                    'product_barcode' => $m->product?->barcode ?? '-',
                    'category_name'   => $m->product?->category?->name ?? 'Général',
                    'type'            => $m->type,
                    'quantity'        => $m->quantity,
                    'user_name'       => $m->user?->name ?? 'Inconnu',
                    'created_at'      => $m->created_at->format('Y-m-d H:i:s'),
                    'notes'           => $m->notes ?? ''
                ];
            }
            
            return [
                'type' => 'movements',
                'stats' => [
                    'total_movements' => $totalMovements,
                    'total_entries'   => $totalEntries,
                    'total_exits'     => $totalExits,
                ],
                'items' => $items
            ];
        } elseif ($type === 'valuation') {
            $query = Product::with('category');
            
            if ($categoryId) {
                $query->where('category_id', $categoryId);
            }
            if ($productId) {
                $query->where('id', $productId);
            }
            
            $products = $query->orderBy('name')->get();
            
            $items = [];
            $totalItemsCount = 0;
            $totalValuation = 0;
            $suppliers = [];
            
            foreach ($products as $p) {
                $totalItemsCount += $p->quantity;
                $val = $p->quantity * $p->price;
                $totalValuation += $val;
                if ($p->supplier) {
                    $suppliers[$p->supplier] = true;
                }
                
                $items[] = [
                    'id'            => $p->id,
                    'name'          => $p->name,
                    'barcode'       => $p->barcode,
                    'category_name' => $p->category?->name ?? 'Général',
                    'supplier'      => $p->supplier ?? 'Aucun',
                    'quantity'      => $p->quantity,
                    'price'         => $p->price,
                    'stock_value'   => $val,
                ];
            }
            
            return [
                'type' => 'valuation',
                'stats' => [
                    'total_products'    => count($products),
                    'total_items_count' => $totalItemsCount,
                    'total_valuation'   => $totalValuation,
                    'supplier_count'    => count($suppliers),
                ],
                'items' => $items
            ];
        }
        
        return [
            'type'  => $type,
            'stats' => [],
            'items' => []
        ];
    }
}
