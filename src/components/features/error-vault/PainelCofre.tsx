import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, FileText, Zap, Brain, Target, ShieldAlert, Search, Filter, X, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { StudyRecord, ErrorAnalysis } from '../../../types';

interface PainelCofreProps {
    records: StudyRecord[];
    localErrors: any[];
    missaoAtiva: string;
    onSelectAssunto: (materia: string, assunto: string) => void;
    onGenerateMacro: () => void;
    onExportPDF: (isMentor?: boolean) => void;
    isSynthesizing: boolean;
    stats: Record<string, number>;
}

const normalizeText = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, ' ');

export const PainelCofre: React.FC<PainelCofreProps> = ({
    records,
    localErrors,
    missaoAtiva,
    onSelectAssunto,
    onGenerateMacro,
    onExportPDF,
    isSynthesizing,
    stats
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMateria, setFilterMateria] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD

    const dailyStats = useMemo(() => {
        const stats: Record<string, { hits: number, total: number }> = {};
        
        records
            .filter(r => {
                if (!r.data_estudo) return false;
                const recordDate = r.data_estudo.split('T')[0];
                return recordDate === selectedDate;
            })
            .forEach(r => {
                if (!stats[r.materia]) stats[r.materia] = { hits: 0, total: 0 };
                stats[r.materia].hits += r.acertos;
                stats[r.materia].total += r.total;
            });
            
        return Object.entries(stats)
            .filter(([_, s]) => s.total > 0)
            .map(([materia, s]) => {
                const sessionCount = records.filter(r => 
                    r.materia === materia && 
                    r.data_estudo?.split('T')[0] === selectedDate
                ).length;

                return {
                    materia,
                    hits: s.hits,
                    total: s.total,
                    sessions: sessionCount,
                    percentage: s.total > 0 ? (s.hits / s.total) * 100 : 0
                };
            }).sort((a, b) => b.percentage - a.percentage);
    }, [records, selectedDate]);

    const navigateDate = (days: number) => {
        const date = new Date(selectedDate + 'T12:00:00'); // Evita problemas de fuso
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toLocaleDateString('en-CA'));
    };

    const formatDateDisplay = (dateStr: string) => {
        const today = new Date().toLocaleDateString('en-CA');
        if (dateStr === today) return "HOJE";
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (dateStr === yesterday.toLocaleDateString('en-CA')) return "ONTEM";

        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }).toUpperCase();
    };

    const materiaOptions = useMemo(() => Array.from(new Set(localErrors.map(e => e.materia))).sort(), [localErrors]);

    const heatmapData = useMemo(() => {
        const heatmap: Record<string, Record<string, { total: number, errors: number, hits: number }>> = {};

        records
            .filter(r => r.concurso === missaoAtiva && r.total > 0)
            .forEach(r => {
                if (filterMateria && normalizeText(r.materia) !== normalizeText(filterMateria)) return;

                if (!heatmap[r.materia]) heatmap[r.materia] = {};
                if (!heatmap[r.materia][r.assunto]) {
                    heatmap[r.materia][r.assunto] = { total: 0, errors: 0, hits: 0 };
                }
                const current = heatmap[r.materia][r.assunto];
                current.total += r.total;
                current.hits += r.acertos;

                let activeErrors = 0;
                if (localErrors) {
                    activeErrors = localErrors.filter(e => 
                        e.recordId === r.id && 
                        !e.resolved &&
                        normalizeText(e.materia) === normalizeText(r.materia) &&
                        normalizeText(e.assunto) === normalizeText(r.assunto) &&
                        (!searchTerm || normalizeText(e.questao_preview || '').includes(normalizeText(searchTerm)))
                    ).length;
                }
                current.errors += activeErrors;
            });

        return heatmap;
    }, [records, localErrors, missaoAtiva, filterMateria, searchTerm]);

    const getIntensityColor = (errors: number, total: number) => {
        const rate = errors / total;
        if (errors === 0) return 'bg-[hsl(var(--bg-card)/0.3)] border-[hsl(var(--border))] opacity-40 hover:opacity-100';
        if (rate > 0.6 || errors > 20) return 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_20px_-5px_rgba(239,68,68,0.1)]';
        if (rate > 0.4 || errors > 10) return 'bg-orange-500/10 border-orange-500/30 text-orange-500';
        if (rate > 0.2 || errors > 5) return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500';
        return 'bg-[hsl(var(--accent)/0.05)] border-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))]';
    };

    return (
        <div className="space-y-12 pb-24 w-full">
            {/* Placar de Desempenho Diário */}
            <div className="glass-premium rounded-3xl border border-[hsl(var(--border))] overflow-hidden">
                <div className="flex flex-col md:flex-row items-stretch border-b border-[hsl(var(--border))]">
                    {/* Seletor de Data */}
                    <div className="p-4 md:p-6 bg-[hsl(var(--accent)/0.03)] flex items-center justify-between md:justify-start gap-6 border-b md:border-b-0 md:border-r border-[hsl(var(--border))]">
                        <button 
                            onClick={() => navigateDate(-1)}
                            className="p-2 rounded-xl hover:bg-[hsl(var(--accent)/0.1)] transition-colors text-[hsl(var(--text-muted))]"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex flex-col items-center min-w-[120px]">
                            <span className="text-[10px] font-black text-[hsl(var(--accent))] tracking-[0.2em] mb-1">
                                {formatDateDisplay(selectedDate)}
                            </span>
                            <div className="flex items-center gap-2 text-sm font-black text-[hsl(var(--text-bright))]">
                                <Calendar size={14} className="text-[hsl(var(--accent))]" />
                                {selectedDate.split('-').reverse().join('/')}
                            </div>
                        </div>
                        <button 
                            onClick={() => navigateDate(1)}
                            className="p-2 rounded-xl hover:bg-[hsl(var(--accent)/0.1)] transition-colors text-[hsl(var(--text-muted))]"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Lista de Matérias do Dia */}
                    <div className="flex-1 overflow-x-auto p-4 md:p-6 no-scrollbar">
                        <div className="flex items-center gap-6 min-w-max">
                            {dailyStats.length === 0 ? (
                                <div className="flex items-center gap-3 text-[hsl(var(--text-muted))] italic">
                                    <Target size={16} className="opacity-50" />
                                    <span className="text-xs font-bold tracking-widest uppercase">Nenhuma sessão registrada neste dia.</span>
                                </div>
                            ) : (
                                dailyStats.map((s, idx) => (
                                    <motion.div 
                                        key={s.materia}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex items-center gap-4 bg-[hsl(var(--bg-main)/0.4)] border border-[hsl(var(--border))] px-5 py-3 rounded-2xl hover:border-[hsl(var(--accent)/0.4)] transition-all group"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest group-hover:text-[hsl(var(--accent))] transition-colors">
                                                {s.materia}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-black text-[hsl(var(--text-bright))]">{s.hits}</span>
                                                    <span className="text-[10px] font-bold text-[hsl(var(--text-muted))]">/ {s.total}</span>
                                                </div>
                                                <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                                                    s.percentage >= 80 ? 'bg-emerald-500/10 text-emerald-500' :
                                                    s.percentage >= 50 ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                    {Math.round(s.percentage)}%
                                                </div>
                                                {s.sessions > 1 && (
                                                    <div className="bg-[hsl(var(--accent)/0.1)] px-1.5 py-0.5 rounded-md border border-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] text-[7px] font-black uppercase">
                                                        {s.sessions} SESSÕES
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cabeçalho Estratégico */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div className="space-y-3">
                    <h2 className="text-4xl md:text-5xl font-black text-[hsl(var(--text-bright))] tracking-tighter uppercase italic">
                        Cofre de <span className="text-[hsl(var(--accent))]">Erros</span>
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent))]" />
                        <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.4em]">
                            Inteligência de Recuperação MonitorPro
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 glass-premium p-2 rounded-2xl border border-[hsl(var(--border))]">
                    <button 
                        onClick={onGenerateMacro}
                        disabled={isSynthesizing}
                        className="px-6 py-3 rounded-xl bg-[hsl(var(--accent))] text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bg-main))] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-[hsl(var(--accent)/0.3)]"
                    >
                        <Brain size={16} className={isSynthesizing ? 'animate-spin' : ''} />
                        {isSynthesizing ? 'Sintetizando...' : 'Gerar Diagnóstico IA'}
                    </button>
                    <button 
                        onClick={() => onExportPDF(true)}
                        className="px-6 py-3 rounded-xl border border-[hsl(var(--border))] text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-main))] hover:bg-[hsl(var(--bg-card))] transition-all flex items-center gap-2"
                    >
                        <FileText size={16} /> Exportar PDF
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] group-focus-within:text-[hsl(var(--accent))] transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar termo ou conteúdo..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full glass border border-[hsl(var(--border))] rounded-2xl pl-14 pr-8 py-4 text-sm font-medium text-[hsl(var(--text-main))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.1)] focus:border-[hsl(var(--accent)/0.3)] outline-none transition-all placeholder:text-[hsl(var(--text-muted))]"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-main))]">
                            <X size={14} />
                        </button>
                    )}
                </div>
                
                <div className="w-full md:w-64 relative group">
                    <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] group-focus-within:text-[hsl(var(--accent))]" size={16} />
                    <select 
                        value={filterMateria}
                        onChange={(e) => setFilterMateria(e.target.value)}
                        className="w-full glass border border-[hsl(var(--border))] rounded-2xl pl-12 pr-10 py-4 text-[10px] font-black uppercase tracking-tight text-[hsl(var(--text-main))] appearance-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.1)] outline-none transition-all cursor-pointer"
                    >
                        <option value="">Filtrar Matéria</option>
                        {materiaOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            {/* Painel de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(stats).map(([type, count]) => (
                    <motion.div 
                        key={type}
                        whileHover={{ y: -4 }}
                        className="glass-premium p-8 rounded-[2.5rem] border border-[hsl(var(--border))] group relative overflow-hidden shadow-xl"
                    >
                        <div className={`absolute -right-6 -bottom-6 w-32 h-32 blur-3xl opacity-5 transition-opacity group-hover:opacity-15 ${
                            type === 'Atenção' ? 'bg-yellow-500' : type === 'Lacuna de Base' ? 'bg-red-500' : 'bg-blue-500'
                        }`} />
                        
                        <div className="flex items-center gap-6 relative z-10">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors ${
                                type === 'Atenção' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                                type === 'Lacuna de Base' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            }`}>
                                {type === 'Atenção' ? <Zap size={24} /> : type === 'Lacuna de Base' ? <ShieldAlert size={24} /> : <Target size={24} />}
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-4xl font-black text-[hsl(var(--text-bright))] tracking-tighter">{count}</div>
                                <div className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest">{type}</div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Mapa de Calor */}
            <div className="glass-premium p-8 md:p-12 rounded-[3.5rem] border border-[hsl(var(--border))] space-y-12 relative overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-1 h-10 bg-gradient-to-b from-[hsl(var(--accent))] to-transparent rounded-full shadow-[0_0_15px_hsl(var(--accent)/0.5)]" />
                        <div>
                            <h3 className="text-sm font-black text-[hsl(var(--text-bright))] uppercase tracking-[0.3em]">Mapa de Calor de Erros</h3>
                            <p className="text-[10px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest mt-1">Navegação tática por assunto reincidente</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-12 relative z-10">
                    {Object.entries(heatmapData)
                        .filter(([_, assuntos]) => Object.values(assuntos).some(s => s.errors > 0))
                        .map(([materia, assuntos]) => (
                            <div key={materia} className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <h4 className="text-[10px] font-black text-[hsl(var(--accent))] uppercase tracking-[0.4em] px-4 py-2 border border-[hsl(var(--accent)/0.2)] rounded-xl bg-[hsl(var(--accent)/0.05)]">
                                        {materia}
                                    </h4>
                                    <div className="h-px bg-[hsl(var(--border))] flex-1" />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                    {Object.entries(assuntos)
                                        .filter(([_, stats]) => stats.errors > 0)
                                        .map(([assunto, stats]) => (
                                            <motion.div
                                                key={assunto}
                                                whileHover={{ scale: 1.05, y: -4 }}
                                                onClick={() => onSelectAssunto(materia, assunto)}
                                                className={`p-6 rounded-[2rem] border cursor-pointer transition-all relative overflow-hidden group/item shadow-lg ${getIntensityColor(stats.errors, stats.total)}`}
                                            >
                                                <div className="flex flex-col h-full space-y-6">
                                                    <span className="text-[10px] font-black text-[hsl(var(--text-main))] leading-tight uppercase line-clamp-3 min-h-[3.5em] group-hover/item:text-[hsl(var(--text-bright))] transition-colors">
                                                        {assunto}
                                                    </span>
                                                    <div className="flex items-end justify-between mt-auto">
                                                        <div className="text-3xl font-black text-[hsl(var(--text-bright))] tracking-tighter leading-none">
                                                            {Math.round((stats.hits / stats.total) * 100)}%
                                                        </div>
                                                        <div className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase flex items-center gap-1">
                                                            {stats.errors} <span className="opacity-50">err</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="absolute top-4 right-4 text-[hsl(var(--accent))] opacity-0 group-hover/item:opacity-100 transition-all -translate-x-2 group-hover/item:translate-x-0">
                                                    <ChevronRight size={16} />
                                                </div>
                                            </motion.div>
                                        ))}
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};
