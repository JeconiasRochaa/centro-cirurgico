import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Activity, LineChart, Stethoscope } from 'lucide-react';
import { OperatingRoomIllustration } from '@/components/common/OperatingRoomIllustration';
import { ThemeToggle } from '@/components/common/ThemeToggle';

/**
 * Imagem do login embutida no código (base64 no build): coloque src/assets/login-bg.(jpg|jpeg|png|webp).
 * Não depende de internet nem do banco de dados. Se não existir, usa a ilustração padrão.
 */
const found = import.meta.glob('/src/assets/login-bg.{jpg,jpeg,png,webp}', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>;
const LOGIN_IMAGE: string | undefined = Object.values(found)[0];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white dark:bg-night-card lg:grid-cols-[minmax(0,1.9fr)_minmax(25rem,1fr)]">
      {/* Lado da imagem: ocupa a maior parte da tela; o texto de boas-vindas fica sobre uma faixa escura na base */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand lg:block">
        {LOGIN_IMAGE
          ? <img src={LOGIN_IMAGE} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          : <div aria-hidden className="absolute inset-x-0 top-0 flex h-[62%] items-center justify-center p-10"><OperatingRoomIllustration className="w-full max-w-xl drop-shadow-xl" /></div>}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-brand-900/95 via-brand-900/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
          <h2 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight xl:text-5xl">Bem-vindo ao seu ambiente cirúrgico.</h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/80">Centralize cirurgias, prontuários e o acompanhamento em tempo real em uma plataforma segura, feita para a rotina do centro cirúrgico.</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {([[LineChart, 'Visão em tempo real'], [Stethoscope, 'Operação integrada'], [Activity, 'Acesso auditado']] as const).map(([Icon, t]) => (
              <span key={t} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur"><Icon size={14} className="text-teal-400" /> {t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Lado do acesso: conteúdo organizado em coluna */}
      <section className="relative flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-14">
        <div className="flex items-start justify-between">
          <div className="leading-tight">
            <div className="text-xl font-extrabold tracking-tight text-brand">ExaGestão</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Centro Cirúrgico</div>
          </div>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <span className="mb-4 inline-flex w-fit items-center rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-teal-700 dark:bg-teal/15 dark:text-teal">Acesso restrito</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>

        <p className="text-center text-xs text-slate-500">Portal interno do hospital. Os acessos são registrados. <Link to="/privacidade" className="underline">Aviso de privacidade</Link></p>
      </section>
    </div>
  );
}
