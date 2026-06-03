import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, ArrowUpRight, ArrowDownRight, Trash2, SlidersHorizontal, Download } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Modal, ConfirmDialog, Loader, EmptyState,
  FormField, Input, Select, Textarea, Pagination
} from '../components/ui';

const MovementForm = ({ products, onSubmit, loading }) => {
  const [form, setForm]     = useState({ product_id: '', type: 'entry', quantity: 1, reference: '', notes: '' });
  const [errors, setErrors] = useState({});

  const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: undefined })); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e2 = {};
    if (!form.product_id)         e2.product_id = 'Produit requis.';
    if (!form.quantity || form.quantity < 1) e2.quantity = 'Quantité ≥ 1 requise.';
    setErrors(e2);
    if (!Object.keys(e2).length) onSubmit(form);
  };

  const selectedProduct = products.find(p => p.id === parseInt(form.product_id));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Produit" required error={errors.product_id}>
        <Select value={form.product_id} onChange={e => set('product_id', e.target.value)}>
          <option value="">-- Sélectionner un produit --</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.designation} (stock: {p.quantity})</option>
          ))}
        </Select>
      </FormField>

      {selectedProduct && (
        <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2
          ${selectedProduct.quantity <= selectedProduct.alert_threshold
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-blue-50 text-blue-700 border border-blue-100'}`}
        >
          <span>Stock actuel:</span>
          <span className="font-bold">{selectedProduct.quantity} unités</span>
          <span className="text-slate-400">|</span>
          <span>Seuil d'alerte: {selectedProduct.alert_threshold}</span>
        </div>
      )}

      <FormField label="Type de mouvement" required>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'entry', label: 'Entrée', icon: ArrowUpRight, color: 'emerald' },
            { value: 'exit',  label: 'Sortie',  icon: ArrowDownRight, color: 'red' },
          ].map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('type', value)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border-2 font-medium text-sm transition-all
                ${form.type === value
                  ? color === 'emerald'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label="Quantité" required error={errors.quantity}>
        <Input type="number" min="1" value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value) || 1)} />
      </FormField>

      <FormField label="Référence (optionnel)" error={errors.reference}>
        <Input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Ex: BON-2026-001" />
      </FormField>

      <FormField label="Notes" error={errors.notes}>
        <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Remarques..." />
      </FormField>

      <button type="submit" disabled={loading}
        className={`w-full py-2.5 font-semibold rounded-xl transition-colors text-sm text-white flex items-center justify-center gap-2
          ${form.type === 'entry' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
          disabled:opacity-60`}
      >
        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Enregistrer le mouvement
      </button>
    </form>
  );
};

const Stock = () => {
  const toast = useToast();
  const [movements, setMovements] = useState([]);
  const [products, setProducts]   = useState([]);
  const [meta, setMeta]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [page, setPage]           = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [showExport, setShowExport] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Debounce search input to avoid hitting the API on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const load = useCallback(() => { // eslint-disable-line react-hooks/exhaustive-deps
    setLoading(true);
    api.get('/stock-movements', { params: { page, per_page: 15, search, type: typeFilter, date_from: dateFrom, date_to: dateTo } })
      .then(({ data }) => { setMovements(data.data); setMeta(data.meta); })
      .catch(() => toast.error('Erreur lors du chargement.'))
      .finally(() => setLoading(false));
  }, [page, search, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    api.get('/products', { params: { per_page: 999 } }).then(({ data }) => setProducts(data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, typeFilter, dateFrom, dateTo]);

  const handleExport = async (format) => {
    try {
      toast.info(`Préparation de l'export ${format.toUpperCase()}...`);
      const params = { search, type: typeFilter, date_from: dateFrom, date_to: dateTo, format };
      const response = await api.get('/stock-movements/export', { params, responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
      link.setAttribute('download', `export_mouvements_${dateStr}_${timeStr}.${format}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Exportation réussie !');
    } catch (err) {
      toast.error('Erreur lors de l\'exportation.');
    }
  };

  const handleCreate = async (form) => {
    setFormLoading(true);
    try {
      await api.post('/stock-movements', form);
      toast.success('Mouvement enregistré avec succès !');
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/stock-movements/${deleteTarget.id}`);
      toast.success('Mouvement annulé et stock mis à jour.');
      setDeleteTarget(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mouvements d'Inventaire</h1>
          <p className="text-slate-500 text-sm mt-0.5">{meta?.total ?? '—'} opérations enregistrées</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors text-sm shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-500" /> Exporter
            </button>
            {showExport && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                <button
                  onClick={() => { handleExport('xlsx'); setShowExport(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Excel (.xlsx)
                </button>
                <button
                  onClick={() => { handleExport('csv'); setShowExport(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> CSV (.csv)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm shadow-blue-500/30 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau Mouvement
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input className="pl-10" placeholder="Rechercher par produit ou référence..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-40">
              <option value="">Tous les types</option>
              <option value="entry">Entrées</option>
              <option value="exit">Sorties</option>
            </Select>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-500">
              <span>Du</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-transparent border-0 focus:ring-0 p-0 text-slate-700 font-medium"
              />
              <span>au</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-transparent border-0 focus:ring-0 p-0 text-slate-700 font-medium"
              />
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="text-red-500 hover:text-red-700 font-bold ml-1"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <Loader text="Chargement des mouvements..." />
        ) : movements.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="Aucun mouvement"
            description={search || typeFilter ? "Essayez de modifier vos filtres." : "Commencez par enregistrer un mouvement d'inventaire."}
            action={!search && !typeFilter && (
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">
                <Plus className="w-4 h-4" /> Ajouter un mouvement
              </button>
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Type', 'Désignation', 'Famille', 'Quantité', 'Référence', 'Opérateur', 'Date', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => (
                  <tr key={m.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3.5">
                      <div className={`flex items-center gap-1.5 font-medium text-sm
                        ${m.type === 'entry' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {m.type === 'entry'
                          ? <ArrowUpRight className="w-4 h-4" />
                          : <ArrowDownRight className="w-4 h-4" />}
                        {m.type === 'entry' ? 'Entrée' : 'Sortie'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-800">
                      <div>{m.product?.designation}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">N° Inv: {m.product?.inventory_number || '—'}</div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{m.product?.category?.name}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-sm font-bold ${m.type === 'entry' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.type === 'entry' ? '+' : '-'}{m.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 font-mono">{m.reference}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{m.user?.name}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => setDeleteTarget(m)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau Mouvement d'Inventaire">
        <MovementForm products={products} onSubmit={handleCreate} loading={formLoading} />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Annuler le mouvement"
        message={`Annuler ce mouvement ? La quantité du produit "${deleteTarget?.product?.name}" sera automatiquement réajustée.`}
        confirmLabel="Annuler le mouvement"
      />
    </div>
  );
};

export default Stock;
