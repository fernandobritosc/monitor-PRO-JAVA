import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
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

// Custom Y-Axis Tick para truncar nomes longos de matérias
const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const maxLength = 32;
  let text = payload.value;

  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + '...';
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="hsl(var(--text-muted))"
        fontSize={9}
        fontWeight={900}
      >
        {text}
      </text>
    </g>
  );
};

interface HomeViewProps {
  records: StudyRecord[];
  missaoAtiva: string;
  editais: EditalMateria[];
}

const HomeView: React.FC<HomeViewProps> = ({ records, missaoAtiva, editais }) => {
  const [analysisTab, setAnalysisTab] = useState<'time' | 'errors'>('time');
  const [filterPeriod, setFilterPeriod] = useState<number>(30);

  const getLocalTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [summaryDate, setSummaryDate] = useState(getLocalTodayStr());
  const dateInputRef = useRef<HTMLInputElement>(null);

  const activeRecords = useMemo(() => {
    const baseRecords = records
      .filter(r => r.concurso === missaoAtiva)
      .sort((a, b) => new Date(a.data_estudo).getTime() - new Date(b.data_estudo).getTime());

    if (filterPeriod === 0) return baseRecords;

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - filterPeriod);

    return baseRecords.filter(r => new Date(r.data_estudo + 'T00:00:00').getTime() >= limitDate.getTime());
  }, [records, missaoAtiva, filterPeriod]);

  const summaryRecords = records.filter(r => r.concurso === missaoAtiva && r.data_estudo === summaryDate);

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

  const totalQuestions = activeRecords.reduce((acc, r) => acc + r.total, 0);
  const totalCorrect = activeRecords.reduce((acc, r) => acc + r.acertos, 0);
  const precision = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const totalHours = activeRecords.reduce((acc, r) => acc + r.tempo, 0) / 60;

  const daysUntilExam = useMemo(() => {
    const activeEdital = editais.find(e => e.concurso === missaoAtiva);
    if (!activeEdital?.data_prova) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [ano, mes, dia] = activeEdital.data_prova.split('-').map(Number);
    const exam = new Date(ano, mes - 1, dia);
    const diffTime = exam.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 3600 * 24)));
  }, [editais, missaoAtiva]);

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

  const colorOffset = useMemo(() => {
    if (evolutionData.length === 0) return 0;
    const precisions = evolutionData.map(i => i.precision);
    const max = Math.max(...precisions);
    const min = Math.min(...precisions);
    if (max <= 80) return 0;
    if (min >= 80) return 1;
    return (max - 80) / (max - min);
  }, [evolutionData]);

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

  const timeData = useMemo(() => {
    const timeBySubject = activeRecords.reduce<Record<string, number>>((acc, r) => {
      const current = Number(acc[r.materia] || 0);
      acc[r.materia] = current + Number(r.tempo);
      return acc;
    }, {});
    return Object.entries(timeBySubject).map(([name, value]) => ({ name, value })).sort((a, b) => Number(b.value) - Number(a.value));
  }, [activeRecords]);

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

  const inactiveStreak = useMemo(() => {
    const studyMap = new Map<string, number>();
    records
      .filter(r => r.concurso === missaoAtiva)
      .forEach(r => studyMap.set(r.data_estudo, (studyMap.get(r.data_estudo) || 0) + r.tempo));

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 120; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if ((studyMap.get(dateStr) || 0) > 0) break;
      streak++;
    }
    return streak;
  }, [records, missaoAtiva]);

  const formatDateLabel = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  const formatFullDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const isToday = summaryDate === getLocalTodayStr();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 } as any
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-10 pb-20"
    >
      {/* FILTROS DE PERÍODO */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center gap-6">
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
      </motion.div>

      {/* ROW 1: KPIs */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </motion.div>

      {/* ROW 2: PRINCIPAL */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
              <div className="flex items-center gap-2 text-green-400"><div className="w-2 h-2 bg-green-400 rounded-full" /><span>Elite (80%)</span></div>
              <div className="flex items-center gap-2 text-yellow-400"><div className="w-2 h-2 bg-yellow-400 rounded-full" /><span>Base (60%)</span></div>
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
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={0} stopColor="#4ade80" />
                    <stop offset={colorOffset} stopColor="#4ade80" />
                    <stop offset={colorOffset} stopColor="#facc15" />
                    <stop offset={1} stopColor="#facc15" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--text-muted))" fontSize={9} tickFormatter={formatDateLabel} minTickGap={40} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(var(--text-muted))" fontSize={9} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
                  }}
                  labelStyle={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  itemStyle={{ color: 'hsl(var(--accent))', fontWeight: '900', fontSize: '16px' }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'PRECISÃO']}
                  labelFormatter={(label) => formatFullDate(label)}
                />
                <Area
                  type="monotone"
                  dataKey="precision"
                  stroke="url(#lineGradient)"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorPrecision)"
                  filter="url(#shadow)"
                  activeDot={{ r: 8, fill: 'white', stroke: 'hsl(var(--accent))', strokeWidth: 4 }}
                />
                <ReferenceLine y={80} stroke="rgba(74,222,128,0.3)" strokeDasharray="8 8" />
                <ReferenceLine y={60} stroke="rgba(250,204,21,0.3)" strokeDasharray="8 8" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-1 glass-premium rounded-[2.5rem] flex flex-col overflow-hidden h-[450px] md:h-[500px]">
          <div className="p-8 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block)/0.3)] flex justify-between items-start shrink-0">
            <div>
              <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] ${isToday ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))]' : 'bg-yellow-500/20 text-yellow-500'}`}>
                {isToday ? 'Hoje' : 'Histórico'}
              </span>
              <h2 className="text-2xl font-black text-[hsl(var(--text-bright))] mt-3 tracking-tighter uppercase leading-none">
                Resumo {isToday ? 'Hoje' : formatFullDate(summaryDate).substring(0, 5)}
              </h2>
            </div>
            <div className="relative group/picker">
              <div className="bg-[hsl(var(--bg-main))] p-3 rounded-2xl text-[hsl(var(--text-muted))] group-hover/picker:text-[hsl(var(--accent))] group-hover/picker:bg-[hsl(var(--bg-user-block))] cursor-pointer transition-all border border-[hsl(var(--border))] shadow-lg">
                <CalendarDays size={20} />
              </div>
              <input type="date" ref={dateInputRef} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {summaryStatsByMateria.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-16 h-16 rounded-3xl bg-[hsl(var(--bg-user-block))] flex items-center justify-center mb-4"><Eye size={32} /></div>
                <p className="text-xs font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">Nenhum registro</p>
              </div>
            ) : (
              summaryStatsByMateria.map(([materia, stats], index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-[hsl(var(--bg-user-block)/0.3)] border border-transparent hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-user-block)/0.5)] transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-1 h-8 bg-[hsl(var(--accent))] rounded-full opacity-40 group-hover:opacity-100" />
                    <span className="text-sm font-bold text-[hsl(var(--text-bright))] tracking-tight">{materia}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-[hsl(var(--accent))]">{formatTime(stats.time)}</div>
                    <div className="text-[9px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-widest mt-1">{stats.questions} Questões</div>
                  </div>
                </div>
              ))
            )}
          </div>
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
            <div className="p-2 bg-[hsl(var(--accent)/0.1)] rounded-xl"><TrendingUp size={16} className="text-[hsl(var(--accent))]" /></div>
          </div>
        </div>
      </motion.div>

      {/* ROW 3: HEATMAP & ANALYSIS */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-premium rounded-[2.5rem] p-8 md:p-10">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-lg font-black flex items-center gap-3 tracking-tighter text-[hsl(var(--text-bright))] uppercase">
              <Calendar className="text-[hsl(var(--accent))]" /> Mapa de Constância
            </h3>
            <span className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest">Últimos 120 Dias</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-start">
            {heatmapData.map((day) => (
              <div
                key={day.date}
                className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-[4px] transition-all relative cursor-pointer ${day.date === summaryDate ? 'ring-2 ring-[hsl(var(--accent))] ring-offset-2 ring-offset-[hsl(var(--bg-main))] z-10 scale-125' : 'hover:scale-150 hover:z-20'}`}
                onClick={() => setSummaryDate(day.date)}
              >
                <div className={`w-full h-full rounded-[4px] ${day.intensity === 0 ? 'bg-[hsl(var(--bg-user-block))]' : day.intensity === 1 ? 'bg-[hsl(var(--accent)/0.2)]' : day.intensity === 2 ? 'bg-[hsl(var(--accent)/0.4)]' : day.intensity === 3 ? 'bg-[hsl(var(--accent)/0.7)]' : 'bg-[hsl(var(--accent))] shadow-[0_0_10px_hsl(var(--accent)/0.5)]'}`} />
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-10">
            <div className="flex items-center gap-4 opacity-40 text-[8px] font-black uppercase tracking-widest">
              <span>Menos</span>
              <div className="flex gap-1.5">{[0, 1, 2, 3, 4].map(idx => (<div key={idx} className={`w-2.5 h-2.5 rounded-sm ${idx === 0 ? 'bg-[hsl(var(--bg-user-block))]' : idx === 1 ? 'bg-[hsl(var(--accent)/0.2)]' : idx === 2 ? 'bg-[hsl(var(--accent)/0.4)]' : idx === 3 ? 'bg-[hsl(var(--accent)/0.7)]' : 'bg-[hsl(var(--accent))]'}`} />))}</div>
              <span>Mais</span>
            </div>
            {inactiveStreak > 0 && (<div className="px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Pausa Detectada: {inactiveStreak}d Off-line</div>)}
          </div>
        </div>

        <div className="glass-premium rounded-[2.5rem] p-8 md:p-10 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setAnalysisTab('time')} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisTab === 'time' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))]' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}>Distribuição de Tempo</button>
            <button onClick={() => setAnalysisTab('errors')} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisTab === 'errors' ? 'bg-red-500 text-white' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}>Análise de Erros</button>
          </div>
          <div className="flex-1 w-full min-h-[200px]">
            {analysisTab === 'time' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {timeData.map((_, i) => (
                      <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={`hsl(${[188, 262, 330, 46, 142][i % 5]} 80% 65%)`} />
                        <stop offset="100%" stopColor={`hsl(${[188, 262, 330, 46, 142][i % 5]} 80% 45%)`} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie data={timeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                    {timeData.map((e, i) => <Cell key={`c-${i}`} fill={`url(#grad-${i})`} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--bg-sidebar)/0.9)', backdropFilter: 'blur(10px)', border: '1px solid hsl(var(--border))', borderRadius: '15px' }} itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '10px' }} formatter={(v: number) => [`${Math.floor(v / 60)}h ${v % 60}m`, 'TEMPO']} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))] ml-2">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorData} layout="vertical" margin={{ left: 10, right: 40, top: 10, bottom: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="materia" type="category" stroke="hsl(var(--text-muted))" fontSize={9} width={180} tick={<CustomYAxisTick />} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: 'hsl(var(--bg-sidebar)/0.9)', backdropFilter: 'blur(10px)', border: '1px solid hsl(var(--border))', borderRadius: '15px' }} itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px' }} />
                  <Bar dataKey="errors" radius={[0, 10, 10, 0]} barSize={12}>
                    {errorData.map((e, i) => <Cell key={`c-${i}`} fill={i === 0 ? '#EF4444' : '#F59E0B'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HomeView;