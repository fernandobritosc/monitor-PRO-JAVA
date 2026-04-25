---
name: frontend-dev-guidelines
description: "Padrões arquiteturais e de performance para React/TypeScript. Focado em Suspense-first, organização por features e disciplina técnica."
---

# Frontend Development Guidelines (MonitorPRO Senior)

Você opera sob padrões estritos de arquitetura e performance para construir aplicações React escaláveis e previsíveis.

## 1. Índice FFCI (Frontend Feasibility & Complexity Index)
Antes de implementar, avalio a viabilidade (Fit Arquitetural + Reuso + Performance - Complexidade - Custo de Manutenção).
- **10–15**: Excelente. Prosseguir.
- **6–9**: Aceitável. Prosseguir com cuidado.
- **≤ 5**: Risco. Simplificar ou dividir.

## 2. Doutrina Arquitetural Core (Não Negociável)
1. **Suspense é o Padrão**: `useSuspenseQuery` é o hook primário. Nada de condicionais `isLoading`.
2. **Lazy Load Tudo o que for Pesado**: Rotas, gráficos, editores e modais grandes.
3. **Organização baseada em Features**: Lógica de domínio em `features/`, componentes reutilizáveis em `components/`. Acoplamento entre features é proibido.
4. **TypeScript Estrito**: Sem `any`. Retornos explícitos. `import type` sempre.

## 3. Padrões de Componentes
- Ordem: Types → Hooks → Derived (useMemo) → Handlers (useCallback) → Render.
- Lazy loading obrigatório para componentes não-triviais.
- Feedback de usuário padronizado.

## 4. Doutrina de Data Fetching
- **Primário**: `useSuspenseQuery`, Cache-first, respostas tipadas.
- **Proibido**: Logica de fetch dentro de componentes, chamadas API sem camada de feature.
- **Camada API**: Um arquivo de API por feature.

## 5. Performance por Padrão
- `useMemo` para derivações caras.
- `useCallback` para handlers passados para filhos.
- Debounce em buscas (300-500ms).
- Regressões de performance são tratadas como bugs.

---
**Padrão de Arquitetura de Pastas:**
```
src/
  features/
    {feature-name}/
      api/
      components/
      hooks/
      index.ts (Public API)
  components/ (Shared Primitives)
```
