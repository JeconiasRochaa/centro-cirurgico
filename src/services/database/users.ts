import { ref } from 'firebase/database';
import { db } from '../firebase/app';
import { snapshotToList, subscribe } from './helpers';
import type { UserProfile } from '@/types';

/** Lista de perfis (apenas administrador consegue ler — regra do banco). Criação/edição: Cloud Functions. */
export function subscribeUsers(cb: (l: UserProfile[]) => void, onError?: (e: Error) => void) {
  return subscribe(ref(db, 'users'), (s) => snapshotToList<UserProfile>(s, 'uid').sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')), cb, onError);
}
