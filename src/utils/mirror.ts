// Espelhos minimizados dos painéis (mesma lógica das Cloud Functions: functions/src/mirrorPure.ts). Funções puras e testáveis.

type Rec = Record<string, unknown>;
const STATUS_ESPERA = ['pendente', 'em_preparacao', 'em_andamento', 'recuperacao', 'concluida'];

const s = (v: unknown, max = 300): string | undefined => (typeof v === 'string' && v ? v.slice(0, max) : undefined);

export function abbreviateName(full?: string): string | undefined {
  if (!full) return undefined;
  const p = full.trim().split(/\s+/);
  if (p.length <= 1) return p[0]?.slice(0, 60);
  return `${p[0]} ${p.slice(1).map((x) => `${x.charAt(0)}.`).join(' ')}`.slice(0, 80);
}

function compact<T extends Rec>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as T;
}

/** `tvNomeCompleto=false` (padrão, minimização LGPD) exibe o nome abreviado também na TV. */
export function buildTV(id: string, x: Rec, tvNomeCompleto: boolean): Rec {
  const age = Number(x.age);
  const full = s(x.patient, 120);
  return compact({
    id, date: s(x.date, 10), time: s(x.time, 5), room: s(x.room, 60), status: s(x.status, 30),
    patient: tvNomeCompleto ? full : abbreviateName(full),
    age: Number.isFinite(age) && age >= 0 && age < 150 && x.age !== '' ? age : undefined,
    origem: s(x.origem, 60), clinicaOrigem: s(x.clinicaOrigem ?? x.setorSolicitante, 60),
    type: s(x.type, 600), specialty: s(x.specialty, 80), doctor: s(x.doctor, 120),
    instrumentador: s(x.instrumentador ?? x.circulante, 120), anesthetist: s(x.anesthetist, 120),
    necessitaSangue: s(x.necessitaSangue ?? x.bloodReserve, 10), necessitaUTI: s(x.necessitaUTI ?? x.needsICU, 10)
  });
}

export function buildEspera(id: string, x: Rec): Rec {
  return compact({ id, date: s(x.date, 10), time: s(x.time, 5), room: s(x.room, 60), status: s(x.status, 30), patientDisplay: abbreviateName(s(x.patient, 120)) });
}

/** Decide o que deve existir nos espelhos para uma cirurgia (null = remover). */
export function mirrorFor(id: string, x: Rec | null, today: string, tvNomeCompleto: boolean): { tv: Rec | null; espera: Rec | null } {
  if (!x || x.deletedAt || typeof x.date !== 'string' || x.date < today) return { tv: null, espera: null };
  const tv = buildTV(id, x, tvNomeCompleto);
  const espera = x.date === today && typeof x.status === 'string' && STATUS_ESPERA.includes(x.status) ? buildEspera(id, x) : null;
  return { tv, espera };
}

