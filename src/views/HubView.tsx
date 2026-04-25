import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    Target,
    Settings,
    Trophy,
    Newspaper,
    CalendarClock,
    ArrowUpRight,
    Search,
    Filter,
    Zap,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { ViewType } from '../types';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';
import { preserveMissaoOnClear } from '../utils/localStorage';
import { profilesQueries } from '../services/queries';

export interface HubViewProps {
    userEmail: string;
}

interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source_name: string;
    source_url: string;
    tags: string[];
    published_at: string;
}

interface RankerItem {
    id: string;
    name: string;
    hours: number;
    questions: number;
    isUser: boolean;
    totalTempo: number;
}

const HubView: React.FC<HubViewProps> = ({ userEmail }) => {
    const navigate = useNavigate();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshingNews, setIsRefreshingNews] = useState(false);
    const [rankers, setRankers] = useState<RankerItem[]>([]);
    const [loadingRank, setLoadingRank] = useState(true);

    useEffect(() => {
        fetchNews();

        // Subscribe to real-time additions (if a new edital drops, UI updates automatically)
        const channel = supabase
            .channel('public:news_feed')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'news_feed' },
                (payload) => {
                    logger.info('DATA', 'New news item:', payload);
                    setNews((currentNews) => [payload.new as NewsItem, ...currentNews].slice(0, 20)); // Keep only top 20
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchNews = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('news_feed')
                .select('*')
                .order('published_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            if (data) {
                setNews(data);
            }
        } catch (err) {
            logger.error('DATA', 'Error fetching news:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshNews = async () => {
        if (isRefreshingNews) return;

        setIsRefreshingNews(true);
        try {
            logger.info('AI', 'Disparando atualização manual de notícias...');
            const { data, error } = await supabase.functions.invoke('fetch-concurso-news');

            if (error) throw error;

            logger.info('AI', 'Notícias atualizadas com sucesso:', data);
            // O realtime já vai atualizar a lista, mas forçamos um fetch por garantia
            fetchNews();
            alert("Radar atualizado! Buscando editais novos...");
        } catch (err: any) {
            logger.error('AI', 'Erro ao atualizar notícias:', err);
            alert("Falha na atualização: " + (err.message || "Erro na Edge Function"));
        } finally {
            setIsRefreshingNews(false);
        }
    };

    const fetchRanking = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const data = await profilesQueries.getRanking();

            if (data) {
                const formatted = data.map((r: any) => {
                    const hours = Math.floor(r.total_tempo / 60);
                    return {
                        id: r.user_id,
                        name: r.name || 'Anônimo',
                        hours: hours,
                        questions: r.total_questoes,
                        isUser: user ? r.user_id === user.id : false,
                        totalTempo: r.total_tempo
                    };
                });

                formatted.sort((a, b) => b.totalTempo - a.totalTempo);
                setRankers(formatted.slice(0, 15)); // Pega os 15 melhores para exibir na lateral
            }
        } catch (err) {
            logger.error('DATA', "Erro ao buscar ranking para o Hub:", err);
        } finally {
            setLoadingRank(false);
        }
    };


    useEffect(() => {
        fetchRanking();
    }, []);

    const navItems = [
        { id: 'HOME', label: 'Portal do Aluno', desc: 'Edital e Cronômetro', icon: <BookOpen size={24} />, bg: 'from-blue-600/20 to-cyan-600/20', color: 'text-cyan-400' },
        { id: 'QUESTOES', label: 'Banco de Provas', desc: 'Simulados e Questões', icon: <Target size={24} />, bg: 'from-purple-600/20 to-indigo-600/20', color: 'text-purple-400' },
        { id: 'CONFIGURAR', label: 'Configurações', desc: 'Ajustes da Conta', icon: <Settings size={24} />, bg: 'from-slate-600/20 to-slate-500/20', color: 'text-slate-400' },
    ];

    const formatTimeAgo = (dateString: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
        if (diff < 60) return `${diff} min atrás`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`;
        return `${Math.floor(diff / 1440)}d atrás`;
    };

    return (
        <div className="h-[calc(100vh-8rem)] w-full max-w-[1400px] mx-auto animate-in fade-in duration-700 flex flex-col lg:flex-row gap-6">

            {/* MAIN CONTENT: AUTOMATED NEWS FEED (approx 75%) */}
            <main className="flex-1 flex flex-col h-full rounded-[2rem] border border-[hsl(var(--border))] glass-premium overflow-hidden shadow-2xl relative">
                {/* Header Filter Bar */}
                <div className="p-6 border-b border-[hsl(var(--border))] bg-background/50 backdrop-blur-md sticky top-0 z-20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-[hsl(var(--accent)/0.1)] rounded-xl text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.2)]">
                            <Newspaper size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter">Radar <span className="text-[hsl(var(--accent))]">MonitorPro</span></h2>
                            <p className="text-[10px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Monitoramento IA Ativo
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
                            <input
                                type="text"
                                placeholder="Buscar edital ou órgão..."
                                className="bg-[hsl(var(--bg-user-block)/0.5)] border border-[hsl(var(--border))] rounded-full pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] transition-all w-[180px] md:w-[220px]"
                            />
                        </div>
                        <button
                            onClick={handleRefreshNews}
                            disabled={isRefreshingNews}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-[10px] font-black uppercase tracking-widest ${isRefreshingNews
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 cursor-wait'
                                : 'bg-[hsl(var(--accent)/0.1)] border-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)]'
                                }`}
                        >
                            {isRefreshingNews ? (
                                <><Loader2 size={12} className="animate-spin" /> Atualizando...</>
                            ) : (
                                <><RefreshCw size={12} /> Atualizar Radar</>
                            )}
                        </button>
                        <button className="p-2 rounded-full bg-[hsl(var(--bg-user-block)/0.5)] border border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] transition-colors">
                            <Filter size={14} />
                        </button>
                    </div>
                </div>

                {/* News Grid Feed */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {news.map((item, idx) => (
                            <motion.article
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -8, scale: 1.01, transition: { duration: 0.2 } }}
                                transition={{ delay: idx * 0.05 }}
                                className="group relative flex flex-col p-5 rounded-3xl bg-[hsl(var(--bg-user-block)/0.4)] border border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.4)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] transition-all duration-300 h-full"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--accent)/0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />

                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className="flex gap-2 flex-wrap">
                                        {item.tags.map(tag => (
                                            <span key={tag} className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] rounded-md border border-[hsl(var(--accent)/0.2)]">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-[9px] font-bold text-[hsl(var(--text-muted))] flex items-center gap-1 whitespace-nowrap truncate shrink-0">
                                        <CalendarClock size={10} /> {formatTimeAgo(item.published_at)}
                                    </span>
                                </div>

                                <div className="flex-1 relative z-10">
                                    <h3 className="text-sm font-bold text-[hsl(var(--text-bright))] leading-snug mb-2 group-hover:text-[hsl(var(--accent))] transition-colors">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs text-[hsl(var(--text-main))] leading-relaxed opacity-80 line-clamp-3">
                                        {item.summary}
                                    </p>
                                </div>

                                <div className="mt-4 flex items-center justify-between pt-3 border-t border-[hsl(var(--border))] relative z-10">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">
                                        Via {item.source_name}
                                    </span>
                                    <a
                                        href={item.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--accent))] flex items-center gap-1 hover:brightness-125 transition-all"
                                    >
                                        Ler Completa <ArrowUpRight size={10} />
                                    </a>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                </div>
            </main>

            {/* SIDEBAR: ACTION QUICK LAUNCH (approx 25%) */}
            <aside className="w-full lg:w-[280px] xl:w-[320px] shrink-0 flex flex-col gap-6">
                <div className="glass-premium rounded-[2rem] border border-[hsl(var(--border))] shadow-2xl p-5 relative overflow-hidden flex flex-col shrink-0">
                    <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-[hsl(var(--accent)/0.15)] blur-[50px] rounded-full pointer-events-none" />

                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[hsl(var(--text-muted))] mb-4 relative z-10 text-center">Navegação Rápida</h3>

                    <div className="flex flex-col gap-3 relative z-10">
                        {navItems.map((item) => (
                            <motion.button
                                key={item.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    const path = item.id === 'HOME' ? '/dashboard' :
                                        item.id === 'QUESTOES' ? '/questoes' :
                                            item.id === 'CONFIGURAR' ? '/configurar' : '/';
                                    navigate(path);
                                }}
                                className={`flex items-center gap-4 p-3 rounded-2xl bg-[hsl(var(--bg-user-block)/0.4)] border border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.3)] transition-all group overflow-hidden relative text-left w-full shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)]`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${item.bg} opacity-0 group-hover:opacity-100 transition-opacity`} />

                                <div className={`p-2 rounded-xl bg-background border border-[hsl(var(--border))] shadow-sm ${item.color} group-hover:scale-110 transition-transform relative z-10`}>
                                    {item.icon}
                                </div>
                                <div className="flex-1 relative z-10">
                                    <span className="block text-xs font-black text-[hsl(var(--text-bright))] uppercase tracking-tight group-hover:text-[hsl(var(--accent))] transition-colors">{item.label}</span>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* EMbedded Ranking Widget */}
                <div className="glass-premium rounded-[2rem] border border-[hsl(var(--border))] shadow-2xl p-5 flex flex-col relative overflow-hidden flex-1 min-h-[300px]">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[hsl(var(--text-muted))] mb-4 relative z-10 text-center flex items-center justify-center gap-2">
                        <Trophy size={14} className="text-yellow-500" /> Global Top
                    </h3>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 space-y-2">
                        {loadingRank ? (
                            <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-[hsl(var(--accent))]" /></div>
                        ) : rankers.length === 0 ? (
                            <div className="flex justify-center items-center h-full text-[10px] uppercase font-bold text-[hsl(var(--text-muted))]">Nenhum guerreiro</div>
                        ) : rankers.map((r, i) => (
                            <div key={r.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${r.isUser ? 'bg-[hsl(var(--accent)/0.15)] border-[hsl(var(--accent)/0.4)]' : 'bg-[hsl(var(--bg-user-block)/0.4)] border-[hsl(var(--border))] hover:border-white/10'}`}>
                                <div className={`w-5 text-center text-xs font-black ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-500' : 'text-slate-600'}`}>
                                    {i + 1}º
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-bold text-[hsl(var(--text-bright))] truncate leading-tight flex items-center gap-1">
                                        {r.name.length > 10 ? r.name.substring(0, 10) + '...' : r.name}
                                        {r.isUser && <span className="text-[8px] bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] px-1 py-0.5 rounded ml-1">TU</span>}
                                    </div>
                                    <div className="text-[8px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-widest">{r.questions} questões</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-[hsl(var(--text-bright))]">{r.hours}h</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default HubView;
