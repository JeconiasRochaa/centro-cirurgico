import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Pencil, Plus } from 'lucide-react';
import { Button, EmptyState, ErrorState, Field, Modal, PageHeader, Spinner } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSubscription } from '@/hooks/useSubscription';
import { logRecordAccess, savePatient, subscribePatients, type PatientWithKey } from '@/services/database/others';
import { patientSchema, type PatientForm } from '@/schemas';
import { calcAge, formatDate } from '@/utils/format';
import { friendlyError } from '@/utils/errors';

const maskCpf = (c?: string) => { const d = (c ?? '').replace(/\D/g, ''); return d.length === 11 ? `***.${d.slice(3, 6)}.***-**` : c ? '***' : '-'; };

function PatientFormModal({ patient, onClose }: { patient: PatientWithKey | 'new'; onClose: () => void }) {
  const toast = useToast();
  const isNew = patient === 'new';
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PatientForm>({
    resolver: zodResolver(patientSchema), defaultValues: isNew ? {} : { ...patient } as PatientForm
  });
  const submit = handleSubmit(async (v) => {
    try {
      const age = calcAge(v.dataNascimento || undefined);
      await savePatient(isNew ? null : patient._key, { ...v, idade: age === '' ? undefined : age } as never);
      toast.success('Ficha salva.'); onClose();
    } catch (e) { toast.error(friendlyError(e)); }
  });
  const f = (n: keyof PatientForm, label: string, props: Record<string, unknown> = {}, cls = '') => (
    <Field label={label} error={errors[n]?.message as string | undefined} className={cls}><input className="input" {...register(n)} {...props} /></Field>
  );
  return (
    <Modal open wide title={isNew ? 'Nova ficha' : 'Editar ficha'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
        {f('nome', 'Nome completo*', { autoComplete: 'off' }, 'sm:col-span-2')}
        {f('prontuario', 'Prontuário*', { readOnly: !isNew })}
        {f('dataNascimento', 'Nascimento', { type: 'date' })}
        {f('sexo', 'Sexo')}{f('cpf', 'CPF', { inputMode: 'numeric' })}
        {f('contato', 'Contato')}{f('tipoSanguineo', 'Tipo sanguíneo')}
        {f('endereco', 'Endereço', {}, 'sm:col-span-2')}
        {f('alergias', 'Alergias', {}, 'sm:col-span-2')}
        <Field label="Observações / comorbidades" error={errors.observacoes?.message} className="sm:col-span-2"><textarea rows={3} className="input" {...register('observacoes')} /></Field>
        {f('emergenciaNome', 'Contato de emergência')}{f('emergenciaTelefone', 'Telefone de emergência')}
        <p className="text-xs text-slate-500 sm:col-span-2">Colete apenas dados necessários ao atendimento (princípio da minimização — LGPD).</p>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><Button className="btn-primary" loading={isSubmitting}>Salvar</Button></div>
      </form>
    </Modal>
  );
}

export default function PacientesPage() {
  const { can } = useAuth();
  const { data, loading, error } = useSubscription<PatientWithKey[]>((cb, err) => subscribePatients(cb, err), []);
  const [q, setQ] = useState('');
  const [view, setView] = useState<PatientWithKey | null>(null);
  const [edit, setEdit] = useState<PatientWithKey | 'new' | null>(null);
  const canEdit = can('pacientes.editar');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data.filter((p) => !t || (p.nome ?? '').toLowerCase().includes(t) || (p.prontuario ?? '').includes(t)).sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''));
  }, [data, q]);
  const open = (p: PatientWithKey) => { setView(p); void logRecordAccess('patients', p._key); };

  return (
    <div>
      <PageHeader title="Prontuários" subtitle="Fichas de pacientes — acesso registrado para fins de auditoria (LGPD)"
        actions={canEdit ? <button className="btn-primary" onClick={() => setEdit('new')}><Plus size={16} /> Nova ficha</button> : undefined} />
      <div className="card mb-4"><Field label="Buscar"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou prontuário" /></Field></div>
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : list.length === 0 ? <EmptyState /> : (
        <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Nome</th><th className="p-3">Prontuário</th><th className="p-3">Nascimento</th><th className="p-3">CPF</th><th className="p-3 text-right">Ações</th></tr></thead>
          <tbody>{list.map((p) => (
            <tr key={p._key} className="border-t border-slate-100"><td className="p-3 font-medium">{p.nome}</td><td className="p-3">{p.prontuario}</td><td className="p-3">{formatDate(p.dataNascimento)}</td><td className="p-3">{maskCpf(p.cpf)}</td>
              <td className="p-3"><div className="flex justify-end gap-1"><button className="btn-secondary btn-sm" aria-label="Ver ficha" onClick={() => open(p)}><Eye size={14} /></button>{canEdit && <button className="btn-secondary btn-sm" aria-label="Editar ficha" onClick={() => setEdit(p)}><Pencil size={14} /></button>}</div></td></tr>))}</tbody>
        </table></div>
      )}
      {view && (
        <Modal open title={view.nome} onClose={() => setView(null)}>
          <dl className="space-y-1 text-sm">
            {([['Prontuário', view.prontuario], ['Nascimento', formatDate(view.dataNascimento)], ['Sexo', view.sexo], ['CPF', view.cpf], ['Contato', view.contato], ['Endereço', view.endereco], ['Tipo sanguíneo', view.tipoSanguineo], ['Alergias', view.alergias], ['Observações', view.observacoes], ['Emergência', [view.emergenciaNome, view.emergenciaTelefone].filter(Boolean).join(' — ')]] as const)
              .filter(([, v]) => v && v !== '-').map(([k, v]) => <div key={k}><dt className="inline font-semibold">{k}: </dt><dd className="inline whitespace-pre-line">{v}</dd></div>)}
          </dl>
          <div className="mt-4 flex justify-end"><button className="btn-secondary" onClick={() => setView(null)}>Fechar</button></div>
        </Modal>
      )}
      {edit && <PatientFormModal patient={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
