import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, StatCard } from '@/components/common';
import { useSurgeriesLive } from '@/hooks/useSurgeries';
import { SALAS, STATUS_LABELS } from '@/utils/constants';
import { formatDate, procedureNames, todayISO } from '@/utils/format';
import type { Surgery } from '@/types';

export default function DashboardPage() {
  const { data, loading, error } = useSurgeriesLive();
  const today = todayISO();
  const todays = useMemo(() => data.filter((s) => s.date === today).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')), [data, today]);
  const future = useMemo(() => data.filter((s) => s.date > today && s.status !== 'cancelada').sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')).slice(0, 8), [data, today]);
  const n = (f: (s: Surgery) => boolean) => todays.filter(f).length;
  const pendingClinic = useMemo(() => data.filter((s) => s.clinicaId && s.status === 'pendente' && !s.room).length, [data]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  return (
    <div>
      <PageHeader title="Visão geral" subtitle={`Hoje, ${formatDate(today)}`} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Em andamento" value={n((s) => ['em_andamento', 'em_preparacao', 'recuperacao'].includes(s.status))} icon={<Activity />} />
        <StatCard label="Aguardando" value={n((s) => s.status === 'pendente')} icon={<Clock />} />
        <StatCard label="Finalizadas" value={n((s) => s.status === 'concluida')} icon={<CheckCircle2 />} tone="text-emerald-600" />
        <StatCard label="Canceladas/Suspensas" value={n((s) => s.status === 'cancelada' || s.status === 'suspensa')} icon={<XCircle />} tone="text-red-600" />
      </div>
      {pendingClinic > 0 && <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{pendingClinic} solicitação(ões) de clínicas aguardando sala. <Link className="underline" to="/clinicas">Ver solicitações</Link></div>}
      <h2 className="mb-2 font-bold text-brand">Salas hoje</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SALAS.map((sala) => {
          const items = todays.filter((s) => s.room === sala && s.status !== 'cancelada');
          return <div key={sala} className="card"><div className="mb-1 font-semibold">{sala}</div>{items.length === 0 ? <p className="text-xs text-slate-400">Livre</p> : items.map((s) => <div key={s.id} className="mb-1 text-xs"><b>{s.time}</b> {s.patient}<div><Badge tone={s.status}>{STATUS_LABELS[s.status]}</Badge></div></div>)}</div>;
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card"><h2 className="mb-2 font-bold text-brand">Cirurgias de hoje</h2>{todays.length === 0 ? <EmptyState /> : <ul className="space-y-2 text-sm">{todays.map((s) => <li key={s.id} className="flex justify-between gap-2 border-b border-slate-100 pb-1"><span><b>{s.time ?? '--:--'}</b> {s.patient}<span className="block text-xs text-slate-500">{procedureNames(s.type).join(', ')}</span></span><Badge tone={s.status}>{STATUS_LABELS[s.status]}</Badge></li>)}</ul>}</section>
        <section className="card"><h2 className="mb-2 font-bold text-brand">Próximas</h2>{future.length === 0 ? <EmptyState /> : <ul className="space-y-2 text-sm">{future.map((s) => <li key={s.id} className="border-b border-slate-100 pb-1"><b>{formatDate(s.date)} {s.time}</b> — {s.patient}<span className="block text-xs text-slate-500">{procedureNames(s.type).join(', ')}</span></li>)}</ul>}</section>
      </div>
    </div>
  );
}
