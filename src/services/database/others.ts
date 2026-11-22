import { get, onValue, push, ref, remove, serverTimestamp, set } from 'firebase/database';
import { auth, db } from '../firebase/app';
import { clean, snapshotToList, stamp, subscribe } from './helpers';
import type { Absence, AuditLog, Doctor, PainelEsperaItem, PainelTVItem, PatientRecord } from '@/types';
import { safeFbKey } from '@/utils/format';
import { lerUmaVez, sharedLive } from './shared';

// ---------- Pacientes (prontuários) ----------
export type PatientWithKey = PatientRecord & { _key: string };

export function subscribePatients(cb: (l: PatientWithKey[]) => void, onError?: (e: Error) => void) {
  return sharedLive<PatientWithKey[]>('patients', (emit, fail) => subscribe(ref(db, 'patients'), (s) => snapshotToList<PatientWithKey>(s, '_key'), emit, fail), cb, onError);
}

/** Ficha de UM paciente (leitura única): evita baixar o cadastro inteiro só para abrir os detalhes de uma cirurgia. */
export async function getPatientRecord(key: string): Promise<PatientWithKey | null> {
  const s = await get(ref(db, `patients/${key}`));
  const v = s.val() as PatientRecord | null;
  return v && typeof v === 'object' ? { ...v, _key: key } : null;
}

export async function savePatient(key: string | null, data: PatientRecord): Promise<string> {
  const k = safeFbKey(key ?? `P_${data.prontuario}`);
  await set(ref(db, `patients/${k}`), clean({ ...data, atualizadoEm: new Date().toISOString(), ...stamp() }));
  return k;
}

/** Trilha de acesso a prontuário (LGPD — rastreabilidade de consulta a dados sensíveis). */
export async function logRecordAccess(entity: 'patients' | 'surgeries', entityId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await set(push(ref(db, 'access_logs')), { uid, entity, entityId: safeFbKey(entityId), ts: serverTimestamp() });
  } catch { /* o registro de acesso não deve impedir o uso */ }
}

// ---------- Faltas ----------
export function subscribeAbsences(cb: (l: Absence[]) => void, onError?: (e: Error) => void) {
  return sharedLive<Absence[]>('absences', (emit, fail) => subscribe(ref(db, 'absences'), (s) => snapshotToList<Absence>(s), emit, fail), cb, onError);
}

/** Leitura única (relatórios/indicadores), com cache curto. */
export function loadAbsences(): Promise<Absence[]> {
  return lerUmaVez('absences-once', async () => snapshotToList<Absence>(await get(ref(db, 'absences'))));
}
export function newAbsenceId(): string {
  const k = push(ref(db, 'absences')).key;
  if (!k) throw new Error('Falha ao gerar identificador');
  return k;
}
export async function saveAbsence(a: Absence): Promise<void> {
  await set(ref(db, `absences/${a.id}`), clean({ ...a, ...stamp() }));
}

// ---------- Médicos ----------
export type DoctorWithKey = Doctor & { _key: string };
export function subscribeDoctors(cb: (l: DoctorWithKey[]) => void, onError?: (e: Error) => void) {
  return subscribe(ref(db, 'settings/doctors'), (s) => snapshotToList<DoctorWithKey>(s, '_key'), cb, onError);
}
export async function saveDoctor(key: string | null, d: Doctor): Promise<void> {
  const r = key ? ref(db, `settings/doctors/${key}`) : push(ref(db, 'settings/doctors'));
  await set(r, { name: d.name.trim().toUpperCase(), crm: d.crm.trim().toUpperCase() });
}
export async function removeDoctor(key: string): Promise<void> {
  await remove(ref(db, `settings/doctors/${key}`));
}

// ---------- Configurações ----------
export interface Identity { systemName: string; hospitalName: string; logo?: string; govLogo?: string; salaEsperaAtiva: boolean }
export function subscribeIdentity(cb: (i: Identity) => void, onError?: (e: Error) => void) {
  // Lê cada configuração individualmente (as regras não permitem ler a raiz "settings").
  const cur: Identity = { systemName: 'ExaGestão', hospitalName: 'Hospital Regional de Palmeira dos Índios', salaEsperaAtiva: true };
  const watch = <K extends keyof Identity>(key: K, map: (v: unknown) => Identity[K]) =>
    onValue(ref(db, `settings/${key}`), (s) => { cur[key] = map(s.val()); cb({ ...cur }); }, (e) => onError?.(e));
  const offs = [
    watch('systemName', (v) => (typeof v === 'string' && v ? v : 'ExaGestão')),
    watch('hospitalName', (v) => (typeof v === 'string' && v ? v : 'Hospital Regional de Palmeira dos Índios')),
    watch('logo', (v) => (typeof v === 'string' ? v : undefined)),
    watch('govLogo', (v) => (typeof v === 'string' ? v : undefined)),
    watch('salaEsperaAtiva', (v) => v !== false)
  ];
  return () => offs.forEach((o) => o());
}
export async function saveSetting(key: 'systemName' | 'hospitalName' | 'logo' | 'govLogo' | 'salaEsperaAtiva', value: string | boolean): Promise<void> {
  await set(ref(db, `settings/${key}`), value);
}

// ---------- Auditoria (somente leitura no cliente; gravada pelo servidor) ----------
export function subscribeAudit(cb: (l: AuditLog[]) => void, onError?: (e: Error) => void) {
  return subscribe(ref(db, 'audit_logs'), (s) => snapshotToList<AuditLog>(s, 'id').sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)).slice(0, 200), cb, onError);
}

// ---------- Painéis (espelhos minimizados) ----------
export function subscribePainelTV(cb: (l: PainelTVItem[]) => void, onError?: (e: Error) => void) {
  return subscribe(ref(db, 'painel_tv'), (s) => snapshotToList<PainelTVItem>(s), cb, onError);
}
export function subscribePainelEspera(cb: (l: PainelEsperaItem[]) => void, onError?: (e: Error) => void) {
  return subscribe(ref(db, 'painel_espera'), (s) => snapshotToList<PainelEsperaItem>(s), cb, onError);
}
export function subscribeConnection(cb: (online: boolean) => void) {
  return onValue(ref(db, '.info/connected'), (s) => cb(s.val() === true));
}
export async function readOnce<T>(path: string): Promise<T | null> {
  const s = await get(ref(db, path));
  return (s.val() as T | null) ?? null;
}

// ---------- Configurações LGPD ----------
export interface LgpdSettings { retencaoAnos: number; tvNomeCompleto: boolean }
export function subscribeLgpdSettings(cb: (s: LgpdSettings) => void, onError?: (e: Error) => void) {
  return subscribe(ref(db, 'settings/lgpd'), (s) => {
    const v = (s.val() ?? {}) as Partial<LgpdSettings>;
    return { retencaoAnos: typeof v.retencaoAnos === 'number' ? v.retencaoAnos : 20, tvNomeCompleto: v.tvNomeCompleto === true };
  }, cb, onError);
}
export async function saveLgpdSetting(key: keyof LgpdSettings, value: number | boolean): Promise<void> {
  await set(ref(db, `settings/lgpd/${key}`), value);
}

