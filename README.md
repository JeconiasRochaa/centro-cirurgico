# ExaGestão — Centro Cirúrgico (React + TypeScript + Firebase)

Migração do sistema HTML/JS para **React 18 + TypeScript + Vite + Tailwind + React Router + React Hook Form + Zod + Lucide**, com
**Firebase Authentication**, **Realtime Database + Security Rules**, **Cloud Functions** e **App Check**, desenhado segundo a LGPD.

> **Leia antes de usar em produção:** a seção [O que foi e o que NÃO foi testado](#o-que-foi-e-o-que-não-foi-testado) e
> [`docs/lgpd/`](docs/lgpd). Este projeto implementa medidas técnicas de proteção; conformidade com a LGPD também depende de
> processos, contratos e da avaliação do encarregado (DPO) e do jurídico do hospital.

## Requisitos
- Node.js 20+, npm
- Projeto Firebase e Firebase CLI (`npm i -g firebase-tools`) — para publicar regras e hospedagem
- **Cloud Functions são OPCIONAIS** (exigem plano Blaze). Sem elas o sistema funciona: o administrador cria/edita usuários pelo navegador e a equipe mantém os painéis atualizados. Com elas você ganha auditoria no servidor, exportação/anonimização de titulares e redefinição de senha de terceiros. Se publicar, a região deve ser a mesma do banco (padrão `us-central1`; `VITE_FUNCTIONS_REGION`)

## Instalação e execução
```bash
npm install                    # o arquivo .env já traz a configuração do Firebase deste projeto
npm run dev                    # http://localhost:5173
npm test                       # testes (vitest)
npx tsc -b --noEmit            # checagem de tipos
npm run build                  # gera dist/
```
Funções: `cd functions && npm install && npm run build && npm test`.

## Subindo no GitHub
```bash
git init && git add . && git commit -m "Sistema ExaGestão - Centro Cirúrgico"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```
**Crie o repositório como PRIVADO** (há documentação interna e identificadores do projeto).

**O que NÃO vai para o GitHub (já está no `.gitignore`):**
| Arquivo | Por quê |
|---|---|
| `serviceAccount*.json`, `*-firebase-adminsdk-*.json` | Chave de serviço do Firebase: dá **acesso total** ao banco e à autenticação. Nunca versionar nem enviar por e-mail/chat. |
| `.env.local` | Sobrescritas locais; pode conter segredos. |
| `backup-*.json`, `backups/` | Backups do banco: contêm **dados pessoais de pacientes** (LGPD). |
| `node_modules/`, `dist/`, `functions/lib/` | Gerados automaticamente. |

**O que PODE ir:** o arquivo `.env` — traz apenas a configuração pública do app web do Firebase (a mesma que qualquer navegador recebe ao abrir o sistema);
a segurança vem do login e das regras do banco, não do sigilo desses valores. Mesmo assim, no Google Cloud Console (APIs e serviços → Credenciais) restrinja
a chave de API aos domínios do seu site e habilite o App Check quando possível.

## Implantação (nesta ordem)
1. **Firebase Console**: ative *Authentication → E-mail/senha*. (Opcional, recomendado) ative *App Check* com reCAPTCHA v3, preencha
   `VITE_APPCHECK_SITE_KEY` e, depois de validar, defina `ENFORCE_APP_CHECK=true` nas funções.
2. `firebase login` e `firebase use <seu-projeto>` (crie `.firebaserc` se quiser).
3. **Funções (opcional, recomendado)**: `firebase deploy --only functions`.
4. **Migração dos dados legados** (computador do administrador, com chave de serviço — nunca no repositório):
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/caminho/chave.json DATABASE_URL=https://SEU-PROJETO-default-rtdb.firebaseio.com
   npm i --no-save firebase-admin
   node scripts/migrar-dados.mjs          # simulação + backup
   node scripts/migrar-dados.mjs --apply  # aplica (usuários, clinicaId) — imprime senhas temporárias uma única vez
   ```
   Crie ao menos um administrador (a migração cria os usuários de `settings/users`; se não houver, crie pelo Console do Firebase Auth e grave
   `users/{uid}` = `{name, username, role:"admin", active:true, mustChangePassword:true}` via Console do banco — única vez).
5. **Regras**: `node scripts/build-rules.mjs` (regenera `database.rules.json`) e `firebase deploy --only database`.
6. **Hospedagem**: `npm run build && firebase deploy --only hosting` (inclui cabeçalhos de segurança/CSP).
7. Depois de conferir o acesso de todos: `node scripts/migrar-dados.mjs --apply --remover-senhas-legadas` (apaga as senhas antigas em texto puro).
8. Reconstrua os painéis: entre como admin → *Configurações* (alterar “nome completo na TV” dispara `rebuildPaineis`) ou chame `rebuildPaineis`.

### Contas das clínicas (um login por clínica)
Em *Usuários → Criar contas das clínicas* o administrador cria, de uma vez, **uma conta para cada clínica** (usuário = identificador da clínica, ex.: `pediatria`),
com senha provisória aleatória exibida uma única vez (há botão para baixar em CSV). Cada clínica só enxerga as próprias solicitações. Todos trocam a senha no primeiro acesso.

### Painéis (TV e sala de espera)
No menu lateral, *Painel TV* e *Sala de espera* abrem **em uma nova aba**, sem atrapalhar a tela principal (essas abas não expiram por inatividade).
Os painéis leem apenas espelhos minimizados (`painel_tv`/`painel_espera`). Esses espelhos são atualizados automaticamente pelo navegador da equipe
(administrador, diretor, centro cirúrgico) sempre que as cirurgias mudam — **mantenha o sistema aberto em algum computador da equipe** ou publique as Cloud Functions,
que fazem isso no servidor.

### Contas dos painéis (TV e sala de espera) em televisões dedicadas
Os painéis **não são públicos**. Crie, em *Usuários*, uma conta com perfil **Painel TV** e outra **Painel Sala de Espera**, entre uma vez em
cada televisão e deixe o navegador aberto (essas contas mantêm sessão persistente e não expiram por inatividade). Elas só leem os nós
minimizados `painel_tv` / `painel_espera`, gerados no servidor. Use senhas longas e exclusivas; troque-as se a TV for trocada/descartada.

### Imagem da tela de login
A foto fica **embutida no código** (não depende de internet nem do banco): salve-a como `src/assets/login-bg.jpg` (ou `.jpeg`, `.png`, `.webp`, de preferência
com menos de 500 KB) e rode `npm run build`. Sem o arquivo, é usada a ilustração padrão. Não há nenhuma leitura pública no banco.

## Documentação
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — arquitetura, fluxo de dados, decisões de segurança
- [`docs/PERFIS_E_PERMISSOES.md`](docs/PERFIS_E_PERMISSOES.md) — matriz de perfis (regras do banco + interface)
- [`docs/lgpd/`](docs/lgpd) — RIPD (DPIA), ROPA, retenção, plano de resposta a incidentes
- `database.rules.json` (gerado por `scripts/build-rules.mjs`), `firebase.json`, `.env.example`, `.gitignore`

## O que foi e o que NÃO foi testado
**Executado e aprovado neste ambiente:** checagem de tipos (`tsc`), `npm run build`, 55 testes automatizados (permissões por perfil,
rota protegida/redirecionamentos, validação Zod, formatação, proteção de CSV contra injeção de fórmula, lógica dos painéis, mirror minimizado
das funções, e análise **estática** das regras: sem leitura/escrita pública, painéis/auditoria não graváveis pelo cliente).

**NÃO executado (o ambiente de desenvolvimento não alcançava o Firebase nem o Emulator Suite):**
- Testes das *Security Rules* contra o emulador e testes de ponta a ponta com Firebase real (login, criação de usuário, isolamento por clínica,
  painéis com conta de exibição, anonimização). **Execute-os em homologação antes de produção** (`firebase emulators:start`).
- Implantação das Cloud Functions e do App Check.
- Verificação visual em navegador de todas as telas (apenas build/tipos).
Tratar o item acima como pendência obrigatória de homologação — não como garantido.

## Limitações conhecidas
- O Realtime Database do projeto original pode estar fora do Brasil (transferência internacional, LGPD art. 33): avalie com o DPO a base legal/cláusulas.
- Logos ficam em `settings` como data-URL (≤ 500 KB, PNG/JPEG/WebP).
- Sem exclusão física de dados hospitalares: remoção é lógica; eliminação/anonimização só após o prazo de retenção (ver política).
