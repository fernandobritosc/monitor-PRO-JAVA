import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy,
    Target,
    Zap,
    Clock,
    ArrowLeft,
    Search,
    ChevronUp,
    ChevronDown,
    Medal,
    Award
} from 'lucide-react';
import { ViewType } from '../types';

interface RankingViewProps {
    setActiveView: (view: ViewType) => void;
}

const RankingView: React.FC<RankingViewProps> = ({ setActiveView }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Mock Data for Ranking - In production, this would come from a 'profiles' table with aggregated stats
    const rankers = [
        { id: '1', name: 'Gabriel S.', points: 24500, questions: 4200, hours: 320, accuracy: 88, status: 'Lendário' },
        { id: '2', name: 'Ana P.', points: 22100, questions: 3800, hours: 290, accuracy: 85, status: 'Elite' },
        { id: '3', name: 'Marcos R.', points: 19800, questions: 3600, hours: 275, accuracy: 82, status: 'Expert' },
        { id: '4', name: 'Juliana T.', points: 18200, questions: 3100, hours: 250, accuracy: 84, status: 'Expert' },
        { id: '5', name: 'Ricardo L.', points: 17500, questions: 2900, hours: 240, accuracy: 81, status: 'Avançado' },
        { id: '6', name: 'Beatriz M.', points: 15900, questions: 2700, hours: 220, accuracy: 79, status: 'Avançado' },
        { id: '7', name: 'Fernando B. (Você)', points: 14200, questions: 2500, hours: 210, accuracy: 78, status: 'Avançado', isUser: true },
        { id: '8', name: 'Carla V.', points: 12100, questions: 2100, hours: 190, accuracy: 80, status: 'Intermediário' },
        { id: '9', name: 'Paulo X.', points: 10500, questions: 1800, hours: 160, accuracy: 76, status: 'Intermediário' },
        { id: '10', name: 'Sofia D.', points: 9800, questions: 1700, hours: 155, accuracy: 77, status: 'Intermediário' },
    ];

    const filteredRankers = useMemo(() => {
        return rankers.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm]);

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
            transition: { type: 'spring', stiffness: 300, damping: 24 } as any
        }
    };

    return (
        <div className="space-y-12 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setActiveView('HUB')}
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

            {/* Top 3 Podium */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto">
                {/* Bronze */}
                <div className="order-2 md:order-1 glass-premium p-8 rounded-[2.5rem] border border-orange-500/20 text-center space-y-4 relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center text-white border-4 border-[hsl(var(--bg-main))] shadow-xl">
                        <Medal size={24} />
                    </div>
                    <div className="pt-4">
                        <h4 className="text-lg font-black text-slate-300 uppercase tracking-tight">{rankers[2].name}</h4>
                        <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">{rankers[2].status}</span>
                    </div>
                    <div className="text-3xl font-black text-[hsl(var(--text-bright))] tracking-tighter">{rankers[2].points} <span className="text-xs opacity-40">pts</span></div>
                    <div className="h-20 bg-gradient-to-t from-orange-500/10 to-transparent rounded-2xl" />
                </div>

                {/* Gold */}
                <div className="order-1 md:order-2 glass-premium p-10 rounded-[3rem] border-4 border-yellow-500/30 text-center space-y-6 relative md:scale-110 shadow-2xl shadow-yellow-500/10">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center text-black border-4 border-[hsl(var(--bg-main))] shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                        <Trophy size={40} />
                    </div>
                    <div className="pt-8">
                        <h4 className="text-2xl font-black text-white uppercase tracking-tighter">{rankers[0].name}</h4>
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] inline-block px-3 py-1 bg-yellow-500/10 rounded-full">{rankers[0].status}</span>
                    </div>
                    <div className="text-5xl font-black text-[hsl(var(--text-bright))] tracking-tighter animate-pulse">{rankers[0].points} <span className="text-sm opacity-40 uppercase">pts</span></div>
                    <div className="h-32 bg-gradient-to-t from-yellow-500/20 to-transparent rounded-2xl" />
                </div>

                {/* Silver */}
                <div className="order-3 glass-premium p-8 rounded-[2.5rem] border border-slate-400/20 text-center space-y-4 relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-slate-400 flex items-center justify-center text-black border-4 border-[hsl(var(--bg-main))] shadow-xl">
                        <Award size={24} />
                    </div>
                    <div className="pt-4">
                        <h4 className="text-lg font-black text-slate-300 uppercase tracking-tight">{rankers[1].name}</h4>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{rankers[1].status}</span>
                    </div>
                    <div className="text-3xl font-black text-[hsl(var(--text-bright))] tracking-tighter">{rankers[1].points} <span className="text-xs opacity-40">pts</span></div>
                    <div className="h-24 bg-gradient-to-t from-slate-400/10 to-transparent rounded-2xl" />
                </div>
            </section>

            {/* Full Ranking Table */}
            <section className="glass-premium rounded-[3rem] border border-[hsl(var(--border))] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Posição</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Guerreiro</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pontuação</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hidden md:table-cell">Questões</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hidden md:table-cell">Horas</th>
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
                                        <span className={`text-lg font-black ${i < 3 ? 'text-yellow-500' : 'text-slate-500'}`}>#{i + 1}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black uppercase text-xs ${r.isUser ? 'bg-[hsl(var(--accent))] text-black' : 'bg-slate-800 text-slate-400'}`}>
                                                {r.name.substring(0, 2)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-[hsl(var(--text-bright))] uppercase tracking-tight">
                                                    {r.name} {r.isUser && <span className="ml-2 text-[8px] bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] px-2 py-0.5 rounded-full">VOCÊ</span>}
                                                </div>
                                                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{r.status}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-black text-[hsl(var(--text-bright))]">{r.points.toLocaleString()}</td>
                                    <td className="px-8 py-6 text-sm font-bold text-slate-400 hidden md:table-cell">{r.questions.toLocaleString()}</td>
                                    <td className="px-8 py-6 text-sm font-bold text-slate-400 hidden md:table-cell">{r.hours}h</td>
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
                        </motion.tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default RankingView;
