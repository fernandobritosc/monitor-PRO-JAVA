
import React, { useMemo, useState } from 'react';
import { StudyRecord, EditalMateria } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  CheckCircle2, Circle, ChevronDown, ChevronUp, CalendarDays, 
  TrendingUp, AlertTriangle, Target, Info, BarChart2, PieChart
} from 'lucide-react';

interface EditalProgressProps {
  records: StudyRecord[];
  missaoAtiva: string;
  editais: EditalMateria[];
}

interface SubjectStat {
  total: number;
  studied: number;
  avgAccuracy: number;
  topics: { 
      name: string; 
      studied: boolean; 
      partial: boolean; // Nova propriedade: Indica se foi "concluído" por ter filhos estudados
      avgAccuracy: number; 
      totalTime: number; 
      sessionCount: number 
  }[];
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

// UTILITY: Extrai o prefixo numérico (ex: "1.1" de "1.1 Conceitos")
const getTopicPrefix = (topicName: string) => {
    // Tenta pegar o primeiro bloco que parece um número/índice
    const match = topicName.match(/^(\d+(\.\d+)*)/);
    return match ? match[0] : null;
};

const EditalProgress: React.FC<EditalProgressProps> = ({ records, missaoAtiva, editais }) => {
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const activeEditais = useMemo(() => {
    return editais.filter(e => e.concurso === missaoAtiva);
  }, [editais, missaoAtiva]);

  const dataProva = useMemo(() => activeEditais[0]?.data_prova, [activeEditais]);

  // ANÁLISE DE COBERTURA E PERFORMANCE (LÓGICA HIERÁRQUICA)
  const performanceAnalysis = useMemo(() => {
    const analysis: Record<string, SubjectStat> = {};
    let totalTopicsGlobal = 0;
    let studiedTopicsGlobal = 0;
    let totalAccuracySum = 0;
    let topicsWithAccuracyCount = 0;

    const allMissionRecords = records.filter(r => 
      r.concurso === missaoAtiva && r.dificuldade !== 'Simulado' && r.materia !== 'SIMULADO'
    );

    activeEditais.forEach(ed => {
        const materiaTopics = ed.topicos || [];
        let materiaAccuracySum = 0;
        let materiaTopicsWithAccuracy = 0;

        // Passo 1: Calcular status direto (Match Exato/Semântico)
        const initialTopicsStatus = materiaTopics.map(topic => {
            const normalizedTopic = normalizeString(topic);
            
            const matchingRecords = allMissionRecords.filter(r => {
                const normalizedAssunto = normalizeString(r.assunto);
                if (!normalizedTopic || !normalizedAssunto) return false;
                if (normalizedTopic === normalizedAssunto) return true;
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
                
                // Contabiliza para a média da matéria apenas se foi estudado diretamente
                if(totalQuestoes > 0) {
                   materiaAccuracySum += avgAccuracy;
                   materiaTopicsWithAccuracy++;
                }

                return { name: topic, studied: true, partial: false, avgAccuracy, totalTime, sessionCount: matchingRecords.length, prefix: getTopicPrefix(topic) };
            } else {
                return { name: topic, studied: false, partial: false, avgAccuracy: 0, totalTime: 0, sessionCount: 0, prefix: getTopicPrefix(topic) };
            }
        });

        // Passo 2: Propagação Hierárquica de Status (Bottom-Up)
        // Adicionamos índice original para restaurar a ordem depois
        let workingTopics = initialTopicsStatus.map((t, i) => ({ ...t, originalIndex: i }));

        // Ordena por comprimento do prefixo decrescente (filhos antes dos pais)
        // Ex: "1.1.1" (len 5) vem antes de "1.1" (len 3), que vem antes de "1." (len 2)
        workingTopics.sort((a, b) => (b.prefix?.length || 0) - (a.prefix?.length || 0));

        // Itera para atualizar status baseado nos filhos já processados
        for (const topic of workingTopics) {
            if (!topic.prefix) continue;

            // Encontra descendentes diretos ou indiretos
            const descendants = workingTopics.filter(t => 
                t !== topic && 
                t.prefix && 
                (t.name.startsWith(topic.prefix + '.') || t.name.startsWith(topic.prefix + ' '))
            );

            if (descendants.length > 0) {
                // Verifica se TODOS os descendentes estão marcados como estudados (direta ou indiretamente)
                const allStudied = descendants.every(d => d.studied);
                const someStudied = descendants.some(d => d.studied || d.partial);

                // Se o tópico pai não foi estudado diretamente, inferimos o status
                if (!topic.studied) {
                    if (allStudied) {
                        topic.studied = true;
                        topic.partial = false; // Promovido de parcial para concluído
                        
                        // Agrega estatísticas dos filhos para o pai não ficar com nota zerada
                        const kidsWithStats = descendants.filter(d => d.avgAccuracy > 0);
                        if (kidsWithStats.length > 0) {
                            topic.avgAccuracy = kidsWithStats.reduce((acc, k) => acc + k.avgAccuracy, 0) / kidsWithStats.length;
                        }
                    } else if (someStudied) {
                        topic.partial = true;
                    }
                }
            }
        }

        // Restaura ordem original do edital
        const finalTopicsStatus = workingTopics.sort((a, b) => a.originalIndex - b.originalIndex);

        // Contagem final para os cards da matéria
        const studiedCount = finalTopicsStatus.filter(t => t.studied || t.partial).length;
        
        // Recalcula média da matéria considerando inferidos? 
        // Não, a média global da matéria deve refletir estudos reais (Step 1), senão inflaciona.
        const materiaAvgAccuracy = materiaTopicsWithAccuracy > 0 ? materiaAccuracySum / materiaTopicsWithAccuracy : 0;

        analysis[ed.materia] = {
            total: materiaTopics.length,
            studied: studiedCount,
            avgAccuracy: materiaAvgAccuracy,
            topics: finalTopicsStatus
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

  const getPerformanceColor = (accuracy: number, isPartial: boolean) => {
    if (isPartial) return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', main: 'border-orange-500' };
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

          {(Object.entries(performanceAnalysis.bySubject) as [string, SubjectStat][]).map(([materia, stat]) => {
              const percent = stat.total > 0 ? (stat.studied / stat.total) * 100 : 0;
              const isExpanded = expandedSubjects[materia];
              const perfColor = getPerformanceColor(stat.avgAccuracy, false); // No header usa avg pura

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
                                        const topicPerf = getPerformanceColor(topic.avgAccuracy, topic.partial);
                                        return (
                                          <div key={idx} className={`p-3 rounded-xl border transition-colors ${topic.studied || topic.partial ? `${topicPerf.bg} ${topicPerf.border}` : 'bg-slate-800/30 border-white/5'}`}>
                                            <div className="flex items-start gap-3">
                                                {topic.studied ? (
                                                    <div className={`shrink-0 mt-1 text-center w-12`}>
                                                        <div className={`font-bold text-sm ${topicPerf.text}`}>
                                                            {topic.avgAccuracy.toFixed(0)}%
                                                        </div>
                                                        <div className="text-[9px] text-slate-500 font-bold uppercase flex justify-center">
                                                            {topic.sessionCount > 0 ? (
                                                                `${topic.sessionCount}x` 
                                                            ) : (
                                                                <span title="Concluído por Tópicos" className="flex items-center gap-0.5 text-green-400/80">
                                                                    <CheckCircle2 size={10} /> Auto
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : topic.partial ? (
                                                    <div className="shrink-0 mt-1 text-center w-12 flex flex-col items-center" title="Tópico Pai Iniciado (subtópicos estudados)">
                                                        <PieChart size={18} className="text-orange-400 mb-1" />
                                                        <span className="text-[8px] font-bold text-orange-400 uppercase tracking-tighter">PARCIAL</span>
                                                    </div>
                                                ) : (
                                                    <div className="shrink-0 mt-0.5 text-slate-600">
                                                        <Circle size={16} />
                                                    </div>
                                                )}
                                                <span className={`text-sm flex-1 ${topic.studied || topic.partial ? 'text-slate-200' : 'text-slate-500'}`}>
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

      {/* 3. NOTA EXPLICATIVA */}
      <div className="mt-10 glass p-6 rounded-2xl border border-white/5">
        <div className="flex items-start gap-4">
            <Info size={20} className="text-slate-500 shrink-0 mt-1" />
            <div>
                <h4 className="text-sm font-bold text-slate-300">Legenda de Status</h4>
                <ul className="mt-2 space-y-2 text-xs text-slate-400">
                    <li className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-green-400"/>
                        <span><strong className="text-green-400">Concluído:</strong> Tópico estudado diretamente OU todos os seus sub-tópicos (filhos) foram concluídos.</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5 text-green-400/80 font-bold bg-slate-800 px-1 rounded"><CheckCircle2 size={10} /> Auto</span>
                        <span>Indica que a conclusão foi calculada automaticamente (todos os filhos estudados).</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <PieChart size={12} className="text-orange-400"/>
                        <span><strong className="text-orange-400">Parcial:</strong> Você estudou alguns sub-tópicos, mas ainda faltam itens neste grupo.</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Circle size={12} className="text-slate-600"/>
                        <span><strong className="text-slate-500">Pendente:</strong> Nenhum registro encontrado para este item ou seus sub-itens.</span>
                    </li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditalProgress;
