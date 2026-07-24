// ============ js/utils.js ============
// Utilitários compartilhados

export function getToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

export function getDoctorTitle(name) {
    if (!name) return 'Dr.';
    const clean = name.replace(/^(dr\.?|dra\.?)\s*/i, '').trim();
    const femaleNames = [
        'MARIA','ANA','JULIA','BEATRIZ','CAMILA','CAROLINA','CRISTINA',
        'DANIELA','FERNANDA','GABRIELA','HELENA','ISABELA','JOANA',
        'LAURA','LETÍCIA','LUCIANA','MARCIA','MARINA','PATRICIA',
        'PAULA','RAFAELA','RENATA','ROBERTA','SANDRA','SARA','SOFIA',
        'VANESSA','ALINE','AMANDA','BIANCA','BRUNA','CARLA','CLAUDIA',
        'DEBORA','FABIANA','FLAVIA','GIOVANA','JULIANA','KARINA',
        'LILIAN','LUANA','MANUELA','MICHELE','MONICA','PRISCILA',
        'RAQUEL','REGINA','ROSANA','SILVIA','SIMONE','TANIA','VALERIA','VERONICA'
    ];
    const firstName = clean.split(' ')[0].toUpperCase();
    if (femaleNames.includes(firstName)) return 'Dra.';
    return 'Dr.';
}

export function calculateAge(birthDate) {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate + 'T00:00:00');
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : 0;
}

export const origemMap = {
    'Interno': '🏥 Interno',
    'Eletivo': '📋 Eletivo',
    'Urgência/Emergência': '🚨 Urgência',
    'Transferência': '🚑 Transferência',
    'Mutirão': '👥 Mutirão'
};

export const statusLabels = {
    'pendente': '⏳ Aguardando',
    'em_andamento': '⚙️ Em Andamento',
    'concluida': '✅ Finalizada',
    'cancelada': '❌ Cancelada'
};

export const statusBadgeClass = {
    'pendente': 'badge-warning',
    'em_andamento': 'badge-info',
    'concluida': 'badge-success',
    'cancelada': 'badge-danger'
};