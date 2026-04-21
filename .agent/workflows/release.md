---
description: Workflow for standardizing versioning and release. Ensures code is tested, version is bumped using SemVer, and Git tags are created safely.
---

# /release - Versioning and Release Management

$ARGUMENTS

---

## Purpose

This command standardizes version control, forcing a strict testing cycle before bumping the project version (Semantic Versioning) and preparing a release. This prevents untested or broken code from being published and solves the lack of internal tracking.

---

## Sub-commands

```
/release            - Runs interactive release process (tests -> version bump -> tag)
/release patch      - Bumps the version (x.x.Y) for bug fixes
/release minor      - Bumps the version (x.Y.x) for new features (retro-compatible)
/release major      - Bumps the version (Y.x.x) for breaking changes
/release check      - Only runs tests and verifies git status
```

---

## The Versioning Enforce Protocol

Before ANY version bump, the agent MUST execute the following pipeline:

### 1. Verification Phase (Strict)
- [ ] Ensure git working directory is clean (`git status`).
- [ ] Run Linter: `npm run lint`
- [ ] Run Unit Tests: `npm run test`
- [ ] Run E2E Tests (Optional/If configured): `npm run e2e`

*Note: If ANY of the commands above fail, the release process MUST abort immediately. Do not proceed to version bump.*

### 2. Version Bump Phase
- Identify current version in `package.json`.
- Run the appropriate npm version command:
  - `npm version patch` (Fixes)
  - `npm version minor` (New features)
  - `npm version major` (Breaking changes)
- This automatically updates `package.json` and creates a Git commit and Git tag.

### 3. Changelog Documentation
- Document what was changed between the previous version and this new version.
- Create a bulleted list of features, fixes, and refactors.

### 4. User Authorization Gate (MANDATORY)
> [!CAUTION]
> As the AI agent executing this workflow, you MUST STOP and wait for the user's explicit OK (SIM / Y) before executing any further version bumps or commits that push to the repository. Request authorization, present what will be changed, and wait.

### 5. Git Push Phase
- Only after the user confirms, execute:
  - `git push origin main`
  - `git push --tags`
- Update the Changelog UI (`src/constants/changelog.ts`) with the new version context before finalizing.

---

## Automated Workflow Execution

```
┌─────────────────┐
│   /release      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Lint & Tests    │ (npm run lint && npm run test)
└────────┬────────┘
         │
    Pass? ──No──► ❌ Abort & Fix
         │
        Yes
         │
         ▼
┌─────────────────┐
│  Version Bump   │ (npm version patch/minor/major)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Git Tag      │ (auto-created by npm)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ✅ Ready to     │ -> Deploy
│   publish!      │ (Call /deploy context)
└─────────────────┘
```
