import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { loginSchema, type LoginForm } from '@/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Field } from '@/components/common';
import { friendlyError } from '@/utils/errors';
import { homeFor } from '@/utils/permissions';
import { AuthShell } from './AuthShell';

/** Aceita apenas caminhos internos como destino pós-login (evita redirecionamento aberto). */
export function safeRedirect(from: unknown, fallback: string): string {
  return typeof from === 'string' && /^\/[a-zA-Z0-9\-_/]*$/.test(from) && !from.startsWith('//') ? from : fallback;
}

export default function LoginPage() {
  const { profile, login, expired, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [persistent, setPersistent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (!loading && profile) return <Navigate to={homeFor(profile.role)} replace />;

  const onSubmit = async (v: LoginForm) => {
    setError(null);
    try {
      const p = await login(v.identifier, v.password, persistent);
      nav(safeRedirect((loc.state as { from?: string } | null)?.from, homeFor(p.role)), { replace: true });
    } catch (e) {
      setError(friendlyError(e, 'Não foi possível entrar agora. Tente novamente.'));
    }
  };

  return (
    <AuthShell title="Entrar no sistema" subtitle="Utilize suas credenciais para continuar para a área inicial e escolher seu destino.">
      {expired && <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800" role="alert">Sua sessão foi encerrada por inatividade. Entre novamente.</div>}
      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <Field label="Usuário" error={errors.identifier?.message}>
          <input className="input" autoComplete="username" autoCapitalize="none" {...register('identifier')} />
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          <div className="relative">
            <input className="input pr-10" type={show ? 'text' : 'password'} autoComplete="current-password" {...register('password')} />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </Field>
        <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={persistent} onChange={(e) => setPersistent(e.target.checked)} /> Manter conectado (somente aparelhos de painel/TV)</label>
        <Button type="submit" className="btn-primary w-full py-3 text-base" loading={isSubmitting}>Entrar</Button>
      </form>
      <div className="mt-3 text-center text-sm"><Link to="/recuperar-senha" className="text-brand underline">Esqueci minha senha</Link></div>
    </AuthShell>
  );
}
