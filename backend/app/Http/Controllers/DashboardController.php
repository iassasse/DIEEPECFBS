<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Category;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $now      = Carbon::now();
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();
        $lastMonthEnd = Carbon::now()->subMonth()->endOfMonth();
        $startMonth = Carbon::now()->subMonths(5)->startOfMonth();

        // --- Key Stats ---
        $totalProducts    = Product::count();
        $totalCategories  = Category::count();
        $lowStockCount    = Product::whereRaw('quantity <= alert_threshold AND quantity > 0')->count();
        $outOfStockCount  = Product::where('quantity', 0)->count();

        // Load all movements for the last 6 months in one query to run aggregates in memory
        $recentMovementsForStats = StockMovement::where('created_at', '>=', $startMonth)->get();

        $entriesThisMonth = $recentMovementsForStats
            ->where('type', 'entry')
            ->where('created_at', '>=', $thisMonth)
            ->sum('quantity');
        $exitsThisMonth   = $recentMovementsForStats
            ->where('type', 'exit')
            ->where('created_at', '>=', $thisMonth)
            ->sum('quantity');

        $entriesLastMonth = $recentMovementsForStats
            ->where('type', 'entry')
            ->whereBetween('created_at', [$lastMonth, $lastMonthEnd])
            ->sum('quantity');
        $exitsLastMonth   = $recentMovementsForStats
            ->where('type', 'exit')
            ->whereBetween('created_at', [$lastMonth, $lastMonthEnd])
            ->sum('quantity');

        // Total stock value
        $totalStockValue = Product::selectRaw('SUM(quantity * price) as total')->value('total') ?? 0;

        // --- Chart Data: Last 7 days movements ---
        $chartData = [];
        $dayNames  = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        
        $sevenDaysAgo = Carbon::now()->subDays(6)->startOfDay();
        $movementsByDay = $recentMovementsForStats
            ->where('created_at', '>=', $sevenDaysAgo)
            ->groupBy(function ($m) {
                return $m->created_at->format('Y-m-d');
            });

        for ($i = 6; $i >= 0; $i--) {
            $day  = Carbon::now()->subDays($i);
            $dayStr = $day->format('Y-m-d');
            $dayMovements = $movementsByDay->get($dayStr, collect());
            
            $entries = $dayMovements->where('type', 'entry')->sum('quantity');
            $exits   = $dayMovements->where('type', 'exit')->sum('quantity');
            
            $chartData[] = [
                'name'    => $dayNames[$day->dayOfWeek],
                'entrees' => (int)$entries,
                'sorties' => (int)$exits,
            ];
        }

        // --- Monthly Chart: Last 6 months ---
        $monthlyData = [];
        $monthNames  = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        
        $movementsByMonth = $recentMovementsForStats->groupBy(function ($m) {
            return $m->created_at->format('Y-m');
        });

        for ($i = 5; $i >= 0; $i--) {
            $month  = Carbon::now()->subMonths($i);
            $monthStr = $month->format('Y-m');
            $monthMovements = $movementsByMonth->get($monthStr, collect());
            
            $entries = $monthMovements->where('type', 'entry')->sum('quantity');
            $exits   = $monthMovements->where('type', 'exit')->sum('quantity');
            
            $monthlyData[] = [
                'name'    => $monthNames[$month->month - 1],
                'entrees' => (int)$entries,
                'sorties' => (int)$exits,
            ];
        }

        // --- Low Stock Products ---
        $lowStockProducts = Product::with('category')
            ->whereRaw('quantity <= alert_threshold')
            ->orderBy('quantity')
            ->take(10)
            ->get()
            ->map(fn ($p) => [
                'id'              => $p->id,
                'name'            => $p->designation,
                'quantity'        => $p->quantity,
                'alert_threshold' => $p->alert_threshold,
                'category'        => $p->category?->name,
            ]);

        // --- Recent Movements ---
        $recentMovements = StockMovement::with(['product', 'user' => fn($q) => $q->select('id', 'name')])
            ->orderByDesc('created_at')
            ->take(8)
            ->get()
            ->map(fn ($m) => [
                'id'         => $m->id,
                'type'       => $m->type,
                'quantity'   => $m->quantity,
                'product'    => $m->product?->designation,
                'user'       => $m->user?->name,
                'reference'  => $m->reference,
                'created_at' => $m->created_at,
            ]);

        // --- Category Breakdown ---
        $categoryStats = Category::withCount('products')
            ->withSum('products', 'quantity')
            ->orderByDesc('products_count')
            ->get()
            ->map(fn ($c) => [
                'name'     => $c->name,
                'produits' => $c->products_count,
                'quantite' => (int)($c->products_sum_quantity ?? 0),
            ]);

        return response()->json([
            'stats' => [
                'total_products'   => $totalProducts,
                'total_categories' => $totalCategories,
                'low_stock'        => $lowStockCount,
                'out_of_stock'     => $outOfStockCount,
                'entries_month'    => (int)$entriesThisMonth,
                'exits_month'      => (int)$exitsThisMonth,
                'entries_last'     => (int)$entriesLastMonth,
                'exits_last'       => (int)$exitsLastMonth,
                'total_value'      => round($totalStockValue, 2),
            ],
            'chart_weekly'   => $chartData,
            'chart_monthly'  => $monthlyData,
            'chart_categories' => $categoryStats,
            'low_stock_products' => $lowStockProducts,
            'recent_movements'   => $recentMovements,
        ]);
    }
}
