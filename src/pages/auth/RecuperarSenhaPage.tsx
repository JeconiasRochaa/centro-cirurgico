import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPasswordSchema } from '@/schemas';
import { requestPasswordReset } from '@/services/auth/authService';
import { Button, Field } from '@/components/common';
import { friendlyError } from '@/utils/errors';
import { AuthShell } from './AuthShell';

type Form = z.infer<typeof resetPasswordSchema>;

export default function RecuperarSenhaPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (v: Form) => {
    setError(null);
    try { await requestPasswordReset(v.email); setSent(true); }
    catch (e) { setError(friendlyError(e)); }
  };

  return (
    <AuthShell title="Recuperar senha" subtitle="Informe o e-mail cadastrado. Se ele existir, enviaremos um link para criar uma nova senha.">
      {sent ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
          Se o e-mail estiver cadastrado, você receberá as instruções em instantes. Usuários sem e-mail cadastrado devem pedir a redefinição ao administrador.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
          <Field label="E-mail" error={errors.email?.message}><input className="input" type="email" autoComplete="email" {...register('email')} /></Field>
          <Button type="submit" className="btn-primary w-full" loading={isSubmitting}>Enviar link</Button>
        </form>
      )}
      <div className="mt-3 text-center text-sm"><Link to="/login" className="text-brand underline">Voltar ao login</Link></div>
    </AuthShell>
  );
}
