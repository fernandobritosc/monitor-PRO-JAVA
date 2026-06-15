# Estrutura de Diretórios

**Analysis Date:** 2026-06-11

```
MonitorPRO/
├── .agent/                      # Agentes e workflows do OpenCode
│   └── workflows/               # Workflows de IA (orchestrate, plan, create, etc)
├── .audit/                      # Auditorias de segurança, UX, build
├── .backups/                    # Backups automáticos
├── .github/
│   └── workflows/
│       └── ci.yml               # CI pipeline
├── .planning/                   # Planejamento e arquitetura
│   └── codebase/                # Documentos de mapeamento do codebase
├── .vscode/
│   └── settings.json            # Configurações do VS Code
├── dist/                        # Build de produção (gerado)
├── e2e/                         # Testes E2E (Playwright)
│   ├── login.spec.ts            # Teste de fluxo de login
│   └── flashcards.spec.ts       # Teste de flashcards
├── node_modules/                # Dependências (gerado)
├── playwright-report/           # Relatórios Playwright (gerado)
├── public/                      # Assets estáticos
│   ├── lame.min.js              # MP3 encoder (lamejs)
│   ├── pwa-192x192.png          # PWA icon
│   └── pwa-512x512.png          # PWA icon
├── scratch/                     # Arquivos temporários de desenvolvimento
├── src/                         # Código fonte principal
│   ├── __tests__/               # Testes unitários (organizados por módulo)
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   └── utils/
│   ├── components/              # Componentes React
│   │   ├── features/            # Componentes orquestradores
│   │   │   ├── error-vault/
│   │   │   │   ├── PainelCofre.tsx
│   │   │   │   └── SessaoRevisao.tsx
│   │   │   └── AppRouter.tsx    # Roteador lazy-loading
│   │   ├── shared/              # Componentes compartilhados entre features
│   │   │   ├── AIContentBox.tsx
│   │   │   ├── CustomFilterDropdown.tsx
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   ├── PieChartComponent.tsx
│   │   │   └── Skeleton.tsx
│   │   ├── ui/                  # Componentes de UI específicos
│   │   │   ├── AppStatusIndicators.tsx
│   │   │   ├── EditorToolbar.tsx
│   │   │   ├── ReleaseNotesModal.tsx
│   │   │   ├── StudyTimer.tsx
│   │   │   └── SyncStatus.tsx
│   │   ├── CircularProgress.tsx
│   │   ├── ConfigScreen.tsx
│   │   ├── CustomSelector.tsx
│   │   ├── KPICard.tsx
│   │   ├── Layout.tsx           # Layout principal (sidebar + conteúdo)
│   │   └── ThemeToggle.tsx
│   ├── constants/               # Constantes por domínio
│   │   └── changelog.ts         # Histórico de releases
│   ├── data/                    # Dados estáticos/JSON
│   │   └── ranking_siconfi.json # Dados de ranking Siconfi
│   ├── hooks/                   # Custom React Hooks
│   │   ├── queries/             # Hooks do React Query
│   │   │   ├── useEditais.ts
│   │   │   └── useStudyRecords.ts
│   │   ├── useAuth.ts           # Hook de autenticação
│   │   ├── useFlashcards.ts     # Hook principal de flashcards (~975 linhas)
│   │   ├── useNotifications.ts  # Hook de notificações
│   │   ├── usePWAInstall.ts     # Hook de instalação PWA
│   │   ├── useResizeObserver.ts # Hook de resize
│   │   ├── useSentry.ts         # Hook de inicialização do Sentry
│   │   └── useSession.ts        # Hook leve de sessão
│   ├── lib/                     # Configurações de bibliotecas externas
│   │   └── supabase.ts          # Cliente Supabase inicializado
│   ├── services/                # Camada de serviços
│   │   ├── offline/             # Serviços offline-first
│   │   │   ├── db.ts            # Schema Dexie (IndexedDB)
│   │   │   └── sync.ts          # Sincronização com Supabase
│   │   ├── queries/             # Data Access Layer (Repository Pattern)
│   │   │   ├── discursivas.ts   # CRUD discursivas
│   │   │   ├── editais.ts       # CRUD editais_materias
│   │   │   ├── gabaritos.ts     # CRUD gabaritos_salvos
│   │   │   ├── index.ts         # Barrel exports
│   │   │   ├── profiles.ts      # CRUD profiles + ranking
│   │   │   └── studyRecords.ts  # CRUD registros_estudos
│   │   ├── supabase/            # Configuração do Supabase
│   │   │   └── index.ts         # Cliente + helpers de chave API
│   │   ├── aiService.ts         # Serviço unificado de IA (Gemini + Groq)
│   │   ├── aiService.test.ts    # Testes do serviço de IA
│   │   └── telemetry.ts         # Sentry + PostHog
│   ├── stores/                  # Zustand stores
│   │   ├── themeStore.ts        # Tema (legado)
│   │   ├── useAppStore.ts       # Estado global da aplicação
│   │   ├── useAppStore.test.ts  # Testes da store
│   │   └── useTimerStore.ts     # Timer de estudo
│   ├── test/                    # Setup e mocks de teste
│   │   ├── mocks/
│   │   │   └── supabaseMock.ts  # Mock do Supabase para testes
│   │   └── setup.ts             # Setup global do Vitest
│   ├── utils/                   # Funções utilitárias
│   │   ├── AudioConverter.ts    # Conversor de áudio (MP3)
│   │   ├── cn.ts                # Combinador de classes (clsx + twMerge)
│   │   ├── error.ts             # Tratamento de erros (Sentry + logging)
│   │   ├── localStorage.ts      # Gerenciamento de localStorage
│   │   ├── logger.ts            # Sistema de logging centralizado
│   │   ├── rateLimiter.ts       # Token Bucket para chamadas de IA
│   │   └── rateLimiter.test.ts  # Testes do rate limiter
│   ├── views/                   # Páginas/telas completas
│   │   ├── Configurar.tsx       # Configurações do sistema
│   │   ├── Dashboard.tsx        # Dashboard alternativo
│   │   ├── Discursiva.tsx       # Correção de discursivas
│   │   ├── EditalProgress.tsx   # Edital Vertical
│   │   ├── ErrorAnalysisView.tsx# Análise de erros
│   │   ├── Flashcards.tsx       # Flashcards (~1182 linhas)
│   │   ├── GabaritoIA.tsx       # Gabarito por IA
│   │   ├── History.tsx          # Histórico de estudos
│   │   ├── HomeView.tsx         # Dashboard principal (~726 linhas)
│   │   ├── HubView.tsx          # Página inicial (radar + ranking)
│   │   ├── index.ts             # Barrel exports
│   │   ├── Login.tsx            # Tela de login/cadastro
│   │   ├── Onboarding.tsx       # Onboarding do usuário
│   │   ├── RankingView.tsx      # Ranking global
│   │   ├── Reports.tsx          # Relatórios Pro
│   │   ├── Revisoes.tsx         # Revisões ativas
│   │   ├── SiconfiRankingView.tsx # Ranking Siconfi
│   │   ├── Simulados.tsx        # Simulados
│   │   └── StudyForm.tsx        # Formulário de estudo (~969 linhas)
│   ├── App.tsx                  # Componente raiz da aplicação
│   ├── constants.ts             # Constantes globais
│   ├── index.css                # Estilos globais (Tailwind + CSS vars)
│   ├── index.tsx                # Entry point (ReactDOM.createRoot)
│   ├── types.ts                 # Tipagens globais da aplicação
│   └── vite-env.d.ts            # Tipos do Vite
├── supabase/                    # Recursos do Supabase
│   ├── functions/               # Edge Functions
│   │   ├── ai-gateway/          # Gateway de IA
│   │   ├── chat-with-pdf/       # Chat com PDF
│   │   └── fetch-concurso-news/ # Coleta de notícias de concursos
│   └── migrations/              # Migrações do banco de dados
│       ├── 20240307_fix_storage_policies.sql
│       ├── 20240307_study_materials.sql
│       ├── 20240310_add_podcast_to_materials.sql
│       └── 20240320_notifications.sql
├── test-results/                # Resultados de testes (gerado)
├── index.html                   # HTML entry point
├── AGENTS.md                    # Instruções para agentes de IA
├── CHANGELOG.md                 # Histórico de alterações
├── REVERSAO.md                  # Procedimentos de reversão
├── package.json                 # Dependências e scripts
├── package-lock.json            # Lockfile de dependências
├── playwright.config.ts         # Config do Playwright
├── tailwind.config.js           # Config do Tailwind
├── postcss.config.js            # Config do PostCSS
├── tsconfig.json                # Config do TypeScript
├── tsconfig.src.json            # Config TS específica do src/
├── vite.config.ts               # Config do Vite
├── vitest.config.ts             # Config do Vitest
├── eslint.config.js             # Config do ESLint
├── .prettierrc                  # Config do Prettier
├── .prettierignore              # Arquivos ignorados pelo Prettier
├── .gitignore                   # Arquivos ignorados pelo Git
├── .env.local                   # Variáveis de ambiente (NÃO COMMITAR)
├── vercel.json                  # Config de deploy Vercel
└── metadata.json                # Metadados do projeto
```

## Legenda dos Diretórios

| Diretório | Propósito |
|-----------|-----------|
| `src/components/ui` | Componentes de UI específicos do domínio (timer, sync, status) |
| `src/components/features` | Componentes orquestradores (router, error-vault) |
| `src/components/shared` | Componentes reutilizáveis entre features (markdown, IA, gráficos) |
| `src/views` | Páginas completas (cada arquivo é uma rota) |
| `src/hooks` | Custom React Hooks de domínio |
| `src/hooks/queries` | Hooks do React Query (server state management) |
| `src/services` | Camada de serviços (data access, IA, telemetria) |
| `src/services/queries` | Data Access Layer (Repository Pattern para Supabase) |
| `src/services/supabase` | Configuração e helpers do cliente Supabase |
| `src/services/offline` | Cache IndexedDB (Dexie) e sincronização |
| `src/stores` | Zustand stores para estado global |
| `src/utils` | Funções utilitárias (logger, error, rateLimiter, localStorage) |
| `src/lib` | Inicialização de bibliotecas externas (Supabase client) |
| `src/constants` | Constantes por domínio (changelog) |
| `src/test` | Setup e mocks para testes unitários |
| `src/__tests__` | Testes unitários organizados por módulo |
| `e2e` | Testes E2E (Playwright) |
| `supabase/migrations` | Migrações SQL do banco PostgreSQL |
| `supabase/functions` | Edge Functions do Supabase (Deno/TypeScript) |
| `public` | Assets estáticos servidos diretamente |
| `.agent/workflows` | Workflows de IA do OpenCode |
| `.github/workflows` | CI/CD pipeline |

## Convenções de Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componentes | PascalCase `.tsx` | `CameraCard.tsx` |
| Hooks | camelCase com prefixo `use` | `useCameraData.ts` |
| Utilitários | camelCase | `formatDate.ts` |
| Tipos/Interfaces | PascalCase | `StudyRecord`, `EditalMateria` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Testes unitários | `{nome}.test.tsx` | `rateLimiter.test.ts` |
| Testes E2E | `{nome}.spec.ts` | `login.spec.ts` |
| Stores | camelCase com prefixo `use` + `Store` | `useAppStore.ts` |
| Services (queries) | camelCase + `Queries` | `studyRecordsQueries` |

## Arquivos de Configuração Raiz

| Arquivo | Propósito |
|---------|-----------|
| `package.json` | Dependências, scripts de build/test/dev |
| `tsconfig.json` | TypeScript strict mode, ES2020 target, JSX react-jsx |
| `vite.config.ts` | Build bundler (React plugin + PWA) |
| `vitest.config.ts` | Testes unitários (jsdom, coverage v8) |
| `playwright.config.ts` | Testes E2E (Chromium, webServer automático) |
| `tailwind.config.js` | Tailwind CSS com typography plugin |
| `postcss.config.js` | PostCSS com autoprefixer |
| `eslint.config.js` | ESLint flat config (TypeScript, React, Prettier) |
| `.prettierrc` | Formatação com plugin tailwindcss |
| `vercel.json` | Deploy na Vercel |

## Onde Adicionar Novo Código

### Nova Feature/Página
- **View:** `src/views/NovaFeature.tsx`
- **Registro de rota:** `src/components/features/AppRouter.tsx` (adicionar lazy import + Route)
- **Barrel export:** `src/views/index.ts`
- **Testes:** `src/__tests__/views/` ou co-localizado `NovaFeature.test.tsx`

### Nova Query/Data Access
- **DAL:** `src/services/queries/novaEntidade.ts` (seguir padrão `*Queries` com `getByUser`, `upsert`, `delete`)
- **React Query hook:** `src/hooks/queries/useNovaEntidade.ts` (seguir padrão `useQuery` + `useMutation`)
- **Barrel export:** `src/services/queries/index.ts`
- **Testes:** `src/__tests__/services/`

### Novo Componente
- **UI base:** `src/components/ui/MeuComponente.tsx`
- **Compartilhado:** `src/components/shared/MeuComponente.tsx`
- **Feature-specific:** `src/components/features/minhaFeature/MeuComponente.tsx`

### Nova Store (Zustand)
- **Arquivo:** `src/stores/useMinhaStore.ts`
- **Persistência:** Usar middleware `persist` do Zustand se necessário
- **Testes:** `src/__tests__/stores/`

### Nova Utilitário
- **Arquivo:** `src/utils/minhaUtil.ts`
- **Testes:** co-localizado `minhaUtil.test.ts`

### Edge Function (Supabase)
- **Localização:** `supabase/functions/minha-funcao/`
- **Linguagem:** TypeScript/Deno

### Migration (Banco)
- **Localização:** `supabase/migrations/YYYYMMDD_descricao.sql`

## Diretórios Especiais

| Diretório | Propósito | Gerado? | Committed? |
|-----------|-----------|---------|------------|
| `dist/` | Build de produção | Sim | Não |
| `node_modules/` | Dependências npm | Sim | Não |
| `playwright-report/` | Relatórios E2E | Sim | Não |
| `test-results/` | Resultados de testes | Sim | Não |
| `.backups/` | Backups automáticos | Sim | Não |
| `scratch/` | Arquivos temporários de desenvolvimento | Não | Sim |
| `public/` | Assets estáticos | Não | Sim |
| `.planning/codebase/` | Documentos de arquitetura | Sim | Sim |
| `.audit/` | Auditorias | Sim | Sim |
| `supabase/functions/` | Edge Functions | Não | Sim |
| `supabase/migrations/` | Migrações DB | Não | Sim |

---

*Structure analysis: 2026-06-11*
