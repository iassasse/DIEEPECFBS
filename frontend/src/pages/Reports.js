import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Download, 
  Calendar, 
  RefreshCw, 
  FileSpreadsheet, 
  Layers, 
  Tag, 
  AlertTriangle,
  Package,
  TrendingDown
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Loader, EmptyState, FormField, Select, Input, Badge } from '../components/ui';

const Reports = () => {
  const toast = useToast();
  
  // Static lists for filter options
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Report state
  const [reportType, setReportType] = useState('stock'); // stock, movements, valuation
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [items, setItems] = useState([]);
  
  // Filters state
  const [filters, setFilters] = useState({
    category_id: '',
    product_id: '',
    stock_status: '',
    movement_type: '',
    start_date: '',
    end_date: '',
  });

  // Load static filter data once
  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
    api.get('/products', { params: { per_page: 999 } }).then(({ data }) => setProducts(data.data || [])).catch(() => {});
  }, []);

  // Fetch report data from API
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        type: reportType,
        category_id: filters.category_id,
        product_id: filters.product_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        stock_status: filters.stock_status || undefined,
        movement_type: filters.movement_type || undefined,
      };
      
      const { data } = await api.get('/reports', { params });
      setStats(data.stats || {});
      setItems(data.items || []);
    } catch (err) {
      toast.error('Erreur lors de la récupération des données du rapport.');
    } finally {
      setLoading(false);
    }
  }, [reportType, filters, toast]);

  // Load report on tab change or filters change
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      category_id: '',
      product_id: '',
      stock_status: '',
      movement_type: '',
      start_date: '',
      end_date: '',
    });
  };

  // Export report as PDF or Excel
  const handleExport = async (format) => {
    try {
      toast.info(`Préparation du fichier ${format === 'pdf' ? 'PDF' : 'Excel'}...`);
      
      const params = {
        type: reportType,
        category_id: filters.category_id,
        product_id: filters.product_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        stock_status: filters.stock_status || undefined,
        movement_type: filters.movement_type || undefined,
      };
      
      const endpoint = format === 'pdf' ? '/reports/pdf' : '/reports/excel';
      const response = await api.get(endpoint, { params, responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
      link.setAttribute('download', `rapport_${reportType}_${dateStr}_${timeStr}.${ext}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Rapport exporté avec succès !');
    } catch (err) {
      toast.error("Erreur lors de l'exportation du rapport.");
    }
  };

  // Format currency helper (DH)
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('fr-FR').format(val) + ' DH';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rapports & Analyses</h1>
          <p className="text-slate-500 text-sm mt-0.5">Générez, filtrez et exportez des rapports d'inventaire complets</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadReport}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exporter Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm"
          >
            <FileText className="w-4 h-4" /> Exporter PDF
          </button>
        </div>
      </div>

      {/* Report Cards Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { 
            id: 'stock', 
            icon: BarChart3, 
            title: 'Inventaire Global', 
            desc: 'État actuel du stock, alertes et valorisation par produit.',
            color: 'border-blue-500 text-blue-600 bg-blue-50/50',
            inactiveColor: 'text-slate-400 bg-slate-50 border-slate-100 hover:border-slate-300'
          },
          { 
            id: 'movements', 
            icon: TrendingUp, 
            title: "Mouvements d'Inventaire", 
            desc: 'Historique filtrable des entrées et des sorties.',
            color: 'border-emerald-500 text-emerald-600 bg-emerald-50/50',
            inactiveColor: 'text-slate-400 bg-slate-50 border-slate-100 hover:border-slate-300'
          },
          { 
            id: 'valuation', 
            icon: FileText, 
            title: "Valorisation de l'Inventaire", 
            desc: 'Analyse financière détaillée et valeur marchande par fournisseur.',
            color: 'border-purple-500 text-purple-600 bg-purple-50/50',
            inactiveColor: 'text-slate-400 bg-slate-50 border-slate-100 hover:border-slate-300'
          },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = reportType === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setReportType(item.id); handleResetFilters(); }}
              className={`text-left p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-start gap-4 ${
                isActive ? `${item.color} shadow-md scale-[1.02]` : `${item.inactiveColor} bg-white shadow-sm`
              }`}
            >
              <div className={`p-3 rounded-xl ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">{item.title}</h3>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Filters Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            Filtres du rapport
          </h3>
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField label="Catégorie">
            <Select
              value={filters.category_id}
              onChange={e => handleFilterChange('category_id', e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Produit">
            <Select
              value={filters.product_id}
              onChange={e => handleFilterChange('product_id', e.target.value)}
            >
              <option value="">Tous les produits</option>
              {products
                .filter(p => !filters.category_id || p.category_id === parseInt(filters.category_id))
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))
              }
            </Select>
          </FormField>

          {/* Conditional filters based on report type */}
          {reportType === 'stock' && (
            <FormField label="Statut de stock">
              <Select
                value={filters.stock_status}
                onChange={e => handleFilterChange('stock_status', e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="ok">Stock Normal</option>
                <option value="low">Stock Faible</option>
                <option value="out">Rupture de Stock</option>
              </Select>
            </FormField>
          )}

          {reportType === 'movements' && (
            <>
              <FormField label="Type de mouvement">
                <Select
                  value={filters.movement_type}
                  onChange={e => handleFilterChange('movement_type', e.target.value)}
                >
                  <option value="">Tous les types</option>
                  <option value="entry">Entrées uniquement</option>
                  <option value="exit">Sorties uniquement</option>
                </Select>
              </FormField>

              <FormField label="Date de début">
                <div className="relative">
                  <Input
                    type="date"
                    value={filters.start_date}
                    onChange={e => handleFilterChange('start_date', e.target.value)}
                  />
                </div>
              </FormField>

              <FormField label="Date de fin">
                <div className="relative">
                  <Input
                    type="date"
                    value={filters.end_date}
                    onChange={e => handleFilterChange('end_date', e.target.value)}
                  />
                </div>
              </FormField>
            </>
          )}
        </div>
      </div>

      {/* Summary Stats Cards */}
      {!loading && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {reportType === 'stock' && (
            <>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_products || 0}</p>
                  <p className="text-xs font-medium text-slate-500">Produits Référencés</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.total_stock_value || 0)}</p>
                  <p className="text-xs font-medium text-slate-500">Valeur Totale du Stock</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.low_stock_count || 0}</p>
                  <p className="text-xs font-medium text-slate-500">Seuils Faibles</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.out_of_stock_count || 0}</p>
                  <p className="text-xs font-medium text-slate-500">Ruptures de Stock</p>
                </div>
              </div>
            </>
          )}

          {reportType === 'movements' && (
            <>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_movements || 0}</p>
                  <p className="text-xs font-medium text-slate-500">Mouvements Totaux</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">+{stats.total_entries || 0}</p>
                  <p className="text-xs font-medium text-slate-500 font-bold text-emerald-600">Unités Entrées</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">-{stats.total_exits || 0}</p>
                  <p className="text-xs font-medium text-slate-500 font-bold text-rose-600">Unités Sorties</p>
                </div>
              </div>
            </>
          )}

          {reportType === 'valuation' && (
            <>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_products || 0}</p>
                  <p className="text-xs font-medium text-slate-500">Produits Distincts</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_items_count || 0}</p>
                  <p className="text-xs font-medium text-slate-500">Unités Totales</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.total_valuation || 0)}</p>
                  <p className="text-xs font-medium text-slate-500">Valorisation du Stock</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.supplier_count || 0}</p>
                  <p className="text-xs font-medium text-slate-500">Fournisseurs</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Aperçu des données</h3>
          <span className="text-slate-500 text-xs font-medium">{items.length} lignes trouvées</span>
        </div>

        {loading ? (
          <Loader text="Génération du rapport..." />
        ) : items.length === 0 ? (
          <EmptyState 
            icon={Package} 
            title="Aucune donnée" 
            description="Aucun enregistrement ne correspond aux filtres sélectionnés." 
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-100">
                  {reportType === 'stock' && (
                    <>
                      <th className="px-6 py-3">Produit</th>
                      <th className="px-6 py-3">Code-barres</th>
                      <th className="px-6 py-3">Catégorie</th>
                      <th className="px-6 py-3 text-right">Quantité</th>
                      <th className="px-6 py-3 text-right">P.U.</th>
                      <th className="px-6 py-3 text-right">Valeur</th>
                      <th className="px-6 py-3 text-center">Statut</th>
                    </>
                  )}
                  {reportType === 'movements' && (
                    <>
                      <th className="px-6 py-3">Référence</th>
                      <th className="px-6 py-3">Produit</th>
                      <th className="px-6 py-3">Catégorie</th>
                      <th className="px-6 py-3 text-center">Type</th>
                      <th className="px-6 py-3 text-right">Quantité</th>
                      <th className="px-6 py-3">Opérateur</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Notes</th>
                    </>
                  )}
                  {reportType === 'valuation' && (
                    <>
                      <th className="px-6 py-3">Produit</th>
                      <th className="px-6 py-3">Code-barres</th>
                      <th className="px-6 py-3">Catégorie</th>
                      <th className="px-6 py-3">Fournisseur</th>
                      <th className="px-6 py-3 text-right">Quantité</th>
                      <th className="px-6 py-3 text-right">Prix Unitaire</th>
                      <th className="px-6 py-3 text-right">Valeur Totale</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {items.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {reportType === 'stock' && (
                      <>
                        <td className="px-6 py-3.5 font-semibold text-slate-800">{item.name}</td>
                        <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{item.barcode}</td>
                        <td className="px-6 py-3.5 text-slate-600">{item.category_name}</td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-800">{item.quantity}</td>
                        <td className="px-6 py-3.5 text-right text-slate-500">{new Intl.NumberFormat('fr-FR').format(item.price)}</td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">{new Intl.NumberFormat('fr-FR').format(item.stock_value)}</td>
                        <td className="px-6 py-3.5 text-center">
                          {item.status === 'out' && <Badge variant="danger">Rupture</Badge>}
                          {item.status === 'low' && <Badge variant="warning">Faible</Badge>}
                          {item.status === 'normal' && <Badge variant="success">Normal</Badge>}
                        </td>
                      </>
                    )}
                    {reportType === 'movements' && (
                      <>
                        <td className="px-6 py-3.5 font-bold text-slate-800">{item.reference}</td>
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-slate-800">{item.product_name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{item.product_barcode}</div>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">{item.category_name}</td>
                        <td className="px-6 py-3.5 text-center">
                          {item.type === 'entry' ? (
                            <Badge variant="success">Entrée</Badge>
                          ) : (
                            <Badge variant="danger">Sortie</Badge>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-800">{item.quantity}</td>
                        <td className="px-6 py-3.5 text-slate-600">{item.user_name}</td>
                        <td className="px-6 py-3.5 text-slate-500 text-xs">
                          {new Date(item.created_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-400 italic max-w-xs truncate" title={item.notes}>
                          {item.notes || '—'}
                        </td>
                      </>
                    )}
                    {reportType === 'valuation' && (
                      <>
                        <td className="px-6 py-3.5 font-semibold text-slate-800">{item.name}</td>
                        <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{item.barcode}</td>
                        <td className="px-6 py-3.5 text-slate-600">{item.category_name}</td>
                        <td className="px-6 py-3.5 text-slate-600">{item.supplier}</td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-800">{item.quantity}</td>
                        <td className="px-6 py-3.5 text-right text-slate-500">{new Intl.NumberFormat('fr-FR').format(item.price)}</td>
                        <td className="px-6 py-3.5 text-right font-bold text-purple-700">{new Intl.NumberFormat('fr-FR').format(item.stock_value)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
