/**
 * Filtro de período compartilhado — KPI (HomeView) e Ranking (GlobalTop)
 *
 * Regra única (verdade local, filtrada por missão):
 * - days = 0 ou null  → sem filtro (ALL / Total)
 * - days = N (>0)     → últimos N dias incluindo hoje.
 *   Ex: 7D com hoje=21 → inclui 15..21 (7 dias).
 *
 * Usa `data_estudo` (YYYY-MM-DD) em UTC para evitar drift de timezone
 * entre Dexie local e RPC `get_ranking_by_period` no servidor.
 */

export const getPeriodCutoffMs = (days: number | null): number | null => {
  if (!days || days <= 0) return null;
  const now = new Date();
  // Últimos N dias incluindo hoje → cutoff = hoje - (N-1), à 00:00 UTC
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
};

export const isDateInPeriod = (
  dataEstudo: string,
  cutoffMs: number | null,
): boolean => {
  if (cutoffMs === null) return true;
  if (!dataEstudo) return false;
  const [y, m, d] = String(dataEstudo).split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return false;
  return Date.UTC(y, m - 1, d) >= cutoffMs;
};

/** Horas exibidas — unificado: round (igual ao KPI `toFixed(0)`) */
export const minutesToDisplayHours = (totalMinutos: number): number =>
  Math.round((Number(totalMinutos) || 0) / 60);
