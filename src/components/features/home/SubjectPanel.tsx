import React, { useState } from 'react';
import { BadgeCheck, Check, PenLine, Percent, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface SubjectStat {
  materia: string;
  time: number;
  correct: number;
  total: number;
}

export interface SimuladoTotal {
  time: number;
  correct: number;
  total: number;
}

interface SubjectPanelProps {
  subjects: SubjectStat[];
  simulados: SimuladoTotal;
}

const formatTempo = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}min` : `${m}min`;
};

const pctBadgeClass = (pct: number) =>
  pct >= 80
    ? 'bg-emerald-500 text-white'
    : pct >= 70
      ? 'bg-amber-400 text-amber-950'
      : 'bg-red-500 text-white';

const SubjectPanel: React.FC<SubjectPanelProps> = ({ subjects, simulados }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const renderRow = (
    key: string,
    name: React.ReactNode,
    time: number,
    correct: number,
    total: number,
    highlight: boolean,
    onClick?: () => void
  ) => {
    const wrong = total - correct;
    const pct = total > 0 ? (correct / total) * 100 : 0;
    return (
      <tr
        key={key}
        onClick={onClick}
        className={cn(
          'border-b border-[hsl(var(--border))] last:border-0',
          onClick && 'cursor-pointer',
          highlight ? 'bg-teal-500/10' : 'even:bg-white/[0.02]'
        )}
      >
        <td className="px-2 md:px-3 py-3 text-sm font-bold text-teal-600 dark:text-teal-400">
          <span className="flex items-center gap-2">
            {highlight && onClick && <BadgeCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
            {name}
          </span>
        </td>
        <td className="px-2 md:px-3 py-3 text-sm text-[hsl(var(--text-main))] tabular-nums whitespace-nowrap text-center">
          {formatTempo(time)}
        </td>
        <td className="px-1 md:px-2 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-center">
          {correct}
        </td>
        <td className="px-1 md:px-2 py-3 text-sm font-bold text-red-500 tabular-nums text-center">
          {wrong}
        </td>
        <td className="px-1 md:px-2 py-3 text-sm font-bold text-[hsl(var(--text-main))] tabular-nums text-center">
          {total}
        </td>
        <td className="px-2 md:px-3 py-3 text-center">
          <span className={cn('text-[11px] font-black rounded px-1.5 py-0.5 tabular-nums', pctBadgeClass(pct))}>
            {Math.round(pct)}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="glass-premium rounded-[2rem] p-6 md:p-8 overflow-hidden">
      <h3 className="text-xs font-black tracking-[0.2em] text-[hsl(var(--text-muted))] uppercase mb-4">
        Painel
      </h3>
      {subjects.length === 0 && simulados.total === 0 ? (
        <p className="text-sm text-[hsl(var(--text-muted))] py-6 text-center">
          Nenhum estudo registrado no período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-2 md:px-3 py-3 text-left text-sm font-bold text-[hsl(var(--text-bright))]">
                  Disciplinas
                </th>
                <th className="px-2 md:px-3 py-3 text-sm font-bold text-[hsl(var(--text-bright))] text-center whitespace-nowrap">
                  Tempo
                </th>
                <th className="px-1 md:px-2 py-3 text-center" title="Acertos">
                  <Check size={16} className="inline text-emerald-600 dark:text-emerald-400" />
                </th>
                <th className="px-1 md:px-2 py-3 text-center" title="Erros">
                  <X size={16} className="inline text-red-500" />
                </th>
                <th className="px-1 md:px-2 py-3 text-center" title="Total de questões">
                  <PenLine size={16} className="inline text-[hsl(var(--text-muted))]" />
                </th>
                <th className="px-2 md:px-3 py-3 text-center" title="Aproveitamento">
                  <Percent size={16} className="inline text-[hsl(var(--text-muted))]" />
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) =>
                renderRow(
                  s.materia,
                  s.materia,
                  s.time,
                  s.correct,
                  s.total,
                  selected === s.materia,
                  () => setSelected((prev) => (prev === s.materia ? null : s.materia))
                )
              )}
              {simulados.total > 0 &&
                renderRow(
                  '__simulados__',
                  'Simulados',
                  simulados.time,
                  simulados.correct,
                  simulados.total,
                  true
                )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SubjectPanel;
