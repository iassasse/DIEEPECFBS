import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Users as UsersIcon, Pencil, Trash2, Shield, Download } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Modal, ConfirmDialog, Loader, EmptyState, Badge,
  FormField, Input, Select, Pagination
} from '../components/ui';

const ROLE_BADGES = {
  Admin: 'purple',
  Gestionnaire: 'info',
  Utilisateur: 'default',
};

const UserForm = ({ user, roles, onSubmit, loading }) => {
  const [form, setForm]     = useState({ name: '', email: '', role: '', password: '', password_confirmation: '', ...user });
  const [errors, setErrors] = useState({});
  const isEdit = !!user;

  const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: undefined })); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e2 = {};
    if (!form.name.trim()) e2.name = 'Nom requis.';
    if (!form.email.trim()) e2.email = 'Email requis.';
    if (!form.role) e2.role = 'Rôle requis.';
    if (!isEdit && !form.password) e2.password = 'Mot de passe requis.';
    if (form.password && form.password !== form.password_confirmation) e2.password_confirmation = 'Les mots de passe ne correspondent pas.';
    setErrors(e2);
    if (!Object.keys(e2).length) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nom complet" required error={errors.name}>
        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Jean Dupont" />
      </FormField>
      <FormField label="Email" required error={errors.email}>
        <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@exemple.com" />
      </FormField>
      <FormField label="Rôle" required error={errors.role}>
        <Select value={form.role} onChange={e => set('role', e.target.value)}>
          <option value="">-- Sélectionner un rôle --</option>
          {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </Select>
      </FormField>
      <FormField label={isEdit ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'} required={!isEdit} error={errors.password}>
        <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
      </FormField>
      {(form.password || !isEdit) && (
        <FormField label="Confirmer le mot de passe" error={errors.password_confirmation}>
          <Input type="password" value={form.password_confirmation} onChange={e => set('password_confirmation', e.target.value)} placeholder="••••••••" />
        </FormField>
      )}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
      >
        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {isEdit ? 'Mettre à jour' : 'Créer l\'utilisateur'}
      </button>
    </form>
  );
};

const UsersPage = () => {
  const { hasRole, user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers]     = useState([]);
  const [roles, setRoles]     = useState([]);
  const [meta, setMeta]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isAdmin = hasRole('Admin');

  const load = useCallback(() => {
    if (!isAdmin) return;
    setLoading(true);
    api.get('/users', { params: { page, per_page: 12, search, role: roleFilter } })
      .then(({ data }) => { setUsers(data.data); setMeta(data.meta); })
      .catch(() => toast.error('Erreur lors du chargement.'))
      .finally(() => setLoading(false));
  }, [page, search, roleFilter, isAdmin]);

  useEffect(() => {
    if (isAdmin) api.get('/roles').then(({ data }) => setRoles(data)).catch(() => {});
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const handleExport = async (format) => {
    try {
      toast.info(`Préparation de l'export ${format.toUpperCase()}...`);
      const params = { search, role: roleFilter, format };
      const response = await api.get('/users/export', { params, responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
      link.setAttribute('download', `export_utilisateurs_${dateStr}_${timeStr}.${format}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Exportation réussie !');
    } catch (err) {
      toast.error('Erreur lors de l\'exportation.');
    }
  };

  // Guard AFTER hooks
  if (!isAdmin) return <Navigate to="/" replace />;

  const handleCreate = async (form) => {
    setFormLoading(true);
    try {
      await api.post('/users', form);
      toast.success('Utilisateur créé !');
      setModal(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Erreur.');
    } finally { setFormLoading(false); }
  };

  const handleUpdate = async (form) => {
    setFormLoading(true);
    try {
      await api.put(`/users/${editing.id}`, form);
      toast.success('Utilisateur mis à jour !');
      setModal(null); setEditing(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      toast.success('Utilisateur supprimé.');
      setDeleteTarget(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Utilisateurs</h1>
          <p className="text-slate-500 text-sm mt-0.5">{meta?.total ?? '—'} utilisateurs enregistrés</p>
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

          <button onClick={() => setModal('create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm shadow-blue-500/30 transition-colors text-sm">
            <Plus className="w-4 h-4" /> Nouvel Utilisateur
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input className="pl-10" placeholder="Rechercher par nom ou email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-44">
              <option value="">Tous les rôles</option>
              {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </Select>
          </div>
        </div>
      </div>

      {loading ? <Loader text="Chargement des utilisateurs..." /> : users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Aucun utilisateur" description={search ? "Aucun résultat." : "Créez le premier utilisateur."} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
              <div className={`h-1 w-full ${
                u.role === 'Admin' ? 'bg-purple-500' :
                u.role === 'Gestionnaire' ? 'bg-blue-500' : 'bg-slate-300'
              }`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-base">
                    {initials(u.name)}
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {u.id !== me?.id && (
                      <>
                        <button onClick={() => { setEditing(u); setModal('edit'); }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(u)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 mb-0.5">{u.name}</h3>
                <p className="text-sm text-slate-500 mb-3 truncate">{u.email}</p>
                <div className="flex items-center justify-between">
                  <Badge variant={ROLE_BADGES[u.role] || 'default'}>
                    <Shield className="w-3 h-3 mr-1" />{u.role}
                  </Badge>
                  {u.id === me?.id && <span className="text-xs text-slate-400 italic">Votre compte</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Nouvel Utilisateur">
        <UserForm roles={roles} onSubmit={handleCreate} loading={formLoading} />
      </Modal>

      <Modal isOpen={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }} title="Modifier l'Utilisateur">
        {editing && <UserForm user={editing} roles={roles} onSubmit={handleUpdate} loading={formLoading} />}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer l'utilisateur"
        message={`Supprimer "${deleteTarget?.name}" ? Cette action est irréversible.`}
      />
    </div>
  );
};

export default UsersPage;
