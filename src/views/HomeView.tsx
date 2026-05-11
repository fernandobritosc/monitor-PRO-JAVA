import React, { useMemo, useState, useRef } from 'react';
import { APP_VERSION } from '../constants';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Trophy,
  Target,
  Activity,
  ChevronRight,
  TrendingUp,
  Clock,
  Zap,
  CheckSquare,
  Sparkles,
  Search,
  Waves,
  CalendarDays,
  Eye,
  Calendar,
  GitCommit
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  LabelList
} from 'recharts';
import { useAppStore } from '../stores/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { useStudyRecords } from '../hooks/queries/useStudyRecords';
import { useEditais } from '../hooks/queries/useEditais';
import { StudyRecord, EditalMateria } from '../types';
import { ReleaseNotesModal } from '../components/ui/ReleaseNotesModal';
// --- SUBCOMPONENTES ---

interface KPICardProps {
  label: string;
  value: string;
  percentage: number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  trendUp?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, percentage, icon, color, trend, trendUp }) => {
  return (
    <div className="glass-premium p-6 rounded-[2rem] relative overflow-hidden group">
      <div 
        className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"
        style={{ background: `radial-gradient(circle at center, hsl(${color}) 0%, transparent 70%)` }}
      />
      <div className="flex justify-between items-start mb-6">
        <div className="p-3.5 rounded-2xl bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] group-hover:scale-110 transition-transform duration-500 shadow-lg">
          <div style={{ color: `hsl(${color})` }}>{icon}</div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${trendUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {trend}
          </div>
        )}
      </div>
      <span className="block text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mb-1">{label}</span>
      <h3 className="text-3xl font-black text-[hsl(var(--text-bright))] tracking-tighter">{value}</h3>
      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-[hsl(var(--bg-user-block))] rounded-full overflow-hidden border border-[hsl(var(--border))]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className="h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]"
            style={{ backgroundColor: `hsl(${color})` }}
          />
        </div>
        <span className="text-[9px] font-black text-[hsl(var(--text-muted))]">{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
};

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-10} y={0} dy={4} textAnchor="end" fill="hsl(var(--text-muted))" fontSize={9} fontWeight={900} className="uppercase tracking-widest">
        {payload.value}
      </text>
    </g>
  );
};


const HomeView: React.FC = () => {
  const { missaoAtiva } = useAppStore();
  const { session, loading: authLoading } = useAuth();
  const { studyRecords: records = [], isLoading: recordsLoading } = useStudyRecords(session?.user?.id);
  const { editais = [], isLoading: editaisLoading } = useEditais(session?.user?.id);
  const studyLoading = authLoading || recordsLoading || editaisLoading;
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  const [analysisTab, setAnalysisTab] = useState<'time' | 'precision' | 'comparative'>('time');
  const [filterPeriod, setFilterPeriod] = useState<number>(30);
  const [showGlobalStats, setShowGlobalStats] = useState(false);

  const getLocalTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [summaryDate, setSummaryDate] = useState(getLocalTodayStr());
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);

  const activeRecords = useMemo(() => {
    const hasRecordsInActiveMission = records.some(rec => rec.concurso === missaoAtiva);
    const isGlobal = missaoAtiva === 'Escolha a sua missão' || !missaoAtiva || !hasRecordsInActiveMission;

    const baseRecords = records
      .filter((r: StudyRecord) => isGlobal ? true : r.concurso === missaoAtiva)
      .sort((a: StudyRecord, b: StudyRecord) => new Date(a.data_estudo).getTime() - new Date(b.data_estudo).getTime());

    if (filterPeriod === 0) return baseRecords;

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - filterPeriod);

    return baseRecords.filter((r: StudyRecord) => new Date(r.data_estudo + 'T00:00:00').getTime() >= limitDate.getTime());
  }, [records, missaoAtiva, filterPeriod]);

  const summaryRecords = records.filter(r => (missaoAtiva === 'Escolha a sua missão' || !missaoAtiva ? true : r.concurso === missaoAtiva) && r.data_estudo === summaryDate);

  const summaryStatsByMateria = useMemo(() => {
    const stats: Record<string, { time: number; questions: number; tipo: string }> = {};
    summaryRecords.forEach(r => {
      const type = r.tipo || 'Estudo';
      const key = `${r.materia}|${type}`;
      if (!stats[key]) stats[key] = { time: 0, questions: 0, tipo: type };
      stats[key].time += r.tempo;
      stats[key].questions += r.total;
    });
    
    return Object.entries(stats)
      .map(([key, data]) => ({
        materia: key.split('|')[0],
        tipo: data.tipo,
        time: data.time,
        questions: data.questions
      }))
      .sort((a, b) => b.time - a.time);
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
    const aggregated = activeRecords.reduce((acc: { date: string, correct: number, total: number, precision: number }[], r) => {
      const existing = acc.find(i => i.date === r.data_estudo);
      const rAcertos = Number(r.acertos);
      const rTotal = Number(r.total);

      if (existing) {
        existing.correct += rAcertos;
        existing.total += rTotal;
      } else {
        acc.push({
          date: r.data_estudo,
          correct: rAcertos,
          total: rTotal,
          precision: 0
        });
      }
      return acc;
    }, []);

    let lastPrecision = 0;
    
    // Calcula a precisão. Se o dia não teve questões (total=0), herda a última média.
    return aggregated.map(day => {
      if (day.total > 0) {
        day.precision = (day.correct / day.total) * 100;
        lastPrecision = day.precision;
      } else {
        day.precision = lastPrecision;
      }
      return day;
    });
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

  const precisionData = useMemo(() => {
    const stats = activeRecords.reduce<Record<string, { correct: number, total: number }>>((acc, r) => {
      if (!acc[r.materia]) acc[r.materia] = { correct: 0, total: 0 };
      acc[r.materia].correct += Number(r.acertos);
      acc[r.materia].total += Number(r.total);
      return acc;
    }, {});
    return Object.entries(stats)
      .map(([materia, data]) => ({ 
        materia, 
        precision: data.total > 0 ? (data.correct / data.total) * 100 : 0 
      }))
      .sort((a, b) => b.precision - a.precision)
      .slice(0, 8);
  }, [activeRecords]);

  const timeData = useMemo(() => {
    const timeBySubject = activeRecords.reduce<Record<string, number>>((acc, r) => {
      const current = Number(acc[r.materia] || 0);
      acc[r.materia] = current + Number(r.tempo);
      return acc;
    }, {});
    return Object.entries(timeBySubject)
      .map(([materia, tempo]) => ({ materia, tempo }))
      .sort((a, b) => b.tempo - a.tempo)
      .slice(0, 8);
  }, [activeRecords]);

  const comparativeData = useMemo(() => {
    const stats = activeRecords.reduce<Record<string, { time: number, correct: number, total: number }>>((acc, r) => {
      if (!acc[r.materia]) acc[r.materia] = { time: 0, correct: 0, total: 0 };
      acc[r.materia].time += Number(r.tempo);
      acc[r.materia].correct += Number(r.acertos);
      acc[r.materia].total += Number(r.total);
      return acc;
    }, {});
    return Object.entries(stats)
      .map(([materia, data]) => ({ 
        materia, 
        tempo: data.time, 
        precision: data.total > 0 ? (data.correct / data.total) * 100 : 0 
      }))
      .sort((a, b) => b.tempo - a.tempo)
      .slice(0, 8);
  }, [activeRecords]);

  const heatmapData = useMemo(() => {
    const isGlobal = missaoAtiva === 'Escolha a sua missão' || !missaoAtiva;
    const allMissionRecords = records.filter(r => isGlobal ? true : r.concurso === missaoAtiva);
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
    const isGlobal = missaoAtiva === 'Escolha a sua missão' || !missaoAtiva;
    const studyMap = new Map<string, number>();
    records
      .filter(r => isGlobal ? true : r.concurso === missaoAtiva)
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

  // Variantes para animações do Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100
      }
    }
  };

  // Funções de formatação e ticks customizados para Gráficos Recharts
return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-10 pb-20"
    >
      {/* BANNER DE MISSÃO NÃO SELECIONADA */}
      {(missaoAtiva === 'Escolha a sua missão' || !missaoAtiva) && (
        <motion.div 
          variants={itemVariants} 
          className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-3xl -mr-32 -mt-32" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 bg-yellow-500/20 rounded-2xl">
              <Sparkles className="text-yellow-500" size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-yellow-500 uppercase tracking-tighter">Radar Global Ativado</h3>
              <p className="text-xs text-[hsl(var(--text-muted))] font-medium mt-1 leading-relaxed">
                Você ainda não selecionou sua missão principal. Exibindo dados de <span className="text-yellow-500 font-bold italic underline">todos os seus estudos</span>.
              </p>
            </div>
          </div>
          <button 
            onClick={() => window.location.hash = '#/missao'} // Ajustado baseado na rota (assumindo SPA com hash ou similar)
            className="px-8 py-3 bg-yellow-500 text-[hsl(var(--bg-main))] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_-5px_rgba(234,179,8,0.4)] relative z-10"
          >
            Definir Missão
          </button>
        </motion.div>
      )}

      {/* FILTROS DE PERÍODO E DADOS DETECTADOS */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {records.length > 0 && activeRecords.length === 0 && missaoAtiva !== 'Escolha a sua missão' && !showGlobalStats && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent)/0.2)] px-4 py-2 rounded-2xl flex items-center gap-4"
            >
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-[hsl(var(--text-bright))] uppercase tracking-tight">Dados em outras missões!</p>
                <p className="text-[8px] text-[hsl(var(--text-muted))] font-bold uppercase">Total: {records.length} registros</p>
              </div>
              <button 
                onClick={() => setShowGlobalStats(true)}
                className="px-3 py-1.5 bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] text-[9px] font-black rounded-lg uppercase hover:scale-105 transition-transform"
              >
                Ativar Visão Global
              </button>
            </motion.div>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[hsl(var(--accent-glow))] rounded-xl">
              <Sparkles size={20} className="text-[hsl(var(--accent))]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[hsl(var(--text-bright))] uppercase tracking-widest">Motor de Análise</h3>
              <p className="text-[10px] text-[hsl(var(--text-muted))] font-medium uppercase tracking-[0.1em]">Visão analítica da sua performance</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsReleaseNotesOpen(true)}
            className="px-4 py-2 flex items-center gap-2 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--border))] border border-[hsl(var(--border))] text-[hsl(var(--text-bright))] rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg"
          >
            <GitCommit size={14} className="text-[hsl(var(--accent))]" />
            v{APP_VERSION}
          </button>
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
              summaryStatsByMateria.map((data, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-[hsl(var(--bg-user-block)/0.3)] border border-transparent hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-user-block)/0.5)] transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-1 h-8 rounded-full opacity-40 group-hover:opacity-100 ${data.tipo === 'Revisão' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-[hsl(var(--accent))]'}`} />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[hsl(var(--text-bright))] tracking-tight leading-none group-hover:text-[hsl(var(--accent))] transition-colors">
                        {data.materia}
                      </span>
                      <span className={`text-[7px] font-black uppercase tracking-[0.2em] mt-1.5 w-fit px-2 py-0.5 rounded-sm ${data.tipo === 'Revisão' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.1)]'}`}>
                        {data.tipo}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-[hsl(var(--text-bright))]">{formatTime(data.time)}</div>
                    <div className="text-[9px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-widest mt-1">{data.questions} Questões</div>
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
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <button onClick={() => setAnalysisTab('time')} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisTab === 'time' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))]' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}>Distribuição de Tempo</button>
            <button onClick={() => setAnalysisTab('precision')} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisTab === 'precision' ? 'bg-green-500 text-white' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}>Assertividade</button>
            <button onClick={() => setAnalysisTab('comparative')} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisTab === 'comparative' ? 'bg-[#facc15] text-[hsl(var(--bg-main))]' : 'text-[hsl(var(--text-muted))] hover:text-white'}`}>Comparativo</button>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            {analysisTab === 'comparative' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparativeData} layout="vertical" margin={{ left: 10, right: 60, top: 10, bottom: 10 }} barGap={2}>
                  <XAxis type="number" xAxisId="time" hide />
                  <XAxis type="number" domain={[0, 100]} xAxisId="precision" hide />
                  <YAxis dataKey="materia" type="category" stroke="hsl(var(--text-muted))" fontSize={9} width={250} tick={CustomYAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
                    contentStyle={{ backgroundColor: 'hsl(var(--bg-sidebar)/0.9)', backdropFilter: 'blur(10px)', border: '1px solid hsl(var(--border))', borderRadius: '15px' }} 
                    itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px' }}
                    labelStyle={{ color: 'hsl(var(--text-muted))', fontSize: '10px', textTransform: 'uppercase' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Tempo') return [`${Math.floor(value / 60)}h ${value % 60}m`, 'TEMPO'];
                      return [`${value.toFixed(1)}%`, 'ASSERTIVIDADE'];
                    }}
                  />
                  <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Bar dataKey="tempo" xAxisId="time" name="Tempo" fill="hsl(var(--accent))" radius={[0, 10, 10, 0]} barSize={8}>
                     <LabelList dataKey="tempo" position="right" fill="hsl(var(--text-muted))" fontSize={8} fontWeight="bold" formatter={(v: number) => `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}m`} />
                  </Bar>
                  <Bar dataKey="precision" xAxisId="precision" name="Assertividade" radius={[0, 10, 10, 0]} barSize={8}>
                     <LabelList dataKey="precision" position="right" fill="hsl(var(--text-muted))" fontSize={8} fontWeight="bold" formatter={(v: number) => `${v.toFixed(0)}%`} />
                     {comparativeData.map((e, i) => (
                       <Cell key={`c-${i}`} fill={e.precision >= 80 ? '#4ade80' : e.precision >= 60 ? '#facc15' : '#ef4444'} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : analysisTab === 'time' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeData} layout="vertical" margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="materia" type="category" stroke="hsl(var(--text-muted))" fontSize={9} width={250} tick={CustomYAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
                    contentStyle={{ backgroundColor: 'hsl(var(--bg-sidebar)/0.9)', backdropFilter: 'blur(10px)', border: '1px solid hsl(var(--border))', borderRadius: '15px' }} 
                    itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px' }} 
                    formatter={(v: number) => [`${Math.floor(v / 60)}h ${v % 60}m`, 'TEMPO']}
                  />
                  <Bar dataKey="tempo" radius={[0, 10, 10, 0]} barSize={12}>
                    <LabelList dataKey="tempo" position="right" fill="hsl(var(--text-muted))" fontSize={9} fontWeight="bold" formatter={(v: number) => `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}m`} />
                    {timeData.map((e, i) => <Cell key={`c-${i}`} fill="hsl(var(--accent))" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={precisionData} layout="vertical" margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="materia" type="category" stroke="hsl(var(--text-muted))" fontSize={9} width={250} tick={CustomYAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
                    contentStyle={{ backgroundColor: 'hsl(var(--bg-sidebar)/0.9)', backdropFilter: 'blur(10px)', border: '1px solid hsl(var(--border))', borderRadius: '15px' }} 
                    itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px' }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, 'PRECISÃO']}
                  />
                  <Bar dataKey="precision" radius={[0, 10, 10, 0]} barSize={12}>
                    <LabelList dataKey="precision" position="right" fill="hsl(var(--text-muted))" fontSize={9} fontWeight="bold" formatter={(v: number) => `${v.toFixed(0)}%`} />
                    {precisionData.map((e, i) => (
                      <Cell key={`c-${i}`} fill={e.precision >= 80 ? '#4ade80' : e.precision >= 60 ? '#facc15' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </motion.div>

      <ReleaseNotesModal isOpen={isReleaseNotesOpen} onClose={() => setIsReleaseNotesOpen(false)} />
    </motion.div>
  );
};

export default HomeView;