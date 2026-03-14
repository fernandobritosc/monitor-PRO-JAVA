# MonitorPRO - AI Agent Instructions

Este arquivo (`AGENTS.md` / `GEMINI.md`) define as regras de arquitetura, padrões de código e diretrizes comportamentais para ferramentas de IA que interagem com este repositório.

## 1. Stack Tecnológica Primária
- **Core**: React 18, TypeScript, Vite.
- **Estilização**: Tailwind CSS, Framer Motion (animações), Lucide React (ícones).
- **Gerenciamento de Estado**: 
  - **Global/Local**: Zustand.
  - **Server State / Data Fetching**: TanStack React Query.
- **Backend as a Service (BaaS)**: Supabase (Auth, Realtime, e Postgres DB).
- **Armazenamento Local/Offline**: Dexie.js (IndexedDB).
- **Tratamento de Erros**: `@sentry/react` (Prioritário para logs de erros críticos).
- **Testes**: Vitest (Unitários/Componentes - `*.test.tsx`) e Playwright (E2E - `*.spec.ts`).

## 2. Arquitetura e Estrutura de Diretórios
Sempre respeite e mantenha a estrutura existente:

```
/src
├── /components        # Componentes reutilizáveis e modulares
│   ├── /ui           # Componentes de UI base (Button, Input, etc)
│   └── /features     # Componentes específicos de features
├── /views            # Páginas/telas completas (smart components)
├── /hooks            # Custom React Hooks
├── /services         # Integrações com APIs externas
│   └── /supabase    # Funções do Supabase client
├── /stores           # Zustand stores
├── /utils            # Funções utilitárias puras
├── /lib              # Configurações de bibliotecas (incluindo Sentry/Supabase)
├── /types.ts         # Tipagens globais e interfaces
└── /constants.ts     # Constantes da aplicação
```

### Convenções de Nomenclatura
- **Arquivos de componentes**: PascalCase (`CameraCard.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useCameraData.ts`)
- **Utilitários**: camelCase (`formatDate.ts`)
- **Tipos/Interfaces**: PascalCase (`Camera`, `AlertConfig`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)

## 3. Padrões de Código TypeScript e React

### TypeScript
- **Modo Strict**: Sempre ativo, sem exceções.
- **Proibido `any`**: Use `unknown` e type guards quando necessário.
- **Tipagem explícita**: 
  - Props de componentes devem ter interface/type dedicado.
  - Retornos de funções complexas devem ser tipados.
  - Use generics quando apropriado.
- **Enums vs Union Types**: Preferir Union Types para conjuntos simples.

```typescript
// ✅ BOM
interface CameraCardProps {
  camera: Camera;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

// ❌ RUIM
function CameraCard(props: any) { }
```

### React Components
- **Functional Components**: Sempre usar arrow functions.
- **Props Destructuring**: Desestruturar props no parâmetro.
- **Zustand**: Evite plugar stores globais inteiras em cada componente, isole os "slices".
- **Ordem interna**:
  1. Hooks (useState, useEffect, custom hooks)
  2. Derived state e computações
  3. Event handlers
  4. useEffect/useLayoutEffect
  5. Return JSX

### Data Fetching e Supabase
- **SEMPRE use React Query**: Nunca fazer fetch manual com useEffect para dados do servidor.
- **Supabase Client Único**: Importar sempre de `/src/lib/supabase`.
- **RSL (Row Level Security)**: Preferir regras de acesso do lado do DB, evitando lógica crítica de segurança pesada no frontend.

## 4. Otimizações, Estilo e Assets
- **Memoização**: Use `useMemo`, `useCallback` e `memo()` conscientemente.
- **Tailwind e Tailwind-Merge/Clsx**: Combine utilitários de classes (ex: `cn` em `utils`) antes de injetar nas propriedades. A abordagem principal é Mobile-first.
- Prefira formatos nativos de web performáticos ou vetores como o `Lucide React`.

## 5. Diretrizes Comportamentais para IA
### Comportamento Geral
1. **Idioma**: Responder sempre em **Português do Brasil**.
2. **Tom**: Profissional, conciso e direto ao ponto.

### Ao Modificar Código
1. **Análise primeiro**: Entender o código existente antes de modificar.
2. **Mudanças mínimas**: Fornecer Diffs ou edições apenas das linhas alteradas. Não reescreva o arquivo de cima a baixo sem necessidade.
3. Não crie componentes de classe de forma alguma.
4. Jamais adicione uma biblioteca extra caso a funcionalidade já exista de modo trivial em uma lib previamente mapeada no `package.json` (Exemplo: Sentry, zustand, date-fns).

### O que EVITAR
- ❌ Adicionar novas dependências sem necessidade real (sempre cheque meu package.json)
- ❌ Sugerir refatorações massivas da arquitetura não solicitadas.
- ❌ Usar `any` no TypeScript sob qualquer pretexto que não seja debug pontual.
- ❌ Fazer data fetching manual em vez de usar React Query.
