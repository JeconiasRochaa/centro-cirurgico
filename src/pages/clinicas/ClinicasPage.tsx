import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Field, Modal, PageHeader, Spinner } from '@/components/common';
import { SurgeryForm, type SurgeryFormInput, type SurgeryFormValues } from '@/components/forms/SurgeryForm';
import { SurgeryDetailsModal } from '@/components/modals/SurgeryDetailsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSubscription } from '@/hooks/useSubscription';
import { newSurgeryId, saveSurgery, subscribeClinicSurgeries, subscribeSurgeries } from '@/services/database/surgeries';
import { CLINICAS, STATUS_LABELS, clinicaNome } from '@/utils/constants';
import { formatDate, todayISO } from '@/utils/format';
import { friendlyError } from '@/utils/errors';
import type { Surgery } from '@/types';

/**
 * Solicitações das clínicas. A clínica só enxerga (e a regra do banco só entrega) as próprias solicitações:
 * a consulta é sempre filtrada por clinicaId. Equipe interna (admin/diretor) vê todas.
 */
export default function ClinicasPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const isClinic = profile?.role === 'clinica';
  const ownId = profile?.clinicaId;
  const [staffClinic, setStaffClinic] = useState<string>(CLINICAS[0].id);
  const { data, loading, error } = useSubscription<Surgery[]>(
    (cb, err) => (isClinic && ownId ? subscribeClinicSurgeries(ownId, cb, err) : isClinic ? (cb([]), () => undefined) : subscribeSurgeries(cb, err)),
    [], [isClinic, ownId]
  );
  const [editing, setEditing] = useState<Surgery | 'new' | null>(null);
  const [details, setDetails] = useState<Surgery | null>(null);

  const list = useMemo(() => data.filter((s) => !!s.clinicaId).sort((a, b) => (b.dataSolicitacao ?? '').localeCompare(a.dataSolicitacao ?? '')), [data]);
  const targetClinic = isClinic ? ownId : staffClinic;

  async function submit(v: SurgeryFormValues) {
    if (!targetClinic) { toast.error('Seu usuário não está vinculado a uma clínica. Contate o administrador.'); return; }
    try {
      const isNew = editing === 'new';
      const base: Surgery = isNew
        ? { id: newSurgeryId(), status: 'pendente', patient: v.patient, type: v.type, date: v.date, clinicaId: targetClinic, clinicaOrigem: clinicaNome(targetClinic), dataSolicitacao: todayISO() }
        : (editing as Surgery);
      // Clínicas não definem sala/equipe nem código: isso é feito pelo centro cirúrgico.
      const { room: _r, doctor: _d, instrumentador: _i, anesthetist: _a, ...rest } = v;
      void _r; void _d; void _i; void _a;
      await saveSurgery({ ...base, ...rest, age: v.age === '' ? undefined : v.age, id: base.id, status: base.status, clinicaId: base.clinicaId }, isNew);
      toast.success(isNew ? 'Solicitação enviada.' : 'Solicitação atualizada.');
      setEditing(null);
    } catch (e) { toast.error(friendlyError(e)); }
  }

  const defaults: Partial<SurgeryFormInput> | undefined = editing && editing !== 'new'
    ? ({ ...editing, age: editing.age === undefined ? '' : String(editing.age) } as Partial<SurgeryFormInput>) : { date: todayISO() };

  return (
    <div>
      <PageHeader title="Solicitações da clínica" subtitle={isClinic ? clinicaNome(ownId) || 'Clínica não vinculada' : 'Todas as clínicas'}
        actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Nova solicitação</button>} />
      {isClinic && !ownId && <ErrorState message="Seu usuário ainda não está vinculado a uma clínica. Solicite ao administrador." />}
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : list.length === 0 ? <EmptyState>Nenhuma solicitação.</EmptyState> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Solicitada em</th>{!isClinic && <th className="p-3">Clínica</th>}<th className="p-3">Paciente</th><th className="p-3">Procedimento</th><th className="p-3">Data</th><th className="p-3">Status</th><th className="p-3 text-right">Ações</th></tr></thead>
            <tbody>{list.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 align-top">
                <td className="p-3">{formatDate(s.dataSolicitacao)}</td>
                {!isClinic && <td className="p-3">{clinicaNome(s.clinicaId) || s.clinicaOrigem}</td>}
                <td className="p-3 font-medium">{s.patient}</td>
                <td className="max-w-xs whitespace-pre-line p-3 text-slate-600">{s.type}</td>
                <td className="p-3">{formatDate(s.date)}</td>
                <td className="p-3"><Badge tone={s.status}>{STATUS_LABELS[s.status] ?? s.status}</Badge></td>
                <td className="p-3"><div className="flex justify-end gap-1">
                  <button className="btn-secondary btn-sm" aria-label="Detalhes" onClick={() => setDetails(s)}><Eye size={14} /></button>
                  {s.status === 'pendente' && <button className="btn-secondary btn-sm" aria-label="Editar" onClick={() => setEditing(s)}><Pencil size={14} /></button>}
                </div></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      <Modal open={!!editing} wide title={editing === 'new' ? 'Nova solicitação' : 'Editar solicitação'} onClose={() => setEditing(null)}>
        {!isClinic && editing === 'new' && (
          <Field label="Clínica solicitante" className="mb-3"><select className="input" value={staffClinic} onChange={(e) => setStaffClinic(e.target.value)}>{CLINICAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
        )}
        <SurgeryForm mode="clinica" defaultValues={defaults} submitLabel="Enviar" onSubmit={submit} onCancel={() => setEditing(null)} />
      </Modal>
      <SurgeryDetailsModal surgery={details} onClose={() => setDetails(null)} showPatientRecord={false} />
    </div>
  );
}
