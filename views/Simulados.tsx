
import React, { useMemo, useState } from 'react';
import { StudyRecord, EditalMateria, ViewType } from '../types';
import { supabase } from '../services/supabase';
import { 
  Trophy, TrendingUp, Clock, Target, CalendarDays, Trash2, 
  PlusCircle, BookOpen, ChevronDown, ChevronUp, Edit2, Save, X
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface SimuladosProps {
  records: StudyRecord[];
  missaoAtiva: string;
  editais: EditalMateria[];
  onRecordUpdate: (record: StudyRecord) => void;
  onGroupDelete: (recordIds: string[]) => void;
  setActiveView: (view: ViewType) => void;
}

// Helper para exibição de data local
const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '--/--/----';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
};

const SimuladoSubjectRow: React.FC<{ 
  record: StudyRecord, 
  onUpdate: (record: StudyRecord) => void;
  peso: number;
}> = ({ 
  record, 
  onUpdate,
  peso
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localAcertos, setLocalAcertos] = useState(record.acertos);
  const [localTotal, setLocalTotal] = useState(record.total);

  const handleSave = () => {
    if (localTotal > 0 && localAcertos <= localTotal) {
      const updatedRecord = {
        ...record,
        acertos: localAcertos, 
        total: localTotal,
        taxa: (localAcertos / localTotal) * 100
      };
      onUpdate(updatedRecord);
      setIsEditing(false);
    } else {
      alert("Erro: O número de acertos não pode ser maior que o total.");
    }
  };

  const isInvalid = localTotal > 0 && localAcertos > localTotal;

  return (
    <div className="bg-slate-900/30 rounded-lg p-2 border border-white/5 hover:bg-white/5 transition-colors">
        {isEditing ? (
             <div className="space-y-3">
                 <div className="flex items-center justify-between">
                     <span className="text-sm font-bold text-slate-300 truncate">{record.materia}</span>
                     <div className="flex gap-1">
                        <button onClick={handleSave} className="p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/40"><Save size={14}/></button>
                        <button onClick={() => setIsEditing(false)} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40"><X size={14}/></button>
                     </div>
                 </div>
                 <div className="flex items-center gap-2">
                     <div className="flex-1">
                         <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1 text-center">Acertos</label>
                         <input 
                           type="number" 
                           className={`w-full bg-slate-950/30 border ${isInvalid ? 'border-red-500 text-red-400' : 'border-white/10 text-green-400'} rounded px-2 py-1.5 text-center font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                           value={localAcertos} 
                           onChange={e => setLocalAcertos(Number(e.target.value))}
                         />
                     </div>
                     <div className="flex-1">
                         <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1 text-center">Total</label>
                         <input 
                           type="number" 
                           className="w-full bg-slate-950/30 border border-white/10 rounded px-2 py-1.5 text-center font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                           value={localTotal} 
                           onChange={e => setLocalTotal(Number(e.target.value))}
                         />
                     </div>
                 </div>
             </div>
        ) : (
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <BookOpen size={14} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-300 truncate">
                            {record.materia} <span className="text-[9px] text-slate-500 font-bold bg-slate-800 px-1 rounded ml-1">x{peso}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs font-bold text-white">{record.acertos}/{record.total}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${record.taxa >= 80 ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                {record.taxa.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>
                <button onClick={() => setIsEditing(true)} className="p-2 text-slate-600 hover:text-cyan-400 transition-colors">
                    <Edit2 size={14} />
                </button>
            </div>
        )}
    </div>
  );
};


const Simulados: React.FC<SimuladosProps> = ({ records, missaoAtiva, editais, onRecordUpdate, onGroupDelete, setActiveView }) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // 1. Filtrar registros do tipo Simulado
  const activeSimuladoRecords = useMemo(() => {
    return records
      .filter(r => r.concurso === missaoAtiva && r.dificuldade === 'Simulado')
      .sort((a, b) => new Date(b.data_estudo).getTime() - new Date(a.data_estudo).getTime());
  }, [records, missaoAtiva]);

  // 2. Agrupar por (Data + Assunto)
  const groupedSimulados = useMemo(() => {
    const groups: Record<string, StudyRecord[]> = {};
    const editaisMap = new Map<string, EditalMateria>(editais.filter(e => e.concurso === missaoAtiva).map(e => [e.materia, e]));
    
    activeSimuladoRecords.forEach(r => {
        // Chave única composta
        const key = `${r.data_estudo}::${r.assunto}`; 
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    });

    // Converter para array e calcular stats agregados
    return Object.entries(groups).map(([key, groupRecords]) => {
        const [date, assunto] = key.split('::');
        
        const totalAcertos = groupRecords.reduce((acc, r) => acc + r.acertos, 0);
        const totalQuestoes = groupRecords.reduce((acc, r) => acc + r.total, 0);
        const totalTempo = groupRecords.reduce((acc, r) => acc + r.tempo, 0);
        const taxaGlobal = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0;
        
        // Cálculo Ponderado
        let weightedScore = 0;
        let weightedMax = 0;

        groupRecords.forEach(r => {
            const editalItem = editaisMap.get(r.materia);
            const peso = editalItem?.peso || 1;
            weightedScore += (r.acertos * peso);
            weightedMax += (r.total * peso);
        });

        // Se for um registro único "Geral", usamos os comentários dele, senão concatena ou pega do primeiro
        const comentarios = groupRecords[0]?.comentarios; 

        return {
            id: key, // ID virtual do grupo
            date,
            assunto,
            records: groupRecords, // Lista detalhada
            acertos: totalAcertos,
            total: totalQuestoes,
            taxa: taxaGlobal,
            tempo: totalTempo,
            comentarios,
            weightedScore,
            weightedMax
        };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [activeSimuladoRecords, editais, missaoAtiva]);

  // Stats Gerais (Média, Melhor, etc)
  const stats = useMemo(() => {
    if (groupedSimulados.length === 0) return { avg: 0, best: 0, total: 0, totalTime: 0 };
    
    const total = groupedSimulados.length;
    const avg = groupedSimulados.reduce((acc, g) => acc + g.taxa, 0) / total;
    const best = Math.max(...groupedSimulados.map(g => g.taxa));
    const totalTime = groupedSimulados.reduce((acc, g) => acc + g.tempo, 0);

    return { avg, best, total, totalTime };
  }, [groupedSimulados]);

  // Chart Data
  const chartData = useMemo(() => {
    return [...groupedSimulados]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(g => ({
        date: formatDateDisplay(g.date).substring(0, 5), // DD/MM
        taxa: g.taxa,
        assunto: g.assunto
      }));
  }, [groupedSimulados]);

  // Actions
  const toggleExpand = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const deleteGroup = async (group: typeof groupedSimulados[0]) => {
     if (!confirm(`Excluir o simulado "${group.assunto}" e todos os seus registros detalhados?`)) return;
     
     const idsToDelete = group.records.map(r => r.id);
     onGroupDelete(idsToDelete);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-20">
       
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
               Arena de Simulados
            </h3>
            <p className="text-slate-400 text-sm mt-1">
               Histórico de provas completas e performance global na missão <span className="text-white font-bold">{missaoAtiva}</span>.
            </p>
          </div>
          <button 
            onClick={() => setActiveView('REGISTRAR_SIMULADO')}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 px-6 py-3 rounded-xl font-bold text-white shadow-lg shadow-purple-500/20 hover:-translate-y-1 transition-all"
          >
            <PlusCircle size={20} />
            Novo Simulado
          </button>
       </div>

       {groupedSimulados.length === 0 ? (
         <div className="glass rounded-2xl p-12 md:p-20 text-center space-y-6 border border-white/5">
            <div className="w-32 h-32 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto text-6xl shadow-[0_0_50px_rgba(234,179,8,0.2)] animate-pulse">
               🏆
            </div>
            <div className="max-w-md mx-auto">
              <h4 className="text-2xl font-bold mb-3 text-white">Sua primeira prova te espera</h4>
              <p className="text-slate-400 leading-relaxed">
                 Simulados são essenciais para testar sua resistência e gestão de tempo. 
                 Registre seu primeiro resultado para desbloquear as métricas de evolução.
              </p>
            </div>
         </div>
       ) : (
         <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="glass p-4 rounded-xl border-b-4 border-yellow-500">
                  <div className="flex items-center gap-2 text-yellow-500 mb-2 text-xs font-bold uppercase tracking-widest">
                     <Trophy size={14} /> Melhor Nota
                  </div>
                  <div className="text-3xl font-black text-white">{stats.best.toFixed(1)}%</div>
               </div>
               
               <div className="glass p-4 rounded-xl border-b-4 border-cyan-500">
                  <div className="flex items-center gap-2 text-cyan-400 mb-2 text-xs font-bold uppercase tracking-widest">
                     <TrendingUp size={14} /> Média Geral
                  </div>
                  <div className="text-3xl font-black text-white">{stats.avg.toFixed(1)}%</div>
               </div>

               <div className="glass p-4 rounded-xl border-b-4 border-purple-500">
                  <div className="flex items-center gap-2 text-purple-400 mb-2 text-xs font-bold uppercase tracking-widest">
                     <Target size={14} /> Realizados
                  </div>
                  <div className="text-3xl font-black text-white">{stats.total}</div>
               </div>

               <div className="glass p-4 rounded-xl border-b-4 border-green-500">
                  <div className="flex items-center gap-2 text-green-400 mb-2 text-xs font-bold uppercase tracking-widest">
                     <Clock size={14} /> Tempo Total
                  </div>
                  <div className="text-3xl font-black text-white">
                     {Math.floor(stats.totalTime / 60)}h
                  </div>
               </div>
            </div>

            {/* Chart */}
            <div className="glass rounded-2xl p-6">
               <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="text-slate-400" size={20} />
                  Curva de Evolução
               </h4>
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                        <defs>
                           <linearGradient id="colorTaxa" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickMargin={10} />
                        <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#12151D', border: '1px solid #ffffff10', borderRadius: '12px' }}
                           itemStyle={{ color: '#fff' }}
                           formatter={(value: number) => [`${value.toFixed(1)}%`, 'Nota']}
                        />
                        <Area type="monotone" dataKey="taxa" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorTaxa)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* List */}
            <div className="space-y-4">
               <h4 className="text-lg font-bold flex items-center gap-2">
                  <CalendarDays className="text-slate-400" size={20} />
                  Histórico Detalhado
               </h4>
               
               <div className="grid grid-cols-1 gap-4">
                  {groupedSimulados.map(group => {
                    const isExpanded = expandedGroups[group.id];
                    const colorClass = group.taxa >= 80 ? 'border-green-500' : group.taxa >= 60 ? 'border-yellow-500' : 'border-red-500';
                    
                    return (
                        <div key={group.id} className={`glass rounded-xl overflow-hidden border-l-2 ${colorClass}`}>
                            {/* Card Header (Click to Expand) */}
                            <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-white/[0.02] transition-all cursor-pointer" onClick={() => toggleExpand(group.id)}>
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">
                                            {formatDateDisplay(group.date)}
                                        </div>
                                        <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                                            Simulado
                                        </div>
                                    </div>
                                    <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                        {group.assunto}
                                        {isExpanded ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                                    </h4>
                                    <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} className="text-slate-500" /> 
                                            {Math.floor(group.tempo/60)}h{group.tempo%60}m
                                        </span>
                                        {group.comentarios && (
                                            <span className="max-w-[200px] truncate md:max-w-md" title={group.comentarios}>
                                                "{group.comentarios}"
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                                    {group.weightedMax > 0 && group.weightedMax !== group.total ? (
                                        <div className="text-center">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Pontos (Peso)</div>
                                            <div className="text-xl font-bold text-cyan-400">{group.weightedScore.toFixed(1)}<span className="text-slate-600 text-sm">/{group.weightedMax}</span></div>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Acertos</div>
                                            <div className="text-xl font-bold text-slate-300">{group.acertos}<span className="text-slate-600 text-sm">/{group.total}</span></div>
                                        </div>
                                    )}
                                    
                                    <div className="text-center min-w-[80px]">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Nota</div>
                                        <div className={`text-3xl font-black ${group.taxa >= 80 ? 'text-green-400' : group.taxa >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {group.taxa.toFixed(1)}%
                                        </div>
                                    </div>

                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteGroup(group); }}
                                        className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                        title="Excluir Simulado Completo"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="bg-slate-900/30 border-t border-white/5 p-4 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Detalhamento por Matéria</h5>
                                        <div className="text-xs text-slate-500 uppercase font-bold bg-slate-800 px-3 py-1 rounded">
                                           {group.acertos}/{group.total} Total
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {group.records.map(record => {
                                            const editalItem = editais.find(e => e.concurso === missaoAtiva && e.materia === record.materia);
                                            const peso = editalItem?.peso || 1;
                                            return (
                                                <SimuladoSubjectRow key={record.id} record={record} onUpdate={onRecordUpdate} peso={peso} />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                  })}
               </div>
            </div>
         </>
       )}
    </div>
  );
};

export default Simulados;
