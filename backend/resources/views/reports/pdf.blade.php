<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rapport DIEEPEC FBS</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 10px;
            color: #333333;
            line-height: 1.4;
            margin: 0;
            padding: 0;
        }
        .header {
            margin-bottom: 25px;
            border-bottom: 2px solid #E2E8F0;
            padding-bottom: 12px;
        }
        .header table {
            width: 100%;
        }
        .logo-text {
            font-size: 18px;
            font-weight: bold;
            color: #1E3A8A;
            letter-spacing: 1px;
        }
        .logo-sub {
            font-size: 9px;
            color: #6B7280;
            margin-top: 2px;
        }
        .report-title {
            font-size: 15px;
            font-weight: bold;
            color: #111827;
            text-align: right;
        }
        .report-date {
            font-size: 9px;
            color: #4B5563;
            text-align: right;
            margin-top: 3px;
        }
        
        /* Summary Grid */
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        .summary-card {
            background-color: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 10px 12px;
            text-align: center;
        }
        .summary-card-title {
            font-size: 8px;
            font-weight: bold;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .summary-card-value {
            font-size: 14px;
            font-weight: bold;
            color: #0F172A;
        }
        .summary-card-alert {
            color: #D97706;
        }
        .summary-card-danger {
            color: #DC2626;
        }
        .summary-card-success {
            color: #059669;
        }

        /* Data Table */
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        table.data-table th {
            background-color: #F1F5F9;
            color: #475569;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 8px;
            letter-spacing: 0.5px;
            text-align: left;
            padding: 8px 10px;
            border-bottom: 2px solid #CBD5E1;
        }
        table.data-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #E2E8F0;
            vertical-align: middle;
        }
        table.data-table tr:nth-child(even) {
            background-color: #F8FAFC;
        }
        
        /* Badges */
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 7.5px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-normal { background-color: #DCFCE7; color: #166534; }
        .badge-low { background-color: #FEF3C7; color: #92400E; }
        .badge-out { background-color: #FEE2E2; color: #991B1B; }
        .badge-entry { background-color: #D1FAE5; color: #065F46; }
        .badge-exit { background-color: #FEE2E2; color: #991B1B; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }

        /* Footer */
        .footer {
            position: fixed;
            bottom: -15px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8px;
            color: #94A3B8;
            border-top: 1px solid #E2E8F0;
            padding-top: 6px;
        }
    </style>
</head>
<body>

    <div class="header">
        <table>
            <tr>
                <td style="vertical-align: top;">
                    <div class="logo-text">DIEEPEC FBS</div>
                    <div class="logo-sub">Application de Gestion d'Inventaire (DIEEPEC FBS)</div>
                </td>
                <td style="vertical-align: top; text-align: right;">
                    <div class="report-title">
                        @if($type === 'stock')
                            RAPPORT D'INVENTAIRE GLOBAL
                        @elseif($type === 'movements')
                            RAPPORT DES MOUVEMENTS D'INVENTAIRE
                        @elseif($type === 'valuation')
                            RAPPORT DE VALORISATION DE L'INVENTAIRE
                        @endif
                    </div>
                    <div class="report-date">Généré le : {{ date('d/m/Y H:i') }}</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Summary Metrics -->
    <table class="summary-table">
        <tr>
            @if($type === 'stock')
                <td style="width: 25%; padding-right: 8px;">
                    <div class="summary-card">
                        <div class="summary-card-title">Total Produits</div>
                        <div class="summary-card-value">{{ $stats['total_products'] }}</div>
                    </div>
                </td>
                <td style="width: 35%; padding-right: 8px; padding-left: 8px;">
                    <div class="summary-card">
                        <div class="summary-card-title">Valeur Totale Stock</div>
                        <div class="summary-card-value">{{ number_format($stats['total_stock_value'], 0, ',', ' ') }} DH</div>
                    </div>
                </td>
                <td style="width: 20%; padding-right: 8px; padding-left: 8px;">
                    <div class="summary-card">
                        <div class="summary-card-title">Stock Faible</div>
                        <div class="summary-card-value {{ $stats['low_stock_count'] > 0 ? 'summary-card-alert' : '' }}">{{ $stats['low_stock_count'] }}</div>
                    </div>
                </td>
                <td style="width: 20%; padding-left: 8px;">
                    <div class="summary-card">
                        <div class="summary-card-title">Ruptures</div>
                        <div class="summary-card-value {{ $stats['out_of_stock_count'] > 0 ? 'summary-card-danger' : '' }}">{{ $stats['out_of_stock_count'] }}</div>
                    </div>
                </td>
            @elseif($type === 'movements')
                <td style="width: 33.33%; padding-right: 8px;">
                    <div class="summary-card">
                        <div class="summary-card-title">Total Mouvements</div>
                        <div class="summary-card-value">{{ $stats['total_movements'] }}</div>
                    </div>
                </td>
                <td style="width: 33.33%; padding-right: 8px; padding-left: 8px;">
                    <div class="summary-card">
                        <div class="summary-card-title">Total Quantité Entrée</div>
                        <div class="summary-card-value summary-card-success">+{{ $stats['total_entries'] }}</div>
                    </div>
                </td>
                <td style="width: 33.33%; padding-left: 8px;">
                    <div class="summary-card">
                        <div class="summary-card-title">Total Quantité Sortie</div>
                        <div class="summary-card-value summary-card-danger">-{{ $stats['total_exits'] }}</div>
                    </div>
                </td>
            @elseif($type === 'valuation')
                <td style="width: 25%; padding-right: 8px;">
                    <div class="summary-card">
                        <div class="summary-card-title">Total Produits</div>
                        <div class="summary-card-value">{{ $stats['total_products'] }}</div>
                    </div>
                </td>
                <td style="width: 25%; padding-right: 8px; padding-left: 8px;">
                    <div class="summary-card">
                        <div class="summary-card-title">Total Articles Stock</div>
                        <div class="summary-card-value">{{ $stats['total_items_count'] }}</div>
                    </div>
                </td>
                <td style="width: 30%; padding-right: 8px; padding-left: 8px;">
                    <div class="summary-card">
                        <div class="summary-card-title">Valorisation Totale</div>
                        <div class="summary-card-value" style="color: #8B5CF6;">{{ number_format($stats['total_valuation'], 0, ',', ' ') }} DH</div>
                    </div>
                </td>
                <td style="width: 20%; padding-left: 8px;">
                    <div class="summary-card">
                        <div class="summary-card-title">Fournisseurs</div>
                        <div class="summary-card-value">{{ $stats['supplier_count'] }}</div>
                    </div>
                </td>
            @endif
        </tr>
    </table>

    <!-- Data Table -->
    <table class="data-table">
        <thead>
            @if($type === 'stock')
                <tr>
                    <th style="width: 35%;">Désignation / Détails</th>
                    <th style="width: 15%;">N° d'inv</th>
                    <th style="width: 15%;">Famille</th>
                    <th style="width: 7%; text-align: right;">Qté</th>
                    <th style="width: 13%; text-align: right;">P.U. Acquisition</th>
                    <th style="width: 15%; text-align: right;">Valeur Stock</th>
                    <th style="width: 10%; text-align: center;">Statut</th>
                </tr>
            @elseif($type === 'movements')
                <tr>
                    <th style="width: 12%;">Référence</th>
                    <th style="width: 33%;">Désignation</th>
                    <th style="width: 15%;">Famille</th>
                    <th style="width: 8%; text-align: center;">Type</th>
                    <th style="width: 8%; text-align: right;">Qté</th>
                    <th style="width: 12%;">Opérateur</th>
                    <th style="width: 12%;">Date</th>
                </tr>
            @elseif($type === 'valuation')
                <tr>
                    <th style="width: 35%;">Désignation / Détails</th>
                    <th style="width: 15%;">N° d'inv</th>
                    <th style="width: 15%;">Famille</th>
                    <th style="width: 8%; text-align: right;">Qté</th>
                    <th style="width: 12%; text-align: right;">P.U. Acquisition</th>
                    <th style="width: 15%; text-align: right;">Valeur Totale</th>
                </tr>
            @endif
        </thead>
        <tbody>
            @forelse($items as $item)
                @if($type === 'stock')
                    <tr>
                        <td>
                            <div class="font-bold" style="font-size: 9px; color: #1E293B;">{{ $item['designation'] }}</div>
                            <div style="font-size: 7.5px; color: #64748B; margin-top: 2px;">
                                Loc: {{ $item['location'] ?: '__' }} | Marque: {{ $item['brand'] ?: '__' }} | S/N: {{ $item['serial_number'] ?: '__' }} | Svc: {{ $item['user_service'] ?: '__' }} | Réf: {{ $item['purchase_reference'] ?: '__' }}
                            </div>
                        </td>
                        <td>{{ $item['inventory_number'] ?: '-' }}</td>
                        <td>{{ $item['category_name'] }}</td>
                        <td class="text-right font-bold">{{ $item['quantity'] }}</td>
                        <td class="text-right">{{ number_format($item['price'], 0, ',', ' ') }} DH</td>
                        <td class="text-right font-bold">{{ number_format($item['stock_value'], 0, ',', ' ') }} DH</td>
                        <td class="text-center">
                            @if($item['status'] === 'out')
                                <span class="badge badge-out">Rupture</span>
                            @elseif($item['status'] === 'low')
                                <span class="badge badge-low">Faible</span>
                            @else
                                <span class="badge badge-normal">Normal</span>
                            @endif
                        </td>
                    </tr>
                @elseif($type === 'movements')
                    <tr>
                        <td class="font-bold">{{ $item['reference'] }}</td>
                        <td>
                            <div class="font-bold" style="font-size: 9px;">{{ $item['product_name'] }}</div>
                            <div style="font-size: 7.5px; color: #64748B;">N° Inv: {{ $item['product_barcode'] }}</div>
                        </td>
                        <td>{{ $item['category_name'] }}</td>
                        <td class="text-center">
                            @if($item['type'] === 'entry')
                                <span class="badge badge-entry">Entrée</span>
                            @else
                                <span class="badge badge-exit">Sortie</span>
                            @endif
                        </td>
                        <td class="text-right font-bold">{{ $item['quantity'] }}</td>
                        <td>{{ $item['user_name'] }}</td>
                        <td>{{ date('d/m/Y H:i', strtotime($item['created_at'])) }}</td>
                    </tr>
                @elseif($type === 'valuation')
                    <tr>
                        <td>
                            <div class="font-bold" style="font-size: 9px; color: #1E293B;">{{ $item['designation'] }}</div>
                            <div style="font-size: 7.5px; color: #64748B; margin-top: 2px;">
                                Loc: {{ $item['location'] ?: '__' }} | Marque: {{ $item['brand'] ?: '__' }} | S/N: {{ $item['serial_number'] ?: '__' }} | Svc: {{ $item['user_service'] ?: '__' }} | Réf: {{ $item['purchase_reference'] ?: '__' }}
                            </div>
                        </td>
                        <td>{{ $item['inventory_number'] ?: '-' }}</td>
                        <td>{{ $item['category_name'] }}</td>
                        <td class="text-right font-bold">{{ $item['quantity'] }}</td>
                        <td class="text-right">{{ number_format($item['price'], 0, ',', ' ') }} DH</td>
                        <td class="text-right font-bold" style="color: #6D28D9;">{{ number_format($item['stock_value'], 0, ',', ' ') }} DH</td>
                    </tr>
                @endif
            @empty
                <tr>
                    <td colspan="{{ $type === 'movements' ? 8 : 7 }}" class="text-center" style="padding: 20px; color: #64748B;">
                        Aucune donnée disponible.
                    </td>
                </tr>
            @endforelse
            
            <!-- Totals row -->
            @if(count($items) > 0)
                @if($type === 'stock')
                    <tr style="background-color: #E2E8F0; font-weight: bold;">
                        <td colspan="3">TOTAL</td>
                        <td class="text-right"></td>
                        <td></td>
                        <td class="text-right">{{ number_format($stats['total_stock_value'], 0, ',', ' ') }} DH</td>
                        <td></td>
                    </tr>
                @elseif($type === 'movements')
                    <tr style="background-color: #E2E8F0; font-weight: bold;">
                        <td colspan="4">TOTAL MOUVEMENTS: {{ $stats['total_movements'] }}</td>
                        <td colspan="4" class="text-right">
                            <span style="color: #065F46;">+{{ $stats['total_entries'] }} Entrées</span>
                            &nbsp;|&nbsp;
                            <span style="color: #991B1B;">-{{ $stats['total_exits'] }} Sorties</span>
                        </td>
                    </tr>
                @elseif($type === 'valuation')
                    <tr style="background-color: #E2E8F0; font-weight: bold;">
                        <td colspan="4">TOTAL</td>
                        <td class="text-right">{{ $stats['total_items_count'] }}</td>
                        <td></td>
                        <td class="text-right" style="color: #6D28D9;">{{ number_format($stats['total_valuation'], 0, ',', ' ') }} DH</td>
                    </tr>
                @endif
            @endif
        </tbody>
    </table>

    <div class="footer">
        DIEEPEC FBS &bull; Rapport d'inventaire confidentiel &bull; Document généré informatiquement.
    </div>

</body>
</html>
