import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Surgery, YesNoMaybe } from '@/types';
import { Badge, Modal } from '@/components/common';
import { getPatientRecord, logRecordAccess, type PatientWithKey } from '@/services/database/others';
import { STATUS_LABELS } from '@/utils/constants';
import { doctorTitle, formatDate, patientKey, safeFbKey } from '@/utils/format';

export interface SurgeryDetailsModalProps {
  surgery: Surgery | null;
  onClose: () => void;
  /** Mostra a ficha do paciente (alergias etc.). false para perfis sem acesso a prontuário (ex.: faturamento). */
  showPatientRecord?: boolean;
}

const ynm = (v?: YesNoMaybe) => (v === 'sim' ? 'Sim' : v === 'talvez' ? 'Possivelmente' : 'Não');

function Row({ label, children, alert }: { label: string; children?: ReactNode; alert?: boolean }) {
  if (children === undefined || children === null || children === '' || children === false) return null;
  return (
    <div className={alert ? 'flex gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800' : 'flex gap-2 text-sm'}>
      {alert && <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />}
      <div><span className="font-semibold">{label}: </span><span className="whitespace-pre-line">{children}</span></div>
    </div>
  );
}

function PatientRecordSection({ surgery }: { surgery: Surgery }) {
  const key = safeFbKey(patientKey(surgery));
  // Lê só a ficha deste paciente (e não o cadastro inteiro).
  const [{ ficha, loading }, setFicha] = useState<{ ficha: PatientWithKey | null; loading: boolean }>({ ficha: null, loading: true });
  useEffect(() => {
    let vivo = true;
    setFicha({ ficha: null, loading: true });
    getPatientRecord(key).then((f) => vivo && setFicha({ ficha: f, loading: false })).catch(() => vivo && setFicha({ ficha: null, loading: false }));
    return () => { vivo = false; };
  }, [key]);
  const logged = useRef<string | null>(null);

  // Trilha LGPD: registra UMA vez por abertura, somente quando a ficha é efetivamente exibida.
  useEffect(() => {
    if (ficha && logged.current !== key) { logged.current = key; void logRecordAccess('patients', key); }
  }, [ficha, key]);

  if (loading) return <p className="text-sm text-slate-500">Carregando ficha do paciente...</p>;
  if (!ficha) return <p className="text-sm text-slate-500">Este paciente ainda não possui ficha (prontuário) cadastrada com alergias/comorbidades.</p>;
  const alergias = (ficha.alergias ?? '').trim();
  return (
    <div className="space-y-2">
      <Row label="Tipo sanguíneo">{ficha.tipoSanguineo}</Row>
      {alergias
        ? <Row label="Alergias" alert>{alergias}</Row>
        : <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={16} aria-hidden /> Nenhuma alergia registrada na ficha</div>}
      <Row label="Comorbidades/Observações do paciente">{ficha.observacoes}</Row>
      <Row label="Contato de emergência">{ficha.emergenciaNome ? `${ficha.emergenciaNome}${ficha.emergenciaTelefone ? ` — ${ficha.emergenciaTelefone}` : ''}` : ''}</Row>
    </div>
  );
}

export function SurgeryDetailsModal({ surgery, onClose, showPatientRecord = false }: SurgeryDetailsModalProps) {
  if (!surgery) return null;
  const s = surgery;
  const origem = s.origem === 'Mutirão' && s.mutiraoNome ? `Mutirão — ${s.mutiraoNome}` : s.origem;
  return (
    <Modal open title={s.patient || 'Cirurgia'} onClose={onClose} wide>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2"><Badge tone={s.status}>{STATUS_LABELS[s.status] ?? s.status}</Badge>{s.code && <span className="text-xs font-semibold text-slate-500">{s.code}</span>}</div>
        <Row label="Prontuário">{s.prontuario}</Row>
        <Row label="Idade">{s.age !== undefined && s.age !== '' ? `${s.age} anos` : ''}</Row>
        <Row label="Procedimento(s)">{s.type || '-'}</Row>
        <Row label="Data">{formatDate(s.date)}</Row>
        <Row label="Horário">{s.time}</Row>
        <Row label="Sala">{s.room}</Row>
        <Row label="Especialidade">{s.specialty}</Row>
        <Row label="Médico">{s.doctor ? `${doctorTitle(s.doctor)} ${s.doctor}` : ''}</Row>
        <Row label="Instrumentador(a)">{s.instrumentador}</Row>
        <Row label="Anestesista">{s.anesthetist ? `${doctorTitle(s.anesthetist)} ${s.anesthetist}` : ''}</Row>
        <Row label="Reserva de sangue">{ynm(s.necessitaSangue)}</Row>
        <Row label="Necessidade de UTI">{ynm(s.necessitaUTI)}</Row>
        <Row label="Materiais especiais">{s.materiaisEspeciais}</Row>
        <Row label="Origem">{origem}</Row>
        <Row label="Clínica solicitante">{s.clinicaOrigem}</Row>
        <Row label="Observações da cirurgia">{s.observacoes}</Row>
        {s.status === 'cancelada' && <Row label="Motivo do cancelamento" alert>{s.cancelReason}</Row>}
        {s.status === 'suspensa' && <Row label="Motivo da suspensão" alert>{s.suspendReason}</Row>}
      </div>
      {showPatientRecord && (
        <>
          <hr className="my-3 border-slate-200" />
          <h3 className="mb-2 text-sm font-bold text-brand">Ficha do paciente</h3>
          <PatientRecordSection surgery={s} />
        </>
      )}
      <div className="mt-4 flex justify-end"><button className="btn-secondary" onClick={onClose}>Fechar</button></div>
    </Modal>
  );
}
