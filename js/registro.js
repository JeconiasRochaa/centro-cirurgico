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

// ============ AUTOCOMPLETE FUNCIONAL ============
const procInput = document.getElementById('surgeryTypeInput');
const suggestionsBox = document.getElementById('suggestionsBox');
const selectedProceduresDiv = document.getElementById('selectedProcedures');
const proceduresList = document.getElementById('proceduresList');
const surgeryTypeHidden = document.getElementById('surgeryType');

if (procInput) {
    procInput.addEventListener('input', function() {
        const valor = this.value.trim();
        if (valor.length < 1) { suggestionsBox.classList.remove('show'); return; }
        
        const valorUpper = valor.toUpperCase();
        const sugestoes = PROCEDIMENTOS.filter(p => {
            return (p.nome.toUpperCase().includes(valorUpper) || p.codigo.toUpperCase().includes(valorUpper)) &&
                   !procedimentosSelecionados.find(ps => ps.codigo === p.codigo);
        }).slice(0, 8);

        let html = '';
        if (sugestoes.length > 0) {
            html += sugestoes.map(p => `
                <div class="suggestion-item" onclick="addProc('${p.nome.replace(/'/g,"\\'")}','${p.especialidade.replace(/'/g,"\\'")}','${p.codigo}')">
                    <span style="color:#3b82f6;font-weight:700;font-size:11px;">${p.codigo}</span>
                    <span>${p.nome}</span>
                    <small style="color:#64748b;margin-left:auto;">${p.especialidade}</small>
                </div>
            `).join('');
        }
        if (valor.length >= 3) {
            html += `<div class="suggestion-item" onclick="addManual('${valorUpper.replace(/'/g,"\\'")}')" style="background:#f0fdf4;border-left:3px solid #10b981;font-weight:600;">
                ✍️ <strong>ADICIONAR MANUALMENTE: "${valorUpper}"</strong>
            </div>`;
        }
        suggestionsBox.innerHTML = html || '<div class="suggestion-item" style="color:#94a3b8;">📭 Digite mais caracteres...</div>';
        suggestionsBox.classList.add('show');
    });

    document.addEventListener('click', (e) => {
        if (!procInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.classList.remove('show');
        }
    });

    procInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const first = suggestionsBox.querySelector('.suggestion-item');
            if (first) { first.click(); }
            else if (this.value.trim().length >= 3) { addManual(this.value.trim().toUpperCase()); }
        }
    });
}

// Funções globais
window.addProc = function(nome, especialidade, codigo) {
    procedimentosSelecionados.push({nome, especialidade, codigo});
    updateProcList();
    procInput.value = '';
    suggestionsBox.classList.remove('show');
    procInput.focus();
};

window.addManual = function(nome) {
    if (nome.length < 3) return;
    const codigo = 'M-' + Date.now().toString(36).toUpperCase().slice(-6);
    procedimentosSelecionados.push({nome, especialidade:'', codigo});
    updateProcList();
    procInput.value = '';
    suggestionsBox.classList.remove('show');
    procInput.focus();
};

window.removeProc = function(codigo) {
    procedimentosSelecionados = procedimentosSelecionados.filter(p => p.codigo !== codigo);
    updateProcList();
};

function updateProcList() {
    if (procedimentosSelecionados.length === 0) {
        selectedProceduresDiv.style.display = 'none';
        proceduresList.innerHTML = '';
        surgeryTypeHidden.value = '';
    } else {
        selectedProceduresDiv.style.display = 'block';
        proceduresList.innerHTML = procedimentosSelecionados.map(p => `
            <span class="procedure-tag">
                <strong>${p.codigo}</strong> - ${p.nome.substring(0,40)}
                <span class="remove-tag" onclick="removeProc('${p.codigo}')">✕</span>
            </span>
        `).join('');
        surgeryTypeHidden.value = procedimentosSelecionados.map(p => `${p.codigo} - ${p.nome}`).join('\n');
        if (procedimentosSelecionados.length === 1 && procedimentosSelecionados[0].especialidade) {
            document.getElementById('specialty').value = procedimentosSelecionados[0].especialidade;
        }
    }
}

// ============ CALCULAR IDADE ============
window.calcularIdade = function() {
    const bd = document.getElementById('birthDate').value;
    if (!bd) { document.getElementById('age').value = ''; return; }
    document.getElementById('age').value = calculateAge(bd);
};

// ============ CRUD ============
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
                const proc = PROCEDIMENTOS.find(p => p.codigo === match[1]);
                procedimentosSelecionados.push({ 
                    codigo: match[1], 
                    nome: match[2].trim(), 
                    especialidade: proc ? proc.especialidade : (s.specialty || '') 
                });
            } else if (linha.trim()) {
                procedimentosSelecionados.push({ 
                    codigo: 'M-' + Date.now().toString(36).toUpperCase().slice(-6), 
                    nome: linha.trim(), 
                    especialidade: s.specialty || '' 
                });
            }
        });
    }
    updateProcList();
    
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
    updateProcList();
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
                <strong>🩸</strong> ${s.necessitaSangue==='sim'?'Sim':s.necessitaSangue==='talvez'?'Possível':'Não'} | 
                <strong>🏨</strong> ${s.necessitaUTI==='sim'?'Sim':s.necessitaUTI==='talvez'?'Possível':'Não'}
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
console.log('💡 Digite no campo Procedimentos para buscar');
console.log('✍️ Para adicionar manualmente, digite o nome e pressione ENTER');
