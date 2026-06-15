# Fase 5 — Plano de Execução: Testes e CI

> **Fase:** 5 | **ROADMAP:** F5:M1 a F5:M5
> **Estratégia:** 4 waves — testes services, hooks, queries, CI

---

## Wave 1 — Serviços Críticos (M1)

### T1: Testar orquestrador de IA

**Arquivo:** `src/services/ai/__tests__/orchestrator.test.ts` (novo)

**Tasks:**
1. Mock `detectAIProvider`, `rateLimiter`, `gemini.ts`, `groq.ts`, `telemetry.ts`
2. Testar `generateAIContent` com cada contexto (analise_erros, explicar_erro, macro_diagnostico, general)
3. Testar fallback Gemini → Groq quando um falha
4. Testar `streamAIContent` com callbacks mockados
5. Verificar `checkRateLimit` bloqueia chamadas

---

### T2: Testar sync offline

**Arquivo:** `src/services/offline/__tests__/sync.test.ts` (novo)

**Tasks:**
1. Mock Dexie `db` com dados em memória (`fakeIndexedDB`)
2. Testar `syncPendingRecords()` com registros pendentes
3. Testar `syncPendingEditais()` 
4. Testar resolução de conflitos (versão local vs servidor)

---

## Wave 2 — Hooks (M2)

### T3: Testar useNotifications

**Arquivo:** `src/hooks/useNotifications.test.ts` (novo)

**Tasks:**
1. Mock `notificationsQueries` 
2. Render hook via `renderHook`
3. Testar fetch inicial de notificações
4. Testar `markAsRead` com e sem ID
5. Testar subscription cleanup no unmount

---

### T4: Testar useSession e useAuth

**Arquivos:** `src/hooks/useSession.test.ts`, `src/hooks/useAuth.test.ts`

**Tasks:**
1. Mock `supabase.auth.getSession/onAuthStateChange`
2. Testar fluxo de autenticação (login, logout, session restore)

---

### T5: Testar useDiscursivaAnalysis e useManualQuestion

**Arquivos:** Testes básicos com mocks de Supabase + AI

---

## Wave 3 — React Query Hooks (M3)

### T6: Testar useStudyRecords e useEditais

**Arquivos:** `src/hooks/queries/useStudyRecords.test.ts`, `src/hooks/queries/useEditais.test.ts`

**Tasks:**
1. Mock `studyRecordsQueries` e `editaisQueries`
2. Render via `renderHook` com `QueryClientProvider`
3. Testar fetch, cache, staleTime

---

## Wave 4 — CI (M5)

### T7: GitHub Actions workflow

**Arquivo:** `.github/workflows/ci.yml` (novo)

**Tasks:**
1. Workflow `test` com `npm ci`, `npm test`, `npm run lint`, `npx tsc --noEmit`
2. Executar em PRs e push para main

---

## Verificação Final

```bash
npm run test        # 68+n testes
npm run lint        # sem erros novos
npx tsc --noEmit    # zero erros
```
