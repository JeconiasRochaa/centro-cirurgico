import { endAt, get, orderByChild, equalTo, query, ref as dbRef, startAt, runTransaction, set, push, update } from 'firebase/database';
import { db, auth } from '../firebase/app';
import { clean, snapshotToList, stamp, subscribe } from './helpers';
import type { Surgery, SurgeryStatus } from '@/types';
import { serverTimestamp } from 'firebase/database';
import { todayISO } from '@/utils/format';
import { lerUmaVez, sharedLive } from './shared';

const PATH = 'surgeries';

/** Janela "recente" das telas operacionais: últimos N dias + todas as cirurgias futuras. */
export const RECENT_DAYS = 30;
export function recentFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - RECENT_DAYS);
  return todayISO(d);
}

function rangeQuery(from: string | null, to: string | null = null) {
  if (!from && !to) return dbRef(db, PATH);
  return query(dbRef(db, PATH), orderByChild('date'), ...(from ? [startAt(from)] : []), ...(to ? [endAt(to)] : []));
}

/**
 * Tempo real das cirurgias a partir de uma data (null = todas). Só baixa a janela pedida — as mudanças continuam
 * chegando na hora — e a conexão é compartilhada entre as telas (ver shared.ts).
 */
export function subscribeSurgeriesFrom(from: string | null, cb: (list: Surgery[]) => void, onError?: (e: Error) => void, includeDeleted = false) {
  return sharedLive<Surgery[]>(
    `surgeries|${from ?? '*'}`,
    (emit, fail) => subscribe(rangeQuery(from), (s) => snapshotToList<Surgery>(s), emit, fail),
    (l) => cb(includeDeleted ? l : l.filter((x) => !x.deletedAt)),
    onError,
  );
}

/** Equipe interna (telas operacionais e painéis): cirurgias recentes e futuras, em tempo real. */
export function subscribeSurgeries(cb: (list: Surgery[]) => void, onError?: (e: Error) => void, includeDeleted = false) {
  return subscribeSurgeriesFrom(recentFrom(), cb, onError, includeDeleted);
}

/** Leitura única por período (relatórios, indicadores, faturamento), com cache curto. */
export function loadSurgeriesRange(from: string | null, to: string | null): Promise<Surgery[]> {
  return lerUmaVez(`surgeries-once|${from ?? '*'}|${to ?? '*'}`, async () => snapshotToList<Surgery>(await get(rangeQuery(from, to))).filter((x) => !x.deletedAt));
}

/** Cirurgias de um dia (checagem de conflito de sala/horário ao salvar). */
export async function getSurgeriesOfDay(date: string): Promise<Surgery[]> {
  const s = await get(query(dbRef(db, PATH), orderByChild('date'), equalTo(date)));
  return snapshotToList<Surgery>(s).filter((x) => !x.deletedAt);
}

/** Clínica: só lê as próprias solicitações (consulta obrigatória por clinicaId, exigida pelas regras). */
export function subscribeClinicSurgeries(clinicaId: string, cb: (list: Surgery[]) => void, onError?: (e: Error) => void) {
  const q = query(dbRef(db, PATH), orderByChild('clinicaId'), equalTo(clinicaId));
  return subscribe(q, (s) => snapshotToList<Surgery>(s).filter((x) => !x.deletedAt), cb, onError);
}

export function newSurgeryId(): string {
  const k = push(dbRef(db, PATH)).key;
  if (!k) throw new Error('Falha ao gerar identificador');
  return k;
}

/** Código sequencial por ano (CC-2026-0001) via transação. */
export async function nextSurgeryCode(): Promise<string> {
  const year = new Date().getFullYear();
  try {
    const res = await runTransaction(dbRef(db, `counters/surgeryCode/${year}`), (cur: number | null) => (cur || 0) + 1);
    return `CC-${year}-${String(res.snapshot.val()).padStart(4, '0')}`;
  } catch {
    return `CC-${year}-${Date.now().toString(36).toUpperCase()}`;
  }
}

export async function saveSurgery(surgery: Surgery, isNew: boolean): Promise<void> {
  const uid = auth.currentUser?.uid;
  const payload = clean({ ...surgery, ...stamp(), ...(isNew ? { createdBy: uid } : {}) });
  await set(dbRef(db, `${PATH}/${surgery.id}`), payload);
}

export async function setSurgeryStatus(id: string, status: SurgeryStatus, extra: { cancelReason?: string; suspendReason?: string } = {}): Promise<void> {
  await update(dbRef(db, `${PATH}/${id}`), clean({ status, ...extra, ...stamp() }));
}

/** Exclusão LÓGICA com motivo (LGPD/retenção): o registro permanece, sai das listagens e dos painéis. */
export async function softDeleteSurgery(id: string, reason: string): Promise<void> {
  await update(dbRef(db, `${PATH}/${id}`), {
    deletedAt: serverTimestamp(), deletedBy: auth.currentUser?.uid ?? null, deleteReason: reason.trim(), ...stamp()
  });
}

export async function restoreSurgery(id: string): Promise<void> {
  await update(dbRef(db, `${PATH}/${id}`), { deletedAt: null, deletedBy: null, deleteReason: null, ...stamp() });
}

export async function getSurgery(id: string): Promise<Surgery | null> {
  const s = await get(dbRef(db, `${PATH}/${id}`));
  return (s.val() as Surgery | null) ?? null;
}
