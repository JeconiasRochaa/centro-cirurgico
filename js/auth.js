// ============ js/auth.js ============
// Autenticação unificada usando sessionStorage

const SESSION_KEY = 'hrpi_session';

// Banco de usuários local
const USERS = {
    'admin': {
        name: 'Administrador',
        username: 'admin',
        password: 'admin123',
        sector: 'administracao',
        role: 'admin',
        active: true
    },
    'cc': {
        name: 'Centro Cirúrgico',
        username: 'cc',
        password: 'cc123',
        sector: 'centro_cirurgico',
        role: 'manager',
        active: true
    }
};

export function login(username, password, sector) {
    const user = USERS[username];
    
    if (!user) return { success: false, error: 'Usuário não encontrado' };
    if (user.password !== password) return { success: false, error: 'Senha incorreta' };
    if (user.sector !== sector) return { success: false, error: 'Setor inválido' };
    if (!user.active) return { success: false, error: 'Usuário desativado' };
    
    const session = {
        username: user.username,
        name: user.name,
        sector: user.sector,
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

export function requireAuth(allowedSectors = []) {
    const session = getSession();
    
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    
    if (allowedSectors.length > 0 && !allowedSectors.includes(session.sector)) {
        alert('Acesso negado!');
        window.location.href = 'login.html';
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