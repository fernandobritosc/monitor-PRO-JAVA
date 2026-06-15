<!-- refreshed: 2026-06-11 -->
# Arquitetura

**Analysis Date:** 2026-06-11

## Visão Geral

O MonitorPRO é uma SPA (Single Page Application) React 18 com TypeScript, construída com Vite, que serve como um sistema inteligente de gerenciamento de estudos para concursos públicos. A aplicação segue uma arquitetura em camadas com foco em **offline-first**, utilizando **Dexie.js (IndexedDB)** como cache local e **Supabase** como backend (autenticação, banco de dados PostgreSQL, Realtime e Storage).

```text
┌───────────────────────────────────────────────────────────────────┐
│                        VIEWS (Pages)                              │
│  HubView  HomeView  StudyForm  Flashcards  EditalProgress  ...    │
└───────────────────┬───────────────────────────────────────────────┘
                    │  usa hooks (custom hooks & React Query)
                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                        HOOKS (Custom + Queries)                   │
│  useAuth  useSession  useStudyRecords  useEditais                 │
│  useFlashcards  useNotifications  useSentry  usePWAInstall        │
└───────────────────┬───────────────────────────────────────────────┘
                    │  consome services / stores
                    ▼
┌───────────────────────────────────────────────────────────────────┐
│              SERVICES (Data Access + Integrations)                │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐    │
│  │ supabase/      │  │ queries/       │  │ offline/         │    │
│  │ index.ts       │  │ studyRecords   │  │ db.ts (Dexie)    │    │
│  │ (config/keys)  │  │ editais        │  │ sync.ts          │    │
│  │                │  │ gabaritos      │  │                  │    │
│  │                │  │ discursivas    │  │                  │    │
│  │                │  │ profiles       │  │                  │    │
│  └────────────────┘  └────────────────┘  └──────────────────┘    │
│  ┌────────────────┐  ┌────────────────┐                           │
│  │ aiService.ts   │  │ telemetry.ts   │                           │
│  │ (Gemini/Groq)  │  │ (Sentry+PH)    │                           │
│  └────────────────┘  └────────────────┘                           │
└───────────────────┬───────────────────────────────────────────────┘
                    │  gerencia estado
                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                     STORES (Zustand)                              │
│  useAppStore (UI global, missão, tema, sync status)               │
│  useTimerStore (cronômetro/pomodoro)                              │
│  useThemeStore (tema escuro/claro - legado)                       │
└───────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES & INFRASTRUCTURE                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Supabase │ │ Gemini   │ │ Groq     │ │ Sentry   │            │
│  │ Auth/DB  │ │ AI       │ │ AI       │ │ Errors   │            │
│  │ Realtime │ │          │ │          │ │          │            │
│  │ Storage  │ │          │ │          │ │          │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐                                       │
│  │ PostHog  │ │ IndexedDB│                                       │
│  │ Analytics│ │ (Dexie)  │                                       │
│  └──────────┘ └──────────┘                                       │
└───────────────────────────────────────────────────────────────────┘
```

## Padrões Utilizados

- **Repository Pattern (Data Access Layer):** As queries Supabase são encapsuladas em objetos `*Queries` dentro de `src/services/queries/` — cada entidade tem seu próprio arquivo com métodos CRUD tipados (`studyRecordsQueries`, `editaisQueries`, etc.)
- **Custom Hooks + React Query:** Cada entidade tem um hook customizado na pasta `src/hooks/queries/` que encapsula `useQuery` e `useMutation` do TanStack React Query, expondo dados, loading states e métodos de mutação
- **Offline-First:** O hook `useStudyRecords` sempre escreve primeiro no IndexedDB (Dexie) e depois tenta sincronizar com o Supabase. Dados locais são a fonte primária de verdade para a UI
- **Lazy Loading:** Todas as views são carregadas via `React.lazy()` + `Suspense` no `AppRouter.tsx`
- **Zustand para Estado Global:** Estado de UI global (missão ativa, tema, status de sincronia) e timer são gerenciados via Zustand com persistência em localStorage
- **Provider Auto-Detection:** O serviço de IA detecta automaticamente qual provedor (Gemini ou Groq) está configurado e faz fallback automático entre eles
- **Real-time Subscription:** O hook `useStudyRecords` inscreve-se em mudanças no banco Supabase via WebSocket (`postgres_changes`) para atualizar a UI em tempo real entre dispositivos

## Fluxo de Dados

### Escrita (Registro de Estudo)
```
UI (StudyForm.tsx)
  → useStudyRecords().insertRecord()
    → escreve no Dexie (IndexedDB) com syncStatus='pending'
    → se online: tenta studyRecordsQueries.upsert() no Supabase
      → se sucesso: marca como 'synced' no Dexie
    → se offline ou falha: mantém como 'pending' no Dexie
  → onSettled: invalida query 'studyRecords' → UI atualiza
```

### Leitura (Dashboard)
```
HomeView.tsx
  → useStudyRecords(userId)
    → useQuery({ queryKey: ['studyRecords', userId] })
      → queryFn:
        1. Busca do Dexie (dados locais)
        2. Se online: busca do Supabase, atualiza Dexie
        3. Retorna dados do Dexie (sempre frescos)
    → WebSocket: escuta mudanças → invalida query → refetch
```

### Sincronização Offline
```
syncService.syncPendingAttempts()
  1. deduplicateLocal() → remove duplicatas no Dexie
  2. Busca registros com syncStatus='pending'
  3. Envia em lote via upsert para Supabase
  4. Marca como 'synced' os confirmados

Evento 'online' do window → dispara sync automática
```

### IA (Streaming)
```
Flashcards.tsx / StudyForm.tsx
  → streamAIContent(prompt, callbacks, geminiKey, groqKey, preferredProvider)
    → checkRateLimit('stream') — Token Bucket (10/min, 50/h)
    → detectAIProvider() — detecta chave disponível
    → Se Gemini: streamWithGemini() — SDK @google/genai
      → fallback models: gemini-2.0-flash → 1.5-flash-002 → 1.5-pro-002
    → Se Groq: streamWithGroq() — REST API llama-3.3-70b-versatile
    → Fallback automático entre provedores
    → Sentry tracing + PostHog capture
```

## Roteamento

- **Biblioteca:** `react-router-dom` v6
- **Padrão:** SPA pura com `BrowserRouter` e `Routes` aninhados
- **Arquivo de rotas:** `src/components/features/AppRouter.tsx`
- **Rotas principais:**

| Rota | View | Descrição |
|------|------|-----------|
| `/` | `HubView` | Página inicial (Radar de notícias + ranking) |
| `/dashboard` | `HomeView` | Dashboard com KPIs, gráficos, heatmap |
| `/edital` | `EditalProgress` | Edital Vertical |
| `/registrar` | `StudyForm` | Registrar sessão de estudo |
| `/revisoes` | `Revisoes` | Revisões ativas |
| `/historico` | `History` | Histórico de estudos |
| `/simulados` | `Simulados` | Simulados |
| `/flashcards` | `Flashcards` | Flashcards com IA |
| `/discursiva` | `Discursiva` | Correção de discursivas por IA |
| `/gabarito-ia` | `GabaritoIA` | Gabarito por IA |
| `/analise-erros` | `ErrorAnalysisView` | Análise de erros |
| `/relatorios` | `Reports` | Relatórios Pro |
| `/ranking` | `RankingView` | Ranking global |
| `/configurar` | `Configurar` | Configurações do sistema |
| `*` | `Navigate to /` | Catch-all redirect |

## Gerenciamento de Estado

### Global (Zustand)

| Store | Arquivo | Propósito |
|-------|---------|-----------|
| `useAppStore` | `src/stores/useAppStore.ts` | Missão ativa, tema (dark/light), status de sync, onboarding, email |
| `useTimerStore` | `src/stores/useTimerStore.ts` | Timer de estudo (cronômetro + pomodoro) |
| `useThemeStore` | `src/stores/themeStore.ts` | Tema dark/light (legado — está sendo migrado para useAppStore) |

### Server State (TanStack React Query)

- **Configuração:** `src/index.tsx` — `staleTime: 5min`, `gcTime: 24h`
- **Chaves de query:** `['studyRecords', userId]`, `['editais', userId]`
- **Mutações:** `insertRecord`, `updateRecord`, `deleteRecord`, `upsertEditais`
- **Cache:** Após mutações, `onSettled` invalida a query para refetch automático

### Offline (Dexie.js)

- **Banco local:** `MonitorProDB` (IndexedDB via Dexie)
- **Tabelas:** `studyRecords`, `editais`, `materials_cache`
- **Status de sync:** cada registro tem `syncStatus: 'pending' | 'synced' | 'error'`
- **Tempo real:** `lastModified: number` para controle de concorrência

## Estrutura de Camadas

### Views (Páginas)
- **Localização:** `src/views/`
- **Responsabilidade:** Compor a UI da página inteira, conectar hooks e stores
- **Padrão:** Functional components com seções internas (subcomponentes no mesmo arquivo)
- **Exemplos:** `HomeView.tsx` (~726 linhas) — contém KPICard, gráficos Recharts inline

### Components
- **`src/components/ui/`:** Componentes de UI específicos do domínio (AppStatusIndicators, StudyTimer, SyncStatus, ReleaseNotesModal, EditorToolbar)
- **`src/components/shared/`:** Componentes reutilizáveis entre features (AIContentBox, MarkdownRenderer, PieChartComponent, Skeleton, CustomFilterDropdown)
- **`src/components/features/`:** Componentes orquestradores (AppRouter, error-vault/PainelCofre, error-vault/SessaoRevisao)
- **`src/components/Layout.tsx`:** Layout principal com sidebar, header, timer

### Hooks
- **`src/hooks/queries/`:** Hooks do React Query (useStudyRecords, useEditais) — encapsulam queries e mutations
- **`src/hooks/`:** Hooks de domínio (useAuth, useSession, useFlashcards, useNotifications, useSentry, usePWAInstall, useResizeObserver)

### Services
- **`src/services/supabase/index.ts`:** Cliente Supabase configurado, funções de chaves API
- **`src/services/queries/`:** Data Access Layer — cada entidade em arquivo separado com métodos CRUD (studyRecords, editais, gabaritos, discursivas, profiles)
- **`src/services/offline/`:** Dexie DB schema (`db.ts`) e sync service (`sync.ts`)
- **`src/services/aiService.ts`:** Serviço unificado de IA (Gemini + Groq) com streaming e fallback
- **`src/services/telemetry.ts`:** Sentry + PostHog para monitoramento e analytics

### Stores
- **`src/stores/`:** Zustand stores para estado global de UI

### Utils
- **`src/utils/`:** Funções utilitárias (cn, logger, error, rateLimiter, localStorage, AudioConverter)

### Lib
- **`src/lib/supabase.ts`:** Inicialização do cliente Supabase (separada dos services para evitar dependências circulares)

## Árvore de Componentes

```
<App>
  <Sentry.ErrorBoundary>
    <QueryClientProvider>
      <BrowserRouter>
        <AppContent>
          <Layout>
            ├── <AppStatusIndicators />          (loading, sync, error status)
            ├── <AppRouter>                       (lazy-loaded views)
            │   ├── <HubView />                  (radar de notícias + ranking)
            │   ├── <HomeView />                 (KPIs, gráficos, heatmap)
            │   ├── <StudyForm />                (registro com editor Tiptap)
            │   ├── <Flashcards />               (deck com IA + áudio)
            │   ├── ... (demais views)
            │   └── <Navigate to="/" />          (catch-all)
            └── <SyncStatus />                   (indicador de sincronização)
          </Layout>
        </AppContent>
      </BrowserRouter>
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
</App>
```

## Componentes Compartilhados (Inter-View)

| Componente | Localização | Usado por |
|-----------|-------------|-----------|
| `CustomSelector` | `src/components/CustomSelector.tsx` | Flashcards, StudyForm |
| `MarkdownRenderer` | `src/components/shared/MarkdownRenderer.tsx` | Flashcards, ErrorAnalysisView |
| `AIContentBox` | `src/components/shared/AIContentBox.tsx` | Flashcards |
| `EditorToolbar` | `src/components/ui/EditorToolbar.tsx` | StudyForm |
| `StudyTimer` | `src/components/ui/StudyTimer.tsx` | Global (via Layout) |
| `SyncStatus` | `src/components/ui/SyncStatus.tsx` | Global (via AppContent) |
| `ThemeToggle` | `src/components/ThemeToggle.tsx` | Login |
| `KPICard` | `src/components/KPICard.tsx` | (definido inline em HomeView) |

## Supabase Edge Functions

| Função | Localização | Propósito |
|--------|-------------|-----------|
| `fetch-concurso-news` | `supabase/functions/fetch-concurso-news/` | Busca notícias de concursos |
| `ai-gateway` | `supabase/functions/ai-gateway/` | Gateway de IA (provavelmente fallback server-side) |
| `chat-with-pdf` | `supabase/functions/chat-with-pdf/` | Chat com documentos PDF |

## Dependências de Integração

| Integração | Finalidade | SDK/Cliente |
|-----------|-----------|-------------|
| Supabase Auth | Autenticação | `@supabase/supabase-js` |
| Supabase DB | PostgreSQL + Realtime | `@supabase/supabase-js` |
| Supabase Storage | Áudio, materiais | `@supabase/supabase-js` |
| Gemini AI | Geração de conteúdo + TTS | `@google/genai` |
| Groq AI | Geração de conteúdo (fallback) | REST API |
| Sentry | Error tracking + Performance | `@sentry/react` |
| PostHog | Analytics | `posthog-js` |
| Dexie | IndexedDB (offline) | `dexie` + `dexie-react-hooks` |
| Recharts | Gráficos | `recharts` |
| Tiptap | Editor rich text | `@tiptap/react` |
| Framer Motion | Animações | `framer-motion` |
| Lucide React | Ícones | `lucide-react` |

## Arquivos de Configuração Raiz

| Arquivo | Propósito |
|---------|-----------|
| `package.json` | Dependências e scripts |
| `tsconfig.json` | TypeScript compiler options (strict mode) |
| `tsconfig.src.json` | Config TS específica do src/ |
| `vite.config.ts` | Vite bundler config |
| `vitest.config.ts` | Test runner config (Vitest) |
| `playwright.config.ts` | E2E test config (Playwright) |
| `tailwind.config.js` | Tailwind CSS config |
| `postcss.config.js` | PostCSS config |
| `eslint.config.js` | ESLint config (flat config) |
| `.prettierrc` | Prettier formatting config |
| `vercel.json` | Vercel deployment config |

## Padrões de Componentes e Props

- Todos os componentes são **functional components** com arrow functions
- Props sempre desestruturadas no parâmetro com **interface/type dedicado**
- Evita-se plugar stores globais inteiras — isola-se slices específicos
- Ordem interna: hooks → derived state (useMemo) → event handlers → effects → JSX
- Uso de `cn()` (clsx + tailwind-merge) para combinar classes Tailwind

## Tratamento de Erros

- **Sentry** captura erros críticos (via `Sentry.captureException`)
- **logger.ts** — sistema de logging centralizado com categorias, salva em sessionStorage, integra com Sentry para erros
- **error.ts** — utilitário `getErrorMessage()` para extração segura de erros em blocos catch
- **Sentry.ErrorBoundary** — boundary no topo da árvore React com fallback UI amigável
- **Rate Limiting** — `rateLimiter.ts` implementa Token Bucket para chamadas de IA (10/min, 50/h)

---

*Architecture analysis: 2026-06-11*
