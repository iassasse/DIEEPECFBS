import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Tag, Pencil, Trash2, Package } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Modal, ConfirmDialog, Loader, EmptyState,
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
      <FormField label="Nom de la famille" required error={errors.name}>
        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Achat de matériel informatique" />
      </FormField>
      <FormField label="Description" error={errors.description}>
        <Textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description optionnelle..." />
      </FormField>
      <button type="submit" disabled={loading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
      >
        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {category ? 'Mettre à jour' : 'Créer la famille'}
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
  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch]         = useState('');
  const [modal, setModal]           = useState(null);
  const [editing, setEditing]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { hasRole } = useAuth();
  const isAdmin = hasRole('Admin');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const handleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllPage = () => {
    const pageIds = categories.map(c => c.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const newSelection = [...prev];
        pageIds.forEach(id => {
          if (!newSelection.includes(id)) newSelection.push(id);
        });
        return newSelection;
      });
    }
  };

  // Clear selection on page/filter change
  useEffect(() => {
    setSelectedIds([]);
  }, [page, search]);

  // Debounce search input to avoid hitting the API on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/categories', { params: { page, per_page: 12, search } })
      .then(({ data }) => {
        if (data.data) {
          if (page > 1 && data.data.length === 0) {
            setPage(prev => Math.max(1, prev - 1));
          } else {
            setCategories(data.data);
            setMeta(data.meta);
          }
        }
        else { setCategories(data); setMeta(null); }
      })
      .catch(() => toast.error('Erreur lors du chargement des familles.'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const handleCreate = async (form) => {
    setFormLoading(true);
    try {
      await api.post('/categories', form);
      toast.success('Famille créée !');
      setModal(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Erreur.');
    } finally { setFormLoading(false); }
  };

  const handleUpdate = async (form) => {
    setFormLoading(true);
    try {
      await api.put(`/categories/${editing.id}`, form);
      toast.success('Famille mise à jour !');
      setModal(null); setEditing(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${deleteTarget.id}`);
      toast.success('Famille supprimée.');
      setDeleteTarget(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible de supprimer cette famille.');
    }
  };

  const handleBulkDelete = async () => {
    setBulkActionLoading(true);
    try {
      await api.delete('/categories', { data: { ids: selectedIds } });
      toast.success('Familles sélectionnées supprimées.');
      setSelectedIds([]);
      setConfirmBulkDelete(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setBulkActionLoading(true);
    try {
      await api.delete('/categories', { data: { all: true } });
      toast.success('Toutes les familles ont été supprimées.');
      setSelectedIds([]);
      setConfirmDeleteAll(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Familles</h1>
          <p className="text-slate-500 text-sm mt-0.5">{meta?.total ?? categories.length} familles au total</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm shadow-blue-500/30 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Nouvelle Famille
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative max-w-md h-fit">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input className="pl-10" placeholder="Rechercher une famille..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <Loader text="Chargement des familles..." />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Aucune famille"
          description={search ? "Aucune famille ne correspond à votre recherche." : "Créez votre première famille pour organiser votre inventaire."}
          action={!search && (
            <button onClick={() => setModal('create')} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">
              <Plus className="w-4 h-4" /> Créer une famille
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
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(cat.id)}
                      onChange={() => handleSelectRow(cat.id)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer bg-white"
                    />
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Tag className="w-5 h-5 text-blue-500" />
                    </div>
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
                  <span className="text-xs text-slate-500 font-medium">{cat.products_count ?? 0} bien(s) associé(s)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Nouvelle Famille">
        <CategoryForm onSubmit={handleCreate} loading={formLoading} />
      </Modal>

      <Modal isOpen={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }} title="Modifier la Famille">
        {editing && <CategoryForm category={editing} onSubmit={handleUpdate} loading={formLoading} />}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer la famille"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ? Cette action ne sera possible que si aucun bien d'inventaire ne lui est associé.`}
      />

      {/* Sticky selection bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl px-6 py-4 flex items-center justify-between gap-6 z-50 animate-in slide-in-from-top-2 duration-300 w-[calc(100%-2rem)] max-w-2xl">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={categories.length > 0 && categories.every(c => selectedIds.includes(c.id))}
              onChange={handleSelectAllPage}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm font-semibold text-slate-700">
              {selectedIds.length} sélectionné(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkActionLoading}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer border border-red-200"
            >
              <Trash2 className="w-4 h-4" /> Supprimer la sélection
            </button>
            {isAdmin && (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                disabled={bulkActionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Tout supprimer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        isOpen={confirmBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Supprimer la sélection"
        message={`Êtes-vous sûr de vouloir supprimer les ${selectedIds.length} familles sélectionnées ? Cette action n'est possible que si aucun bien d'inventaire ne leur est associé.`}
      />

      {/* Delete All Confirm */}
      <ConfirmDialog
        isOpen={confirmDeleteAll}
        onCancel={() => setConfirmDeleteAll(false)}
        onConfirm={handleDeleteAll}
        title="Tout supprimer"
        message="Êtes-vous sûr de vouloir supprimer ABSOLUMENT TOUS les familles ? Cette action n'est possible que si aucun bien d'inventaire n'est associé à aucune d'entre elles."
      />
    </div>
  );
};

export default Categories;
