# Coding Conventions

**Analysis Date:** 2026-06-11

## Language & Compiler

**TypeScript:**
- Strict mode enabled (`"strict": true` in `tsconfig.json`)
- Target: ES2020
- JSX: `react-jsx`
- Module: ESNext with bundler module resolution
- `skipLibCheck`: true
- `noUnusedLocals`/`noUnusedParameters`: **false** (not enforced by TS, but enforced by ESLint)
- `noFallthroughCasesInSwitch`: true
- Source config: `tsconfig.src.json` extends `tsconfig.json` and includes only `src/**/*`

**ESLint special rules** (from `eslint.config.js`):
- `@typescript-eslint/no-explicit-any`: **error** — `any` is banned
- `@typescript-eslint/no-unused-vars`: **error** with `argsIgnorePattern: "^_"` — unused vars are errors, prefix unused parameters with `_`
- `react-refresh/only-export-components`: **warn** with `allowConstantExport: true`
- `no-console`: **off** — console.log is allowed (the project uses a custom logger `src/utils/logger.ts` and also raw `console.*` calls are used extensively throughout)

## Code Style

### Naming Conventions (from `AGENTS.md` and observed code)

| Category | Convention | Example |
|----------|-----------|---------|
| Components | PascalCase | `SyncStatus.tsx`, `StudyTimer.tsx` |
| Hooks | camelCase with `use` prefix | `useSession.ts`, `useAuth.ts` |
| Utilities | camelCase | `logger.ts`, `rateLimiter.ts`, `localStorage.ts` |
| Types/Interfaces | PascalCase | `Flashcard`, `RateLimitConfig`, `StudyRecord` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_CONFIG.maxRequestsPerMinute` |
| Test files | `{name}.test.tsx` / `{name}.test.ts` | `rateLimiter.test.ts` |
| E2E test files | `{name}.spec.ts` | `login.spec.ts` |

### Formatting (Prettier — from `.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- Semicolons required
- Single quotes preferred
- Trailing commas everywhere
- 80 character print width
- Tailwind CSS classes auto-sorted via `prettier-plugin-tailwindcss`

### Component Patterns (from `AGENTS.md` and observed code in `src/components/ui/SyncStatus.tsx`)

- **Always functional components with arrow functions**: `export const SyncStatus: React.FC = () => { ... }`
- **Props destructured in parameter**: always use dedicated interface for props
- **Internal component order**:
  1. Hooks (`useState`, `useEffect`, custom hooks, `useLiveQuery`)
  2. Derived state and computations (`useMemo`)
  3. Event handlers (`handleEmergencyRescue`, `handleForceRefresh`)
  4. `useEffect`/`useLayoutEffect`
  5. Return JSX
- Avoid importing entire Zustand stores — isolate slices with selectors

### Import Organization (observed patterns)

Imports follow this general order:
1. React/core libraries (`import React, { useEffect, useState } from 'react'`)
2. Third-party UI libraries (`import { Cloud, CloudOff } from 'lucide-react'`)
3. Third-party utilities (`import { motion, AnimatePresence } from 'framer-motion'`)
4. Internal services/hooks (`import { db } from '../../services/offline/db'`)
5. Local components (`import { useSession } from '../../hooks/useSession'`)

No explicit import sorting tool is configured (no `import/order` ESLint rule, no `@trivago/prettier-plugin-sort-imports`).

### Path Aliases

No TypeScript path aliases configured. All imports are relative paths.

## Project Conventions (from `AGENTS.md`)

### Directory Structure Rule

```
/src
├── /components      # Reusable components
│   ├── /ui         # Base UI (Button, Input, etc)
│   ├── /features   # Feature-specific components
│   └── /shared     # Shared components
├── /views           # Full pages/screens
├── /hooks           # Custom React hooks
│   └── /queries    # React Query hooks
├── /services        # API integrations
│   ├── /supabase   # Supabase functions
│   ├── /queries    # React Query query functions
│   └── /offline    # Sync and local DB
├── /stores          # Zustand stores
├── /utils           # Utility functions
├── /lib             # Configurations (Supabase, Sentry)
├── /test            # Test setup and mocks
├── /types.ts        # Global type definitions
└── /constants.ts    # App constants
```

### State Management

- **Global state**: Zustand (`src/stores/useAppStore.ts`, `src/stores/useTimerStore.ts`, `src/stores/themeStore.ts`)
- **Server state**: TanStack React Query (`src/hooks/queries/useStudyRecords.ts`, `src/hooks/queries/useEditais.ts`)
- **Persistence**: Zustand `persist` middleware used for cross-session state (`localStorage`)
- **Offline storage**: Dexie.js (IndexedDB) via `src/services/offline/db`

### Data Fetching

- **ALWAYS use React Query** for server data — never manual `fetch`/`useEffect` for data fetching
- Query hooks located in `src/hooks/queries/`
- Query functions located in `src/services/queries/`
- Supabase client imported from `src/lib/supabase.ts`

### Error Handling

- **Sentry**: `@sentry/react` for critical error logging
- **Centralized error utilities**: `src/utils/error.ts`
  - `getErrorMessage(error: unknown): string` — safe error message extraction
  - `logError(context: string, error: unknown, extras?)` — structured error logging to Sentry
- **Custom error classes**: `RateLimitError` in `src/utils/rateLimiter.ts`
- **Never expose secrets** in logs or errors

### Logging

- **Logger**: `src/utils/logger.ts` — singleton `MonitorProLogger` class
- Category-based logging: `MISSAO`, `AUTH`, `CACHE`, `AI`, `SYNC`, etc.
- In DEV: logs appear in console with colored emoji prefixes
- In PROD: logs silently captured in sessionStorage only (no console pollution)
- ERROR level auto-integrates with Sentry

### CSS / Styling

- **Tailwind CSS** exclusively
- Use `cn()` utility (`src/utils/cn.ts`) combining `clsx` + `tailwind-merge` for conditional class merging
- Mobile-first approach
- Icons from **Lucide React** exclusively
- **Framer Motion** for animations

### Memoization

- Use `useMemo`, `useCallback`, `memo()` consciously
- Do NOT over-optimize — verify with React DevTools

## Anti-Patterns to Avoid (from `AGENTS.md`)

- ❌ Adding unnecessary dependencies (always check `package.json` first)
- ❌ Mass refactoring not explicitly requested
- ❌ Using `any` in TypeScript (ESLint error)
- ❌ Manual data fetching with `useEffect` (must use React Query)
- ❌ Creating class components
- ❌ Using Enums when Union Types suffice

## ESLint Configuration Summary

File: `eslint.config.js`

| Rule | Severity | Notes |
|------|----------|-------|
| `@typescript-eslint/no-explicit-any` | `error` | `any` type is banned |
| `@typescript-eslint/no-unused-vars` | `error` | Exception: `argsIgnorePattern: "^_"` |
| `react-refresh/only-export-components` | `warn` | With `allowConstantExport: true` |
| `no-console` | `off` | Console.log allowed (logger + direct use) |
| `react-hooks/rules-of-hooks` | Inherited from recommended | |
| `react-hooks/exhaustive-deps` | Inherited from recommended | |

Base configs:
- `@eslint/js` recommended
- `@typescript-eslint` recommended
- `eslint-config-prettier` (disables conflicting rules)

Ignored: `dist`, `eslint.config.js`, `node_modules`

---

*Convention analysis: 2026-06-11*
