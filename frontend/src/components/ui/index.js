import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

// ── Modal ──────────────────────────────────────────────────────
export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col animate-scale-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// ── Confirm Dialog ─────────────────────────────────────────────
export const ConfirmDialog = ({ isOpen, onConfirm, onCancel, title, message, confirmLabel = 'Supprimer', danger = true }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
          <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-600' : 'text-amber-600'}`} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 font-medium rounded-xl text-white transition-colors text-sm
              ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Loader ─────────────────────────────────────────────────────
export const Loader = ({ text = 'Chargement...' }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
    <p className="text-slate-500 text-sm font-medium">{text}</p>
  </div>
);

// ── Empty State ────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      {Icon && <Icon className="w-8 h-8 text-slate-400" />}
    </div>
    <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">{description}</p>
    {action}
  </div>
);

// ── Badge ──────────────────────────────────────────────────────
export const Badge = ({ children, variant = 'default' }) => {
  const styles = {
    default:  'bg-slate-100 text-slate-700',
    success:  'bg-emerald-100 text-emerald-700',
    warning:  'bg-amber-100 text-amber-700',
    danger:   'bg-red-100 text-red-700',
    info:     'bg-blue-100 text-blue-700',
    purple:   'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  );
};

// ── Form Input ─────────────────────────────────────────────────
export const FormField = ({ label, error, required, children }) => (
  <div>
    {label && (
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    {children}
    {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
  </div>
);

export const Input = React.forwardRef(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800
      placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      transition-all duration-200 ${className}`}
    {...props}
  />
));

export const Select = React.forwardRef(({ className = '', children, ...props }, ref) => (
  <select
    ref={ref}
    className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      transition-all duration-200 bg-white ${className}`}
    {...props}
  >
    {children}
  </select>
));

export const Textarea = React.forwardRef(({ className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800
      placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      transition-all duration-200 resize-none ${className}`}
    {...props}
  />
));

// ── Pagination ─────────────────────────────────────────────────
export const Pagination = ({ meta, onPageChange }) => {
  if (!meta || meta.last_page <= 1) return null;
  const pages = Array.from({ length: meta.last_page }, (_, i) => i + 1);
  const visible = pages.filter(p => p === 1 || p === meta.last_page || Math.abs(p - meta.current_page) <= 2);

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm text-slate-500">
        {meta.from}–{meta.to} sur {meta.total} résultats
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(meta.current_page - 1)}
          disabled={meta.current_page === 1}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Préc.
        </button>
        {visible.map((p, i) => {
          const prev = visible[i - 1];
          const showEllipsis = prev && p - prev > 1;
          return (
            <React.Fragment key={p}>
              {showEllipsis && <span className="px-2 text-slate-400">…</span>}
              <button
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                  ${meta.current_page === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                {p}
              </button>
            </React.Fragment>
          );
        })}
        <button
          onClick={() => onPageChange(meta.current_page + 1)}
          disabled={meta.current_page === meta.last_page}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Suiv. →
        </button>
      </div>
    </div>
  );
};

// ── Stats Card ─────────────────────────────────────────────────
export const StatCard = ({ title, value, icon: Icon, trend, isPositive, colorClass, subtitle }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-3">
      <div className={`p-2.5 rounded-xl ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full
          ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {isPositive ? '↑' : '↓'} {trend}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
    <p className="text-sm font-medium text-slate-500 mt-0.5">{title}</p>
    {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
  </div>
);
