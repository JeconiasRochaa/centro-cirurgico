// ============ js/painel_tv.js ============
import { db, ref, onValue } from './firebase.js';
import { getToday, getDoctorTitle, statusLabels } from './utils.js';

let TODAY = getToday();
let currentSurgeries = [];

function updateClock() {
    const n = new Date();
    document.getElementById('liveTime').textContent = n.toLocaleTimeString('pt-BR');
    document.getElementById('updateTime').textContent = n.toLocaleTimeString('pt-BR');
}

function updatePanel() {
    const today = currentSurgeries.filter(s => s.date === TODAY);
    
    document.getElementById('waiting').textContent = String(today.filter(s => s.status === 'pendente').length).padStart(2,'0');
    document.getElementById('inProgress').textContent = String(today.filter(s => s.status === 'em_andamento').length).padStart(2,'0');
    document.getElementById('completed').textContent = String(today.filter(s => s.status === 'concluida').length).padStart(2,'0');
    document.getElementById('withBlood').textContent = String(today.filter(s => s.necessitaSangue === 'sim').length).padStart(2,'0');
    document.getElementById('withUTI').textContent = String(today.filter(s => s.necessitaUTI === 'sim').length).padStart(2,'0');

    const tbody = document.getElementById('surgeriesTableBody');
    if (!today.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">📅 Nenhuma cirurgia hoje</td></tr>';
        return;
    }

    const order = { 'em_andamento':1, 'pendente':2, 'concluida':3, 'cancelada':4 };
    const sorted = today.sort((a,b) => (order[a.status]||5) - (order[b.status]||5) || (a.time||'').localeCompare(b.time||''));

    tbody.innerHTML = sorted.map(s => {
        let rowClass = '', badgeClass = '', badgeText = '';
        if (s.status === 'em_andamento') { rowClass = 'row-ongoing'; badgeClass = 'badge-progress'; badgeText = '⚙️ Em Andamento'; }
        else if (s.status === 'pendente') { badgeClass = 'badge-waiting'; badgeText = '⏳ Aguardando'; }
        else if (s.status === 'concluida') { badgeClass = 'badge-done'; badgeText = '✅ Finalizado'; }
        else { badgeClass = 'badge-done'; badgeText = '❌ Cancelada'; }

        const dTitle = getDoctorTitle(s.doctor);
        const aTitle = getDoctorTitle(s.anesthetist);

        return `<tr class="${rowClass}">
            <td><strong>${s.room||'-'}</strong></td>
            <td><strong>${s.patient||'-'}</strong></td>
            <td>${(s.type||'-').replace(/\n/g,'<br>')}</td>
            <td>${dTitle} ${s.doctor||'-'}</td>
            <td>${s.necessitaSangue==='sim'?'<span class="indicator yes">🩸</span>':'✅'}</td>
            <td>${s.necessitaUTI==='sim'?'<span class="indicator yes">🏨</span>':'✅'}</td>
            <td><strong>${s.time||'--:--'}</strong></td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        </tr>`;
    }).join('');
}

// Firebase Listener
onValue(ref(db, 'surgeries'), (snap) => {
    currentSurgeries = snap.val() ? Object.values(snap.val()) : [];
    updatePanel();
});

// Logos
onValue(ref(db, 'settings/logo'), (snap) => {
    if (snap.val()) document.getElementById('logoContainer').innerHTML = `<img src="${snap.val()}" alt="Logo">`;
});
onValue(ref(db, 'settings/govLogo'), (snap) => {
    if (snap.val()) document.getElementById('govLogoContainer').innerHTML = `<img src="${snap.val()}" alt="Logo">`;
});

// Relógio
updateClock();
setInterval(updateClock, 1000);
setInterval(() => {
    const nt = getToday();
    if (nt !== TODAY) { TODAY = nt; updatePanel(); }
}, 5000);

console.log('🚀 Painel TV carregado!');