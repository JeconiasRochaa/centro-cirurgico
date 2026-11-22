# Arquitetura

```
Navegador (React/Vite) ──Auth──▶ Firebase Authentication (senhas só aqui)
        │  leituras/gravações permitidas pelas Security Rules (perfil lido de users/{uid})
        ├──▶ Realtime Database ◀── Cloud Functions (Admin SDK): perfis, auditoria, espelhos dos painéis, LGPD
        └──▶ Cloud Functions (callables): createUser, updateUser, resetUserPassword, exportTitularData, anonymizeTitular, rebuildPaineis
```

## Camadas do código (`src/`)
`pages` (telas) → `components` → `hooks`/`contexts` → `services` (`firebase`, `auth`, `database`, `api`) → `utils`/`schemas`/`types`.
Rotas lazy com `ProtectedRoute` (sessão, troca de senha pendente, aceite do termo, permissão). **A proteção real é feita pelas regras e funções**; a interface só reflete.

## Decisões de segurança
| Tema | Decisão |
|---|---|
| Autenticação | Firebase Auth (e-mail/senha). Login por “usuário” vira `<usuario>@usuarios.hrpi.local`; e-mail real opcional p/ recuperação. Nenhuma senha em banco/código. Política: ≥10 caracteres, letra+número. Sessão por aba; inatividade 30 min (exceto contas de painel). |
| Perfis | `users/{uid}` é escrito por Cloud Functions ou, sem elas, por um **administrador ativo** (nunca por si mesmo). Nenhum outro usuário consegue elevar o próprio perfil (só `mustChangePassword→false` e aceite do termo). Funções, quando publicadas, revalidam o perfil do chamador no servidor. |
| Regras | Raiz `false`; nada público. Cada nó lê o papel em `users/{uid}`. Gravações exigem carimbo `updatedBy=auth.uid` e `updatedAt=now`. Sem exclusão física de cirurgias/pacientes. Enfermagem só altera status/motivos. |
| Isolamento de clínicas | Clínica só lê com consulta `orderByChild('clinicaId').equalTo(<sua clínica>)`; só cria com `status=pendente` e sua `clinicaId`; só edita pendentes. |
| Painéis | Espelhos `painel_tv` e `painel_espera` gerados por gatilhos das Cloud Functions e/ou pelo navegador da equipe (admin/diretor/cirurgico), cujas regras aceitam somente os campos minimizados (sem prontuário/CPF/contato). TV: nome abreviado por padrão (admin pode liberar nome completo); sala de espera: só nome abreviado/status/sala/hora. Sem prontuário, CPF, contato, alergias. Leitura apenas por contas de painel/equipe. |
| Auditoria | `audit_logs` (somente funções): quem, operação, entidade, registro, campos alterados (sem valores), resultado, data/hora. `access_logs`: consulta a prontuários (somente inclusão). Nunca grava senhas/tokens. |
| LGPD | Aviso de privacidade e termo versionado, minimização nos painéis, exportação e anonimização do titular, retenção, exclusão lógica, CSP/headers. |
| Front | Sem `innerHTML`/`dangerouslySetInnerHTML`; React escapa saída; CSV com proteção a injeção de fórmula; logos só raster ≤500 KB. |

## Dados
Preservados os caminhos e identificadores existentes (`surgeries`, `patients`, `absences`, `doctors`, `settings/*`). Acréscimos: `users/{uid}`, `clinicaId`,
`updatedBy/updatedAt/createdBy`, `deletedAt/By/Reason`, `audit_logs`, `access_logs`, `painel_tv`, `painel_espera`, `settings/lgpd`. Migração não destrutiva (`scripts/migrar-dados.mjs`).
