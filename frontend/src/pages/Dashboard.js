import React, { useState, useEffect } from 'react';
import {
  Package, ArrowUpRight, ArrowDownRight, AlertTriangle, Tag,
  TrendingUp, RefreshCw, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell
} from 'recharts';
import api from '../services/api';
import { Loader, StatCard, Badge } from '../components/ui';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-4 py-3">
      <p className="font-semibold text-slate-700 text-sm mb-2">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    setError(null);
    api.get('/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => setError('Impossible de charger le tableau de bord.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Loader text="Chargement du tableau de bord..." />;
  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertTriangle className="w-12 h-12 text-red-400" />
      <p className="text-slate-600">{error}</p>
      <button onClick={load} className="btn-primary flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Réessayer
      </button>
    </div>
  );

  const { stats, chart_weekly, chart_monthly, chart_categories, low_stock_products, recent_movements } = data;

  const pctChange = (curr, prev) => {
    if (!prev) return '+0%';
    const p = ((curr - prev) / prev * 100).toFixed(1);
    return (p >= 0 ? '+' : '') + p + '%';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vue d'ensemble</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
          <button
            onClick={() => navigate('/stock')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/30 transition-colors"
          >
            <TrendingUp className="w-4 h-4" /> Nouveau Mouvement
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Biens"
          value={stats.total_products.toLocaleString('fr-FR')}
          icon={Package}
          colorClass="bg-blue-50 text-blue-600"
          subtitle={`${stats.total_categories} familles`}
        />
        <StatCard
          title="Entrées ce mois"
          value={stats.entries_month.toLocaleString('fr-FR')}
          icon={ArrowUpRight}
          trend={pctChange(stats.entries_month, stats.entries_last)}
          isPositive={stats.entries_month >= stats.entries_last}
          colorClass="bg-emerald-50 text-emerald-600"
          subtitle="unités reçues"
        />
        <StatCard
          title="Sorties ce mois"
          value={stats.exits_month.toLocaleString('fr-FR')}
          icon={ArrowDownRight}
          trend={pctChange(stats.exits_month, stats.exits_last)}
          isPositive={stats.exits_month <= stats.exits_last}
          colorClass="bg-amber-50 text-amber-600"
          subtitle="unités sorties"
        />
        <StatCard
          title="Alertes Stock"
          value={stats.low_stock + stats.out_of_stock}
          icon={AlertTriangle}
          colorClass="bg-red-50 text-red-600"
          subtitle={`${stats.out_of_stock} en rupture`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly area chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800">Mouvements — 7 derniers jours</h3>
              <p className="text-xs text-slate-500 mt-0.5">Entrées et sorties de stock</p>
            </div>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart_weekly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntrees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSorties" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Area type="monotone" dataKey="entrees" name="Entrées" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorEntrees)" />
                <Area type="monotone" dataKey="sorties" name="Sorties" stroke="#ef4444" strokeWidth={2.5} fill="url(#colorSorties)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-800">Alertes Stock</h3>
              <p className="text-xs text-slate-500 mt-0.5">Produits en dessous du seuil</p>
            </div>
            {low_stock_products.length > 0 && (
              <Badge variant="danger">{low_stock_products.length}</Badge>
            )}
          </div>

          {low_stock_products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Package className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Aucune alerte stock</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {low_stock_products.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                  onClick={() => navigate('/products')}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.category}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold text-red-600 text-sm">{p.quantity}</p>
                    <p className="text-xs text-slate-400">/{p.alert_threshold}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate('/products?stock_status=low')}
            className="w-full mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 py-2 hover:bg-blue-50 rounded-xl transition-colors"
          >
            Voir tous les produits →
          </button>
        </div>
      </div>

      {/* Monthly Chart + Categories + Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Monthly */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800">Tendance Mensuelle</h3>
              <p className="text-xs text-slate-500 mt-0.5">6 derniers mois</p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart_monthly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Bar dataKey="entrees" name="Entrées" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sorties" name="Sorties" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Familles breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="mb-5">
            <h3 className="font-bold text-slate-800">Par Famille</h3>
            <p className="text-xs text-slate-500 mt-0.5">Répartition des biens</p>
          </div>
          <div className="space-y-3">
            {chart_categories.slice(0, 5).map((cat, i) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" style={{ color: COLORS[i % COLORS.length] }} />
                    <span className="font-medium text-slate-700 truncate max-w-[140px]">{cat.name}</span>
                  </div>
                  <span className="text-slate-500 text-xs font-medium">{cat.produits} bien(s)</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${chart_categories.length > 0 && chart_categories[0].produits > 0
                        ? Math.round((cat.produits / chart_categories[0].produits) * 100) : 0}%`,
                      backgroundColor: COLORS[i % COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">Mouvements Récents</h3>
            <p className="text-xs text-slate-500 mt-0.5">Dernières opérations de stock</p>
          </div>
          <button onClick={() => navigate('/stock')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Voir tout →
          </button>
        </div>
        {recent_movements.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-400">
            <Activity className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Aucun mouvement récent</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Type', 'Produit', 'Quantité', 'Référence', 'Opérateur', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent_movements.map((m, i) => (
                  <tr key={m.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                    <td className="px-4 py-3">
                      <Badge variant={m.type === 'entry' ? 'success' : 'danger'}>
                        {m.type === 'entry' ? '↑ Entrée' : '↓ Sortie'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{m.product}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">{m.quantity}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono">{m.reference}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{m.user}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
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

export default Dashboard;
