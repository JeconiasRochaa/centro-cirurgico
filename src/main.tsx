import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import { initTheme } from '@/hooks/useTheme';

initTheme();

const REQUIRED = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_DATABASE_URL', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'] as const;
const root = createRoot(document.getElementById('root')!);

function showConfigError(missing: string[]) {
  root.render(
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-xl">
        <h1 className="mb-2 text-lg font-bold text-brand">Configuração do Firebase ausente</h1>
        <p className="mb-2 text-sm text-slate-600">Preencha o arquivo <code>.env.local</code> (copie de <code>.env.example</code>) com os dados do app web do seu projeto Firebase e reinicie com <code>npm run dev</code>.</p>
        <p className="text-sm text-slate-600">Variáveis faltando:</p>
        <ul className="mt-1 list-inside list-disc text-sm font-mono text-red-700">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
      </div>
    </div>
  );
}

const missing = REQUIRED.filter((k) => !String(import.meta.env[k] ?? '').trim());
if (missing.length) {
  showConfigError([...missing]);
} else {
  // Importação tardia: o Firebase só é inicializado quando a configuração existe.
  void Promise.all([
    import('react'), import('@/contexts/AuthContext'), import('@/contexts/ToastContext'), import('@/routes'), import('@/components/common/ErrorBoundary')
  ]).then(([{ StrictMode }, { AuthProvider }, { ToastProvider }, { AppRouter }, { ErrorBoundary }]) => {
    root.render(
      <StrictMode><ErrorBoundary><ToastProvider><AuthProvider><AppRouter /></AuthProvider></ToastProvider></ErrorBoundary></StrictMode>
    );
  }).catch((e) => { console.error(e); showConfigError(['(erro ao iniciar — veja o console do navegador)']); });
}
