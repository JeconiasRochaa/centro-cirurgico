import { useEffect, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Loader2, Inbox, X } from 'lucide-react';
import clsx from 'clsx';

export function Spinner({ label = 'Carregando...' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 p-8 text-slate-500" role="status"><Loader2 className="animate-spin" size={18} /> {label}</div>;
}

export function EmptyState({ children = 'Nenhum registro encontrado.' }: { children?: ReactNode }) {
  return <div className="flex flex-col items-center gap-2 p-8 text-sm text-slate-400"><Inbox size={28} />{children}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}{onRetry && <button className="btn-secondary btn-sm ml-3" onClick={onRetry}>Tentar novamente</button>}</div>;
}

export function Button({ loading, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return <button {...rest} disabled={rest.disabled || loading} className={className}>{loading && <Loader2 className="animate-spin" size={16} />}{children}</button>;
}

const BADGES: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-800', em_preparacao: 'bg-violet-100 text-violet-800', em_andamento: 'bg-sky-100 text-sky-800',
  recuperacao: 'bg-teal-100 text-teal-800', concluida: 'bg-emerald-100 text-emerald-800', suspensa: 'bg-slate-200 text-slate-700',
  cancelada: 'bg-red-100 text-red-800', ok: 'bg-emerald-100 text-emerald-800', neutral: 'bg-slate-100 text-slate-700'
};
export function Badge({ tone = 'neutral', children }: { tone?: string; children: ReactNode }) {
  return <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', BADGES[tone] ?? BADGES.neutral)}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold text-brand">{title}</h1>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({ open, title, onClose, children, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={clsx('mt-8 w-full rounded-xl bg-white p-5 shadow-xl', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-brand">{title}</h2><button onClick={onClose} aria-label="Fechar" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger, loading, onConfirm, onClose }: {
  open: boolean; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="text-sm text-slate-600">{message}</div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <Button className={danger ? 'btn-danger' : 'btn-primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return <label className={clsx('block', className)}><span className="label">{label}</span>{children}{error && <p className="field-error" role="alert">{error}</p>}</label>;
}

export function StatCard({ label, value, icon, tone = 'text-brand' }: { label: string; value: ReactNode; icon?: ReactNode; tone?: string }) {
  return <div className="card flex items-center gap-3"><div className={clsx('rounded-lg bg-brand-50 p-2', tone)}>{icon}</div><div><div className="text-2xl font-bold text-slate-800">{value}</div><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div></div></div>;
}
