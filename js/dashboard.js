// ============ js/dashboard.js ============
import { db, ref, onValue, update, remove } from './firebase.js';
import { requireAuth, logout } from './auth.js';
import { getToday, formatDate, getDoctorTitle, statusLabels, statusBadgeClass } from './utils.js';

// Verificar acesso
const session = requireAuth(['administracao']);
if (!session) throw new Error('Acesso negado');

// Variáveis
let allSurgeries = [];
const TODAY = getToday();
let specialtyChart, originChart, monthlyChart, dailyChart;

// Logos (carregadas do Firebase)
let hospitalLogo = null;
let govLogo = null;

// Expor funções globalmente
window.logout = logout;
window.switchTab = switchTab;
window.filtrarCirurgias = filtrarCirurgias;
window.editarCirurgia = editarCirurgia;
window.excluirCirurgia = excluirCirurgia;
window.fecharModal = fecharModal;
window.abrirModal = abrirModal;
window.toggleTheme = toggleTheme;
window.gerarRelatorio = gerarRelatorio;
window.gerarRelatorioPersonalizado = gerarRelatorioPersonalizado;
window.gerarRelatorioEspecialidade = gerarRelatorioEspecialidade;
window.gerarRelatorioOrigem = gerarRelatorioOrigem;

// ============ INICIALIZAÇÃO ============
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userInfo').textContent = '👤 ' + session.name;
    
    const savedTheme = localStorage.getItem('hrpi_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    onValue(ref(db, 'surgeries'), (snap) => {
        allSurgeries = snap.val() ? Object.values(snap.val()) : [];
        updateAll();
    });
    
    loadLogos();
});

// ============ CARREGAR LOGOS (APENAS UMA VEZ) ============
async function loadLogos() {
    try {
        const { get } = await import('./firebase.js');
        
        // Logo do hospital
        const logoSnap = await get(ref(db, 'settings/logo'));
        if (logoSnap.val()) {
            hospitalLogo = logoSnap.val();
            const logoEl = document.getElementById('logoHRPI');
            if (logoEl) logoEl.innerHTML = `<img src="${hospitalLogo}" alt="HRPI">`;
        }
        
        // Logo do governo
        const govSnap = await get(ref(db, 'settings/govLogo'));
        if (govSnap.val()) {
            govLogo = govSnap.val();
            const govEl = document.getElementById('logoGov');
            if (govEl) govEl.innerHTML = `<img src="${govLogo}" alt="Governo">`;
        }
        
        console.log('✅ Logos carregados:', hospitalLogo ? 'HRPI ✅' : 'HRPI ❌', govLogo ? 'Governo ✅' : 'Governo ❌');
    } catch(e) {
        console.log('⚠️ Logos não carregados:', e.message);
    }
}

// ============ TEMA ============
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('hrpi_theme', next);
}

// ============ ATUALIZAÇÃO ============
function updateAll() {
    updateKPIs();
    renderCharts();
    filtrarCirurgias();
    updateSelects();
}

function switchTab(tab) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const tabEl = document.querySelector(`[onclick="switchTab('${tab}')"]`);
    if (tabEl) tabEl.classList.add('active');
    const content = document.getElementById(`tab-${tab}`);
    if (content) content.classList.add('active');
    if (tab === 'overview') renderCharts();
}

// ============ KPIs ============
function updateKPIs() {
    const hoje = allSurgeries.filter(s => s.date === TODAY);
    const agendadas = allSurgeries.filter(s => s.date > TODAY && s.status !== 'cancelada');
    
    setText('kpToday', hoje.length);
    setText('kpWaiting', hoje.filter(s => s.status === 'pendente').length);
    setText('kpProgress', hoje.filter(s => s.status === 'em_andamento').length);
    setText('kpFinished', hoje.filter(s => s.status === 'concluida').length);
    setText('kpCancelled', hoje.filter(s => s.status === 'cancelada').length);
    setText('kpScheduled', agendadas.length);
    setText('kpTotal', allSurgeries.length);
}

function setText(id, value) { 
    const el = document.getElementById(id); 
    if (el) el.textContent = value; 
}

// ============ GRÁFICOS ============
function renderCharts() {
    // Especialidade
    const ctx1 = document.getElementById('specialtyChart')?.getContext('2d');
    if (ctx1) {
        if (specialtyChart) specialtyChart.destroy();
        const specs = {};
        allSurgeries.forEach(s => { if (s.specialty) specs[s.specialty] = (specs[s.specialty]||0)+1; });
        const sorted = Object.entries(specs).sort((a,b) => b[1]-a[1]);
        specialtyChart = new Chart(ctx1, {
            type: 'bar',
            data: { labels: sorted.map(([n])=>n), datasets: [{ data: sorted.map(([,c])=>c), backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'], borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Origem
    const ctx2 = document.getElementById('originChart')?.getContext('2d');
    if (ctx2) {
        if (originChart) originChart.destroy();
        const origens = {};
        allSurgeries.forEach(s => { const o = s.origem || 'Não definido'; origens[o] = (origens[o]||0)+1; });
        originChart = new Chart(ctx2, {
            type: 'doughnut',
            data: { labels: Object.keys(origens), datasets: [{ data: Object.values(origens), backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
        });
    }

    // Mensal
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
            data: { labels: meses, datasets: [{ data: contagem, backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'], borderRadius: 8 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    // Diário
    const ctx4 = document.getElementById('dailyChart')?.getContext('2d');
    if (ctx4) {
        if (dailyChart) dailyChart.destroy();
        const dias = [], cont = [];
        for (let i = 14; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate()-i);
            dias.push(d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}));
            cont.push(allSurgeries.filter(s => s.date === d.toISOString().split('T')[0]).length);
        }
        dailyChart = new Chart(ctx4, {
            type: 'line',
            data: { labels: dias, datasets: [{ data: cont, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4, pointRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }
}

// ============ TABELA DE CIRURGIAS ============
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
    if (!f.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Nenhuma cirurgia</td></tr>'; return; }

    tbody.innerHTML = f.map(s => `
        <tr>
            <td>${formatDate(s.date)} ${s.date===TODAY?'🏥':s.date>TODAY?'📆':''}</td>
            <td><strong>${s.patient||'-'}</strong>${s.age?` (${s.age})`:''}</td>
            <td>${(s.type||'-').substring(0,35)}</td>
            <td>${getDoctorTitle(s.doctor)} ${s.doctor||'-'}</td>
            <td>${s.room||'-'}</td>
            <td>${s.necessitaSangue==='sim'?'🩸':'✅'}</td>
            <td>${s.necessitaUTI==='sim'?'🏨':'✅'}</td>
            <td><span class="badge-status ${statusBadgeClass[s.status]||''}">${statusLabels[s.status]||s.status}</span>${s.status==='cancelada'&&s.cancelReason?`<br><span class="cancel-reason">📝 ${s.cancelReason}</span>`:''}</td>
            <td><button class="btn-sm btn-sm-primary" onclick="editarCirurgia('${s.id}')">✏️</button><button class="btn-sm btn-sm-danger" onclick="excluirCirurgia('${s.id}')">🗑️</button></td>
        </tr>
    `).join('');
}

// ============ EDITAR/EXCLUIR ============
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

// Formulário de edição
document.getElementById('editForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    update(ref(db, `surgeries/${document.getElementById('editId').value}`), {
        patient: document.getElementById('editPatient').value.toUpperCase(),
        type: document.getElementById('editType').value.toUpperCase(),
        doctor: document.getElementById('editDoctor').value.toUpperCase(),
        date: document.getElementById('editDate').value,
        time: document.getElementById('editTime').value,
        room: document.getElementById('editRoom').value,
        status: document.getElementById('editStatus').value,
        cancelReason: document.getElementById('editCancelReason').value || null
    }).then(() => fecharModal('editModal'));
});

// ============ SELECTS DOS RELATÓRIOS ============
function updateSelects() {
    const especialidades = [...new Set(allSurgeries.map(s => s.specialty).filter(Boolean))].sort();
    const origens = [...new Set(allSurgeries.map(s => s.origem).filter(Boolean))].sort();
    populateSelect('relEspecialidade', especialidades);
    populateSelect('relOrigem', origens);
}

function populateSelect(id, options) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="todas">Todas</option>' + options.map(o => `<option>${o}</option>`).join('');
}

// ============ RELATÓRIOS (CORRIGIDO - PADRÃO SEMANAL/MENSAL) ============

function gerarRelatorio(tipo) {
    let titulo = '';
    let dados = [];
    const hoje = new Date();
    const hojeStr = getToday();
    
    switch(tipo) {
        case 'hoje':
            // Apenas cirurgias de HOJE
            titulo = 'Relatório Diário - ' + hoje.toLocaleDateString('pt-BR', { 
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' 
            });
            dados = allSurgeries.filter(s => s.date === hojeStr);
            break;
            
        case 'semana':
            // Segunda a Domingo da SEMANA ATUAL
            const { inicioSemana, fimSemana } = getSemanaAtual();
            titulo = `Relatório Semanal (${formatDate(inicioSemana)} a ${formatDate(fimSemana)})`;
            dados = allSurgeries.filter(s => s.date >= inicioSemana && s.date <= fimSemana);
            break;
            
        case 'mes':
            // Dia 1 ao último dia do MÊS ATUAL
            const { inicioMes, fimMes } = getMesAtual();
            titulo = `Relatório Mensal - ${hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
            dados = allSurgeries.filter(s => s.date >= inicioMes && s.date <= fimMes);
            break;
            
        case 'geral':
            // Todas as cirurgias
            titulo = 'Relatório Geral - Todas as Cirurgias';
            dados = [...allSurgeries];
            break;
            
        default:
            alert('Tipo de relatório inválido!');
            return;
    }
    
    // Verificar se há dados
    if (dados.length === 0) {
        alert('⚠️ Nenhuma cirurgia encontrada para este período!');
        return;
    }
    
    console.log(`📊 Gerando relatório: ${tipo}`);
    console.log(`📋 Total de cirurgias: ${dados.length}`);
    
    gerarPDF(titulo, dados);
}

function gerarRelatorioPersonalizado() {
    const inicio = document.getElementById('customStartDate').value;
    const fim = document.getElementById('customEndDate').value;
    
    if (!inicio || !fim) {
        alert('⚠️ Selecione as datas inicial e final!');
        return;
    }
    
    if (inicio > fim) {
        alert('⚠️ A data inicial não pode ser maior que a final!');
        return;
    }
    
    const dados = allSurgeries.filter(s => s.date >= inicio && s.date <= fim);
    
    if (dados.length === 0) {
        alert('⚠️ Nenhuma cirurgia encontrada neste período!');
        return;
    }
    
    const titulo = `Relatório Personalizado: ${formatDate(inicio)} a ${formatDate(fim)}`;
    console.log(`📊 Relatório personalizado: ${dados.length} cirurgias`);
    
    gerarPDF(titulo, dados);
    fecharModal('modalPersonalizado');
}

function gerarRelatorioEspecialidade() {
    const especialidade = document.getElementById('relEspecialidade').value;
    const inicio = document.getElementById('relEspStartDate').value;
    const fim = document.getElementById('relEspEndDate').value;
    
    let dados = [...allSurgeries];
    
    if (especialidade && especialidade !== 'todas') {
        dados = dados.filter(s => s.specialty === especialidade);
    }
    
    if (inicio && fim) {
        if (inicio > fim) {
            alert('⚠️ Data inicial maior que final!');
            return;
        }
        dados = dados.filter(s => s.date >= inicio && s.date <= fim);
    }
    
    if (dados.length === 0) {
        alert(`⚠️ Nenhuma cirurgia encontrada para a especialidade "${especialidade}"!`);
        return;
    }
    
    let titulo = 'Relatório por Especialidade';
    titulo += especialidade && especialidade !== 'todas' ? `: ${especialidade}` : ': Todas';
    if (inicio && fim) titulo += ` (${formatDate(inicio)} a ${formatDate(fim)})`;
    
    gerarPDF(titulo, dados);
    fecharModal('modalEspecialidade');
}

function gerarRelatorioOrigem() {
    const origem = document.getElementById('relOrigem').value;
    const inicio = document.getElementById('relOrigStartDate').value;
    const fim = document.getElementById('relOrigEndDate').value;
    
    let dados = [...allSurgeries];
    
    if (origem && origem !== 'todas') {
        dados = dados.filter(s => s.origem === origem);
    }
    
    if (inicio && fim) {
        if (inicio > fim) {
            alert('⚠️ Data inicial maior que final!');
            return;
        }
        dados = dados.filter(s => s.date >= inicio && s.date <= fim);
    }
    
    if (dados.length === 0) {
        alert(`⚠️ Nenhuma cirurgia encontrada para a origem "${origem}"!`);
        return;
    }
    
    let titulo = 'Relatório por Origem';
    titulo += origem && origem !== 'todas' ? `: ${origem}` : ': Todas';
    if (inicio && fim) titulo += ` (${formatDate(inicio)} a ${formatDate(fim)})`;
    
    gerarPDF(titulo, dados);
    fecharModal('modalOrigem');
}

// ============ FUNÇÕES AUXILIARES DE DATA ============

/**
 * Retorna o início (segunda-feira) e fim (domingo) da semana atual
 */
function getSemanaAtual() {
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0=Domingo, 1=Segunda, ..., 6=Sábado
    
    // Calcular segunda-feira (início da semana)
    const segunda = new Date(hoje);
    if (diaSemana === 0) {
        // Se for domingo, volta 6 dias
        segunda.setDate(hoje.getDate() - 6);
    } else {
        // Volta (diaSemana - 1) dias para chegar na segunda
        segunda.setDate(hoje.getDate() - (diaSemana - 1));
    }
    
    // Calcular domingo (fim da semana)
    const domingo = new Date(segunda);
    domingo.setDate(segunda.getDate() + 6);
    
    return {
        inicioSemana: segunda.toISOString().split('T')[0],
        fimSemana: domingo.toISOString().split('T')[0]
    };
}

/**
 * Retorna o início (dia 1) e fim (último dia) do mês atual
 */
function getMesAtual() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth(); // 0=Janeiro, 1=Fevereiro, ...
    
    // Primeiro dia do mês
    const primeiroDia = new Date(ano, mes, 1);
    
    // Último dia do mês (dia 0 do mês seguinte = último dia do mês atual)
    const ultimoDia = new Date(ano, mes + 1, 0);
    
    return {
        inicioMes: primeiroDia.toISOString().split('T')[0],
        fimMes: ultimoDia.toISOString().split('T')[0]
    };
}

// ============ GERAR PDF (MANTÉM O MESMO) ============
function gerarPDF(titulo, dados) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    // Logos no cabeçalho
    if (hospitalLogo) {
        try { doc.addImage(hospitalLogo, 'PNG', 14, 8, 22, 22); } catch(e) {}
    }
    if (govLogo) {
        try { doc.addImage(govLogo, 'PNG', 40, 8, 22, 22); } catch(e) {}
    }
    
    // Faixa superior
    doc.setDrawColor(200, 169, 74);
    doc.setFillColor(6, 34, 74);
    doc.rect(0, 0, 297, 8, 'F');
    
    // Cabeçalho
    doc.setFontSize(14);
    doc.setTextColor(6, 34, 74);
    doc.setFont('helvetica', 'bold');
    doc.text('HOSPITAL REGIONAL DE PALMEIRA DOS ÍNDIOS', 148, 16, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(200, 169, 74);
    doc.setFont('helvetica', 'normal');
    doc.text('HRPI - Centro Cirúrgico', 148, 22, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(6, 34, 74);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, 148, 29, { align: 'center' });
    
    // Linha dourada
    doc.setDrawColor(200, 169, 74);
    doc.setLineWidth(0.8);
    doc.line(14, 32, 283, 32);
    
    // Resumo
    const concluidas = dados.filter(s => s.status === 'concluida').length;
    const emAndamento = dados.filter(s => s.status === 'em_andamento').length;
    const aguardando = dados.filter(s => s.status === 'pendente').length;
    const canceladas = dados.filter(s => s.status === 'cancelada').length;
    
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 37);
    doc.text(`Total: ${dados.length} | Finalizadas: ${concluidas} | Em Andamento: ${emAndamento} | Aguardando: ${aguardando} | Canceladas: ${canceladas}`, 14, 42);
    
    // Linha fina
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, 44, 283, 44);
    
    // Tabela
    const body = dados
        .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.time || '').localeCompare(b.time || ''))
        .map((s, i) => [
            i + 1,
            s.date ? new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
            s.time || '-',
            s.patient || '-',
            s.age || '-',
            s.prontuario || '-',
            (s.type || '-').replace(/\n/g, ' | ').substring(0, 50),
            s.doctor || '-',
            s.specialty || '-',
            s.anesthetist || '-',
            s.room || '-',
            s.origem || '-',
            s.necessitaSangue === 'sim' ? 'Sim' : s.necessitaSangue === 'talvez' ? 'Possível' : 'Não',
            s.necessitaUTI === 'sim' ? 'Sim' : s.necessitaUTI === 'talvez' ? 'Possível' : 'Não',
            s.status === 'pendente' ? 'Aguardando' : s.status === 'em_andamento' ? 'Em Andamento' : s.status === 'concluida' ? 'Finalizada' : 'Cancelada',
            s.cancelReason || '-'
        ]);
    
    doc.autoTable({
        startY: 46,
        head: [['Nº','Data','Hora','Paciente','Id','Pront.','Procedimento','Médico','Especialidade','Anestesista','Sala','Origem','Sangue','UTI','Status','Motivo Canc.']],
        body: body,
        styles: { fontSize: 6.5, cellPadding: 1.5, lineColor: [220,220,220], lineWidth: 0.2, textColor: [30,41,59] },
        headStyles: { fillColor: [6,34,74], textColor: [255,255,255], fontStyle: 'bold', fontSize: 6.5, halign: 'center', cellPadding: 2 },
        alternateRowStyles: { fillColor: [245,247,250] },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 18, halign: 'center' },
            2: { cellWidth: 12, halign: 'center' },
            3: { cellWidth: 25 },
            4: { cellWidth: 10, halign: 'center' },
            5: { cellWidth: 14, halign: 'center' },
            6: { cellWidth: 35 },
            7: { cellWidth: 22 },
            8: { cellWidth: 18 },
            9: { cellWidth: 20 },
            10: { cellWidth: 12, halign: 'center' },
            11: { cellWidth: 15, halign: 'center' },
            12: { cellWidth: 12, halign: 'center' },
            13: { cellWidth: 10, halign: 'center' },
            14: { cellWidth: 18, halign: 'center' },
            15: { cellWidth: 20 }
        },
        didParseCell: function(data) {
            if (data.column.index === 14) {
                if (data.cell.raw === 'Em Andamento') { data.cell.styles.textColor = [59,130,246]; data.cell.styles.fontStyle = 'bold'; }
                else if (data.cell.raw === 'Finalizada') { data.cell.styles.textColor = [16,185,129]; data.cell.styles.fontStyle = 'bold'; }
                else if (data.cell.raw === 'Cancelada') { data.cell.styles.textColor = [239,68,68]; data.cell.styles.fontStyle = 'bold'; }
                else if (data.cell.raw === 'Aguardando') { data.cell.styles.textColor = [245,158,11]; data.cell.styles.fontStyle = 'bold'; }
            }
            if (data.column.index === 12 && data.cell.raw === 'Sim') { data.cell.styles.textColor = [239,68,68]; data.cell.styles.fontStyle = 'bold'; }
            if (data.column.index === 13 && data.cell.raw === 'Sim') { data.cell.styles.textColor = [139,92,246]; data.cell.styles.fontStyle = 'bold'; }
        },
        margin: { top: 46 }
    });
    
    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(200, 169, 74);
        doc.setLineWidth(0.5);
        doc.line(14, 8, 283, 8);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text(`HRPI - Centro Cirúrgico - Página ${i} de ${pageCount}`, 148, doc.internal.pageSize.height - 10, { align: 'center' });
        doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, 14, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`relatorio_hrpi_${new Date().toISOString().split('T')[0]}.pdf`);
}

console.log('🚀 Dashboard carregado!');