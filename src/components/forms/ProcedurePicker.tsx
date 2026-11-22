import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { PROCEDIMENTOS, type Procedure } from '@/utils/procedures';

/** Converte a lista selecionada no formato gravado (linhas "CÓDIGO - NOME") e vice-versa. */
export function serializeProcedures(list: Pick<Procedure, 'codigo' | 'nome'>[]): string {
  return list.map((p) => `${p.codigo} - ${p.nome}`).join('\n');
}

export function parseProcedures(type: string | undefined): Procedure[] {
  return (type ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((linha, i) => {
    const m = linha.match(/^([A-Z0-9-]+)\s+-\s+(.+)$/);
    return m ? { codigo: m[1], nome: m[2].trim(), especialidade: '' } : { codigo: `MANUAL-${Date.now().toString(36)}-${i}`, nome: linha, especialidade: '' };
  });
}

export function ProcedurePicker({ value, onChange, error }: { value: Procedure[]; onChange: (v: Procedure[]) => void; error?: string }) {
  const [term, setTerm] = useState('');
  const q = term.trim().toUpperCase();
  const suggestions = useMemo(() => (q.length < 2 ? [] : PROCEDIMENTOS.filter((p) => (p.nome.includes(q) || p.codigo.includes(q)) && !value.some((v) => v.codigo === p.codigo)).slice(0, 8)), [q, value]);

  const add = (p: Procedure) => { onChange([...value, p]); setTerm(''); };
  const addManual = () => { if (q) add({ codigo: `MANUAL-${Date.now().toString(36)}`, nome: q, especialidade: '' }); };

  return (
    <div>
      <span className="label">Procedimentos *</span>
      <div className="relative">
        <input className="input" value={term} placeholder="Digite o nome ou código do procedimento" aria-label="Buscar procedimento"
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (suggestions[0]) add(suggestions[0]); else addManual(); } }} />
        {q.length >= 2 && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg" role="listbox">
            {suggestions.map((p) => (
              <li key={p.codigo}><button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50" onClick={() => add(p)}><Plus size={14} className="text-teal-600" /><span className="font-mono text-xs text-slate-500">{p.codigo}</span> {p.nome}</button></li>
            ))}
            <li><button type="button" className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50" onClick={addManual}><Plus size={14} /> Adicionar manualmente: “{q}”</button></li>
          </ul>
        )}
      </div>
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {value.map((p) => (
            <li key={p.codigo} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand">
              <span className="font-mono">{p.codigo}</span> {p.nome}
              <button type="button" aria-label={`Remover ${p.nome}`} onClick={() => onChange(value.filter((v) => v.codigo !== p.codigo))}><X size={12} /></button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
