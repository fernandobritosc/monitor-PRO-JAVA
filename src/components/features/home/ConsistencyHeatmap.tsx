import React, { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface HeatmapDay {
  date: string;
  minutes: number;
  intensity: number;
}

interface ConsistencyHeatmapProps {
  data: HeatmapDay[];
  summaryDate: string;
  currentStreak: number;
  recordStreak: number;
  daysOff: number;
  streakByDate: Record<string, number>;
  onDateSelect: (date: string) => void;
}

const WINDOW_SIZE = 30;

const formatShort = (iso: string) => {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
};

const formatFull = (iso: string) => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

const pluralDias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

const ConsistencyHeatmap: React.FC<ConsistencyHeatmapProps> = ({
  data,
  summaryDate,
  currentStreak,
  recordStreak,
  daysOff,
  streakByDate,
  onDateSelect,
}) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(data.length / WINDOW_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const windowDays = useMemo(() => {
    const end = data.length - safePage * WINDOW_SIZE;
    return data.slice(Math.max(0, end - WINDOW_SIZE), end);
  }, [data, safePage]);

  const rangeLabel =
    windowDays.length > 0
      ? `${formatShort(windowDays[0].date)} ~ ${formatShort(windowDays[windowDays.length - 1].date)}`
      : '--/-- ~ --/--';

  return (
    <div className="glass-premium rounded-[2rem] p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xs font-black tracking-[0.2em] text-[hsl(var(--text-muted))] uppercase flex items-center gap-2">
          Constância nos estudos
          <span title="Dias com pelo menos 1 minuto de estudo registrado">
            <Info size={14} className="text-[hsl(var(--text-muted))] opacity-70" />
          </span>
        </h3>
        <div className="flex items-center gap-1 text-xs font-bold text-[hsl(var(--text-muted))]">
          <button
            type="button"
            aria-label="Período anterior"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
            className="p-1 rounded-lg hover:text-[hsl(var(--accent))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="tabular-nums whitespace-nowrap">{rangeLabel}</span>
          <button
            type="button"
            aria-label="Período seguinte"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            className="p-1 rounded-lg hover:text-[hsl(var(--accent))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-[hsl(var(--text-main))] flex items-center gap-2 flex-wrap">
        {recordStreak === 0 ? (
          <span>Você ainda não registrou estudos. Comece hoje a sua sequência!</span>
        ) : currentStreak > 0 ? (
          <span>
            Você está há <strong className="font-black">{pluralDias(currentStreak)}</strong> sem
            falhar! Seu recorde é de{' '}
            <strong className="font-black">{pluralDias(recordStreak)}</strong> sem falhas.
          </span>
        ) : (
          <span>
            Você está há <strong className="font-black">{pluralDias(daysOff)}</strong> sem
            estudar. Seu recorde é de{' '}
            <strong className="font-black">{pluralDias(recordStreak)}</strong> sem falhas.
          </span>
        )}
        <Calendar size={15} className="text-[hsl(var(--text-muted))]" />
      </p>

      <div className="mt-5 flex gap-1 overflow-hidden p-1">
        {windowDays.map((day) => {
          const studied = day.minutes > 0;
          const streak = streakByDate[day.date] || 0;
          const tooltip = studied
            ? `${formatFull(day.date)} • ${day.minutes} min • ${streak} ${streak === 1 ? 'dia' : 'dias'} sem falhar`
            : `${formatFull(day.date)} • sem estudo`;
          return (
            <button
              key={day.date}
              type="button"
              title={tooltip}
              onClick={() => onDateSelect(day.date)}
              className={cn(
                'flex-1 min-w-0 aspect-square rounded-xl flex items-center justify-center transition-all',
                studied
                  ? 'bg-teal-300 hover:bg-teal-200'
                  : 'bg-[hsl(var(--bg-user-block))] hover:brightness-150',
                day.date === summaryDate &&
                  'ring-2 ring-[hsl(var(--accent))] ring-offset-2 ring-offset-[hsl(var(--bg-main))]'
              )}
            >
              {studied && <div className="w-2.5 h-2.5 rounded-full bg-teal-800/70" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ConsistencyHeatmap;
