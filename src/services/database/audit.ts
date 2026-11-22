import { limitToLast, orderByChild, query, ref } from 'firebase/database';
import { db } from '../firebase/app';
import { snapshotToList, subscribe } from './helpers';

/** Consulta a prontuários registrada pelo cliente (somente inclusão; leitura restrita a admin/diretor). */
export interface AccessLog {
  id?: string;
  uid: string;
  entity: 'patients' | 'surgeries' | string;
  entityId: string;
  ts: number;
}

export const ACCESS_LOGS_LIMIT = 200;

/** Últimos 200 acessos a prontuários, do mais recente para o mais antigo. */
export function subscribeAccessLogs(cb: (l: AccessLog[]) => void, onError?: (e: Error) => void) {
  const q = query(ref(db, 'access_logs'), orderByChild('ts'), limitToLast(ACCESS_LOGS_LIMIT));
  return subscribe(q, (s) => snapshotToList<AccessLog>(s, 'id').sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)), cb, onError);
}
