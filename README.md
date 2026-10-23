# SisPesCFT — Plataforma de Gestão de Pessoal e Processos
### Capitania Fluvial de Tabatinga (CFT) — Marinha do Brasil

O **SisPesCFT** é uma aplicação web moderna, responsiva (**Mobile-First**) e de alta performance desenvolvida especificamente para o contexto institucional da **Capitania Fluvial de Tabatinga**. Centraliza a gestão de pessoal no **Setor de Pessoal**, permitindo que as divisões descentralizadas (Div 10 EPM, Div 20 STA, Operações, Seção de Contramestres, Seção de Motoristas, Intendência) alimentem previsões de missões, cursos, itinerâncias, inspeções navais e férias em tempo real, eliminando planilhas fragmentadas e microgerenciamento.

---

## 🛠️ Stack Tecnológica

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Biblioteca de Interface**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/) com design system militar institucional em tons de azul-marinho profundo (`#040a14`) e dourado (`#d4a63a`), tipografia moderna (Inter & Rajdhani) e alto contraste.
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Persistência de Dados Híbrida**:
  - **Padrão (Zero Config)**: `LocalStorage` estruturado e versionado em JSON, com auto-seeding de demonstração (43 militares, 8 divisões, cenários reais da calha dos Rios Solimões e Javari).
  - **Produção Multiusuário**: Repositório desacoplado com suporte nativo pronto para **Supabase (PostgreSQL + Realtime)** com esquema SQL incluído em `supabase/schema.sql`.

---

## 📂 Estrutura de Pastas e Arquivos

```
SisPesCFT/
├── .env.example                 # Configuração de backend (local ou supabase)
├── next.config.ts               # Otimização de pacotes e Next.js config
├── package.json                 # Dependências e scripts npm
├── postcss.config.mjs           # Processamento Tailwind CSS v4
├── tsconfig.json                # Configuração estrita TypeScript com alias @/*
├── supabase/
│   └── schema.sql               # Esquema DDL para Postgres/Supabase com índices e RLS
├── src/
│   ├── app/
│   │   ├── globals.css          # Design system, tokens institucionais e estilos A4
│   │   ├── layout.tsx           # RootLayout com fontes Google, Auth e Data Providers
│   │   ├── page.tsx             # Redirecionamento inicial para /dashboard
│   │   ├── dashboard/page.tsx   # MÓDULO 1: Dashboard Central do Setor de Pessoal
│   │   ├── lancamentos/page.tsx # MÓDULO 2: Lançamentos Descentralizados das Divisões
│   │   ├── escalas/page.tsx     # MÓDULO 3: Gestão e Otimização de Escalas
│   │   ├── ferias/page.tsx      # MÓDULO 4: Cronograma Anual e Conflitos de Férias
│   │   ├── comando/page.tsx     # MÓDULO 5: Painel Executivo do Comando & Boletim A4
│   │   └── efetivo/page.tsx     # Gestão de Militares, Atribuições e Restrições
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginModal.tsx   # Modal de autenticação/troca de perfil por divisão
│   │   ├── layout/
│   │   │   ├── AppShell.tsx     # Shell com loading militar, header e dock mobile
│   │   │   ├── Navbar.tsx       # Barra de navegação superior institucional
│   │   │   └── BottomNav.tsx    # Dock de navegação inferior Mobile-First
│   │   └── ui/
│   │       ├── Badge.tsx        # Badges de Cobertura, Divisão, Posto, Status
│   │       ├── ConfirmDialog.tsx# Modal de confirmação para exclusões/cancelamentos
│   │       └── Modal.tsx        # Diálogo acessível e bottom sheet móvel
│   ├── lib/
│   │   ├── constants.ts         # Divisões, postos, subtipos de missões e demo PIN
│   │   ├── dates.ts             # Utilitários de data UTC sem deslocamento de fuso
│   │   ├── permissions.ts       # Controle de permissões (Pessoal, Divisão, Liderança)
│   │   ├── seed.ts              # Base de demonstração dinâmica da Capitania CFT
│   │   ├── types.ts             # Tipos do domínio (Militares, Afastamentos, Escalas)
│   │   ├── utils.ts             # Ordenação por antiguidade, exportação CSV/JSON
│   │   ├── engine/
│   │   │   ├── alertas.ts       # Consolidação de alertas do horizonte temporal
│   │   │   ├── disponibilidade.ts# Cálculo de presença diária e efetivo apto
│   │   │   ├── escalas.ts       # Motor justo de escala (preta vs vermelha, equipes IN)
│   │   │   ├── ferias.ts        # Cálculo de carga mensal e detecção de conflitos
│   │   │   └── impacto.ts       # Simulação "What-If" antes de salvar lançamentos
│   │   └── repository/
│   │       ├── index.ts         # Fábrica desacoplada de persistência
│   │       ├── localStorageRepository.ts # Implementação LocalStorage reativa
│   │       ├── supabaseRepository.ts     # Implementação Supabase PostgreSQL
│   │       └── types.ts         # Contrato da camada de dados
│   └── store/
│       ├── AuthProvider.tsx     # Contexto de autenticação e sessão institucional
│       └── DataProvider.tsx     # Contexto de dados otimistas e reatividade
```

---

## 🚀 Instruções de Execução Local no Windows 11 (PowerShell)

### Pré-requisitos
- **Node.js**: Versão 20+ ou 24+ (já validado no ambiente)
- **NPM**: Versão 10+ ou 11+
- **Terminal**: Windows PowerShell ou PowerShell 7

### Passo a Passo

1. **Abra o terminal PowerShell** na pasta do projeto:
   ```powershell
   cd c:\Projetos\Marinha\SisPesCFT
   ```

2. **Verifique se as dependências estão instaladas** (já instaladas durante a criação):
   ```powershell
   npm install
   ```

3. **Inicie o servidor de desenvolvimento**:
   ```powershell
   npm run dev
   ```

4. **Abra no seu navegador**:
   Acesse: **`http://localhost:3000`**

5. **Acesso com Perfil Institucional**:
   - O sistema abrirá o modal institucional de autenticação.
   - Você pode selecionar qualquer um dos perfis pré-configurados:
     - **Setor de Pessoal (Administrador)**: Acesso pleno a todas as divisões e parametrizações.
     - **Divisão 10 (EPM)**: Lançamento de turmas CFAQ, CEMAQ, aulões preparatórios e itinerâncias.
     - **Divisão 20 (STA)**: Lançamento de vistorias, itinerâncias nos rios Solimões e Javari e operações de Inspeção Naval.
     - **Seção de Contramestres / Motoristas / Operações**: Previsões operacionais dedicadas.
     - **Comandante / Imediato**: Acesso ao Painel Executivo com emissão de Boletim Diário A4.
   - **PIN Padrão de Demonstração**: `1234` (ou clique em *"Acesso Rápido 1-Click"*).

---

## 🎯 Destaques Funcionais dos Módulos

### 1. Dashboard Central de Pessoal
- Indicadores em tempo real: Efetivo Total (43 militares), Militares Disponíveis, em Missão (STA, EPM, Cursos, IN) e em Férias/Licença.
- **Suficiência das Escalas**: Monitoramento contínuo das escalas de **Contramestre**, **Motorista**, **Vigia** e **Inspeção Naval**, calculando os regimes diários (ex.: *3 por 1*, *2 por 1*, *1 por 1 - crítico* ou *sem cobertura*).
- **Alertas da Capitania**: Detecta automaticamente quando qualquer escala entrará em colapso nos próximos 45 dias.
- **Quadro de Efetivo do Dia**: Tabela interativa com busca e filtros por divisão e situação de presença.

### 2. Módulo de Inserção por Divisões (Lançamentos Descentralizados)
- Cada divisão registra suas previsões de forma autônoma.
- **Simulação "What-If" em Tempo Real**: Ao preencher datas e militares, o formulário calcula imediatamente se aquele lançamento provocará queda da escala para nível crítico, duplicidade com outro evento ou colisão com reuniões do Conselho de Gestão.
- Subtipos adaptados por divisão (ex.: Instrução CFAQ para EPM, Itinerância Fluvial para STA).
- Ações rápidas: Confirmar, Editar, Cancelar e **Exportar em CSV**.

### 3. Gestão e Otimização de Escalas
- Algoritmo de distribuição justa de folgas:
  - Separação entre **Escala Preta** (dias úteis) e **Escala Vermelha** (fins de semana).
  - Prevenção de dobras consecutivas se houver substituto apto.
  - Modelo por equipes rotativas para **Inspeção Naval** com substituição automática de equipe caso o efetivo mínimo de segurança (3 militares) não seja atingido.
- Gestão de restrições por militar (SRAK, ESPRAC, JS Médica, CNH vencida).

### 4. Módulo de Férias e Afastamentos
- **Mapa de Carga de Férias Anual**: Tabela de Janeiro a Dezembro mostrando o pico de militares simultâneos por divisão, com alerta visual caso o teto da divisão (30%) seja excedido.
- **Detecção de Conflitos com o Conselho de Gestão**: Alerta imediato se membros do Conselho de Gestão forem lançados em férias durante as Reuniões Ordinárias ou Inspeções Administrativo-Militares (IAM).

### 5. Painel do Comando & Liderança
- Visão executiva ultra limpa para o Capitão dos Portos e Imediato.
- **Boletim Diário Formatado para Impressão A4**: Com o clique de um botão, imprime ou salva em PDF um relatório institucional com cabeçalho oficial da Marinha do Brasil, quadro de efetivo, guarnição de serviço do dia e assinaturas do Encarregado e do Comando.

---

## 🗄️ Integração com Supabase (Produção)

Para conectar o sistema a um banco de dados Supabase compartilhado:
1. Crie um projeto no [Supabase](https://supabase.com).
2. Execute o script contido em `supabase/schema.sql` no **SQL Editor** do Supabase.
3. Crie um arquivo `.env.local` na raiz com:
   ```env
   NEXT_PUBLIC_DATA_BACKEND=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
   ```
4. Reinicie o servidor (`npm run dev`). Todas as alterações agora sincronizam em tempo real entre todos os computadores da Capitania.
