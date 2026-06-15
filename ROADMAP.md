# MonitorPRO — ROADMAP

> **Versão:** 1.0.34 | **Última atualização:** 2026-06-15
> **Propósito:** Guia mestre de fases de desenvolvimento GSD

---

## Sumário

- [Fase 1 — Segurança e Fundação](#fase-1--seguranca-e-fundacao)
- [Fase 2 — Qualidade e Confiabilidade Offline](#fase-2--qualidade-e-confiabilidade-offline)
- [Fase 3 — Performance e Bundle](#fase-3--performance-e-bundle)
- [Fase 4 — Arquitetura e Dívida Técnica](#fase-4--arquitetura-e-divida-tecnica)
- [Fase 5 — Testes e CI](#fase-5--testes-e-ci)
- [Fase 6 — Views e Componentes](#fase-6--views-e-componentes)
- [Fase 7 — Features Avançadas](#fase-7--features-avancadas)

---

## Fase 1 — Segurança e Fundação

**Objetivo:** Eliminar vulnerabilidades críticas de segurança e estabilizar a fundação da aplicação.

| Milestone | Critérios de Sucesso | Dependências |
|-----------|----------------------|--------------|
| **M1** Criptografar chaves de API em localStorage | Nenhuma chave (Gemini, Groq, Supabase) armazenada em plaintext | — |
| **M2** Sanitizar HTML de entrada | Nenhum `dangerouslySetInnerHTML` sem DOMPurify | — |
| **M3** Migrar SQL embutido para migrações versionadas | `src/constants/flashcards.ts` removido, scripts em `supabase/migrations/` | — |
| **M4** Erradicar `any` do TypeScript | Zero ocorrências de `@typescript-eslint/no-explicit-any` | — |
| **M5** Limpeza de dead code | `Dashboard.tsx`, diretórios `__tests__/` vazios, `vite.config.ts.timestamp-*` removidos | — |

---

## Fase 2 — Qualidade e Confiabilidade Offline

**Objetivo:** Tornar o sync offline robusto e confiável, eliminando perda de dados.

| Milestone | Critérios de Sucesso | Dependências |
|-----------|----------------------|--------------|
| **M1** Retry com backoff no sync | Toda operação de sync tem no mínimo 3 tentativas com exponential backoff | — |
| **M2** Cache inteligente com `staleTime` | `useStudyRecords` usa `staleTime > 0`; consultas re-buscam apenas quando necessário | — |
| **M3** Remover `console.log` de produção | Zero ocorrências de `console.log` fora de `logger.ts` | — |
| **M4** Sincronismo de flashcards e editais | Todas as entidades (flashcards, editais, discursivas, gabaritos) têm sync offline | F1:M1 (dados seguros) |

---

## Fase 3 — Performance e Bundle

**Objetivo:** Reduzir bundle inicial e melhorar métricas de performance (LCP, TTI, TBT).

| Milestone | Critérios de Sucesso | Dependências |
|-----------|----------------------|--------------|
| **M1** Lazy loading de bibliotecas pesadas | `jspdf + html2canvas` (~350KB), `framer-motion` (134KB), `recharts` (78KB) carregados sob demanda | — |
| **M2** Otimização de bundles do Vite | Code splitting por rota, análise de bundle com `rollup-plugin-visualizer` | — |
| **M3** Remoção de dependências não utilizadas | Auditar `package.json`, remover pacotes órfãos | — |
| **M4** Cache de assets estáticos | Service worker do PWA configurado para cache de fontes, ícones, WASM | F3:M2 |

---

## Fase 4 — Arquitetura e Dívida Técnica

**Objetivo:** Consolidar a arquitetura, separar responsabilidades e eliminar violações de camada.

| Milestone | Critérios de Sucesso | Dependências |
|-----------|----------------------|--------------|
| **M1** Migrar chamadas Supabase de hooks para services/queries | Nenhum hook importa `supabase` diretamente; toda acesso a dados via camada `services/queries/` | — |
| **M2** Consolidar stores legadas | `themeStore.ts` migrado para `useAppStore`; `themeStore` deletado | — |
| **M3** Normalizar data access layer | `services/queries/` segue repositório padrão (create, read, update, delete) para todas as entidades | F4:M1 |
| **M4** Schema Dexie versionado com migration path | DB schema v5 com `db.version(5).upgrade()` | — |

---

## Fase 5 — Testes e CI

**Objetivo:** Alcançar cobertura mínima de 40% e integrar testes no pipeline de CI/CD.

| Milestone | Critérios de Sucesso | Dependências |
|-----------|----------------------|--------------|
| **M1** Testar serviços críticos | `sync.ts`, `db.ts`, `orchestrator.ts` com cobertura > 70% | — |
| **M2** Testar hooks não-testados | `useAuth`, `useSession`, `useNotifications`, `useDiscursivaAnalysis`, `useManualQuestion` testados | — |
| **M3** Testar React Query hooks | `useStudyRecords.ts`, `useEditais.ts` com mocks do Supabase | — |
| **M4** Testar views principais | `StudyForm`, `Flashcards`, `HomeView`, `Configurar` com testes de renderização | F5:M2 |
| **M5** CI com GitHub Actions | `npm test` + `npm run lint` + `npx tsc --noEmit` em toda PR | — |

---

## Fase 6 — Views e Componentes

**Objetivo:** Decompor views monolíticas restantes em componentes focados e testáveis.

| Milestone | Critérios de Sucesso | Dependências |
|-----------|----------------------|--------------|
| **M1** Extrair `StudyForm.tsx` (745→~350 linhas) | Formulário de estudo padrão extraído para componentes | F4:M1 |
| **M2** Extrair `HomeView.tsx` (678→~300 linhas) | KPIs, gráficos, heatmap, metas em componentes dedicados | — |
| **M3** Extrair `Flashcards.tsx` (768→~400 linhas) | Seções de estudo, gerenciamento, comunidade em componentes | ✅ hooks já extraídos |
| **M4** Extrair `Configurar.tsx` (470→~100 linhas) | ✅ JÁ CONCLUÍDO (8 componentes extraídos) | — |
| **M5** Padronizar componentes shared | `Skeleton`, `AIContentBox`, `PieChartComponent` com Storybook ou docs | — |

---

## Fase 7 — Features Avançadas

**Objetivo:** Adicionar funcionalidades de próxima geração para diferenciação do produto.

| Milestone | Critérios de Sucesso | Dependências |
|-----------|----------------------|--------------|
| **M1** Agendador inteligente de revisões | Algoritmo que prioriza cards com base na curva de esquecimento + disponibilidade | F2:M4 |
| **M2** Dashboard de performance cross-missão | Comparativo de rendimento entre concursos simultâneos | — |
| **M3** Modo banca personalizado | Simulados com regras específicas (CESPE, FCC, FGV, Vunesp) | — |
| **M4** Multi-dispositivo com sync real-time | Sessão única entre web e mobile via Supabase Realtime | F2:M4 |
| **M5** Assistente IA de estudos | Chat contextual que sugere o que estudar com base no histórico e gap analysis | F4:M1 |

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Já concluído |
| — | Sem dependências |
| F1:M2 | Fase 1, Marco 2 |
