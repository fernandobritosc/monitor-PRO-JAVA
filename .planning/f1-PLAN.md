# Fase 1 — Plano de Execução: Segurança e Fundação

> **Fase:** 1 | **ROADMAP:** F1:M1 a F1:M5
> **Estratégia:** Wave única paralela (5 milestones independentes)

---

## Wave 1 — Execução Paralela

### T1: Criptografar Chaves de API (M1)

**Arquivos:** `src/utils/secureStorage.ts`, `src/services/supabase/index.ts`

**Tasks:**
1. Adicionar `deriveKeyFromUserId(userId: string): Promise<CryptoKey>` em `secureStorage.ts` usando PBKDF2
2. Criar `encryptWithUserKey(data: string, userId: string)` e `decryptWithUserKey(ciphertext: string, userId: string)` reutilizando `encryptData`/`decryptData` existentes
3. Modificar `src/services/supabase/index.ts` para criptografar ao salvar e descriptografar ao ler (getGeminiKey, getGroqKey, saveAppConfig)
4. Adicionar migração automática: na primeira execução, criptografar chaves existentes em plaintext

**Verificação:** `localStorage` não pode conter chaves em plaintext (exceto durante migração)

---

### T2: Sanitizar HTML com DOMPurify (M2)

**Arquivos afetados:** Todos que usam `dangerouslySetInnerHTML`

**Grep:** `dangerouslySetInnerHTML` em `src/`

**Tasks:**
1. Buscar todas as ocorrências de `dangerouslySetInnerHTML`
2. Envolver cada conteúdo com `DOMPurify.sanitize(html)` antes de passar para `__html`
3. Garantir que `dompurify` está importado (verificar imports existentes)

**Verificação:** `npm run lint` + `npx tsc --noEmit`

---

### T3: Migrar SQL Embutido (M3)

**Arquivos:** `src/constants/flashcards.ts`, `src/hooks/useFlashcards.ts`

**Tasks:**
1. Verificar `supabase/migrations/20240601_flashcards.sql` já existe com o mesmo conteúdo
2. Remover `SQL_FLASHCARDS_POLICY` de `src/constants/flashcards.ts`
3. Remover import e referência em `src/hooks/useFlashcards.ts`
4. Se o arquivo `flashcards.ts` ficar vazio, deletá-lo

**Verificação:** `npx tsc --noEmit` + verificar que a rota de flashcards ainda funciona

---

### T4: Erradicar `any` (M4)

**Escopo:** Todos os arquivos em `src/`

**Tasks:**
1. Rodar `npm run lint` e extrair lista de `no-explicit-any`
2. Para cada ocorrência:
   - Se o tipo é conhecido: substituir pelo tipo correto
   - Se é valor externo imprevisível: substituir por `unknown` + type guard
   - Se é em teste/mock: usar `as any` apenas com comentário de justificativa (com `eslint-disable` específico)
3. Verificar que o lint passa com `--max-warnings 0`

**Verificação:** `npm run lint` com zero `no-explicit-any` violations

---

### T5: Limpeza de Dead Code (M5)

**Tasks:**
1. Deletar `src/views/Dashboard.tsx`
2. Deletar diretórios vazios: `src/__tests__/hooks/`, `src/__tests__/services/`, `src/__tests__/stores/`, `src/__tests__/utils/`
3. Deletar `vite.config.ts.timestamp-*.mjs` da raiz
4. Adicionar `vite.config.ts.timestamp-*.mjs` ao `.gitignore`

**Verificação:** `git status` limpo para esses arquivos

---

## Ordem de Execução

```
Wave 1 (paralelo):
  ├── T1 ─── Criptografar chaves (segurança) ─── sem dependências
  ├── T2 ─── Sanitizar HTML (segurança) ─── sem dependências
  ├── T3 ─── Migrar SQL ─── sem dependências
  ├── T4 ─── Erradicar any ─── sem dependências
  └── T5 ─── Limpeza dead code ─── sem dependências

Wave 2 (verificação):
  └── T6 ─── Rodar tsc + lint + testes
```

---

## Critérios de Sucesso

- [ ] `localStorage` sem chaves de API em plaintext
- [ ] Zero `dangerouslySetInnerHTML` sem DOMPurify
- [ ] `SQL_FLASHCARDS_POLICY` removido do código fonte
- [ ] Zero ocorrências de `no-explicit-any`
- [ ] Dashboard.tsx e `__tests__/` vazios removidos
- [ ] `npx tsc --noEmit` → zero erros
- [ ] `npm run lint` → zero erros
- [ ] `npx vitest run` → 68 testes passando
