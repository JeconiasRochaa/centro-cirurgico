import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState, PageHeader, Spinner } from '@/components/common';
import { SurgeryForm, type SurgeryFormInput, type SurgeryFormValues } from '@/components/forms/SurgeryForm';
import { useToast } from '@/contexts/ToastContext';
import { useSubscription } from '@/hooks/useSubscription';
import { getSurgery, newSurgeryId, nextSurgeryCode, saveSurgery, getSurgeriesOfDay } from '@/services/database/surgeries';
import { subscribePatients, type PatientWithKey } from '@/services/database/others';
import { friendlyError } from '@/utils/errors';
import { todayISO } from '@/utils/format';
import type { Surgery } from '@/types';

export default function CirurgiaFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [existing, setExisting] = useState<Surgery | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const { data: patients } = useSubscription<PatientWithKey[]>((cb, e) => subscribePatients(cb, e), []);

  useEffect(() => {
    if (!id) return;
    getSurgery(id).then((s) => { if (!s) setError('Cirurgia não encontrada.'); setExisting(s); }).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false));
  }, [id]);

  async function submit(v: SurgeryFormValues) {
    try {
      const all = await getSurgeriesOfDay(v.date);
      const dup = all.find((s) => s.id !== id && s.date === v.date && s.time && s.time === v.time && s.room && s.room === v.room && !['cancelada', 'concluida'].includes(s.status));
      if (dup && !window.confirm(`Já existe cirurgia na ${v.room} em ${v.date} às ${v.time}. Salvar mesmo assim?`)) return;
      const isNew = !existing;
      const base: Surgery = existing ?? { id: newSurgeryId(), status: 'pendente', patient: v.patient, type: v.type, date: v.date };
      const code = base.code ?? await nextSurgeryCode();
      const payload: Surgery = { ...base, ...v, age: v.age === '' ? undefined : v.age, code, id: base.id, status: base.status };
      await saveSurgery(payload, isNew);
      toast.success(isNew ? 'Cirurgia registrada.' : 'Cirurgia atualizada.');
      nav('/cirurgias');
    } catch (e) { toast.error(friendlyError(e)); }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  const defaults: Partial<SurgeryFormInput> = existing
    ? { ...existing, age: existing.age === undefined ? '' : String(existing.age) } as Partial<SurgeryFormInput>
    : { date: todayISO() };
  return (
    <div>
      <PageHeader title={existing ? 'Editar cirurgia' : 'Registrar cirurgia'} />
      <div className="card"><SurgeryForm mode="interno" defaultValues={defaults} patients={patients} submitLabel={existing ? 'Salvar alterações' : 'Registrar'} onSubmit={submit} onCancel={() => nav('/cirurgias')} /></div>
    </div>
  );
}
