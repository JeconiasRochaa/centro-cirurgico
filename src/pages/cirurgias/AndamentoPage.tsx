import { useMemo, useState } from 'react';
import { ChevronRight, Undo2 } from 'lucide-react';
import { Button, ConfirmDialog, ErrorState, Field, Modal, PageHeader, Spinner } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSurgeriesLive } from '@/hooks/useSurgeries';
import { setSurgeryStatus } from '@/services/database/surgeries';
import { SALAS, STATUS_LABELS } from '@/utils/constants';
import { todayISO } from '@/utils/format';
import { friendlyError } from '@/utils/errors';
import { cn } from '@/utils/cn';
import type { Surgery, SurgeryStatus } from '@/types';
import { ADVANCE, BACK } from './fluxo';

const COLUMNS: { status: SurgeryStatus; accent: string }[] = [
  { status: 'pendente', accent: 'border-t-amber-500' },
  { status: 'em_preparacao', accent: 'border-t-violet-500' },
  { status: 'em_andamento', accent: 'border-t-sky-500' },
  { status: 'recuperacao', accent: 'border-t-teal-500' },
  { status: 'concluida', accent: 'border-t-emerald-500' }
];

/** Quadro de andamento: cada cirurgia do dia na sua etapa, com avanço em um clique. */
export default function AndamentoPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [date, setDate] = useState(todayISO());
  const { data, loading, error } = useSurgeriesLive(date);
  const [room, setRoom] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [suspend, setSuspend] = useState<Surgery | null>(null);
  const [reason, setReason] = useState('');
  const [confirmFinish, setConfirmFinish] = useState<Surgery | null>(null);
  const canStatus = can('cirurgias.status');

  const day = useMemo(() => data.filter((s) => s.date === date && (!room || s.room === room))
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')), [data, date, room]);
  const side = day.filter((s) => s.status === 'suspensa' || s.status === 'cancelada');

  async function move(s: Surgery, to: SurgeryStatus, msg: string, extra?: Record<string, string>) {
    setBusy(s.id);
    try { await setSurgeryStatus(s.id, to, extra); toast.success(msg); } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(null); }
  }
  async function doSuspend() {
    if (!suspend) return;
    if (reason.trim().length < 3) { toast.error('Informe o motivo (mínimo 3 caracteres).'); return; }
    await move(suspend, 'suspensa', 'Cirurgia suspensa.', { suspendReason: reason.trim() });
    setSuspend(null); setReason('');
  }

  const Card = ({ s }: { s: Surgery }) => {
    const adv = ADVANCE[s.status];
    return (
      <li className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold">{s.patient}</span>
          <span className="shrink-0 text-xs font-bold tabular-nums text-slate-500">{s.time ?? '--:--'}</span>
        </div>
        <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{s.type}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">{s.room && <span>{s.room}</span>}{s.doctor && <span>{s.doctor}</span>}{s.prontuario && <span className="font-mono">Pront. {s.prontuario}</span>}</div>
        {canStatus && (
          <div className="mt-2 flex gap-1">
            {adv && <Button className="btn-primary btn-sm flex-1" loading={busy === s.id} onClick={() => s.status === 'recuperacao' ? setConfirmFinish(s) : void move(s, adv.to, `${adv.label}: ok`)}>{adv.label} <ChevronRight size={14} /></Button>}
            {BACK[s.status] && <button className="btn-secondary btn-sm" title="Voltar etapa" aria-label="Voltar etapa" disabled={busy === s.id} onClick={() => void move(s, BACK[s.status]!, 'Etapa anterior restaurada.')}><Undo2 size={14} /></button>}
            {['pendente', 'em_preparacao', 'em_andamento'].includes(s.status) && <button className="btn-secondary btn-sm" onClick={() => setSuspend(s)}>Suspender</button>}
          </div>
        )}
      </li>
    );
  };

  return (
    <div>
      <PageHeader title="Andamento das cirurgias" subtitle="Avance cada cirurgia de etapa com um clique" />
      <div className="card mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <Field label="Data"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value || todayISO())} /></Field>
        <Field label="Sala"><select className="input" value={room} onChange={(e) => setRoom(e.target.value)}><option value="">Todas</option>{SALAS.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {COLUMNS.map((c) => {
              const items = day.filter((s) => s.status === c.status);
              return (
                <section key={c.status} className={cn('rounded-xl border border-t-4 border-slate-200 bg-slate-50 p-3', c.accent)} aria-label={STATUS_LABELS[c.status]}>
                  <h2 className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700">{STATUS_LABELS[c.status]}<span className="rounded-full bg-slate-200 px-2 text-xs">{items.length}</span></h2>
                  <ul className="space-y-2">{items.length ? items.map((s) => <Card key={s.id} s={s} />) : <li className="py-4 text-center text-xs text-slate-400">Nenhuma</li>}</ul>
                </section>
              );
            })}
          </div>
          {side.length > 0 && (
            <section className="mt-4">
              <h2 className="mb-2 text-sm font-bold text-slate-700">Suspensas / canceladas</h2>
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{side.map((s) => <Card key={s.id} s={s} />)}</ul>
            </section>
          )}
        </>
      )}
      {suspend && (
        <Modal open title="Suspender cirurgia" onClose={() => { setSuspend(null); setReason(''); }}>
          <p className="mb-2 text-sm text-slate-600">Paciente: {suspend.patient}</p>
          <Field label="Motivo"><textarea className="input" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="mt-4 flex justify-end gap-2"><button className="btn-secondary" onClick={() => { setSuspend(null); setReason(''); }}>Voltar</button><Button className="btn-danger" onClick={() => void doSuspend()}>Confirmar</Button></div>
        </Modal>
      )}
      <ConfirmDialog open={!!confirmFinish} title="Finalizar cirurgia" message={confirmFinish ? `Finalizar a cirurgia de ${confirmFinish.patient}?` : ''} onConfirm={async () => { const s = confirmFinish!; setConfirmFinish(null); await move(s, 'concluida', 'Cirurgia finalizada.'); }} onClose={() => setConfirmFinish(null)} />
    </div>
  );
}
