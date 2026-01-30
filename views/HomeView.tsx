
import React, { useMemo, useState } from 'react';
import { StudyRecord, EditalMateria, ViewType } from '../types';
import CircularProgress from '../components/CircularProgress';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  CalendarDays, PieChart as PieIcon, TrendingUp, AlertTriangle, Filter, 
  SlidersHorizontal, Trash2, Calendar, BookOpen, PlusCircle, RotateCcw, CalendarCheck 
} from 'lucide-react';

interface HomeViewProps {
  records: StudyRecord[];
  missaoAtiva: string;
  editais: EditalMateria[];
  setActiveView: (view: ViewType) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ records, missaoAtiva, editais, setActiveView }) => {
  const [analysisTab, setAnalysisTab] = useState<'time' | 'errors'>('time');

  // --- Cálculos de Dados ---
  const activeRecords = useMemo(() => 
    records.filter(r => r.concurso === missaoAtiva)
           .sort((a, b) => a.data_estudo.localeCompare(b.data_estudo)), 
    [records, missaoAtiva]
  );
  
  // Stats do Dia
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = activeRecords.filter(r => r.data_estudo === todayStr);
  const todayMinutes = todayRecords.reduce((acc, r) => acc + r.tempo, 0);
  const todayQuestions = todayRecords.reduce((acc, r) => acc + r.total, 0);

  // Stats Gerais (KPIs)
  const totalQuestions = activeRecords.reduce((acc, r) => acc + r.total, 0);
  const totalCorrect = activeRecords.reduce((acc, r) => acc + r.acertos, 0);
  const precision = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const totalHours = activeRecords.reduce((acc, r) => acc + r.tempo, 0) / 60;

  // Dias para Prova
  const daysUntilExam = useMemo(() => {
    const activeEdital = editais.find(e => e.concurso === missaoAtiva);
    if (!activeEdital?.data_prova) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const exam = new Date(activeEdital.data_prova); exam.setHours(0,0,0,0);
    const diffTime = exam.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 3600 * 24)));
  }, [editais, missaoAtiva]);

  // Gráfico de Evolução (Linha)
  const evolutionData = useMemo(() => {
    return activeRecords.reduce((acc: any[], r) => {
      const existing = acc.find(i => i.date === r.data_estudo);
      if (existing) {
        existing.correct += r.acertos;
        existing.total += r.total;
        existing.precision = (existing.correct / existing.total) * 100;
      } else {
        acc.push({ date: r.data_estudo, correct: r.acertos, total: r.total, precision: (r.acertos / r.total) * 100 });
      }
      return acc;
    }, []);
  }, [activeRecords]);
  
  // Gráfico de Erros (Barras)
  const errorData = useMemo(() => {
    const errorsBySubject = activeRecords.reduce((acc: Record<string, number>, r) => {
      acc[r.materia] = (acc[r.materia] || 0) + (r.total - r.acertos);
      return acc;
    }, {});
    return Object.entries(errorsBySubject)
      .map(([materia, errors]) => ({ materia, errors }))
      .sort((a, b) => b.errors - a.errors).slice(0, 5);
  }, [activeRecords]);

  // Gráfico de Tempo (Pizza)
  const timeData = useMemo(() => {
    const timeBySubject = activeRecords.reduce((acc: Record<string, number>, r) => {
      acc[r.materia] = (acc[r.materia] || 0) + r.tempo;
      return acc;
    }, {});
    return Object.entries(timeBySubject).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activeRecords]);
  
  const COLORS = ['#8B5CF6', '#06B6D4', '#EC4899', '#10B981', '#F59E0B', '#6366f1'];

  // Heatmap
  const heatmapData = useMemo(() => {
    const days: { date: string, minutes: number, intensity: number }[] = [];
    const studyMap = new Map<string, number>();
    activeRecords.forEach(r => studyMap.set(r.data_estudo, (studyMap.get(r.data_estudo) || 0) + r.tempo));
    for (let i = 119; i >= 0; i--) {
      const d = new Date(); d.setDate(new Date().getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const minutes = studyMap.get(dateStr) || 0;
      let intensity = 0;
      if (minutes > 0) intensity = 1; if (minutes > 60) intensity = 2;
      if (minutes > 120) intensity = 3; if (minutes > 240) intensity = 4;
      days.push({ date: dateStr, minutes, intensity });
    }
    return days;
  }, [activeRecords]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* ROW 1: Welcome & KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass rounded-2xl p-6 border-l-2 border-cyan-500 flex flex-col justify-between">
          <div>
            <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Resumo do Dia</span>
            <h2 className="text-2xl font-bold text-white mt-3">Sua atividade hoje:</h2>
          </div>
          <div className="flex gap-6 text-left mt-4">
            <div>
              <div className="text-3xl font-bold text-white">{Math.floor(todayMinutes / 60)}h{todayMinutes % 60}m</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Tempo</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{todayQuestions}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Questões</div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <CircularProgress percentage={precision} label="Precisão Geral" value={`${precision.toFixed(0)}%`} icon="🎯" colorStart={precision >= 80 ? '#10B981' : '#EF4444'} />
          <CircularProgress percentage={Math.min((totalHours / 200) * 100, 100)} label="Horas Totais" value={`${totalHours.toFixed(0)}h`} icon="⏱️" />
          <CircularProgress percentage={Math.min((totalQuestions / 1000) * 100, 100)} label="Questões Totais" value={totalQuestions.toString()} icon="📚" />
          <CircularProgress percentage={daysUntilExam ? Math.max(0, Math.min(100, (daysUntilExam / 90) * 100)) : 0} label="Dias p/ Prova" value={daysUntilExam !== null ? daysUntilExam.toString() : "--"} icon="📅" />
        </div>
      </div>

      {/* ROW 2: Quick Actions & Evolution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <button onClick={() => setActiveView('REGISTRAR')} className="w-full group bg-slate-800/30 border border-white/5 p-4 rounded-xl transition-all hover:border-purple-500/50 flex items-center gap-3">
            <div className="p-2.5 bg-white/5 rounded-lg group-hover:bg-purple-500 text-purple-400 group-hover:text-white transition-colors"><PlusCircle size={18} /></div>
            <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Registrar Estudo</span>
          </button>
          <button onClick={() => setActiveView('REVISOES')} className="w-full group bg-slate-800/30 border border-white/5 p-4 rounded-xl transition-all hover:border-orange-500/50 flex items-center gap-3">
            <div className="p-2.5 bg-white/5 rounded-lg group-hover:bg-orange-500 text-orange-400 group-hover:text-white transition-colors"><RotateCcw size={18} /></div>
            <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Revisar</span>
          </button>
          <button onClick={() => setActiveView('GUIA_SEMANAL')} className="w-full group bg-slate-800/30 border border-white/5 p-4 rounded-xl transition-all hover:border-green-500/50 flex items-center gap-3">
            <div className="p-2.5 bg-white/5 rounded-lg group-hover:bg-green-500 text-green-400 group-hover:text-white transition-colors"><CalendarCheck size={18} /></div>
            <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Guia Semanal</span>
          </button>
        </div>
        <div className="lg:col-span-3 glass rounded-2xl p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><TrendingUp className="text-purple-400" /> Evolução de Precisão</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={(str) => { const d = new Date(str); return `${d.getDate()}/${d.getMonth()+1}`; }} minTickGap={30} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#12151D', border: '1px solid #ffffff10', borderRadius: '12px' }} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Precisão']} />
                <Line type="monotone" dataKey="precision" stroke="#8B5CF6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* ROW 3: Heatmap & Analysis Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Calendar className="text-cyan-400"/> Consistência de Estudos</h3>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {heatmapData.map((day) => (
              <div key={day.date} className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-sm transition-all duration-300 hover:scale-125 relative group" title={`${new Date(day.date).toLocaleDateString('pt-BR')} • ${Math.floor(day.minutes/60)}h${day.minutes%60}m`}>
                <div className={`w-full h-full rounded-sm ${['bg-slate-800/50', 'bg-purple-900/60', 'bg-purple-700', 'bg-purple-500', 'bg-cyan-400'][day.intensity]}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center border-b border-white/10 mb-4">
            <button onClick={() => setAnalysisTab('time')} className={`px-4 py-2 text-sm font-bold transition-all ${analysisTab === 'time' ? 'text-white border-b-2 border-green-400' : 'text-slate-500 hover:text-white'}`}>Distribuição de Tempo</button>
            <button onClick={() => setAnalysisTab('errors')} className={`px-4 py-2 text-sm font-bold transition-all ${analysisTab === 'errors' ? 'text-white border-b-2 border-red-400' : 'text-slate-500 hover:text-white'}`}>Volume de Erros</button>
          </div>
          <div className="h-[200px] w-full">
            {analysisTab === 'time' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={timeData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {timeData.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#12151D', border: '1px solid #ffffff10' }} formatter={(v: number) => [`${Math.floor(v/60)}h${v%60}m`, 'Tempo']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorData} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                  <YAxis dataKey="materia" type="category" stroke="#fff" fontSize={10} width={100} tick={{fill: '#cbd5e1'}} />
                  <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ backgroundColor: '#12151D', border: '1px solid #ffffff10' }} formatter={(v: number) => [v, 'Erros']} />
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
