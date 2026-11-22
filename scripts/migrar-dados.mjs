// Migração NÃO DESTRUTIVA do banco legado para o novo modelo (execute no seu computador, nunca no navegador).
//
//   cd scripts && npm i firebase-admin   (ou use a instalação de functions/)
//   export GOOGLE_APPLICATION_CREDENTIALS=/caminho/chave-de-servico.json   # NUNCA versionar esta chave
//   export DATABASE_URL=https://SEU-PROJETO-default-rtdb.firebaseio.com
//   node scripts/migrar-dados.mjs                      # SIMULAÇÃO (dry-run): só mostra o que faria
//   node scripts/migrar-dados.mjs --apply              # aplica
//   node scripts/migrar-dados.mjs --apply --remover-senhas-legadas   # após conferir tudo: apaga settings/users
//
// O que faz (sempre nesta ordem):
//  1. Backup completo do banco em backup-AAAA-MM-DD-HHMM.json (guarde em local seguro: contém dados pessoais).
//  2. Usuários: cria contas no Firebase Auth a partir de settings/users (senhas antigas NÃO são reaproveitadas; cada
//     conta recebe senha temporária aleatória e troca obrigatória no 1º acesso) e grava users/{uid}.
//  3. Cirurgias: acrescenta clinicaId (a partir de clinicaOrigem/setorSolicitante) somente onde estiver ausente.
//     Nenhum campo existente é alterado e nenhum registro é apagado.
//  4. Relatório de registros que violam as novas validações (para correção manual).
//  5. (opcional) --remover-senhas-legadas: remove settings/users (senhas em texto puro).
import admin from 'firebase-admin';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const REMOVE_LEGACY = process.argv.includes('--remover-senhas-legadas');
const DATABASE_URL = process.env.DATABASE_URL;
const EMAIL_DOMAIN = process.env.LOGIN_EMAIL_DOMAIN || 'usuarios.hrpi.local';
if (!DATABASE_URL) { console.error('Defina DATABASE_URL.'); process.exit(1); }

const ROLES = ['admin', 'diretor', 'cirurgico', 'enfermagem', 'faturamento', 'clinica', 'painel_tv', 'painel_espera'];
const CLINICAS = {
  'clinica medica i': 'clinica-medica-1', 'clinica medica ii': 'clinica-medica-2', 'clinica cirurgica': 'clinica-cirurgica', pediatria: 'pediatria',
  'oncologia i': 'oncologia-1', 'oncologia ii': 'oncologia-2', 'area vermelha': 'area-vermelha', emergencia: 'emergencia', 'uti i': 'uti-1', 'uti ii': 'uti-2', outros: 'outros'
};
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

admin.initializeApp({ credential: admin.credential.applicationDefault(), databaseURL: DATABASE_URL });
const db = admin.database();
const auth = admin.auth();
const log = (...a) => console.log(APPLY ? '[APLICANDO]' : '[SIMULAÇÃO]', ...a);

// 1. Backup
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})(\d{4})$/, '$1-$2');
const root = (await db.ref('/').get()).val() ?? {};
const file = `backup-${stamp}.json`;
writeFileSync(file, JSON.stringify(root), { mode: 0o600 });
console.log(`Backup salvo em ${file} (permissão 600). Guarde com segurança.`);

// 2. Usuários
const legacy = root.settings?.users ?? {};
const existingProfiles = root.users ?? {};
const created = [];
for (const [key, u] of Object.entries(legacy)) {
  const username = String(u.username ?? key).trim().toLowerCase();
  let role = u.role === 'cirurgico' || ROLES.includes(u.role) ? u.role : null;
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || !role) { console.warn(`  ! ignorado (login/papel inválido): ${key}`); continue; }
  const email = `${username}@${EMAIL_DOMAIN}`;
  let uid = null;
  try { uid = (await auth.getUserByEmail(email)).uid; } catch { /* ainda não existe */ }
  if (uid && existingProfiles[uid]) { console.log(`  = já migrado: ${username}`); continue; }
  const password = randomBytes(9).toString('base64url');
  log(`usuário ${username} (${role})`);
  if (APPLY) {
    if (!uid) uid = (await auth.createUser({ email, password, displayName: u.name })).uid; else await auth.updateUser(uid, { password });
    await db.ref(`users/${uid}`).set({ name: u.name ?? username, username, role, active: u.active !== false, mustChangePassword: true, createdAt: admin.database.ServerValue.TIMESTAMP });
    created.push({ username, password });
  }
}
if (created.length) { console.log('\nSENHAS TEMPORÁRIAS (exibidas uma única vez — repasse por canal seguro):'); created.forEach((c) => console.log(`  ${c.username}: ${c.password}`)); }

// 3. Cirurgias: clinicaId
let patched = 0, unmapped = 0;
for (const [id, s] of Object.entries(root.surgeries ?? {})) {
  if (s.clinicaId) continue;
  const nome = s.clinicaOrigem || s.setorSolicitante;
  if (!nome) continue;
  const clinicaId = CLINICAS[norm(nome)];
  if (!clinicaId) { unmapped++; console.warn(`  ? clínica não reconhecida em ${id}: "${nome}"`); continue; }
  patched++;
  log(`surgeries/${id}/clinicaId = ${clinicaId}`);
  if (APPLY) await db.ref(`surgeries/${id}/clinicaId`).set(clinicaId);
}
console.log(`Cirurgias com clinicaId ${APPLY ? 'acrescentado' : 'a acrescentar'}: ${patched}; não reconhecidas: ${unmapped}`);

// 4. Validação dos dados legados
const problems = [];
for (const [id, s] of Object.entries(root.surgeries ?? {})) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date ?? '')) problems.push(`surgeries/${id}: data inválida`);
  if (!s.patient) problems.push(`surgeries/${id}: paciente ausente`);
  if (s.time && !/^\d{2}:\d{2}$/.test(s.time)) problems.push(`surgeries/${id}: horário inválido`);
  if (!['pendente', 'em_preparacao', 'em_andamento', 'recuperacao', 'concluida', 'suspensa', 'cancelada'].includes(s.status)) problems.push(`surgeries/${id}: status "${s.status}" desconhecido`);
}
console.log(problems.length ? `\nRegistros que precisam de correção manual (${problems.length}):\n  ${problems.join('\n  ')}` : '\nNenhum registro legado viola as novas validações.');

// 5. Senhas legadas
if (REMOVE_LEGACY) {
  if (!APPLY) log('removeria settings/users (senhas em texto puro)');
  else { await db.ref('settings/users').remove(); console.log('settings/users removido.'); }
} else if (root.settings?.users) {
  console.warn('\nATENÇÃO: settings/users (senhas antigas em texto puro) ainda existe. Após conferir a migração, rode com --remover-senhas-legadas.');
}
console.log(APPLY ? '\nConcluído.' : '\nSimulação concluída. Nada foi alterado. Rode com --apply para aplicar.');
process.exit(0);
