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
                    'inventory_number'   => '136',
                    'category_name'      => 'Travaux d\'aménagement et d\'installation',
                    'quantity'           => 1,
                    'designation'        => 'Climatiseur split système mural 9000 BTU reversible type inverter DAIKO ACW09QINV410XK',
                    'location'           => 'DPIEPEECFBS',
                    'brand'              => 'DAIKO',
                    'serial_number'      => '25278886876',
                    'user_service'       => 'BUREAU 2',
                    'purchase_reference' => 'BC01/2024',
                    'price'              => 4000.00,
                ]
            ]);
        }

        $query = Product::query()->with('category');

        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('designation', 'like', "%{$search}%")
                  ->orWhere('inventory_number', 'like', "%{$search}%")
                  ->orWhere('brand', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%")
                  ->orWhere('user_service', 'like', "%{$search}%")
                  ->orWhere('purchase_reference', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
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

        return $query->orderBy('designation')->get();
    }

    public function headings(): array
    {
        return [
            '  N°  d\'inv DPIEPEECFBS',
            'Famille',
            'Quantité',
            'Désignation',
            'Localisation',
            'Marque',
            'N°de série ',
            'Service utilisateur',
            'Référence d\'achat',
            'Prix d\'acquisition HT unitaire',
        ];
    }

    public function map($product): array
    {
        return [
            $product->inventory_number,
            $product->isTemplate ? $product->category_name : ($product->category?->name ?? 'Général'),
            $product->quantity,
            $product->designation,
            $product->location,
            $product->brand,
            $product->serial_number,
            $product->user_service,
            $product->purchase_reference,
            $product->price,
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
