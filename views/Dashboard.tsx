
import React, { useMemo, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { StudyRecord } from '../types';
import { CalendarDays, PieChart as PieIcon, TrendingUp, AlertTriangle, Filter, SlidersHorizontal, Trash2, Calendar, BookOpen } from 'lucide-react';

interface DashboardProps {
  records: StudyRecord[];
  missaoAtiva: string;
}

const Dashboard: React.FC<DashboardProps> = ({ records, missaoAtiva }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedMateria, setSelectedMateria] = useState('');

  // Lista de matérias para o filtro
  const availableSubjects = useMemo(() => {
    const subjects = new Set(records.filter(r => r.concurso === missaoAtiva).map(r => r.materia));
    return Array.from(subjects).sort();
  }, [records, missaoAtiva]);

  // Filtra os registros
  const activeRecords = useMemo(() => {
    let filtered = records.filter(r => r.concurso === missaoAtiva);

    if (dateStart) {
      filtered = filtered.filter(r => r.data_estudo >= dateStart);
    }
    if (dateEnd) {
      filtered = filtered.filter(r => r.data_estudo <= dateEnd);
    }
    if (selectedMateria) {
      filtered = filtered.filter(r => r.materia === selectedMateria);
    }

    return filtered.sort((a, b) => a.data_estudo.localeCompare(b.data_estudo));
  }, [records, missaoAtiva, dateStart, dateEnd, selectedMateria]);

  const hasActiveFilters = dateStart || dateEnd || selectedMateria;

  const clearFilters = () => {
    setDateStart('');
    setDateEnd('');
    setSelectedMateria('');
  };

  // 1. DATA: Evolution (Precision over time)
  const evolutionData = useMemo(() => {
    return activeRecords.reduce((acc: any[], r) => {
      const existing = acc.find(i => i.date === r.data_estudo);
      if (existing) {
        existing.correct += r.acertos;
        existing.total += r.total;
        existing.precision = (existing.correct / existing.total) * 100;
      } else {
        acc.push({
          date: r.data_estudo,
          correct: r.acertos,
          total: r.total,
          precision: (r.acertos / r.total) * 100
        });
      }
      return acc;
    }, []);
  }, [activeRecords]);

  // 2. DATA: Errors by Subject (Top 5)
  const errorData = useMemo(() => {
    const errorsBySubject = activeRecords.reduce((acc: Record<string, number>, r) => {
      const errors = r.total - r.acertos;
      acc[r.materia] = (acc[r.materia] || 0) + errors;
      return acc;
    }, {});

    return Object.entries(errorsBySubject)
      .map(([materia, errors]) => ({ materia, errors: errors as number }))
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 5);
  }, [activeRecords]);

  // 3. DATA: Time Distribution (Pie Chart)
  const timeData = useMemo(() => {
    const timeBySubject = activeRecords.reduce((acc: Record<string, number>, r) => {
      acc[r.materia] = (acc[r.materia] || 0) + r.tempo;
      return acc;
    }, {});

    return Object.entries(timeBySubject)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [activeRecords]);

  // 4. DATA: Heatmap (Last 120 days)
  const heatmapData = useMemo(() => {
    const today = new Date();
    // Fix: Explicitly type the days array
    const days: { date: string, minutes: number, intensity: number }[] = [];
    const studyMap = new Map<string, number>();
    
    // Popula o mapa apenas com os registros filtrados
    activeRecords.forEach(r => {
      const current = studyMap.get(r.data_estudo) || 0;
      studyMap.set(r.data_estudo, current + r.tempo);
    });

    for (let i = 119; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const minutes = studyMap.get(dateStr) || 0;
      
      let intensity = 0;
      if (minutes > 0) intensity = 1;
      if (minutes > 60) intensity = 2;
      if (minutes > 120) intensity = 3;
      if (minutes > 240) intensity = 4;

      days.push({ date: dateStr, minutes, intensity });
    }
    return days;
  }, [activeRecords]);

  const COLORS = ['#8B5CF6', '#06B6D4', '#EC4899', '#10B981', '#F59E0B', '#6366f1'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      
      {/* Header com Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
             <h2 className="text-3xl font-bold">Dashboard Analítico</h2>
             <p className="text-slate-400 text-sm">
                {activeRecords.length} sessões analisadas
                {hasActiveFilters && <span className="text-purple-400 ml-1 font-bold">(Filtrado)</span>}
             </p>
         </div>
         <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${showFilters || hasActiveFilters ? 'bg-purple-500/20 border-purple-500/50 text-white' : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'}`}
         >
            {hasActiveFilters ? <Filter size={16} className="text-purple-400"/> : <SlidersHorizontal size={16} />}
            Filtros
         </button>
      </div>

      {/* Painel de Filtros */}
      {showFilters && (
         <div className="glass p-5 rounded-xl border border-white/10 animate-in slide-in-from-top-2 grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-900/40">
             <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                   <Calendar size={12} /> Data Início
                 </label>
                 <input 
                   type="date" 
                   value={dateStart} 
                   onChange={e => setDateStart(e.target.value)} 
                   className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                 />
             </div>
             <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                   <Calendar size={12} /> Data Fim
                 </label>
                 <input 
                   type="date" 
                   value={dateEnd} 
                   onChange={e => setDateEnd(e.target.value)} 
                   className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                 />
             </div>
             <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                   <BookOpen size={12} /> Matéria
                 </label>
                 <select 
                   value={selectedMateria} 
                   onChange={e => setSelectedMateria(e.target.value)} 
                   className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                 >
                     <option value="">Todas as matérias</option>
                     {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
             </div>
             <div>
                <button 
                  onClick={clearFilters} 
                  disabled={!hasActiveFilters}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/5"
                >
                   <Trash2 size={14} /> Limpar Filtros
                </button>
             </div>
         </div>
      )}

      {/* EMPTY STATE */}
      {activeRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center relative">
              <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
              {hasActiveFilters ? <Filter size={48} className="text-slate-500 relative z-10" /> : <TrendingUp size={48} className="text-slate-500 relative z-10" />}
          </div>
          <div className="max-w-md">
              <h2 className="text-2xl font-bold text-white mb-2">
                {hasActiveFilters ? 'Nenhum resultado' : 'Sem dados para analisar'}
              </h2>
              <p className="text-slate-400">
                {hasActiveFilters 
                  ? 'Nenhum registro encontrado para os filtros selecionados. Tente limpar os filtros.' 
                  : <>O Dashboard precisa de dados. Registre seus estudos ou realize simulados na missão <span className="text-cyan-400 font-bold">{missaoAtiva}</span>.</>
                }
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-4 text-purple-400 hover:text-purple-300 font-bold text-sm underline">
                  Limpar todos os filtros
                </button>
              )}
          </div>
        </div>
      ) : (
        <>
          {/* 1. HEATMAP (Frequency) */}
          <div className="glass rounded-2xl p-6 border border-white/5">
            <div className="flex items-center gap-3 mb-6">
                <CalendarDays className="text-cyan-400" size={24} />
                <div>
                  <h3 className="text-xl font-bold">Consistência de Estudos</h3>
                  <p className="text-xs text-slate-400">
                    {hasActiveFilters ? 'Visualização filtrada (Últimos 120 dias)' : 'Visualização de intensidade nos últimos 120 dias'}
                  </p>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
                {heatmapData.map((day) => (
                  <div 
                  key={day.date} 
                  className={`w-3 h-3 md:w-3.5 md:h-3.5 rounded-sm transition-all duration-300 hover:scale-125 hover:z-10 relative group`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2 rounded-lg whitespace-nowrap z-50 border border-white/10 shadow-xl pointer-events-none font-bold">
                      {new Date(day.date).toLocaleDateString('pt-BR')} • {Math.floor(day.minutes/60)}h{day.minutes%60}m
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest justify-end">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-800/50 rounded-sm"></div> 0h</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-900/60 rounded-sm"></div> +15m</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded-sm"></div> +2h</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-cyan-400 rounded-sm"></div> +4h</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 2. EVOLUTION (Line) */}
            <div className="glass rounded-2xl p-6">
              <div className="mb-6 flex items-center gap-3">
                  <TrendingUp className="text-purple-400" size={24} />
                  <div>
                    <h3 className="text-xl font-bold">Evolução de Precisão</h3>
                    <p className="text-xs text-slate-400">Qualidade dos estudos ao longo do tempo</p>
                  </div>
              </div>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#64748b" 
                          fontSize={10} 
                          tickFormatter={(str) => {
                            const d = new Date(str);
                            return `${d.getDate()}/${d.getMonth()+1}`;
                          }}
                          minTickGap={30}
                        />
                        <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#12151D', border: '1px solid #ffffff10', borderRadius: '12px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                          labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '12px' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Precisão']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="precision" 
                          stroke="#8B5CF6" 
                          strokeWidth={3} 
                          dot={false}
                          activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </LineChart>
                  </ResponsiveContainer>
              </div>
            </div>

            {/* 3. TIME DISTRIBUTION (Pie) */}
            <div className="glass rounded-2xl p-6">
              <div className="mb-6 flex items-center gap-3">
                  <PieIcon className="text-green-400" size={24} />
                  <div>
                    <h3 className="text-xl font-bold">Distribuição de Tempo</h3>
                    <p className="text-xs text-slate-400">Onde você está investindo suas horas</p>
                  </div>
              </div>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                          data={timeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {timeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#12151D', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value: number) => [`${Math.floor(value/60)}h${value%60}m`, 'Tempo']}
                        />
                        <Legend 
                          layout="vertical" 
                          verticalAlign="middle" 
                          align="right"
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }}
                        />
                    </PieChart>
                  </ResponsiveContainer>
              </div>
            </div>

            {/* 4. ERRORS (Bar) */}
            <div className="glass rounded-2xl p-6 lg:col-span-2">
              <div className="mb-6 flex items-center gap-3">
                  <AlertTriangle className="text-red-400" size={24} />
                  <div>
                    <h3 className="text-xl font-bold">Volume de Erros por Matéria</h3>
                    <p className="text-xs text-slate-400">Foco necessário para revisão (Top 5)</p>
                  </div>
              </div>
              <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={errorData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                        <YAxis dataKey="materia" type="category" stroke="#fff" fontSize={11} width={100} tick={{fill: '#cbd5e1'}} />
                        <Tooltip 
                          cursor={{ fill: '#ffffff05' }}
                          contentStyle={{ backgroundColor: '#12151D', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#F87171' }}
                          formatter={(value: number) => [value, 'Erros']}
                        />
                        <Bar dataKey="errors" radius={[0, 4, 4, 0]} barSize={20}>
                          {errorData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#EF4444' : '#F59E0B'} />
                          ))}
                        </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;