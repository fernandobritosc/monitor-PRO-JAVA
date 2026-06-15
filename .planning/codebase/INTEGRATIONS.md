# External Integrations

**Analysis Date:** 2026-06-11

## APIs & External Services

### Google Gemini (AI)
- **Propósito:** Geração e streaming de conteúdo educacional, análise de erros, flashcards, criação de mapas mentais/tabelas/fluxogramas, TTS para revisões em áudio e podcast.
- **SDK/Client:** `@google/genai` ^0.15.0 (`src/services/aiService.ts`)
- **Modelos utilizados:**
  - `gemini-2.0-flash` (primário, streaming e geração)
  - `gemini-1.5-flash-002` (fallback)
  - `gemini-1.5-pro-002` (fallback)
  - `gemini-2.5-flash-preview-tts` (TTS / podcast)
- **Auth:** Chave de API em `VITE_GOOGLE_API_KEY`, `VITE_GEMINI_API_KEY`, ou `GOOGLE_API_KEY` (injetada via `vite.config.ts` como `process.env.API_KEY`). Também configurável pelo usuário via `localStorage.monitorpro_ai_key` na tela de Configurar > Sistema & API.
- **Endpoints SDK:** Via SDK oficial, que chama a API Google AI.
- **Rate limiting:** Implementado via Token Bucket em `src/utils/rateLimiter.ts` (10 req/min, 50 req/hora).

### Groq (AI)
- **Propósito:** Fallback de IA para geração e streaming de conteúdo educacional. Usa modelo LLaMA 3.3 70B.
- **SDK/Client:** REST API via `fetch` nativo do browser (`src/services/aiService.ts`)
- **Endpoint:** `https://api.groq.com/openai/v1/chat/completions`
- **Auth:** Chave de API em `localStorage.monitorpro_groq_key` ou `VITE_GROQ_API_KEY`.
- **Modelo:** `llama-3.3-70b-versatile`
- **Rate limiting:** Mesmo mecanismo do Gemini (10 req/min, 50 req/hora).

### Supabase
- **Propósito:** Banco de dados PostgreSQL, autenticação, armazenamento de arquivos, WebSockets Realtime, Edge Functions.
- **SDK/Client:** `@supabase/supabase-js` ^2.39.0
- **Config:** `src/lib/supabase.ts`
  - Cliente criado com `createClient(url, key)`.
  - URL e chave vindos de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (env), ou `localStorage.monitorpro_supabase_url` e `monitorpro_supabase_key` (configurável pelo usuário).
  - Fallback para placeholder se não configurado.
- **Recursos utilizados:**
  - **Auth:** Login/sessão persistente, auto-refresh token, detecção de sessão na URL (`src/lib/supabase.ts`, `src/hooks/useAuth.ts`).
  - **Realtime (WebSockets):** Escuta em tabelas `registros_estudos` e `notifications` para atualização em tempo real (`src/hooks/queries/useStudyRecords.ts`, `src/hooks/useNotifications.ts`).
  - **Database:** 9+ tabelas (ver tabelas abaixo).
  - **Storage:** Buckets `study-materials` (materiais de estudo) e `audio-revisions` (cache de áudio TTS/podcast).
  - **Edge Functions:** `ai-gateway`, `chat-with-pdf`, `fetch-concurso-news` (em Deno, deploy via `supabase functions deploy`).
- **Projeto:** Configurado via environment variables (URL e Anon Key). Project ID/URL não hardcoded.

### Tabelas do Banco de Dados (Supabase/Postgres)

| Tabela | Propósito | Acesso |
|--------|-----------|--------|
| `registros_estudos` | Registros de sessões de estudo | `src/services/queries/studyRecords.ts` |
| `profiles` | Perfis de usuário (admin, approved) | `src/services/queries/profiles.ts` |
| `editais_materias` | Matérias e tópicos de edital | `src/services/queries/editais.ts` |
| `gabaritos_salvos` | Gabaritos corrigidos por IA | `src/services/queries/gabaritos.ts` |
| `discursivas` | Provas discursivas | `src/services/queries/discursivas.ts` |
| `flashcards` | Flashcards de estudo | `src/hooks/useFlashcards.ts` |
| `notifications` | Notificações in-app | `src/hooks/useNotifications.ts` |
| `study_materials` | Materiais de estudo uploadados | `supabase/migrations/20240307_study_materials.sql` |
| `ranking_geral` | View de ranking global | `src/services/queries/profiles.ts` |
| RPC `get_ranking_by_period` | Ranking filtrado por período | `src/services/queries/profiles.ts` |

### Sentry
- **Propósito:** Monitoramento de erros, performance tracing, replay de sessão, breadcrumbs.
- **SDK/Client:** `@sentry/react` ^10.40.0
- **Config:** `src/index.tsx` (primeira inicialização) e `src/services/telemetry.ts` (inicialização condicional com fallback + integrações).
- **DSN:** `VITE_SENTRY_DSN` (env var). Se ausente, Sentry não é ativado.
- **Integrações:** `browserTracingIntegration()`, `replayIntegration()`.
- **Amostragem:** Traces 100% (index.tsx) / 20% (telemetry.ts). Replay: 10%/5% session, 100% on error.
- **Uso:**
  - Erros de IA: `captureAIError()` em `src/services/telemetry.ts`.
  - Erros genéricos: `captureError()` e `logError()` em `src/services/telemetry.ts` e `src/utils/error.ts`.
  - Logger customizado (`src/utils/logger.ts`) envia erros ao Sentry automaticamente.
  - Breadcrumbs de navegação e operações de IA: `trackNavigation()`, `setAIOperationContext()`.
  - Identificação de usuário: `Sentry.setUser()` via `useSentry()` hook (`src/hooks/useSentry.ts`).
- **Filtragem:** Ignora `Network request failed`, `Failed to fetch`, `Load failed`. Redacta `apiKey` e `password` em `beforeSend`.

### PostHog
- **Propósito:** Analytics de produto, rastreamento de eventos, funis de uso.
- **SDK/Client:** `posthog-js` ^1.356.1
- **Config:** `src/services/telemetry.ts` (inicialização condicional).
- **Host:** `VITE_POSTHOG_HOST` (padrão: `https://us.i.posthog.com`). Key: `VITE_POSTHOG_KEY`.
- **Eventos capturados:**
  - `ai_call` - Chamadas de IA com provedor, modelo, duração, sucesso/erro (`trackAIUsage()`).
  - Eventos genéricos via `trackEvent()`.
  - `capture_pageview: true`.
- **Identificação:** `posthog.identify(userId, { email })` via `identifyUser()`.
- **Person profiles:** `identified_only`.

## Data Storage

**Databases:**
- Supabase PostgreSQL - Cliente: `@supabase/supabase-js`. Connection via env vars `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

**Local Storage (Browser):**
- IndexedDB via Dexie.js (`src/services/offline/db.ts`): Tabelas `studyRecords`, `editais`, `materials_cache`.
- localStorage: Cache de missão ativa, tokens Supabase, chaves de IA, preferências de tema, rate limiting.
- sessionStorage: Logs centralizados (`monitorpro_logs`).

**File Storage:**
- Supabase Storage: Buckets `study-materials` (materiais de estudo, privado por usuário) e `audio-revisions` (cache de áudio TTS/podcast).
- Upload/download via `supabase.storage.from()`.

**Caching:**
- IndexedDB (Dexie) para dados offline com sync bidirecional.
- React Query (`@tanstack/react-query`) para cache de dados do servidor (staleTime 5min, gcTime 24h).
- PWA Service Worker (Workbox) para cache de requisições: Google Fonts (CacheFirst, 1 ano), Supabase data (StaleWhileRevalidate, 24h).

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Autenticação completa via `@supabase/supabase-js`.
  - Sessão persistente em localStorage (`monitorpro-auth-token`).
  - Auto-refresh de token.
  - Detecção de sessão na URL.
  - Escuta de mudanças de auth via `onAuthStateChange`.
  - Login via email/senha (tela `src/views/Login.tsx`).
  - Logout limpa localStorage e recarrega página.
  - Aprovação de usuários via flag `approved` na tabela `profiles`.

## Monitoring & Observability

**Error Tracking:**
- Sentry - Rastreamento de exceções, breadcrumbs, performance traces, replay de sessão. Integrado ao logger customizado.

**Logs:**
- Logger centralizado `MonitorProLogger` (`src/utils/logger.ts`): Categorias granulares (MISSAO, AUTH, CACHE, AI, DATA, UI, SYNC, PDF, STORAGE, NAV, LIBRARY, AUDIO).
  - Armazenamento: sessionStorage (máx 200 entradas).
  - Em DEV: console.log com cores e emojis.
  - Em PROD: console silencioso (console.* removido via `esbuild.drop` no build).
  - Export/download de logs via UI/window.

**Performance:**
- Sentry browser tracing (transações).
- Sistema manual de traces para IA via `startAIPerformanceTrace()` (`src/services/telemetry.ts`).

## CI/CD & Deployment

**Hosting:**
- Vercel - Config: `vercel.json`. Rewrites para SPA, Content-Security-Policy rigorosa.

**CI Pipeline:**
- GitHub Actions (pasta `.github/` presente).

**PWA:**
- Manifest com `name: 'MonitorPro AI - Estudo Inteligente'`, modo standalone, orientação portrait.
- Service Worker com Workbox: cache de Google Fonts e Supabase data.
- Shortcuts: "Registrar Estudo" (/registrar) e "Ver Dashboard" (/dashboard).

## Environment Configuration

**Required env vars (todas opcionais com fallback):**
- `VITE_SUPABASE_URL` - URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `VITE_GOOGLE_API_KEY` ou `VITE_GEMINI_API_KEY` - Chave da API Gemini
- `VITE_GROQ_API_KEY` - Chave da API Groq
- `VITE_SENTRY_DSN` - DSN do Sentry
- `VITE_POSTHOG_KEY` - Chave do PostHog
- `VITE_POSTHOG_HOST` - Host do PostHog (default: `https://us.i.posthog.com`)

**Secrets location:**
- `.env.local` - Arquivo local de ambiente (não commitado, listado em `.gitignore`).
- `localStorage` - Usuário pode configurar URL/Key do Supabase e chaves de IA via interface em Configurar > Sistema & API. Valores salvos em:
  - `monitorpro_supabase_url`
  - `monitorpro_supabase_key`
  - `monitorpro_ai_key` (Gemini)
  - `monitorpro_groq_key`
- Build-time injection: Chaves são injetadas via `vite.config.ts` `define` (`__SUPABASE_URL__`, `__SUPABASE_KEY__`, `process.env.API_KEY`).

## Webhooks & Callbacks

**Incoming:**
- Nenhum webhook externo identificado.

**Outgoing:**
- Supabase Edge Functions são chamadas via REST/SDK (não como webhooks).
- Navegador faz chamadas diretas para APIs de IA (Gemini SDK e Groq REST).

## Content Security Policy

A CSP rigorosa é configurada via `vercel.json`, autorizando conexões para:
- `https://*.supabase.co` (REST + WebSocket)
- `wss://*.supabase.co` (Realtime WebSocket)
- `https://generativelanguage.googleapis.com` (Gemini API)
- `https://api.groq.com` (Groq API)
- `https://*.sentry.io` (Sentry)
- `https://us.i.posthog.com` (PostHog)
- `https://api.firecrawl.dev` (Firecrawl - provável uso nas Edge Functions)
- `https://fonts.googleapis.com`, `https://fonts.gstatic.com` (Google Fonts)
- `https://cdnjs.cloudflare.com` (CDN - provável lamejs)
- `https://images.unsplash.com` (Imagens)
- `https://assets.mixkit.co` (Assets de mídia)

---

*Integration audit: 2026-06-11*
