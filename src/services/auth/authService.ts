import {
  signInWithEmailAndPassword, signOut, sendPasswordResetEmail, reauthenticateWithCredential,
  EmailAuthProvider, updatePassword, type User
} from 'firebase/auth';
import { get, ref, set, serverTimestamp } from 'firebase/database';
import { auth, db, LOGIN_EMAIL_DOMAIN, setAuthPersistence } from '../firebase/app';
import type { UserProfile } from '@/types';
import { ROLES } from '@/types';
import { AppError } from '@/utils/errors';
import { TERMO_VERSAO } from '@/utils/constants';

/** "usuario" vira usuario@dominio-técnico; se já tiver "@", é tratado como e-mail real. */
export function identifierToEmail(identifier: string): string {
  const v = identifier.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${LOGIN_EMAIL_DOMAIN}`;
}

export async function loadProfile(user: User): Promise<UserProfile | null> {
  const snap = await get(ref(db, `users/${user.uid}`));
  const p = snap.val() as Omit<UserProfile, 'uid'> | null;
  if (!p || p.active !== true || !ROLES.includes(p.role)) return null;
  return { uid: user.uid, ...p };
}

/**
 * Faz login e valida o perfil. `persistent` (manter conectado) só é aceito para contas de painel (TV),
 * que precisam sobreviver a reinícios; as demais contas usam sessão por aba.
 */
export async function login(identifier: string, password: string, persistent = false): Promise<UserProfile> {
  await setAuthPersistence(persistent);
  const cred = await signInWithEmailAndPassword(auth, identifierToEmail(identifier), password);
  const profile = await loadProfile(cred.user);
  if (!profile) {
    await signOut(auth);
    throw new AppError('Este usuário está inativo ou sem permissão de acesso. Procure o administrador.', 'app/no-profile');
  }
  if (persistent && profile.role !== 'painel_tv' && profile.role !== 'painel_espera') {
    await signOut(auth);
    throw new AppError('"Manter conectado" é permitido apenas para contas de painel.', 'app/persistent-not-allowed');
  }
  return profile;
}

export function logout(): Promise<void> {
  return signOut(auth);
}

/** Recuperação de senha por e-mail. A resposta é sempre neutra (não revela se o e-mail existe). */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/too-many-requests' || code === 'auth/network-request-failed') throw err;
    // demais erros (usuário inexistente etc.) são ignorados de propósito
  }
}

export async function changeOwnPassword(current: string, next: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new AppError('Sessão inválida. Entre novamente.', 'auth/no-session');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
  await updatePassword(user, next);
  // Regra do banco: o próprio usuário só pode baixar esta flag (false).
  await set(ref(db, `users/${user.uid}/mustChangePassword`), false);
}

/** Registra o aceite do aviso de privacidade/termo de uso (LGPD — transparência). */
export async function acceptTerms(uid: string): Promise<void> {
  await set(ref(db, `users/${uid}/termoVersao`), TERMO_VERSAO);
  await set(ref(db, `users/${uid}/termoAceitoEm`), serverTimestamp());
}
