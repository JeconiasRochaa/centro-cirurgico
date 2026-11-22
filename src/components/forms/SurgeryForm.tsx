import { useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { surgerySchema } from '@/schemas';
import { Button, Field } from '@/components/common';
import { ESPECIALIDADES, ORIGENS, SALAS } from '@/utils/constants';
import { calcAge } from '@/utils/format';
import { subscribeDoctors, type DoctorWithKey, type PatientWithKey } from '@/services/database/others';
import { ProcedurePicker, parseProcedures, serializeProcedures } from './ProcedurePicker';
import type { Procedure } from '@/utils/procedures';

export type SurgeryFormInput = z.input<typeof surgerySchema>;
export type SurgeryFormValues = z.output<typeof surgerySchema>;

interface Props {
  defaultValues?: Partial<SurgeryFormInput>;
  /** 'clinica' oculta sala/equipe (definidas pelo centro cirúrgico) e não usa fichas de pacientes. */
  mode: 'interno' | 'clinica';
  onSubmit: (v: SurgeryFormValues) => Promise<void> | void;
  submitLabel: string;
  onCancel?: () => void;
  patients?: PatientWithKey[];
}

const EMPTY: SurgeryFormInput = {
  origem: '', mutiraoNome: '', patient: '', prontuario: '', birthDate: '', age: '', type: '', date: '', time: '', specialty: '',
  doctor: '', instrumentador: '', anesthetist: '', room: '', necessitaSangue: 'nao', necessitaUTI: 'nao', materiaisEspeciais: '', observacoes: ''
};

export function SurgeryForm({ defaultValues, mode, onSubmit, submitLabel, onCancel, patients = [] }: Props) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<SurgeryFormInput, unknown, SurgeryFormValues>({
    resolver: zodResolver(surgerySchema), defaultValues: { ...EMPTY, ...defaultValues }
  });
  const [procs, setProcs] = useState<Procedure[]>(() => parseProcedures(defaultValues?.type));
  const [doctors, setDoctors] = useState<DoctorWithKey[]>([]);

  useEffect(() => { reset({ ...EMPTY, ...defaultValues }); setProcs(parseProcedures(defaultValues?.type)); }, [defaultValues, reset]);
  useEffect(() => subscribeDoctors(setDoctors, () => undefined), []);

  const origem = watch('origem');
  const birth = watch('birthDate');
  const age = useMemo(() => calcAge(birth || undefined), [birth]);
  useEffect(() => { setValue('age', age === '' ? '' : String(age)); }, [age, setValue]);

  const setProcedures = (list: Procedure[]) => { setProcs(list); setValue('type', serializeProcedures(list), { shouldValidate: true }); };
  const specFromProc = procs.length === 1 && procs[0].especialidade ? procs[0].especialidade : '';
  useEffect(() => { if (specFromProc) setValue('specialty', specFromProc); }, [specFromProc, setValue]);

  const upper = (name: 'patient' | 'doctor' | 'instrumentador' | 'anesthetist') => ({
    ...register(name), onChange: (e: React.ChangeEvent<HTMLInputElement>) => { e.target.value = e.target.value.toUpperCase(); void register(name).onChange(e); }
  });

  const onPickPatient = (name: string) => {
    const f = patients.find((p) => p.nome === name.toUpperCase());
    if (f) { setValue('prontuario', f.prontuario); if (f.dataNascimento) setValue('birthDate', f.dataNascimento); }
  };

  const submit: SubmitHandler<SurgeryFormValues> = (v) => onSubmit(v);

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Origem *" error={errors.origem?.message}>
          <select className="input" {...register('origem')}><option value="">Selecione</option>{ORIGENS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </Field>
        {origem === 'Mutirão' && <Field label="Nome do mutirão *" error={errors.mutiraoNome?.message}><input className="input" {...register('mutiraoNome')} /></Field>}
        <Field label="Paciente *" error={errors.patient?.message} className="md:col-span-2">
          <input className="input" list="pacientes-dl" autoComplete="off" {...upper('patient')} onBlur={(e) => onPickPatient(e.target.value)} />
          {mode === 'interno' && <datalist id="pacientes-dl">{patients.slice(0, 500).map((p) => <option key={p._key} value={p.nome} />)}</datalist>}
        </Field>
        <Field label="Prontuário" error={errors.prontuario?.message}><input className="input" {...register('prontuario')} /></Field>
        <Field label="Data de nascimento" error={errors.birthDate?.message}><input className="input" type="date" {...register('birthDate')} /></Field>
        <Field label="Idade"><input className="input" readOnly value={age === '' ? '' : `${age} anos`} aria-readonly="true" /></Field>
      </div>

      <ProcedurePicker value={procs} onChange={setProcedures} error={errors.type?.message} />
      <input type="hidden" {...register('type')} />

      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Data *" error={errors.date?.message}><input className="input" type="date" {...register('date')} /></Field>
        <Field label="Horário" error={errors.time?.message}><input className="input" type="time" {...register('time')} /></Field>
        <Field label="Especialidade"><select className="input" {...register('specialty')}><option value="">Selecione</option>{ESPECIALIDADES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        {mode === 'interno' && <Field label="Sala"><select className="input" {...register('room')}><option value="">Selecione</option>{SALAS.map((s) => <option key={s}>{s}</option>)}</select></Field>}
        <Field label="Médico (cirurgião)" className={mode === 'interno' ? 'md:col-span-2' : 'md:col-span-2'}>
          <input className="input" list="medicos-dl" autoComplete="off" {...upper('doctor')} />
          <datalist id="medicos-dl">{doctors.map((d) => <option key={d._key} value={d.name}>{d.crm}</option>)}</datalist>
        </Field>
        {mode === 'interno' && <>
          <Field label="Instrumentador(a)"><input className="input" {...upper('instrumentador')} /></Field>
          <Field label="Anestesista"><input className="input" {...upper('anesthetist')} /></Field>
        </>}
        <Field label="Reserva de sangue"><select className="input" {...register('necessitaSangue')}><option value="nao">Não</option><option value="sim">Sim</option><option value="talvez">Possivelmente</option></select></Field>
        <Field label="Necessidade de UTI"><select className="input" {...register('necessitaUTI')}><option value="nao">Não</option><option value="sim">Sim</option><option value="talvez">Possivelmente</option></select></Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Materiais especiais" error={errors.materiaisEspeciais?.message}><textarea className="input" rows={2} {...register('materiaisEspeciais')} /></Field>
        <Field label="Observações" error={errors.observacoes?.message}><textarea className="input" rows={2} {...register('observacoes')} /></Field>
      </div>
      <p className="text-xs text-slate-500">Registre apenas as informações necessárias para a finalidade assistencial (minimização de dados – LGPD).</p>

      <div className="flex gap-2">
        <Button type="submit" className="btn-primary" loading={isSubmitting}>{submitLabel}</Button>
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}
