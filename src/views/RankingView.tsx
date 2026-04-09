import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Trophy,
    ArrowLeft,
    Search,
    Medal,
    Award,
    Loader2
} from 'lucide-react';
import { ViewType } from '../types';
import { supabase } from '../services/supabase';

interface RankingGeralRow {
    user_id: string;
    name: string | null;
    total_questoes: number;
    total_acertos: number;
    total_tempo: number;
}

interface Ranker {
    id: string;
    name: string;
    questions: number;
    hours: number;
    accuracy: number;
    status: string;
    isUser: boolean;
    totalTempo: number;
}

interface RankingViewProps { }

const RankingView: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [rankers, setRankers] = useState<Ranker[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRanking = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                const { data, error } = await supabase
                    .from('ranking_geral')
                    .select('*');

                if (error) throw error;

                if (data) {
                    const formatted: Ranker[] = (data as RankingGeralRow[]).map((r) => {
                        const accuracy = r.total_questoes > 0 ? Math.round((r.total_acertos / r.total_questoes) * 100) : 0;
                        const hours = Math.floor(r.total_tempo / 60);

                        let status = 'Iniciante';
                        if (hours > 500) status = 'Lendário';
                        else if (hours > 200) status = 'Elite';
                        else if (hours > 50) status = 'Expert';
                        else if (hours > 20) status = 'Avançado';
                        else if (hours > 5) status = 'Intermediário';

                        return {
                            id: r.user_id,
                            name: r.name || 'Guerreiro Anônimo',
                            questions: r.total_questoes,
                            hours: hours,
                            accuracy: accuracy,
                            status: status,
                            isUser: user ? r.user_id === user.id : false,
                            totalTempo: r.total_tempo
                        };
                    });

                    formatted.sort((a, b) => b.totalTempo - a.totalTempo);
                    setRankers(formatted.slice(0, 50));
                }
            } catch (err) {
                console.error("Erro ao buscar ranking:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRanking();
    }, []);

    const filteredRankers = useMemo(() => {
        return rankers.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [rankers, searchTerm]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { x: -20, opacity: 0 },
        visible: {
            x: 0,
            opacity: 1,
            transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-[hsl(var(--accent))]" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Escaneando histórico global...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate('/')}
                        className="p-4 bg-[hsl(var(--bg-user-block))] rounded-2xl text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] transition-all border border-[hsl(var(--border))] active:scale-95"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent uppercase tracking-tighter">
                            Ranking de Monitoramento
                        </h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                            Desempenho Global da Elite de Concurseiros
                        </p>
                    </div>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] group-focus-within:text-[hsl(var(--accent))] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar usuário..."
                        className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </section>

            {/* Top 3 Podium (SÓ APARECE SE TIVER PELO MENOS 3 USUÁRIOS) */}
            {rankers.length >= 3 && (
                <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto">
                    {/* Bronze */}
                    <div className="order-2 md:order-1 glass-premium p-8 rounded-[2.5rem] border border-orange-500/20 text-center space-y-4 relative opacity-90 scale-95 md:scale-100">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center text-white border-4 border-[hsl(var(--bg-main))] shadow-xl">
                            <Medal size={24} />
                        </div>
                        <div className="pt-4">
                            <h4 className="text-lg font-black text-slate-300 uppercase tracking-tight">{rankers[2]?.name || '---'}</h4>
                            <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">{rankers[2]?.status || ''}</span>
                        </div>
                        <div className="text-3xl font-black text-[hsl(var(--text-bright))] tracking-tighter">{rankers[2]?.hours.toLocaleString() || 0} <span className="text-xs opacity-40">horas</span></div>
                        <div className="h-20 bg-gradient-to-t from-orange-500/10 to-transparent rounded-2xl" />
                    </div>

                    {/* Gold */}
                    <div className="order-1 md:order-2 glass-premium p-10 rounded-[3rem] border-4 border-yellow-500/30 text-center space-y-6 relative md:scale-110 shadow-2xl shadow-yellow-500/10 z-10 bg-[hsl(var(--bg-main))]">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center text-black border-4 border-[hsl(var(--bg-main))] shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                            <Trophy size={40} />
                        </div>
                        <div className="pt-8">
                            <h4 className="text-2xl font-black text-white uppercase tracking-tighter">{rankers[0]?.name || '---'}</h4>
                            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] inline-block px-3 py-1 bg-yellow-500/10 rounded-full">{rankers[0]?.status || ''}</span>
                        </div>
                        <div className="text-5xl font-black text-yellow-500 tracking-tighter animate-pulse drop-shadow-md">{rankers[0]?.hours.toLocaleString() || 0} <span className="text-sm opacity-40 uppercase">horas</span></div>
                        <div className="h-32 bg-gradient-to-t from-yellow-500/20 to-transparent rounded-2xl" />
                    </div>

                    {/* Silver */}
                    <div className="order-3 glass-premium p-8 rounded-[2.5rem] border border-slate-400/20 text-center space-y-4 relative opacity-95 scale-95 md:scale-100">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-slate-400 flex items-center justify-center text-black border-4 border-[hsl(var(--bg-main))] shadow-xl">
                            <Award size={24} />
                        </div>
                        <div className="pt-4">
                            <h4 className="text-lg font-black text-slate-300 uppercase tracking-tight">{rankers[1]?.name || '---'}</h4>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{rankers[1]?.status || ''}</span>
                        </div>
                        <div className="text-3xl font-black text-[hsl(var(--text-bright))] tracking-tighter">{rankers[1]?.hours.toLocaleString() || 0} <span className="text-xs opacity-40">horas</span></div>
                        <div className="h-24 bg-gradient-to-t from-slate-400/10 to-transparent rounded-2xl" />
                    </div>
                </section>
            )}

            {/* Full Ranking Table */}
            <section className="glass-premium rounded-[3rem] border border-[hsl(var(--border))] overflow-hidden shadow-2xl relative z-0">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Posição</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Guerreiro</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Tempo</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hidden md:table-cell">Questões</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Precisão</th>
                            </tr>
                        </thead>
                        <motion.tbody
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {filteredRankers.map((r, i) => (
                                <motion.tr
                                    key={r.id}
                                    variants={itemVariants}
                                    className={`border-b border-white/[0.02] last:border-0 hover:bg-white/5 transition-colors group ${r.isUser ? 'bg-[hsl(var(--accent)/0.05)] border-l-4 border-l-[hsl(var(--accent))]' : ''}`}
                                >
                                    <td className="px-8 py-6">
                                        <span className={`text-lg font-black ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-500' : 'text-slate-500'}`}>#{i + 1}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black uppercase text-xs shadow-lg ${r.isUser ? 'bg-[hsl(var(--accent))] text-black shadow-[hsl(var(--accent))/0.3]' : 'bg-slate-800 text-slate-400 shadow-black/50'}`}>
                                                {r.name.substring(0, 2)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-[hsl(var(--text-bright))] uppercase tracking-tight">
                                                    {r.name} {r.isUser && <span className="ml-2 text-[8px] bg-[hsl(var(--accent)/0.2)] border border-[hsl(var(--accent)/0.5)] text-[hsl(var(--accent))] px-2 py-0.5 rounded-full">VOCÊ</span>}
                                                </div>
                                                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{r.status}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-black text-[hsl(var(--text-bright))]">{r.hours}h</td>
                                    <td className="px-8 py-6 text-sm font-bold text-slate-400 hidden md:table-cell">{r.questions.toLocaleString()}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-1.5 w-24 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                                                <div
                                                    className={`h-full bg-gradient-to-r rounded-full ${r.accuracy >= 80 ? 'from-green-600 to-emerald-400' : 'from-yellow-600 to-orange-400'}`}
                                                    style={{ width: `${r.accuracy}%` }}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-black ${r.accuracy >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>{r.accuracy}%</span>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                            {filteredRankers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-slate-500 font-bold uppercase tracking-widest text-xs">
                                        Nenhum guerreiro encontrado.
                                    </td>
                                </tr>
                            )}
                        </motion.tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default RankingView;
