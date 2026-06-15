import React from 'react';
import { EditalMateria } from '../../../types';
import { Layers, Clock } from 'lucide-react';

interface SimuladoScoreGridProps {
  materiasDisponiveis: EditalMateria[];
  scores: Record<string, { acertos: string; total: string }>;
  onScoreChange: (materia: string, field: 'acertos' | 'total', value: string) => void;
  tempoHHMM: string;
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  stats: { acertos: number; total: number; perc: number; weighted: number; maxWeighted: number };
}

const SimuladoScoreGrid: React.FC<SimuladoScoreGridProps> = ({
  materiasDisponiveis, scores, onScoreChange,
  tempoHHMM, onTimeChange, stats,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <label className="text-[11px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] flex items-center gap-2">
          <Layers size={14} className="text-[hsl(var(--accent))]" /> Desempenho por Matéria
        </label>
      </div>

      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest border-b border-[hsl(var(--border))]">
        <div className="col-span-6">Matéria / Peso</div>
        <div className="col-span-3 text-center">Acertos</div>
        <div className="col-span-3 text-center">Total</div>
      </div>

      <div className="glass-premium rounded-3xl p-2 border border-[hsl(var(--border))] space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
        {materiasDisponiveis.map(mat => {
          const score = scores[mat.materia] || { acertos: '', total: '' };
          const a = parseInt(score.acertos || '0');
          const t = parseInt(score.total || '0');
          const isInvalid = t > 0 && a > t;

          return (
            <div key={mat.materia} className="grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-4 items-center p-3 md:p-2 hover:bg-white/5 rounded-lg transition-colors border-b border-white/5 md:border-0 last:border-0">
              <div className="col-span-2 md:col-span-6 flex justify-between md:block items-center mb-1 md:mb-0">
                <div className="font-bold text-sm text-[hsl(var(--text-main))] truncate" title={mat.materia}>{mat.materia}</div>
                <div className="text-[10px] text-[hsl(var(--text-muted))] font-bold uppercase bg-[hsl(var(--bg-user-block))] px-2 py-0.5 rounded md:bg-transparent md:px-0">Peso {mat.peso || 1}</div>
              </div>
              <div className="col-span-1 md:col-span-3 relative">
                <label className="md:hidden text-[9px] text-slate-500 font-bold uppercase mb-1 block">Acertos</label>
                <input type="number" placeholder="0"
                  className={`w-full bg-[hsl(var(--bg-user-block))] border ${isInvalid ? 'border-red-500 text-red-400' : 'border-[hsl(var(--border))] text-green-500 dark:text-green-400'} rounded-lg px-2 py-2 md:py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-1 focus:ring-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  value={score.acertos} onChange={e => onScoreChange(mat.materia, 'acertos', e.target.value)} />
              </div>
              <div className="col-span-1 md:col-span-3 relative">
                <label className="md:hidden text-[9px] text-slate-500 font-bold uppercase mb-1 block">Total</label>
                <input type="number" placeholder="0"
                  className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-lg px-2 py-2 md:py-1.5 text-center text-sm font-bold text-[hsl(var(--text-bright))] focus:outline-none focus:ring-1 focus:ring-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={score.total} onChange={e => onScoreChange(mat.materia, 'total', e.target.value)} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
            <Clock size={14} className="text-[hsl(var(--accent))]" /> Tempo Total de Prova
          </label>
          <input type="text" placeholder="HH:MM" maxLength={5} required
            className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-black text-center text-lg"
            value={tempoHHMM} onChange={onTimeChange} />
        </div>
        <div className="glass-premium bg-gradient-to-r from-[hsl(var(--bg-user-block))] to-[hsl(var(--bg-card))] p-6 rounded-3xl border border-[hsl(var(--border))] flex flex-col justify-center shadow-2xl gap-2">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-1">Aproveitamento</div>
              <div className={`text-2xl font-black uppercase tracking-tighter ${stats.perc >= 80 ? 'text-green-400' : stats.perc >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{stats.perc.toFixed(1)}%</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-[hsl(var(--text-bright))] leading-none tracking-tighter">
                {stats.acertos} <span className="text-base text-[hsl(var(--text-muted))] font-medium">/ {stats.total}</span>
              </div>
              <div className="text-[9px] text-[hsl(var(--text-muted))] uppercase font-black tracking-widest mt-1">Questões Totais</div>
            </div>
          </div>
          {stats.maxWeighted > 0 && (
            <div className="pt-3 border-t border-[hsl(var(--border))] flex justify-between items-center">
              <div className="text-[10px] font-black text-[hsl(var(--accent))] uppercase tracking-widest">Pontuação Ponderada</div>
              <div className="text-base font-black text-[hsl(var(--text-bright))] tracking-tighter">
                {stats.weighted.toFixed(1)} <span className="text-[hsl(var(--text-muted))] text-xs">/ {stats.maxWeighted}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimuladoScoreGrid;
