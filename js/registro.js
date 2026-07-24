// ============ js/registro.js ============
import { db, ref, onValue, set, push, update, remove } from './firebase.js';
import { requireAuth, logout } from './auth.js';
import { getToday, calculateAge } from './utils.js';

const session = requireAuth(['centro_cirurgico', 'administracao']);
if (!session) throw new Error('Acesso negado');

document.getElementById('userInfo').textContent = '👤 ' + session.name;
window.logout = logout;

// Tema
const savedTheme = localStorage.getItem('hrpi_theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
window.toggleTheme = function() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('hrpi_theme', next);
};

// Logos
onValue(ref(db, 'settings/logo'), (snap) => {
    if (snap.val()) document.getElementById('logoHRPI').innerHTML = `<img src="${snap.val()}" alt="HRPI">`;
});
onValue(ref(db, 'settings/govLogo'), (snap) => {
    if (snap.val()) document.getElementById('logoGov').innerHTML = `<img src="${snap.val()}" alt="Governo">`;
});

let allSurgeries = [];
let abaAtual = 'hoje';
let procedimentosSelecionados = [];

document.getElementById('surgeryDate').value = getToday();

// Firebase Listener
onValue(ref(db, 'surgeries'), (snap) => {
    allSurgeries = snap.val() ? Object.values(snap.val()) : [];
    atualizarLista();
});

// Procedimentos
const PROCEDIMENTOS = [
    {codigo:"APEN-01", nome:"APENDICECTOMIA", especialidade:"Cirurgia Geral"},
    {codigo:"COLE-01", nome:"COLECISTECTOMIA", especialidade:"Cirurgia Geral"},
    {codigo:"COLE-02", nome:"COLECISTECTOMIA VIDEOLAPAROSCÓPICA", especialidade:"Cirurgia Geral"},
    {codigo:"HERN-01", nome:"HERNIOPLASTIA INGUINAL", especialidade:"Cirurgia Geral"},
    {codigo:"CESA-01", nome:"CESARIANA", especialidade:"Obstetrícia"},
    {codigo:"HIST-01", nome:"HISTERECTOMIA TOTAL", especialidade:"Ginecologia"},
    {codigo:"ARTJ-01", nome:"ARTROPLASTIA DE JOELHO", especialidade:"Ortopedia"},
    {codigo:"FACE-01", nome:"FACECTOMIA", especialidade:"Oftalmologia"},
    {codigo:"AMIG-01", nome:"AMIGDALECTOMIA", especialidade:"Otorrinolaringologia"},
    {codigo:"PROS-01", nome:"PROSTATECTOMIA", especialidade:"Urologia"}
];

// Autocomplete
const procInput = document.getElementById('surgeryTypeInput');
const suggestionsBox = document.getElementById('suggestionsBox');
const surgeryTypeHidden = document.getElementById('surgeryType');

if (procInput) {
    procInput.addEventListener('input', function() {
        const valor = this.value.trim().toUpperCase();
        if (valor.length < 2) { suggestionsBox.classList.remove('show'); return; }
        const sugestoes = PROCEDIMENTOS.filter(p => 
            (p.nome.includes(valor) || p.codigo.includes(valor)) && 
            !procedimentosSelecionados.find(ps => ps.codigo === p.codigo)
        );
        if (sugestoes.length > 0) {
            suggestionsBox.innerHTML = sugestoes.map(p => `
                <div class="suggestion-item" onclick="window.adicionarProc('${p.nome}', '${p.especialidade}', '${p.codigo}')">
                    <span style="color:var(--green);font-weight:bold;">➕</span>
                    <div><strong>${p.codigo}</strong> - ${p.nome}</div>
                </div>
            `).join('');
            suggestionsBox.classList.add('show');
        } else {
            suggestionsBox.classList.remove('show');
        }
    });
}

window.adicionarProc = function(nome, especialidade, codigo) {
    procedimentosSelecionados.push({ nome, especialidade, codigo });
    atualizarProcVisuais();
    procInput.value = '';
    suggestionsBox.classList.remove('show');
    procInput.focus();
};

window.removerProc = function(codigo) {
    procedimentosSelecionados = procedimentosSelecionados.filter(p => p.codigo !== codigo);
    atualizarProcVisuais();
};

function atualizarProcVisuais() {
    const selectedDiv = document.getElementById('selectedProcedures');
    const list = document.getElementById('proceduresList');
    if (procedimentosSelecionados.length === 0) {
        selectedDiv.style.display = 'none';
        list.innerHTML = '';
        surgeryTypeHidden.value = '';
    } else {
        selectedDiv.style.display = 'block';
        list.innerHTML = procedimentosSelecionados.map(p => `
            <span class="procedure-tag">
                <strong>${p.codigo}</strong> - ${p.nome}
                <span class="remove-tag" onclick="window.removerProc('${p.codigo}')">✕</span>
            </span>
        `).join('');
        surgeryTypeHidden.value = procedimentosSelecionados.map(p => `${p.codigo} - ${p.nome}`).join('\n');
        if (procedimentosSelecionados.length === 1) {
            document.getElementById('specialty').value = procedimentosSelecionados[0].especialidade;
        }
    }
}

document.addEventListener('click', (e) => {
    if (!procInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.classList.remove('show');
    }
});

window.calcularIdade = function() {
    const bd = document.getElementById('birthDate').value;
    if (!bd) { document.getElementById('age').value = ''; return; }
    document.getElementById('age').value = calculateAge(bd);
};

// CRUD
document.getElementById('surgeryForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (surgeryTypeHidden.value.trim() === '') { alert('⚠️ Adicione pelo menos um procedimento!'); return; }
    
    const surgery = {
        id: document.getElementById('editId').value || push(ref(db, 'surgeries')).key,
        origem: document.getElementById('origem').value,
        patient: document.getElementById('patient').value.trim().toUpperCase(),
        prontuario: document.getElementById('prontuario').value.trim(),
        birthDate: document.getElementById('birthDate').value,
        age: document.getElementById('age').value,
        type: surgeryTypeHidden.value,
        date: document.getElementById('surgeryDate').value,
        time: document.getElementById('surgeryTime').value,
        specialty: document.getElementById('specialty').value,
        doctor: document.getElementById('doctor').value.trim().toUpperCase(),
        anesthetist: document.getElementById('anesthetist').value.trim().toUpperCase(),
        circulante: document.getElementById('circulante').value.trim().toUpperCase(),
        room: document.getElementById('room').value,
        necessitaSangue: document.getElementById('necessitaSangue').value,
        necessitaUTI: document.getElementById('necessitaUTI').value,
        status: 'pendente'
    };

    set(ref(db, `surgeries/${surgery.id}`), surgery).then(() => {
        limparFormulario();
        cancelarEdicao();
        alert('✅ Cirurgia salva!');
    });
});

window.editarCirurgia = function(id) {
    const s = allSurgeries.find(s => s.id === id);
    if (!s) return;
    document.getElementById('editId').value = s.id;
    document.getElementById('origem').value = s.origem || '';
    document.getElementById('patient').value = s.patient || '';
    document.getElementById('prontuario').value = s.prontuario || '';
    document.getElementById('birthDate').value = s.birthDate || '';
    document.getElementById('age').value = s.age || '';
    document.getElementById('surgeryDate').value = s.date || '';
    document.getElementById('surgeryTime').value = s.time || '';
    document.getElementById('specialty').value = s.specialty || '';
    document.getElementById('doctor').value = s.doctor || '';
    document.getElementById('anesthetist').value = s.anesthetist || '';
    document.getElementById('circulante').value = s.circulante || '';
    document.getElementById('room').value = s.room || '';
    document.getElementById('necessitaSangue').value = s.necessitaSangue || 'nao';
    document.getElementById('necessitaUTI').value = s.necessitaUTI || 'nao';
    
    procedimentosSelecionados = [];
    if (s.type) {
        s.type.split('\n').forEach(linha => {
            const match = linha.match(/^([A-Z0-9-]+)\s*-\s*(.+)$/);
            if (match) {
                procedimentosSelecionados.push({ codigo: match[1], nome: match[2].trim(), especialidade: s.specialty || '' });
            }
        });
    }
    atualizarProcVisuais();
    
    document.getElementById('formTitle').textContent = '✏️ Editar Cirurgia';
    document.getElementById('submitBtn').textContent = '💾 Salvar Alterações';
    document.getElementById('cancelEditBtn').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.cancelarEdicao = function() {
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').textContent = 'Nova Cirurgia';
    document.getElementById('submitBtn').textContent = '✅ Registrar Cirurgia';
    document.getElementById('cancelEditBtn').style.display = 'none';
    limparFormulario();
};

window.limparFormulario = function() {
    document.getElementById('surgeryForm').reset();
    document.getElementById('surgeryDate').value = getToday();
    document.getElementById('age').value = '';
    document.getElementById('editId').value = '';
    document.getElementById('surgeryTypeInput').value = '';
    surgeryTypeHidden.value = '';
    procedimentosSelecionados = [];
    atualizarProcVisuais();
    suggestionsBox.classList.remove('show');
};

window.iniciarCirurgia = (id) => update(ref(db, `surgeries/${id}`), { status: 'em_andamento' });
window.finalizarCirurgia = (id) => update(ref(db, `surgeries/${id}`), { status: 'concluida' });

window.cancelarCirurgia = (id) => {
    const motivo = prompt('📝 Motivo do cancelamento:');
    if (motivo) update(ref(db, `surgeries/${id}`), { status: 'cancelada', cancelReason: motivo });
};

window.excluirCirurgia = (id) => {
    if (confirm('⚠️ EXCLUIR permanentemente?')) remove(ref(db, `surgeries/${id}`));
};

window.mudarAba = function(aba) {
    abaAtual = aba;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    atualizarLista();
};

function atualizarLista() {
    const list = document.getElementById('surgeryList');
    const today = getToday();
    let cirurgias;
    if (abaAtual === 'hoje') cirurgias = allSurgeries.filter(s => s.date === today);
    else if (abaAtual === 'futuras') cirurgias = allSurgeries.filter(s => s.date > today);
    else cirurgias = allSurgeries;
    cirurgias.sort((a,b) => (b.date||'').localeCompare(a.date||'') || (a.time||'').localeCompare(b.time||''));

    if (!cirurgias.length) { list.innerHTML = '<div class="empty-state">📭 Nenhuma cirurgia</div>'; return; }

    list.innerHTML = cirurgias.map(s => {
        let cls = 'pending', badgeCls = 'waiting', badgeText = '⏳ Aguardando';
        if (s.status === 'em_andamento') { cls = 'ongoing'; badgeCls = 'progress'; badgeText = '⚙️ Em Andamento'; }
        else if (s.status === 'concluida') { cls = 'completed'; badgeCls = 'done'; badgeText = '✅ Finalizada'; }
        else if (s.status === 'cancelada') { cls = 'cancelled'; badgeCls = 'cancelled'; badgeText = '❌ Cancelada'; }

        return `<div class="surgery-item ${cls}">
            <div class="surgery-header">
                <span class="surgery-patient">${s.patient||'-'} ${s.age?`(${s.age}a)`:''}</span>
                <span class="surgery-badge ${badgeCls}">${badgeText}</span>
            </div>
            <div class="surgery-info">
                <strong>🔪</strong> ${(s.type||'-').replace(/\n/g,'<br>🔪 ')}<br>
                <strong>📅</strong> ${s.date||'-'} | <strong>⏰</strong> ${s.time||'--:--'} | <strong>🏥</strong> ${s.room||'-'}<br>
                <strong>👨‍⚕️</strong> ${s.doctor||'-'} | <strong>💉</strong> ${s.anesthetist||'-'}<br>
                <strong>🩸</strong> ${s.necessitaSangue==='sim'?'Sim':'Não'} | <strong>🏨</strong> ${s.necessitaUTI==='sim'?'Sim':'Não'}
            </div>
            ${s.status==='cancelada'&&s.cancelReason?`<div class="cancel-reason">📝 ${s.cancelReason}</div>`:''}
            <div class="action-btns">
                ${s.status==='pendente'?`<button class="btn-sm btn-sm-start" onclick="iniciarCirurgia('${s.id}')">▶ Iniciar</button>`:''}
                ${s.status==='em_andamento'?`<button class="btn-sm btn-sm-finish" onclick="finalizarCirurgia('${s.id}')">⏹ Finalizar</button>`:''}
                ${s.status==='pendente'?`<button class="btn-sm btn-sm-cancel-btn" onclick="cancelarCirurgia('${s.id}')">❌ Cancelar</button>`:''}
                <button class="btn-sm btn-sm-edit" onclick="editarCirurgia('${s.id}')">✏️</button>
                <button class="btn-sm btn-sm-delete" onclick="excluirCirurgia('${s.id}')">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

atualizarLista();
console.log('🚀 Registro de Cirurgias carregado!');