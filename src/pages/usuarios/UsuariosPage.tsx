import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, KeyRound, Pencil, Plus } from 'lucide-react';
import { Badge, Button, EmptyState, ErrorState, Field, Modal, PageHeader, Spinner } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeUsers } from '@/services/database/users';
import { createUserAny, resetPasswordAny, updateUserAny } from '@/services/api/userAdmin';
import { downloadText, toCsv } from '@/utils/csv';
import { passwordSchema, userCreateSchema, userUpdateSchema, type UserCreateForm, type UserUpdateForm } from '@/schemas';
import { CLINICAS, ROLE_LABELS } from '@/utils/constants';
import { friendlyError } from '@/utils/errors';
import { ROLES, type UserProfile } from '@/types';

function CreateModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<UserCreateForm, unknown, UserCreateForm>({
    resolver: zodResolver(userCreateSchema) as never, defaultValues: { role: 'cirurgico', active: true } as UserCreateForm
  });
  const role = watch('role');
  const submit = handleSubmit(async (v) => {
    try { await createUserAny({ ...v, email: v.email || undefined, clinicaId: v.role === 'clinica' ? v.clinicaId : undefined }); toast.success('Usuário criado. Ele deverá trocar a senha no primeiro acesso.'); onClose(); }
    catch (e) { toast.error(friendlyError(e)); }
  });
  return (
    <Modal open title="Novo usuário" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field label="Nome*" error={errors.name?.message}><input className="input" {...register('name')} /></Field>
        <Field label="Usuário (login)*" error={errors.username?.message}><input className="input" autoComplete="off" {...register('username')} /></Field>
        <Field label="E-mail real (opcional, para recuperação de senha)" error={errors.email?.message}><input type="email" className="input" {...register('email')} /></Field>
        <Field label="Perfil*"><select className="input" {...register('role')}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></Field>
        {role === 'clinica' && <Field label="Clínica*" error={errors.clinicaId?.message}><select className="input" {...register('clinicaId')}><option value="">Selecione</option>{CLINICAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>}
        <Field label="Senha inicial*" error={errors.password?.message}><input type="password" autoComplete="new-password" className="input" {...register('password')} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><Button className="btn-primary" loading={isSubmitting}>Criar</Button></div>
      </form>
    </Modal>
  );
}

function EditModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const toast = useToast();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<UserUpdateForm>({
    resolver: zodResolver(userUpdateSchema), defaultValues: { name: user.name, role: user.role, clinicaId: user.clinicaId ?? '', active: user.active, mustChangePassword: !!user.mustChangePassword }
  });
  const role = watch('role');
  const submit = handleSubmit(async (v) => {
    try { await updateUserAny({ uid: user.uid, ...v, clinicaId: v.role === 'clinica' ? v.clinicaId : undefined }); toast.success('Usuário atualizado.'); onClose(); }
    catch (e) { toast.error(friendlyError(e)); }
  });
  return (
    <Modal open title={`Editar ${user.username}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field label="Nome*" error={errors.name?.message}><input className="input" {...register('name')} /></Field>
        <Field label="Perfil*"><select className="input" {...register('role')}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></Field>
        {role === 'clinica' && <Field label="Clínica*" error={errors.clinicaId?.message}><select className="input" {...register('clinicaId')}><option value="">Selecione</option>{CLINICAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('active')} /> Ativo (desmarque para bloquear o acesso; contas não são apagadas)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('mustChangePassword')} /> Exigir troca de senha no próximo login</label>
        <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><Button className="btn-primary" loading={isSubmitting}>Salvar</Button></div>
      </form>
    </Modal>
  );
}

function ResetModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const check = passwordSchema.safeParse(pw);
  async function go() {
    if (!check.success) { toast.error(check.error.issues[0].message); return; }
    setBusy(true);
    try { await resetPasswordAny(user.uid, pw); toast.success('Senha redefinida. O usuário deverá trocá-la no próximo acesso.'); onClose(); }
    catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <Modal open title={`Redefinir senha de ${user.username}`} onClose={onClose}>
      <Field label="Nova senha provisória"><input type="password" autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
      <div className="mt-4 flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button className="btn-primary" loading={busy} onClick={go}>Redefinir</Button></div>
    </Modal>
  );
}


/** Cria uma conta por clínica (login compartilhado pela equipe da clínica), com senha provisória aleatória. */
function ClinicasBulkModal({ existing, onClose }: { existing: Set<string>; onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ clinica: string; usuario: string; senha: string; status: string }[] | null>(null);
  const gen = () => { const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = crypto.getRandomValues(new Uint32Array(10)); return Array.from(r, (n) => a[n % a.length]).join('') + '7a'; };
  async function go() {
    setBusy(true);
    const out: { clinica: string; usuario: string; senha: string; status: string }[] = [];
    for (const c of CLINICAS) {
      const usuario = c.id;
      if (existing.has(usuario)) { out.push({ clinica: c.nome, usuario, senha: '-', status: 'já existe (ignorada)' }); continue; }
      const senha = gen();
      try { await createUserAny({ name: c.nome, username: usuario, role: 'clinica', clinicaId: c.id, password: senha, active: true }); out.push({ clinica: c.nome, usuario, senha, status: 'criada' }); }
      catch (e) { out.push({ clinica: c.nome, usuario, senha: '-', status: friendlyError(e) }); }
    }
    setDone(out); setBusy(false);
    toast.success('Processo concluído. Copie as senhas agora: não serão exibidas novamente.');
  }
  return (
    <Modal open wide title="Criar uma conta para cada clínica" onClose={onClose}>
      {!done ? (<>
        <p className="mb-2 text-sm text-slate-600">Será criado <b>um login por clínica</b> (usuário = identificador da clínica, ex.: <code>pediatria</code>), compartilhado pela equipe daquela clínica. Cada clínica só enxerga as próprias solicitações. Cada conta recebe uma senha provisória aleatória e deverá trocá-la no primeiro acesso.</p>
        <p className="mb-3 text-xs text-slate-500">Contas já existentes são ignoradas. Total de clínicas: {CLINICAS.length}.</p>
        <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Cancelar</button><Button className="btn-primary" loading={busy} onClick={go}>Criar contas</Button></div>
      </>) : (<>
        <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2">Clínica</th><th className="p-2">Usuário</th><th className="p-2">Senha provisória</th><th className="p-2">Situação</th></tr></thead>
          <tbody>{done.map((r) => <tr key={r.usuario} className="border-t border-slate-100"><td className="p-2">{r.clinica}</td><td className="p-2 font-mono">{r.usuario}</td><td className="p-2 font-mono">{r.senha}</td><td className="p-2">{r.status}</td></tr>)}</tbody></table></div>
        <p className="mt-2 text-xs text-red-700">Guarde estas senhas em local seguro e entregue a cada clínica por canal seguro. Elas não podem ser consultadas depois.</p>
        <div className="mt-3 flex justify-end gap-2"><button className="btn-secondary" onClick={() => downloadText('contas-clinicas.csv', toCsv(['Clínica', 'Usuário', 'Senha provisória', 'Situação'], done.map((r) => [r.clinica, r.usuario, r.senha, r.status])))}>Baixar CSV</button><button className="btn-primary" onClick={onClose}>Fechar</button></div>
      </>)}
    </Modal>
  );
}

export default function UsuariosPage() {
  const { data, loading, error } = useSubscription<UserProfile[]>((cb, e) => subscribeUsers(cb, e), []);
  const [modal, setModal] = useState<{ kind: 'new' | 'clinicas' } | { kind: 'edit' | 'reset'; user: UserProfile } | null>(null);
  return (
    <div>
      <PageHeader title="Usuários" subtitle="Contas e perfis são gerenciados somente por administradores. Senhas ficam apenas no Firebase Authentication."
        actions={<><button className="btn-secondary" onClick={() => setModal({ kind: 'clinicas' })}><Building2 size={16} /> Criar contas das clínicas</button><button className="btn-primary" onClick={() => setModal({ kind: 'new' })}><Plus size={16} /> Novo usuário</button></>} />
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : data.length === 0 ? <EmptyState /> : (
        <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Nome</th><th className="p-3">Usuário</th><th className="p-3">Perfil</th><th className="p-3">Situação</th><th className="p-3" /></tr></thead>
          <tbody>{data.map((u) => (
            <tr key={u.uid} className="border-t border-slate-100"><td className="p-3 font-medium">{u.name}</td><td className="p-3">{u.username}</td><td className="p-3">{ROLE_LABELS[u.role] ?? u.role}</td><td className="p-3"><Badge tone={u.active ? 'ok' : 'cancelada'}>{u.active ? 'Ativo' : 'Inativo'}</Badge></td>
              <td className="p-3"><div className="flex justify-end gap-1"><button className="btn-secondary btn-sm" aria-label="Editar" onClick={() => setModal({ kind: 'edit', user: u })}><Pencil size={14} /></button><button className="btn-secondary btn-sm" aria-label="Redefinir senha" onClick={() => setModal({ kind: 'reset', user: u })}><KeyRound size={14} /></button></div></td></tr>))}</tbody>
        </table></div>
      )}
      {modal?.kind === 'clinicas' && <ClinicasBulkModal existing={new Set(data.map((u) => u.username))} onClose={() => setModal(null)} />}
      {modal?.kind === 'new' && <CreateModal onClose={() => setModal(null)} />}
      {modal?.kind === 'edit' && <EditModal user={modal.user} onClose={() => setModal(null)} />}
      {modal?.kind === 'reset' && <ResetModal user={modal.user} onClose={() => setModal(null)} />}
    </div>
  );
}
