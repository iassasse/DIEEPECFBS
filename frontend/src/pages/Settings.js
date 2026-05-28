import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Shield, 
  Bell, 
  Database, 
  Settings as SettingsIcon, 
  Lock,
  Check,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCcw,
  CheckCircle,
  Settings2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Badge, FormField, Input, ConfirmDialog, Loader, EmptyState } from '../components/ui';

const Settings = () => {
  const { user } = useAuth();
  const toast = useToast();
  
  // Active Tab: profile, security, notifications, backups, general
  const [activeTab, setActiveTab] = useState('profile');
  
  // --- Security Tab State ---
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [securityErrors, setSecurityErrors] = useState({});
  const [securityLoading, setSecurityLoading] = useState(false);
  
  // --- Notifications Tab State ---
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  
  // --- Backups Tab State ---
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupActionLoading, setBackupActionLoading] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(null); // stores backup filename to restore
  const [confirmDelete, setConfirmDelete] = useState(null); // stores backup filename to delete

  const isAdmin = user?.role === 'Admin';
  const ROLE_BADGES = { Admin: 'purple', Gestionnaire: 'info', Utilisateur: 'default' };

  // ── Load Notifications ─────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
    } catch (err) {
      toast.error('Impossible de charger les notifications.');
    } finally {
      setNotifLoading(false);
    }
  }, [toast]);

  // ── Load Backups ───────────────────────────────────────────────
  const loadBackups = useCallback(async () => {
    if (!isAdmin) return;
    setBackupLoading(true);
    try {
      const { data } = await api.get('/backups');
      setBackups(data || []);
    } catch (err) {
      toast.error('Impossible de charger la liste des sauvegardes.');
    } finally {
      setBackupLoading(false);
    }
  }, [isAdmin, toast]);

  // Load appropriate data on tab change
  useEffect(() => {
    if (activeTab === 'notifications') {
      loadNotifications();
    } else if (activeTab === 'backups') {
      loadBackups();
    }
  }, [activeTab, loadNotifications, loadBackups]);

  // ── Security Handle ────────────────────────────────────────────
  const handleSecurityChange = (key, val) => {
    setPasswordForm(prev => ({ ...prev, [key]: val }));
    setSecurityErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    setSecurityErrors({});
    
    // Client-side quick check
    const errors = {};
    if (!passwordForm.current_password) errors.current_password = 'Le mot de passe actuel est requis.';
    if (!passwordForm.new_password) errors.new_password = 'Le nouveau mot de passe est requis.';
    if (passwordForm.new_password.length < 6) errors.new_password = 'Le nouveau mot de passe doit faire au moins 6 caractères.';
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      errors.new_password_confirmation = 'Les mots de passe ne correspondent pas.';
    }
    
    if (Object.keys(errors).length > 0) {
      setSecurityErrors(errors);
      return;
    }

    setSecurityLoading(true);
    try {
      await api.post('/change-password', passwordForm);
      toast.success('Votre mot de passe a été modifié avec succès !');
      setPasswordForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
    } catch (err) {
      if (err.response?.status === 422) {
        // Backend validation errors
        const backendErrors = err.response.data.errors || {};
        const formatted = {};
        Object.keys(backendErrors).forEach(key => {
          formatted[key] = backendErrors[key][0];
        });
        setSecurityErrors(formatted);
      } else {
        toast.error(err.response?.data?.message || 'Erreur lors du changement de mot de passe.');
      }
    } finally {
      setSecurityLoading(false);
    }
  };

  // ── Notifications Actions ──────────────────────────────────────
  const handleMarkAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
      toast.success('Notification marquée comme lue.');
    } catch (err) {
      toast.error('Erreur.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      toast.success('Toutes les notifications sont marquées comme lues.');
    } catch (err) {
      toast.error('Erreur.');
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification supprimée.');
    } catch (err) {
      toast.error('Erreur.');
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      toast.success('Historique des notifications vidé.');
    } catch (err) {
      toast.error('Erreur.');
    }
  };

  // ── Backups Actions ────────────────────────────────────────────
  const handleCreateBackup = async () => {
    setBackupActionLoading(true);
    toast.info('Création de la sauvegarde en cours...');
    try {
      const { data } = await api.post('/backups');
      setBackups(prev => [data.backup, ...prev]);
      toast.success('Sauvegarde de la base de données créée avec succès !');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création de la sauvegarde.');
    } finally {
      setBackupActionLoading(false);
    }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      toast.info('Préparation du téléchargement...');
      const response = await api.get(`/backups/${filename}/download`, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Téléchargement démarré !');
    } catch (err) {
      toast.error('Erreur lors du téléchargement du fichier.');
    }
  };

  const handleRestoreBackup = async () => {
    if (!confirmRestore) return;
    setBackupActionLoading(true);
    setConfirmRestore(null);
    toast.info('Restauration de la base de données en cours...');
    try {
      await api.post('/backups/restore', { filename: confirmRestore });
      toast.success('Base de données restaurée avec succès ! L\'application va s\'actualiser.');
      // Refresh the page after 2 seconds to reload state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la restauration.');
    } finally {
      setBackupActionLoading(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!confirmDelete) return;
    setBackupActionLoading(true);
    const filename = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/backups/${filename}`);
      setBackups(prev => prev.filter(b => b.filename !== filename));
      toast.success('Fichier de sauvegarde supprimé.');
    } catch (err) {
      toast.error('Erreur lors de la suppression du fichier.');
    } finally {
      setBackupActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Paramètres</h1>
        <p className="text-slate-500 text-sm mt-0.5">Configurez votre compte et gérez le système</p>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-2 space-y-1">
          {[
            { id: 'profile', icon: User, label: 'Mon Compte' },
            { id: 'security', icon: Shield, label: 'Sécurité' },
            { id: 'notifications', icon: Bell, label: 'Notifications' },
            ...(isAdmin ? [{ id: 'backups', icon: Database, label: 'Sauvegarde DB' }] : []),
            { id: 'general', icon: SettingsIcon, label: 'Général' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 shadow-sm border-l-4 border-blue-600 pl-3' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Side Content Area */}
        <div className="lg:col-span-3">
          
          {/* ── Mon Compte Tab ────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-800 text-lg">Informations du compte</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { label: 'Nom complet', value: user?.name },
                  { label: 'Adresse email', value: user?.email },
                  { label: 'Rôle d\'accès', value: <Badge variant={ROLE_BADGES[user?.role]}>{user?.role}</Badge> },
                  { label: 'Statut du compte', value: <Badge variant="success">Actif</Badge> },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
                    <div className="text-sm font-semibold text-slate-800">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Sécurité Tab ──────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <Shield className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-800 text-lg">Sécurité & Mot de passe</h2>
              </div>
              
              <form onSubmit={handleSecuritySubmit} className="space-y-4 max-w-md">
                <FormField label="Mot de passe actuel" required error={securityErrors.current_password}>
                  <div className="relative">
                    <Input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={e => handleSecurityChange('current_password', e.target.value)}
                      placeholder="Saisissez votre mot de passe actuel"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  </div>
                </FormField>

                <FormField label="Nouveau mot de passe" required error={securityErrors.new_password}>
                  <div className="relative">
                    <Input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={e => handleSecurityChange('new_password', e.target.value)}
                      placeholder="Au moins 6 caractères"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  </div>
                </FormField>

                <FormField label="Confirmer le nouveau mot de passe" required error={securityErrors.new_password_confirmation}>
                  <div className="relative">
                    <Input
                      type="password"
                      value={passwordForm.new_password_confirmation}
                      onChange={e => handleSecurityChange('new_password_confirmation', e.target.value)}
                      placeholder="Saisissez à nouveau le nouveau mot de passe"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  </div>
                </FormField>

                <button
                  type="submit"
                  disabled={securityLoading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {securityLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Modifier le mot de passe
                </button>
              </form>
            </div>
          )}

          {/* ── Notifications Tab ─────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <h2 className="font-bold text-slate-800 text-lg">Historique des notifications</h2>
                </div>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Tout marquer comme lu
                    </button>
                    <button
                      onClick={handleDeleteAllNotifications}
                      className="text-xs font-semibold px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                    >
                      Tout supprimer
                    </button>
                  </div>
                )}
              </div>

              {notifLoading ? (
                <Loader text="Chargement des notifications..." />
              ) : notifications.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="Aucune notification"
                  description="Vous êtes à jour ! Aucun message système ou alerte de stock disponible."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map(n => {
                    const isUnread = !n.read_at;
                    const notifData = n.data || {};
                    return (
                      <div 
                        key={n.id} 
                        className={`py-4 flex items-start justify-between gap-4 transition-all ${
                          isUnread ? 'bg-blue-50/20 px-3 -mx-3 rounded-xl border border-blue-50/50' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isUnread && <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />}
                            <span className="font-bold text-sm text-slate-800">
                              {notifData.title || 'Système'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(n.created_at).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {notifData.message || 'Nouvelle notification système.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isUnread && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                              title="Marquer comme lu"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(n.id)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 hover:text-rose-600 text-slate-400 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Sauvegarde Tab ────────────────────────────────────── */}
          {activeTab === 'backups' && isAdmin && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-blue-600" />
                  <h2 className="font-bold text-slate-800 text-lg">Gestion des sauvegardes SQLite</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadBackups}
                    disabled={backupLoading || backupActionLoading}
                    className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-4 h-4 text-slate-600 ${backupLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleCreateBackup}
                    disabled={backupLoading || backupActionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Database className="w-4 h-4" /> Créer une sauvegarde
                  </button>
                </div>
              </div>

              {backupLoading ? (
                <Loader text="Chargement de l'historique..." />
              ) : backups.length === 0 ? (
                <EmptyState
                  icon={Database}
                  title="Aucune sauvegarde"
                  description="Aucun fichier de sauvegarde n'a encore été créé. Cliquez sur le bouton ci-dessus pour effectuer votre première sauvegarde SQLite."
                />
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-sm">
                  <table className="w-full text-left text-slate-600 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase">
                        <th className="px-5 py-3">Fichier</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3 text-right">Taille</th>
                        <th className="px-5 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {backups.map(b => (
                        <tr key={b.filename} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-semibold text-slate-800 font-mono text-xs">{b.filename}</td>
                          <td className="px-5 py-3 text-slate-500">{new Date(b.created_at).toLocaleString('fr-FR')}</td>
                          <td className="px-5 py-3 text-right font-bold text-slate-700">{b.size}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleDownloadBackup(b.filename)}
                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                title="Télécharger"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConfirmRestore(b.filename)}
                                className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                                title="Restaurer"
                              >
                                <RefreshCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(b.filename)}
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Général Tab ───────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <Settings2 className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-800 text-lg">Configuration générale</h2>
              </div>
              
              <div className="flex flex-col items-center justify-center py-10 text-center max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <SettingsIcon className="w-8 h-8 animate-spin-slow" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Réglages système</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  Les configurations globales de l'application (devise, fuseau horaire, nom du site, seuils généraux d'alertes) sont actuellement gérées automatiquement par les services d'arrière-plan.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  Système optimisé (DIEEPEC FBS)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialogs for Backups */}
      <ConfirmDialog
        isOpen={!!confirmRestore}
        title="Restaurer la base de données ?"
        message={`Êtes-vous sûr de vouloir restaurer la base de données à partir de la sauvegarde "${confirmRestore}" ? Cette action écrasera irréversiblement toutes les données actuelles de l'application.`}
        confirmLabel="Restaurer"
        danger={false}
        onConfirm={handleRestoreBackup}
        onCancel={() => setConfirmRestore(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Supprimer la sauvegarde ?"
        message={`Voulez-vous supprimer définitivement le fichier de sauvegarde "${confirmDelete}" ? Cette opération est irréversible.`}
        confirmLabel="Supprimer"
        danger={true}
        onConfirm={handleDeleteBackup}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

// Simple spinner icon wrapper
const Loader2 = ({ className }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default Settings;
