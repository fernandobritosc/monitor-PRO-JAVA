# MonitorPRO - AI Agent Instructions

Este arquivo define as regras de arquitetura, padrões de código e diretrizes comportamentais para ferramentas de IA que interagem com este repositório.

## 1. Comandos de Build, Lint e Test

### Comandos Principais

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build de produção
npm run lint         # Executa ESLint (report-unused_disable_directives, max_warnings: 0)
npm run format       # Formata código com Prettier
```

### Testes Unitários (Vitest)

```bash
npm run test                    # Executa todos os testes unitários
npm run test:watch              # Executa testes em modo watch
npm run test:ui                 # Executa testes com UI interativa
npm run test:coverage           # Executa testes com coverage

# Executar UM ÚNICO teste:
npx vitest run src/utils/rateLimiter.test.ts
npx vitest run --testNamePattern "nome do teste"
```

### Testes E2E (Playwright)

```bash
npm run e2e             # Executa testes E2E
npm run e2e:ui         # Executa testes com UI interativa
npm run e2e:headed     # Executa testes com browser visível

# Executar UM ÚNICO teste E2E:
npx playwright test e2e/login.spec.ts
npx playwright test --grep "nome do teste"
```

## 2. Stack Tecnológica

- **Core**: React 18, TypeScript, Vite
- **Estilização**: Tailwind CSS, Framer Motion, Lucide React
- **Estado**: Zustand (global), TanStack React Query (server state)
- **Backend**: Supabase (Auth, Realtime, Postgres DB)
- **Offline**: Dexie.js (IndexedDB)
- **Erros**: @sentry/react
- **Testes**: Vitest (unitários), Playwright (E2E)

## 3. Estrutura de Diretórios

```
/src
├── /components      # Componentes reutilizáveis
│   ├── /ui         # Componentes de UI base (Button, Input, etc)
│   ├── /features   # Componentes específicos de features
│   └── /shared     # Componentes compartilhados
├── /views           # Páginas/telas completas
├── /hooks           # Custom React Hooks
│   └── /queries    # Hooks do React Query
├── /services        # Integrações com APIs
│   ├── /supabase   # Funções do Supabase
│   ├── /queries    # Queries do React Query
│   └── /offline    # Sync e DB local
├── /stores          # Zustand stores
├── /utils           # Funções utilitárias
├── /lib             # Configurações (Supabase, Sentry)
├── /test            # Setup e mocks de testes
├── /types.ts        # Tipagens globais
└── /constants.ts    # Constantes da aplicação
```

## 4. Convenções de Nomenclatura

- **Componentes**: PascalCase (`CameraCard.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useCameraData.ts`)
- **Utilitários**: camelCase (`formatDate.ts`)
- **Tipos/Interfaces**: PascalCase (`Camera`, `AlertConfig`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Testes**: `{nome}.test.tsx` (unitário) ou `{nome}.spec.ts` (E2E)

## 5. Padrões de Código TypeScript

### Regras do ESLint Ativas

- TypeScript strict mode
- Proibido `any` (@typescript-eslint/no-explicit-any: error)
- Variáveis não usadas são erro (@typescript-eslint/no-unused-vars)
- Console.log permitido (via logger customizado)

### Boas Práticas

- Props de componentes DEVEM ter interface/type dedicado
- Retornos de funções complexas DEVEM ser tipados
- Usar generics quando apropriado
- Preferir Union Types vs Enums para conjuntos simples

```typescript
// ✅ BOM
interface CameraCardProps {
  camera: Camera;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

// ❌ RUIM
function CameraCard(props: any) {}
```

## 6. Padrões de React

### Componentes

- Usar SEMPRE functional components com arrow functions
- Desestruturar props no parâmetro
- Evitar plugar stores globais inteiras (isolar slices)

### Ordem Interna de Componentes

1. Hooks (useState, useEffect, custom hooks)
2. Derived state e computações (useMemo)
3. Event handlers
4. useEffect/useLayoutEffect
5. Return JSX

### Data Fetching

- SEMPRE usar React Query para dados do servidor
- Nunca fazer fetch manual com useEffect
- Importar Supabase client de `/src/lib/supabase`

## 7. Estilo e Otimizações

### Tailwind CSS

- Usar `cn()` (tailwind-merge + clsx) para combinar classes
- Abordagem Mobile-first
- Classes utilitárias em ordem consistente

### Memoização

- Usar `useMemo`, `useCallback` e `memo()` conscientemente
- Não abusar - verificar necessidade com React DevTools

### Assets

- Preferir formatos nativos web ou vetores (Lucide React)
- Ícones: sempre Lucide React

## 8. Diretrizes Comportamentais

### Idioma e Tom

- Responder sempre em **Português do Brasil**
- Tom: Profissional, conciso e direto ao ponto

### Ao Modificar Código

1. Analisar código existente antes de modificar
2. Mudanças mínimas - fornecer diffs apenas das linhas alteradas
3. Não reescrever arquivo inteiro sem necessidade
4. Jamais adicionar biblioteca extra se funcionalidade já existir

### O que EVITAR

- ❌ Adicionar dependências desnecessárias (sempre checar package.json)
- ❌ Sugerir refatorações massivas não solicitadas
- ❌ Usar `any` no TypeScript (exceto debug pontual)
- ❌ Fazer data fetching manual (usar React Query)
- ❌ Criar componentes de classe

## 9. Tratamento de Erros

- Usar Sentry para logs de erros críticos
- Criar utilitários de erro em `/src/utils/error.ts`
- Nunca expor secrets em logs ou erros

## 10. Testes

### Unitários (Vitest)

- Arquivos: `*.test.tsx` ou `*.test.ts`
- Local: mesmo diretório do componente ou `/src/test/`
- Setup: `/src/test/setup.ts`
- Mock de Supabase: `/src/test/mocks/supabaseMock.ts`

### E2E (Playwright)

- Arquivos: `*.spec.ts`
- Local: `/e2e/`
- Configuração: `playwright.config.ts`
