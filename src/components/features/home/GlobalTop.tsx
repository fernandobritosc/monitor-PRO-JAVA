import React, { useState, useEffect } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import { profilesQueries } from '../../../services/queries';

interface RankerItem {
  id: string;
  name: string;
  hours: number;
  questions: number;
  isUser: boolean;
  totalTempo: number;
}

interface GlobalTopProps {
  limit?: number;
}

const GlobalTop: React.FC<GlobalTopProps> = ({ limit = 15 }) => {
  const [rankers, setRankers] = useState<RankerItem[]>([]);
  const [loadingRank, setLoadingRank] = useState(true);
  const [timeFilter, setTimeFilter] = useState<number | null>(7);

  useEffect(() => {
    const fetchRanking = async () => {
      setLoadingRank(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const data = await profilesQueries.getRankingFiltered(timeFilter);

        if (data) {
          const formatted = data.map((r: { user_id: string; name?: string | null; total_tempo: number; total_questoes: number }) => {
            const hours = Math.floor(r.total_tempo / 60);
            return {
              id: r.user_id,
              name: r.name || 'Anônimo',
              hours,
              questions: r.total_questoes,
              isUser: user ? r.user_id === user.id : false,
              totalTempo: r.total_tempo,
            };
          });

          formatted.sort((a: RankerItem, b: RankerItem) => b.totalTempo - a.totalTempo);
          setRankers(formatted.slice(0, limit));
        }
      } catch (err) {
        logger.error('DATA', 'Erro ao buscar ranking:', err);
      } finally {
        setLoadingRank(false);
      }
    };

    fetchRanking();
  }, [timeFilter, limit]);

  return (
    <div className="glass-premium rounded-[2rem] border border-[hsl(var(--border))] shadow-2xl p-5 md:p-6 flex flex-col relative overflow-hidden">
      <div className="flex flex-col gap-3 mb-4 relative z-10">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[hsl(var(--text-muted))] text-center flex items-center justify-center gap-2">
          <Trophy size={14} className="text-yellow-500" /> Global Top
        </h3>
        <div className="flex justify-center items-center gap-1 bg-[hsl(var(--bg-user-block)/0.5)] p-1 rounded-xl border border-[hsl(var(--border))]">
          {[
            { label: '7D', value: 7 },
            { label: '15D', value: 15 },
            { label: '30D', value: 30 },
            { label: 'Total', value: null },
          ].map((filter) => (
            <button
              key={filter.label}
              onClick={() => setTimeFilter(filter.value)}
              className={`flex-1 py-1.5 px-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                timeFilter === filter.value
                  ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-md'
                  : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] hover:bg-[hsl(var(--accent)/0.1)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto custom-scrollbar pr-2 relative z-10 space-y-2 max-h-[420px]">
        {loadingRank ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="animate-spin text-[hsl(var(--accent))]" />
          </div>
        ) : rankers.length === 0 ? (
          <div className="flex justify-center items-center h-32 text-[10px] uppercase font-bold text-[hsl(var(--text-muted))]">
            Nenhum guerreiro
          </div>
        ) : (
          rankers.map((r, i) => (
            <div
              key={r.id}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${r.isUser ? 'bg-[hsl(var(--accent)/0.15)] border-[hsl(var(--accent)/0.4)]' : 'bg-[hsl(var(--bg-user-block)/0.4)] border-[hsl(var(--border))] hover:border-white/10'}`}
            >
              <div className={`w-8 text-center text-xs font-black ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-500' : 'text-slate-600'}`}>
                {i + 1}º
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-[hsl(var(--text-bright))] truncate leading-tight flex items-center gap-1">
                  {r.name}
                  {r.isUser && (
                    <span className="text-[8px] bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] px-1 py-0.5 rounded ml-1">
                      TU
                    </span>
                  )}
                </div>
                <div className="text-[8px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-widest">
                  {r.questions} questões
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-[hsl(var(--text-bright))]">{r.hours}h</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GlobalTop;
