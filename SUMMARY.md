---
phase: F7
plan: M1
subsystem: flashcards
tags:
  - scheduler
  - spaced-repetition
  - study-planning
tech-stack:
  added:
    - sm2-scheduler (internal utility)
  patterns:
    - generateStudyPlan with mode-based card selection
    - getDueCards with next_review + fallback status check
key-files:
  created:
    - src/utils/scheduler.ts
    - src/components/features/flashcards/SchedulerConfig.tsx
  modified:
    - src/hooks/useFlashcardsStudy.ts
decisions: []
---

# Phase F7 Plan M1: Smart Scheduler Implementation

## One-liner
SM2-based study scheduler with configurable Normal/Turbo/Suave modes, due-card prioritization by ease factor, and a React configuration panel.

## Objective
Replace the manual priority/normal grouping in `useFlashcardsStudy` with a proper scheduler utility that uses SM2 fields (`next_review`, `ease_factor`, `status`) to intelligently plan daily study sessions. Provide a UI for users to configure daily new card limits and study intensity mode.

## Tasks Executed

| #  | Name                         | Type | Commit     | Files                                                                                                                        |
|----|------------------------------|------|------------|------------------------------------------------------------------------------------------------------------------------------|
| 1  | Create scheduler utility     | feat | `44703dc8` | `src/utils/scheduler.ts`                                                                                                     |
| 1b | Fix getDueCards edge case    | fix  | `29e1d531` | `src/utils/scheduler.ts` (getDueCards: include non-date review cards)                                                        |
| 2  | Update useFlashcardsStudy    | feat | `adc87cda` | `src/hooks/useFlashcardsStudy.ts` (import generateStudyPlan, add schedulerConfig param, update startStudySession)            |
| 3  | Create SchedulerConfig panel | feat | `bfc93174` | `src/components/features/flashcards/SchedulerConfig.tsx`                                                                     |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] getDueCards excluded review-status cards without next_review**
- **Found during:** Task 2 verification (3 test failures in useFlashcardsStudy.test.ts)
- **Issue:** Cards with status `revisar`/`aprendendo`/`revisando` but no `next_review` date were filtered out by `getDueCards`, causing them to fall through the cracks (neither in dueCards nor newCards).
- **Fix:** Added fallback check — if no `next_review` but status indicates active review need, treat card as due. Date-less cards get the highest overdue priority (999999ms fallback).
- **Files modified:** `src/utils/scheduler.ts`
- **Commit:** `29e1d531`

## Known Stubs

None. All created components have fully wired data flows.

## Threat Flags

None. The scheduler utility is pure logic with no network/file access. The config panel is presentational with no data mutation.

## Verification Results

| Check           | Result                        |
|-----------------|-------------------------------|
| `npx tsc --noEmit` | ✅ No errors in changed files (1 pre-existing error in `StudyForm.tsx` — out of scope) |
| `npm run lint`  | ✅ No lint errors in changed files (127 pre-existing errors in unrelated files — out of scope) |
| `npm run test`  | ✅ All 114 tests pass across 11 test files |

## Self-Check: PASSED

- Created files verified: `src/utils/scheduler.ts` ✅, `src/hooks/useFlashcardsStudy.ts` (modified) ✅, `src/components/features/flashcards/SchedulerConfig.tsx` ✅
- All commits verified in git log ✅
