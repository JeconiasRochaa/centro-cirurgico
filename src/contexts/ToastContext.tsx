import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: Kind; text: string }
interface ToastApi { success: (t: string) => void; error: (t: string) => void; info: (t: string) => void }

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, kind, text }]);
    window.setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);
  const api = useMemo<ToastApi>(() => ({ success: (t) => push('success', t), error: (t) => push('error', t), info: (t) => push('info', t) }), [push]);
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };
  const color = { success: 'border-emerald-300 bg-emerald-50 text-emerald-800', error: 'border-red-300 bg-red-50 text-red-800', info: 'border-sky-300 bg-sky-50 text-sky-800' };
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => {
          const I = Icon[t.kind];
          return <div key={t.id} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow ${color[t.kind]}`}><I size={18} className="mt-0.5 shrink-0" /><span>{t.text}</span></div>;
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return v;
}
