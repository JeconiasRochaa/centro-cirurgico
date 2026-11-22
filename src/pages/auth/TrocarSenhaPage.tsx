import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, MIN_PASSWORD_LENGTH, type ChangePasswordForm } from '@/schemas';
import { changeOwnPassword } from '@/services/auth/authService';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Field } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { friendlyError } from '@/utils/errors';
import { homeFor } from '@/utils/permissions';
import { AuthShell } from './AuthShell';

export default function TrocarSenhaPage() {
  const { profile, refreshProfile, logout } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (v: ChangePasswordForm) => {
    setError(null);
    try {
      await changeOwnPassword(v.current, v.next);
      await refreshProfile();
      toast.success('Senha alterada com sucesso.');
      nav(profile ? homeFor(profile.role) : '/', { replace: true });
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(code === 'auth/invalid-credential' || code === 'auth/wrong-password' ? 'A senha atual está incorreta.' : friendlyError(e));
    }
  };

  return (
    <AuthShell title={profile?.mustChangePassword ? 'Troca de senha obrigatória' : 'Alterar senha'} subtitle={`Defina uma nova senha com no mínimo ${MIN_PASSWORD_LENGTH} caracteres, com letras e números.`}>
      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <Field label="Senha atual" error={errors.current?.message}><input className="input" type="password" autoComplete="current-password" {...register('current')} /></Field>
        <Field label="Nova senha" error={errors.next?.message}><input className="input" type="password" autoComplete="new-password" {...register('next')} /></Field>
        <Field label="Confirmar nova senha" error={errors.confirm?.message}><input className="input" type="password" autoComplete="new-password" {...register('confirm')} /></Field>
        <Button type="submit" className="btn-primary w-full" loading={isSubmitting}>Salvar nova senha</Button>
      </form>
      <div className="mt-3 text-center text-sm"><button className="text-brand underline" onClick={() => logout()}>Sair</button></div>
    </AuthShell>
  );
}
