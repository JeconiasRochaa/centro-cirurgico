// ============ js/dashboard.js ============
import { db, ref, onValue, update, remove, push, set, get } from './firebase.js';
import { requireAuth, logout, roleLabel, hasPermission, listUsers, saveUser, deleteUser } from './auth.js';
import { getToday, formatDate, getDoctorTitle, statusLabels, statusBadgeClass } from './utils.js';

const session = requireAuth('dashboard');
if (!session) throw new Error('Acesso negado');

let allSurgeries = [];
const TODAY = getToday();
let specialtyChart, originChart, monthlyChart, dailyChart, cancellationRateChart, hourlyChart;
let hospitalLogo = null, govLogo = null;
let systemName = 'ExaGestão', hospitalName = 'Hospital Regional de Palmeira dos Índios';
let auditLogs = [];

// Expor funções
window.logout = logout;
window.switchTab = switchTab;
window.filtrarCirurgias = filtrarCirurgias;
window.filtrarCanceladas = filtrarCanceladas;
window.editarCirurgia = editarCirurgia;
window.excluirCirurgia = excluirCirurgia;
window.fecharModal = fecharModal;
window.abrirModal = abrirModal;
window.toggleTheme = toggleTheme;
window.toggleSidebar = toggleSidebar;
window.gerarRelatorio = gerarRelatorio;
window.gerarRelatorioPersonalizado = gerarRelatorioPersonalizado;
window.gerarRelatorioEspecialidade = gerarRelatorioEspecialidade;
window.gerarRelatorioOrigem = gerarRelatorioOrigem;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userNameDisplay').textContent = session.name;
    document.getElementById('userRole').textContent = roleLabel(session.role);
    document.getElementById('userAvatar').textContent = (session.name || 'A').charAt(0).toUpperCase();
    
    const savedTheme = localStorage.getItem('hrpi_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    onValue(ref(db, 'surgeries'), (snap) => {
        allSurgeries = snap.val() ? Object.values(snap.val()) : [];
        updateAll();
    });
    
    onValue(ref(db, 'audit_logs'), (snap) => {
        auditLogs = snap.val() ? Object.values(snap.val()) : [];
        updateAuditTable();
    });

    onValue(ref(db, '.info/connected'), (snap) => {
        updateConnectionStatus(snap.val() === true);
    });

    loadLogos();
});

function updateConnectionStatus(isConnected) {
    const el = document.getElementById('systemStatus');
    if (!el) return;
    if (isConnected) {
        el.className = 'system-status';
        el.innerHTML = '<div class="dot"></div> Sistema conectado';
    } else {
        el.className = 'system-status offline';
        el.innerHTML = '<div class="dot"></div> Conexão indisponível';
    }
}

async function loadLogos() {
    try {
        const logoSnap = await get(ref(db, 'settings/logo'));
        if (logoSnap.val()) {
            hospitalLogo = logoSnap.val();
            document.getElementById('sidebarLogo').innerHTML = `<img src="${hospitalLogo}" alt="Logo">`;
        }
        const govSnap = await get(ref(db, 'settings/govLogo'));
        if (govSnap.val()) govLogo = govSnap.val();

        const nameSnap = await get(ref(db, 'settings/systemName'));
        if (nameSnap.val()) systemName = nameSnap.val();
        const hospSnap = await get(ref(db, 'settings/hospitalName'));
        if (hospSnap.val()) hospitalName = hospSnap.val();

        document.querySelectorAll('.sidebar-brand-name').forEach(el => el.textContent = systemName);
        document.querySelectorAll('.sidebar-brand-sub').forEach(el => el.textContent = 'Centro Cirúrgico');
        document.title = `${systemName} - ${hospitalName}`;

        document.getElementById('welcomeSystemName').textContent = systemName;
        document.getElementById('welcomeHospitalName').textContent = hospitalName;
        if (hospitalLogo) document.getElementById('welcomeLogo').innerHTML = `<img src="${hospitalLogo}" alt="Logo">`;
    } catch(e) {}
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('hrpi_theme', next);
}

function switchTab(tab) {
    if (tab === 'configuracoes' && !hasPermission(session, 'configuracoes')) {
        alert('Seu perfil não tem acesso às Configurações.');
        return;
    }

    document.querySelectorAll('.sidebar-item[data-tab]').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tab) item.classList.add('active');
    });
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const content = document.getElementById(`tab-${tab}`);
    if (content) content.classList.add('active');
    
    const titles = {
        'inicial': 'Inicial',
        'overview': 'Visão Geral',
        'surgeries': 'Cirurgias',
        'cancelled': 'Canceladas',
        'reports': 'Relatórios',
        'audit': 'Auditoria',
        'prontuarios': 'Prontuários',
        'configuracoes': 'Configurações'
    };
    document.getElementById('breadcrumbCurrent').textContent = titles[tab] || 'HRPI';
    
    if (tab === 'overview') renderCharts();
    if (tab === 'cancelled') filtrarCanceladas();
    if (tab === 'configuracoes') { carregarIdentidade(); carregarUsuarios(); carregarMedicos(); }
    if (tab === 'prontuarios') buscarPacientes();
    
    document.getElementById('sidebar').classList.remove('open');
    if (history.replaceState) history.replaceState(null, '', `#${tab}`);
}

// Permite links externos como "dashboard.html#reports" abrirem direto na aba certa
window.addEventListener('DOMContentLoaded', () => {
    const hashTab = (location.hash || '').replace('#', '');
    const validTabs = ['inicial', 'overview', 'surgeries', 'cancelled', 'reports', 'audit', 'prontuarios', 'configuracoes'];
    if (hashTab && validTabs.includes(hashTab)) switchTab(hashTab);

    // Mostra o item "Configurações" na sidebar somente para quem tem permissão
    if (hasPermission(session, 'configuracoes')) {
        document.getElementById('navConfiguracoes').style.display = 'flex';
    }

    // Saudação e data na tela Inicial
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    document.getElementById('welcomeGreeting').textContent = `${saudacao}, ${session.name}.`;
    document.getElementById('welcomeDate').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
});

function updateAll() {
    updateKPIs();
    updateAlerts();
    updateRooms();
    updateUpcoming();
    updateResourcesPending();
    renderCharts();
    filtrarCirurgias();
    filtrarCanceladas();
    updateSelects();
}

// ============ KPIs ============
function updateKPIs() {
    const hoje = allSurgeries.filter(s => s.date === TODAY);
    const agendadas = allSurgeries.filter(s => s.date > TODAY && s.status !== 'cancelada');
    const canceladas = hoje.filter(s => s.status === 'cancelada').length;
    const taxa = hoje.length > 0 ? ((canceladas / hoje.length) * 100).toFixed(1) : 0;

    const TOTAL_SALAS = ['SALA A', 'SALA B', 'SALA C', 'SALA D'];
    const salasOcupadas = TOTAL_SALAS.filter(sala =>
        hoje.some(s => s.room === sala && (s.status === 'em_andamento' || s.status === 'em_preparacao'))
    ).length;

    document.getElementById('overviewStats').innerHTML = `
        <div class="stat-card" style="--stat-color:#2f6fed;"><div class="stat-icon"><i class="fa-solid fa-clipboard-list"></i></div><div class="stat-value">${hoje.length}</div><div class="stat-label">Total Hoje</div></div>
        <div class="stat-card" style="--stat-color:#f59e0b;"><div class="stat-icon">⏳</div><div class="stat-value">${hoje.filter(s=>s.status==='pendente').length}</div><div class="stat-label">Aguardando</div></div>
        <div class="stat-card" style="--stat-color:#2f6fed;"><div class="stat-icon"><i class="fa-solid fa-circle-play"></i></div><div class="stat-value">${hoje.filter(s=>s.status==='em_andamento').length}</div><div class="stat-label">Em Andamento</div></div>
        <div class="stat-card" style="--stat-color:#16a34a;"><div class="stat-icon"><i class="fa-solid fa-circle-check"></i></div><div class="stat-value">${hoje.filter(s=>s.status==='concluida').length}</div><div class="stat-label">Finalizadas</div></div>
        <div class="stat-card" style="--stat-color:#e5484d;"><div class="stat-icon"><i class="fa-solid fa-circle-xmark"></i></div><div class="stat-value">${canceladas}</div><div class="stat-label">Canceladas</div></div>
        <div class="stat-card" style="--stat-color:#0fb5b0;"><div class="stat-icon"><i class="fa-solid fa-hospital"></i></div><div class="stat-value">${salasOcupadas} / ${TOTAL_SALAS.length}</div><div class="stat-label">Salas Ocupadas</div></div>
        <div class="stat-card" style="--stat-color:#7c5cfc;"><div class="stat-icon"><i class="fa-solid fa-calendar-day"></i></div><div class="stat-value">${agendadas.length}</div><div class="stat-label">Agendadas</div></div>
        <div class="stat-card" style="--stat-color:#2f6fed;"><div class="stat-icon"><i class="fa-solid fa-arrow-trend-down"></i></div><div class="stat-value">${taxa}%</div><div class="stat-label">Taxa Cancel.</div></div>
    `;
}

// ============ ALERTAS ============
function updateAlerts() {
    const hoje = allSurgeries.filter(s => s.date === TODAY);
    const comSangue = hoje.filter(s => s.necessitaSangue === 'sim').length;
    const comUTI = hoje.filter(s => s.necessitaUTI === 'sim').length;
    const canceladas = hoje.filter(s => s.status === 'cancelada').length;
    const aguardando = hoje.filter(s => s.status === 'pendente').length;
    
    const alertas = [];
    if (canceladas > 0) alertas.push(`<div class="alert-item red"><i class="fa-solid fa-circle-exclamation"></i> ${canceladas} cirurgia(s) cancelada(s) hoje</div>`);
    if (comSangue > 0) alertas.push(`<div class="alert-item red"><i class="fa-solid fa-droplet"></i> ${comSangue} cirurgia(s) necessitam reserva de sangue</div>`);
    if (comUTI > 0) alertas.push(`<div class="alert-item purple"><i class="fa-solid fa-bed-pulse"></i> ${comUTI} cirurgia(s) necessitam UTI</div>`);
    if (aguardando > 0) alertas.push(`<div class="alert-item orange">⏳ ${aguardando} cirurgia(s) aguardando início</div>`);
    
    const container = document.getElementById('alertsArea');
    if (container) {
        container.innerHTML = alertas.join('');
        container.style.display = alertas.length ? 'grid' : 'none';
    }
}

// ============ SALAS (VISÃO GERAL) ============
function updateRooms() {
    const salas = ['SALA A', 'SALA B', 'SALA C', 'SALA D'];
    const hoje = allSurgeries.filter(s => s.date === TODAY);
    
    document.getElementById('roomsGrid').innerHTML = salas.map(sala => {
        const emAndamento = hoje.find(s => s.room === sala && s.status === 'em_andamento');
        const emPreparo = hoje.find(s => s.room === sala && s.status === 'em_preparacao');
        const aguardando = hoje.find(s => s.room === sala && s.status === 'pendente');
        
        if (emAndamento) {
            const progresso = calcularProgresso(emAndamento);
            return `<div class="room-card ongoing">
                <div class="room-header"><span class="room-number">${sala}</span><span class="room-status status-ongoing"><i class="fa-solid fa-circle-play"></i> Em andamento</span></div>
                <div class="room-info"><strong>Paciente:</strong> ${emAndamento.patient}<br><strong>Procedimento:</strong> ${(emAndamento.type||'').substring(0,30)}<br><strong>Médico:</strong> ${getDoctorTitle(emAndamento.doctor)} ${emAndamento.doctor}<br><strong>Início:</strong> ${emAndamento.time||'--:--'}<br><strong>Progresso:</strong> ${progresso}%</div>
                <div class="room-progress"><div class="room-progress-bar" style="width:${progresso}%;"></div></div>
            </div>`;
        } else if (emPreparo) {
            return `<div class="room-card preparing">
                <div class="room-header"><span class="room-number">${sala}</span><span class="room-status status-preparing"><i class="fa-solid fa-hand-holding-medical"></i> Em preparo</span></div>
                <div class="room-info"><strong>Paciente:</strong> ${emPreparo.patient}<br><strong>Procedimento:</strong> ${(emPreparo.type||'').substring(0,30)}<br><strong>Horário previsto:</strong> ${emPreparo.time||'--:--'}</div>
                <div class="room-progress"><div class="room-progress-bar" style="width:20%;background:#7c5cfc;"></div></div>
            </div>`;
        } else if (aguardando) {
            return `<div class="room-card waiting">
                <div class="room-header"><span class="room-number">${sala}</span><span class="room-status status-waiting"><i class="fa-solid fa-hourglass-half"></i> Aguardando</span></div>
                <div class="room-info"><strong>Próxima:</strong> ${aguardando.patient}<br><strong>Procedimento:</strong> ${(aguardando.type||'').substring(0,30)}<br><strong>Horário:</strong> ${aguardando.time||'--:--'}</div>
                <div class="room-progress"><div class="room-progress-bar orange" style="width:10%;"></div></div>
            </div>`;
        } else {
            return `<div class="room-card available">
                <div class="room-header"><span class="room-number">${sala}</span><span class="room-status status-available"><i class="fa-solid fa-circle-check"></i> Disponível</span></div>
                <div class="room-info">Sala livre para agendamento</div>
                <div class="room-progress"><div class="room-progress-bar green" style="width:0%;"></div></div>
            </div>`;
        }
    }).join('');
}

function calcularProgresso(surgery) {
    if (!surgery.time) return 50;
    const agora = new Date();
    const [h, m] = surgery.time.split(':').map(Number);
    const inicio = new Date(TODAY);
    inicio.setHours(h, m, 0, 0);
    const diffMin = Math.floor((agora - inicio) / 60000);
    if (diffMin <= 0) return 5;
    if (diffMin >= 180) return 95;
    return Math.min(95, Math.floor((diffMin / 180) * 100));
}

// ============ PRÓXIMAS CIRURGIAS ============
function updateUpcoming() {
    const proximas = allSurgeries
        .filter(s => s.date === TODAY && ['pendente','em_preparacao','em_andamento','recuperacao'].includes(s.status))
        .sort((a,b) => (a.time||'').localeCompare(b.time||''));
    
    const tbody = document.getElementById('upcomingTableBody');
    if (!tbody) return;
    
    if (!proximas.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma cirurgia pendente</td></tr>';
        return;
    }
    
    tbody.innerHTML = proximas.map(s => `
        <tr>
            <td><strong>${s.time||'--:--'}</strong></td>
            <td>${s.room||'-'}</td>
            <td>${s.patient||'-'}</td>
            <td>${(s.type||'-').substring(0,35)}</td>
            <td>${getDoctorTitle(s.doctor)} ${s.doctor||'-'}</td>
            <td>${s.origem||'-'}</td>
            <td><span class="badge-status ${statusBadgeClass[s.status]||''}">${statusLabels[s.status]||s.status}</span></td>
        </tr>
    `).join('');
}

// ============ CENTRO DE CONTROLE OPERACIONAL ============
function updateResourcesPending() {
    const hoje = allSurgeries.filter(s => s.date === TODAY);
    const recursos = [];
    
    hoje.forEach(s => {
        if (s.necessitaSangue === 'sim') recursos.push({ cirurgia: s.patient, recurso: '<i class="fa-solid fa-droplet"></i> Reserva de Sangue', status: 'Pendente' });
        if (s.necessitaUTI === 'sim') recursos.push({ cirurgia: s.patient, recurso: '<i class="fa-solid fa-bed-pulse"></i> Vaga em UTI', status: 'Pendente' });
        if (!s.room || s.room === 'A Definir') recursos.push({ cirurgia: s.patient, recurso: '<i class="fa-solid fa-hospital"></i> Sala Cirúrgica', status: 'Não definida' });
        if (!s.time) recursos.push({ cirurgia: s.patient, recurso: '⏰ Horário', status: 'Não definido' });
    });
    
    const tbody = document.getElementById('resourcesPendingBody');
    if (!tbody) return;
    
    if (!recursos.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Todos os recursos confirmados <i class="fa-solid fa-circle-check"></i></td></tr>';
        return;
    }
    
    tbody.innerHTML = recursos.map(r => `
        <tr>
            <td><strong>${r.cirurgia}</strong></td>
            <td>${r.recurso}</td>
            <td><span class="badge-status badge-warning">${r.status}</span></td>
        </tr>
    `).join('');
}

// ============ GRÁFICOS (mantendo os existentes) ============
function renderCharts() {
    const ctxHora = document.getElementById('hourlyChart')?.getContext('2d');
    if (ctxHora) {
        if (hourlyChart) hourlyChart.destroy();
        const faixas = ['06-08h','08-10h','10-12h','12-14h','14-16h','16-18h','18-20h','20-22h'];
        const contagemHora = new Array(faixas.length).fill(0);
        allSurgeries.forEach(s => {
            if (!s.time) return;
            const h = parseInt(s.time.split(':')[0], 10);
            if (isNaN(h)) return;
            const idx = Math.floor((h - 6) / 2);
            if (idx >= 0 && idx < faixas.length) contagemHora[idx]++;
        });
        hourlyChart = new Chart(ctxHora, {
            type: 'bar',
            data: { labels: faixas, datasets: [{ data: contagemHora, backgroundColor: '#0fb5b0', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }
    const ctx1 = document.getElementById('specialtyChart')?.getContext('2d');
    if (ctx1) {
        if (specialtyChart) specialtyChart.destroy();
        const specs = {};
        allSurgeries.forEach(s => { if (s.specialty) specs[s.specialty] = (specs[s.specialty]||0)+1; });
        const sorted = Object.entries(specs).sort((a,b) => b[1]-a[1]);
        specialtyChart = new Chart(ctx1, {
            type: 'bar',
            data: { labels: sorted.map(([n])=>n), datasets: [{ data: sorted.map(([,c])=>c), backgroundColor: ['#2f6fed','#2f6fed','#16a34a','#f59e0b','#e5484d','#7c5cfc'], borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
    const ctx2 = document.getElementById('originChart')?.getContext('2d');
    if (ctx2) {
        if (originChart) originChart.destroy();
        const origens = {};
        allSurgeries.forEach(s => { const o = s.origem || 'Não definido'; origens[o] = (origens[o]||0)+1; });
        originChart = new Chart(ctx2, {
            type: 'doughnut',
            data: { labels: Object.keys(origens), datasets: [{ data: Object.values(origens), backgroundColor: ['#2f6fed','#2f6fed','#16a34a','#f59e0b','#e5484d','#7c5cfc'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
        });
    }
    const ctx3 = document.getElementById('monthlyChart')?.getContext('2d');
    if (ctx3) {
        if (monthlyChart) monthlyChart.destroy();
        const meses = [], contagem = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(new Date().getFullYear(), new Date().getMonth()-i, 1);
            const ms = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            meses.push(d.toLocaleDateString('pt-BR',{month:'short',year:'numeric'}));
            contagem.push(allSurgeries.filter(s => s.date?.startsWith(ms)).length);
        }
        monthlyChart = new Chart(ctx3, {
            type: 'bar',
            data: { labels: meses, datasets: [{ data: contagem, backgroundColor: ['#2f6fed','#2f6fed','#16a34a','#f59e0b','#e5484d','#7c5cfc'], borderRadius: 8 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }
    const ctx4 = document.getElementById('cancellationRateChart')?.getContext('2d');
    if (ctx4) {
        if (cancellationRateChart) cancellationRateChart.destroy();
        const dias = [], taxas = [];
        for (let i = 14; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate()-i);
            const ds = d.toISOString().split('T')[0];
            const diaCirurgias = allSurgeries.filter(s => s.date === ds);
            const canceladas = diaCirurgias.filter(s => s.status === 'cancelada').length;
            taxas.push(diaCirurgias.length > 0 ? (canceladas/diaCirurgias.length)*100 : 0);
            dias.push(d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}));
        }
        cancellationRateChart = new Chart(ctx4, {
            type: 'line',
            data: { labels: dias, datasets: [{ data: taxas, borderColor: '#e5484d', backgroundColor: 'rgba(229,72,77,0.1)', fill: true, tension: 0.4, pointRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => v + '%' } } } }
        });
    }
    const ctx5 = document.getElementById('dailyChart')?.getContext('2d');
    if (ctx5) {
        if (dailyChart) dailyChart.destroy();
        const dias = [], cont = [];
        for (let i = 14; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate()-i);
            dias.push(d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}));
            cont.push(allSurgeries.filter(s => s.date === d.toISOString().split('T')[0]).length);
        }
        dailyChart = new Chart(ctx5, {
            type: 'line',
            data: { labels: dias, datasets: [{ data: cont, borderColor: '#2f6fed', backgroundColor: 'rgba(47,111,237,0.15)', fill: true, tension: 0.4, pointRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }
}

// ============ CIRURGIAS ============
function filtrarCirurgias() {
    const search = (document.getElementById('searchSurgery')?.value || '').toLowerCase();
    const status = document.getElementById('filterStatus')?.value || 'all';
    const date = document.getElementById('filterDate')?.value || '';
    let f = allSurgeries;
    if (search) f = f.filter(s => (s.patient||'').toLowerCase().includes(search) || (s.doctor||'').toLowerCase().includes(search));
    if (status !== 'all') f = f.filter(s => s.status === status);
    if (date) f = f.filter(s => s.date === date);
    f.sort((a,b) => (b.date||'').localeCompare(a.date||''));
    
    const tbody = document.getElementById('surgeriesTableBody');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhuma cirurgia</td></tr>'; return; }
    
    tbody.innerHTML = f.map(s => `
        <tr>
            <td>${formatDate(s.date)}</td>
            <td><strong>${s.patient||'-'}</strong></td>
            <td>${s.prontuario||'-'}</td>
            <td>${(s.type||'-').substring(0,35)}</td>
            <td>${getDoctorTitle(s.doctor)} ${s.doctor||'-'}</td>
            <td>${s.room||'-'}</td>
            <td><span class="badge-status ${statusBadgeClass[s.status]||''}">${statusLabels[s.status]||s.status}</span></td>
            <td><button class="btn-sm btn-sm-primary" onclick="editarCirurgia('${s.id}')"><i class="fa-solid fa-pen-to-square"></i></button><button class="btn-sm btn-sm-danger" onclick="excluirCirurgia('${s.id}')"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `).join('');
}

// ============ CANCELADAS ============
function filtrarCanceladas() {
    const search = (document.getElementById('searchCancelled')?.value || '').toLowerCase();
    const date = document.getElementById('filterCancelledDate')?.value || '';
    let f = allSurgeries.filter(s => s.status === 'cancelada');
    if (search) f = f.filter(s => (s.patient||'').toLowerCase().includes(search));
    if (date) f = f.filter(s => s.date === date);
    f.sort((a,b) => (b.date||'').localeCompare(a.date||''));
    
    const tbody = document.getElementById('cancelledTableBody');
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma cirurgia cancelada</td></tr>'; return; }
    
    tbody.innerHTML = f.map(s => `
        <tr>
            <td>${formatDate(s.date)}</td>
            <td><strong>${s.patient||'-'}</strong></td>
            <td>${(s.type||'-').substring(0,35)}</td>
            <td>${getDoctorTitle(s.doctor)} ${s.doctor||'-'}</td>
            <td>${s.cancelReason||'Sem motivo informado'}</td>
        </tr>
    `).join('');
}

// ============ AUDITORIA ============
function updateAuditTable() {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;
    if (!auditLogs.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhuma atividade registrada</td></tr>';
        return;
    }
    auditLogs.sort((a,b) => (b.timestamp||'').localeCompare(a.timestamp||''));
    tbody.innerHTML = auditLogs.slice(0, 20).map(log => `
        <tr>
            <td>${log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : '-'}</td>
            <td>${log.username || '-'}</td>
            <td>${log.action || '-'}</td>
            <td>${log.details || '-'}</td>
        </tr>
    `).join('');
}

// ============ RELATÓRIOS ============
function gerarRelatorio(tipo) {
    let titulo = '', dados = [];
    const today = getToday();
    switch(tipo) {
        case 'hoje': titulo = 'Relatório Diário'; dados = allSurgeries.filter(s => s.date === today); break;
        case 'semana': const { inicioSemana, fimSemana } = getSemanaAtual(); titulo = 'Relatório Semanal'; dados = allSurgeries.filter(s => s.date >= inicioSemana && s.date <= fimSemana); break;
        case 'mes': const { inicioMes, fimMes } = getMesAtual(); titulo = 'Relatório Mensal'; dados = allSurgeries.filter(s => s.date >= inicioMes && s.date <= fimMes); break;
        case 'cancelled': titulo = 'Relatório de Canceladas'; dados = allSurgeries.filter(s => s.status === 'cancelada'); break;
        case 'geral': titulo = 'Relatório Geral'; dados = allSurgeries; break;
    }
    gerarPDF(titulo, dados);
}

function getSemanaAtual() {
    const hoje = new Date();
    const diaSemana = hoje.getDay();
    const segunda = new Date(hoje);
    if (diaSemana === 0) segunda.setDate(hoje.getDate() - 6);
    else segunda.setDate(hoje.getDate() - (diaSemana - 1));
    const domingo = new Date(segunda);
    domingo.setDate(segunda.getDate() + 6);
    return { inicioSemana: segunda.toISOString().split('T')[0], fimSemana: domingo.toISOString().split('T')[0] };
}

function getMesAtual() {
    const hoje = new Date();
    return {
        inicioMes: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0],
        fimMes: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]
    };
}

function gerarPDF(titulo, dados) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    const statusText = {
        pendente: 'Aguardando',
        em_preparacao: 'Em preparo',
        em_andamento: 'Em andamento',
        recuperacao: 'Recuperacao',
        concluida: 'Finalizada',
        suspensa: 'Suspensa',
        cancelada: 'Cancelada'
    };
    const statusOrder = ['pendente', 'em_preparacao', 'em_andamento', 'recuperacao', 'concluida', 'suspensa', 'cancelada'];
    const statusCounts = statusOrder
        .map(status => ({ status, count: dados.filter(s => s.status === status).length }))
        .filter(item => item.count > 0);

    if (hospitalLogo) { try { doc.addImage(hospitalLogo, 'PNG', 14, 8, 22, 22); } catch(e) {} }
    if (govLogo) { try { doc.addImage(govLogo, 'PNG', 40, 8, 22, 22); } catch(e) {} }
    doc.setFillColor(11,35,64);
    doc.rect(0, 0, 297, 8, 'F');
    doc.setFontSize(14); doc.setTextColor(11,35,64); doc.setFont('helvetica','bold');
    doc.text(`${systemName} - Gestão de Centro Cirúrgico`, 148, 16, {align:'center'});
    doc.setFontSize(10); doc.setTextColor(47,111,237); doc.setFont('helvetica','normal');
    doc.text(hospitalName, 148, 22, {align:'center'});
    doc.setFontSize(12); doc.setTextColor(11,35,64); doc.setFont('helvetica','bold');
    doc.text(titulo, 148, 29, {align:'center'});
    doc.setDrawColor(47,111,237); doc.setLineWidth(0.8); doc.line(14, 32, 283, 32);
    doc.setFontSize(8); doc.setTextColor(100,116,139); doc.setFont('helvetica','normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | Total: ${dados.length}`, 14, 37);

    let resumoX = 14;
    statusCounts.forEach(({ status, count }) => {
        const texto = `${statusText[status] || status}: ${count}`;
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        const resumoWidth = Math.max(28, doc.getTextWidth(texto) + 5);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(resumoX, 40, resumoWidth, 7, 1.5, 1.5, 'F');
        doc.setTextColor(51, 65, 85);
        doc.text(texto, resumoX + 2, 44.5);
        resumoX += resumoWidth + 3;
    });
    
    const body = [...dados].sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (a.time||'').localeCompare(b.time||'')).map((s,i)=>[
        i+1, formatDate(s.date), s.time||'-', s.patient||'-', s.age||'-',
        (s.type||'-').replace(/\n/g, ', ').substring(0,40), `${getDoctorTitle(s.doctor)} ${s.doctor||'-'}`,
        s.specialty||'-', s.room||'-', s.origem||'-',
        s.necessitaSangue==='sim'?'Sim':'Não', s.necessitaUTI==='sim'?'Sim':'Não',
        statusText[s.status]||'Não informado', s.cancelReason||'-'
    ]);
    
    doc.autoTable({
        startY: statusCounts.length ? 50 : 42,
        head: [['Nº','Data','Hora','Paciente','Idade','Procedimento','Médico','Especialidade','Sala','Origem','Sangue','UTI','Status','Motivo']],
        body,
        theme: 'grid',
        styles:{fontSize:6.5,cellPadding:1.5,overflow:'linebreak',valign:'middle',lineColor:[226,232,240],lineWidth:0.15},
        headStyles:{fillColor:[11,35,64],textColor:255,fontStyle:'bold',fontSize:6.5,halign:'center'},
        alternateRowStyles:{fillColor:[248,250,252]},
        columnStyles:{
            0:{cellWidth:8,halign:'center'}, 1:{cellWidth:17,halign:'center'}, 2:{cellWidth:11,halign:'center'},
            3:{cellWidth:25}, 4:{cellWidth:8,halign:'center'}, 5:{cellWidth:33}, 6:{cellWidth:29},
            7:{cellWidth:21}, 8:{cellWidth:14,halign:'center'}, 9:{cellWidth:20}, 10:{cellWidth:11,halign:'center'},
            11:{cellWidth:9,halign:'center'}, 12:{cellWidth:20,halign:'center'}, 13:{cellWidth:23}
        },
        didParseCell(data) {
            if (data.section === 'body' && data.column.index === 12) {
                const value = data.cell.raw;
                const colors = { 'Aguardando':[245,158,11], 'Em preparo':[124,92,252], 'Em andamento':[47,111,237], 'Recuperacao':[14,165,164], 'Finalizada':[22,163,74], 'Suspensa':[100,116,139], 'Cancelada':[229,72,77] };
                if (colors[value]) data.cell.styles.textColor = colors[value];
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });
    
    const pages = doc.internal.getNumberOfPages();
    for(let i=1;i<=pages;i++){
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(150,150,150);
        doc.text(`${systemName} - Página ${i}/${pages}`, 148, doc.internal.pageSize.height-8, {align:'center'});
    }
    doc.save(`relatorio_${getToday()}.pdf`);
}

// ============ UTILITÁRIOS ============
function editarCirurgia(id) {
    const s = allSurgeries.find(s => s.id === id);
    if (!s) return;
    setValue('editId', s.id);
    setValue('editPatient', s.patient||'');
    setValue('editType', s.type||'');
    setValue('editDoctor', s.doctor||'');
    setValue('editDate', s.date||'');
    setValue('editTime', s.time||'');
    setValue('editRoom', s.room||'');
    setValue('editStatus', s.status||'pendente');
    setValue('editCancelReason', s.cancelReason||'');
    document.getElementById('editModal')?.classList.add('active');
}

function setValue(id, value) { const el = document.getElementById(id); if (el) el.value = value; }

function excluirCirurgia(id) {
    if (!confirm('EXCLUIR permanentemente?')) return;
    remove(ref(db, `surgeries/${id}`));
}

function fecharModal(id) { document.getElementById(id)?.classList.remove('active'); }
function abrirModal(id) { document.getElementById(id)?.classList.add('active'); }

function updateSelects() {
    const especialidades = [...new Set(allSurgeries.map(s=>s.specialty).filter(Boolean))].sort();
    const origens = [...new Set(allSurgeries.map(s=>s.origem).filter(Boolean))].sort();
    populateSelect('relEspecialidade', especialidades);
    populateSelect('relOrigem', origens);
}

function populateSelect(id, options) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="todas">Todas</option>' + options.map(o=>`<option>${o}</option>`).join('');
}

function gerarRelatorioPersonalizado() {
    const inicio = document.getElementById('customStartDate').value;
    const fim = document.getElementById('customEndDate').value;
    if (!inicio || !fim) { alert('Selecione as datas!'); return; }
    gerarPDF(`Relatório: ${formatDate(inicio)} a ${formatDate(fim)}`, allSurgeries.filter(s => s.date >= inicio && s.date <= fim));
    fecharModal('modalPersonalizado');
}

function gerarRelatorioEspecialidade() {
    const esp = document.getElementById('relEspecialidade').value;
    const inicio = document.getElementById('relEspStartDate').value;
    const fim = document.getElementById('relEspEndDate').value;
    let dados = allSurgeries;
    if (esp !== 'todas') dados = dados.filter(s => s.specialty === esp);
    if (inicio && fim) dados = dados.filter(s => s.date >= inicio && s.date <= fim);
    gerarPDF(`Especialidade: ${esp}`, dados);
    fecharModal('modalEspecialidade');
}

function gerarRelatorioOrigem() {
    const orig = document.getElementById('relOrigem').value;
    const inicio = document.getElementById('relOrigStartDate').value;
    const fim = document.getElementById('relOrigEndDate').value;
    let dados = allSurgeries;
    if (orig !== 'todas') dados = dados.filter(s => s.origem === orig);
    if (inicio && fim) dados = dados.filter(s => s.date >= inicio && s.date <= fim);
    gerarPDF(`Origem: ${orig}`, dados);
    fecharModal('modalOrigem');
}

document.getElementById('editForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const existente = allSurgeries.find(s => s.id === id);
    const statusAnterior = existente?.status;
    const statusNovo = document.getElementById('editStatus').value;

    update(ref(db, `surgeries/${id}`), {
        patient: document.getElementById('editPatient').value.toUpperCase(),
        type: document.getElementById('editType').value.toUpperCase(),
        doctor: document.getElementById('editDoctor').value.toUpperCase(),
        date: document.getElementById('editDate').value,
        time: document.getElementById('editTime').value,
        room: document.getElementById('editRoom').value,
        status: statusNovo,
        cancelReason: document.getElementById('editCancelReason').value || null
    }).then(() => {
        if (statusAnterior && statusAnterior !== statusNovo) {
            set(push(ref(db, 'audit_logs')), {
                timestamp: new Date().toISOString(),
                username: session.name || 'Desconhecido',
                action: 'Alteração de status (edição no dashboard)',
                details: `${document.getElementById('editPatient').value.toUpperCase()} — ${statusLabels[statusAnterior]||statusAnterior} → ${statusLabels[statusNovo]||statusNovo}`
            });
        }
        fecharModal('editModal');
    });
});

// ============ CONFIGURAÇÕES: IDENTIDADE DO SISTEMA (logos + nomes) ============
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function carregarIdentidade() {
    document.getElementById('cfgSystemName').value = systemName;
    document.getElementById('cfgHospitalName').value = hospitalName;
    document.getElementById('cfgLogoSistemaPreview').innerHTML = hospitalLogo
        ? `<img src="${hospitalLogo}" style="height:50px;border-radius:6px;">` : '<span style="font-size:11px;color:var(--text-muted);">Nenhum logo definido</span>';
    document.getElementById('cfgLogoRelatorioPreview').innerHTML = govLogo
        ? `<img src="${govLogo}" style="height:50px;border-radius:6px;">` : '<span style="font-size:11px;color:var(--text-muted);">Nenhum logo definido</span>';

    try {
        const snap = await get(ref(db, 'settings/salaEsperaAtiva'));
        // Ausente no Firebase = considera ativo por padrão (comportamento anterior à existência do controle)
        document.getElementById('cfgSalaEsperaAtiva').checked = snap.val() !== false;
    } catch (e) { console.error(e); }
}

window.salvarStatusSalaEspera = async function() {
    const ativa = document.getElementById('cfgSalaEsperaAtiva').checked;
    try {
        await set(ref(db, 'settings/salaEsperaAtiva'), ativa);
    } catch (err) {
        console.error(err);
        alert('❌ Não foi possível salvar essa configuração.');
        document.getElementById('cfgSalaEsperaAtiva').checked = !ativa;
    }
};

async function salvarIdentidade() {
    const btn = event.target.closest('button');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    try {
        const novoNome = document.getElementById('cfgSystemName').value.trim() || 'ExaGestão';
        const novoHospital = document.getElementById('cfgHospitalName').value.trim();

        await set(ref(db, 'settings/systemName'), novoNome);
        await set(ref(db, 'settings/hospitalName'), novoHospital);
        systemName = novoNome;
        hospitalName = novoHospital;

        const fileSistema = document.getElementById('cfgLogoSistema').files[0];
        if (fileSistema) {
            const base64 = await fileToBase64(fileSistema);
            await set(ref(db, 'settings/logo'), base64);
            hospitalLogo = base64;
        }
        const fileRelatorio = document.getElementById('cfgLogoRelatorio').files[0];
        if (fileRelatorio) {
            const base64 = await fileToBase64(fileRelatorio);
            await set(ref(db, 'settings/govLogo'), base64);
            govLogo = base64;
        }

        document.querySelectorAll('.sidebar-brand-name').forEach(el => el.textContent = systemName);
        document.title = `${systemName} - ${hospitalName}`;
        if (hospitalLogo) document.getElementById('sidebarLogo').innerHTML = `<img src="${hospitalLogo}" alt="Logo">`;
        carregarIdentidade();
        alert('✅ Identidade do sistema atualizada com sucesso.');
    } catch (err) {
        console.error(err);
        alert('❌ Não foi possível salvar a identidade do sistema.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}
window.salvarIdentidade = salvarIdentidade;

// ============ CONFIGURAÇÕES: USUÁRIOS E PERMISSÕES ============
async function carregarUsuarios() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Carregando...</td></tr>';
    try {
        const users = await listUsers();
        if (!users.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum usuário cadastrado</td></tr>'; return; }
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.username}</td>
                <td><span class="badge ${u.role==='admin'?'badge-purple':u.role==='diretor'?'badge-info':'badge-warning'}">${roleLabel(u.role)}</span></td>
                <td><span class="badge ${u.active?'badge-success':'badge-danger'}">${u.active?'Ativo':'Inativo'}</span></td>
                <td class="action-btns">
                    <button class="btn-sm btn-sm-edit" onclick='editarUsuario(${JSON.stringify(u.username)})'><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-sm btn-sm-delete" onclick="excluirUsuario('${u.username}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
        window._usersCache = users;
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Não foi possível carregar os usuários</td></tr>';
    }
}

async function carregarMedicos() {
    const tbody = document.getElementById('doctorsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Carregando...</td></tr>';
    try {
        const snap = await get(ref(db, 'settings/doctors'));
        const doctors = Object.entries(snap.val() || {}).map(([key, doctor]) => ({ ...doctor, _key: key }));
        window._doctorsCache = doctors;
        tbody.innerHTML = doctors.length ? doctors.map(doctor => `
            <tr><td>${doctor.name}</td><td>${doctor.crm}</td><td class="action-btns">
                <button class="btn-sm btn-sm-edit" onclick="editarMedico('${doctor._key}')" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn-sm btn-sm-delete" onclick="excluirMedico('${doctor._key}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td></tr>`).join('') : '<tr><td colspan="3" class="empty-state">Nenhum médico cadastrado</td></tr>';
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Não foi possível carregar os médicos</td></tr>';
    }
}

function abrirModalMedico() {
    document.getElementById('doctorForm').reset();
    document.getElementById('doctorKey').value = '';
    document.getElementById('modalMedicoTitulo').innerHTML = '<i class="fa-solid fa-user-doctor"></i> Cadastrar Médico';
    abrirModal('modalMedico');
}
window.abrirModalMedico = abrirModalMedico;

window.editarMedico = function(key) {
    const doctor = (window._doctorsCache || []).find(item => item._key === key);
    if (!doctor) return;
    document.getElementById('doctorKey').value = key;
    document.getElementById('doctorName').value = doctor.name;
    document.getElementById('doctorCrm').value = doctor.crm;
    document.getElementById('modalMedicoTitulo').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Médico';
    abrirModal('modalMedico');
};

window.excluirMedico = async function(key) {
    if (!confirm('Tem certeza que deseja excluir este médico?')) return;
    try { await remove(ref(db, `settings/doctors/${key}`)); await carregarMedicos(); }
    catch (err) { console.error(err); alert('❌ Não foi possível excluir o médico.'); }
};

document.getElementById('doctorForm')?.addEventListener('submit', async function(event) {
    event.preventDefault();
    const name = document.getElementById('doctorName').value.trim().toUpperCase();
    const crm = document.getElementById('doctorCrm').value.trim().toUpperCase();
    const key = document.getElementById('doctorKey').value;
    if (!name || !crm) return;
    try {
        const doctorRef = key ? ref(db, `settings/doctors/${key}`) : push(ref(db, 'settings/doctors'));
        await set(doctorRef, { name, crm });
        fecharModal('modalMedico');
        await carregarMedicos();
    } catch (err) { console.error(err); alert('❌ Não foi possível salvar o médico.'); }
});

function abrirModalUsuario() {
    document.getElementById('userForm').reset();
    document.getElementById('userOriginalUsername').value = '';
    document.getElementById('userAtivo').checked = true;
    document.getElementById('modalUsuarioTitulo').innerHTML = '<i class="fa-solid fa-user-plus"></i> Novo Usuário';
    document.getElementById('userUsername').disabled = false;
    abrirModal('modalUsuario');
}
window.abrirModalUsuario = abrirModalUsuario;

window.editarUsuario = function(username) {
    const u = (window._usersCache || []).find(x => x.username === username);
    if (!u) return;
    document.getElementById('userOriginalUsername').value = u.username;
    document.getElementById('userNome').value = u.name;
    document.getElementById('userUsername').value = u.username;
    document.getElementById('userUsername').disabled = true;
    document.getElementById('userPassword').value = u.password;
    document.getElementById('userRoleSelect').value = u.role;
    document.getElementById('userAtivo').checked = !!u.active;
    document.getElementById('modalUsuarioTitulo').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Usuário';
    abrirModal('modalUsuario');
};

window.excluirUsuario = async function(username) {
    if (username === session.username) { alert('Você não pode excluir o próprio usuário enquanto estiver logado com ele.'); return; }
    if (!confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) return;
    try {
        await deleteUser(username);
        carregarUsuarios();
    } catch (err) {
        console.error(err);
        alert('❌ Não foi possível excluir o usuário.');
    }
};

document.getElementById('userForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('userUsername').value.trim().toLowerCase();
    const user = {
        name: document.getElementById('userNome').value.trim(),
        username,
        password: document.getElementById('userPassword').value.trim(),
        role: document.getElementById('userRoleSelect').value,
        active: document.getElementById('userAtivo').checked
    };
    if (!username || !user.password) { alert('Preencha usuário e senha.'); return; }
    try {
        await saveUser(user);
        fecharModal('modalUsuario');
        carregarUsuarios();
    } catch (err) {
        console.error(err);
        alert('❌ Não foi possível salvar o usuário.');
    }
});

// ============ PRONTUÁRIOS (ficha completa do paciente — controle interno) ============
let allPatients = [];
onValue(ref(db, 'patients'), (snap) => {
    const data = snap.val() || {};
    allPatients = Object.entries(data).map(([key, p]) => ({ ...p, _key: key }));
    if (document.getElementById('tab-prontuarios')?.classList.contains('active')) buscarPacientes();
});

function pacienteKey(s) {
    return (s.prontuario && s.prontuario.trim()) ? `P_${s.prontuario.trim()}` : `N_${(s.patient||'').trim().toUpperCase()}`;
}
function safeFbKey(key) {
    return key.replace(/[.#$\[\]\/]/g, '_');
}

function buscarPacientes() {
    const termo = (document.getElementById('prontuarioSearch')?.value || '').trim().toUpperCase();
    const resultadosDiv = document.getElementById('prontuarioResultados');
    document.getElementById('prontuarioFicha').style.display = 'none';

    // Base 1: pacientes com ficha própria já cadastrada (Firebase patients/)
    const grupos = {};
    allPatients.forEach(p => {
        const key = safeFbKey(p._key);
        grupos[key] = { patient: p.nome || '-', prontuario: p.prontuario || '', age: p.idade || '', count: 0, key, temFicha: true };
    });

    // Base 2: pacientes que só existem via histórico de cirurgias (ainda sem ficha própria)
    allSurgeries.forEach(s => {
        const key = pacienteKey(s);
        if (!grupos[key]) grupos[key] = { patient: s.patient||'-', prontuario: s.prontuario||'', age: s.age||'', count: 0, key, temFicha: false };
        grupos[key].count++;
    });

    let lista = Object.values(grupos);
    if (termo) lista = lista.filter(p => (p.patient||'').toUpperCase().includes(termo) || (p.prontuario||'').toUpperCase().includes(termo));
    lista.sort((a,b) => a.patient.localeCompare(b.patient));

    if (!termo) { resultadosDiv.innerHTML = '<div class="empty-state">Digite um nome ou número de prontuário para buscar, ou cadastre um novo paciente.</div>'; return; }
    if (!lista.length) { resultadosDiv.innerHTML = '<div class="empty-state">Nenhum paciente encontrado.</div>'; return; }

    resultadosDiv.innerHTML = `<div class="table-card"><table><thead><tr><th>Paciente</th><th>Prontuário</th><th>Idade</th><th>Cirurgias</th><th>Ficha</th><th></th></tr></thead><tbody>` +
        lista.slice(0, 30).map(p => `
            <tr>
                <td>${p.patient}</td>
                <td>${p.prontuario || '—'}</td>
                <td>${p.age ? p.age+' anos' : '—'}</td>
                <td>${p.count}</td>
                <td>${p.temFicha ? '<span class="badge badge-success">Completa</span>' : '<span class="badge badge-gray">Só histórico</span>'}</td>
                <td><button class="btn-sm btn-sm-edit" onclick='abrirFichaPaciente(${JSON.stringify(p.key)})'><i class="fa-solid fa-notes-medical"></i> Ver Ficha</button></td>
            </tr>
        `).join('') + `</tbody></table></div>`;
}
window.buscarPacientes = buscarPacientes;

function calcularIdadeSimples(dataNasc) {
    if (!dataNasc) return '';
    const hoje = new Date(); const nasc = new Date(dataNasc + 'T00:00:00');
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade >= 0 ? idade : '';
}

window.abrirNovoPaciente = function() {
    abrirFichaPaciente(null);
};

window.abrirFichaPaciente = async function(key) {
    const fichaDiv = document.getElementById('prontuarioFicha');
    let dados = {};
    let historico = [];

    if (key) {
        historico = allSurgeries.filter(s => pacienteKey(s) === key).sort((a,b) => (b.date||'').localeCompare(a.date||''));
        try {
            const snap = await get(ref(db, `patients/${safeFbKey(key)}`));
            dados = snap.val() || {};
        } catch (e) { console.error(e); }
        // Se ainda não existe ficha própria, usa os dados básicos vindos do histórico de cirurgias
        if (!dados.nome && historico.length) {
            const s = historico[0];
            dados = { nome: s.patient, prontuario: s.prontuario, dataNascimento: s.birthDate, idade: s.age };
        }
    }

    const isNovo = !key;
    const fichaKey = key || null;

    fichaDiv.style.display = 'block';
    fichaDiv.innerHTML = `
        <div class="card" style="margin-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <h2 style="margin-bottom:2px;"><i class="fa-solid fa-notes-medical"></i> ${isNovo ? 'Novo Paciente' : (dados.nome || '-')}</h2>
                    <p class="subtitle" style="margin-bottom:0;">${isNovo ? 'Cadastro completo para controle interno' : `Prontuário: ${dados.prontuario || '—'} • ${historico.length} cirurgia(s) registrada(s)`}</p>
                </div>
                <button class="btn-topbar" onclick="document.getElementById('prontuarioFicha').style.display='none';"><i class="fa-solid fa-xmark"></i> Fechar</button>
            </div>

            <div class="form-block">
                <div class="form-block-title"><i class="fa-solid fa-user"></i> Dados Pessoais</div>
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label>Nome completo <span class="required">*</span></label>
                        <input type="text" id="fichaNome" value="${dados.nome||''}" placeholder="Nome completo do paciente" ${!isNovo?'':''}>
                    </div>
                    <div class="form-group">
                        <label>Prontuário <span class="required">*</span></label>
                        <input type="text" id="fichaProntuario" value="${dados.prontuario||''}" placeholder="Número do prontuário" ${!isNovo?'disabled':''}>
                    </div>
                    <div class="form-group">
                        <label>Data de Nascimento</label>
                        <input type="date" id="fichaNascimento" value="${dados.dataNascimento||''}" onchange="document.getElementById('fichaIdadeDisplay').value=calcularIdadeSimples(this.value)+' anos'">
                    </div>
                    <div class="form-group">
                        <label>Idade</label>
                        <input type="text" id="fichaIdadeDisplay" value="${dados.dataNascimento?calcularIdadeSimples(dados.dataNascimento)+' anos':(dados.idade?dados.idade+' anos':'')}" disabled>
                    </div>
                    <div class="form-group">
                        <label>Sexo</label>
                        <select id="fichaSexo">
                            <option value="">Não informado</option>
                            <option value="Feminino" ${dados.sexo==='Feminino'?'selected':''}>Feminino</option>
                            <option value="Masculino" ${dados.sexo==='Masculino'?'selected':''}>Masculino</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>CPF</label>
                        <input type="text" id="fichaCpf" value="${dados.cpf||''}" placeholder="000.000.000-00">
                    </div>
                    <div class="form-group">
                        <label>Telefone</label>
                        <input type="text" id="fichaContato" value="${dados.contato||''}" placeholder="(00) 00000-0000">
                    </div>
                    <div class="form-group full-width">
                        <label>Endereço</label>
                        <input type="text" id="fichaEndereco" value="${dados.endereco||''}" placeholder="Rua, número, bairro, cidade">
                    </div>
                </div>
            </div>

            <div class="form-block">
                <div class="form-block-title"><i class="fa-solid fa-notes-medical"></i> Informações Clínicas</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Tipo Sanguíneo</label>
                        <select id="fichaTipoSanguineo">
                            <option value="">Não informado</option>
                            ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => `<option value="${t}" ${dados.tipoSanguineo===t?'selected':''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label>Alergias</label>
                        <input type="text" id="fichaAlergias" value="${dados.alergias||''}" placeholder="Ex: dipirona, látex...">
                    </div>
                    <div class="form-group full-width">
                        <label>Comorbidades / Observações gerais</label>
                        <textarea id="fichaObservacoes" placeholder="Comorbidades, condições relevantes, medicações em uso...">${dados.observacoes||''}</textarea>
                    </div>
                </div>
            </div>

            <div class="form-block">
                <div class="form-block-title"><i class="fa-solid fa-phone"></i> Contato de Emergência</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Nome</label>
                        <input type="text" id="fichaEmergenciaNome" value="${dados.emergenciaNome||''}" placeholder="Nome do contato">
                    </div>
                    <div class="form-group">
                        <label>Telefone</label>
                        <input type="text" id="fichaEmergenciaTelefone" value="${dados.emergenciaTelefone||''}" placeholder="(00) 00000-0000">
                    </div>
                </div>
            </div>

            <button class="btn btn-primary btn-compact" onclick="salvarFichaPaciente(${fichaKey?`'${fichaKey}'`:'null'})"><i class="fa-solid fa-floppy-disk"></i> Salvar Ficha</button>

            ${historico.length ? `
            <h3 style="margin-top:22px;"><i class="fa-solid fa-clock-rotate-left"></i> Histórico de Cirurgias</h3>
            <div class="table-card" style="margin-top:8px;">
                <table>
                    <thead><tr><th>Data</th><th>Código</th><th>Procedimento</th><th>Médico</th><th>Status</th></tr></thead>
                    <tbody>
                        ${historico.map(s => `
                            <tr>
                                <td>${formatDate(s.date)}</td>
                                <td>${s.code||'—'}</td>
                                <td>${(s.type||'-').substring(0,50)}</td>
                                <td>${s.doctor||'-'}</td>
                                <td><span class="badge ${statusBadgeClass[s.status]||'badge-gray'}">${statusLabels[s.status]||s.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>` : ''}
        </div>
    `;
    fichaDiv.scrollIntoView({ behavior: 'smooth' });
};
window.calcularIdadeSimples = calcularIdadeSimples;

window.salvarFichaPaciente = async function(key) {
    const nome = document.getElementById('fichaNome').value.trim();
    const prontuario = document.getElementById('fichaProntuario').value.trim();

    if (!nome || !prontuario) {
        alert('⚠️ Nome completo e número de prontuário são obrigatórios.');
        return;
    }

    const dataNascimento = document.getElementById('fichaNascimento').value;
    const dados = {
        nome: nome.toUpperCase(),
        prontuario,
        dataNascimento,
        idade: dataNascimento ? calcularIdadeSimples(dataNascimento) : '',
        sexo: document.getElementById('fichaSexo').value,
        cpf: document.getElementById('fichaCpf').value.trim(),
        contato: document.getElementById('fichaContato').value.trim(),
        endereco: document.getElementById('fichaEndereco').value.trim(),
        tipoSanguineo: document.getElementById('fichaTipoSanguineo').value,
        alergias: document.getElementById('fichaAlergias').value.trim(),
        observacoes: document.getElementById('fichaObservacoes').value.trim(),
        emergenciaNome: document.getElementById('fichaEmergenciaNome').value.trim(),
        emergenciaTelefone: document.getElementById('fichaEmergenciaTelefone').value.trim(),
        atualizadoEm: new Date().toISOString(),
        atualizadoPor: session.name
    };

    // Para paciente novo, a chave é derivada do prontuário informado agora.
    const fbKey = key ? safeFbKey(key) : safeFbKey(`P_${prontuario}`);

    try {
        await set(ref(db, `patients/${fbKey}`), dados);
        alert('✅ Ficha do paciente salva com sucesso.');
        buscarPacientes();
        abrirFichaPaciente(key || `P_${prontuario}`);
    } catch (err) {
        console.error(err);
        alert('❌ Não foi possível salvar a ficha do paciente.');
    }
};

console.log('Dashboard carregado!');
console.log('🎯 Centro de Controle Operacional ativo!');