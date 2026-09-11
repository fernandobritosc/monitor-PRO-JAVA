import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { StudyRecord } from '../../../types';
import { cn } from '../../../utils/cn';

interface RecentActivitiesProps {
  records: StudyRecord[];
  maxDays?: number;
}

interface DayGroup {
  date: string;
  minutes: number;
  items: StudyRecord[];
}

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const BAR_COLORS = [
  'bg-violet-400',
  'bg-amber-300',
  'bg-teal-300',
  'bg-rose-300',
  'bg-sky-300',
  'bg-orange-300',
  'bg-lime-300',
  'bg-fuchsia-300',
];

const colorForMateria = (materia: string) => {
  let hash = 0;
  for (let i = 0; i < materia.length; i++) hash = (hash * 31 + materia.charCodeAt(i)) >>> 0;
  return BAR_COLORS[hash % BAR_COLORS.length];
};

const formatDuracao = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}min` : `${m}min`;
};

const RecentActivities: React.FC<RecentActivitiesProps> = ({ records, maxDays = 8 }) => {
  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, StudyRecord[]>();
    [...records]
      .sort((a, b) => (a.data_estudo < b.data_estudo ? 1 : a.data_estudo > b.data_estudo ? -1 : 0))
      .forEach((r) => {
        const list = map.get(r.data_estudo) || [];
        list.push(r);
        map.set(r.data_estudo, list);
      });
    return [...map.entries()].slice(0, maxDays).map(([date, items]) => ({
      date,
      minutes: items.reduce((acc, r) => acc + (Number(r.tempo) || 0), 0),
      items,
    }));
  }, [records, maxDays]);

  const parseDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  return (
    <div className="glass-premium rounded-[2rem] p-6 md:p-8 overflow-hidden flex flex-col">
      <h3 className="text-xs font-black tracking-[0.2em] text-[hsl(var(--text-muted))] uppercase mb-6">
        Últimas atividades
      </h3>
      {groups.length === 0 ? (
        <p className="text-sm text-[hsl(var(--text-muted))] py-6 text-center">
          Nenhuma atividade no período.
        </p>
      ) : (
        <div className="space-y-8 overflow-y-auto custom-scrollbar max-h-[520px] pr-2">
          {groups.map((g) => {
            const dt = parseDate(g.date);
            return (
              <div key={g.date}>
                <div className="flex items-center gap-3">
                  <div className="flex items-start gap-1.5 shrink-0">
                    <span className="text-3xl font-black text-[hsl(var(--text-bright))] leading-none tabular-nums">
                      {String(dt.getDate()).padStart(2, '0')}
                    </span>
                    <span className="flex flex-col text-[10px] font-bold text-[hsl(var(--text-muted))] leading-tight">
                      <span>
                        {MONTHS[dt.getMonth()]}/{String(dt.getFullYear()).slice(2)}
                      </span>
                      <span>{WEEKDAYS[dt.getDay()]}</span>
                    </span>
                  </div>
                  <div className="flex-1 h-0.5 bg-teal-300/70 rounded-full" />
                  <span className="flex items-center gap-1.5 text-sm font-bold text-[hsl(var(--text-bright))] tabular-nums whitespace-nowrap">
                    <Clock size={15} className="text-[hsl(var(--text-muted))]" />
                    {formatDuracao(g.minutes)}
                  </span>
                </div>
                <div className="mt-4 space-y-4">
                  {g.items.map((r) => (
                    <div key={r.id} className="flex gap-3">
                      <div className={cn('w-1.5 rounded-full shrink-0', colorForMateria(r.materia))} />
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[hsl(var(--text-bright))] uppercase tracking-tight truncate">
                          {r.materia}
                        </p>
                        <p className="text-xs text-[hsl(var(--text-muted))] line-clamp-2 leading-relaxed">
                          {r.assunto}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentActivities;
