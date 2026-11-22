import { onValue, ref, serverTimestamp, type DataSnapshot, type Query } from 'firebase/database';
import { auth, db } from '../firebase/app';

export { ref, db };

/** Carimbo de rastreabilidade exigido pelas regras: quem alterou e quando (horário do servidor). */
export function stamp() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sessão inválida');
  return { updatedBy: uid, updatedAt: serverTimestamp() };
}

/** Remove `undefined` (o Realtime Database não aceita) e strings vazias opcionais. */
export function clean<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_k, v) => (v === undefined ? null : v))) as T;
}

export function snapshotToList<T>(snap: DataSnapshot, withKeyAs?: string): T[] {
  const out: T[] = [];
  snap.forEach((child) => {
    const v = child.val();
    if (v && typeof v === 'object') out.push(withKeyAs ? ({ ...v, [withKeyAs]: child.key } as T) : (v as T));
  });
  return out;
}

/** Assina um nó/consulta; retorna a função para cancelar. Erros de permissão chegam em `onError`. */
export function subscribe<T>(q: Query, map: (snap: DataSnapshot) => T, cb: (v: T) => void, onError?: (e: Error) => void): () => void {
  return onValue(q, (snap) => cb(map(snap)), (e) => onError?.(e));
}
