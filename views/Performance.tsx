import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { questionsQueries } from '../services/queries';
import { logger } from '../utils/logger';
import { QuestionAttempt } from '../types';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import {
    TrendingUp, Target, Activity, Award, Filter, Calendar,
    ChevronRight, BarChart3, PieChart as PieChartIcon, Shield
} from 'lucide-react';

const Performance: React.FC = () => {
    const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

    useEffect(() => {
        fetchAttempts();
    }, []);

    const fetchAttempts = async () => {
        setLoading(true);
        const { data: { user } } = await (supabase.auth as any).getUser();
        if (!user) return;

        try {
            const data = await questionsQueries.getUserAttempts(user.id);
            setAttempts(data || []);
        } catch (error) {
            logger.error('DATA', 'Erro ao buscar tentativas do usuário', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        if (attempts.length === 0) return { total: 0, correct: 0, errors: 0, accuracy: 0 };
        const correct = attempts.filter(a => a.is_correct).length;
        return {
            total: attempts.length,
            correct,
            errors: attempts.length - correct,
            accuracy: ((correct / attempts.length) * 100).toFixed(1)
        };
    }, [attempts]);

    const evolutionData = useMemo(() => {
        const dailyMap: Record<string, { date: string, acertos: number, erros: number }> = {};
        attempts.forEach(a => {
            const date = new Date(a.attempted_at || '').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (!dailyMap[date]) dailyMap[date] = { date, acertos: 0, erros: 0 };
            if (a.is_correct) dailyMap[date].acertos++;
            else dailyMap[date].erros++;
        });
        return Object.values(dailyMap).slice(-15); // Last 15 days
    }, [attempts]);

    const subjectData = useMemo(() => {
        const materiaMap: Record<string, { name: string, total: number, correct: number }> = {};
        attempts.forEach(a => {
            const materia = a.materia || 'Outros';
            if (!materiaMap[materia]) materiaMap[materia] = { name: materia, total: 0, correct: 0 };
            materiaMap[materia].total++;
            if (a.is_correct) materiaMap[materia].correct++;
        });

        return Object.values(materiaMap)
            .map(m => ({
                ...m,
                accuracy: (m.correct / m.total) * 100,
                wrong: m.total - m.correct
            }))
            .sort((a, b) => b.total - a.total);
    }, [attempts]);

    const radarData = useMemo(() => {
        return subjectData.slice(0, 6).map(m => ({
            subject: m.name.substring(0, 10),
            A: m.accuracy,
            fullMark: 100
        }));
    }, [subjectData]);

    const COLORS = ['#22D3EE', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E'];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Activity className="animate-spin text-[hsl(var(--accent))]" size={40} />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center animate-pulse">Sincronizando Matriz de Performance...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700">

            {/* Header & Stats Premium */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Questões Resolvidas', value: stats.total, icon: Target, color: 'text-[hsl(var(--accent))]' },
                    { label: 'Taxa de Acerto', value: `${stats.accuracy}%`, icon: Award, color: 'text-green-400' },
                    { label: 'Acertos Totais', value: stats.correct, icon: Shield, color: 'text-blue-400' },
                    { label: 'Total de Matérias', value: subjectData.length, icon: Filter, color: 'text-purple-400' }
                ].map((item, i) => (
                    <div key={i} className="glass-premium p-4 rounded-2xl border border-[hsl(var(--border))] flex items-center gap-4 group hover:border-[hsl(var(--accent)/0.3)] transition-all">
                        <div className={`p-3 bg-white/5 rounded-xl ${item.color} group-hover:scale-110 transition-transform`}>
                            <item.icon size={20} />
                        </div>
                        <div>
                            <div className="text-xl font-black tracking-tighter text-[hsl(var(--text-bright))]">{item.value}</div>
                            <div className="text-[7.5px] font-black uppercase text-slate-500 tracking-widest">{item.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                <div className="glass-premium p-6 rounded-[2rem] border border-[hsl(var(--border))] space-y-4 flex flex-col h-[380px]">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-[hsl(var(--text-bright))] flex items-center gap-2">
                                <TrendingUp size={14} className="text-[hsl(var(--accent))]" /> Evolução de Desempenho
                            </h3>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Comparativo diário de acertos e erros</p>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={evolutionData}>
                                <defs>
                                    <linearGradient id="colorAcertos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorErros" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0B0E14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    itemStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="acertos" stroke="#22D3EE" strokeWidth={2} fillOpacity={1} fill="url(#colorAcertos)" />
                                <Area type="monotone" dataKey="erros" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#colorErros)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-premium p-6 rounded-[2rem] border border-[hsl(var(--border))] space-y-4 flex flex-col h-[380px]">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-[hsl(var(--text-bright))] flex items-center gap-2">
                                <BarChart3 size={14} className="text-purple-400" /> Equilíbrio por Matéria
                            </h3>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Visão radar das suas competências</p>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                        {radarData.length > 2 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Performance %" dataKey="A" stroke="#22D3EE" fill="#22D3EE" fillOpacity={0.4} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0B0E14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-slate-600">
                                <PieChartIcon size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-[8px] font-black uppercase tracking-widest">Resolva questões de pelo menos 3 matérias para gerar o radar</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <div className="glass-premium p-6 rounded-[2rem] border border-[hsl(var(--border))] space-y-6">
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tighter text-[hsl(var(--text-bright))]">Desempenho por Matéria</h3>
                        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-1">Mapeamento preciso da sua taxa de retenção</p>
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">{subjectData.length} Matérias</div>
                </div>

                <div className="space-y-4">
                    {subjectData.map((m, i) => (
                        <div key={i} className="group p-6 bg-white/5 rounded-3xl border border-transparent hover:border-[hsl(var(--accent)/0.2)] hover:bg-white/[0.08] transition-all">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-2 h-2 rounded-full ${m.accuracy >= 75 ? 'bg-green-500' : m.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                        <span className="text-xs font-black uppercase tracking-widest text-[hsl(var(--text-bright))]">{m.name}</span>
                                    </div>

                                    {/* Barra de Progresso Estilo TEC */}
                                    <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                                        <div
                                            className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000"
                                            style={{ width: `${m.accuracy}%` }}
                                        />
                                        <div
                                            className="h-full bg-red-500/40 transition-all duration-1000"
                                            style={{ width: `${100 - m.accuracy}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="text-[8px] font-black text-white mix-blend-difference uppercase tracking-widest">
                                                {m.accuracy.toFixed(1)}% ({m.correct} de {m.total})
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 shrink-0">
                                    <div className="px-4 py-2 bg-white/5 rounded-xl text-center border border-white/5 min-w-[70px]">
                                        <div className="text-xs font-black text-green-400">{m.correct}</div>
                                        <div className="text-[7px] font-black uppercase text-slate-600 tracking-widest">Acertos</div>
                                    </div>
                                    <div className="px-4 py-2 bg-white/5 rounded-xl text-center border border-white/5 min-w-[70px]">
                                        <div className="text-xs font-black text-red-400">{m.wrong}</div>
                                        <div className="text-[7px] font-black uppercase text-slate-600 tracking-widest">Erros</div>
                                    </div>
                                    <button className="p-3 bg-white/5 hover:bg-[hsl(var(--accent))] hover:text-black rounded-xl text-slate-500 transition-all border border-white/5 shadow-xl">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default Performance;
