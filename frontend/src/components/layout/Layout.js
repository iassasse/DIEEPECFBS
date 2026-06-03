import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ArrowRightLeft, Users, FileText,
  Settings, LogOut, Menu, Bell, X, ChevronRight,
  AlertTriangle, CheckCircle, Info, Tag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

const NavItem = ({ item, isActive, onClick }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative
        ${isActive
          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <Icon className={`w-5 h-5 mr-3 flex-shrink-0 transition-transform group-hover:scale-110
        ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}
      />
      <span className="font-medium text-sm">{item.label}</span>
      {isActive && <ChevronRight className="w-4 h-4 ml-auto text-white/70" />}
    </Link>
  );
};

const NotificationPanel = ({ onClose }) => {
  const [data, setData] = useState({ notifications: [], unread_count: 0 });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get('/notifications')
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Erreur chargement notifications'))
      .finally(() => setLoading(false));
  }, []);

  const markAll = async () => {
    await api.post('/notifications/read-all');
    setData(prev => ({
      ...prev,
      unread_count: 0,
      notifications: prev.notifications.map(n => ({ ...n, read_at: new Date().toISOString() }))
    }));
  };

  const typeIcon = (type) => {
    if (type === 'low_stock') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    if (type === 'success')   return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">Notifications</h3>
        <div className="flex items-center gap-2">
          {data.unread_count > 0 && (
            <button onClick={markAll} className="text-xs text-blue-600 hover:underline">
              Tout lire
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : data.notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-slate-400">
            <Bell className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Aucune notification</p>
          </div>
        ) : (
          data.notifications.map((n) => {
            const d = n.data || {};
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors
                  ${!n.read_at ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex-shrink-0 mt-0.5">{typeIcon(d.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{d.title || 'Notification'}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">{d.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.read_at && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const Layout = () => {
  const { user, logout, hasRole } = useAuth();
  const toast    = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [showNotifs, setShowNotifs]     = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);
  const notifRef = useRef(null);

  const allMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/',          roles: null },
    { icon: Package,         label: 'Inventaire',   path: '/products',  roles: null },
    { icon: Tag,             label: 'Familles',     path: '/categories',roles: null },
    { icon: ArrowRightLeft,  label: 'Mouvements',   path: '/stock',     roles: null },
    { icon: Users,           label: 'Utilisateurs', path: '/users',     roles: ['Admin'] },
    { icon: FileText,        label: 'Rapports',     path: '/reports',   roles: null },
    { icon: Settings,        label: 'Paramètres',   path: '/settings',  roles: null },
  ];

  const menuItems = allMenuItems.filter(item =>
    !item.roles || hasRole(item.roles)
  );

  useEffect(() => {
    const fetchUnread = () => {
      api.get('/notifications')
        .then(({ data }) => setUnreadCount(data.unread_count))
        .catch(() => {});
    };

    fetchUnread(); // initial fetch
    const interval = setInterval(fetchUnread, 15000); // 15 seconds polling

    return () => clearInterval(interval);
  }, [location]);

  // Close notif panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.info('Vous avez été déconnecté.');
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const roleColors = {
    Admin: 'bg-purple-100 text-purple-700',
    Gestionnaire: 'bg-blue-100 text-blue-700',
    Utilisateur: 'bg-slate-100 text-slate-600',
  };
  const roleColor = roleColors[user?.role] || 'bg-slate-100 text-slate-600';

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        bg-white w-64 border-r border-slate-200 flex flex-col z-50 h-full
        fixed md:relative transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100 flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mr-3 shadow-md shadow-blue-500/30">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-slate-800 tracking-tight">
              DIEEPEC<span className="text-blue-600">FBS</span>
            </span>
            <p className="text-xs text-slate-400 leading-none">Gestion d'Inventaire</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Navigation</p>
          {menuItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              isActive={item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-slate-100 flex-shrink-0">
          <div className="flex items-center px-3 py-2.5 rounded-xl bg-slate-50 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-2.5 text-blue-700 font-bold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{user?.name}</p>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${roleColor}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors group"
          >
            <LogOut className="w-4 h-4 mr-3 text-slate-400 group-hover:text-red-500 transition-colors" />
            <span className="font-medium text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 z-10 flex-shrink-0">
          <button
            className="md:hidden text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page breadcrumb */}
          <div className="hidden md:flex items-center text-sm text-slate-500">
            <span className="font-medium">
              {menuItems.find(i => i.path === '/' ? location.pathname === '/' : location.pathname.startsWith(i.path))?.label || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
            </div>

            {/* User avatar */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs cursor-pointer">
                {initials}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
