import { Stethoscope } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIdentity } from '@/hooks/useIdentity';

/** Página inicial exibida após o login: apenas a logo do hospital ao centro. */
export default function HomePage() {
  const { profile, can } = useAuth();
  const identity = useIdentity();
  const h = new Date().getHours();
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center gap-5 text-center">
      <div className="grid h-56 w-56 place-items-center overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-night-line sm:h-72 sm:w-72">
        {identity.logo ? <img src={identity.logo} alt={`Logo ${identity.hospitalName}`} className="h-full w-full object-contain" /> : <Stethoscope size={88} className="text-brand" aria-hidden />}
      </div>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand sm:text-3xl">{identity.hospitalName}</h1>
        <p className="mt-1 text-sm text-slate-500">{saudacao}, {(profile?.name ?? '').split(' ')[0]}!</p>
        {!identity.logo && can('configuracoes') && <p className="mt-2 text-xs text-slate-400">Para exibir a logo do hospital aqui, envie-a em Configurações.</p>}
      </div>
    </div>
  );
}
