
import React, { useMemo, useState } from 'react';
import { StudyRecord, EditalMateria } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  CheckCircle2, Circle, ChevronDown, ChevronUp, CalendarDays, 
  TrendingUp, AlertTriangle, Target, Info
} from 'lucide-react';

interface EditalProgressProps {
  records: StudyRecord[];
  missaoAtiva: string;
  editais: EditalMateria[];
}

const EditalProgress: React.FC<EditalProgressProps> = ({ records, missaoAtiva, editais }) => {
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // 1. Processamento de Dados do Edital
  const activeEditais = useMemo(() => {
    return editais.filter(e => e.concurso === missaoAtiva);
  }, [editais, missaoAtiva]);

  // Data da prova
  const dataProva = useMemo(() => {
    return activeEditais[0]?.data_prova;
  }, [activeEditais]);

  // 2. Análise de Cobertura (O que foi estudado vs O que existe)
  const coverageAnalysis = useMemo(() => {
    // Fix: Explicitly type the analysis object
    const analysis: Record<string, { total: number, studied: number, topics: { name: string, done: boolean }[] }> = {};
    let totalTopicsGlobal = 0;
    let studiedTopicsGlobal = 0;
    
    // Set de tópicos estudados (normalizados para minúsculo para comparação flexível)
    // Filtramos apenas registros desta missão
    // Fix: Ensure Set generic is string
    const studiedSet = new Set<string>(
        records
        .filter(r => r.concurso === missaoAtiva && r.dificuldade !== 'Simulado' && r.materia !== 'SIMULADO')
        .map(r => r.assunto.toLowerCase().trim())
    );

    activeEditais.forEach(ed => {
        const materiaTopics = ed.topicos || [];
        
        const topicsStatus = materiaTopics.map(topic => {
            const topicNorm = topic.toLowerCase().trim();
            // Verifica se este tópico específico foi estudado
            // Critério: String exata ou contida
            const isDone = Array.from(studiedSet).some(studiedItem => 
                studiedItem.includes(topicNorm) || topicNorm.includes(studiedItem)
            );
            
            return { name: topic, done: isDone };
        });

        const studiedCount = topicsStatus.filter(t => t.done).length;

        analysis[ed.materia] = {
            total: materiaTopics.length,
            studied: studiedCount,
            topics: topicsStatus
        };

        totalTopicsGlobal += materiaTopics.length;
        studiedTopicsGlobal += studiedCount;
    });

    return { 
        bySubject: analysis, 
        global: { total: totalTopicsGlobal, studied: studiedTopicsGlobal },
        percent: totalTopicsGlobal > 0 ? (studiedTopicsGlobal / totalTopicsGlobal) * 100 : 0
    };
  }, [activeEditais, records, missaoAtiva]);

  // 3. Algoritmo de Previsão (Forecasting) - AJUSTADO PARA MOSTRAR MESMO COM POUCOS DADOS
  const forecast = useMemo(() => {
    // A. Encontrar data de início (primeiro registro desta missão)
    const missionRecords = records
        .filter(r => r.concurso === missaoAtiva)
        .sort((a, b) => new Date(a.data_estudo).getTime() - new Date(a.data_estudo).getTime());

    if (missionRecords.length === 0) return null; // Só retorna null se não houver NENHUM registro

    const startDate = new Date(missionRecords[0].data_estudo);
    const today = new Date();
    // Garante pelo menos 1 dia para evitar divisão por zero
    const daysPassed = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));

    // B. Velocidade (Tópicos Novos / Dia)
    const uniqueTopicsStudied = coverageAnalysis.global.studied;
    const velocity = uniqueTopicsStudied / daysPassed; // tópicos por dia

    // C. Projeção
    const remainingTopics = coverageAnalysis.global.total - uniqueTopicsStudied;
    // Se velocidade for muito baixa (ex: 0), assume 9999 dias
    const daysToFinish = velocity > 0.01 ? Math.ceil(remainingTopics / velocity) : 999;
    
    const projectedDate = new Date();
    projectedDate.setDate(today.getDate() + daysToFinish);

    // D. Burn-up Chart Data
    const chartData = [];
    const uniqueAccumulator = new Set<string>();
    
    // Agrupa registros por data
    const recordsByDate: Record<string, StudyRecord[]> = {};
    missionRecords.forEach(r => {
        if(!recordsByDate[r.data_estudo]) recordsByDate[r.data_estudo] = [];
        recordsByDate[r.data_estudo].push(r);
    });

    // Itera dia a dia desde o início até hoje
    const iterDate = new Date(startDate);
    while (iterDate <= today) {
        const dStr = iterDate.toISOString().split('T')[0];
        const dayRecords = recordsByDate[dStr] || [];
        
        // Verifica quais tópicos do edital foram batidos neste dia
        dayRecords.forEach(r => {
            const rAssunto = r.assunto.toLowerCase();
            activeEditais.forEach(ed => {
                ed.topicos.forEach(t => {
                    const tNorm = t.toLowerCase();
                    if (rAssunto.includes(tNorm) || tNorm.includes(rAssunto)) {
                        uniqueAccumulator.add(tNorm);
                    }
                });
            });
        });

        chartData.push({
            date: dStr,
            topics: uniqueAccumulator.size,
            total: coverageAnalysis.global.total
        });

        iterDate.setDate(iterDate.getDate() + 1);
    }

    // Adiciona projeção futura simples
    if (remainingTopics > 0 && velocity > 0.01 && daysToFinish < 1000) {
        chartData.push({
            date: projectedDate.toISOString().split('T')[0],
            topics: coverageAnalysis.global.total,
            total: coverageAnalysis.global.total,
            projected: true
        });
    }

    return { velocity, daysToFinish, projectedDate, chartData, remainingTopics, daysPassed };
  }, [coverageAnalysis, records, missaoAtiva, activeEditais]);


  const toggleSubject = (materia: string) => {
    setExpandedSubjects(prev => ({ ...prev, [materia]: !prev[materia] }));
  };

  // Comparativo com Data da Prova
  const statusPrazo = useMemo(() => {
      if (!dataProva || !forecast) return null;
      const examDate = new Date(dataProva);
      const diffDays = Math.ceil((examDate.getTime() - forecast.projectedDate.getTime()) / (1000 * 3600 * 24));
      
      return {
          isOnTrack: diffDays >= 0,
          diff: Math.abs(diffDays),
          examDate
      };
  }, [dataProva, forecast]);

  if (activeEditais.length === 0) {
      return (
          <div className="text-center py-20 flex flex-col items-center">
              <div className="text-6xl mb-4 opacity-50">🗺️</div>
              <h3 className="text-xl font-bold text-white mb-2">Edital não configurado</h3>
              <p className="text-slate-400 max-w-md">
                 Você precisa cadastrar as matérias e seus tópicos na tela de <strong>Configurar</strong> para que o sistema possa calcular seu progresso.
              </p>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* 1. HERO CARD: Previsão de Término */}
      <div className="glass rounded-3xl p-8 border-l-4 border-cyan-500 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none">🔭</div>
         
         <div className="relative z-10">
             <div className="flex items-center gap-3 mb-6">
                 <CalendarDays className="text-cyan-400" size={28} />
                 <h2 className="text-2xl font-bold text-white">Previsão de Conclusão</h2>
             </div>

             {!forecast ? (
                 <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                    <Info className="text-cyan-400 shrink-0 mt-1" size={20} />
                    <div>
                        <p className="font-bold text-white mb-1">Dados insuficientes</p>
                        <p className="text-slate-400 text-sm">
                            Registre sua primeira sessão de estudo na aba <strong>Registrar</strong> para ativar o algoritmo de previsão.
                        </p>
                    </div>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     <div>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Data Estimada</p>
                         <div className="text-4xl font-extrabold text-white">
                             {forecast.daysToFinish > 1000 ? '--/--/----' : forecast.projectedDate.toLocaleDateString('pt-BR')}
                         </div>
                         <p className="text-sm text-cyan-400 font-bold mt-2">
                             {forecast.daysToFinish > 1000 ? 'Ritmo insuficiente' : `Daqui a ${forecast.daysToFinish} dias`}
                         </p>
                     </div>

                     <div>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Ritmo Atual</p>
                         <div className="text-3xl font-bold text-slate-200">
                             {forecast.velocity.toFixed(2)} <span className="text-sm text-slate-500">tópicos/dia</span>
                         </div>
                         <p className="text-xs text-slate-400 mt-2">
                             Faltam {forecast.remainingTopics} de {coverageAnalysis.global.total} tópicos
                         </p>
                     </div>

                     {statusPrazo && (
                         <div className={`p-4 rounded-xl border ${statusPrazo.isOnTrack ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                             <div className="flex items-center gap-2 mb-1">
                                 {statusPrazo.isOnTrack ? <CheckCircle2 className="text-green-400"/> : <AlertTriangle className="text-red-400"/>}
                                 <span className={`text-sm font-bold uppercase ${statusPrazo.isOnTrack ? 'text-green-400' : 'text-red-400'}`}>
                                     {statusPrazo.isOnTrack ? 'No Prazo' : 'Risco de Atraso'}
                                 </span>
                             </div>
                             <p className="text-xs text-slate-300 leading-relaxed">
                                 {statusPrazo.isOnTrack 
                                    ? `Você deve terminar ${statusPrazo.diff} dias antes da prova (${statusPrazo.examDate.toLocaleDateString()}). Mantenha o ritmo!`
                                    : `Nesse ritmo, você terminará ${statusPrazo.diff} dias APÓS a prova. Aumente a carga horária!`
                                 }
                             </p>
                         </div>
                     )}
                 </div>
             )}
         </div>
      </div>

      {/* 2. GRÁFICO DE BURN-UP (Evolução) */}
      {forecast && (
          <div className="glass rounded-3xl p-8">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="text-purple-400" /> Curva de Evolução (Burn-up)
              </h3>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecast.chartData}>
                          <defs>
                              <linearGradient id="colorTopics" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickFormatter={(str) => {
                                const d = new Date(str);
                                return `${d.getDate()}/${d.getMonth()+1}`;
                            }}
                          />
                          <YAxis stroke="#64748b" fontSize={10} domain={[0, 'dataMax']} />
                          <Tooltip 
                              contentStyle={{ backgroundColor: '#0E1117', border: '1px solid #ffffff10', borderRadius: '12px' }}
                              itemStyle={{ color: '#fff' }}
                              labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                          />
                          <ReferenceLine y={coverageAnalysis.global.total} label="Total Edital" stroke="#ef4444" strokeDasharray="3 3" />
                          <Area 
                            type="monotone" 
                            dataKey="topics" 
                            name="Tópicos Batidos"
                            stroke="#22d3ee" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorTopics)" 
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>
      )}

      {/* 3. DETALHAMENTO POR MATÉRIA (Checklist) */}
      <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Target className="text-slate-400" /> Detalhamento do Conteúdo
          </h3>

          {/* Fix: Object.entries with typed record ensures correct property access */}
          {(Object.entries(coverageAnalysis.bySubject) as [string, { total: number, studied: number, topics: { name: string, done: boolean }[] }][]).map(([materia, stat]) => {
              const percent = stat.total > 0 ? (stat.studied / stat.total) * 100 : 0;
              const isExpanded = expandedSubjects[materia];

              return (
                  <div key={materia} className="glass border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
                      <div 
                        onClick={() => toggleSubject(materia)}
                        className="p-6 cursor-pointer hover:bg-white/[0.02] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                  <h4 className="text-lg font-bold text-white truncate">{materia}</h4>
                                  {isExpanded ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                              </div>
                              <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-1000 ${percent >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-600 to-cyan-400'}`}
                                    style={{ width: `${percent}%` }}
                                  />
                              </div>
                          </div>
                          <div className="text-right whitespace-nowrap">
                              <span className="text-2xl font-bold text-white">{percent.toFixed(0)}%</span>
                              <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">
                                  {stat.studied}/{stat.total} Tópicos
                              </p>
                          </div>
                      </div>

                      {isExpanded && (
                          <div className="bg-slate-900/50 border-t border-white/5 p-6 animate-in slide-in-from-top-2">
                              {stat.topics.length === 0 ? (
                                  <p className="text-sm text-slate-500 italic">Nenhum tópico cadastrado para esta matéria.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {stat.topics.map((topic, idx) => (
                                        <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${topic.done ? 'bg-green-500/5 border-green-500/20' : 'bg-slate-800/30 border-white/5'}`}>
                                            <div className={`mt-0.5 ${topic.done ? 'text-green-400' : 'text-slate-600'}`}>
                                                {topic.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                            </div>
                                            <span className={`text-sm ${topic.done ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                                                {topic.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                              )}
                          </div>
                      )}
                  </div>
              );
          })}
      </div>

    </div>
  );
};

export default EditalProgress;
