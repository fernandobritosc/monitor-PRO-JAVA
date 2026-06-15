# Fase 2 — Plano de Execução: Qualidade e Confiabilidade Offline

> **Fase:** 2 | **ROADMAP:** F2:M1 a F2:M4
> **Estratégia:** Wave única paralela (milestones independentes)

---

## Wave 1 — Execução Paralela

### T1: Retry com Backoff no Sync (M1)

**Arquivos:** `src/services/offline/db.ts`, `src/services/offline/sync.ts`

**Tasks:**
1. Adicionar `retryCount: number` ao `OfflineAttempt` em `db.ts` (default 0)
2. Adicionar `lastError?: string` ao `OfflineAttempt` em `db.ts`
3. Incrementar versão do Dexie de 4→5 com `upgrade()` incluindo novos campos
4. Em `syncPendingAttempts()`: implementar retry com exponential backoff (max 3, base 2s, jitter)
5. Filtrar registros com `retryCount >= 3` como `'error'` em vez de tentar novamente
6. Adicionar debounce no listener `online` (300ms)
7. Adicionar semáforo (lock simples) para evitar concorrência em `syncPendingAttempts()`

**Verificação:** `npx tsc --noEmit` + testar offline→online com dados pending

---

### T2: Cache Inteligente com staleTime (M2)

**Arquivos:** `src/hooks/queries/useStudyRecords.ts`

**Tasks:**
1. Mudar `staleTime: 0` → `staleTime: 1000 * 60 * 3` (3 minutos)
2. Verificar se `refetchOnWindowFocus` deve ser ativado para records (opcional)

**Verificação:** `npx tsc --noEmit`

---

### T3: Substituir console.log por Logger (M3)

**Arquivos afetados:** ~17 arquivos com 61 `console.*` calls

**Tasks:**
1. Verificar que `src/utils/logger.ts` exporta funções adequadas (info, warn, error com IS_DEV guard)
2. Se o logger atual não tiver, adicionar:
   - `logger.info(msg, ...args)`
   - `logger.warn(msg, ...args)`  
   - `logger.error(msg, ...args)`
3. Substituir todas as 61 ocorrências de `console.log/warn/error` por `logger.info/warn/error`
4. Não substituir `console.error` dentro do próprio `logger.ts`

**Verificação:** `npx tsc --noEmit` + grep por `console\.(log|warn|error)\(` em `src/` (fora test/logger) deve retornar zero

---

### T4: Sincronismo de Flashcards e Editais (M4)

**Arquivos:** `src/services/offline/db.ts`, `src/services/offline/sync.ts`, hooks, queries

**Tasks:**
1. **Editais**: Adicionar `syncStatus` ao `OfflineEdital` em `db.ts`
2. **Flashcards**: Criar tabela `offlineFlashcards` no Dexie schema v5
3. **Sync service**: Adicionar `syncPendingFlashcards()` e `syncPendingEditais()`
4. **Hooks**: Modificar `useEditais` e hooks de flashcards para usar offline-first (Dexie + React Query)

**Atenção:** M4 é o maior milestone. Se for complexo demais, podemos reduzir escopo para apenas editais.

**Verificação:** `npx tsc --noEmit` + testes de sync

---

## Ordem de Execução

```
Wave 1 (paralelo):
  ├── T1 ─── Retry com backoff ─── sync.ts + db.ts
  ├── T2 ─── Cache staleTime ─── useStudyRecords.ts
  ├── T3 ─── Substituir console.log ─── 17 arquivos
  └── T4 ─── Sincronismo editais/flashcards ─── db.ts + sync.ts + hooks

Wave 2 (verificação):
  └── T5 ─── Rodar tsc + lint + testes
```

---

## Critérios de Sucesso

- [ ] `syncPendingAttempts()` tem retry com backoff (max 3) + lock + debounce
- [ ] `useStudyRecords` com `staleTime: 3min` (não 0)
- [ ] Zero `console.log/warn/error` fora de `logger.ts` e `*.test.ts`
- [ ] Editais com sync offline funcional
- [ ] `npx tsc --noEmit` → zero erros
- [ ] `npx vitest run` → 68+ testes passando
