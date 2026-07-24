# 🏥 HRPI - Sistema de Gestão Cirúrgica

Sistema web completo para gestão de cirurgias do **Hospital Regional de Palmeira dos Índios (HRPI)**. Permite o registro, acompanhamento em tempo real, geração de relatórios e solicitações eletivas por clínicas internas.

---

## 📋 Funcionalidades

### 🏥 Portal Principal
- Menu de navegação com acesso às áreas do sistema
- Exibição das logos do hospital e governo
- Verificação de sessão ativa com botão de logout

### 📺 Painel TV
- Exibição em tempo real das cirurgias do dia
- ECG animado no fundo
- Indicadores visuais de **Sangue 🩸** e **UTI 🏨**
- Barra discreta de agendamentos futuros
- Relógio e data atualizados
- Notificações de próximas cirurgias

### 📊 Dashboard Administrativo
- **KPIs:** Total do dia, aguardando, em andamento, finalizadas, canceladas, agendadas
- **Gráficos:** Especialidade, Origem, Mensal, Diário
- **Tabela de cirurgias** com busca e filtros
- **Edição e exclusão** de cirurgias
- **Relatórios em PDF** com logos e layout profissional:
  - Diário
  - Semanal (segunda a domingo)
  - Mensal (1º ao último dia)
  - Personalizado
  - Por especialidade
  - Por origem
- Tema claro/escuro

### 📝 Registro de Cirurgias
- Formulário completo com autocomplete de procedimentos
- Múltiplos procedimentos (tags selecionáveis)
- Edição e exclusão a qualquer momento
- Controle de status: **Aguardando → Em Andamento → Finalizada / Cancelada**
- Abas: Hoje, Todas, Futuras
- Badge pulsante com contagem de agendadas

### 🏥 Portal de Solicitações (Clínicas)
- Formulário público para clínicas internas
- Seleção da clínica de origem
- Envio de solicitação com protocolo único
- Indicação de reserva de sangue e necessidade de UTI

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Firebase Realtime Database |
| **Gráficos** | Chart.js 4.4 |
| **PDF** | jsPDF + jsPDF-AutoTable |
| **Módulos** | ES6 Modules (import/export) |
| **Autenticação** | Local (sessionStorage) |
| **Tema** | CSS Variables + data-theme |

---

## 📁 Estrutura de Arquivos
