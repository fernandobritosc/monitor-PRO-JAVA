import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface HeatmapDay {
  date: string;
  intensity: number;
}

interface ConsistencyHeatmapProps {
  data: HeatmapDay[];
  summaryDate: string;
  inactiveStreak: number;
  onDateSelect: (date: string) => void;
}

const getIntensityClass = (intensity: number) => {
  switch (intensity) {
    case 0: return 'bg-[hsl(var(--bg-user-block))]';
    case 1: return 'bg-[hsl(var(--accent)/0.2)]';
    case 2: return 'bg-[hsl(var(--accent)/0.4)]';
    case 3: return 'bg-[hsl(var(--accent)/0.7)]';
    default: return 'bg-[hsl(var(--accent))] shadow-[0_0_10px_hsl(var(--accent)/0.5)]';
  }
};

const ConsistencyHeatmap: React.FC<ConsistencyHeatmapProps> = ({ data, summaryDate, inactiveStreak, onDateSelect }) => {
  return (
    <div className="glass-premium rounded-[2.5rem] p-8 md:p-10">
      <div className="flex justify-between items-center mb-12">
        <h3 className="text-lg font-black flex items-center gap-3 tracking-tighter text-[hsl(var(--text-bright))] uppercase">
          <Calendar className="text-[hsl(var(--accent))]" /> Mapa de Constância
        </h3>
        <span className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest">Últimos 120 Dias</span>
      </div>
      <div className="flex flex-wrap gap-2 justify-start">
        {data.map((day) => (
          <div
            key={day.date}
            className={cn(
              'w-3.5 h-3.5 md:w-4 md:h-4 rounded-[4px] transition-all relative cursor-pointer',
              day.date === summaryDate
                ? 'ring-2 ring-[hsl(var(--accent))] ring-offset-2 ring-offset-[hsl(var(--bg-main))] z-10 scale-125'
                : 'hover:scale-150 hover:z-20'
            )}
            onClick={() => onDateSelect(day.date)}
          >
            <div className={cn('w-full h-full rounded-[4px]', getIntensityClass(day.intensity))} />
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-10">
        <div className="flex items-center gap-4 opacity-40 text-[8px] font-black uppercase tracking-widest">
          <span>Menos</span>
          <div className="flex gap-1.5">{Array.from({ length: 5 }, (_, idx) => (
            <div key={idx} className={cn('w-2.5 h-2.5 rounded-sm', getIntensityClass(idx))} />
          ))}</div>
          <span>Mais</span>
        </div>
        {inactiveStreak > 0 && (
          <div className="px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Pausa Detectada: {inactiveStreak}d Off-line
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsistencyHeatmap;
