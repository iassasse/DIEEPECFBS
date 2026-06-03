import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Package, Pencil, Trash2, Download, Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Modal, ConfirmDialog, Loader, EmptyState, Badge,
  FormField, Input, Select, Textarea, Pagination
} from '../components/ui';

const STOCK_FILTERS = [
  { value: '', label: 'Tous les produits' },
  { value: 'ok', label: 'Stock normal' },
  { value: 'low', label: 'Stock faible' },
  { value: 'out', label: 'Rupture' },
];

const stockBadge = (product) => {
  if (product.quantity === 0) return <Badge variant="danger">Rupture</Badge>;
  if (product.quantity <= product.alert_threshold) return <Badge variant="warning">Stock faible</Badge>;
  return <Badge variant="success">En stock</Badge>;
};

const FORM_DEFAULTS = {
  designation: '', description: '', category_id: '', quantity: 0,
  price: '', inventory_number: '', location: 'DPIEPEECFBS', brand: '',
  serial_number: '', user_service: '', purchase_reference: '',
  supplier: '', alert_threshold: 0
};

const ProductForm = ({ product, categories, onSubmit, loading }) => {
  const [form, setForm]     = useState(product ? {
    designation: product.designation || '',
    description: product.description || '',
    category_id: product.category_id || '',
    quantity: product.quantity || 0,
    price: product.price || '',
    inventory_number: product.inventory_number || '',
    supplier: product.supplier || '',
    alert_threshold: product.alert_threshold || 0,
    location: product.location || 'DPIEPEECFBS',
    brand: product.brand || '',
    serial_number: product.serial_number || '',
    user_service: product.user_service || '',
    purchase_reference: product.purchase_reference || ''
  } : FORM_DEFAULTS);
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.designation.trim()) e.designation = 'Désignation requise';
    if (!form.category_id) e.category_id = 'Famille requise';
    if (!form.price || isNaN(form.price) || form.price < 0) e.price = 'Prix d\'acquisition HT unitaire valide requis';
    if (form.quantity < 0) e.quantity = 'Quantité positive requise';
    if (form.alert_threshold < 0) e.alert_threshold = 'Seuil positif requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormField label="Désignation" required error={errors.designation}>
            <Input value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="Ex: Climatiseur split système mural 9000 BTU..." />
          </FormField>
        </div>
        <FormField label="Famille" required error={errors.category_id}>
          <Select value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">-- Sélectionner --</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormField>
        <FormField label="N° d'inv DPIEPEECFBS" error={errors.inventory_number}>
          <Input value={form.inventory_number} onChange={e => set('inventory_number', e.target.value)} placeholder="Ex: 136" />
        </FormField>
        <FormField label="Marque" error={errors.brand}>
          <Input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Ex: DAIKO" />
        </FormField>
        <FormField label="N° de série" error={errors.serial_number}>
          <Input value={form.serial_number} onChange={e => set('serial_number', e.target.value)} placeholder="Ex: 25278886876" />
        </FormField>
        <FormField label="Localisation" error={errors.location}>
          <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Ex: DPIEPEECFBS" />
        </FormField>
        <FormField label="Service utilisateur" error={errors.user_service}>
          <Input value={form.user_service} onChange={e => set('user_service', e.target.value)} placeholder="Ex: BUREAU 2" />
        </FormField>
        <FormField label="Référence d'achat" error={errors.purchase_reference}>
          <Input value={form.purchase_reference} onChange={e => set('purchase_reference', e.target.value)} placeholder="Ex: BC01/2024" />
        </FormField>
        <FormField label="Prix d'acquisition HT unitaire (DH)" required error={errors.price}>
          <Input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" />
        </FormField>
        <FormField label="Quantité initiale" required error={errors.quantity}>
          <Input type="number" min="0" value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value) || 0)} disabled={!!product} />
        </FormField>
        <FormField label="Seuil d'alerte stock" required error={errors.alert_threshold}>
          <Input type="number" min="0" value={form.alert_threshold} onChange={e => set('alert_threshold', parseInt(e.target.value) || 0)} />
        </FormField>
        <FormField label="Fournisseur (optionnel)" error={errors.supplier}>
          <Input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Ex: HP Maroc" />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Description / Notes" error={errors.description}>
            <Textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description optionnelle..." />
          </FormField>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {product ? 'Mettre à jour le bien' : 'Créer le bien'}
        </button>
      </div>
    </form>
  );
};

const ProductImportForm = ({ onSuccess, onCancel }) => {
  const toast = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        setFile(droppedFile);
        setErrors([]);
      } else {
        toast.error('Format de fichier non supporté. Veuillez choisir un fichier Excel ou CSV.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setErrors([]);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/products/export', {
        params: { template: true, format: 'xlsx' },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'modele_import_inventaire.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Modèle téléchargé !');
    } catch (err) {
      toast.error('Erreur lors du téléchargement du modèle.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setErrors([]);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(response.data.message || 'Importation réussie !');
      onSuccess();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || [err.response.data.message]);
        toast.error('Erreur de validation des données.');
      } else {
        toast.error(err.response?.data?.message || 'Une erreur est survenue lors de l\'importation.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-slate-800 text-sm">Modèle d'importation</h4>
          <p className="text-slate-500 text-xs mt-0.5">Téléchargez notre fichier d'exemple pour préparer vos données.</p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" /> Télécharger (.xlsx)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all
            ${dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300 bg-white'}
            ${file ? 'py-6' : 'py-8'}`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            disabled={loading}
          />

          {!file ? (
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-2 text-center w-full h-full">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <Upload className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Glissez-déposez votre fichier ici</p>
                <p className="text-xs text-slate-400 mt-1">ou <span className="text-blue-600 font-medium hover:underline">parcourez vos fichiers</span></p>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Formats acceptés: XLSX, XLS, CSV (max 10MB)</p>
            </label>
          ) : (
            <div className="flex items-center justify-between w-full bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={loading}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Errors Log */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2 text-sm text-red-700">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Erreurs de validation ({errors.length})</span>
            </div>
            <div className="max-h-40 overflow-y-auto pr-1 space-y-1 text-xs font-mono scrollbar-thin">
              {errors.map((err, i) => (
                <div key={i} className="flex gap-2 py-0.5 border-b border-red-100/50 last:border-0">
                  <span className="text-red-400 font-bold shrink-0">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-red-600 italic mt-2 font-medium">L'importation a été entièrement annulée. Veuillez corriger ces erreurs et réessayer.</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-semibold rounded-xl transition-all text-sm"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !file}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:bg-blue-600 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Importer les données
          </button>
        </div>
      </form>
    </div>
  );
};

const Products = () => {
  const toast = useToast();
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta]           = useState(null);
  const [showExport, setShowExport] = useState(false);

  const handleExport = async (format) => {
    try {
      toast.info(`Préparation de l'export ${format.toUpperCase()}...`);
      const params = { search, category_id: catFilter, stock_status: stockFilter, format };
      const response = await api.get('/products/export', { params, responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
      link.setAttribute('download', `export_produits_${dateStr}_${timeStr}.${format}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Exportation réussie !');
    } catch (err) {
      toast.error('Erreur lors de l\'exportation.');
    }
  };
  const [loading, setLoading]     = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [page, setPage]           = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [modal, setModal]         = useState(null); // null | 'create' | 'edit'
  const [editing, setEditing]     = useState(null);
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
    const params = { page, per_page: 12, search, category_id: catFilter, stock_status: stockFilter };
    api.get('/products', { params })
      .then(({ data }) => { setProducts(data.data); setMeta(data.meta); })
      .catch(() => toast.error('Erreur lors du chargement des produits.'))
      .finally(() => setLoading(false));
  }, [page, search, catFilter, stockFilter]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, catFilter, stockFilter]);

  const handleCreate = async (form) => {
    setFormLoading(true);
    try {
      await api.post('/products', form);
      toast.success('Produit créé avec succès !');
      setModal(null);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0];
      toast.error(msg || 'Erreur lors de la création.');
    } finally { setFormLoading(false); }
  };

  const handleUpdate = async (form) => {
    setFormLoading(true);
    try {
      await api.put(`/products/${editing.id}`, form);
      toast.success('Produit mis à jour !');
      setModal(null); setEditing(null);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0];
      toast.error(msg || 'Erreur lors de la mise à jour.');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${deleteTarget.id}`);
      toast.success('Produit supprimé.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventaire DPIEPEECFBS</h1>
          <p className="text-slate-500 text-sm mt-0.5">{meta?.total ?? '—'} biens au total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setModal('import')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors text-sm shadow-sm"
          >
            <Upload className="w-4 h-4 text-slate-500" /> Importer
          </button>
          
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
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm shadow-blue-500/30 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau Bien
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              className="pl-10"
              placeholder="Rechercher par désignation, n° d'inv, marque, service, réf..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="w-44">
              <option value="">Toutes familles</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="w-40">
              {STOCK_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <Loader text="Chargement de l'inventaire..." />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun bien trouvé"
          description={search || catFilter || stockFilter ? "Essayez de modifier vos filtres de recherche." : "Commencez par créer votre premier bien."}
          action={
            !search && !catFilter && !stockFilter && (
              <button onClick={() => setModal('create')} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">
                <Plus className="w-4 h-4" /> Créer un bien
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
              {/* Stock indicator bar */}
              <div className={`h-1 w-full ${
                p.quantity === 0 ? 'bg-red-400' :
                p.quantity <= p.alert_threshold ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditing(p); setModal('edit'); }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1 line-clamp-2" title={p.designation}>{p.designation}</h3>
                <p className="text-xs text-slate-400 mb-2">{p.category?.name}</p>
                <div className="space-y-1 mb-3 text-[11px] text-slate-500 border-t border-slate-50 pt-2">
                  <p><span className="font-semibold text-slate-600">N° Inv:</span> {p.inventory_number || '—'}</p>
                  <p><span className="font-semibold text-slate-600">Loc:</span> {p.location || '—'} <span className="text-slate-300">|</span> <span className="font-semibold text-slate-600">Svc:</span> {p.user_service || '—'}</p>
                  <p><span className="font-semibold text-slate-600">Marque:</span> {p.brand || '—'} <span className="text-slate-300">|</span> <span className="font-semibold text-slate-600">S/N:</span> {p.serial_number || '—'}</p>
                  <p><span className="font-semibold text-slate-600">Réf Achat:</span> {p.purchase_reference || '—'}</p>
                </div>
                <div className="flex items-end justify-between border-t border-slate-50 pt-2">
                  <div>
                    {stockBadge(p)}
                    <p className="text-xs text-slate-500 mt-1.5">
                      <span className="font-bold text-slate-700">{p.quantity}</span> en stock
                      <span className="text-slate-300 mx-1">·</span>seuil: {p.alert_threshold}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800 text-sm">
                      {Number(p.price).toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">DH</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination meta={meta} onPageChange={setPage} />

      {/* Create Modal */}
      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Nouveau Bien d'Inventaire" maxWidth="max-w-2xl">
        <ProductForm categories={categories} onSubmit={handleCreate} loading={formLoading} />
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={modal === 'import'} onClose={() => setModal(null)} title="Importer des Biens d'Inventaire" maxWidth="max-w-xl">
        <ProductImportForm onSuccess={() => { setModal(null); load(); }} onCancel={() => setModal(null)} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }} title="Modifier le Bien" maxWidth="max-w-2xl">
        {editing && <ProductForm product={editing} categories={categories} onSubmit={handleUpdate} loading={formLoading} />}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer le bien d'inventaire"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.designation}" ? Cette action est irréversible et supprimera également l'historique des mouvements associés.`}
      />
    </div>
  );
};

export default Products;
