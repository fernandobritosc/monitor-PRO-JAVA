# Preocupações e Riscos

**Data da Análise:** 2026-06-11

---

## Dívida Técnica

### Arquivos Monolíticos de Alta Complexidade

| Arquivo | Linhas | Problema | Severidade |
|---------|--------|----------|------------|
| `src/views/Flashcards.tsx` | 1102 | View monolítica com toda a lógica de UI + state + chamadas API | Alta |
| `src/hooks/useFlashcards.ts` | 975 | Hook monolítico com ~40 estados, SQL embutido e regras de domínio | Alta |
| `src/views/StudyForm.tsx` | 888 | View gigante que acopla formulário, editor TipTap e IA | Alta |
| `src/views/History.tsx` | 1064 | View massiva com relatórios, gráficos e lógica de filtro | Alta |
| `src/services/aiService.ts` | 907 | Serviço que acumula streaming + geração + TTS + podcast + parse JSON | Alta |

### SQL Embutido no Código
- `src/hooks/useFlashcards.ts` (linhas 13-91): Script SQL completo de migração (~80 linhas) embutido como template string e executado via `supabase.query()`. Migrações devem ficar em `supabase/migrations/` e serem versionadas separadamente.
- Impacto: Impossível rastrear alterações no schema, risco de execução acidental em produção e trava em ambientes com RLS restritivo.

### Dead Code
- `src/views/Dashboard.tsx`: Apenas `export {}` — arquivo descontinuado mas ainda presente no repositório.
- `src/__tests__/`: Diretórios `hooks/`, `services/`, `stores/`, `utils/` existem mas estão VAZIOS (nenhum arquivo de teste). Indicam intenção não realizada.
- `src/components/features/error-vault/`: Dois arquivos (`PainelCofre.tsx`, `SessaoRevisao.tsx`) com props tipadas como `any[]` — propenso a quebras silenciosas.

### Armadilha de Build: `tsconfig.json` Overly Permissive
- `tsconfig.json` (linha 27): `"include": ["./**/*.ts", "./**/*.tsx"]` inclui TODOS os arquivos .ts/.tsx da raiz, incluindo `vite.config.ts`, `eslint.config.js`, `playwright.config.ts` e node_modules de skills externas (`antigravity-awesome-skills-main/`, `ui-ux-pro-max-skill-main/`).
- Embora `node_modules` esteja em `exclude`, a falta de `skipLibCheck: true` (presente) ameniza, mas o escopo amplo pode causar falsos positivos no `tsc`.

### Build Artifact Versionado
- `vite.config.ts.timestamp-1772339900803-031ab6b214be8.mjs`: Artefato de build do Vite no diretório raiz. Total de ~63KB versionado desnecessariamente.

---

## Segurança

### Chaves de API em localStorage (Sem Criptografia)
- **Gemini API key** (`localStorage.getItem('gemini_key')`) armazenada em texto puro via `src/services/supabase/index.ts`.
- **Groq API key** (`localStorage.getItem('groq_key')`) idem.
- **Supabase URL/key** (`localStorage.getItem('monitorpro_supabase_url')` / `monitorpro_supabase_key`) idem.
- **Risco:** Qualquer vulnerabilidade XSS no app (ou extensão maliciosa do browser) pode exfiltrar todas as chaves. Sem proteção de CSP ou httpOnly.
- **Mitigação atual:** Nenhuma.
- **Severidade:** Alta

### Env Vars Expostas no Client-Side
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — prefixo `VITE_` do Vite expõe no bundle do frontend. O anon key do Supabase é publicável por design, mas o URL expõe o endpoint.
- `VITE_SENTRY_DSN` — exposto, mas não é segredo crítico (DSN é público por design).
- `VITE_POSTHOG_KEY` — exposto (também público por design).
- **Severidade:** Baixa (por design do Supabase/Vite)

### RLS Público em Flashcards
- `src/hooks/useFlashcards.ts` (linha 62): Política `"Permitir Leitura Publica Flashcards"` com `FOR SELECT USING (true)`.
- Qualquer usuário autenticado ou não pode ler TODOS os flashcards de TODOS os usuários. Decisão consciente para "aba Comunidade", mas é um vetor de vazamento de dados de estudo.
- **Severidade:** Média

### Sentry Redação de Dados Sensíveis
- `src/services/telemetry.ts` (linha 30-33): `beforeSend` do Sentry redaciona `apiKey` e `password` dos eventos. Boa prática, mas pode falhar se a chave estiver aninhada em estruturas não previstas.
- **Severidade:** Baixa (boas práticas já aplicadas)

### logs de Debug com Dados Sensíveis
- `src/services/queries/studyRecords.ts` (linha 56): `console.log('[SUPABASE] Upsert Payload:', payload)` — loga payload completo no console. Em produção, sessionStorage pode reter esses dados via logger.
- `src/hooks/queries/useStudyRecords.ts` (linha 102): `console.log('[SYNC] Preparando registro ${index + 1}: ID=${newId}')` — vaza IDs de registros no console.
- **Severidade:** Média

---

## Desempenho

### Bundle Grande com Bibliotecas Pesadas
- **recharts** (78KB min): Importado em `Simulados.tsx`, `History.tsx`, `Reports.tsx`, `HomeView.tsx`. Alternativa: chart.js menor ou gráficos custom SVG. **Impacto: Médio**
- **framer-motion** (134KB min): Importado em praticamente todas as views e diversos componentes. Alternativa: CSS transitions/Animate.css. **Impacto: Médio**
- **jspdf + html2canvas** (350KB+ combinado): Usado apenas em `Reports.tsx` e `HubView.tsx` para exportar PDF. Carga sob demanda (lazy import) não implementada. **Impacto: Alto**
- **@tiptap** (pacote ~400KB): Editor rico usado em `StudyForm.tsx` e `Configurar.tsx`. Para campos de texto simples, poderia ser textarea. **Impacto: Médio**

### staleTime: 0 em useStudyRecords
- `src/hooks/queries/useStudyRecords.ts` (linha 92): `staleTime: 0` — força refetch sempre que o componente monta, anulando o cache do React Query. Combinado com `gcTime: 1000 * 60 * 60 * 24` (24h) no `index.tsx`, o cache mantém dados obsoletos em memória por 24h enquanto refetch constantemente.
- **Impacto:** Requisições de rede desnecessárias + alto consumo de memória.

### console.log Elevado em Produção
- **25+ chamadas** de `console.log` espalhadas por `src/hooks/`, `src/services/`, `src/views/` em código de produção (não apenas debug).
- Algumas em `src/utils/logger.ts` que são intencionais (debug), mas outras como `src/services/queries/studyRecords.ts:56` logam payloads completos.
- **Impacto:** Degradação de performance em dispositivos lentos, vazamento de informação.

### Carregamento Síncrono de Lamejs
- `src/utils/AudioConverter.ts` (linha 8): `if ((window as any).lamejs) return (window as any).lamejs` — acesso síncrono a biblioteca de áudio carregada via script tag. Bloqueia a thread principal.
- **Impacto:** Travamentos de UI durante conversão de áudio.

---

## Tipagem

### Uso Excessivo de `any`

**25+ ocorrências de `: any`** e **20+ ocorrências de `as any`** em todo o codebase. Violação direta da regra ESLint `@typescript-eslint/no-explicit-any: error`.

**Maiores concentrações:**

| Arquivo | `: any` | `as any` | Problema |
|---------|---------|----------|----------|
| `src/services/aiService.ts` | 15 | 3 | Tratamento de erro genérico, response do Gemini SDK não tipado |
| `src/services/telemetry.ts` | 2 | 4 | `(import.meta as any).env` repetido, `event.request.data as any` |
| `src/services/offline/sync.ts` | 3 | 0 | `saveAttempt(record: any)`, catch errors |
| `src/test/mocks/supabaseMock.ts` | 8 | 1 | Mock excessivamente flexível |
| `src/utils/logger.ts` | 9 | 1 | Parâmetro `data?: any` e `(import.meta as any).env` |
| `src/hooks/useFlashcards.ts` | 2 | 4 | `(doc as any).autoTable()`, cast de extraFormat |
| `src/views/ErrorAnalysisView.tsx` | 0 | 1 | `(err as any).sugestao_mentor` |
| `src/test/setup.ts` | 0 | 5 | Mocks com cast forçado |

### `(import.meta as any).env` — Padrão Repetido
- `src/utils/logger.ts:9`, `src/services/telemetry.ts:9,39,40`, `src/index.tsx:10,18`: ~6 ocorrências do cast `(import.meta as any).env` porque `vite-env.d.ts` não é importado ou os tipos VITE não estão configurados.
- Solução: Adicionar `/// <reference types="vite/client" />` ou configurar `vite/client` no tsconfig.

### `parseAIJSON<any>` — Genérico Mal Utilizado
- `src/services/aiService.test.ts` (linhas 66, 72, 79, 91, 106): O teste usa `parseAIJSON<any>` (ou `parseAIJSON<any[]>`) perdendo totalmente a segurança de tipos. O retorno genérico deveria ser inferido automaticamente.

### Interfaces Frágeis em Views
- `src/components/features/error-vault/PainelCofre.tsx` (linha 8): `localErrors: any[]` — a prop principal do componente não tem tipagem.
- `src/services/offline/sync.ts` (linha 93): `saveAttempt(record: any)` — método central sem tipagem de entrada.
- `src/views/Reports.tsx` (linhas 12-33): Interface `jsPDFWithAutoTable extends Object` — reimplementação manual de tipos que já existem no `@types/jspdf-autotable`.

---

## Testes

### Cobertura Crítica

**Apenas 3 arquivos de teste** para 79 arquivos .ts/.tsx em `src/`:

| Arquivo de Teste | O que Testa | Linhas |
|-----------------|-------------|--------|
| `src/services/aiService.test.ts` | `detectAIProvider` e `parseAIJSON` (funções puras) | 115 |
| `src/utils/rateLimiter.test.ts` | Rate limiter algorithm | 121 |
| `src/stores/useAppStore.test.ts` | Zustand store | 96 |

**Total: 332 linhas de teste para ~18.000+ linhas de código fonte. Cobertura estimada: < 5%.**

### Gaps Específicos

| Área | O que Não é Testado | Risco |
|------|---------------------|-------|
| Hooks (`useFlashcards`, `useStudyRecords`, `useAuth`) | Lógica de dados, sincronização offline, React Query | Alto |
| Views (`Flashcards.tsx`, `StudyForm.tsx`, `History.tsx`) | Renderização, interação do usuário, estados de loading/erro/vazio | Alto |
| Componentes (`PainelCofre`, `SessaoRevisao`, `CustomSelector`) | Comportamento de UI, estados de borda | Alto |
| Serviços (`supabase`, `sync.ts`, `db.ts`) | Sincronização offline, conflitos, fallback | Alto |
| Fluxos críticos (login, registro, criação de registros) | Integração completa com Supabase Auth e DB | Alto |

### Diretórios de Teste Vazios
- `src/__tests__/hooks/` — vazio
- `src/__tests__/services/` — vazio
- `src/__tests__/stores/` — vazio
- `src/__tests__/utils/` — vazio

### E2E Frágeis
- `e2e/login.spec.ts` e `e2e/flashcards.spec.ts` dependem de variáveis de ambiente (`E2E_EMAIL`, `E2E_PASSWORD`) que só funcionam com setup manual.
- Maioria dos testes E2E fica em `test.skip` quando credenciais não estão configuradas.
- Testes E2E não são executados no CI (apenas lint + unit + build no `ci.yml`).

---

## Manutenibilidade

### Arquitetura em Camadas Violada

**Hooks acessam Supabase diretamente, ignorando a camada de services/queries:**

- `src/hooks/useFlashcards.ts` faz chamadas diretas a `supabase.from('flashcards')`, `supabase.storage.from('audio-revisions')`, `supabase.auth.getUser()` — ignora completamente a Data Access Layer (`src/services/queries/`).
- `src/hooks/useNotifications.ts` chama `supabase.from('notifications')` diretamente.
- `src/hooks/useAuth.ts` chama `supabase.auth.*` diretamente.

Isso significa que a camada `src/services/queries/` (que tem `studyRecordsQueries`, `editaisQueries`, `gabaritosQueries`, etc.) só é usada para `studyRecords`, enquanto flashcards, notificações e auth têm lógica de dados espalhada pelos hooks.

### Views Monolíticas
- As 10 maiores views somam **~7.800 linhas** de código em componentes que deveriam ser quebrados em subcomponentes menores.
- `src/views/Flashcards.tsx` (1102 linhas): Contém UI de filtro, lista, estude, importação, comunidade, áudio, PDF — 7+ responsabilidades.
- `src/views/History.tsx` (1064 linhas): Tabela + gráficos recharts + filtros + exportação PDF.
- `src/views/StudyForm.tsx` (888 linhas): Editor rich text + formulário + análise de erros + IA.

### Lógica de IA Acoplada em Múltiplos Lugares
- Chamadas de IA estão em `src/services/aiService.ts` (correto), mas também em `src/hooks/useFlashcards.ts` (chamadas diretas), `src/views/StudyForm.tsx` (import direto), `src/views/ErrorAnalysisView.tsx` (import direto), `src/views/GabaritoIA.tsx` (import direto).
- A camada de serviço (`aiService`) não é a única porta de entrada — views e hooks também chamam funções de IA diretamente.

### `.vercel` no .gitignore mas Diretório Presente
- `.vercel/` está no `.gitignore` e não versionado (correto), mas o diretório existe localmente com artefatos de deploy.

### Constantes Subutilizadas
- `src/constants.ts` exporta `API_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` mas eles não são usados em lugar algum — o App usa `import.meta.env.VITE_*` diretamente em `src/lib/supabase.ts`.

---

## Fragilidades Específicas

### Tratamento de Erro Genérico em catch()
- `src/services/aiService.ts` (múltiplos locais): `catch (error: any)` — o tipo `any` desativa a checagem. Uso correto seria `catch (error: unknown)` com `instanceof` checks, como feito em `src/utils/error.ts:8`.
- Propagação de erros de rede não diferenciada de erros de aplicação.

### Offline Sync sem Retry Inteligente
- `src/services/offline/sync.ts`: `syncPendingAttempts` tenta uma vez e desiste em caso de erro (catch silencioso na linha 84). Não há retry com backoff exponencial ou agendamento.
- `saveAttempt` (linha 93): Se o Supabase falha, o registro fica `pending` sem nunca ser retentado automaticamente (exceto na reconexão `online` event listener).

### Componente CSS com `dangerouslySetInnerHTML`
- `src/views/Simulados.tsx` (linhas 34-39): Função `renderHTML` usa `dangerouslySetInnerHTML` sem sanitização explícita (embora `dompurify` esteja nas dependências). Cria vetor de XSS se o conteúdo HTML vier da API ou de input do usuário.

### MonitorProDB com Schema Versionado mas Sem Migrations
- `src/services/offline/db.ts` (linha 38): `this.version(4)` indica 4 versões de schema IndexedDB, mas não há código de migração entre versões. Usuários com schema desatualizado podem enfrentar erros silenciosos.

---

## Pontos Fortes

- **Offline-First bem pensado:** Dexie + syncStatus + safeRefresh é um padrão sólido e funcional.
- **Integração com telemetria:** Sentry + PostHog configurados para monitoramento de erros e uso.
- **Rate limiting de IA:** `rateLimiter.ts` com Token Bucket evita abuso das APIs pagas.
- **Tratamento de erro de IA:** Múltiplos níveis de fallback (Gemini → Groq) e reparo de JSON (`parseAIJSON`).
- **Migrações versionadas no Supabase:** Pasta `supabase/migrations/` com SQL organizado.
- **CI Pipeline:** GitHub Actions com lint + testes + build garante qualidade básica.
- **Boas práticas de React Query:** Embora com `staleTime: 0`, o uso de mutations com invalidação de queries é correto.
- **Layout consistente:** `Layout.tsx` + `AppRouter.tsx` mantêm navegação e UX padronizadas.

---

## Sumário

O MonitorPRO é um projeto ambicioso com boa arquitetura conceitual (offline-first, React Query, Zustand, Supabase) mas que acumulou dívida técnica significativa durante o desenvolvimento acelerado. Os maiores riscos são:

1. **Baixíssima cobertura de testes** (< 5%) combinada com componentes monolíticos de 700-1100 linhas torna qualquer refatoração arriscada.
2. **Uso excessivo de `any`** desativa as proteções do TypeScript em momentos críticos (tratamento de erro, chamadas de IA, mocks).
3. **Hooks ignorando a camada de dados** (`services/queries/`) viola a arquitetura definida em `AGENTS.md` e dificulta manutenção.
4. **Chaves de API em localStorage** sem proteção é o maior risco de segurança.
5. **25+ `console.log` em produção** e `staleTime: 0` afetam performance em dispositivos limitados.

### Scoring (1-5)

| Dimensão | Score | Notas |
|----------|-------|-------|
| **Segurança** | 2/5 | Chaves em localStorage sem criptografia; RLS público em flashcards; console.log vazando dados |
| **Tipagem** | 2/5 | 50+ violações de `any`/`as any`; ESLint rule `no-explicit-any: error` não está sendo aplicada (possível erro de configuração) |
| **Testes** | 1/5 | 3 arquivos de teste para 79 de código; diretórios de teste vazios; E2E frágeis com skip condicional |
| **Dívida Técnica** | 2/5 | Monólitos de 1000+ linhas; SQL embutido em hook; dead code; build artifacts versionados |
| **Manutenibilidade** | 2/5 | Camada de dados ignorada por hooks; views inchadas; IA acessada de múltiplos pontos |
| **Desempenho** | 3/5 | Bibliotecas pesadas sem lazy loading; `staleTime: 0` anula cache; `console.log` em produção |

**Score Geral: 2.0/5.0** — Projeto com boa base arquitetural mas que precisa de refatoração focada em testes, tipagem e desacoplamento antes de escalar.

---

*Auditoria de preocupações: 2026-06-11*
