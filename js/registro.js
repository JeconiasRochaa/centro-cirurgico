// ============ js/registro.js ============
import { db, ref, onValue, set, push, update, remove, runTransaction, get } from './firebase.js';
import { requireAuth, logout, hasPermission } from './auth.js';
import { getToday, calculateAge, statusLabels, statusBadgeClass } from './utils.js';

const session = requireAuth('registro');
if (!session) throw new Error('Acesso negado');

document.getElementById('userInfo').textContent = session.name;
window.logout = logout;

if (!hasPermission(session, 'dashboard')) {
    document.querySelectorAll('[data-requires="dashboard"]').forEach(el => el.style.display = 'none');
}

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
    if (snap.val()) document.getElementById('sidebarLogo').innerHTML = `<img src="${snap.val()}" alt="Logo">`;
});
onValue(ref(db, 'settings/systemName'), (snap) => {
    const name = snap.val() || 'ExaGestão';
    document.querySelectorAll('.sidebar-brand-name').forEach(el => el.textContent = name);
    document.title = document.title.replace(/^.*? -/, `${name} -`);
});

// Indicador de conexão real (não apenas decorativo)
onValue(ref(db, '.info/connected'), (snap) => {
    const el = document.getElementById('connectionStatus');
    if (!el) return;
    if (snap.val() === true) {
        el.className = 'system-status';
        el.innerHTML = '<span class="dot"></span> Sistema conectado';
    } else {
        el.className = 'system-status offline';
        el.innerHTML = '<span class="dot"></span> Conexão indisponível';
    }
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

// ============ ORIGEM / MUTIRÃO ============
const origemSelect = document.getElementById('origem');
const mutiraoGroup = document.getElementById('mutiraoGroup');
origemSelect.addEventListener('change', function() {
    mutiraoGroup.style.display = this.value === 'Mutirão' ? 'block' : 'none';
});

// ============ CÓDIGO DA CIRURGIA (seção 15) ============
// Gera um código único e sequencial por ano, ex: CC-2026-0001.
// Usa transação do Firebase para evitar códigos duplicados em cadastros simultâneos.
async function gerarCodigoCirurgia() {
    const year = new Date().getFullYear();
    const counterRef = ref(db, `counters/surgeryCode/${year}`);
    try {
        const result = await runTransaction(counterRef, (current) => (current || 0) + 1);
        const seq = result.snapshot.val();
        return `CC-${year}-${String(seq).padStart(4, '0')}`;
    } catch (error) {
        console.warn('Contador de códigos indisponível; usando código alternativo.', error);
        return `CC-${year}-${Date.now().toString(36).toUpperCase()}`;
    }
}

// ============ TODOS OS PROCEDIMENTOS (COMPLETO) ============
const PROCEDIMENTOS = [
    // ============ CIRURGIA GERAL ============
    {codigo:"APEN-01",nome:"APENDICECTOMIA",especialidade:"Cirurgia Geral"},
    {codigo:"APEN-02",nome:"APENDICECTOMIA VIDEOLAPAROSCÓPICA",especialidade:"Cirurgia Geral"},
    {codigo:"COLE-01",nome:"COLECISTECTOMIA",especialidade:"Cirurgia Geral"},
    {codigo:"COLE-02",nome:"COLECISTECTOMIA VIDEOLAPAROSCÓPICA",especialidade:"Cirurgia Geral"},
    {codigo:"HERN-01",nome:"HERNIOPLASTIA INGUINAL",especialidade:"Cirurgia Geral"},
    {codigo:"HERN-02",nome:"HERNIOPLASTIA UMBILICAL",especialidade:"Cirurgia Geral"},
    {codigo:"HERN-03",nome:"HERNIOPLASTIA EPIGÁSTRICA",especialidade:"Cirurgia Geral"},
    {codigo:"HERN-04",nome:"HERNIOPLASTIA INCISIONAL",especialidade:"Cirurgia Geral"},
    {codigo:"HERN-05",nome:"HERNIOPLASTIA INGUINAL UNILATERAL",especialidade:"Cirurgia Geral"},
    {codigo:"HERN-06",nome:"HERNIOPLASTIA CRURAL UNILATERAL",especialidade:"Cirurgia Geral"},
    {codigo:"LAPA-01",nome:"LAPAROTOMIA EXPLORADORA",especialidade:"Cirurgia Geral"},
    {codigo:"LAPA-02",nome:"LAPAROTOMIA VIDEOLAPAROSCÓPICA",especialidade:"Cirurgia Geral"},
    {codigo:"TRAQ-01",nome:"TRAQUEOSTOMIA",especialidade:"Cirurgia Geral"},
    {codigo:"DREN-01",nome:"DRENAGEM DE ABCESSO",especialidade:"Cirurgia Geral"},
    {codigo:"DREN-02",nome:"DRENAGEM DE ABCESSO ÂNU-RETAL",especialidade:"Cirurgia Geral"},
    {codigo:"DREN-03",nome:"DRENAGEM DE PLEURA",especialidade:"Cirurgia Geral"},
    {codigo:"DREN-04",nome:"DRENAGEM DE HEMATOMA",especialidade:"Cirurgia Geral"},
    {codigo:"DEBR-01",nome:"DEBRIDAMENTO DE ÚLCERA",especialidade:"Cirurgia Geral"},
    {codigo:"DEBR-02",nome:"DEBRIDAMENTO DE TECIDOS DESVITALIZADOS",especialidade:"Cirurgia Geral"},
    {codigo:"CURA-01",nome:"CURATIVO GRAU II COM DEBRIDAMENTO",especialidade:"Cirurgia Geral"},
    {codigo:"CURA-02",nome:"CURATIVO GRAU II SEM DEBRIDAMENTO",especialidade:"Cirurgia Geral"},
    {codigo:"GAST-01",nome:"GASTROSTOMIA",especialidade:"Cirurgia Geral"},
    {codigo:"GAST-02",nome:"GASTRECTOMIA",especialidade:"Cirurgia Geral"},
    {codigo:"GAST-03",nome:"GASTRECTOMIA PARCIAL",especialidade:"Cirurgia Geral"},
    {codigo:"GAST-04",nome:"GASTRECTOMIA TOTAL",especialidade:"Cirurgia Geral"},
    {codigo:"COLE-03",nome:"COLECTOMIA",especialidade:"Cirurgia Geral"},
    {codigo:"COLE-04",nome:"COLECTOMIA DIREITA",especialidade:"Cirurgia Geral"},
    {codigo:"COLE-05",nome:"COLECTOMIA ESQUERDA",especialidade:"Cirurgia Geral"},
    {codigo:"COLE-06",nome:"COLECTOMIA TOTAL",especialidade:"Cirurgia Geral"},
    {codigo:"ESPL-01",nome:"ESPLENECTOMIA",especialidade:"Cirurgia Geral"},
    {codigo:"HEMO-01",nome:"HEMORROIDECTOMIA",especialidade:"Cirurgia Geral"},
    {codigo:"FIST-01",nome:"FISTULECTOMIA ANAL",especialidade:"Cirurgia Geral"},
    {codigo:"FIST-02",nome:"FISTULECTOMIA PERIANAL",especialidade:"Cirurgia Geral"},
    {codigo:"BARI-01",nome:"BYPASS GÁSTRICO",especialidade:"Cirurgia Geral"},
    {codigo:"BARI-02",nome:"SLEEVE GÁSTRICO",especialidade:"Cirurgia Geral"},
    {codigo:"BARI-03",nome:"CIRURGIA BARIÁTRICA",especialidade:"Cirurgia Geral"},
    {codigo:"ENTE-01",nome:"ENTERECTOMIA",especialidade:"Cirurgia Geral"},
    {codigo:"ENTE-02",nome:"ENTEROANASTOMOSE",especialidade:"Cirurgia Geral"},
    {codigo:"CIST-01",nome:"CISTOSTOMIA",especialidade:"Cirurgia Geral"},
    {codigo:"MARSU-01",nome:"MARSUPIALIZAÇÃO DE ABCESSO",especialidade:"Cirurgia Geral"},
    {codigo:"MARSU-02",nome:"MARSUPIALIZAÇÃO DE CISTO",especialidade:"Cirurgia Geral"},
    {codigo:"PROL-01",nome:"TRATAMENTO CIRÚRGICO DE PROLAPSO ANAL",especialidade:"Cirurgia Geral"},
    {codigo:"ESFI-01",nome:"ESFINCTEROPLASTIA ANAL",especialidade:"Cirurgia Geral"},
    {codigo:"TORA-01",nome:"TORACOSTOMIA",especialidade:"Cirurgia Geral"},
    {codigo:"TORA-02",nome:"TORACOSTOMIA COM DRENAGEM PLEURAL FECHADA",especialidade:"Cirurgia Geral"},
    {codigo:"TORA-03",nome:"TORACOCENTESE",especialidade:"Cirurgia Geral"},

    // ============ GINECOLOGIA E OBSTETRÍCIA ============
    {codigo:"CESA-01",nome:"CESARIANA",especialidade:"Obstetrícia"},
    {codigo:"HIST-01",nome:"HISTERECTOMIA TOTAL",especialidade:"Ginecologia"},
    {codigo:"HIST-02",nome:"HISTERECTOMIA VIDEOLAPAROSCÓPICA",especialidade:"Ginecologia"},
    {codigo:"HIST-03",nome:"HISTERECTOMIA PARCIAL",especialidade:"Ginecologia"},
    {codigo:"HIST-04",nome:"HISTERECTOMIA RADICAL",especialidade:"Ginecologia"},
    {codigo:"MIOM-01",nome:"MIOMECTOMIA",especialidade:"Ginecologia"},
    {codigo:"MIOM-02",nome:"MIOMECTOMIA VIDEOLAPAROSCÓPICA",especialidade:"Ginecologia"},
    {codigo:"CURA-03",nome:"CURETAGEM UTERINA",especialidade:"Ginecologia"},
    {codigo:"LAQU-01",nome:"LAQUEADURA TUBÁRIA",especialidade:"Ginecologia"},
    {codigo:"CAUT-01",nome:"CAUTERIZAÇÃO TUBÁRIA",especialidade:"Ginecologia"},
    {codigo:"OOFR-01",nome:"OOFRECTOMIA",especialidade:"Ginecologia"},
    {codigo:"OOFR-02",nome:"OOFOROPLASTIA",especialidade:"Ginecologia"},
    {codigo:"SALP-01",nome:"SALPINGECTOMIA",especialidade:"Ginecologia"},
    {codigo:"SALP-02",nome:"SALPINGECTOMIA UNILATERAL",especialidade:"Ginecologia"},
    {codigo:"SALP-03",nome:"SALPINGECTOMIA BILATERAL",especialidade:"Ginecologia"},
    {codigo:"COLP-01",nome:"COLPOPERINEOPLASTIA",especialidade:"Ginecologia"},
    {codigo:"COLP-02",nome:"COLPORRAFIA ANTERIOR",especialidade:"Ginecologia"},
    {codigo:"COLP-03",nome:"COLPORRAFIA POSTERIOR",especialidade:"Ginecologia"},
    {codigo:"PERI-01",nome:"PERINEOPLASTIA",especialidade:"Ginecologia"},
    {codigo:"ENDO-01",nome:"TRATAMENTO DE ENDOMETRIOSE",especialidade:"Ginecologia"},
    {codigo:"HIST-05",nome:"HISTEROSCOPIA CIRÚRGICA",especialidade:"Ginecologia"},

    // ============ CIRURGIA PLÁSTICA ============
    {codigo:"MAST-01",nome:"MASTECTOMIA",especialidade:"Cirurgia Plástica"},
    {codigo:"MAST-02",nome:"MASTECTOMIA COM RECONSTRUÇÃO",especialidade:"Cirurgia Plástica"},
    {codigo:"MAMO-01",nome:"MAMOPLASTIA DE AUMENTO",especialidade:"Cirurgia Plástica"},
    {codigo:"MAMO-02",nome:"MAMOPLASTIA REDUTORA",especialidade:"Cirurgia Plástica"},
    {codigo:"MAST-03",nome:"MASTOPEXIA",especialidade:"Cirurgia Plástica"},
    {codigo:"ABDO-01",nome:"ABDOMINOPLASTIA",especialidade:"Cirurgia Plástica"},
    {codigo:"LIPO-01",nome:"LIPOASPIRAÇÃO",especialidade:"Cirurgia Plástica"},
    {codigo:"LIPO-02",nome:"LIPOASPIRAÇÃO ABDOMEN",especialidade:"Cirurgia Plástica"},
    {codigo:"LIPO-03",nome:"LIPOASPIRAÇÃO MEMBROS",especialidade:"Cirurgia Plástica"},
    {codigo:"LIPO-04",nome:"LIPOASPIRAÇÃO DORSO",especialidade:"Cirurgia Plástica"},
    {codigo:"RECO-01",nome:"RECONSTRUÇÃO MAMÁRIA",especialidade:"Cirurgia Plástica"},
    {codigo:"ENXE-01",nome:"ENXERTO DE PELE",especialidade:"Cirurgia Plástica"},
    {codigo:"RETA-01",nome:"RETALHO CUTÂNEO",especialidade:"Cirurgia Plástica"},
    {codigo:"RITI-01",nome:"RITIDOPLASTIA",especialidade:"Cirurgia Plástica"},
    {codigo:"OTOP-01",nome:"OTOPLASTIA",especialidade:"Cirurgia Plástica"},
    {codigo:"MENT-01",nome:"MENTOPLASTIA",especialidade:"Cirurgia Plástica"},
    {codigo:"GINE-01",nome:"GINECOMASTIA",especialidade:"Cirurgia Plástica"},
    {codigo:"CICA-01",nome:"CORREÇÃO DE CICATRIZ",especialidade:"Cirurgia Plástica"},
    {codigo:"QUAD-01",nome:"QUADRANTECTOMIA",especialidade:"Cirurgia Plástica"},
    {codigo:"SETO-01",nome:"SETORECTOMIA",especialidade:"Cirurgia Plástica"},

    // ============ ORTOPEDIA E TRAUMATOLOGIA (COMPLETO) ============
    // ARTROPLASTIAS (PRÓTESES)
    {codigo:"ARTQ-01",nome:"ARTROPLASTIA DE QUADRIL",especialidade:"Ortopedia"},
    {codigo:"ARTQ-02",nome:"ARTROPLASTIA DE QUADRIL REVISÃO",especialidade:"Ortopedia"},
    {codigo:"ARTJ-01",nome:"ARTROPLASTIA DE JOELHO",especialidade:"Ortopedia"},
    {codigo:"ARTJ-02",nome:"ARTROPLASTIA DE JOELHO REVISÃO",especialidade:"Ortopedia"},
    {codigo:"ARTO-01",nome:"ARTROPLASTIA DE OMBRO",especialidade:"Ortopedia"},
    {codigo:"ARTO-02",nome:"ARTROPLASTIA DE OMBRO REVISÃO",especialidade:"Ortopedia"},
    {codigo:"ARTT-01",nome:"ARTROPLASTIA DE TORNOZELO",especialidade:"Ortopedia"},
    {codigo:"ARTC-01",nome:"ARTROPLASTIA DE COTOVELO",especialidade:"Ortopedia"},
    {codigo:"PROT-01",nome:"PRÓTESE DE QUADRIL",especialidade:"Ortopedia"},
    {codigo:"PROT-02",nome:"PRÓTESE DE JOELHO",especialidade:"Ortopedia"},
    {codigo:"PROT-03",nome:"PRÓTESE DE OMBRO",especialidade:"Ortopedia"},
    {codigo:"PROT-04",nome:"PRÓTESE DE TORNOZELO",especialidade:"Ortopedia"},

    // FRATURAS - MEMBRO SUPERIOR
    {codigo:"OSTC-01",nome:"OSTEOSSÍNTESE DE CLAVÍCULA",especialidade:"Ortopedia"},
    {codigo:"OSTC-02",nome:"OSTEOSSÍNTESE DE CLAVÍCULA COM PLACA",especialidade:"Ortopedia"},
    {codigo:"TRAT-01",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DA CLAVÍCULA",especialidade:"Ortopedia"},
    {codigo:"TRAT-02",nome:"TRATAMENTO CIRÚRGICO DE LUXAÇÃO ACROMIOCLAVICULAR",especialidade:"Ortopedia"},
    {codigo:"TRAT-03",nome:"TRATAMENTO CIRÚRGICO DE FRATURA-LUXAÇÃO ACROMIOCLAVICULAR",especialidade:"Ortopedia"},
    {codigo:"OSTU-01",nome:"OSTEOSSÍNTESE DE ÚMERO",especialidade:"Ortopedia"},
    {codigo:"OSTU-02",nome:"OSTEOSSÍNTESE DE ÚMERO COM PLACA",especialidade:"Ortopedia"},
    {codigo:"OSTU-03",nome:"OSTEOSSÍNTESE DE ÚMERO COM HASTE INTRAMEDULAR",especialidade:"Ortopedia"},
    {codigo:"OSTU-04",nome:"OSTEOSSÍNTESE DE ÚMERO PROXIMAL",especialidade:"Ortopedia"},
    {codigo:"OSTU-05",nome:"OSTEOSSÍNTESE DE ÚMERO DISTAL",especialidade:"Ortopedia"},
    {codigo:"OSTU-06",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO ÚMERO",especialidade:"Ortopedia"},
    {codigo:"OSTC-03",nome:"OSTEOSSÍNTESE DE COTOVELO",especialidade:"Ortopedia"},
    {codigo:"OSTC-04",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DE COTOVELO",especialidade:"Ortopedia"},
    {codigo:"OSTC-05",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DE OLÉCRANO",especialidade:"Ortopedia"},
    {codigo:"OSTC-06",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DE CABEÇA DO RÁDIO",especialidade:"Ortopedia"},
    {codigo:"OSTR-01",nome:"OSTEOSSÍNTESE DE RÁDIO",especialidade:"Ortopedia"},
    {codigo:"OSTR-02",nome:"OSTEOSSÍNTESE DE RÁDIO DISTAL",especialidade:"Ortopedia"},
    {codigo:"OSTR-03",nome:"OSTEOSSÍNTESE DE RÁDIO COM PLACA",especialidade:"Ortopedia"},
    {codigo:"OSTR-04",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO RÁDIO",especialidade:"Ortopedia"},
    {codigo:"OSTR-05",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO RÁDIO DISTAL",especialidade:"Ortopedia"},
    {codigo:"OSTU-07",nome:"OSTEOSSÍNTESE DE ULNA",especialidade:"Ortopedia"},
    {codigo:"OSTU-08",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DA ULNA",especialidade:"Ortopedia"},
    {codigo:"OSTP-01",nome:"OSTEOSSÍNTESE DE PUNHO",especialidade:"Ortopedia"},
    {codigo:"OSTP-02",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO PUNHO",especialidade:"Ortopedia"},
    {codigo:"OSTP-03",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO ESCAFOIDE",especialidade:"Ortopedia"},
    {codigo:"OSTM-01",nome:"OSTEOSSÍNTESE DE MÃO",especialidade:"Ortopedia"},
    {codigo:"OSTM-02",nome:"OSTEOSSÍNTESE DE METACARPO",especialidade:"Ortopedia"},
    {codigo:"OSTM-03",nome:"OSTEOSSÍNTESE DE FALANGES",especialidade:"Ortopedia"},
    {codigo:"OSTM-04",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DA MÃO",especialidade:"Ortopedia"},
    {codigo:"OSTM-05",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DE METACARPO",especialidade:"Ortopedia"},
    {codigo:"OSTM-06",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DE FALANGES",especialidade:"Ortopedia"},

    // FRATURAS - MEMBRO INFERIOR
    {codigo:"OSTF-01",nome:"OSTEOSSÍNTESE DE FÊMUR",especialidade:"Ortopedia"},
    {codigo:"OSTF-02",nome:"OSTEOSSÍNTESE DE FÊMUR COM PLACA",especialidade:"Ortopedia"},
    {codigo:"OSTF-03",nome:"OSTEOSSÍNTESE DE FÊMUR COM HASTE",especialidade:"Ortopedia"},
    {codigo:"OSTF-04",nome:"OSTEOSSÍNTESE DE FÊMUR COM HASTE INTRAMEDULAR",especialidade:"Ortopedia"},
    {codigo:"OSTF-05",nome:"OSTEOSSÍNTESE DE FÊMUR PROXIMAL",especialidade:"Ortopedia"},
    {codigo:"OSTF-06",nome:"OSTEOSSÍNTESE DE FÊMUR DISTAL",especialidade:"Ortopedia"},
    {codigo:"OSTF-07",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO FÊMUR",especialidade:"Ortopedia"},
    {codigo:"OSTF-08",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO COLO DO FÊMUR",especialidade:"Ortopedia"},
    {codigo:"OSTF-09",nome:"TRATAMENTO CIRÚRGICO DE FRATURA TRANSTROCANTÉRICA",especialidade:"Ortopedia"},
    {codigo:"OSTF-10",nome:"TRATAMENTO CIRÚRGICO DE FRATURA SUBTROCANTÉRICA",especialidade:"Ortopedia"},
    {codigo:"OSTF-11",nome:"TRATAMENTO CIRÚRGICO DE FRATURA SUPRACONDILIANA DO FÊMUR",especialidade:"Ortopedia"},
    {codigo:"OSTT-01",nome:"OSTEOSSÍNTESE DE TÍBIA",especialidade:"Ortopedia"},
    {codigo:"OSTT-02",nome:"OSTEOSSÍNTESE DE TÍBIA COM PLACA",especialidade:"Ortopedia"},
    {codigo:"OSTT-03",nome:"OSTEOSSÍNTESE DE TÍBIA COM HASTE INTRAMEDULAR",especialidade:"Ortopedia"},
    {codigo:"OSTT-04",nome:"OSTEOSSÍNTESE DE TÍBIA PROXIMAL",especialidade:"Ortopedia"},
    {codigo:"OSTT-05",nome:"OSTEOSSÍNTESE DE TÍBIA DISTAL",especialidade:"Ortopedia"},
    {codigo:"OSTT-06",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DA TÍBIA",especialidade:"Ortopedia"},
    {codigo:"OSTT-07",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO PLATÔ TIBIAL",especialidade:"Ortopedia"},
    {codigo:"OSTT-08",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO PILÃO TIBIAL",especialidade:"Ortopedia"},
    {codigo:"OSTP-04",nome:"OSTEOSSÍNTESE DE PATELA",especialidade:"Ortopedia"},
    {codigo:"OSTP-05",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DE PATELA",especialidade:"Ortopedia"},
    {codigo:"OSTT-09",nome:"OSTEOSSÍNTESE DE TORNOZELO",especialidade:"Ortopedia"},
    {codigo:"OSTT-10",nome:"OSTEOSSÍNTESE DE TORNOZELO COM PLACA",especialidade:"Ortopedia"},
    {codigo:"OSTT-11",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO TORNOZELO",especialidade:"Ortopedia"},
    {codigo:"OSTT-12",nome:"TRATAMENTO CIRÚRGICO DE FRATURA BIMALEOLAR",especialidade:"Ortopedia"},
    {codigo:"OSTT-13",nome:"TRATAMENTO CIRÚRGICO DE FRATURA TRIMALEOLAR",especialidade:"Ortopedia"},
    {codigo:"OSTT-14",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO CALCÂNEO",especialidade:"Ortopedia"},
    {codigo:"OSTT-15",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO TALUZ",especialidade:"Ortopedia"},
    {codigo:"OSTP-06",nome:"OSTEOSSÍNTESE DE PÉ",especialidade:"Ortopedia"},
    {codigo:"OSTP-07",nome:"OSTEOSSÍNTESE DE METATARSO",especialidade:"Ortopedia"},
    {codigo:"OSTP-08",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DO PÉ",especialidade:"Ortopedia"},
    {codigo:"OSTP-09",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DE METATARSO",especialidade:"Ortopedia"},
    {codigo:"OSTP-10",nome:"TRATAMENTO CIRÚRGICO DE FRATURA DE CALCÂNEO",especialidade:"Ortopedia"},

    // ARTROSCOPIAS
    {codigo:"ARTS-01",nome:"ARTROSCOPIA",especialidade:"Ortopedia"},
    {codigo:"ARTS-02",nome:"ARTROSCOPIA DE JOELHO",especialidade:"Ortopedia"},
    {codigo:"ARTS-03",nome:"ARTROSCOPIA DE OMBRO",especialidade:"Ortopedia"},
    {codigo:"ARTS-04",nome:"ARTROSCOPIA DE TORNOZELO",especialidade:"Ortopedia"},
    {codigo:"ARTS-05",nome:"ARTROSCOPIA DE COTOVELO",especialidade:"Ortopedia"},
    {codigo:"ARTS-06",nome:"ARTROSCOPIA DE PUNHO",especialidade:"Ortopedia"},
    {codigo:"ARTS-07",nome:"ARTROSCOPIA DE QUADRIL",especialidade:"Ortopedia"},

    // LIGAMENTOS E MENISCOS
    {codigo:"LCA-01",nome:"RECONSTRUÇÃO DE LCA",especialidade:"Ortopedia"},
    {codigo:"LCP-01",nome:"RECONSTRUÇÃO DE LCP",especialidade:"Ortopedia"},
    {codigo:"MENI-01",nome:"MENISCECTOMIA",especialidade:"Ortopedia"},
    {codigo:"MENI-02",nome:"RECONSTRUÇÃO DE MENISCO",especialidade:"Ortopedia"},
    {codigo:"MANG-01",nome:"CIRURGIA DE MANGUITO ROTADOR",especialidade:"Ortopedia"},
    {codigo:"TENO-01",nome:"TENODESE",especialidade:"Ortopedia"},
    {codigo:"TENO-02",nome:"TENORRAFIA",especialidade:"Ortopedia"},
    {codigo:"TENO-03",nome:"SUTURA DE TENDÃO",especialidade:"Ortopedia"},
    {codigo:"TENO-04",nome:"TENÓLISE",especialidade:"Ortopedia"},
    {codigo:"TENO-05",nome:"TENOPLASTIA",especialidade:"Ortopedia"},
    {codigo:"TENO-06",nome:"ENXERTO DE TENDÃO ÚNICO",especialidade:"Ortopedia"},
    {codigo:"TENO-07",nome:"TENORRAFIA EM TÚNEL ÓSTEO-FIBROSO",especialidade:"Ortopedia"},
    {codigo:"TUNE-01",nome:"LIBERAÇÃO DE TÚNEL DO CARPO",especialidade:"Ortopedia"},
    {codigo:"DUPU-01",nome:"CIRURGIA DE DUPUYTREN",especialidade:"Ortopedia"},

    // COLUNA
    {codigo:"COLU-01",nome:"CIRURGIA DE COLUNA",especialidade:"Ortopedia"},
    {codigo:"ARTR-01",nome:"ARTRODESE DE COLUNA CERVICAL",especialidade:"Ortopedia"},
    {codigo:"ARTR-02",nome:"ARTRODESE DE COLUNA LOMBAR",especialidade:"Ortopedia"},
    {codigo:"ARTR-03",nome:"ARTRODESE DE COLUNA TORÁCICA",especialidade:"Ortopedia"},
    {codigo:"VERT-01",nome:"VERTEBROPLASTIA",especialidade:"Ortopedia"},
    {codigo:"CIFO-01",nome:"CIFOPLASTIA",especialidade:"Ortopedia"},

    // AMPUTAÇÕES
    {codigo:"AMPU-01",nome:"AMPUTAÇÃO DE DEDO",especialidade:"Ortopedia"},
    {codigo:"AMPU-02",nome:"AMPUTAÇÃO DE MEMBRO SUPERIOR",especialidade:"Ortopedia"},
    {codigo:"AMPU-03",nome:"AMPUTAÇÃO DE MEMBRO INFERIOR",especialidade:"Ortopedia"},
    {codigo:"AMPU-04",nome:"AMPUTAÇÃO DE PÉ",especialidade:"Ortopedia"},
    {codigo:"AMPU-05",nome:"AMPUTAÇÃO DE MÃO",especialidade:"Ortopedia"},

    // RETIRADA DE MATERIAL DE SÍNTESE
    {codigo:"RETI-01",nome:"RETIRADA DE MATERIAL DE SÍNTESE",especialidade:"Ortopedia"},
    {codigo:"RETI-02",nome:"RETIRADA DE PLACA",especialidade:"Ortopedia"},
    {codigo:"RETI-03",nome:"RETIRADA DE PLACA E PARAFUSO",especialidade:"Ortopedia"},
    {codigo:"RETI-04",nome:"RETIRADA DE PARAFUSOS",especialidade:"Ortopedia"},
    {codigo:"RETI-05",nome:"RETIRADA DE FIO INTRAÓSSEO",especialidade:"Ortopedia"},
    {codigo:"RETI-06",nome:"RETIRADA DE PINO INTRAÓSSEO",especialidade:"Ortopedia"},
    {codigo:"RETI-07",nome:"RETIRADA DE FIXADOR EXTERNO",especialidade:"Ortopedia"},
    {codigo:"RETI-08",nome:"RETIRADA DE FIOS DE KIRSCHNER",especialidade:"Ortopedia"},

    // ENXERTOS E OUTROS
    {codigo:"ENXO-01",nome:"ENXERTO ÓSSEO",especialidade:"Ortopedia"},
    {codigo:"ENXO-02",nome:"ENXERTO ÓSSEO AUTÓGENO",especialidade:"Ortopedia"},
    {codigo:"MANI-01",nome:"MANIPULAÇÃO ARTICULAR",especialidade:"Ortopedia"},
    {codigo:"RESS-01",nome:"RESSECÇÃO SIMPLES DE TUMOR ÓSSEO",especialidade:"Ortopedia"},
    {codigo:"RESS-02",nome:"RESSECÇÃO SIMPLES DE TUMOR DE PARTES MOLES",especialidade:"Ortopedia"},
    {codigo:"RETC-01",nome:"RETIRADA DE CORPO ESTRANHO INTRA-ARTICULAR",especialidade:"Ortopedia"},
    {codigo:"RETC-02",nome:"RETIRADA DE CORPO ESTRANHO INTRAÓSSEO",especialidade:"Ortopedia"},

    // ============ NEUROCIRURGIA ============
    {codigo:"CRAN-01",nome:"CRANIOTOMIA",especialidade:"Neurocirurgia"},
    {codigo:"CRAN-02",nome:"CRANIOTOMIA PARA TUMOR CEREBRAL",especialidade:"Neurocirurgia"},
    {codigo:"CRAN-03",nome:"CRANIOTOMIA DESCOMPRESSIVA",especialidade:"Neurocirurgia"},
    {codigo:"ANEU-01",nome:"ANEURISMA CEREBRAL",especialidade:"Neurocirurgia"},
    {codigo:"ANEU-02",nome:"CLIPAGEM DE ANEURISMA",especialidade:"Neurocirurgia"},
    {codigo:"DREN-05",nome:"DRENAGEM DE HEMATOMA SUBDURAL",especialidade:"Neurocirurgia"},
    {codigo:"DREN-06",nome:"DRENAGEM DE HEMATOMA EXTRADURAL",especialidade:"Neurocirurgia"},
    {codigo:"HERN-07",nome:"HÉRNIA DE DISCO",especialidade:"Neurocirurgia"},
    {codigo:"HERN-08",nome:"HÉRNIA DE DISCO CERVICAL",especialidade:"Neurocirurgia"},
    {codigo:"HERN-09",nome:"HÉRNIA DE DISCO LOMBAR",especialidade:"Neurocirurgia"},
    {codigo:"HERN-10",nome:"HÉRNIA DE DISCO TORÁCICA",especialidade:"Neurocirurgia"},
    {codigo:"DESCOMP-01",nome:"DESCOMPRESSÃO MEDULAR",especialidade:"Neurocirurgia"},
    {codigo:"LAMI-01",nome:"LAMINECTOMIA",especialidade:"Neurocirurgia"},
    {codigo:"FORA-01",nome:"FORAMINOTOMIA",especialidade:"Neurocirurgia"},

    // ============ OFTALMOLOGIA ============
    {codigo:"CATA-01",nome:"CIRURGIA DE CATARATA",especialidade:"Oftalmologia"},
    {codigo:"FACE-01",nome:"FACECTOMIA",especialidade:"Oftalmologia"},
    {codigo:"FACE-02",nome:"FACECTOMIA COM IMPLANTE DE LENTE",especialidade:"Oftalmologia"},
    {codigo:"VITR-01",nome:"VITRECTOMIA",especialidade:"Oftalmologia"},
    {codigo:"VITR-02",nome:"VITRECTOMIA POSTERIOR",especialidade:"Oftalmologia"},
    {codigo:"BLEF-01",nome:"BLEFAROPLASTIA",especialidade:"Oftalmologia"},
    {codigo:"PTOS-01",nome:"CORREÇÃO DE PTOSE PALPEBRAL",especialidade:"Oftalmologia"},
    {codigo:"TRAB-01",nome:"TRABECULECTOMIA",especialidade:"Oftalmologia"},
    {codigo:"RETI-09",nome:"RETINOPEXIA",especialidade:"Oftalmologia"},
    {codigo:"DESC-01",nome:"CIRURGIA DE DESCOLAMENTO DE RETINA",especialidade:"Oftalmologia"},
    {codigo:"PTER-01",nome:"CIRURGIA DE PTERÍGIO",especialidade:"Oftalmologia"},
    {codigo:"ESTR-01",nome:"CIRURGIA DE ESTRABISMO",especialidade:"Oftalmologia"},
    {codigo:"TRAN-01",nome:"TRANSPLANTE DE CÓRNEA",especialidade:"Oftalmologia"},
    {codigo:"CROS-01",nome:"CROSSLINKING DE CÓRNEA",especialidade:"Oftalmologia"},

    // ============ OTORRINOLARINGOLOGIA ============
    {codigo:"AMIG-01",nome:"AMIGDALECTOMIA",especialidade:"Otorrinolaringologia"},
    {codigo:"ADEN-01",nome:"ADENOIDECTOMIA",especialidade:"Otorrinolaringologia"},
    {codigo:"ADEN-02",nome:"ADENOAMIGDALECTOMIA",especialidade:"Otorrinolaringologia"},
    {codigo:"SEPT-01",nome:"SEPTOPLASTIA",especialidade:"Otorrinolaringologia"},
    {codigo:"RINO-01",nome:"RINOPLASTIA",especialidade:"Otorrinolaringologia"},
    {codigo:"RINO-02",nome:"RINOSSEPTOPLASTIA",especialidade:"Otorrinolaringologia"},
    {codigo:"TIMP-01",nome:"TIMPANOPLASTIA",especialidade:"Otorrinolaringologia"},
    {codigo:"TIMP-02",nome:"TIMPANOPLASTIA COM MASTOIDECTOMIA",especialidade:"Otorrinolaringologia"},
    {codigo:"SINU-01",nome:"SINUSECTOMIA",especialidade:"Otorrinolaringologia"},
    {codigo:"SINU-02",nome:"SINUSECTOMIA ENDOSCÓPICA",especialidade:"Otorrinolaringologia"},
    {codigo:"LARI-01",nome:"LARINGOSCOPIA",especialidade:"Otorrinolaringologia"},
    {codigo:"LARI-02",nome:"LARINGOSCOPIA COM MICROCIRURGIA",especialidade:"Otorrinolaringologia"},
    {codigo:"CORD-01",nome:"CIRURGIA DE CORDAS VOCAIS",especialidade:"Otorrinolaringologia"},

    // ============ UROLOGIA ============
    {codigo:"PROS-01",nome:"PROSTATECTOMIA",especialidade:"Urologia"},
    {codigo:"PROS-02",nome:"PROSTATECTOMIA VIDEOLAPAROSCÓPICA",especialidade:"Urologia"},
    {codigo:"RTUP-01",nome:"RTU DE PRÓSTATA",especialidade:"Urologia"},
    {codigo:"NEFR-01",nome:"NEFRECTOMIA",especialidade:"Urologia"},
    {codigo:"NEFR-02",nome:"NEFRECTOMIA VIDEOLAPAROSCÓPICA",especialidade:"Urologia"},
    {codigo:"NEFR-03",nome:"NEFRECTOMIA RADICAL",especialidade:"Urologia"},
    {codigo:"POST-01",nome:"POSTECTOMIA",especialidade:"Urologia"},
    {codigo:"CIRC-01",nome:"CIRCUNCISÃO",especialidade:"Urologia"},
    {codigo:"VASE-01",nome:"VASECTOMIA",especialidade:"Urologia"},
    {codigo:"HIDR-01",nome:"HIDROCELECTOMIA",especialidade:"Urologia"},
    {codigo:"VARI-01",nome:"VARICOCELECTOMIA",especialidade:"Urologia"},
    {codigo:"CIST-02",nome:"CISTECTOMIA",especialidade:"Urologia"},
    {codigo:"CIST-03",nome:"CISTECTOMIA RADICAL",especialidade:"Urologia"},
    {codigo:"ORQU-01",nome:"ORQUIDOPEXIA",especialidade:"Urologia"},
    {codigo:"FREN-01",nome:"FRENULOPLASTIA",especialidade:"Urologia"},
    {codigo:"LITI-01",nome:"LITOTRIPSIA",especialidade:"Urologia"},
    {codigo:"LITI-02",nome:"URETEROLITOTRIPSIA",especialidade:"Urologia"},

    // ============ BUCOMAXILOFACIAL ============
    {codigo:"EXOD-01",nome:"EXODONTIA DE TERCEIRO MOLAR",especialidade:"Bucomaxilofacial"},
    {codigo:"EXOD-02",nome:"EXODONTIA DE SISO",especialidade:"Bucomaxilofacial"},
    {codigo:"EXOD-03",nome:"EXODONTIA DE SISO BILATERAL",especialidade:"Bucomaxilofacial"},
    {codigo:"EXOD-04",nome:"EXODONTIA DE SISO (4 DENTES)",especialidade:"Bucomaxilofacial"},
    {codigo:"EXOD-05",nome:"EXODONTIA MÚLTIPLA",especialidade:"Bucomaxilofacial"},
    {codigo:"EXOD-06",nome:"EXODONTIA SIMPLES",especialidade:"Bucomaxilofacial"},
    {codigo:"FRAT-01",nome:"FRATURA DE MANDÍBULA",especialidade:"Bucomaxilofacial"},
    {codigo:"FRAT-02",nome:"FRATURA DE MANDÍBULA COM PLACA",especialidade:"Bucomaxilofacial"},
    {codigo:"FRAT-03",nome:"FRATURA DE MAXILA",especialidade:"Bucomaxilofacial"},
    {codigo:"FRAT-04",nome:"FRATURA DE ZIGOMÁTICO",especialidade:"Bucomaxilofacial"},
    {codigo:"FRAT-05",nome:"FRATURA DE ÓRBITA",especialidade:"Bucomaxilofacial"},
    {codigo:"FRAT-06",nome:"FRATURA DE OSSOS NASAIS",especialidade:"Bucomaxilofacial"},
    {codigo:"CIRT-01",nome:"CIRURGIA ORTOGNÁTICA",especialidade:"Bucomaxilofacial"},
    {codigo:"CIRT-02",nome:"CIRURGIA ORTOGNÁTICA BIMAXILAR",especialidade:"Bucomaxilofacial"},
    {codigo:"IMPL-01",nome:"IMPLANTE DENTÁRIO",especialidade:"Bucomaxilofacial"},
    {codigo:"IMPL-02",nome:"IMPLANTE DENTÁRIO UNITÁRIO",especialidade:"Bucomaxilofacial"},
    {codigo:"IMPL-03",nome:"IMPLANTE DENTÁRIO MÚLTIPLO",especialidade:"Bucomaxilofacial"},
    {codigo:"BIOP-01",nome:"BIÓPSIA DE CAVIDADE ORAL",especialidade:"Bucomaxilofacial"},
    {codigo:"EXER-01",nome:"EXÉRESE DE LESÃO BUCOMAXILOFACIAL",especialidade:"Bucomaxilofacial"},

    // ============ ENDOSCOPIA ============
    {codigo:"EDAS-01",nome:"ENDOSCOPIA DIGESTIVA ALTA",especialidade:"Gastroenterologia"},
    {codigo:"EDAS-02",nome:"ENDOSCOPIA DIGESTIVA ALTA COM BIÓPSIA",especialidade:"Gastroenterologia"},
    {codigo:"EDAS-03",nome:"ENDOSCOPIA DIGESTIVA ALTA TERAPÊUTICA",especialidade:"Gastroenterologia"},
    {codigo:"COLO-01",nome:"COLONOSCOPIA",especialidade:"Coloproctologia"},
    {codigo:"COLO-02",nome:"COLONOSCOPIA COM BIÓPSIA",especialidade:"Coloproctologia"},
    {codigo:"COLO-03",nome:"COLONOSCOPIA COM POLIPECTOMIA",especialidade:"Coloproctologia"},
    {codigo:"COLO-04",nome:"COLONOSCOPIA COM MUCOSECTOMIA",especialidade:"Coloproctologia"},
    {codigo:"RETO-01",nome:"RETOSSIGMOIDOSCOPIA",especialidade:"Coloproctologia"},
    {codigo:"ANUS-01",nome:"ANUSCOPIA",especialidade:"Coloproctologia"},
    {codigo:"CPRE-01",nome:"CPRE",especialidade:"Gastroenterologia"},
    {codigo:"CPRE-02",nome:"CPRE COM PAPILOTOMIA",especialidade:"Gastroenterologia"},
    {codigo:"ENTE-03",nome:"ENTEROSCOPIA",especialidade:"Gastroenterologia"},
    {codigo:"BRON-01",nome:"BRONCOSCOPIA",especialidade:"Pneumologia"},
    {codigo:"BRON-02",nome:"BRONCOSCOPIA COM BIÓPSIA",especialidade:"Pneumologia"},
    {codigo:"BRON-03",nome:"BRONCOSCOPIA COM LAVADO BRONCOALVEOLAR",especialidade:"Pneumologia"},
    {codigo:"LARI-03",nome:"LARINGOSCOPIA COM BIÓPSIA",especialidade:"Otorrinolaringologia"},
    {codigo:"GAST-05",nome:"GASTROSCOPIA",especialidade:"Gastroenterologia"},
    {codigo:"GAST-06",nome:"GASTROSCOPIA COM BIÓPSIA",especialidade:"Gastroenterologia"},

    // ============ CIRURGIA CARDÍACA E VASCULAR ============
    {codigo:"SAFE-01",nome:"SAFENECTOMIA",especialidade:"Cirurgia Vascular"},
    {codigo:"SAFE-02",nome:"SAFENECTOMIA BILATERAL",especialidade:"Cirurgia Vascular"},
    {codigo:"ESCL-01",nome:"ESCLEROTERAPIA DE VARIZES",especialidade:"Cirurgia Vascular"},
    {codigo:"FLEB-01",nome:"FLEBECTOMIA",especialidade:"Cirurgia Vascular"},
    {codigo:"TROM-01",nome:"TROMBECTOMIA",especialidade:"Cirurgia Vascular"},
    {codigo:"REVA-01",nome:"REVASCULARIZAÇÃO MIOCÁRDICA",especialidade:"Cirurgia Cardíaca"},
    {codigo:"TROC-01",nome:"TROCA VALVAR AÓRTICA",especialidade:"Cirurgia Cardíaca"},
    {codigo:"TROC-02",nome:"TROCA VALVAR MITRAL",especialidade:"Cirurgia Cardíaca"},
    {codigo:"MARC-01",nome:"COLOCAÇÃO DE MARCA-PASSO",especialidade:"Cirurgia Cardíaca"},
    {codigo:"MARC-02",nome:"TROCA DE MARCA-PASSO",especialidade:"Cirurgia Cardíaca"},
    {codigo:"ANGI-01",nome:"ANGIOPLASTIA",especialidade:"Cirurgia Vascular"},
    {codigo:"STEN-01",nome:"COLOCAÇÃO DE STENT",especialidade:"Cirurgia Vascular"},
    {codigo:"CATE-01",nome:"CATETERISMO CARDÍACO",especialidade:"Cirurgia Cardíaca"},
];


// Autocomplete
const procInput = document.getElementById('surgeryTypeInput');
const suggestionsBox = document.getElementById('suggestionsBox');
const surgeryTypeHidden = document.getElementById('surgeryType');

const doctorInput = document.getElementById('doctor');
const doctorSuggestions = document.getElementById('doctorSuggestions');
let doctors = [];
get(ref(db, 'settings/doctors')).then(snapshot => {
    doctors = Object.values(snapshot.val() || {});
}).catch(() => {});

doctorInput?.addEventListener('input', function() {
    const search = this.value.trim().toUpperCase();
    if (search.length < 2) { doctorSuggestions.classList.remove('show'); return; }
    const matches = doctors.filter(doctor => `${doctor.name} ${doctor.crm}`.toUpperCase().includes(search));
    doctorSuggestions.innerHTML = matches.map(doctor => `
        <div class="suggestion-item" data-doctor="${doctor.name.replace(/"/g, '&quot;')}">
            <strong>${doctor.name}</strong><span style="margin-left:8px;color:var(--text-muted);">${doctor.crm}</span>
        </div>`).join('');
    doctorSuggestions.classList.toggle('show', matches.length > 0);
});

doctorSuggestions?.addEventListener('click', event => {
    const item = event.target.closest('[data-doctor]');
    if (!item) return;
    doctorInput.value = item.dataset.doctor;
    doctorSuggestions.classList.remove('show');
});

if (procInput) {
    procInput.addEventListener('input', function() {
        const valor = this.value.trim().toUpperCase();
        if (valor.length < 2) { suggestionsBox.classList.remove('show'); return; }
        const sugestoes = PROCEDIMENTOS.filter(p => 
            (p.nome.includes(valor) || p.codigo.includes(valor)) && 
            !procedimentosSelecionados.find(ps => ps.codigo === p.codigo)
        );
        let html = sugestoes.map(p => `
            <div class="suggestion-item" onclick="window.adicionarProc('${p.nome.replace(/'/g, "\\'")}', '${p.especialidade.replace(/'/g, "\\'")}', '${p.codigo}')">
                <span style="color:var(--green);"><i class="fa-solid fa-plus"></i></span>
                <div><strong>${p.codigo}</strong> - ${p.nome}</div>
            </div>
        `).join('');
        html += `<div class="suggestion-item" onclick="window.adicionarManual('${valor.replace(/'/g, "\\'")}')" style="background:#f0fdf4;border-left:3px solid #10b981;font-weight:600;">
            <span style="color:var(--green);"><i class="fa-solid fa-pen"></i></span>
            <div>Adicionar manualmente: <strong>"${valor}"</strong></div>
        </div>`;
        suggestionsBox.innerHTML = html;
        suggestionsBox.classList.add('show');
    });

    procInput.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const first = suggestionsBox.querySelector('.suggestion-item');
        if (first && suggestionsBox.classList.contains('show')) first.click();
        else if (this.value.trim()) window.adicionarManual(this.value.trim().toUpperCase());
    });
}

window.adicionarProc = function(nome, especialidade, codigo) {
    procedimentosSelecionados.push({ nome, especialidade, codigo });
    atualizarProcVisuais();
    procInput.value = '';
    suggestionsBox.classList.remove('show');
    procInput.focus();
};

window.adicionarManual = function(nome) {
    const procedimento = (nome || '').trim().toUpperCase();
    if (!procedimento) return;
    procedimentosSelecionados.push({ nome: procedimento, especialidade: '', codigo:  + Date.now().toString(36) });
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
                <span class="remove-tag" onclick="window.removerProc('${p.codigo}')"><i class="fa-solid fa-xmark"></i></span>
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
    if (!bd) {
        document.getElementById('age').value = '';
        document.getElementById('ageDisplay').value = '';
        return;
    }
    const idade = calculateAge(bd);
    document.getElementById('age').value = idade;
    document.getElementById('ageDisplay').value = `${idade} anos`;
};

// ============ REGISTRO DE ALTERAÇÕES / AUDITORIA (seção 17) ============
function registrarAuditoria(cirurgia, statusAnterior, statusNovo, acao) {
    const logRef = push(ref(db, 'audit_logs'));
    set(logRef, {
        timestamp: new Date().toISOString(),
        username: session.name || session.username || 'Desconhecido',
        action: acao,
        details: `${cirurgia.patient || cirurgia.code || cirurgia.id} — ${statusAnterior ? (statusLabels[statusAnterior] || statusAnterior) + ' → ' : ''}${statusLabels[statusNovo] || statusNovo}`
    }).catch(err => console.error('Falha ao registrar auditoria:', err));
}

async function mudarStatus(id, novoStatus, acaoLabel, extra) {
    const cirurgia = allSurgeries.find(s => s.id === id);
    if (!cirurgia) return;
    const statusAnterior = cirurgia.status;
    try {
        await update(ref(db, `surgeries/${id}`), { status: novoStatus, ...(extra || {}) });
        registrarAuditoria(cirurgia, statusAnterior, novoStatus, acaoLabel);
    } catch (err) {
        console.error(err);
        alert('❌ Não foi possível atualizar o status da cirurgia.');
    }
}

// ============ PREVENÇÃO DE DUPLICIDADE (seção 37) ============
function possivelDuplicidade(surgery) {
    return allSurgeries.some(s =>
        s.id !== surgery.id &&
        s.status !== 'cancelada' &&
        (s.patient || '').trim().toUpperCase() === surgery.patient &&
        s.date === surgery.date &&
        s.room === surgery.room
    );
}

// CRUD
document.getElementById('surgeryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (surgeryTypeHidden.value.trim() === '') { alert('⚠️ Adicione pelo menos um procedimento!'); return; }

    const isEditing = !!document.getElementById('editId').value;

    const surgery = {
        id: document.getElementById('editId').value || push(ref(db, 'surgeries')).key,
        code: document.getElementById('surgeryCode').value || null,
        origem: document.getElementById('origem').value,
        mutiraoNome: document.getElementById('origem').value === 'Mutirão' ? document.getElementById('mutiraoNome').value.trim() : '',
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
        circulante: document.getElementById('circulante')?.value.trim().toUpperCase() || '',
        room: document.getElementById('room').value,
        necessitaSangue: document.getElementById('necessitaSangue').value,
        necessitaUTI: document.getElementById('necessitaUTI').value,
        materiaisEspeciais: document.getElementById('materiaisEspeciais').value.trim(),
        observacoes: document.getElementById('observacoes').value.trim(),
        status: 'pendente'
    };

    // Preserva o status/código ao editar (não é definido por este formulário)
    if (isEditing) {
        const existente = allSurgeries.find(s => s.id === surgery.id);
        if (existente) {
            surgery.status = existente.status || 'pendente';
            surgery.code = existente.code || surgery.code;
            if (existente.cancelReason) surgery.cancelReason = existente.cancelReason;
        }
    }

    if (!isEditing && possivelDuplicidade(surgery)) {
        const continuar = confirm('⚠️ Já existe uma cirurgia com informações semelhantes (mesmo paciente, data e sala). Deseja continuar mesmo assim?');
        if (!continuar) return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const textoOriginal = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando...';

    try {
        if (!isEditing) {
            surgery.code = await gerarCodigoCirurgia();
        }
        await set(ref(db, `surgeries/${surgery.id}`), surgery);
        registrarAuditoria(surgery, null, surgery.status, isEditing ? 'Edição de cirurgia' : 'Cadastro de cirurgia');
        limparFormulario();
        cancelarEdicao();
        alert(`✅ Cirurgia salva! Código: ${surgery.code}`);
    } catch (err) {
        console.error(err);
        alert('❌ Não foi possível salvar a cirurgia. Tente novamente.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = textoOriginal;
    }
});

window.editarCirurgia = function(id) {
    const s = allSurgeries.find(s => s.id === id);
    if (!s) return;
    document.getElementById('editId').value = s.id;
    document.getElementById('surgeryCode').value = s.code || '';
    document.getElementById('origem').value = s.origem || '';
    origemSelect.dispatchEvent(new Event('change'));
    document.getElementById('mutiraoNome').value = s.mutiraoNome || '';
    document.getElementById('patient').value = s.patient || '';
    document.getElementById('prontuario').value = s.prontuario || '';
    document.getElementById('birthDate').value = s.birthDate || '';
    document.getElementById('age').value = s.age || '';
    document.getElementById('ageDisplay').value = s.age ? `${s.age} anos` : '';
    document.getElementById('surgeryDate').value = s.date || '';
    document.getElementById('surgeryTime').value = s.time || '';
    document.getElementById('specialty').value = s.specialty || '';
    document.getElementById('doctor').value = s.doctor || '';
    document.getElementById('anesthetist').value = s.anesthetist || '';
    document.getElementById('circulante').value = s.circulante || '';
    document.getElementById('room').value = s.room || '';
    document.getElementById('necessitaSangue').value = s.necessitaSangue || 'nao';
    document.getElementById('necessitaUTI').value = s.necessitaUTI || 'nao';
    document.getElementById('materiaisEspeciais').value = s.materiaisEspeciais || '';
    document.getElementById('observacoes').value = s.observacoes || '';

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

    // Exibe o código e o status atual (bloco de controle, somente leitura)
    const codeDisplay = document.getElementById('codeDisplay');
    codeDisplay.textContent = `🔖 Código: ${s.code || '(sem código — cadastro anterior à numeração automática)'}`;
    const controleBlock = document.getElementById('controleBlock');
    controleBlock.style.display = 'block';
    const statusEl = document.getElementById('statusDisplay');
    statusEl.textContent = statusLabels[s.status] || s.status || '-';
    statusEl.className = `status-display ${statusBadgeClass[s.status] || 'badge-gray'}`;

    document.getElementById('formTitle').textContent = '✏️ Editar Cirurgia';
    document.getElementById('submitBtn').textContent = '💾 Salvar Alterações';
    document.getElementById('cancelEditBtn').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.cancelarEdicao = function() {
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').textContent = 'Nova Cirurgia';
    document.getElementById('submitBtn').textContent = '✅ Registrar Cirurgia';
    document.getElementById('cancelEditBtn')?.style && (document.getElementById('cancelEditBtn').style.display = 'none');
    document.getElementById('controleBlock')?.style && (document.getElementById('controleBlock').style.display = 'none');
    const codeDisplay = document.getElementById('codeDisplay');
    if (codeDisplay) codeDisplay.textContent = '🔖 Código gerado automaticamente ao salvar';
    limparFormulario();
};

window.limparFormulario = function() {
    document.getElementById('surgeryForm').reset();
    document.getElementById('surgeryDate').value = getToday();
    document.getElementById('age').value = '';
    document.getElementById('ageDisplay').value = '';
    document.getElementById('editId').value = '';
    document.getElementById('surgeryCode').value = '';
    document.getElementById('surgeryTypeInput').value = '';
    document.getElementById('mutiraoGroup').style.display = 'none';
    surgeryTypeHidden.value = '';
    procedimentosSelecionados = [];
    atualizarProcVisuais();
    suggestionsBox.classList.remove('show');
};

// ============ FLUXO DE STATUS (seção 16) ============
// Agendada (implícita: pendente com data futura) → Aguardando (pendente) → Em preparação →
// Em andamento → Recuperação → Finalizada.  Também: Cancelada, Suspensa.
window.iniciarPreparo = (id) => mudarStatus(id, 'em_preparacao', 'Início de preparo');

window.iniciarCirurgia = (id) => mudarStatus(id, 'em_andamento', 'Início da cirurgia');

window.moverParaRecuperacao = (id) => mudarStatus(id, 'recuperacao', 'Encaminhado para recuperação');

window.finalizarCirurgia = (id) => {
    if (confirm('✅ Confirmar finalização da cirurgia?')) {
        mudarStatus(id, 'concluida', 'Finalização da cirurgia');
    }
};

window.suspenderCirurgia = (id) => {
    if (!confirm('⏸ Tem certeza que deseja suspender esta cirurgia? Ela poderá ser retomada depois.')) return;
    const motivo = prompt('📝 Motivo da suspensão (opcional):') || '';
    mudarStatus(id, 'suspensa', 'Suspensão da cirurgia', { suspendReason: motivo });
};

window.retomarCirurgia = (id) => {
    if (confirm('▶ Retomar esta cirurgia e voltar para "Aguardando"?')) {
        mudarStatus(id, 'pendente', 'Retomada após suspensão', { suspendReason: null });
    }
};

window.cancelarCirurgia = (id) => {
    if (!confirm('⚠️ Tem certeza que deseja cancelar esta cirurgia?')) return;
    const motivo = prompt('📝 Motivo do cancelamento:');
    if (motivo) mudarStatus(id, 'cancelada', 'Cancelamento de cirurgia', { cancelReason: motivo });
};

window.excluirCirurgia = (id) => {
    if (confirm('⚠️ Tem certeza que deseja excluir esta cirurgia permanentemente?')) remove(ref(db, `surgeries/${id}`));
};

window.mudarAba = function(aba) {
    abaAtual = aba;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    atualizarLista();
};

const CARD_CLASS = {
    'pendente': 'pending', 'em_preparacao': 'preparing', 'em_andamento': 'ongoing',
    'recuperacao': 'recovering', 'concluida': 'completed', 'suspensa': 'suspended', 'cancelada': 'cancelled'
};
const BADGE_CLASS = {
    'pendente': 'waiting', 'em_preparacao': 'preparing', 'em_andamento': 'progress',
    'recuperacao': 'recovering', 'concluida': 'done', 'suspensa': 'suspended', 'cancelada': 'cancelled'
};

function botoesAcao(s) {
    switch (s.status) {
        case 'pendente':
            return `<button class="btn-sm btn-sm-prep" onclick="iniciarPreparo('${s.id}')"><i class="fa-solid fa-hand-holding-medical"></i> Iniciar Preparo</button>
                    <button class="btn-sm btn-sm-cancel-btn" onclick="cancelarCirurgia('${s.id}')"><i class="fa-solid fa-xmark"></i> Cancelar</button>`;
        case 'em_preparacao':
            return `<button class="btn-sm btn-sm-progress" onclick="iniciarCirurgia('${s.id}')">▶ Iniciar Cirurgia</button>
                    <button class="btn-sm btn-sm-suspend" onclick="suspenderCirurgia('${s.id}')">⏸ Suspender</button>
                    <button class="btn-sm btn-sm-cancel-btn" onclick="cancelarCirurgia('${s.id}')"><i class="fa-solid fa-xmark"></i> Cancelar</button>`;
        case 'em_andamento':
            return `<button class="btn-sm btn-sm-recovery" onclick="moverParaRecuperacao('${s.id}')"><i class="fa-solid fa-bed"></i> P/ Recuperação</button>
                    <button class="btn-sm btn-sm-suspend" onclick="suspenderCirurgia('${s.id}')">⏸ Suspender</button>`;
        case 'recuperacao':
            return `<button class="btn-sm btn-sm-finish" onclick="finalizarCirurgia('${s.id}')"><i class="fa-solid fa-circle-check"></i> Finalizar</button>`;
        case 'suspensa':
            return `<button class="btn-sm btn-sm-start" onclick="retomarCirurgia('${s.id}')">▶ Retomar</button>
                    <button class="btn-sm btn-sm-cancel-btn" onclick="cancelarCirurgia('${s.id}')"><i class="fa-solid fa-xmark"></i> Cancelar</button>`;
        default:
            return '';
    }
}

function atualizarLista() {
    const list = document.getElementById('surgeryList');
    const today = getToday();
    let cirurgias;
    if (abaAtual === 'hoje') cirurgias = allSurgeries.filter(s => s.date === today);
    else if (abaAtual === 'futuras') cirurgias = allSurgeries.filter(s => s.date > today);
    else cirurgias = allSurgeries;
    cirurgias.sort((a,b) => (b.date||'').localeCompare(a.date||'') || (a.time||'').localeCompare(b.time||''));

    if (!cirurgias.length) { list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i> Nenhuma cirurgia encontrada para este filtro</div>'; return; }

    list.innerHTML = cirurgias.map(s => {
        const cls = CARD_CLASS[s.status] || 'pending';
        const badgeCls = BADGE_CLASS[s.status] || 'waiting';
        const badgeText = statusLabels[s.status] || s.status || '-';

        return `<div class="surgery-item ${cls}">
            <div class="surgery-header">
                <span class="surgery-patient">${s.patient||'-'} ${s.age?`(${s.age}a)`:''}</span>
                <span class="surgery-badge ${badgeCls}">${badgeText}</span>
            </div>
            <div class="surgery-info">
                ${s.code?`<strong><i class="fa-solid fa-hashtag"></i></strong> ${s.code}<br>`:''}
                <strong><i class="fa-solid fa-kit-medical"></i></strong> ${(s.type||'-').replace(/\n/g,'<br><i class="fa-solid fa-kit-medical"></i> ')}<br>
                <strong><i class="fa-solid fa-calendar-day"></i></strong> ${s.date||'-'} | <strong><i class="fa-solid fa-clock"></i></strong> ${s.time||'--:--'} | <strong><i class="fa-solid fa-hospital"></i></strong> ${s.room||'-'}<br>
                <strong><i class="fa-solid fa-user-doctor"></i></strong> ${s.doctor||'-'} | <strong><i class="fa-solid fa-syringe"></i></strong> ${s.anesthetist||'-'}<br>
                <strong><i class="fa-solid fa-droplet"></i></strong> ${s.necessitaSangue==='sim'?'Sim':'Não'} | <strong><i class="fa-solid fa-bed-pulse"></i></strong> ${s.necessitaUTI==='sim'?'Sim':'Não'}
                ${s.origem==='Mutirão'&&s.mutiraoNome?`<br><strong><i class="fa-solid fa-users"></i></strong> ${s.mutiraoNome}`:''}
                ${s.observacoes?`<br><strong><i class="fa-solid fa-note-sticky"></i></strong> ${s.observacoes}`:''}
            </div>
            ${s.status==='cancelada'&&s.cancelReason?`<div class="cancel-reason"><i class="fa-solid fa-note-sticky"></i> ${s.cancelReason}</div>`:''}
            ${s.status==='suspensa'&&s.suspendReason?`<div class="cancel-reason"><i class="fa-solid fa-note-sticky"></i> ${s.suspendReason}</div>`:''}
            <div class="action-btns">
                ${botoesAcao(s)}
                <button class="btn-sm btn-sm-edit" onclick="editarCirurgia('${s.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn-sm btn-sm-delete" onclick="excluirCirurgia('${s.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

atualizarLista();
console.log('🚀 Registro de Cirurgias carregado!');
console.log('✍️ Para adicionar manualmente, digite o nome e pressione ENTER');
