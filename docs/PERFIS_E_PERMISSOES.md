# Perfis e permissões

Fonte única: `src/utils/permissions.ts` (interface) e `scripts/build-rules.mjs` (regras do banco). Teste: `src/test/permissions.test.ts`.

| Funcionalidade | Admin | Diretor | Centro Cirúrgico | Enfermagem | Faturamento | Clínica | Painéis |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Visão geral (dashboard) | ✔ | ✔ | – | – | ✔ | – | – |
| Ver cirurgias | ✔ | ✔ | ✔ | ✔ | ✔ | só as da sua clínica | – |
| Registrar/editar cirurgia | ✔ | ✔ | ✔ | – | – | solicitar/editar pendentes próprias | – |
| Alterar status | ✔ | ✔ | ✔ | ✔ | – | – | – |
| Excluir (lógico, com motivo) | ✔ | ✔ | – | – | – | – | – |
| Prontuários (ver) | ✔ | ✔ | ✔ | ✔ | – | – | – |
| Prontuários (editar) | ✔ | ✔ | ✔ | – | – | – | – |
| Faltas (ver / editar) | ✔/✔ | ✔/✔ | ✔/✔ | ✔/– | ✔/– | – | – |
| Faturamento e relatórios | ✔ | ✔ | – | – | ✔ | – | – |
| Auditoria, LGPD/titulares | ✔ | ✔ | – | – | – | – | – |
| Usuários, Configurações | ✔ | – | – | – | – | – | – |
| Painel TV / Sala de espera | ✔ / ✔ | ✔ / ✔ | ✔ / ✔ | – | – | – | respectivo |

Notas: o perfil **Enfermagem** é uma decisão assumida (ver/atualizar status e consultar prontuários) — ajuste em `permissions.ts` **e** `build-rules.mjs`
(depois `node scripts/build-rules.mjs`). Contas inativas perdem todo acesso (as regras exigem `active === true`).
