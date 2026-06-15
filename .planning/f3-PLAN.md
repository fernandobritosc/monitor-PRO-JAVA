# Fase 3 — Plano de Execução: Performance e Bundle

> **Fase:** 3 | **ROADMAP:** F3:M1 a F3:M3 (M4 adiado)
> **Estratégia:** Wave única paralela

---

## Wave 1 — Execução Paralela

### T1: Lazy Load jspdf + html2canvas (M1)

**Arquivos:** `src/utils/pdfGenerator.ts`, `src/hooks/useFlashcards.ts`, `src/views/Reports.tsx`

**Tasks:**
1. Modificar `pdfGenerator.ts` para `import('jspdf')` e `import('jspdf-autotable')` dinâmicos nas funções de exportação
2. Modificar `useFlashcards.ts` para `import('jspdf')` dinâmico no PDF export
3. Modificar `Reports.tsx` para `import('html2canvas')` dinâmico

**Ganho estimado:** -547 KB (-164 KB gzip) do bundle inicial

---

### T2: Code Splitting com manualChunks (M2)

**Arquivo:** `vite.config.ts`

**Tasks:**
1. Adicionar `build.rollupOptions.output.manualChunks`:
   - `ai-vendor`: `orchestrator.ts` + `gemini.ts` + `groq.ts` (AI)
   - `pdf-vendor`: `jspdf` + `html2canvas` + `jspdf-autotable`
   - `chart-vendor`: `recharts`
   - `editor-vendor`: `@tiptap/*`
   - `motion-vendor`: `framer-motion`

**Ganho estimado:** Melhor cacheabilidade (chunks mudam só quando a lib muda)

---

### T3: Remover Dependências Não Usadas (M3)

**Arquivo:** `package.json`

**Tasks:**
1. Remover `dotenv` (não usado — Vite usa `import.meta.env`)
2. Verificar `vite-plugin-pwa` no `vite.config.ts` — remover se não configurado
3. Rodar `npm uninstall dotenv` se confirmado não usado

**Ganho estimado:** ~30 KB (dotenv + dependências transitivas)

---

## Verificação

```bash
npx tsc --noEmit
npm run lint
npm run build  # verificar novos tamanhos de chunk
npm run test
```
