// ============ js/painel_tv.js ============
import { db, ref, onValue } from './firebase.js';
import { getToday, getDoctorTitle } from './utils.js';

let TODAY = getToday();
let currentSurgeries = [];

// ============ RELÓGIO ============
function updateClock() {
    const n = new Date();
    const liveTime = document.getElementById('liveTime');
    const updateTime = document.getElementById('updateTime');
    if (liveTime) liveTime.textContent = n.toLocaleTimeString('pt-BR');
    if (updateTime) updateTime.textContent = n.toLocaleTimeString('pt-BR');
}

// ============ PAINEL PRINCIPAL ============
function updatePanel() {
    const today = currentSurgeries.filter(s => s.date === TODAY);
    
    setText('waiting', String(today.filter(s => s.status === 'pendente').length).padStart(2,'0'));
    setText('inProgress', String(today.filter(s => s.status === 'em_andamento').length).padStart(2,'0'));
    setText('completed', String(today.filter(s => s.status === 'concluida').length).padStart(2,'0'));
    setText('withBlood', String(today.filter(s => s.necessitaSangue === 'sim' || s.necessitaSangue === 'talvez').length).padStart(2,'0'));
    setText('withUTI', String(today.filter(s => s.necessitaUTI === 'sim' || s.necessitaUTI === 'talvez').length).padStart(2,'0'));

    const tbody = document.getElementById('surgeriesTableBody');
    if (!tbody) return;

    if (!today.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">📅 Nenhuma cirurgia hoje</td></tr>';
    } else {
        const order = { 'em_andamento': 1, 'pendente': 2, 'concluida': 3, 'cancelada': 4 };
        const sorted = today.sort((a,b) => (order[a.status]||5) - (order[b.status]||5) || (a.time||'').localeCompare(b.time||''));

        tbody.innerHTML = sorted.map(s => {
            let rowClass = '', badgeClass = '', badgeText = '';
            if (s.status === 'em_andamento') { rowClass = 'row-ongoing'; badgeClass = 'badge-progress'; badgeText = '⚙️ Em Andamento'; }
            else if (s.status === 'pendente') { badgeClass = 'badge-waiting'; badgeText = '⏳ Aguardando'; }
            else if (s.status === 'concluida') { badgeClass = 'badge-done'; badgeText = '✅ Finalizado'; }
            else { badgeClass = 'badge-done'; badgeText = '❌ Cancelada'; }

            const sangueIcon = s.necessitaSangue === 'sim' ? '🩸' : s.necessitaSangue === 'talvez' ? '⚠️' : '✅';
            const utiIcon = s.necessitaUTI === 'sim' ? '🏨' : s.necessitaUTI === 'talvez' ? '⚠️' : '✅';

            const dTitle = getDoctorTitle(s.doctor);
            const aTitle = getDoctorTitle(s.anesthetist);

            return `<tr class="${rowClass}">
                <td><strong>${s.room||'-'}</strong></td>
                <td><strong>${s.patient||'-'}</strong></td>
                <td>${(s.type||'-').replace(/\n/g,'<br>')}</td>
                <td>${dTitle} ${s.doctor||'-'}</td>
                <td>${sangueIcon}</td>
                <td>${utiIcon}</td>
                <td><strong>${s.time||'--:--'}</strong></td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            </tr>`;
        }).join('');
    }

    updateAgendados();
    setText('updateTime', `Atualizado: ${new Date().toLocaleTimeString('pt-BR')}`);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ============ BARRA DE AGENDADOS ============
function updateAgendados() {
    const agendadas = currentSurgeries.filter(s => 
        s.date > TODAY && s.status !== 'cancelada'
    ).sort((a, b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''));
    
    const bar = document.getElementById('agendadosBar');
    const text = document.getElementById('agendadosText');
    if (!bar || !text) return;
    
    if (agendadas.length > 0) {
        bar.style.display = 'flex';
        const proxima = agendadas[0];
        const dataProx = new Date(proxima.date + 'T00:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short'});
        text.textContent = `${agendadas.length} cirurgia(s) agendada(s) | Próxima: ${dataProx} - ${proxima.patient} (${proxima.time||'a definir'})`;
    } else {
        bar.style.display = 'none';
    }
}

// ============ LISTENERS FIREBASE ============
onValue(ref(db, 'surgeries'), (snap) => {
    currentSurgeries = snap.val() ? Object.values(snap.val()) : [];
    updatePanel();
});

onValue(ref(db, 'settings/logo'), (snap) => {
    if (snap.val()) {
        const logoEl = document.getElementById('logoContainer');
        if (logoEl) logoEl.innerHTML = `<img src="${snap.val()}" alt="Logo HRPI">`;
    }
});

onValue(ref(db, 'settings/govLogo'), (snap) => {
    if (snap.val()) {
        const govEl = document.getElementById('govLogoContainer');
        if (govEl) govEl.innerHTML = `<img src="${snap.val()}" alt="Logo Governo">`;
    }
});

// ============ INICIALIZAÇÃO ============
updateClock();
setInterval(updateClock, 1000);
setInterval(() => {
    const nt = getToday();
    if (nt !== TODAY) { TODAY = nt; updatePanel(); }
}, 5000);

console.log('🚀 Painel TV carregado!');