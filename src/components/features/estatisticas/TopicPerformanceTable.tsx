import React, { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface TopicPerformanceRow {
  materia: string;
  assunto: string;
  total: number;
  correct: number;
  precision: number;
}

interface TopicPerformanceTableProps {
  rows: TopicPerformanceRow[];
}

type SortKey = 'materia' | 'assunto' | 'total' | 'precision';

const pctBadgeClass = (pct: number) =>
  pct >= 80
    ? 'bg-emerald-500 text-white'
    : pct >= 70
      ? 'bg-amber-400 text-amber-950'
      : 'bg-red-500 text-white';

const TopicPerformanceTable: React.FC<TopicPerformanceTableProps> = ({ rows }) => {
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(key === 'materia' || key === 'assunto' ? 1 : -1);
    }
  };

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return cmp * sortDir;
    });
  }, [rows, sortKey, sortDir]);

  const HeaderButton: React.FC<{ label: string; k: SortKey; className?: string }> = ({
    label,
    k,
    className,
  }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-bold text-[hsl(var(--text-bright))] hover:text-[hsl(var(--accent))] transition-colors',
        className
      )}
    >
      {label}
      <ArrowUpDown
        size={13}
        className={cn('text-[hsl(var(--text-muted))]', sortKey === k && 'text-[hsl(var(--accent))]')}
      />
    </button>
  );

  return (
    <div className="glass-premium rounded-[2rem] p-6 md:p-8 overflow-hidden">
      <h3 className="text-xs font-black tracking-[0.2em] text-[hsl(var(--text-muted))] uppercase mb-4">
        Assuntos x desempenho
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-[hsl(var(--text-muted))] py-6 text-center">
          Nenhum estudo no período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-4 py-3 text-left">
                  <HeaderButton label="Disciplina" k="materia" />
                </th>
                <th className="px-4 py-3 text-center">
                  <HeaderButton label="Assunto" k="assunto" className="mx-auto" />
                </th>
                <th className="px-4 py-3 text-center">
                  <HeaderButton label="Questões Resolvidas" k="total" className="mx-auto" />
                </th>
                <th className="px-4 py-3 text-center">
                  <HeaderButton label="Desempenho" k="precision" className="mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={`${r.materia}|${r.assunto}|${i}`}
                  className="border-b border-[hsl(var(--border))] last:border-0 even:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 text-sm text-[hsl(var(--text-main))] whitespace-nowrap">
                    {r.materia}
                  </td>
                  <td className="px-4 py-3 text-sm text-[hsl(var(--text-main))] max-w-[420px]">
                    {r.assunto}
                  </td>
                  <td className="px-4 py-3 text-sm text-[hsl(var(--text-main))] tabular-nums text-center">
                    {r.total}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'text-[11px] font-black rounded px-1.5 py-0.5 tabular-nums',
                        pctBadgeClass(r.precision)
                      )}
                    >
                      {Math.round(r.precision)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TopicPerformanceTable;
