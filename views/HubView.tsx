import React from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Target,
    Trophy,
    Newspaper,
    TrendingUp,
    ArrowRight,
    Brain,
    Zap,
    Settings
} from 'lucide-react';
import { ViewType } from '../types';

interface HubViewProps {
    setActiveView: (view: ViewType) => void;
    userEmail: string;
}

const HubView: React.FC<HubViewProps> = ({ setActiveView, userEmail }) => {
    const navItems = [
        { id: 'HOME', label: 'Portal do Aluno', icon: <BookOpen size={18} /> },
        { id: 'QUESTOES', label: 'Banco de Questões', icon: <Target size={18} /> },
        { id: 'CONFIGURAR', label: 'Configurações', icon: <Settings size={18} /> },
    ];

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700 max-w-6xl mx-auto">
            {/* Horizontal Navigation */}
            <nav className="flex items-center justify-center gap-2 p-2 bg-[hsl(var(--bg-user-block)/0.3)] backdrop-blur-md border border-[hsl(var(--border))] rounded-full mb-12 shadow-xl">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id as ViewType)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] transition-all duration-300 group"
                    >
                        <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Hero Section: Ranking & News (Replacing Welcome Area) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* Ranking Widget */}
                <section className="glass-premium rounded-[3rem] p-8 border border-[hsl(var(--border))] relative overflow-hidden shadow-2xl flex flex-col h-[380px]">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 blur-[80px] rounded-full -mr-24 -mt-24" />

                    <div className="flex justify-between items-center mb-10 relative z-10">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500 opacity-70">Social & Performance</span>
                            <h3 className="text-2xl font-black flex items-center gap-3 tracking-tighter text-[hsl(var(--text-bright))] uppercase mt-1">
                                <Trophy className="text-yellow-500" size={24} /> Ranking Global
                            </h3>
                        </div>
                        <button onClick={() => setActiveView('RANKING')} className="text-[10px] font-black text-[hsl(var(--accent))] px-4 py-2 bg-[hsl(var(--accent)/0.1)] rounded-xl uppercase tracking-widest hover:bg-[hsl(var(--accent)/0.2)] transition-all">Ver Todos</button>
                    </div>

                    <div className="space-y-4 relative z-10 flex-1 overflow-hidden">
                        {[
                            { name: 'Gabriel S.', score: '24.5k', color: 'from-yellow-400 to-amber-600', trend: '+12%' },
                            { name: 'Ana P.', score: '22.1k', color: 'from-slate-300 to-slate-500', trend: '+5%' },
                            { name: 'Marcos R.', score: '19.8k', color: 'from-orange-400 to-orange-600', trend: '+8%' }
                        ].map((u, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-r ${u.color} flex items-center justify-center text-xs font-black text-black shadow-lg group-hover:scale-110 transition-transform`}>
                                        #{i + 1}
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-slate-200 uppercase tracking-tight">{u.name}</div>
                                        <div className="text-[8px] font-bold text-green-500 tracking-widest uppercase">{u.trend} evolução</div>
                                    </div>
                                </div>
                                <span className="text-xs font-black text-yellow-500 tracking-tighter">{u.score} <span className="text-[8px] opacity-40 uppercase ml-1">pts</span></span>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* News Widget */}
                <section className="glass-premium rounded-[3rem] p-8 border border-[hsl(var(--border))] relative overflow-hidden shadow-2xl flex flex-col h-[380px]">
                    <div className="absolute top-0 left-0 w-48 h-48 bg-cyan-500/5 blur-[80px] rounded-full -ml-24 -mt-24" />

                    <div className="flex justify-between items-center mb-10 relative z-10">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 opacity-70">Alertas em Tempo Real</span>
                            <h3 className="text-2xl font-black flex items-center gap-3 tracking-tighter text-[hsl(var(--text-bright))] uppercase mt-1">
                                <Newspaper className="text-cyan-500" size={24} /> Plantão de Editais
                            </h3>
                        </div>
                    </div>

                    <div className="space-y-5 relative z-10 flex-1 overflow-hidden">
                        {[1, 2].map((i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.2 }}
                                className="flex flex-col gap-4 group cursor-pointer p-6 rounded-[2.5rem] bg-white/5 border border-white/5 hover:border-[hsl(var(--accent)/0.3)] transition-all h-[130px] justify-between"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-cyan-400 px-3 py-1 bg-cyan-400/10 rounded-md border border-cyan-400/20">Concursos Federais</span>
                                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">3h atrás</span>
                                </div>
                                <h4 className="text-[11px] font-black text-[hsl(var(--text-bright))] uppercase tracking-tight leading-relaxed group-hover:text-[hsl(var(--accent))] transition-colors line-clamp-2">
                                    {i === 1 ? 'Déficit na PF chega a 2.500 agentes; novo edital é prioridade máxima em 2026.' : 'PRF estuda alteração de requisitos para nível superior; novo certame em pauta.'}
                                </h4>
                                <div className="flex items-center gap-1 text-[8px] font-bold text-[hsl(var(--accent))] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    Ler Notícia Completa <ArrowRight size={10} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Bottom Selection Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="h-0.5 w-12 bg-gradient-to-r from-[hsl(var(--accent))] to-transparent rounded-full" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-[hsl(var(--text-muted))]">Explore seu Próximo Passo</h4>
            </div>

            {/* Main Dual Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {[
                    {
                        id: 'STUDY',
                        title: 'Módulo Monitor Pro',
                        subtitle: 'ESTUDO E PLANEJAMENTO',
                        desc: 'Acesse o Portal do Aluno para gerenciar seu edital, cronômetro, histórico e revisar flashcards.',
                        icon: <BookOpen size={40} />,
                        color: 'from-cyan-600/20 to-blue-600/20',
                        view: 'HOME' as ViewType,
                        label: 'Portal do Aluno'
                    },
                    {
                        id: 'QUESTOES',
                        title: 'Banco de Questões',
                        subtitle: 'PRÁTICA E PERFORMANCE',
                        desc: 'Resolva questões com motor SRS e Neural Lab. Aumente sua precisão e velocidade de resposta.',
                        icon: <Target size={40} />,
                        color: 'from-purple-600/20 to-indigo-700/20',
                        view: 'QUESTOES' as ViewType,
                        label: 'Treinamento'
                    }
                ].map((mod) => (
                    <motion.div
                        key={mod.id}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveView(mod.view)}
                        className="group cursor-pointer relative overflow-hidden glass-premium rounded-[3.5rem] border border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.4)] transition-all duration-500 p-12 flex flex-col h-[280px] justify-between shadow-xl"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${mod.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

                        <div className="relative z-10 flex gap-8">
                            <div className="w-20 h-20 rounded-[2rem] bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--accent))] shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                {mod.icon}
                            </div>

                            <div className="space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[hsl(var(--accent))] opacity-60">
                                    {mod.subtitle}
                                </span>
                                <h3 className="text-2xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter">
                                    {mod.title}
                                </h3>
                                <p className="text-[10px] text-[hsl(var(--text-muted))] font-medium leading-relaxed max-w-xs">
                                    {mod.desc}
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 flex items-center justify-between">
                            <span className="text-[9px] font-black px-5 py-2.5 bg-[hsl(var(--bg-main))] rounded-full border border-[hsl(var(--border))] uppercase tracking-widest text-[hsl(var(--accent))] shadow-lg">
                                Entrar no {mod.label}
                            </span>
                            <div className="w-10 h-10 rounded-full bg-[hsl(var(--accent)/0.1)] flex items-center justify-center text-[hsl(var(--accent))] group-hover:bg-[hsl(var(--accent))] group-hover:text-black transition-all">
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default HubView;
