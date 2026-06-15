# Fase 1 — Contexto de Decisões

## Decisões Tomadas

### M1 — Criptografar Chaves
- **Abordagem:** Derivar chave de criptografia do `userId` via PBKDF2 (SHA-256)
- **Alvo:** `src/services/supabase/index.ts` (getGeminiKey, getGroqKey, salvar chaves)
- **Reutilizar:** `src/utils/secureStorage.ts` já implementa AES-GCM (`encryptData`, `decryptData`)
- **Necessário:** Adicionar função `deriveKeyFromUserId(userId)` em `secureStorage.ts`
- **UX:** Transparente — usuário não precisa fazer nada

### M2 — Sanitizar HTML
- **Ferramenta:** DOMPurify (já em `package.json`)
- **Alvo:** Todos os usos de `dangerouslySetInnerHTML` no codebase
- **Ação:** Envolver todo HTML não confiável com `DOMPurify.sanitize()` antes de passar para `__html`

### M3 — Migrar SQL Embutido
- **Alvo:** `src/constants/flashcards.ts` (~71 linhas de SQL)
- **Ação:** Mover para `supabase/migrations/20240601_flashcards.sql` (já existe, apenas apontar)
- **Resultado:** `SQL_FLASHCARDS_POLICY` removido, imports atualizados

### M4 — Erradicar `any`
- **Estratégia:** Correção única em todos os arquivos (wave única)
- **Alvo:** ~50 ocorrências de `@typescript-eslint/no-explicit-any`
- **Abordagem:** Substituir por tipos específicos ou `unknown` + type guard onde necessário

### M5 — Limpeza de Dead Code
- **Remover:**
  - `src/views/Dashboard.tsx` (apenas `export {}`)
  - `src/__tests__/hooks/`, `src/__tests__/services/`, `src/__tests__/stores/`, `src/__tests__/utils/` (vazios)
  - `vite.config.ts.timestamp-*.mjs` (artefato de build)
