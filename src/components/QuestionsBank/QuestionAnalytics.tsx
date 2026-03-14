import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { AlertOctagon, Target, Clock, BarChart2 } from 'lucide-react';

export const QuestionAnalytics: React.FC<{
    questionId: string;
    alternativas: any[];
    onClose: () => void;
}> = ({ questionId, alternativas, onClose }) => {
    const [data, setData] = useState<{ global: any[], alts: any[], userStats: { correct: number, total: number } | null, avgTime: number | null } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: attempts } = await supabase.from('questao_tentativas').select('*').eq('question_id', questionId);

                if (attempts) {
                    const correct = attempts.filter(a => a.is_correct).length;
                    const total = attempts.length;
                    const globalStats = [
                        { name: 'Acertos', value: correct, color: '#22c55e' },
                        { name: 'Erros', value: total - correct, color: '#ef4444' }
                    ];
                    const altCounts = alternativas.map(alt => {
                        const count = attempts.filter(a => a.selected_alt === alt.id).length;
                        return { name: alt.label, count: count, percentage: total > 0 ? ((count / total) * 100).toFixed(1) : "0" };
                    });
                    let userPerformance = null;
                    if (user) {
                        const userAttempts = attempts.filter(a => a.user_id === user.id);
                        userPerformance = { correct: userAttempts.filter(a => a.is_correct).length, total: userAttempts.length };
                    }
                    // Avg response time from attempts that have tempo_resposta
                    const withTime = attempts.filter(a => a.tempo_resposta != null);
                    const avgTime = withTime.length > 0
                        ? Math.round(withTime.reduce((sum, a) => sum + a.tempo_resposta, 0) / withTime.length)
                        : null;

                    setData({ global: globalStats, alts: altCounts, userStats: userPerformance, avgTime });
                }
            } catch (err) { console.error("Stats Error:", err); }
            finally { setLoading(false); }
        };
        fetchStats();
    }, [questionId, alternativas]);

    if (loading) return (
        <div className="flex items-center justify-center p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-card))] animate-pulse min-h-[100px]">
            <div className="w-4 h-4 rounded-full border-t-2 border-[hsl(var(--accent))] animate-spin mr-3" />
            <span className="text-[7px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.2em]">Sincronizando Dados...</span>
        </div>
    );

    if (!data) return null;
    const totalGlobal = data.global.reduce((acc, curr) => acc + curr.value, 0);
    const correctRate = totalGlobal > 0 ? (data.global[0].value / totalGlobal) * 100 : 0;
    const isDark = document.documentElement.classList.contains('dark') || !document.documentElement.classList.contains('light');
    const tooltipBg = isDark ? '#0f172a' : '#f1f5f9';
    const tooltipText = isDark ? '#fff' : '#1e293b';
    const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    const tickFill = isDark ? '#64748b' : '#475569';

    return (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--bg-card))] backdrop-blur-md rounded-xl p-3 animate-in fade-in zoom-in-95 duration-500 shadow-lg space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2">
                    <div className="p-1 px-2 border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.08)] rounded text-[hsl(var(--accent))] flex items-center gap-1.5">
                        <BarChart2 size={10} />
                        <span className="text-[7px] font-black uppercase tracking-widest">Analytics Pro</span>
                    </div>
                </div>
                <button onClick={onClose} className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded-md text-red-500 font-black uppercase text-[7px] tracking-widest border border-red-500/20 transition-all active:scale-95">
                    FECHAR
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center space-y-2">
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">Desempenho Geral</p>
                    <div className="h-28 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.global} innerRadius={25} outerRadius={40} paddingAngle={2} dataKey="value">
                                    {data.global.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${gridStroke}`, borderRadius: '6px', fontSize: '8px', color: tooltipText }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-1 w-full max-w-[120px]">
                        {data.global.map(g => (
                            <div key={g.name} className="flex items-center justify-between text-[7px] font-bold">
                                <span className="flex items-center gap-1.5 text-[hsl(var(--text-muted))]"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />{g.name}:</span>
                                <span className="text-[hsl(var(--text-bright))] font-black">{totalGlobal > 0 ? ((g.value / totalGlobal) * 100).toFixed(1) + '%' : '0%'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col items-center space-y-2">
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">Alternativas</p>
                    <div className="h-28 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.alts}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: tickFill, fontWeight: 'bold' }} />
                                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                                    {data.alts.map((entry, index) => <Cell key={`cell-${index}`} fill="hsl(188,80%,40%)" />)}
                                </Bar>
                                <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${gridStroke}`, borderRadius: '6px', fontSize: '8px', color: tooltipText }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 w-full text-[6.5px] font-black uppercase tracking-tight text-[hsl(var(--text-muted))]">
                        {data.alts.map((a, i) => (
                            <div key={`alt-row-${i}`} className="flex justify-between border-b border-[hsl(var(--border))] pb-0.5">
                                <span>{a.name}:</span> <span className="text-[hsl(var(--text-bright))]">{a.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col items-center space-y-2">
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">Meu Histórico</p>
                    <div className="h-28 w-full flex items-center justify-center">
                        {data.userStats && data.userStats.total > 0 ? (
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-[hsl(var(--border))]" />
                                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/40" style={{ clipPath: `conic-gradient(transparent 0%, transparent ${(1 - data.userStats.correct / data.userStats.total) * 100}%, currentColor ${(1 - data.userStats.correct / data.userStats.total) * 100}%, currentColor 100%)` }} />
                                <div className="flex flex-col items-center">
                                    <span className="text-[14px] font-black text-[hsl(var(--text-bright))] italic">{((data.userStats.correct / data.userStats.total) * 100).toFixed(0)}%</span>
                                    <span className="text-[5px] text-[hsl(var(--text-muted))] uppercase font-black">Accuracy</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-3 rounded-xl border border-dashed border-[hsl(var(--border))]">
                                <AlertOctagon size={14} className="mx-auto text-[hsl(var(--text-muted))] mb-1" />
                                <p className="text-[hsl(var(--text-muted))] font-bold uppercase text-[6px] tracking-widest leading-tight">Sem dados</p>
                            </div>
                        )}
                    </div>
                    {data.userStats && data.userStats.total > 0 && (
                        <div className="flex flex-col gap-0.5 w-full text-[7px] font-black uppercase tracking-tight text-[hsl(var(--text-muted))]">
                            <div className="flex justify-between"><span>Tentativas:</span> <span className="text-[hsl(var(--text-bright))]">{data.userStats.total}</span></div>
                            <div className="flex justify-between"><span>Sucessos:</span> <span className="text-emerald-500">{data.userStats.correct}</span></div>
                            <div className="flex justify-between"><span>Falhas:</span> <span className="text-red-500">{data.userStats.total - data.userStats.correct}</span></div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-2 border-t border-[hsl(var(--border))] flex justify-between text-[7px] font-black uppercase tracking-[0.1em] text-[hsl(var(--text-muted))]">
                <div className="flex items-center gap-1.5"><AlertOctagon size={10} className="text-[hsl(var(--accent))]" /> Dificuldade: <span className="text-[hsl(var(--text-bright))]">{correctRate > 75 ? 'Fácil' : correctRate > 50 ? 'Média' : 'Difícil'}</span></div>
                <div className="flex items-center gap-1.5"><Target size={10} className="text-[hsl(var(--accent-secondary))]" /> Total: <span className="text-[hsl(var(--text-bright))]">{totalGlobal} Resoluções</span></div>
                <div className="flex items-center gap-1.5"><Clock size={10} className="text-orange-500" /> Avg: <span className={data.avgTime != null ? 'text-[hsl(var(--text-bright))]' : 'text-[hsl(var(--text-muted))]'}>{data.avgTime != null ? `${data.avgTime}s` : 'N/A'}</span></div>
            </div>
        </div>
    );
};
