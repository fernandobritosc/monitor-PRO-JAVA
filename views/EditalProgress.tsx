
import React, { useMemo, useState } from 'react';
import { StudyRecord, EditalMateria } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  CheckCircle2, Circle, ChevronDown, ChevronUp, CalendarDays, 
  TrendingUp, AlertTriangle, Target, Info, BarChart2
} from 'lucide-react';

interface EditalProgressProps {
  records: StudyRecord[];
  missaoAtiva: string;
  editais: EditalMateria[];
}

// UTILITY: Normaliza strings para comparação mais robusta
const normalizeString = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD") // Decomposes accented characters
    .replace(/[\u0300-\u036f]/g, "") // Removes accent marks
    .replace(/[.,:;()]/g, "") // Removes punctuation
    .replace(/\s-(?=\s)/g, '') // Remove hífens soltos
    .replace(/\s(de|da|do|a|o|e|em|para)\s/g, " ") // Removes common prepositions
    .replace(/\s+/g, " ") // Collapses multiple spaces
    .trim();
};

const EditalProgress: React.FC<EditalProgressProps> = ({ records, missaoAtiva, editais }) => {
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const activeEditais = useMemo(() => {
    return editais.filter(e => e.concurso === missaoAtiva);
  }, [editais, missaoAtiva]);

  const dataProva = useMemo(() => activeEditais[0]?.data_prova, [activeEditais]);

  // ANÁLISE DE COBERTURA E PERFORMANCE (LÓGICA REFEITA)
  const performanceAnalysis = useMemo(() => {
    const analysis: Record<string, { total: number, studied: number, avgAccuracy: number, topics: any[] }> = {};
    let totalTopicsGlobal = 0;
    let studiedTopicsGlobal = 0;
    let totalAccuracySum = 0; // Para média global
    let topicsWithAccuracyCount = 0; // Para média global

    const allMissionRecords = records.filter(r => 
      r.concurso === missaoAtiva && r.dificuldade !== 'Simulado' && r.materia !== 'SIMULADO'
    );

    activeEditais.forEach(ed => {
        const materiaTopics = ed.topicos || [];
        let materiaAccuracySum = 0;
        let materiaTopicsWithAccuracy = 0;

        const topicsStatus = materiaTopics.map(topic => {
            const normalizedTopic = normalizeString(topic);
            
            const matchingRecords = allMissionRecords.filter(r => {
                const normalizedAssunto = normalizeString(r.assunto);
                if (!normalizedTopic || !normalizedAssunto) return false;
                // Tier 1: Match exato
                if (normalizedTopic === normalizedAssunto) return true;
                // Tier 2: Match de inclusão
                if (normalizedTopic.length > 5 && normalizedAssunto.length > 5) {
                    if (normalizedTopic.includes(normalizedAssunto) || normalizedAssunto.includes(normalizedTopic)) return true;
                }
                return false;
            });

            if (matchingRecords.length > 0) {
                const totalAcertos = matchingRecords.reduce((acc, r) => acc + r.acertos, 0);
                const totalQuestoes = matchingRecords.reduce((acc, r) => acc + r.total, 0);
                const totalTime = matchingRecords.reduce((acc, r) => acc + r.tempo, 0);
                const avgAccuracy = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0;
                
                if(totalQuestoes > 0) {
                   materiaAccuracySum += avgAccuracy;
                   materiaTopicsWithAccuracy++;
                }

                return { name: topic, studied: true, avgAccuracy, totalTime, sessionCount: matchingRecords.length };
            } else {
                return { name: topic, studied: false, avgAccuracy: 0, totalTime: 0, sessionCount: 0 };
            }
        });

        const studiedCount = topicsStatus.filter(t => t.studied).length;
        const materiaAvgAccuracy = materiaTopicsWithAccuracy > 0 ? materiaAccuracySum / materiaTopicsWithAccuracy : 0;

        analysis[ed.materia] = {
            total: materiaTopics.length,
            studied: studiedCount,
            avgAccuracy: materiaAvgAccuracy,
            topics: topicsStatus
        };

        totalTopicsGlobal += materiaTopics.length;
        studiedTopicsGlobal += studiedCount;
        totalAccuracySum += materiaAccuracySum;
        topicsWithAccuracyCount += materiaTopicsWithAccuracy;
    });
    
    const globalAvgAccuracy = topicsWithAccuracyCount > 0 ? totalAccuracySum / topicsWithAccuracyCount : 0;

    return { 
        bySubject: analysis, 
        global: { total: totalTopicsGlobal, studied: studiedTopicsGlobal, avgAccuracy: globalAvgAccuracy },
        coveragePercent: totalTopicsGlobal > 0 ? (studiedTopicsGlobal / totalTopicsGlobal) * 100 : 0
    };
  }, [activeEditais, records, missaoAtiva]);

  // Algoritmo de Previsão (Forecasting)
  const forecast = useMemo(() => {
    const missionRecords = records
        .filter(r => r.concurso === missaoAtiva)
        .sort((a, b) => new Date(a.data_estudo).getTime() - new Date(a.data_estudo).getTime());

    if (missionRecords.length === 0) return null;

    const startDate = new Date(missionRecords[0].data_estudo);
    const today = new Date();
    const daysPassed = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));

    const uniqueTopicsStudied = performanceAnalysis.global.studied;
    const velocity = uniqueTopicsStudied / daysPassed;
    
    const remainingTopics = performanceAnalysis.global.total - uniqueTopicsStudied;
    const daysToFinish = velocity > 0.01 ? Math.ceil(remainingTopics / velocity) : 999;
    
    const projectedDate = new Date();
    projectedDate.setDate(today.getDate() + daysToFinish);

    return { velocity, daysToFinish, projectedDate, remainingTopics, daysPassed };
  }, [performanceAnalysis, records, missaoAtiva]);

  const toggleSubject = (materia: string) => {
    setExpandedSubjects(prev => ({ ...prev, [materia]: !prev[materia] }));
  };

  const statusPrazo = useMemo(() => {
      if (!dataProva || !forecast) return null;
      const examDate = new Date(dataProva);
      const diffDays = Math.ceil((examDate.getTime() - forecast.projectedDate.getTime()) / (1000 * 3600 * 24));
      
      return { isOnTrack: diffDays >= 0, diff: Math.abs(diffDays), examDate };
  }, [dataProva, forecast]);

  const getPerformanceColor = (accuracy: number) => {
    if (accuracy >= 80) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', main: 'border-green-500' };
    if (accuracy >= 60) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', main: 'border-yellow-500' };
    return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', main: 'border-red-500' };
  };

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
      
      {/* 1. KPIs GLOBAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="glass p-6 rounded-2xl border-l-4 border-cyan-500">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-2">Cobertura do Edital</h3>
            <div className="text-4xl font-extrabold text-white">{performanceAnalysis.coveragePercent.toFixed(0)}%</div>
            <p className="text-xs text-slate-400 mt-1">{performanceAnalysis.global.studied} de {performanceAnalysis.global.total} tópicos estudados</p>
         </div>
         <div className="glass p-6 rounded-2xl border-l-4 border-purple-500">
            <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-2">Aproveitamento Médio</h3>
            <div className="text-4xl font-extrabold text-white">{performanceAnalysis.global.avgAccuracy.toFixed(0)}%</div>
            <p className="text-xs text-slate-400 mt-1">Média de acertos nos tópicos estudados</p>
         </div>
         <div className="glass p-6 rounded-2xl border-l-4 border-slate-500">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Previsão de Término</h3>
            <div className="text-4xl font-extrabold text-white">{!forecast || forecast.daysToFinish > 1000 ? '--' : forecast.projectedDate.toLocaleDateString('pt-BR')}</div>
            <p className="text-xs text-slate-400 mt-1">{!forecast || forecast.daysToFinish > 1000 ? 'Ritmo insuficiente' : `Em ${forecast.daysToFinish} dias`}</p>
         </div>
      </div>

      {/* 2. DETALHAMENTO POR MATÉRIA (Checklist de Performance) */}
      <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Target className="text-slate-400" /> Detalhamento do Conteúdo
          </h3>

          {(Object.entries(performanceAnalysis.bySubject)).map(([materia, stat]) => {
              const percent = stat.total > 0 ? (stat.studied / stat.total) * 100 : 0;
              const isExpanded = expandedSubjects[materia];
              const perfColor = getPerformanceColor(stat.avgAccuracy);

              return (
                  <div key={materia} className={`glass border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? perfColor.border : 'border-white/5'}`}>
                      <div 
                        onClick={() => toggleSubject(materia)}
                        className="p-5 cursor-pointer hover:bg-white/[0.02] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                  <h4 className="text-lg font-bold text-white truncate">{materia}</h4>
                                  {isExpanded ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex-1">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                                        <span>Cobertura</span>
                                        <span className="text-cyan-400">{percent.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${percent}%` }} />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                                        <span>Aproveitamento</span>
                                        <span className={perfColor.text}>{stat.avgAccuracy.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${perfColor.bg.replace('bg-','').split('/')[0]}`} style={{ width: `${stat.avgAccuracy}%` }} />
                                    </div>
                                </div>
                              </div>
                          </div>
                          <div className="text-right whitespace-nowrap text-xs text-slate-500 uppercase font-bold tracking-widest">
                              {stat.studied}/{stat.total} Tópicos
                          </div>
                      </div>

                      {isExpanded && (
                          <div className="bg-slate-900/50 border-t border-white/5 p-6 animate-in slide-in-from-top-2">
                              {stat.topics.length === 0 ? (
                                  <p className="text-sm text-slate-500 italic">Nenhum tópico cadastrado.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {stat.topics.map((topic: any, idx: number) => {
                                        const topicPerf = getPerformanceColor(topic.avgAccuracy);
                                        return (
                                          <div key={idx} className={`p-3 rounded-xl border transition-colors ${topic.studied ? `${topicPerf.bg} ${topicPerf.border}` : 'bg-slate-800/30 border-white/5'}`}>
                                            <div className="flex items-start gap-3">
                                                {topic.studied ? (
                                                    <div className={`shrink-0 mt-1 text-center w-12`}>
                                                        <div className={`font-bold text-sm ${topicPerf.text}`}>
                                                            {topic.avgAccuracy.toFixed(0)}%
                                                        </div>
                                                        <div className="text-[9px] text-slate-500 font-bold uppercase">{topic.sessionCount}x</div>
                                                    </div>
                                                ) : (
                                                    <div className="shrink-0 mt-0.5 text-slate-600">
                                                        <Circle size={16} />
                                                    </div>
                                                )}
                                                <span className={`text-sm flex-1 ${topic.studied ? 'text-slate-300' : 'text-slate-500'}`}>
                                                    {topic.name}
                                                </span>
                                            </div>
                                          </div>
                                        );
                                    })}
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
