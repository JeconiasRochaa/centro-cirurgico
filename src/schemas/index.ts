import { z } from 'zod';
import { ROLES, SURGERY_STATUSES } from '@/types';

const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const yesNoMaybe = z.enum(['sim', 'nao', 'talvez']);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');
const timeStr = z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido');

export const MIN_PASSWORD_LENGTH = 10;

export const passwordSchema = z.string()
  .min(MIN_PASSWORD_LENGTH, `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`)
  .max(128)
  .regex(/[a-zA-Z]/, 'Use ao menos uma letra')
  .regex(/\d/, 'Use ao menos um número');

export const loginSchema = z.object({
  identifier: text(120).min(3, 'Informe seu usuário ou e-mail'),
  password: z.string().min(1, 'Informe a senha').max(128)
});
export type LoginForm = z.infer<typeof loginSchema>;

export const resetPasswordSchema = z.object({ email: z.string().trim().email('E-mail inválido') });

export const changePasswordSchema = z.object({
  current: z.string().min(1, 'Informe a senha atual'),
  next: passwordSchema,
  confirm: z.string()
}).refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'As senhas não coincidem' })
  .refine((v) => v.next !== v.current, { path: ['next'], message: 'A nova senha deve ser diferente da atual' });
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export const surgerySchema = z.object({
  origem: text(60).min(1, 'Selecione a origem'),
  mutiraoNome: optText(120),
  patient: text(300).min(3, 'Informe o nome do paciente'),
  prontuario: optText(40),
  birthDate: dateStr.or(z.literal('')).optional(),
  age: z.union([z.string(), z.number()]).optional(),
  type: text(3000).min(1, 'Adicione pelo menos um procedimento'),
  date: dateStr,
  time: timeStr.or(z.literal('')).optional(),
  specialty: optText(80),
  doctor: optText(120),
  instrumentador: optText(120),
  anesthetist: optText(120),
  room: optText(60),
  necessitaSangue: yesNoMaybe.default('nao'),
  necessitaUTI: yesNoMaybe.default('nao'),
  materiaisEspeciais: optText(1000),
  observacoes: optText(3000)
}).refine((v) => v.origem !== 'Mutirão' || !!v.mutiraoNome, { path: ['mutiraoNome'], message: 'Informe o nome do mutirão' });
export type SurgeryForm = z.infer<typeof surgerySchema>;

/** Solicitação feita por uma clínica (campos mínimos; sala/equipe são definidos pelo centro cirúrgico). */
export const clinicSurgerySchema = surgerySchema;

export const statusSchema = z.enum(SURGERY_STATUSES);

export const reasonSchema = z.object({ reason: text(500).min(5, 'Informe o motivo (mínimo 5 caracteres)') });

export const patientSchema = z.object({
  nome: text(300).min(3, 'Informe o nome completo'),
  prontuario: text(40).min(1, 'Informe o prontuário'),
  dataNascimento: dateStr.or(z.literal('')).optional(),
  sexo: optText(20),
  cpf: z.string().trim().regex(/^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})?$/, 'CPF inválido').optional().or(z.literal('')),
  contato: optText(40),
  endereco: optText(300),
  tipoSanguineo: optText(5),
  alergias: optText(500),
  observacoes: optText(2000),
  emergenciaNome: optText(120),
  emergenciaTelefone: optText(40)
});
export type PatientForm = z.infer<typeof patientSchema>;

export const absenceSchema = z.object({
  patient: text(300).min(3, 'Informe o paciente'),
  date: dateStr,
  municipio: optText(120),
  procedure: optText(500),
  reason: optText(1000)
});
export type AbsenceForm = z.infer<typeof absenceSchema>;

export const doctorSchema = z.object({ name: text(120).min(3, 'Informe o nome'), crm: text(40).min(3, 'Informe o CRM') });
export type DoctorForm = z.infer<typeof doctorSchema>;

const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, '3–32 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado');

export const userCreateSchema = z.object({
  name: text(120).min(3, 'Informe o nome'),
  username: usernameSchema,
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  role: z.enum(ROLES),
  clinicaId: z.string().optional(),
  password: passwordSchema,
  active: z.boolean().default(true)
}).refine((v) => v.role !== 'clinica' || !!v.clinicaId, { path: ['clinicaId'], message: 'Selecione a clínica' });
export type UserCreateForm = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: text(120).min(3, 'Informe o nome'),
  role: z.enum(ROLES),
  clinicaId: z.string().optional(),
  active: z.boolean(),
  mustChangePassword: z.boolean()
}).refine((v) => v.role !== 'clinica' || !!v.clinicaId, { path: ['clinicaId'], message: 'Selecione a clínica' });
export type UserUpdateForm = z.infer<typeof userUpdateSchema>;

export const identitySchema = z.object({ systemName: text(80).min(2), hospitalName: text(160).min(2) });
