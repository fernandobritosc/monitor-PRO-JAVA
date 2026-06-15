# Fase 4 — Plano de Execução: Arquitetura e Dívida Técnica

> **Fase:** 4 | **ROADMAP:** F4:M1 a F4:M4
> **Estratégia:** 2 waves — M1+M3 em paralelo, M2 e M4 independentes

---

## Wave 1 — Refatoração de Data Access Layer

### T1: Criar Queries Faltantes (M3)

**Arquivos novos:**
- `src/services/queries/notifications.ts` — `getByUser`, `markAsRead`, `subscribeToChanges`
- `src/services/queries/flashcards.ts` — `getByUser`, `upsert`, `update`, `delete`, `getByConcurso`
- `src/services/queries/discursivas.ts` — adicionar `update`
- `src/services/queries/profiles.ts` — adicionar `getByUser`, `upsert`

**Arquivos modificados:**
- `src/services/queries/discursivas.ts` — adicionar método `update`
- `src/services/queries/profiles.ts` — adicionar `getByUser`, `upsert`
- `src/services/queries/index.ts` — exportar novos módulos

---

### T2: Refatorar Hooks para Usar Queries (M1)

Remover `supabase.auth.*` e `supabase.from(...)` direto dos hooks, substituindo pelas queries.

| Hook | Query a usar |
|------|-------------|
| `useFlashcards.ts` | `flashcardsQueries` + `supabase.auth.getUser()` via `useAuth` |
| `useFlashcardsStudy.ts` | `flashcardsQueries` |
| `useAIFlashcards.ts` | `flashcardsQueries` |
| `useDiscursivaAnalysis.ts` | `discursivasQueries` + `supabase.storage` (manter storage) |
| `useNotifications.ts` | `notificationsQueries` |
| `useSession.ts` | Já usa `lib/supabase` — mover para services/queries/auth.ts |
| `useAuth.ts` | Similar — extrair auth queries |
| `useStudyRecords.ts` (queries) | Já usa `studyRecordsQueries` — só padronizar import path |

---

### T3: Remover themeStore.ts (M2)

Simples deleção de arquivo morto.

| Arquivo | Ação |
|---------|------|
| `src/stores/themeStore.ts` | Deletar |

---

### T4: Schema Dexie Versionado (M4)

**Arquivo:** `src/services/offline/db.ts`

**Tasks:**
1. Adicionar `materials_cache` ao schema da versão 5
2. Adicionar upgrade paths versionadas (1→2, 2→3, 3→4, 4→5)
3. Corrigir tipagem — remover `materials_cache` da classe se não for usada, ou adicionar ao schema

---

## Verificação Final

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run test
```
