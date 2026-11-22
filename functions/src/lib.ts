import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
export const db = admin.database();
export const authAdmin = admin.auth();

export const ROLES = ['admin', 'diretor', 'cirurgico', 'enfermagem', 'faturamento', 'clinica', 'painel_tv', 'painel_espera'] as const;
export type Role = (typeof ROLES)[number];
export const REGION = 'us-central1'; // deve ser a região do Realtime Database para os gatilhos
export const TZ = 'America/Maceio';
export const LOGIN_DOMAIN = process.env.LOGIN_EMAIL_DOMAIN || 'usuarios.hrpi.local';

export interface Caller { uid: string; role: Role; name: string; username: string }

/** Valida identidade E perfil no servidor. Nunca confia em dados de autorização enviados pelo cliente. */
export async function requireRole(req: CallableRequest<unknown>, allowed: readonly Role[]): Promise<Caller> {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sessão expirada. Entre novamente.');
  const snap = await db.ref(`users/${req.auth.uid}`).get();
  const p = snap.val() as { active?: boolean; role?: Role; name?: string; username?: string } | null;
  if (!p || p.active !== true || !p.role || !allowed.includes(p.role)) {
    await audit({ uid: req.auth.uid, action: 'acesso.negado', entity: 'functions', result: 'denied', detail: req.rawRequest?.url?.slice(0, 80) });
    throw new HttpsError('permission-denied', 'Você não tem permissão para esta operação.');
  }
  return { uid: req.auth.uid, role: p.role, name: p.name ?? '', username: p.username ?? '' };
}

export interface AuditInput {
  uid: string; action: string; entity: string; entityId?: string; fields?: string[];
  result: 'ok' | 'denied' | 'error'; detail?: string; role?: Role; username?: string;
}

/** Grava na trilha de auditoria (somente servidor). Nunca receba aqui senhas, tokens ou dados pessoais. */
export async function audit(e: AuditInput): Promise<void> {
  const entry: Record<string, unknown> = { ts: admin.database.ServerValue.TIMESTAMP, uid: e.uid, action: e.action, entity: e.entity, result: e.result };
  if (e.entityId) entry.entityId = e.entityId;
  if (e.fields?.length) entry.fields = e.fields;
  if (e.detail) entry.detail = e.detail;
  if (e.role) entry.role = e.role;
  if (e.username) entry.username = e.username;
  await db.ref('audit_logs').push(entry);
}

export function str(v: unknown, name: string, min: number, max: number): string {
  if (typeof v !== 'string') throw new HttpsError('invalid-argument', `Campo inválido: ${name}.`);
  const t = v.trim();
  if (t.length < min || t.length > max) throw new HttpsError('invalid-argument', `Campo inválido: ${name}.`);
  return t;
}

export function checkPassword(pw: unknown): string {
  if (typeof pw !== 'string' || pw.length < 10 || pw.length > 128 || !/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) {
    throw new HttpsError('invalid-argument', 'A senha deve ter ao menos 10 caracteres, com letras e números.');
  }
  return pw;
}

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v);
}

/** Data local (YYYY-MM-DD) no fuso do hospital. */
export function todayLocal(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
