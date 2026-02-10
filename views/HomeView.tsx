import React, { useMemo, useState, useRef } from 'react';
import { StudyRecord, EditalMateria, ViewType } from '../types';
import CircularProgress from '../components/CircularProgress';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  CalendarDays, PieChart as PieIcon, TrendingUp, AlertTriangle, Filter, 
  SlidersHorizontal, Trash2, Calendar, BookOpen, PlusCircle, RotateCcw, CalendarCheck, Clock, CheckCircle2, Eye
} from 'lucide-react';

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* FILTROS DE PERÍODO */}
      <div className="flex flex-wrap justify-end items-center gap-2">
         <span className="text-xs font-bold text-slate-500 uppercase">Período:</span>
         {[ {label: '7 dias', val: 7}, {label: '30 dias', val: 30}, {label: 'Tudo', val: 0} ].map(p => (
            <button key={p.val} onClick={() => setFilterPeriod(p.val)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterPeriod === p.val ? 'bg-purple-500/20 text-white shadow' : 'bg-slate-800/50 text-slate-400 hover:bg-white/5'}`}>
               {p.label}
            </button>
         ))}
      </div>

      {/* ROW 1: KPIs GLOBAIS (PAINEL SUPERIOR) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <CircularProgress percentage={precision} label="Precisão (Período)" value={`${precision.toFixed(0)}%`} icon="🎯" colorStart={precision >= 80 ? '#10B981' : '#EF4444'} />
          <CircularProgress percentage={Math.min((totalHours / 200) * 100, 100)} label="Horas (Período)" value={`${totalHours.toFixed(0)}h`} icon="⏱️" />
          <CircularProgress percentage={Math.min((totalQuestions / 1000) * 100, 100)} label="Questões (Período)" value={totalQuestions.toString()} icon="📚" />
          <CircularProgress percentage={typeof daysUntilExam === 'number' ? Math.max(0, Math.min(100, (daysUntilExam / 90) * 100)) : 0} label="Dias p/ Prova" value={daysUntilExam !== null ? daysUntilExam.toString() : "--"} icon="📅" />
      </div>

      {/* ROW 2: PRINCIPAL (GRÁFICO + RESUMO DO DIA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: GRÁFICO DE EVOLUÇÃO (2/3) */}
        <div className="lg:col-span-2 glass rounded-2xl p-4 md:p-6 flex flex-col h-[350px] md:h-[450px]">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 shrink-0 gap-2">
            <h3 className="text-base md:text-lg font-bold flex items-center gap-2"><TrendingUp className="text-purple-400" /> Evolução de Precisão</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-green-500 rounded-full" />
                    <span>Meta (80%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-yellow-500 rounded-full" />
                    <span>Atenção (60%)</span>
                </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPrecision" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={formatDateLabel} minTickGap={30} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#12151D', border: '1px solid #ffffff10', borderRadius: '12px' }} 
                  labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#c4b5fd', fontWeight: 'bold' }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'Precisão']} 
                  labelFormatter={(label) => formatDateLabel(label)}
                />
                <Area type="monotone" dataKey="precision" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorPrecision)" activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }} />
                <ReferenceLine y={80} stroke="#10B981" strokeDasharray="4 4" strokeWidth={1.5} />
                <ReferenceLine y={60} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* COLUNA DIREITA: RESUMO DO DIA (1/3) */}
        <div className="lg:col-span-1 glass rounded-2xl flex flex-col overflow-hidden border border-white/5 relative group hover:border-cyan-500/30 transition-all h-[400px] md:h-[450px]">
          {/* Header */}
          <div className="p-5 border-b border-white/5 bg-slate-900/30 flex justify-between items-start shrink-0">
             <div>
               <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${isToday ? 'bg-cyan-500/20 text-cyan-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                 {isToday ? 'Resumo Hoje' : 'Resumo Histórico'}
               </span>
               <h2 className="text-xl font-bold text-white mt-2">
                 Atividade {isToday ? 'de Hoje' : formatFullDate(summaryDate).substring(0, 5)}
               </h2>
             </div>
             {/* DATE PICKER INTERATIVO */}
             <div className="relative group/picker">
                <div className="bg-slate-800 p-2 rounded-lg text-slate-500 group-hover/picker:text-white group-hover/picker:bg-cyan-600 cursor-pointer transition-all border border-white/5">
                  <CalendarDays size={20} />
                </div>
                <input 
                  type="date"
                  ref={dateInputRef}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={summaryDate}
                  onChange={(e) => setSummaryDate(e.target.value)}
                  title="Selecionar data para visualizar o resumo"
                />
             </div>
          </div>

          {/* Listagem de Matérias */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-slate-900/10">
             {summaryStatsByMateria.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-70 animate-in zoom-in duration-300">
                   <div className="mb-3 relative">
                      <div className="w-16 h-1 bg-slate-800 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 rotate-45"></div>
                      <div className="w-16 h-1 bg-slate-800 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -rotate-45"></div>
                      <Eye size={48} className="text-slate-600 relative z-10 bg-[#141822] rounded-full p-1" />
                   </div>
                   <p className="text-sm font-bold text-slate-400 mb-1">Não tem estudo neste dia.</p>
                   <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Abre o olho morcego. rs</p>
                   {!isToday && (
                     <button onClick={() => setSummaryDate(getLocalTodayStr())} className="mt-4 text-[10px] font-bold text-cyan-400 hover:underline">
                        Voltar para Hoje
                     </button>
                   )}
                </div>
             ) : (
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {summaryStatsByMateria.map(([materia, stats], index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                         <td className="p-4 py-3 align-top">
                            <div className="flex items-start gap-3">
                               <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5"></div>
                               <span className="text-sm font-medium text-slate-200 leading-snug">{materia}</span>
                            </div>
                         </td>
                         <td className="p-4 py-3 text-right align-top whitespace-nowrap">
                             <div className="text-xs font-bold text-white">{formatTime(stats.time)}</div>
                             <div className="text-[10px] text-slate-500 font-bold mt-0.5">{stats.questions}q</div>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             )}
          </div>

          {/* Totalizadores (Footer) */}
          <div className="p-4 bg-slate-900/50 border-t border-white/5 flex justify-between items-center shrink-0">
             <span className="text-xs font-bold uppercase text-slate-500 tracking-widest">
               {isToday ? 'Total Geral' : formatFullDate(summaryDate)}
             </span>
             <div className="flex items-center gap-4">
                 <div className="text-right">
                    <span className="block text-lg font-black text-white leading-none">{Math.floor(summaryMinutes / 60)}h{summaryMinutes % 60}m</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Tempo</span>
                 </div>
                 <div className="w-px h-6 bg-white/10"></div>
                 <div className="text-right">
                    <span className="block text-lg font-black text-cyan-400 leading-none">{summaryQuestions}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Questões</span>
                 </div>
             </div>
          </div>
        </div>

      </div>
      
      {/* ROW 3: HEATMAP & ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Calendar className="text-cyan-400"/> Consistência de Estudos (120 dias)</h3>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {heatmapData.map((day) => {
              const [y, m, d] = day.date.split('-');
              return (
              <div 
                key={day.date} 
                className={`w-3 h-3 md:w-3.5 md:h-3.5 rounded-sm transition-all duration-300 relative group cursor-pointer ${day.date === summaryDate ? 'ring-2 ring-white z-10' : 'hover:scale-125'}`}
                title={`${d}/${m}/${y} • ${Math.floor(day.minutes/60)}h${day.minutes%60}m`}
                onClick={() => setSummaryDate(day.date)} // Permite clicar no heatmap também!
              >
                <div className={`w-full h-full rounded-sm ${['bg-slate-800/50', 'bg-purple-900/60', 'bg-purple-700', 'bg-purple-500', 'bg-cyan-400'][day.intensity]}`} />
              </div>
            )})}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center border-b border-white/10 mb-4 overflow-x-auto">
            <button onClick={() => setAnalysisTab('time')} className={`px-4 py-2 text-sm font-bold transition-all whitespace-nowrap ${analysisTab === 'time' ? 'text-white border-b-2 border-green-400' : 'text-slate-500 hover:text-white'}`}>Distribuição de Tempo</button>
            <button onClick={() => setAnalysisTab('errors')} className={`px-4 py-2 text-sm font-bold transition-all whitespace-nowrap ${analysisTab === 'errors' ? 'text-white border-b-2 border-red-400' : 'text-slate-500 hover:text-white'}`}>Volume de Erros</button>
          </div>
          <div className="h-[200px] w-full">
            {analysisTab === 'time' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={timeData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {timeData.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#12151D', border: '1px solid #ffffff10', borderRadius: '12px' }} 
                    itemStyle={{ color: '#E2E8F0', fontWeight: 'bold' }}
                    formatter={(v: number) => [`${Math.floor(v/60)}h${v%60}m`, 'Tempo']} 
                  />
                  <Legend 
                     iconSize={10}
                     layout="vertical" 
                     verticalAlign="middle" 
                     align="right" 
                     wrapperStyle={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5em' }}
                     formatter={(value, entry) => <span className="text-slate-300 truncate inline-block max-w-[100px]" title={value}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorData} layout="vertical" margin={{ left: 0, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                  <YAxis dataKey="materia" type="category" stroke="#fff" fontSize={10} width={90} tick={{fill: '#cbd5e1'}} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                    contentStyle={{ backgroundColor: '#12151D', border: '1px solid #ffffff10', borderRadius: '12px' }} 
                    itemStyle={{ color: '#E2E8F0', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94A3B8', fontWeight: 'bold' }}
                    formatter={(v: number) => [v, 'Erros']} 
                  />
                  <Bar dataKey="errors" radius={[0, 4, 4, 0]} barSize={15}>
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