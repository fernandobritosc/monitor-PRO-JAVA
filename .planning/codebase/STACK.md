# Stack Tecnológica

**Analysis Date:** 2026-06-11

## Languages

**Primary:**
- TypeScript 5.5.3 - Strict mode habilitado. Usado em todo o frontend e nas Supabase Edge Functions (Deno). Configurado em `tsconfig.json` e `tsconfig.src.json`.

**Secondary:**
- SQL (PostgreSQL) - Migrações em `supabase/migrations/` para schema do banco de dados.

## Runtime

**Ambiente Frontend:**
- Browser (React SPA). Node.js v22+ para dev/build (conforme `@types/node` ^22.5.0).

**Package Manager:**
- npm - Lockfile: `package-lock.json` presente.

## Frameworks

**Core Frontend:**
- React ^18.3.1 - Functional components com hooks. Nenhum componente de classe.
- React Router DOM ^6.26.1 - Roteamento client-side com lazy loading das views (`src/components/features/AppRouter.tsx`).

**Build:**
- Vite ^5.4.1 - Bundler + dev server. Config: `vite.config.ts`.
- @vitejs/plugin-react ^4.3.1 - Plugin Vite para React.
- vite-plugin-pwa ^1.2.0 - Geração de Service Worker e manifest PWA.

**Testing:**
- Vitest ^4.0.18 - Testes unitários. Config: `vitest.config.ts`. Ambiente jsdom, globals true.
- Playwright ^1.46.1 - Testes E2E. Config: `playwright.config.ts`. Chromium apenas.
- Testing Library (React, jest-dom, user-event) - Testes de componentes.

**Estilização:**
- Tailwind CSS ^3.4.10 - CSS utilitário. Config: `tailwind.config.js`.
- tailwindcss-animate ^1.0.7 - Animações Tailwind.
- @tailwindcss/typography ^0.5.19 - Tipografia para conteúdo Markdown.
- postcss ^8.4.41 + autoprefixer ^10.4.20 - Pipeline CSS.
- tailwind-merge ^2.5.2 + clsx ^2.1.1 - Combinação inteligente de classes (função `cn()` em `src/utils/cn.ts`).
- prettier-plugin-tailwindcss ^0.7.2 - Ordenação automática de classes Tailwind.

## State Management

**Global State (Zustand):**
- zustand ^4.5.5 - Stores em `src/stores/`:
  - `useAppStore.ts` - Tema, missão ativa, estado de sincronização, modo offline. Persistido em localStorage via middleware `persist`.
  - `useTimerStore.ts` - Timer de estudos.
  - `themeStore.ts` - Tema (dark/light).

**Server State (React Query):**
- @tanstack/react-query ^5.90.21 - Gerenciamento de cache e sincronização com servidor. Config: `src/index.tsx` (staleTime 5min, gcTime 24h, retry: 1).
  - Hooks de query em `src/hooks/queries/`:
    - `useStudyRecords.ts` - Registros de estudo (offline-first com Dexie + Supabase).
    - `useEditais.ts` - Matérias de edital (apenas online).

**Offline/Local:**
- Dexie ^4.3.0 + dexie-react-hooks ^4.2.0 - IndexedDB para cache offline em `src/services/offline/db.ts`. Tabelas: `studyRecords`, `editais`, `materials_cache`.
- Serviço de sync: `src/services/offline/sync.ts` - Sincroniza pendências quando online.

## Backend / Database

**Database:**
- Supabase (PostgreSQL) - Via `@supabase/supabase-js` ^2.39.0. Tabelas identificadas:
  - `registros_estudos` - Registros de estudo (CRUD em `src/services/queries/studyRecords.ts`)
  - `profiles` - Perfis de usuário (`src/services/queries/profiles.ts`)
  - `editais_materias` - Matérias de edital (`src/services/queries/editais.ts`)
  - `gabaritos_salvos` - Gabaritos corrigidos por IA (`src/services/queries/gabaritos.ts`)
  - `discursivas` - Provas discursivas (`src/services/queries/discursivas.ts`)
  - `notifications` - Notificações push/in-app (`src/hooks/useNotifications.ts`)
  - `flashcards` - Flashcards (acesso direto via `src/hooks/useFlashcards.ts`)
  - `study_materials` - Materiais de estudo (`supabase/migrations/20240307_study_materials.sql`)
  - `ranking_geral` - View/Materialized view para ranking (`src/services/queries/profiles.ts`)
  - RPC: `get_ranking_by_period`

**Storage (Supabase):**
- Buckets: `study-materials` (materiais de estudo), `audio-revisions` (cache de áudio TTS).

**Auth:**
- Supabase Auth - Gerenciamento de sessão, auto-refresh, persistência em localStorage. Config em `src/lib/supabase.ts`.

**Realtime:**
- Supabase Realtime (WebSockets) - Escuta em tabelas `registros_estudos` e `notifications`.

**Edge Functions (Supabase/Deno):**
- `ai-gateway` - Proxy para chamadas de IA (Gemini/Groq) (`supabase/functions/ai-gateway/`)
- `chat-with-pdf` - Chat com PDFs via IA (`supabase/functions/chat-with-pdf/`)
- `fetch-concurso-news` - Notícias de concursos (`supabase/functions/fetch-concurso-news/`)

## Inteligência Artificial

**Google Gemini:**
- SDK oficial `@google/genai` ^0.15.0 - Streaming e geração de conteúdo. Modelos utilizados: `gemini-2.0-flash`, `gemini-1.5-flash-002`, `gemini-1.5-pro-002`.
- TTS: `gemini-2.5-flash-preview-tts` para geração de áudio de revisões e podcasts.
- Provider implementado em `src/services/aiService.ts`.

**Groq:**
- API REST via `fetch` - Modelo `llama-3.3-70b-versatile`. Streaming e geração.
- Provider implementado em `src/services/aiService.ts`.

**Estratégia de Fallback:**
- Gemini como primário, fallback automático para Groq se falhar, e vice-versa.

**Rate Limiting:**
- Algoritmo Token Bucket com persistência em localStorage (`src/utils/rateLimiter.ts`). Limites: 10 chamadas/minuto, 50 chamadas/hora.

## Qualidade

**Linter:**
- ESLint ^8.57.0 - Config: `eslint.config.js` (Flat config).
  - Plugins: `@typescript-eslint` ^8.57.1, `react-hooks`, `react-refresh`, Prettier (conflict avoidance).
  - Regras críticas: `no-explicit-any: error`, `no-unused-vars: error` (args com `^_` ignorados).
  - Comando: `npm run lint` (report-unused-disable-directives, max-warnings 0).

**Formatter:**
- Prettier ^3.3.3 - Config: `.prettierrc` (semi, singleQuote, trailingComma all, printWidth 80, tabWidth 2).
  - Plugin: `prettier-plugin-tailwindcss`.
  - Comando: `npm run format`.

**TypeScript:**
- Modo strict habilitado. `noUnusedLocals: false`, `noUnusedParameters: false` (diferente do ESLint que os trata como erro).
- Target ES2020. ModuleResolution: bundler. JSX: react-jsx.

## Infraestrutura

**Deploy:**
- Vercel - Config: `vercel.json` (SPA rewrites + Content-Security-Policy + headers de segurança).

**PWA:**
- vite-plugin-pwa - Service Worker com Workbox. Cache de Google Fonts (CacheFirst, 1 ano) e Supabase data (StaleWhileRevalidate, 24h).
- Cache em runtime: `supabase-data` (max 100 entries) e `google-fonts` (max 10 entries).
- Manifest: `name: 'MonitorPro AI - Estudo Inteligente'`, tema escuro, standalone.

**Monitoramento:**
- Sentry (@sentry/react ^10.40.0) - Rastreamento de erros, transações, breadcrumbs e replay.
- PostHog (posthog-js ^1.356.1) - Analytics de uso, eventos customizados, rastreamento de chamadas de IA.
- Inicialização em `src/services/telemetry.ts` e `src/index.tsx`.

**CI/CD:**
- GitHub - Pasta `.github/` presente.

## Dependências Principais

### Produção

| Pacote | Versão | Propósito |
|--------|--------|-----------|
| react | ^18.3.1 | Framework UI |
| react-dom | ^18.3.1 | Renderização DOM |
| react-router-dom | ^6.26.1 | Roteamento SPA |
| @supabase/supabase-js | ^2.39.0 | Cliente Supabase (Auth, DB, Realtime, Storage) |
| @tanstack/react-query | ^5.90.21 | Server state / cache |
| zustand | ^4.5.5 | Estado global (com persist) |
| @sentry/react | ^10.40.0 | Error monitoring |
| posthog-js | ^1.356.1 | Product analytics |
| dexie | ^4.3.0 | IndexedDB offline |
| dexie-react-hooks | ^4.2.0 | Hooks React para Dexie |
| @google/genai | ^0.15.0 | SDK Google Gemini AI |
| tailwindcss | ^3.4.10 | CSS utilitário |
| framer-motion | ^12.34.3 | Animações React |
| lucide-react | ^0.436.0 | Ícones SVG |
| recharts | ^2.10.3 | Gráficos (pizza, barra) |
| @tiptap/react | ^3.20.0 | Editor rich text |
| @tiptap/starter-kit | ^3.20.0 | Extensões base TipTap |
| clsx | ^2.1.1 | Condicional de classes |
| tailwind-merge | ^2.5.2 | Combinação Tailwind |
| dompurify | ^3.3.1 | Sanitização HTML |
| html2canvas | ^1.4.1 | Captura de tela |
| jspdf | ^2.5.1 | Geração de PDF |
| jspdf-autotable | ^3.8.2 | Tabelas em PDF |
| date-fns | ^3.6.0 | Manipulação de datas |
| lamejs | ^1.2.1 | Codificação MP3 (áudio) |
| @floating-ui/react | ^0.27.19 | Posicionamento de tooltips/popovers |
| tailwindcss-animate | ^1.0.7 | Animações Tailwind |

### Desenvolvimento

| Pacote | Versão | Propósito |
|--------|--------|-----------|
| typescript | ^5.5.3 | Type checking |
| vite | ^5.4.1 | Bundler + dev server |
| vitest | ^4.0.18 | Test runner unitário |
| @playwright/test | ^1.46.1 | Test runner E2E |
| eslint | ^8.57.0 | Linter (flat config) |
| prettier | ^3.3.3 | Formatter |
| @testing-library/react | ^16.3.2 | Testes de componentes |
| @testing-library/jest-dom | ^6.9.1 | Matchers DOM para testes |
| jsdom | ^28.1.0 | Ambiente DOM simulado |
| dotenv | ^17.4.2 | Carregar .env.local |
| vite-plugin-pwa | ^1.2.0 | Geração PWA |

---

*Stack analysis: 2026-06-11*
