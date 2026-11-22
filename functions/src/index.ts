import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onValueWritten } from 'firebase-functions/v2/database';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { audit, authAdmin, checkPassword, db, isRole, LOGIN_DOMAIN, REGION, requireRole, str, todayLocal, type Role } from './lib';
import { mirrorFor, tvNomeCompleto, writeMirror } from './mirror';

const OPTS = { region: REGION, cors: true, enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true' } as const;
type Rec = Record<string, unknown>;

// ---------------------------------------------------------------- Usuários (somente administrador)

export const createUser = onCall(OPTS, async (req) => {
  const caller = await requireRole(req, ['admin']);
  const d = (req.data ?? {}) as Rec;
  const name = str(d.name, 'nome', 3, 120);
  const username = str(d.username, 'usuário', 3, 32).toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new HttpsError('invalid-argument', 'Campo inválido: usuário.');
  const email = typeof d.email === 'string' && d.email.trim() ? str(d.email, 'e-mail', 5, 160).toLowerCase() : '';
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpsError('invalid-argument', 'Campo inválido: e-mail.');
  if (!isRole(d.role)) throw new HttpsError('invalid-argument', 'Campo inválido: perfil.');
  const role: Role = d.role;
  const clinicaId = typeof d.clinicaId === 'string' ? d.clinicaId.slice(0, 60) : '';
  if (role === 'clinica' && !clinicaId) throw new HttpsError('invalid-argument', 'Selecione a clínica do usuário.');
  const password = checkPassword(d.password);
  const active = d.active !== false;

  let uid: string;
  try {
    const rec = await authAdmin.createUser({ email: email || `${username}@${LOGIN_DOMAIN}`, password, displayName: name, disabled: !active });
    uid = rec.uid;
  } catch (e) {
    if ((e as { code?: string }).code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Já existe um usuário com este login/e-mail.');
    throw new HttpsError('internal', 'Não foi possível criar o usuário.');
  }
  // O login por "usuário" usa o e-mail técnico; guardamos o e-mail real (se houver) para recuperação.
  await db.ref(`users/${uid}`).set({
    name, username, role, active, mustChangePassword: true, createdAt: admin.database.ServerValue.TIMESTAMP,
    ...(email ? { email } : {}), ...(role === 'clinica' ? { clinicaId } : {})
  });
  await audit({ uid: caller.uid, role: caller.role, username: caller.username, action: 'usuario.criar', entity: 'users', entityId: uid, result: 'ok', detail: `perfil=${role}` });
  return { uid };
});

export const updateUser = onCall(OPTS, async (req) => {
  const caller = await requireRole(req, ['admin']);
  const d = (req.data ?? {}) as Rec;
  const uid = str(d.uid, 'uid', 5, 128);
  const name = str(d.name, 'nome', 3, 120);
  if (!isRole(d.role)) throw new HttpsError('invalid-argument', 'Campo inválido: perfil.');
  const role: Role = d.role;
  const active = d.active === true;
  const clinicaId = typeof d.clinicaId === 'string' ? d.clinicaId.slice(0, 60) : '';
  if (role === 'clinica' && !clinicaId) throw new HttpsError('invalid-argument', 'Selecione a clínica do usuário.');
  // Impede que o administrador (ou alguém por ele) reduza o próprio acesso e bloqueie o sistema.
  if (uid === caller.uid && (role !== caller.role || !active)) throw new HttpsError('failed-precondition', 'Você não pode alterar o próprio perfil nem se desativar.');

  const ref = db.ref(`users/${uid}`);
  if (!(await ref.get()).exists()) throw new HttpsError('not-found', 'Usuário não encontrado.');
  await ref.update({ name, role, active, mustChangePassword: d.mustChangePassword === true, clinicaId: role === 'clinica' ? clinicaId : null });
  await authAdmin.updateUser(uid, { displayName: name, disabled: !active });
  if (!active) await authAdmin.revokeRefreshTokens(uid);
  await audit({ uid: caller.uid, role: caller.role, username: caller.username, action: 'usuario.editar', entity: 'users', entityId: uid, result: 'ok', detail: `perfil=${role};ativo=${active}` });
  return { ok: true };
});

export const resetUserPassword = onCall(OPTS, async (req) => {
  const caller = await requireRole(req, ['admin']);
  const d = (req.data ?? {}) as Rec;
  const uid = str(d.uid, 'uid', 5, 128);
  const password = checkPassword(d.password);
  if (!(await db.ref(`users/${uid}`).get()).exists()) throw new HttpsError('not-found', 'Usuário não encontrado.');
  await authAdmin.updateUser(uid, { password });
  await authAdmin.revokeRefreshTokens(uid);
  await db.ref(`users/${uid}/mustChangePassword`).set(true);
  await audit({ uid: caller.uid, role: caller.role, username: caller.username, action: 'usuario.redefinir_senha', entity: 'users', entityId: uid, result: 'ok' });
  return { ok: true };
});

// ---------------------------------------------------------------- LGPD: direitos do titular

const norm = (v: unknown) => String(v ?? '').trim().toUpperCase();

async function findTitular(prontuario: string, nome: string) {
  const [pat, sur, abs] = await Promise.all([db.ref('patients').get(), db.ref('surgeries').get(), db.ref('absences').get()]);
  const match = (r: Rec) => (prontuario && norm(r.prontuario) === prontuario) || (nome && norm(r.nome ?? r.patient) === nome);
  const patients: { key: string; rec: Rec }[] = [];
  const surgeries: { key: string; rec: Rec }[] = [];
  const absences: { key: string; rec: Rec }[] = [];
  pat.forEach((c) => { const v = c.val() as Rec; if (match(v)) patients.push({ key: c.key!, rec: v }); });
  sur.forEach((c) => { const v = c.val() as Rec; if (match(v)) surgeries.push({ key: c.key!, rec: v }); });
  abs.forEach((c) => { const v = c.val() as Rec; if (nome && norm(v.patient) === nome) absences.push({ key: c.key!, rec: v }); });
  return { patients, surgeries, absences };
}

function criteria(d: Rec) {
  const prontuario = typeof d.prontuario === 'string' ? norm(d.prontuario) : '';
  const nome = typeof d.nome === 'string' ? norm(d.nome) : '';
  if (!prontuario && nome.length < 5) throw new HttpsError('invalid-argument', 'Informe o prontuário ou o nome completo do titular.');
  return { prontuario, nome };
}

/** Direito de acesso (art. 18, II): reúne tudo que o sistema guarda sobre o titular. */
export const exportTitularData = onCall(OPTS, async (req) => {
  const caller = await requireRole(req, ['admin', 'diretor']);
  const { prontuario, nome } = criteria((req.data ?? {}) as Rec);
  const found = await findTitular(prontuario, nome);
  let acessos = 0;
  const keys = new Set([...found.patients.map((p) => p.key), ...found.surgeries.map((s) => s.key)]);
  const logs = await db.ref('access_logs').get();
  logs.forEach((c) => { const v = c.val() as Rec; if (typeof v.entityId === 'string' && keys.has(v.entityId)) acessos++; });
  await audit({ uid: caller.uid, role: caller.role, username: caller.username, action: 'lgpd.exportar_titular', entity: 'titular', result: 'ok', detail: `criterio=${prontuario ? 'prontuario' : 'nome'};registros=${found.patients.length + found.surgeries.length + found.absences.length}` });
  return {
    geradoEm: new Date().toISOString(), criterio: prontuario ? 'prontuário' : 'nome',
    pacientes: found.patients.map((p) => p.rec), cirurgias: found.surgeries.map((s) => s.rec), faltas: found.absences.map((a) => a.rec), acessosRegistrados: acessos
  };
});

/**
 * Eliminação/anonimização (art. 18, IV e VI) SOMENTE após o prazo legal de guarda do prontuário
 * (padrão 20 anos, Lei 13.787/2018). Antes disso o pedido deve ser negado/limitado, com justificativa ao titular.
 */
export const anonymizeTitular = onCall(OPTS, async (req) => {
  const caller = await requireRole(req, ['admin']);
  const d = (req.data ?? {}) as Rec;
  if (d.confirmacao !== 'ANONIMIZAR') throw new HttpsError('invalid-argument', 'Confirmação ausente.');
  const patientKey = str(d.patientKey, 'paciente', 3, 200);
  const rec = (await db.ref(`patients/${patientKey}`).get()).val() as Rec | null;
  if (!rec) throw new HttpsError('not-found', 'Paciente não encontrado.');
  const found = await findTitular(norm(rec.prontuario), norm(rec.nome));

  const anos = Number((await db.ref('settings/lgpd/retencaoAnos').get()).val()) || 20;
  const limite = new Date(); limite.setFullYear(limite.getFullYear() - anos);
  const limiteStr = todayLocal(limite);
  const recentes = found.surgeries.filter((s) => typeof s.rec.date !== 'string' || (s.rec.date as string) > limiteStr).length
    + found.absences.filter((a) => typeof a.rec.date !== 'string' || (a.rec.date as string) > limiteStr).length;
  if (recentes > 0) throw new HttpsError('failed-precondition', `Há registros dentro do prazo de guarda de ${anos} anos. Eliminação não permitida.`);

  const updates: Record<string, unknown> = { [`patients/${patientKey}`]: null };
  for (const s of found.surgeries) {
    Object.assign(updates, {
      [`surgeries/${s.key}/patient`]: 'ANONIMIZADO', [`surgeries/${s.key}/prontuario`]: null, [`surgeries/${s.key}/birthDate`]: null,
      [`surgeries/${s.key}/observacoes`]: null, [`surgeries/${s.key}/materiaisEspeciais`]: null, [`surgeries/${s.key}/updatedBy`]: caller.uid, [`surgeries/${s.key}/updatedAt`]: admin.database.ServerValue.TIMESTAMP
    });
  }
  for (const a of found.absences) {
    Object.assign(updates, { [`absences/${a.key}/patient`]: 'ANONIMIZADO', [`absences/${a.key}/reason`]: null, [`absences/${a.key}/municipio`]: null });
  }
  await db.ref().update(updates);
  await audit({ uid: caller.uid, role: caller.role, username: caller.username, action: 'lgpd.anonimizar_titular', entity: 'titular', result: 'ok', detail: `cirurgias=${found.surgeries.length};faltas=${found.absences.length}` });
  return { anonimizados: found.surgeries.length + found.absences.length + 1 };
});

// ---------------------------------------------------------------- Painéis: reconstrução manual

export const rebuildPaineis = onCall(OPTS, async (req) => {
  const caller = await requireRole(req, ['admin', 'diretor']);
  const [snap, full] = await Promise.all([db.ref('surgeries').get(), tvNomeCompleto()]);
  const today = todayLocal();
  const updates: Record<string, unknown> = { painel_tv: null, painel_espera: null };
  snap.forEach((c) => {
    const m = mirrorFor(c.key!, c.val() as Rec, today, full);
    if (m.tv) updates[`painel_tv/${c.key}`] = m.tv;
    if (m.espera) updates[`painel_espera/${c.key}`] = m.espera;
  });
  await db.ref().update(updates);
  await audit({ uid: caller.uid, role: caller.role, username: caller.username, action: 'painel.reconstruir', entity: 'painel', result: 'ok' });
  return { ok: true };
});

// ---------------------------------------------------------------- Gatilhos: auditoria confiável + espelho dos painéis

const IGNORED = new Set(['updatedAt', 'updatedBy']);

function changedFields(b: Rec, a: Rec): string[] {
  return [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => !IGNORED.has(k) && JSON.stringify(b[k]) !== JSON.stringify(a[k]));
}

const actorCache = new Map<string, { role?: Role; username?: string }>();
async function actor(uid?: string) {
  if (!uid) return {};
  if (!actorCache.has(uid)) {
    const p = (await db.ref(`users/${uid}`).get()).val() as { role?: Role; username?: string } | null;
    actorCache.set(uid, { role: p?.role, username: p?.username });
    setTimeout(() => actorCache.delete(uid), 60_000).unref?.();
  }
  return actorCache.get(uid)!;
}

export const onSurgeryWritten = onValueWritten({ ref: '/surgeries/{id}', region: REGION }, async (event) => {
  const id = event.params.id;
  const before = (event.data.before.val() as Rec | null);
  const after = (event.data.after.val() as Rec | null);

  if (!after) {
    // Exclusão física não é permitida pelas regras; se ocorrer (ex.: console), fica registrada como alerta.
    await audit({ uid: 'sistema', action: 'cirurgia.exclusao_fisica_detectada', entity: 'surgeries', entityId: id, result: 'error' });
  } else {
    const uid = typeof after.updatedBy === 'string' ? after.updatedBy : 'desconhecido';
    const a = await actor(uid);
    let action = 'cirurgia.atualizar';
    let detail: string | undefined;
    if (!before) action = 'cirurgia.criar';
    else if (!before.deletedAt && after.deletedAt) action = 'cirurgia.excluir_logico';
    else if (before.deletedAt && !after.deletedAt) action = 'cirurgia.restaurar';
    else if (before.status !== after.status) { action = 'cirurgia.status'; detail = `${String(before.status)}->${String(after.status)}`; }
    await audit({ uid, ...a, action, entity: 'surgeries', entityId: id, fields: before ? changedFields(before, after) : undefined, result: 'ok', detail });
  }
  await writeMirror(id, after);
});

export const onPatientWritten = onValueWritten({ ref: '/patients/{key}', region: REGION }, async (event) => {
  const before = event.data.before.val() as Rec | null;
  const after = event.data.after.val() as Rec | null;
  const uid = typeof after?.updatedBy === 'string' ? after.updatedBy : 'sistema';
  const a = await actor(uid);
  await audit({
    uid, ...a, action: !after ? 'paciente.remover' : !before ? 'paciente.criar' : 'paciente.atualizar', entity: 'patients', entityId: event.params.key,
    fields: before && after ? changedFields(before, after) : undefined, result: 'ok'
  });
});

/** Limpa diariamente do espelho o que já não deve ser exibido (datas passadas). */
export const manutencaoDiaria = onSchedule({ schedule: 'every day 03:00', timeZone: 'America/Maceio', region: REGION }, async () => {
  const today = todayLocal();
  const updates: Record<string, null> = {};
  for (const node of ['painel_tv', 'painel_espera'] as const) {
    const snap = await db.ref(node).get();
    snap.forEach((c) => { const v = c.val() as Rec; if (typeof v.date !== 'string' || v.date < today) updates[`${node}/${c.key}`] = null; });
  }
  if (Object.keys(updates).length) await db.ref().update(updates);
});
