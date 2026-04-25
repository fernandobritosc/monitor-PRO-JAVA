---
name: lint-and-validate
description: "MANDATORY: Run appropriate validation tools after EVERY code change. Do not finish a task until the code is error-free."
---

# Lint and Validate Skill (MonitorPRO)

> **MANDATORY:** Run appropriate validation tools after EVERY code change. Do not finish a task until the code is error-free.

### Procedures by Ecosystem

#### Node.js / TypeScript (MonitorPRO Stack)
1. **Lint/Fix:** `npm run lint` or `npx eslint "path" --fix`
2. **Types:** `npx tsc --noEmit`
3. **Security:** `npm audit --audit-level=high`

#### Python
1. **Linter (Ruff):** `ruff check "path" --fix` (Fast & Modern)
2. **Security (Bandit):** `bandit -r "path" -ll`
3. **Types (MyPy):** `mypy "path"`

## The Quality Loop
1. **Write/Edit Code**
2. **Run Audit:** `npm run lint && npx tsc --noEmit`
3. **Analyze Report**: Verificar o relatório final de auditoria.
4. **Fix & Repeat**: Submeter código com falhas de auditoria NÃO é permitido.

## Error Handling
- Se o `lint` falhar: Corrija os problemas de estilo ou sintaxe imediatamente.
- Se o `tsc` falhar: Corrija as inconsistências de tipo antes de prosseguir.
- Se nenhuma ferramenta estiver configurada: Verifique `.eslintrc` ou `tsconfig.json` e sugira a criação.

---
**Strict Rule:** Nenhum código deve ser commitado ou reportado como "concluído" sem passar por esses checks.

---

## Scripts Auxiliares

| Script | Propósito | Comando |
|--------|---------|---------|
| `scripts/lint_runner.py` | Check de lint unificado | `python scripts/lint_runner.py <project_path>` |
| `scripts/type_coverage.py` | Análise de cobertura de tipos | `python scripts/type_coverage.py <project_path>` |
