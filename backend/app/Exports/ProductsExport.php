<?php

namespace App\Exports;

use App\Models\Product;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProductsExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    use Exportable;

    protected $filters;
    protected $isTemplate;

    public function __construct(array $filters = [], bool $isTemplate = false)
    {
        $this->filters = $filters;
        $this->isTemplate = $isTemplate;
    }

    public function collection()
    {
        if ($this->isTemplate) {
            return collect([
                (object)[
                    'name' => 'Ex: Ordinateur Portable HP 15',
                    'description' => 'Intel Core i5, 8GB RAM, 256GB SSD',
                    'category_name' => 'Informatique',
                    'price' => 350000,
                    'quantity' => 15,
                    'alert_threshold' => 5,
                    'barcode' => 'HP-LP-150',
                    'supplier' => 'HP Distribution',
                ]
            ]);
        }

        $query = Product::query()->with('category');

        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('supplier', 'like', "%{$search}%");
            });
        }

        if (!empty($this->filters['category_id'])) {
            $query->where('category_id', $this->filters['category_id']);
        }

        if (!empty($this->filters['stock_status'])) {
            $status = $this->filters['stock_status'];
            if ($status === 'low') {
                $query->whereRaw('quantity <= alert_threshold');
            } elseif ($status === 'out') {
                $query->where('quantity', 0);
            } elseif ($status === 'ok') {
                $query->whereRaw('quantity > alert_threshold');
            }
        }

        return $query->orderBy('name')->get();
    }

    public function headings(): array
    {
        return [
            'Nom',
            'Description',
            'Catégorie',
            'Prix unitaire (FCFA)',
            'Quantité en stock',
            'Seuil d\'alerte',
            'Code-barres',
            'Fournisseur',
        ];
    }

    public function map($product): array
    {
        // If it's a template mock object
        if ($this->isTemplate) {
            return [
                $product->name,
                $product->description,
                $product->category_name,
                $product->price,
                $product->quantity,
                $product->alert_threshold,
                $product->barcode,
                $product->supplier,
            ];
        }

        return [
            $product->name,
            $product->description,
            $product->category?->name ?? 'Général',
            $product->price,
            $product->quantity,
            $product->alert_threshold,
            $product->barcode,
            $product->supplier,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '3B82F6'], // tailwind blue-500
                ],
            ],
        ];
    }
}
