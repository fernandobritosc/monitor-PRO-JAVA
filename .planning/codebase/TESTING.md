# Testing Patterns

**Analysis Date:** 2026-06-11

## Test Strategy Overview

The project uses a two-tier testing approach:

1. **Unit/Integration Tests (Vitest)** — test business logic, utility functions, Zustand stores, and service layer in isolation
2. **E2E Tests (Playwright)** — test critical user flows in a real browser against the running application

There are **3 unit test files** and **2 E2E spec files**. Coverage is focused on:
- Utility functions (`rateLimiter`)
- Zustand stores (`useAppStore`)
- Service layer (`aiService` — pure function detection)
- E2E login flow and flashcard interactions

---

## Unit Tests (Vitest)

### Framework

- **Runner**: Vitest (`^4.0.18`)
- **Assertion**: Built-in `expect` with `@testing-library/jest-dom` matchers
- **DOM environment**: `jsdom` (configured in `vitest.config.ts`)
- **Globals**: enabled (`globals: true`)
- **Mocking**: `vi` from vitest, manual mocks

### Configuration

File: `vitest.config.ts`

```typescript
export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['node_modules/**', 'dist/**', 'e2e/**', 'antigravity-awesome-skills-main/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['hooks/**', 'services/**', 'utils/**'],
            exclude: ['node_modules/**', 'dist/**'],
        },
    },
    resolve: {
        alias: {
            'dompurify': 'dompurify/dist/purify.js',
        },
    },
});
```

### File Organization

- Tests are **co-located with source files** in the same directory
- Naming: `{source}.test.ts` or `{source}.test.tsx`
- Setup file: `src/test/setup.ts`
- Global mocks: `src/test/mocks/supabaseMock.ts`

Current test files:
- `src/utils/rateLimiter.test.ts` (150 lines)
- `src/stores/useAppStore.test.ts` (96 lines)
- `src/services/aiService.test.ts` (115 lines)

### Setup File

File: `src/test/setup.ts`

Provides global mocks for browser APIs not available in jsdom:
- **localStorage** mock (polyfill)
- **console** methods silenced (`vi.fn()`)
- **window.location.reload** mock
- **SpeechSynthesisUtterance** mock
- **AudioContext** mock
- **React act()** environment flag

### Supabase Mock

File: `src/test/mocks/supabaseMock.ts`

A comprehensive mock for the Supabase client with:
- Mock user, session, flashcard, and study record data
- Chainable query builder mock (`.select().eq().order().single()`)
- Auth methods: `getSession`, `getUser`, `signInWithPassword`, `signUp`, `signOut`, `onAuthStateChange`
- Storage methods: `list`, `upload`, `remove`, `getPublicUrl`
- `createMockSupabase(overrides?)` factory for custom test data

### Test Patterns

**Basic test structure** (from `src/utils/rateLimiter.test.ts`):
```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, resetRateLimit } from './rateLimiter';

describe('rateLimiter', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        localStorage.clear();
    });

    describe('checkRateLimit', () => {
        it('deve permitir a primeira chamada', () => {
            const result = checkRateLimit('generate');
            expect(result.allowed).toBe(true);
            expect(result.remainingMinute).toBe(9);
        });
        // ...
    });
});
```

**Zustand store testing** (from `src/stores/useAppStore.test.ts`):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './useAppStore';

// Mock dependencies
vi.mock('../utils/logger', () => ({
  logger: { missaoChanged: vi.fn(), info: vi.fn(), error: vi.fn() }
}));

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    vi.clearAllMocks();
  });

  it('deve atualizar a missaoAtiva corretamente', () => {
    const { setMissaoAtiva } = useAppStore.getState();
    setMissaoAtiva('Nova Missão', 'user-123');
    expect(useAppStore.getState().missaoAtiva).toBe('Nova Missão');
  });
});
```

**Service/pure function testing** (from `src/services/aiService.test.ts`):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectAIProvider, parseAIJSON } from './aiService';

describe('detectAIProvider', () => {
    it('deve retornar null quando nenhuma chave está disponível', () => {
        const result = detectAIProvider();
        expect(result).toBeNull();
    });
});
```

### What is Tested

| File | What it tests | Lines |
|------|---------------|-------|
| `src/utils/rateLimiter.test.ts` | Token bucket algorithm, refill, reset, error handling, stats | 150 |
| `src/stores/useAppStore.test.ts` | State mutations, dark mode toggle, reset behavior | 96 |
| `src/services/aiService.test.ts` | AI provider detection logic, JSON parsing from AI responses | 115 |

### What is NOT Tested (gaps)

- **Components**: No component tests exist (`src/components/*` and `src/views/*`)
- **Hooks**: No hook tests (`src/hooks/*` — `useSession`, `useAuth`, `useFlashcards`, etc.)
- **React Query hooks**: `src/hooks/queries/*` not tested
- **Offline sync**: `src/services/offline/*` not tested
- **Most services**: `src/services/supabase/*`, `src/services/queries/*` not tested
- **Supabase client setup**: `src/lib/supabase.ts` not tested
- **Utils**: Only `rateLimiter.ts` is tested; `logger.ts`, `error.ts`, `localStorage.ts`, `cn.ts`, `AudioConverter.ts` are not

---

## E2E Tests (Playwright)

### Framework

- **Runner**: `@playwright/test` (`^1.46.1`)
- **Browser**: Chromium only (Desktop Chrome)
- **Language**: TypeScript

### Configuration

File: `playwright.config.ts`

Key settings:
- **testDir**: `./e2e`
- **timeout**: 30s (test), 5s (expect)
- **fullyParallel**: `false` — sequential to avoid auth conflicts
- **retries**: 2 in CI, 0 locally
- **workers**: 1 (sequential)
- **trace**: `on-first-retry`
- **screenshot**: `only-on-failure`
- **video**: `retain-on-failure`
- **baseURL**: `http://localhost:5173`
- **webServer**: auto-starts `npm run dev` with 60s timeout

### File Organization

- All E2E tests in `/e2e/` directory
- Naming: `{feature}.spec.ts`

Current E2E files:
- `e2e/login.spec.ts` (144 lines, 6 tests)
- `e2e/flashcards.spec.ts` (181 lines, 6 tests)

### Test Patterns

**Login flow** (from `e2e/login.spec.ts`):
```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('Fluxo de Login', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => { localStorage.clear(); });
        await page.reload();
    });

    test('deve exibir a tela de login para usuários não autenticados', async ({ page }) => {
        await waitForApp(page);
        await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('deve fazer login com credenciais válidas', async ({ page }) => {
        test.skip(!process.env.E2E_EMAIL, 'Credenciais E2E não configuradas');
        // ... login flow
    });
});
```

**Authenticated tests with shared context** (from `e2e/flashcards.spec.ts`):
```typescript
test.describe('Flashcards', () => {
    test.skip(!process.env.E2E_EMAIL, 'Requer E2E_EMAIL e E2E_PASSWORD');

    test.beforeAll(async ({ browser }) => {
        context = await browser.newContext();
        page = await context.newPage();
        await loginUser(page);
    });

    test.afterAll(async () => { await context.close(); });
});
```

**Visual/integrity tests** (from `e2e/flashcards.spec.ts` — "Testes Visuais" section):
```typescript
test.describe('Flashcards — Testes Visuais (sem auth)', () => {
    test('página inicial carrega sem erros de JS', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        // ... verify no critical errors
    });

    test('deve ser responsivo (mobile viewport)', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        // ... check for horizontal overflow
    });
});
```

### Credential Handling

- Tests use `process.env.E2E_EMAIL` and `process.env.E2E_PASSWORD`
- Loaded from `.env.local` (via dotenv in config)
- Tests automatically `skip` if credentials are not configured
- No hardcoded credentials in source

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run test` | Run all unit tests (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:ui` | Run unit tests with interactive UI |
| `npm run test:coverage` | Run unit tests with coverage report |
| `npm run e2e` | Run all E2E tests (Playwright) |
| `npm run e2e:ui` | Run E2E tests with interactive UI |
| `npm run e2e:headed` | Run E2E tests with visible browser |
| `npx vitest run <file>` | Run a single unit test file |
| `npx vitest run --testNamePattern "<name>"` | Run tests matching a pattern |
| `npx playwright test <file>` | Run a single E2E test file |
| `npx playwright test --grep "<name>"` | Run E2E tests matching a pattern |

---

## Code Quality Commands

| Command | Description |
|---------|-------------|
| `npm run lint` | ESLint with `--report-unused-disable-directives --max-warnings 0` |
| `npm run format` | Prettier format all files |
| `npm run build` | TypeScript check + Vite build |

---

## Quality Assessment

### Overall State: **Partially tested**

**Strengths:**
- Good test patterns — clean `describe`/`it` nesting, proper setup/teardown, meaningful test descriptions in Portuguese
- Comprehensive Supabase mock available for all unit tests
- Playwright config well-structured with sequential execution, video/screenshot capture, auto dev server
- E2E tests cover critical paths (login, flashcard CRUD) with credential fallback
- Rate limiter has thorough test coverage (tokens, refill, reset, error handling, operation isolation)

**Critical Gaps:**
- **No component tests** (`src/components/` and `src/views/` have 0 coverage)
- **No hook tests** (`src/hooks/` — `useAuth`, `useSession`, `useFlashcards`, etc.)
- **No React Query hook tests** (`src/hooks/queries/`)
- **Offline sync logic** (`src/services/offline/`) untested
- **Supabase query functions** (`src/services/queries/`, `src/services/supabase/`) untested
- **Utils**: 5 of 6 utility files uncovered (`logger.ts`, `error.ts`, `localStorage.ts`, `cn.ts`, `AudioConverter.ts`)
- **Coverage target** in vitest config (`hooks/`, `services/`, `utils/`) is aspirational — most of these directories are untested

---

*Testing analysis: 2026-06-11*
