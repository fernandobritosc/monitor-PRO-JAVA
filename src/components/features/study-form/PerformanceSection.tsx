import React from 'react';
import { cn } from '../../../utils/cn';
import { handleTimeMask } from '../../../utils/form';
import { Target, Clock } from 'lucide-react';

interface PerformanceSectionProps {
    acertos: string;
    setAcertos: (v: string) => void;
    total: string;
    setTotal: (v: string) => void;
    tempoHHMM: string;
    setTempoHHMM: (v: string) => void;
    meta: string;
    setMeta: (v: string) => void;
    taxa: number;
    timerSeconds?: number;
    onFillFromTimer?: () => void;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({
    acertos,
    setAcertos,
    total,
    setTotal,
    tempoHHMM,
    setTempoHHMM,
    meta,
    setMeta,
    taxa,
    timerSeconds = 0,
    onFillFromTimer,
}) => {
    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempoHHMM(handleTimeMask(e.target.value));
    };

    const numericTotal = parseInt(total) || 0;
    const showTaxa = numericTotal > 0;

    return (
        <div className="glass-premium p-8 rounded-3xl border border-[hsl(var(--border))] space-y-6 relative z-10">
            <h4 className="text-xs font-black text-[hsl(var(--text-muted))] flex items-center gap-3 uppercase tracking-[0.2em]"><Target size={18} className="text-[hsl(var(--accent))]" /> Performance</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest">Tempo (HH:MM)</label>
                        {timerSeconds > 0 && onFillFromTimer && (
                            <button
                                type="button"
                                onClick={onFillFromTimer}
                                className="text-[9px] font-black text-[hsl(var(--accent))] uppercase flex items-center gap-1 hover:underline"
                            >
                                <Clock size={10} /> Usar Timer
                            </button>
                        )}
                    </div>
                    <input type="text" placeholder="HH:MM" maxLength={5} required className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] text-[hsl(var(--text-bright))] font-black text-center text-lg" value={tempoHHMM} onChange={handleTimeChange} />
                </div>
                <div className="space-y-2"><label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Acertos</label><input type="number" min="0" className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500/50 text-green-400 font-black text-center text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={acertos} onChange={(e) => setAcertos(e.target.value)} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Total Questões</label><input type="number" min="0" className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] text-[hsl(var(--text-bright))] font-black text-center text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Nº da Meta</label><input type="text" placeholder="Ex: Meta 05" className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] text-[hsl(var(--text-bright))] font-black text-center text-lg" value={meta} onChange={(e) => setMeta(e.target.value)} /></div>
            </div>
            {showTaxa && (
                <div className={cn(
                    'flex flex-col items-center justify-center bg-[hsl(var(--bg-user-block))] rounded-2xl p-6 border transition-all duration-500',
                    taxa >= 80 ? 'border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]' :
                    taxa >= 60 ? 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]' :
                    'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]',
                )}>
                    <span className="text-[10px] text-[hsl(var(--text-muted))] font-black uppercase tracking-[0.2em] mb-2">Taxa de Aproveitamento</span>
                    <div className={cn(
                        'text-4xl font-black tracking-tighter',
                        taxa >= 80 ? 'text-green-400' :
                        taxa >= 60 ? 'text-yellow-400' :
                        'text-red-400',
                    )}>
                        {taxa.toFixed(0)}%
                    </div>
                </div>
            )}
        </div>
    );
};
