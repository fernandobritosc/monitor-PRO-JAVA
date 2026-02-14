import React, { useMemo, useState, useRef } from 'react';
import { StudyRecord, EditalMateria, ViewType } from '../types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  CalendarDays, PieChart as PieIcon, TrendingUp, AlertTriangle, Filter,
  SlidersHorizontal, Trash2, Calendar, BookOpen, PlusCircle, RotateCcw, CalendarCheck, Clock, CheckCircle2, Eye,
  Target, Zap, Waves, Activity, Sparkles
} from 'lucide-react';
import KPICard from '../components/KPICard';

interface HomeViewProps {
  records: StudyRecord[];
  missaoAtiva: string;
  editais: EditalMateria[];
  setActiveView: (view: ViewType) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ records, missaoAtiva, editais, setActiveView }) => {
  const [analysisTab, setAnalysisTab] = useState<'time' | 'errors'>('time');
  const [filterPeriod, setFilterPeriod] = useState<number>(30); // 0 for All, 7 for Week, 30 for Month

  // Helper para Data Local (YYYY-MM-DD)
  const getLocalTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Estado da Data Selecionada no Resumo
  const [summaryDate, setSummaryDate] = useState(getLocalTodayStr());
  const dateInputRef = useRef<HTMLInputElement>(null);

  // --- Cálculos de Dados ---
  const activeRecords = useMemo(() => {
    const baseRecords = records
      .filter(r => r.concurso === missaoAtiva)
      .sort((a, b) => new Date(a.data_estudo).getTime() - new Date(b.data_estudo).getTime());

    if (filterPeriod === 0) return baseRecords;

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - filterPeriod);

    return baseRecords.filter(r => new Date(r.data_estudo + 'T00:00:00').getTime() >= limitDate.getTime());
  }, [records, missaoAtiva, filterPeriod]);

  // Stats do Dia Selecionado (Resumo Dinâmico)
  const summaryRecords = records.filter(r => r.concurso === missaoAtiva && r.data_estudo === summaryDate);

  // Agrupamento por Matéria (Resumo do Dia)
  const summaryStatsByMateria = useMemo(() => {
    const stats: Record<string, { time: number; questions: number }> = {};
    summaryRecords.forEach(r => {
      if (!stats[r.materia]) stats[r.materia] = { time: 0, questions: 0 };
      stats[r.materia].time += r.tempo;
      stats[r.materia].questions += r.total;
    });
    return Object.entries(stats).sort((a, b) => b[1].time - a[1].time);
  }, [summaryRecords]);

  const summaryMinutes = summaryRecords.reduce((acc, r) => acc + r.tempo, 0);
  const summaryQuestions = summaryRecords.reduce((acc, r) => acc + r.total, 0);

  // Stats Gerais (KPIs) - AGORA FILTRADOS
  const totalQuestions = activeRecords.reduce((acc, r) => acc + r.total, 0);
  const totalCorrect = activeRecords.reduce((acc, r) => acc + r.acertos, 0);
  const precision = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const totalHours = activeRecords.reduce((acc, r) => acc + r.tempo, 0) / 60;

  // Dias para Prova
  const daysUntilExam = useMemo(() => {
    const activeEdital = editais.find(e => e.concurso === missaoAtiva);
    if (!activeEdital?.data_prova) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Assegura interpretação local da data da prova
    const [ano, mes, dia] = activeEdital.data_prova.split('-').map(Number);
    const exam = new Date(ano, mes - 1, dia);

    // Use .getTime() directly for arithmetic operations to ensure numeric types
    const diffTime = exam.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 3600 * 24)));
  }, [editais, missaoAtiva]);

  // Gráfico de Evolução (Linha) - AGORA FILTRADO
  const evolutionData = useMemo(() => {
    return activeRecords.reduce((acc: { date: string, correct: number, total: number, precision: number }[], r) => {
      const existing = acc.find(i => i.date === r.data_estudo);
      const rAcertos = Number(r.acertos);
      const rTotal = Number(r.total);

      if (existing) {
        existing.correct += rAcertos;
        existing.total += rTotal;
        existing.precision = existing.total > 0 ? (existing.correct / existing.total) * 100 : 0;
      } else {
        acc.push({
          date: r.data_estudo,
          correct: rAcertos,
          total: rTotal,
          precision: rTotal > 0 ? (rAcertos / rTotal) * 100 : 0
        });
      }
      return acc;
    }, []);
  }, [activeRecords]);

  // Gráfico de Erros (Barras) - AGORA FILTRADO
  const errorData = useMemo(() => {
    const errorsBySubject = activeRecords.reduce<Record<string, number>>((acc, r) => {
      const current = Number(acc[r.materia] || 0);
      const diff = Number(r.total) - Number(r.acertos);
      acc[r.materia] = current + diff;
      return acc;
    }, {});
    return Object.entries(errorsBySubject)
      .map(([materia, errors]) => ({ materia, errors }))
      .sort((a, b) => Number(b.errors) - Number(a.errors)).slice(0, 5);
  }, [activeRecords]);

  // Gráfico de Tempo (Pizza) - AGORA FILTRADO
  const timeData = useMemo(() => {
    const timeBySubject = activeRecords.reduce<Record<string, number>>((acc, r) => {
      const current = Number(acc[r.materia] || 0);
      acc[r.materia] = current + Number(r.tempo);
      return acc;
    }, {});
    return Object.entries(timeBySubject).map(([name, value]) => ({ name, value })).sort((a, b) => Number(b.value) - Number(a.value));
  }, [activeRecords]);

  const COLORS = ['#8B5CF6', '#06B6D4', '#EC4899', '#10B981', '#F59E0B', '#6366f1'];

  // Heatmap (Last 120 days)
  const heatmapData = useMemo(() => {
    const allMissionRecords = records.filter(r => r.concurso === missaoAtiva);
    const days: { date: string, minutes: number, intensity: number }[] = [];
    const studyMap = new Map<string, number>();
    allMissionRecords.forEach(r => studyMap.set(r.data_estudo, (studyMap.get(r.data_estudo) || 0) + r.tempo));

    for (let i = 119; i >= 0; i--) {
      const d = new Date();
      d.setDate(new Date().getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const minutes = studyMap.get(dateStr) || 0;
      let intensity = 0;
      if (minutes > 0) intensity = 1; if (minutes > 60) intensity = 2;
      if (minutes > 120) intensity = 3; if (minutes > 240) intensity = 4;
      days.push({ date: dateStr, minutes, intensity });
    }
    return days;
  }, [records, missaoAtiva]);

  // Helper para formatar data DD/MM no gráfico
  const formatDateLabel = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  // Helper para data legível no título (Ex: 02/02/2026)
  const formatFullDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Helper para formatar tempo (3h 20m ou 45m)
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const isToday = summaryDate === getLocalTodayStr();

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">

      {/* FILTROS DE PERÍODO PREMIUM */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[hsl(var(--accent-glow))] rounded-xl">
            <Sparkles size={20} className="text-[hsl(var(--accent))]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--text-bright))] uppercase tracking-widest">Motor de Análise</h3>
            <p className="text-[10px] text-[hsl(var(--text-muted))] font-medium uppercase tracking-[0.1em]">Visão analítica da sua performance</p>
          </div>
        </div>

        <div className="flex p-1 bg-[hsl(var(--bg-sidebar)/0.5)] backdrop-blur-md border border-[hsl(var(--border))] rounded-2xl shadow-xl">
          {[{ label: '7 D', val: 7 }, { label: '30 D', val: 30 }, { label: 'ALL', val: 0 }].map(p => (
            <button
              key={p.val}
              onClick={() => setFilterPeriod(p.val)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 ${filterPeriod === p.val ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))]' : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] hover:bg-white/5'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ROW 1: KPIs GLOBAIS (DESIGN WOW) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="Precisão Média"
          value={`${precision.toFixed(0)}%`}
          percentage={precision}
          icon={<Target size={24} />}
          color={precision >= 80 ? "142 71% 45%" : "188 86% 53%"}
          trend={precision >= 80 ? "Pro" : ""}
          trendUp={precision >= 80}
        />
        <KPICard
          label="Tempo Investido"
          value={`${totalHours.toFixed(0)}h`}
          percentage={Math.min((totalHours / 200) * 100, 100)}
          icon={<Zap size={24} />}
          color="262 83% 58%"
        />
        <KPICard
          label="Volume de Questões"
          value={totalQuestions.toLocaleString()}
          percentage={Math.min((totalQuestions / 1000) * 100, 100)}
          icon={<Waves size={24} />}
          color="330 81% 60%"
        />
        <KPICard
          label="Rumo ao Objetivo"
          value={daysUntilExam !== null ? `${daysUntilExam}d` : "--"}
          percentage={typeof daysUntilExam === 'number' ? Math.max(0, Math.min(100, (daysUntilExam / 90) * 100)) : 0}
          icon={<Activity size={24} />}
          color="46 97% 55%"
        />
      </div>

      {/* ROW 2: PRINCIPAL (GRÁFICO COM EFEITO WOW) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* COLUNA ESQUERDA: GRÁFICO DE EVOLUÇÃO (2/3) */}
        <div className="lg:col-span-2 glass-premium rounded-[2.5rem] p-8 md:p-10 flex flex-col h-[400px] md:h-[500px]">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 shrink-0 gap-4">
            <div>
              <h3 className="text-xl font-black flex items-center gap-3 tracking-tighter text-[hsl(var(--text-bright))] uppercase">
                <div className="w-1.5 h-6 bg-[hsl(var(--accent))] rounded-full" />
                Curva de Conhecimento
              </h3>
              <p className="text-[10px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-[0.2em] mt-1 ml-4">Monitoramento de precisão por data</p>
            </div>

            <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                <span>Elite (80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                <span>Base (60%)</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrecision" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--text-muted))" fontSize={9} tickFormatter={formatDateLabel} minTickGap={40} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(var(--text-muted))" fontSize={9} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--bg-sidebar)/0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '20px',
                    color: 'hsl(var(--text-bright))',
                    boxShadow: 'var(--shadow)'
                  }}
                  labelStyle={{ color: 'hsl(var(--text-muted))', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  itemStyle={{ color: 'hsl(var(--accent))', fontWeight: '900', fontSize: '14px' }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'PRECISÃO']}
                  labelFormatter={(label) => formatFullDate(label)}
                />
                <Area
                  type="monotone"
                  dataKey="precision"
                  stroke="hsl(var(--accent))"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorPrecision)"
                  activeDot={{ r: 8, fill: 'hsl(var(--accent))', stroke: 'hsl(var(--bg-main))', strokeWidth: 3 }}
                />
                <ReferenceLine y={80} stroke="rgba(74,222,128,0.3)" strokeDasharray="8 8" strokeWidth={2} />
                <ReferenceLine y={60} stroke="rgba(250,204,21,0.3)" strokeDasharray="8 8" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* COLUNA DIREITA: RESUMO DO DIA (DESIGN PREMIUM) */}
        <div className="lg:col-span-1 glass-premium rounded-[2.5rem] flex flex-col overflow-hidden transition-all duration-500 h-[450px] md:h-[500px]">
          {/* Header */}
          <div className="p-8 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block)/0.3)] flex justify-between items-start shrink-0">
            <div>
              <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] ${isToday ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))]' : 'bg-yellow-500/20 text-yellow-500'}`}>
                {isToday ? 'Hoje' : 'Histórico'}
              </span>
              <h2 className="text-2xl font-black text-[hsl(var(--text-bright))] mt-3 tracking-tighter uppercase leading-none">
                Resumo {isToday ? 'Hoje' : formatFullDate(summaryDate).substring(0, 5)}
              </h2>
            </div>
            {/* DATE PICKER PREMIUM */}
            <div className="relative group/picker">
              <div className="bg-[hsl(var(--bg-main))] p-3 rounded-2xl text-[hsl(var(--text-muted))] group-hover/picker:text-[hsl(var(--accent))] group-hover/picker:bg-[hsl(var(--bg-user-block))] cursor-pointer transition-all border border-[hsl(var(--border))] shadow-lg">
                <CalendarDays size={20} />
              </div>
              <input
                type="date"
                ref={dateInputRef}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={summaryDate}
                onChange={(e) => setSummaryDate(e.target.value)}
              />
            </div>
          </div>

          {/* Listagem de Matérias */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {summaryStatsByMateria.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 animate-in fade-in duration-700">
                <div className="w-16 h-16 rounded-3xl bg-[hsl(var(--bg-user-block))] flex items-center justify-center mb-4">
                  <Eye size={32} className="text-[hsl(var(--text-muted))]" />
                </div>
                <p className="text-xs font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">Nenhum registro encontrado</p>
              </div>
            ) : (
              summaryStatsByMateria.map(([materia, stats], index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-[hsl(var(--bg-user-block)/0.3)] border border-transparent hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-user-block)/0.5)] transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-1 h-8 bg-[hsl(var(--accent))] rounded-full opacity-40 group-hover:opacity-100 transition-opacity" />
                    <span className="text-sm font-bold text-[hsl(var(--text-bright))] tracking-tight">{materia}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-[hsl(var(--accent))]">{formatTime(stats.time)}</div>
                    <div className="text-[9px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-widest leading-none mt-1">{stats.questions} Questões</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totalizadores (Footer Premium) */}
          <div className="p-6 bg-[hsl(var(--bg-sidebar)/0.5)] border-t border-[hsl(var(--border))] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-6">
              <div>
                <span className="block text-xl font-black text-[hsl(var(--text-bright))] leading-none tracking-tighter">{Math.floor(summaryMinutes / 60)}h{summaryMinutes % 60}m</span>
                <span className="text-[9px] text-[hsl(var(--text-muted))] font-black uppercase tracking-widest">Tempo</span>
              </div>
              <div className="w-px h-8 bg-[hsl(var(--border))]"></div>
              <div>
                <span className="block text-xl font-black text-[hsl(var(--accent))] leading-none tracking-tighter">{summaryQuestions}</span>
                <span className="text-[9px] text-[hsl(var(--text-muted))] font-black uppercase tracking-widest">Questões</span>
              </div>
            </div>
            <div className="p-2 bg-[hsl(var(--accent)/0.1)] rounded-xl">
              <TrendingUp size={16} className="text-[hsl(var(--accent))]" />
            </div>
          </div>
        </div>

      </div>

      {/* ROW 3: HEATMAP & ANALYSIS (ESTÉTICA WOW) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-premium rounded-[2.5rem] p-8 md:p-10">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black flex items-center gap-3 tracking-tighter text-[hsl(var(--text-bright))] uppercase">
              <Calendar className="text-[hsl(var(--accent))]" />
              Mapa de Constância
            </h3>
            <span className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest">Últimos 120 Dias</span>
          </div>

          <div className="flex flex-wrap gap-2 justify-start">
            {heatmapData.map((day) => {
              const [y, m, d] = day.date.split('-');
              return (
                <div
                  key={day.date}
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-[4px] transition-all duration-300 relative group cursor-pointer ${day.date === summaryDate ? 'ring-2 ring-[hsl(var(--accent))] ring-offset-2 ring-offset-[hsl(var(--bg-main))] z-10 scale-125' : 'hover:scale-150 hover:z-20'}`}
                  title={`${d}/${m}/${y} • ${Math.floor(day.minutes / 60)}h${day.minutes % 60}m`}
                  onClick={() => setSummaryDate(day.date)}
                >
                  <div className={`w-full h-full rounded-[4px] shadow-sm ${day.intensity === 0 ? 'bg-[hsl(var(--bg-user-block))]' :
                    day.intensity === 1 ? 'bg-[hsl(var(--accent)/0.2)]' :
                      day.intensity === 2 ? 'bg-[hsl(var(--accent)/0.4)]' :
                        day.intensity === 3 ? 'bg-[hsl(var(--accent)/0.7)]' :
                          'bg-[hsl(var(--accent))] shadow-[0_0_10px_hsl(var(--accent)/0.5)]'
                    }`} />
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 mt-8 opacity-40">
            <span className="text-[8px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">Menos</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map(idx => (
                <div key={idx} className={`w-2.5 h-2.5 rounded-sm ${idx === 0 ? 'bg-[hsl(var(--bg-user-block))]' :
                  idx === 1 ? 'bg-[hsl(var(--accent)/0.2)]' :
                    idx === 2 ? 'bg-[hsl(var(--accent)/0.4)]' :
                      idx === 3 ? 'bg-[hsl(var(--accent)/0.7)]' :
                        'bg-[hsl(var(--accent))]'
                  }`} />
              ))}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">Mais</span>
          </div>
        </div>

        <div className="glass-premium rounded-[2.5rem] p-8 md:p-10 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setAnalysisTab('time')}
              className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisTab === 'time' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))]' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}
            >
              Distribuição de Tempo
            </button>
            <button
              onClick={() => setAnalysisTab('errors')}
              className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisTab === 'errors' ? 'bg-red-500 text-white' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}
            >
              Análise de Erros
            </button>
          </div>

          <div className="flex-1 w-full min-h-[200px]">
            {analysisTab === 'time' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={timeData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                    {timeData.map((e, i) => <Cell key={`c-${i}`} fill={`hsl(${[188, 262, 330, 46, 142][i % 5]} 80% 55%)`} stroke="none" />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--bg-sidebar)/0.9)', backdropFilter: 'blur(10px)', border: '1px solid hsl(var(--border))', borderRadius: '15px' }}
                    itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}
                    formatter={(v: number) => [`${Math.floor(v / 60)}h ${v % 60}m`, 'TEMPO DE ESTUDO']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorData} layout="vertical" margin={{ left: -30, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="materia" type="category" stroke="hsl(var(--text-muted))" fontSize={9} width={100} tick={{ fill: 'hsl(var(--text-muted))', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--bg-sidebar)/0.9)', backdropFilter: 'blur(10px)', border: '1px solid hsl(var(--border))', borderRadius: '15px' }}
                    itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px' }}
                  />
                  <Bar dataKey="errors" radius={[0, 10, 10, 0]} barSize={12}>
                    {errorData.map((e, i) => <Cell key={`c-${i}`} fill={i === 0 ? '#EF4444' : '#F59E0B'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeView;