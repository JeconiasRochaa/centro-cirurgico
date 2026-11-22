import { useId, useMemo, useState } from 'react';
import type { DoctorWithKey } from '@/services/database/others';

interface Props {
  value: string;
  onChange: (v: string) => void;
  doctors: DoctorWithKey[];
  placeholder?: string;
  id?: string;
}

/** Campo de texto livre com sugestões da lista de médicos cadastrados (mín. 2 caracteres). */
export function DoctorAutocomplete({ value, onChange, doctors, placeholder, id }: Props) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const matches = useMemo(() => {
    const t = value.trim().toUpperCase();
    if (t.length < 2) return [];
    return doctors.filter((d) => `${d.name} ${d.crm}`.toUpperCase().includes(t) && d.name.toUpperCase() !== t).slice(0, 8);
  }, [value, doctors]);

  return (
    <div className="relative">
      <input
        id={id} className="input" value={value} autoComplete="off" placeholder={placeholder} role="combobox" aria-expanded={open && matches.length > 0} aria-controls={listId}
        onChange={(e) => { onChange(e.target.value.toUpperCase()); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
      />
      {open && matches.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {matches.map((d) => (
            <li key={d._key} role="option" aria-selected="false">
              <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(d.name); setOpen(false); }}>
                <strong>{d.name}</strong> <span className="ml-2 text-slate-500">{d.crm}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
