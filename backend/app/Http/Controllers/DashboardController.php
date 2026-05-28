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

        // --- Key Stats ---
        $totalProducts    = Product::count();
        $totalCategories  = Category::count();
        $lowStockCount    = Product::whereRaw('quantity <= alert_threshold AND quantity > 0')->count();
        $outOfStockCount  = Product::where('quantity', 0)->count();

        $entriesThisMonth = StockMovement::where('type', 'entry')
            ->whereDate('created_at', '>=', $thisMonth)->sum('quantity');
        $exitsThisMonth   = StockMovement::where('type', 'exit')
            ->whereDate('created_at', '>=', $thisMonth)->sum('quantity');

        $entriesLastMonth = StockMovement::where('type', 'entry')
            ->whereBetween('created_at', [$lastMonth, $lastMonthEnd])->sum('quantity');
        $exitsLastMonth   = StockMovement::where('type', 'exit')
            ->whereBetween('created_at', [$lastMonth, $lastMonthEnd])->sum('quantity');

        // Total stock value
        $totalStockValue = Product::selectRaw('SUM(quantity * price) as total')->value('total') ?? 0;

        // --- Chart Data: Last 7 days movements ---
        $chartData = [];
        $dayNames  = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        for ($i = 6; $i >= 0; $i--) {
            $day  = Carbon::now()->subDays($i);
            $entries = StockMovement::where('type', 'entry')
                ->whereDate('created_at', $day)->sum('quantity');
            $exits = StockMovement::where('type', 'exit')
                ->whereDate('created_at', $day)->sum('quantity');
            $chartData[] = [
                'name'    => $dayNames[$day->dayOfWeek],
                'entrees' => (int)$entries,
                'sorties' => (int)$exits,
            ];
        }

        // --- Monthly Chart: Last 6 months ---
        $monthlyData = [];
        $monthNames  = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        for ($i = 5; $i >= 0; $i--) {
            $month  = Carbon::now()->subMonths($i);
            $entries = StockMovement::where('type', 'entry')
                ->whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->sum('quantity');
            $exits = StockMovement::where('type', 'exit')
                ->whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->sum('quantity');
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
                'name'            => $p->name,
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
                'product'    => $m->product?->name,
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
