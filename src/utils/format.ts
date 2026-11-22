export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
}

export function calcAge(birthDate?: string, ref = new Date()): number | '' {
  if (!birthDate) return '';
  const b = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(b.getTime())) return '';
  let age = ref.getFullYear() - b.getFullYear();
  const m = ref.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) age--;
  return age >= 0 ? age : 0;
}

const FEMALE = new Set(['MARIA','ANA','JULIA','BEATRIZ','CAMILA','CAROLINA','CRISTINA','DANIELA','FERNANDA','GABRIELA','HELENA','ISABELA','JOANA','LAURA','LETÍCIA','LUCIANA','MARCIA','MARINA','NATALIA','PATRICIA','PAULA','RAFAELA','RENATA','ROBERTA','SANDRA','SARA','SOFIA','TATIANA','VANESSA','VERA','VIVIANE','ALINE','AMANDA','BIANCA','BRUNA','CARLA','CLAUDIA','DEBORA','FABIANA','FLAVIA','GIOVANA','JULIANA','KARINA','LILIAN','LUANA','MANUELA','MICHELE','MONICA','PRISCILA','RAQUEL','REGINA','ROSANA','SILVIA','SIMONE','TANIA','VALERIA','VERONICA','ISABEL','NICOLE','NOEMI','ESTER','RUTE','EDUARDA','YASMIN','INGRID','CHARMYLLY']);
const MALE_EXC = new Set(['JOSÉ', 'ANDRÉ', 'NOÉ', 'CAUÊ', 'RENÊ']);

export function doctorTitle(name?: string): 'Dr.' | 'Dra.' {
  if (!name) return 'Dr.';
  const first = name.replace(/^(dr\.?|dra\.?)\s*/i, '').trim().split(' ')[0].toUpperCase();
  if (FEMALE.has(first)) return 'Dra.';
  if (first.endsWith('A') && !MALE_EXC.has(first)) return 'Dra.';
  return 'Dr.';
}

/** Remove o código interno ("APEN-01 - ") do procedimento, deixando só o nome. */
export function procedureNames(type?: string): string[] {
  if (!type) return [];
  return type.split('\n').map((l) => {
    const i = l.indexOf(' - ');
    return (i !== -1 ? l.slice(i + 3) : l).trim();
  }).filter(Boolean);
}

/** Primeiro nome completo + iniciais dos demais ("MARIA S. P."). */
export function abbreviateName(full?: string): string {
  if (!full) return '';
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts[0]} ${parts.slice(1).map((p) => `${p.charAt(0)}.`).join(' ')}`;
}

/** Chave segura para o Firebase (mesma regra usada nos dados existentes). */
export function safeFbKey(key: string): string {
  return key.replace(/[.#$[\]/]/g, '_');
}

export function patientKey(s: { prontuario?: string; patient?: string }): string {
  return s.prontuario?.trim() ? `P_${s.prontuario.trim()}` : `N_${(s.patient ?? '').trim().toUpperCase()}`;
}
