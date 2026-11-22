import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Eye, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Spinner } from '@/components/common';
import { SurgeryDetailsModal } from '@/components/modals/SurgeryDetailsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSurgeriesLive } from '@/hooks/useSurgeries';
import { setSurgeryStatus, softDeleteSurgery } from '@/services/database/surgeries';
import { newAbsenceId, saveAbsence } from '@/services/database/others';
import { SALAS, STATUS_LABELS } from '@/utils/constants';
import { formatDate, todayISO } from '@/utils/format';
import { ADVANCE, BACK } from './fluxo';
import { friendlyError } from '@/utils/errors';
import { SURGERY_STATUSES, type Surgery, type SurgeryStatus } from '@/types';

type Pending =
  | { kind: 'status'; surgery: Surgery; status: SurgeryStatus }
  | { kind: 'falta'; surgery: Surgery }
  | { kind: 'delete'; surgery: Surgery };

export default function CirurgiasPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [room, setRoom] = useState('');
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState('');
  // Tempo real só da janela necessária: de "De" em diante (vazio = todas, a pedido da pessoa)
  const { data, loading, error } = useSurgeriesLive(from === '' ? null : from);
  const [details, setDetails] = useState<Surgery | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [quickBusy, setQuickBusy] = useState<string | null>(null);

  const canStatus = can('cirurgias.status');
  const canEdit = can('cirurgias.registrar');
  const canDelete = can('cirurgias.excluir');

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data
      .filter((s) => (!from || s.date >= from) && (!to || s.date <= to) && (!status || s.status === status) && (!room || s.room === room)
        && (!t || [s.patient, s.prontuario, s.type, s.doctor, s.code].some((v) => (v ?? '').toLowerCase().includes(t))))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  }, [data, q, status, room, from, to]);

  async function quickStatus(s: Surgery, to: SurgeryStatus, okMsg: string) {
    setQuickBusy(s.id);
    try { await setSurgeryStatus(s.id, to); toast.success(okMsg); } catch (e) { toast.error(friendlyError(e)); } finally { setQuickBusy(null); }
  }
  const close = () => { setPending(null); setReason(''); };
  const needsReason = pending && (pending.kind === 'delete' || pending.kind === 'falta' || (pending.kind === 'status' && (pending.status === 'cancelada' || pending.status === 'suspensa')));

  async function confirm() {
    if (!pending) return;
    if (needsReason && reason.trim().length < 3) { toast.error('Informe o motivo (mínimo 3 caracteres).'); return; }
    setBusy(true);
    try {
      const s = pending.surgery;
      if (pending.kind === 'delete') {
        await softDeleteSurgery(s.id, reason);
        toast.success('Registro excluído logicamente (mantido para fins legais).');
      } else if (pending.kind === 'falta') {
        await saveAbsence({ id: newAbsenceId(), patient: s.patient, date: s.date, procedure: s.type, reason: reason.trim(), criadoEm: new Date().toISOString() });
        await setSurgeryStatus(s.id, 'cancelada', { cancelReason: `Paciente faltou: ${reason.trim()}` });
        toast.success('Falta registrada e cirurgia cancelada.');
      } else {
        const extra = pending.status === 'cancelada' ? { cancelReason: reason.trim() } : pending.status === 'suspensa' ? { suspendReason: reason.trim() } : {};
        await setSurgeryStatus(s.id, pending.status, extra);
        toast.success('Status atualizado.');
      }
      close();
    } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Cirurgias" subtitle="Agenda do centro cirúrgico"
        actions={canEdit ? <Link to="/cirurgias/nova" className="btn-primary"><Plus size={16} /> Nova cirurgia</Link> : undefined} />
      <div className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Busca"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Paciente, nº do prontuário, médico..." /></Field>
        <Field label="De"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Até"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Status"><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option>{SURGERY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></Field>
        <Field label="Sala"><select className="input" value={room} onChange={(e) => setRoom(e.target.value)}><option value="">Todas</option>{SALAS.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : list.length === 0 ? <EmptyState /> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
              <th className="p-3">Data</th><th className="p-3">Hora</th><th className="p-3">Prontuário</th><th className="p-3">Paciente</th><th className="p-3">Procedimento</th><th className="p-3">Sala</th><th className="p-3">Status</th><th className="p-3 text-right">Ações</th>
            </tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 align-top">
                  <td className="p-3 whitespace-nowrap">{formatDate(s.date)}</td>
                  <td className="p-3">{s.time ?? '-'}</td>
                  <td className="p-3 font-mono text-xs">{s.prontuario || '-'}</td><td className="p-3 font-medium">{s.patient}</td>
                  <td className="max-w-xs p-3 whitespace-pre-line text-slate-600">{s.type}</td>
                  <td className="p-3">{s.room ?? '-'}</td>
                  <td className="p-3"><Badge tone={s.status}>{STATUS_LABELS[s.status] ?? s.status}</Badge></td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button className="btn-secondary btn-sm" aria-label={`Detalhes de ${s.patient}`} onClick={() => setDetails(s)}><Eye size={14} /></button>
                      {canEdit && <Link className="btn-secondary btn-sm" aria-label={`Editar ${s.patient}`} to={`/cirurgias/${s.id}/editar`}><Pencil size={14} /></Link>}
                      {canStatus && ADVANCE[s.status] && (
                        <Button className="btn-primary btn-sm" loading={quickBusy === s.id} onClick={() => void quickStatus(s, ADVANCE[s.status]!.to, `${ADVANCE[s.status]!.label}: ok`)}>{ADVANCE[s.status]!.label} <ChevronRight size={14} /></Button>
                      )}
                      {canStatus && BACK[s.status] && <button className="btn-secondary btn-sm" aria-label="Voltar etapa" title="Voltar etapa" disabled={quickBusy === s.id} onClick={() => void quickStatus(s, BACK[s.status]!, 'Etapa anterior restaurada.')}><Undo2 size={14} /></button>}
                      {canStatus && ['pendente', 'em_preparacao', 'em_andamento'].includes(s.status) && <button className="btn-secondary btn-sm" onClick={() => setPending({ kind: 'status', surgery: s, status: 'suspensa' })}>Suspender</button>}
                      {canStatus && ['pendente', 'em_preparacao', 'suspensa'].includes(s.status) && <button className="btn-secondary btn-sm" onClick={() => setPending({ kind: 'status', surgery: s, status: 'cancelada' })}>Cancelar</button>}
                      {canStatus && (s.status === 'pendente' || s.status === 'em_preparacao') && <button className="btn-secondary btn-sm" onClick={() => setPending({ kind: 'falta', surgery: s })}>Faltou</button>}
                      {canDelete && <button className="btn-danger btn-sm" aria-label={`Excluir ${s.patient}`} onClick={() => setPending({ kind: 'delete', surgery: s })}><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SurgeryDetailsModal surgery={details} onClose={() => setDetails(null)} showPatientRecord={can('pacientes.ver')} />
      {pending && needsReason ? (
        <Modal open title={pending.kind === 'delete' ? 'Excluir registro' : pending.kind === 'falta' ? 'Registrar falta' : `Alterar para "${STATUS_LABELS[pending.status]}"`} onClose={close}>
          <p className="mb-2 text-sm text-slate-600">{pending.kind === 'delete' ? 'O registro não será apagado: ficará oculto e preservado conforme a política de retenção.' : `Paciente: ${pending.surgery.patient}`}</p>
          <Field label="Motivo"><textarea className="input" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="mt-4 flex justify-end gap-2"><button className="btn-secondary" onClick={close}>Voltar</button><Button className="btn-danger" loading={busy} onClick={confirm}>Confirmar</Button></div>
        </Modal>
      ) : (
        <ConfirmDialog open={!!pending} title="Alterar status" message={pending && pending.kind === 'status' ? `Marcar como "${STATUS_LABELS[pending.status]}"?` : ''} loading={busy} onConfirm={confirm} onClose={close} />
      )}
    </div>
  );
}
