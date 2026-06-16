import React from 'react';
import { Trophy } from 'lucide-react';

interface SessionStats {
  learned: number;
  review: number;
  total: number;
}

interface SessionSummaryProps {
  sessionStats: SessionStats;
  endSession: () => void;
  showSessionSummary: boolean;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({ sessionStats, endSession }) => {
  return (
    <div className="glass-premium rounded-[3rem] p-16 text-center animate-in zoom-in-95 border-2 border-[hsl(var(--border))] shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500"></div>
      <div className="w-28 h-28 bg-yellow-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(234,179,8,0.15)] border border-yellow-500/20">
        <Trophy size={56} className="text-yellow-400 animate-bounce" />
      </div>
      <h2 className="text-4xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter mb-4">Meta Alcançada!</h2>
      <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mb-12">Cognição otimizada. Confira o relatório da sessão.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-2xl mx-auto">
        <div className="glass-premium bg-green-500/5 p-6 rounded-[1.5rem] border border-green-500/20">
          <div className="text-4xl font-black text-green-400 tracking-tighter mb-2">{sessionStats.learned}</div>
          <div className="text-[9px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.2em]">Sólido</div>
        </div>
        <div className="glass-premium bg-yellow-500/5 p-6 rounded-[1.5rem] border border-yellow-500/20">
          <div className="text-4xl font-black text-yellow-400 tracking-tighter mb-2">{sessionStats.review}</div>
          <div className="text-[9px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.2em]">Retorno</div>
        </div>
        <div className="glass-premium bg-blue-500/5 p-6 rounded-[1.5rem] border border-blue-500/20">
          <div className="text-4xl font-black text-blue-400 tracking-tighter mb-2">{sessionStats.total}</div>
          <div className="text-[9px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.2em]">Analizados</div>
        </div>
      </div>
      <button onClick={endSession} className="px-12 py-5 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--bg-main))] text-[hsl(var(--text-bright))] rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all border border-[hsl(var(--border))] shadow-xl active:scale-95">
        Encerrar Sessão
      </button>
    </div>
  );
};
