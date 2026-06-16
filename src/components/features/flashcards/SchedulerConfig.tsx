import React from 'react';
import { Settings2, Zap, Heart, Coffee } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { SchedulerConfig } from '../../../utils/scheduler';

interface SchedulerConfigPanelProps {
  config: SchedulerConfig;
  onChange: (config: SchedulerConfig) => void;
  estimatedMinutes?: number;
}

const turboLabel = 'TURBO';
const suaveLabel = 'SUAVE';
const normalLabel = 'NORMAL';

const ModeIcon: Record<SchedulerConfig['mode'], React.ReactNode> = {
  turbo: <Zap size={16} />,
  suave: <Coffee size={16} />,
  normal: <Heart size={16} />,
};

const modeDescriptions: Record<SchedulerConfig['mode'], string> = {
  turbo: 'Dobro de cards novos. Ritmo intenso.',
  suave: 'Metade dos pendentes, sem cards novos.',
  normal: 'Equilíbrio entre revisões e novos cards.',
};

export const SchedulerConfigPanel: React.FC<SchedulerConfigPanelProps> = ({
  config,
  onChange,
  estimatedMinutes,
}) => {
  const modes: SchedulerConfig['mode'][] = ['normal', 'turbo', 'suave'];

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] p-5 shadow-xl">
      <div className="mb-4 flex items-center gap-3">
        <Settings2
          size={18}
          className="text-[hsl(var(--accent))]"
        />
        <span className="text-[11px] font-black uppercase tracking-widest text-[hsl(var(--text-bright))]">
          Agendador Inteligente
        </span>
        {estimatedMinutes !== undefined && (
          <span className="ml-auto rounded-full bg-[hsl(var(--accent)/0.15)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--accent))]">
            ~{estimatedMinutes} min
          </span>
        )}
      </div>

      {/* Mode Selector */}
      <div className="mb-5 flex gap-2">
        {modes.map(mode => (
          <button
            key={mode}
            onClick={() => onChange({ ...config, mode })}
            className={cn(
              'flex flex-1 flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all',
              config.mode === mode
                ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-[hsl(var(--accent)/0.3)]'
                : 'bg-[hsl(var(--bg-main))] text-[hsl(var(--text-muted))] hover:text-white',
            )}
          >
            {ModeIcon[mode]}
            <span>{mode === 'turbo' ? turboLabel : mode === 'suave' ? suaveLabel : normalLabel}</span>
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="mb-4 text-[11px] leading-relaxed text-[hsl(var(--text-muted))]">
        {modeDescriptions[config.mode]}
      </p>

      {/* Daily New Cards Slider (hidden in suave mode since it always yields 0 new cards) */}
      {config.mode !== 'suave' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="daily-new-cards"
              className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--text-muted))]"
            >
              Cards novos por dia
            </label>
            <span className="rounded-md bg-[hsl(var(--bg-main))] px-2.5 py-0.5 text-[12px] font-black tabular-nums text-[hsl(var(--accent))]">
              {config.dailyNewCards}
            </span>
          </div>
          <input
            id="daily-new-cards"
            type="range"
            min={5}
            max={50}
            step={5}
            value={config.dailyNewCards}
            onChange={e =>
              onChange({ ...config, dailyNewCards: Number(e.target.value) })
            }
            className="w-full cursor-pointer appearance-none rounded-full bg-[hsl(var(--bg-main))] outline-none"
            style={{
              height: 6,
              accentColor: 'hsl(var(--accent))',
            }}
          />
          <div className="flex justify-between text-[9px] text-[hsl(var(--text-muted))]">
            <span>5</span>
            <span>50</span>
          </div>
        </div>
      )}
    </div>
  );
};
