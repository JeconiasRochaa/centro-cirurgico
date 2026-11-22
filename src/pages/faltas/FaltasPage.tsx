import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Spinner } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSubscription } from '@/hooks/useSubscription';
import { newAbsenceId, saveAbsence, subscribeAbsences } from '@/services/database/others';
import { removeAbsence } from '@/services/database/absences';
import { absenceSchema, type AbsenceForm } from '@/schemas';
import { formatDate, todayISO } from '@/utils/format';
import { friendlyError } from '@/utils/errors';
import type { Absence } from '@/types';

export default function FaltasPage() {
  const { can } = useAuth();
  const toast = useToast();
  const { data, loading, error } = useSubscription<Absence[]>((cb, e) => subscribeAbsences(cb, e), []);
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState<Absence | null>(null);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AbsenceForm>({ resolver: zodResolver(absenceSchema), defaultValues: { date: todayISO() } });
  const list = useMemo(() => [...data].sort((a, b) => b.date.localeCompare(a.date)), [data]);

  const submit = handleSubmit(async (v) => {
    try { await saveAbsence({ id: newAbsenceId(), ...v, criadoEm: new Date().toISOString() } as Absence); toast.success('Falta registrada.'); reset({ date: todayISO() }); setAdding(false); }
    catch (e) { toast.error(friendlyError(e)); }
  });
  async function remove() {
    if (!del) return; setBusy(true);
    try { await removeAbsence(del.id); toast.success('Falta removida.'); setDel(null); } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <div>
      <PageHeader title="Faltas de pacientes" actions={can('faltas.editar') ? <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Registrar falta</button> : undefined} />
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : list.length === 0 ? <EmptyState /> : (
        <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Data</th><th className="p-3">Paciente</th><th className="p-3">Município</th><th className="p-3">Procedimento</th><th className="p-3">Motivo</th><th className="p-3" /></tr></thead>
          <tbody>{list.map((a) => (
            <tr key={a.id} className="border-t border-slate-100 align-top"><td className="p-3">{formatDate(a.date)}</td><td className="p-3 font-medium">{a.patient}</td><td className="p-3">{a.municipio ?? '-'}</td><td className="whitespace-pre-line p-3">{a.procedure ?? '-'}</td><td className="p-3">{a.reason ?? '-'}</td>
              <td className="p-3 text-right">{can('cirurgias.excluir') && <button className="btn-danger btn-sm" aria-label="Remover falta" onClick={() => setDel(a)}><Trash2 size={14} /></button>}</td></tr>))}</tbody>
        </table></div>
      )}
      <Modal open={adding} title="Registrar falta" onClose={() => setAdding(false)}>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <Field label="Paciente*" error={errors.patient?.message}><input className="input" {...register('patient')} /></Field>
          <Field label="Data*" error={errors.date?.message}><input type="date" className="input" {...register('date')} /></Field>
          <Field label="Município"><input className="input" {...register('municipio')} /></Field>
          <Field label="Procedimento"><input className="input" {...register('procedure')} /></Field>
          <Field label="Motivo"><textarea rows={2} className="input" {...register('reason')} /></Field>
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Cancelar</button><Button className="btn-primary" loading={isSubmitting}>Salvar</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} danger title="Remover falta" message={`Remover o registro de falta de ${del?.patient ?? ''}?`} loading={busy} onConfirm={remove} onClose={() => setDel(null)} />
    </div>
  );
}
