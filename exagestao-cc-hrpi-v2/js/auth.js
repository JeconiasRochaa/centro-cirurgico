// ============ js/auth.js ============
// Autenticação com usuários gerenciáveis (Firebase) + papéis e permissões.
// Mantém sessionStorage para a sessão ativa (não é um sistema de auth de produção
// com hashing/tokens — ver observação de segurança no relatório de auditoria).

import { db, ref, get, set, update } from './firebase.js';

const SESSION_KEY = 'hrpi_session';

// Usuários padrão (seed) — usados apenas se ainda não houver nenhum usuário
// cadastrado no Firebase. Uma vez que existir settings/users, estes são ignorados.
const SEED_USERS = {
    'admin': { name: 'Administrador', username: 'admin', password: 'admin123', role: 'admin', active: true },
    'cc': { name: 'Centro Cirúrgico', username: 'cc', password: 'cc123', role: 'cirurgico', active: true }
};

// ============ PERMISSÕES POR PAPEL (usuários e permissões) ============
// admin: acesso total, incluindo Configurações.
// diretor: acesso total, EXCETO Configurações.
// cirurgico: acesso restrito — apenas Registrar Cirurgia e Painel TV (somente leitura).
const ROLE_PERMISSIONS = {
    admin: { dashboard: true, configuracoes: true, usuarios: true, registro: true, prontuarios: true },
    diretor: { dashboard: true, configuracoes: false, usuarios: false, registro: true, prontuarios: true },
    cirurgico: { dashboard: false, configuracoes: false, usuarios: false, registro: true, prontuarios: true }
};

const ROLE_LABELS = { admin: 'Administrador', diretor: 'Diretor(a)', cirurgico: 'Centro Cirúrgico' };

export function roleLabel(role) { return ROLE_LABELS[role] || role; }

export function hasPermission(session, feature) {
    if (!session) return false;
    return !!(ROLE_PERMISSIONS[session.role] && ROLE_PERMISSIONS[session.role][feature]);
}

// ============ GESTÃO DE USUÁRIOS (Firebase settings/users) ============
async function getUsersMap() {
    try {
        const snap = await get(ref(db, 'settings/users'));
        const users = snap.val();
        return { ...SEED_USERS, ...(users || {}) };
    } catch (err) {
        console.error('Falha ao carregar usuários, usando padrão local:', err);
        return SEED_USERS;
    }
}

export async function listUsers() {
    const users = await getUsersMap();
    return Object.values(users);
}

export async function saveUser(user) {
    if (!user.username) throw new Error('Usuário sem username');
    const username = user.username.trim().toLowerCase();
    await update(ref(db, 'settings/users'), { [username]: { ...user, username } });
}

export async function deleteUser(username) {
    if (username === 'admin' || username === 'cc') {
        throw new Error('Usuário padrão protegido');
    }
    await set(ref(db, `settings/users/${username}`), null);
}

// ============ LOGIN ============
export async function login(username, password) {
    username = (username || '').trim().toLowerCase();
    const users = await getUsersMap();
    const user = users[username];

    if (!user) return { success: false, error: 'invalid' };
    if (user.password !== password) return { success: false, error: 'invalid' };
    if (!user.active) return { success: false, error: 'inactive' };

    const session = {
        username: user.username,
        name: user.name,
        role: user.role,
        loginTime: new Date().toISOString()
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, user: session };
}

export function getSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

// Retorna a página inicial correta de acordo com o papel do usuário.
export function homePageFor(role) {
    return role === 'cirurgico' ? 'registro_cirurgias.html' : 'dashboard.html';
}

export function requireAuth(requiredFeature) {
    const session = getSession();

    if (!session) {
        window.location.href = 'login.html';
        return null;
    }

    if (requiredFeature && !hasPermission(session, requiredFeature)) {
        alert('Acesso negado: seu perfil não tem permissão para esta área.');
        window.location.href = homePageFor(session.role);
        return null;
    }

    return session;
}

export function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
}

export function isAdmin() {
    const session = getSession();
    return session?.role === 'admin';
}
