import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Tag, Pencil, Trash2, Package } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Modal, ConfirmDialog, Loader, EmptyState, Badge,
  FormField, Input, Textarea, Pagination
} from '../components/ui';

const FORM_DEFAULTS = { name: '', description: '' };

const CategoryForm = ({ category, onSubmit, loading }) => {
  const [form, setForm]     = useState(category || FORM_DEFAULTS);
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e2 = {};
    if (!form.name.trim()) e2.name = 'Le nom est requis.';
    setErrors(e2);
    if (Object.keys(e2).length === 0) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nom de la catégorie" required error={errors.name}>
        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Informatique" />
      </FormField>
      <FormField label="Description" error={errors.description}>
        <Textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description optionnelle..." />
      </FormField>
      <button type="submit" disabled={loading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
      >
        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {category ? 'Mettre à jour' : 'Créer la catégorie'}
      </button>
    </form>
  );
};

const Categories = () => {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [meta, setMeta]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [modal, setModal]           = useState(null);
  const [editing, setEditing]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/categories', { params: { page, per_page: 12, search } })
      .then(({ data }) => {
        if (data.data) { setCategories(data.data); setMeta(data.meta); }
        else { setCategories(data); setMeta(null); }
      })
      .catch(() => toast.error('Erreur lors du chargement.'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const handleCreate = async (form) => {
    setFormLoading(true);
    try {
      await api.post('/categories', form);
      toast.success('Catégorie créée !');
      setModal(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Erreur.');
    } finally { setFormLoading(false); }
  };

  const handleUpdate = async (form) => {
    setFormLoading(true);
    try {
      await api.put(`/categories/${editing.id}`, form);
      toast.success('Catégorie mise à jour !');
      setModal(null); setEditing(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${deleteTarget.id}`);
      toast.success('Catégorie supprimée.');
      setDeleteTarget(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible de supprimer cette catégorie.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Catégories</h1>
          <p className="text-slate-500 text-sm mt-0.5">{meta?.total ?? categories.length} catégories au total</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm shadow-blue-500/30 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Nouvelle Catégorie
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input className="pl-10" placeholder="Rechercher une catégorie..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <Loader text="Chargement des catégories..." />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Aucune catégorie"
          description={search ? "Aucune catégorie ne correspond à votre recherche." : "Créez votre première catégorie pour organiser vos produits."}
          action={!search && (
            <button onClick={() => setModal('create')} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">
              <Plus className="w-4 h-4" /> Créer une catégorie
            </button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditing(cat); setModal('edit'); }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(cat)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 mb-1">{cat.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-3">{cat.description || 'Aucune description'}</p>
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">{cat.products_count ?? 0} produit(s)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Nouvelle Catégorie">
        <CategoryForm onSubmit={handleCreate} loading={formLoading} />
      </Modal>

      <Modal isOpen={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }} title="Modifier la Catégorie">
        {editing && <CategoryForm category={editing} onSubmit={handleUpdate} loading={formLoading} />}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer la catégorie"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ? Cette action ne sera possible que si aucun produit n'y est associé.`}
      />
    </div>
  );
};

export default Categories;
