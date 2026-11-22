import { initializeApp, getApps } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, inMemoryPersistence, setPersistence, signOut } from 'firebase/auth';
import { ref, serverTimestamp, set, update } from 'firebase/database';
import { auth, db, firebaseConfig, LOGIN_EMAIL_DOMAIN } from '../firebase/app';
import { apiCreateUser, apiResetUserPassword, apiUpdateUser, type CreateUserInput, type UpdateUserInput } from './functions';
import { AppError, errorCode } from '@/utils/errors';

/** Respostas definitivas do servidor: não adianta tentar o caminho alternativo. */
const DEFINITIVE = new Set(['functions/invalid-argument', 'functions/already-exists', 'functions/permission-denied', 'functions/unauthenticated', 'functions/failed-precondition', 'functions/not-found-user']);
const functionsUnavailable = (e: unknown) => !DEFINITIVE.has(errorCode(e));

/** Segundo app só para criar contas sem derrubar a sessão do administrador. */
function secondaryAuth() {
  const app = getApps().find((a) => a.name === 'user-admin') ?? initializeApp(firebaseConfig, 'user-admin');
  return getAuth(app);
}

async function createViaClient(d: CreateUserInput): Promise<string> {
  if (!auth.currentUser) throw new AppError('Sessão inválida. Entre novamente.');
  const sec = secondaryAuth();
  await setPersistence(sec, inMemoryPersistence);
  const username = d.username.trim().toLowerCase();
  const email = `${username}@${LOGIN_EMAIL_DOMAIN}`;
  const cred = await createUserWithEmailAndPassword(sec, email, d.password);
  try {
    // O perfil é gravado pelo administrador logado (as regras exigem perfil de admin ativo e impedem alterar o próprio).
    await set(ref(db, `users/${cred.user.uid}`), {
      name: d.name.trim(), username, role: d.role, active: d.active, mustChangePassword: true, createdAt: serverTimestamp(),
      ...(d.email ? { email: d.email.trim().toLowerCase() } : {}), ...(d.role === 'clinica' && d.clinicaId ? { clinicaId: d.clinicaId } : {})
    });
  } finally { await signOut(sec); }
  return cred.user.uid;
}

/** Cria usuário pela Cloud Function; se ela não estiver publicada, usa o caminho alternativo pelo navegador do administrador. */
export async function createUserAny(d: CreateUserInput): Promise<{ uid: string; viaFunctions: boolean }> {
  try { return { ...(await apiCreateUser(d)), viaFunctions: true }; }
  catch (e) { if (!functionsUnavailable(e)) throw e; }
  return { uid: await createViaClient(d), viaFunctions: false };
}

export async function updateUserAny(d: UpdateUserInput): Promise<void> {
  try { await apiUpdateUser(d); return; } catch (e) { if (!functionsUnavailable(e)) throw e; }
  if (d.uid === auth.currentUser?.uid) throw new AppError('Você não pode alterar o próprio perfil nem se desativar.');
  await update(ref(db, `users/${d.uid}`), {
    name: d.name.trim(), role: d.role, active: d.active, mustChangePassword: d.mustChangePassword, clinicaId: d.role === 'clinica' ? d.clinicaId ?? null : null
  });
}

export async function resetPasswordAny(uid: string, password: string): Promise<void> {
  try { await apiResetUserPassword({ uid, password }); return; } catch (e) { if (!functionsUnavailable(e)) throw e; }
  throw new AppError('Redefinir a senha de outra pessoa exige as Cloud Functions publicadas. Alternativa: no Console do Firebase (Authentication → Usuários → ⋮ → Redefinir senha) ou desative este usuário e crie outro.');
}
