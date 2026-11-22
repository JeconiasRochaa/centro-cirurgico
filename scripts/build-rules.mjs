// Gera database.rules.json a partir de uma descrição legível. Rode: node scripts/build-rules.mjs
// Modelo: o perfil (role/active/clinicaId) é lido NO SERVIDOR em users/{uid}; o cliente não consegue alterá-lo
// (users/* só é gravado por Cloud Functions). Todas as gravações de dados exigem updatedBy == auth.uid e
// updatedAt == now (carimbo do servidor), o que permite à função de auditoria atribuir cada alteração a um usuário.
import { writeFileSync } from 'node:fs';

const U = (f) => `root.child('users').child(auth.uid).child('${f}').val()`;
const ACTIVE = `auth != null && ${U('active')} === true`;
const role = (...rs) => '(' + rs.map((r) => `${U('role')} === '${r}'`).join(' || ') + ')';
const A = (...rs) => `${ACTIVE} && ${role(...rs)}`;

const ROLES = ['admin', 'diretor', 'cirurgico', 'enfermagem', 'faturamento', 'clinica', 'painel_tv', 'painel_espera'];
const INTERNAL_READ = ['admin', 'diretor', 'cirurgico', 'enfermagem', 'faturamento'];
const OWN_CLINIC = U('clinicaId');
const STAMP = `newData.child('updatedBy').val() === auth.uid && newData.child('updatedAt').val() === now`;

const str = (n) => `newData.isString() && newData.val().length <= ${n}`;
const strMin = (n, m) => `newData.isString() && newData.val().length >= ${n} && newData.val().length <= ${m}`;
const anyScalar = `(newData.isString() && newData.val().length <= 3000) || newData.isNumber() || newData.isBoolean()`;
const yesNo = `newData.val() === 'sim' || newData.val() === 'nao' || newData.val() === 'talvez'`;

const STATUSES = ['pendente', 'em_preparacao', 'em_andamento', 'recuperacao', 'concluida', 'suspensa', 'cancelada'];
const SURGERY_FIELDS = {
  id: str(200), code: str(40), origem: str(60), mutiraoNome: str(120), patient: strMin(1, 300), prontuario: str(40),
  birthDate: str(10), age: `${str(10)} || newData.isNumber()`, type: str(3000), date: `newData.isString() && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)`,
  time: str(5), specialty: str(80), doctor: str(120), instrumentador: str(120), circulante: str(120), anesthetist: str(120), room: str(60),
  necessitaSangue: yesNo, necessitaUTI: yesNo, bloodReserve: str(20), needsICU: str(20), materiaisEspeciais: str(1000), observacoes: str(3000),
  status: STATUSES.map((s) => `newData.val() === '${s}'`).join(' || '), cancelReason: str(500), suspendReason: str(500),
  clinicaId: str(60), setorSolicitante: str(80), clinicaOrigem: str(80), dataSolicitacao: str(40),
  createdBy: str(128), updatedBy: str(128), updatedAt: 'newData.isNumber()',
  deletedAt: 'newData.isNumber()', deletedBy: str(128), deleteReason: strMin(5, 500)
};
// Enfermagem só pode alterar estes campos (os demais precisam permanecer idênticos)
const NURSE_EDITABLE = new Set(['status', 'cancelReason', 'suspendReason', 'updatedBy', 'updatedAt']);
const nurseLocked = Object.keys(SURGERY_FIELDS).filter((f) => !NURSE_EDITABLE.has(f))
  .map((f) => `newData.child('${f}').val() === data.child('${f}').val()`).join(' && ');

const surgeriesWrite = [
  `newData.exists()`, // nunca apagar fisicamente
  `(` + [
    `(${A('admin', 'diretor', 'cirurgico')})`,
    `(${A('enfermagem')} && data.exists())`,
    `(${A('clinica')} && newData.child('clinicaId').val() === ${OWN_CLINIC} && (!data.exists() || (data.child('clinicaId').val() === ${OWN_CLINIC} && data.child('status').val() === 'pendente')))`
  ].join(' || ') + `)`
].join(' && ');

const surgeriesValidate = [
  `newData.hasChildren(['id','patient','date','type','status','updatedBy','updatedAt'])`,
  `newData.child('id').val() === $id`,
  STAMP,
  // enfermagem: apenas status
  `(${U('role')} !== 'enfermagem' || (${nurseLocked}))`,
  // clínica: somente solicitações pendentes, sem exclusão lógica
  `(${U('role')} !== 'clinica' || (newData.child('status').val() === 'pendente' && !newData.child('deletedAt').exists()))`,
  // exclusão lógica: só administrador/diretor, com carimbo do servidor, autor e motivo
  `(data.child('deletedAt').val() === newData.child('deletedAt').val() || (${role('admin', 'diretor')} && (!newData.child('deletedAt').exists() || (newData.child('deletedAt').val() === now && newData.child('deletedBy').val() === auth.uid && newData.child('deleteReason').exists()))))`
].join(' && ');

const fieldRules = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { '.validate': v }]));

const PATIENT_FIELDS = {
  nome: strMin(1, 300), prontuario: strMin(1, 40), dataNascimento: str(10), idade: `${str(10)} || newData.isNumber()`, sexo: str(20),
  cpf: str(14), contato: str(40), endereco: str(300), tipoSanguineo: str(5), alergias: str(500), observacoes: str(2000),
  emergenciaNome: str(120), emergenciaTelefone: str(40), atualizadoEm: str(40), atualizadoPor: str(128), updatedBy: str(128), updatedAt: 'newData.isNumber()'
};
const ABSENCE_FIELDS = {
  id: str(200), patient: strMin(1, 300), date: str(10), municipio: str(120), procedure: str(500), reason: str(1000),
  registradoPor: str(128), criadoEm: str(40), updatedBy: str(128), updatedAt: 'newData.isNumber()'
};

const MIRROR_COMMON = {
  id: str(200), date: `newData.isString() && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)`, time: str(5), room: str(60),
  status: STATUSES.map((s) => `newData.val() === '${s}'`).join(' || ')
};
const mirrorValidate = `newData.hasChildren(['id','date','status']) && newData.child('id').val() === $id`;
const withOther = (fields) => ({ ...fieldRules(fields), $other: { '.validate': anyScalar } });

const own = '$uid === auth.uid';
const rules = {
  rules: {
    '.read': false,
    '.write': false,

    // Perfis: lidos pelo próprio usuário. Criados/alterados por Cloud Functions (Admin SDK) OU, como alternativa quando as
    // funções não estão publicadas, por um ADMINISTRADOR ativo — nunca por si mesmo (ninguém altera o próprio perfil/papel).
    users: {
      '.read': A('admin'),
      $uid: {
        '.read': `auth != null && auth.uid === $uid`,
        '.write': `${A('admin')} && $uid !== auth.uid`,
        '.validate': `newData.hasChildren(['name','username','role','active']) && (${ROLES.map((r) => `newData.child('role').val() === '${r}'`).join(' || ')}) && (newData.child('role').val() !== 'clinica' || (newData.child('clinicaId').isString() && newData.child('clinicaId').val().length > 0))`,
        name: { '.validate': strMin(1, 120) }, username: { '.validate': strMin(3, 32) }, email: { '.validate': str(160) },
        role: { '.validate': 'newData.isString()' }, active: { '.validate': 'newData.isBoolean()' },
        clinicaId: { '.validate': str(60) }, createdAt: { '.validate': 'newData.isNumber()' },
        $other: { '.validate': false },
        mustChangePassword: { '.write': `auth != null && ${own} && newData.val() === false`, '.validate': 'newData.isBoolean()' },
        termoVersao: { '.write': `auth != null && ${own}`, '.validate': str(20) },
        termoAceitoEm: { '.write': `auth != null && ${own} && newData.val() === now`, '.validate': 'newData.isNumber()' }
      }
    },

    surgeries: {
      '.read': `(${A(...INTERNAL_READ)}) || (${A('clinica')} && query.orderByChild === 'clinicaId' && query.equalTo === ${OWN_CLINIC})`,
      '.indexOn': ['clinicaId', 'date'],
      $id: {
        '.read': `(${A(...INTERNAL_READ)}) || (${A('clinica')} && data.child('clinicaId').val() === ${OWN_CLINIC})`,
        '.write': surgeriesWrite,
        '.validate': surgeriesValidate,
        ...withOther(SURGERY_FIELDS)
      }
    },

    // Prontuários: sem acesso para faturamento e clínicas; sem exclusão física.
    patients: {
      '.read': A('admin', 'diretor', 'cirurgico', 'enfermagem'),
      $key: {
        '.write': `newData.exists() && (${A('admin', 'diretor', 'cirurgico')})`,
        '.validate': `newData.hasChildren(['nome','prontuario','updatedBy','updatedAt']) && ${STAMP}`,
        ...withOther(PATIENT_FIELDS)
      }
    },

    absences: {
      '.read': A(...INTERNAL_READ),
      $id: {
        '.write': `(newData.exists() && (${A('admin', 'diretor', 'cirurgico')})) || (!newData.exists() && (${A('admin', 'diretor')}))`,
        '.validate': `newData.hasChildren(['id','patient','date','updatedBy','updatedAt']) && newData.child('id').val() === $id && ${STAMP}`,
        ...withOther(ABSENCE_FIELDS)
      }
    },

    counters: { '.read': A('admin', 'diretor', 'cirurgico'), '.write': A('admin', 'diretor', 'cirurgico') },

    // Trilha de auditoria: escrita só pelo servidor (Cloud Functions); leitura só para direção.
    audit_logs: { '.read': A('admin', 'diretor'), '.indexOn': ['ts'] },

    // Consultas a prontuário: somente inclusão, com identidade e horário do servidor.
    access_logs: {
      '.read': A('admin', 'diretor'),
      $id: {
        '.write': `${ACTIVE} && !data.exists() && newData.exists()`,
        '.validate': `newData.hasChildren(['uid','entity','entityId','ts']) && newData.child('uid').val() === auth.uid && newData.child('ts').val() === now && (newData.child('entity').val() === 'patients' || newData.child('entity').val() === 'surgeries') && ${'newData.child(\'entityId\').isString() && newData.child(\'entityId\').val().length <= 200'}`,
        $other: { '.validate': false }
      }
    },

    // Configurações: leitura para qualquer usuário ativo; escrita só do administrador.
    // Configurações: leitura (por nó, nunca na raiz) para qualquer usuário ativo; escrita só do administrador.
    // Não há '.read' em "settings": um nó legado (ex.: settings/users) jamais pode ficar legível por herança.
    settings: {
      logo: { '.read': ACTIVE, '.write': A('admin'), '.validate': 'newData.isString() && newData.val().length <= 1500000' },
      govLogo: { '.read': ACTIVE, '.write': A('admin'), '.validate': 'newData.isString() && newData.val().length <= 1500000' },
      systemName: { '.read': ACTIVE, '.write': A('admin'), '.validate': str(80) },
      hospitalName: { '.read': ACTIVE, '.write': A('admin'), '.validate': str(160) },
      salaEsperaAtiva: { '.read': ACTIVE, '.write': A('admin'), '.validate': 'newData.isBoolean()' },
      doctors: {
        '.read': ACTIVE,
        '.write': A('admin'),
        $d: { name: { '.validate': strMin(1, 120) }, crm: { '.validate': strMin(1, 40) }, $other: { '.validate': false } }
      },
      lgpd: {
        '.read': ACTIVE, '.write': A('admin'),
        retencaoAnos: { '.validate': 'newData.isNumber() && newData.val() >= 5 && newData.val() <= 100' },
        tvNomeCompleto: { '.validate': 'newData.isBoolean()' }
      }
    },

    // Espelhos minimizados dos painéis — mantidos por Cloud Functions (Admin SDK) e/ou, quando as funções não estão publicadas,
    // pelo navegador da equipe (admin/diretor/cirurgico), que só consegue gravar os campos minimizados abaixo.
    // Leitura só para contas de painel e equipe.
    painel_tv: {
      '.read': `${ACTIVE} && ${role('painel_tv', 'admin', 'diretor', 'cirurgico', 'enfermagem')}`,
      $id: {
        '.write': A('admin', 'diretor', 'cirurgico'),
        '.validate': mirrorValidate,
        ...fieldRules({ ...MIRROR_COMMON, patient: str(120), age: 'newData.isNumber()', origem: str(60), clinicaOrigem: str(60), type: str(600), specialty: str(80),
          doctor: str(120), instrumentador: str(120), anesthetist: str(120), necessitaSangue: str(10), necessitaUTI: str(10) }),
        $other: { '.validate': false }
      }
    },
    painel_espera: {
      '.read': `${ACTIVE} && ${role('painel_espera', 'admin', 'diretor', 'cirurgico')}`,
      $id: {
        '.write': A('admin', 'diretor', 'cirurgico'),
        '.validate': mirrorValidate,
        ...fieldRules({ ...MIRROR_COMMON, patientDisplay: str(80) }),
        $other: { '.validate': false }
      }
    }
  }
};

writeFileSync(new URL('../database.rules.json', import.meta.url), JSON.stringify(rules, null, 2) + '\n');
console.log('database.rules.json gerado.');
