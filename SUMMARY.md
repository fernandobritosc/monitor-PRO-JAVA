# Unit Tests & CI Workflow Summary

**Date:** 2026-06-15  
**Duration:** ~15 min  
**Commits:** 4

## Files Created

| # | File | Description |
|---|------|-------------|
| 1 | `src/hooks/useNotifications.test.ts` | Unit tests for `useNotifications` hook — 9 tests |
| 2 | `src/hooks/useAuth.test.ts` | Unit tests for `useAuth` hook — 8 tests |
| 3 | `src/hooks/queries/useStudyRecords.test.ts` | Unit tests for `useStudyRecords` query hook — 6 tests |
| 4 | `.github/workflows/ci.yml` | CI workflow with Node 20, npm cache, lint, test, typecheck |

## Test Coverage

### `useNotifications` (9 tests)
- fetchData on mount: calls `getByUser` with user ID and sets notifications
- Computes `unreadCount` correctly
- `markAsRead(id)`: calls `markAsRead` with the id
- `markAsRead()` (no id): calls `markAllAsRead`
- `markAsRead` refetches data after marking
- Subscribe on mount: calls `notificationsQueries.subscribe`
- Unsubscribe on unmount: calls `unsubscribe`
- No session: does not fetch
- Empty response: handles gracefully

### `useAuth` (8 tests)
- `getSession` on mount: calls `supabase.auth.getSession`
- Sets session and userEmail from result
- Handles null session
- `signOut`: calls `clearUserKey` and `supabase.auth.signOut`
- `onAuthStateChange` cleanup: unsubscribes on unmount
- Auth state updates session on event
- `deriveKeyFromUserId` called when session has user ID

### `useStudyRecords` (6 tests)
- Fetches data from local DB when userId provided
- Calls `studyRecordsQueries.getByUser` when online
- Query disabled when userId is undefined (enabled: false)
- Sets up Supabase realtime subscription
- Cleans up subscription on unmount
- Offline mode: falls back to local data, does not call remote

## CI Workflow

- Trigger: push/PR to `main`
- Node 20 with npm cache
- Steps: `npm ci` → `npm test` → `npm run lint` → `npx tsc --noEmit`

## Commits

```
1c9eff5d ci: add CI workflow with lint, test, and typecheck
7b03641a test(hooks): add unit tests for useStudyRecords query hook
9085442f test(hooks): add unit tests for useAuth hook
57327693 test(hooks): add unit tests for useNotifications hook
```

## Verification

- **TypeScript:** No new errors (1 pre-existing error in `src/services/offline/sync.test.ts`, unrelated)
- **Tests:** All 23 new tests pass (114 total across all test files)
- **Lint:** No new lint errors (all 153 errors are pre-existing in unrelated files)

## Deviations

None — all tasks executed as planned.
