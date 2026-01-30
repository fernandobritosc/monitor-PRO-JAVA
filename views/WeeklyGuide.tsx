
import React, { useState, useEffect } from 'react';
import { StudyRecord } from '../types';
import { AlertTriangle, CheckSquare, Target, Clock, BookOpen, Settings, Zap } from 'lucide-react';

interface WeeklyGuideProps {
  records: StudyRecord[];
  missaoAtiva: string;
}

// Helper para pegar o número da semana atual
const getWeekNumber = (d: Date) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
};

const WeeklyGuide: React.FC<WeeklyGuideProps> = ({ records, missaoAtiva }) => {
  const activeRecords = records.filter(r => r.concurso === missaoAtiva);
  
  // 1. Configuração de Metas (Persistente)
  const [configOpen, setConfigOpen] = useState(false);
  const [metaHoras, setMetaHoras] = useState(22);
  const [metaQuestoes, setMetaQuestoes] = useState(350);

  useEffect(() => {
    const savedMetas = localStorage.getItem(`metas_semanais_${missaoAtiva}`);
    if (savedMetas) {
      const parsed = JSON.parse(savedMetas);
      setMetaHoras(parsed.horas || 22);
      setMetaQuestoes(parsed.questoes || 350);
    }
  }, [missaoAtiva]);

  const saveMetas = () => {
    localStorage.setItem(`metas_semanais_${missaoAtiva}`, JSON.stringify({ horas: metaHoras, questoes: metaQuestoes }));
    setConfigOpen(false);
  };

  // 2. Checklist Inteligente (Reset Semanal)
  const currentWeekKey = getWeekNumber(new Date());
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Tenta carregar checks da semana ATUAL
    const savedChecks = localStorage.getItem(`weekly_checks_${missaoAtiva}_${currentWeekKey}`);
    if (savedChecks) {
      try {
        setChecks(JSON.parse(savedChecks));
      } catch (e) {
        console.error("Erro ao carregar checklist", e);
      }
    } else {
      // Se não tem dados para essa semana (semana virou), começa limpo
      setChecks({});
    }
  }, [missaoAtiva, currentWeekKey]);

  useEffect(() => {
    if (Object.keys(checks).length > 0) {
      localStorage.setItem(`weekly_checks_${missaoAtiva}_${currentWeekKey}`, JSON.stringify(checks));
    }
  }, [checks, missaoAtiva, currentWeekKey]);

  // 3. Cálculos da Semana Atual (Dados Reais)
  const hoje = new Date();
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay() + (hoje.getDay() === 0 ? -6 : 1)); // Segunda-feira
  inicioSemana.setHours(0,0,0,0);

  const registrosSemana = activeRecords.filter(r => {
    const d = new Date(r.data_estudo);
    return d >= inicioSemana;
  });

  const horasSemana = registrosSemana.reduce((acc, r) => acc + r.tempo, 0) / 60;
  const questoesSemana = registrosSemana.reduce((acc, r) => acc + r.total, 0);
  
  // Verificações automáticas para o checklist
  const simuladoRealizado = registrosSemana.some(r => r.dificuldade === 'Simulado' || r.materia === 'SIMULADO');
  const metaDiariaBatidaHoje = (() => {
    const hojeStr = new Date().toISOString().split('T')[0];
    const totalHoje = activeRecords.filter(r => r.data_estudo === hojeStr).reduce((acc, r) => acc + r.total, 0);
    const metaDiaria = Math.round(metaQuestoes / 6); // Meta semanal / 6 dias de estudo
    return totalHoje >= metaDiaria;
  })();
  const topicosNovos = new Set(registrosSemana.map(r => r.assunto)).size;

  // 4. Identificar Gargalos Críticos (Priority Engine)
  // Fix: Explicitly type the accumulator to fix unknown property errors
  const statsPorMateria = activeRecords.reduce((acc, r) => {
    if (!acc[r.materia]) {
      acc[r.materia] = { acertos: 0, total: 0, relevanciaSoma: 0, count: 0 };
    }
    acc[r.materia].acertos += r.acertos;
    acc[r.materia].total += r.total;
    acc[r.materia].relevanciaSoma += r.relevancia || 5;
    acc[r.materia].count += 1;
    return acc;
  }, {} as Record<string, { acertos: number, total: number, relevanciaSoma: number, count: number }>);

  // Fix: Object.entries with typed record ensures correct property access
  const criticos = (Object.entries(statsPorMateria) as [string, { acertos: number, total: number, relevanciaSoma: number, count: number }][])
    .map(([materia, stat]) => ({
      materia,
      taxa: stat.total > 0 ? (stat.acertos / stat.total) * 100 : 0,
      relevanciaMedia: stat.relevanciaSoma / stat.count
    }))
    .filter(m => m.taxa < 75 && m.relevanciaMedia >= 5)
    .sort((a, b) => b.relevanciaMedia - a.relevanciaMedia)
    .slice(0, 3);

  // Gerar Sugestão Pedagógica Dinâmica
  const getSugestao = (taxa: number) => {
    if (taxa < 50) return "🚨 Base fraca. Volte para a Teoria (Vídeo/PDF) + criar resumo.";
    if (taxa < 70) return "⚠️ Lacunas pontuais. Leitura da Lei Seca + 20 questões comentadas.";
    return "⚡ Ajuste fino. Fazer caderno de erros + questões difíceis.";
  };

  // Checklist itens
  const checklistItems = [
    { id: 'simulado', label: 'Realizar 1 Simulado de Elite', auto: simuladoRealizado },
    { id: 'meta_q', label: 'Bater meta diária de questões (hoje)', auto: metaDiariaBatidaHoje },
    { id: 'novos_topicos', label: `Estudar novos tópicos (Atual: ${topicosNovos})`, auto: topicosNovos >= 2 }
  ];

  if (criticos.length > 0) {
    checklistItems.unshift({ id: 'revisao_critica', label: `Revisão de Emergência: ${criticos[0].materia}`, auto: false });
  }

  const toggleCheck = (id: string) => {
    setChecks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const completedChecks = checklistItems.filter(i => checks[i.id] || i.auto).length; // Conta manuais ou automáticos
  const progressCheck = (completedChecks / checklistItems.length) * 100;

  // Projeção
  const diasPassados = hoje.getDay() === 0 ? 7 : hoje.getDay();
  const projecaoHoras = diasPassados > 0 ? (horasSemana / diasPassados) * 7 : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header com Semana */}
      <div className="flex justify-between items-end border-b border-white/10 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
            Semana {currentWeekKey.split('W')[1]}
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            Planejamento Tático & Execução
          </p>
        </div>
        <button 
          onClick={() => setConfigOpen(!configOpen)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
        >
          <Settings size={14} /> Configurar Metas
        </button>
      </div>

      {/* Configuração de Metas (Collapsible) */}
      {configOpen && (
        <div className="glass p-6 rounded-2xl animate-in slide-in-from-top-2 border border-white/10 mb-6">
          <h4 className="font-bold text-white mb-4">🎯 Ajustar Metas da Semana</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">Horas Líquidas</label>
              <input 
                type="number" 
                value={metaHoras} 
                onChange={(e) => setMetaHoras(Number(e.target.value))}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">Total Questões</label>
              <input 
                type="number" 
                value={metaQuestoes} 
                onChange={(e) => setMetaQuestoes(Number(e.target.value))}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white mt-1"
              />
            </div>
          </div>
          <button 
            onClick={saveMetas}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold w-full md:w-auto"
          >
            Salvar Alterações
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna 1: Alvos Prioritários */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-red-400" />
            <h3 className="text-xl font-bold">Alvos Prioritários</h3>
          </div>
          
          {criticos.length === 0 ? (
             <div className="glass p-8 rounded-3xl border-l-4 border-green-500">
                <h4 className="font-bold text-green-400 mb-2">✨ Sem gargalos críticos!</h4>
                <p className="text-slate-400 text-sm">Sua performance está equilibrada. Recomendo avançar em novos tópicos do edital.</p>
             </div>
          ) : (
            criticos.map(c => (
              <div key={c.materia} className="glass p-6 rounded-3xl border-l-4 border-red-500 relative overflow-hidden group hover:border-red-400 transition-colors">
                 <div className="absolute top-0 right-0 bg-red-500/20 px-3 py-1 rounded-bl-xl text-[10px] font-bold text-red-400 uppercase tracking-widest">
                    Urgente
                 </div>
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <h4 className="text-lg font-bold text-white mb-1">{c.materia}</h4>
                       <p className="text-xs text-slate-400">Precisão média: <span className="text-red-400 font-bold">{c.taxa.toFixed(0)}%</span></p>
                    </div>
                 </div>
                 <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                    <p className="text-xs text-red-200 flex items-start gap-2">
                       <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                       <span>{getSugestao(c.taxa)}</span>
                    </p>
                 </div>
              </div>
            ))
          )}
        </div>

        {/* Coluna 2: Checklist e Metas */}
        <div className="space-y-6">
           <div className="flex items-center gap-3 mb-2">
            <CheckSquare className="text-purple-400" />
            <h3 className="text-xl font-bold">Checklist da Semana</h3>
          </div>

          <div className="glass p-8 rounded-3xl relative overflow-hidden">
             {progressCheck === 100 && (
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                   <Zap size={100} className="text-yellow-400" />
                </div>
             )}
             
             <div className="space-y-4 mb-6 relative z-10">
                {checklistItems.map(item => {
                  const isChecked = checks[item.id] || item.auto;
                  return (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-3 rounded-xl transition-all border ${isChecked ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-transparent hover:bg-white/10 cursor-pointer'}`}
                      onClick={() => !item.auto && toggleCheck(item.id)}
                    >
                       <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-green-500 border-green-500' : 'border-slate-600'}`}>
                             {isChecked && <div className="text-white text-xs font-bold">✓</div>}
                          </div>
                          <span className={`text-sm font-medium ${isChecked ? 'text-slate-300' : 'text-slate-200'}`}>
                             {item.label}
                          </span>
                       </div>
                       {item.auto && isChecked && (
                         <span className="text-[9px] font-bold uppercase tracking-widest bg-green-500/20 text-green-400 px-2 py-1 rounded">
                           Detectado
                         </span>
                       )}
                    </div>
                  );
                })}
             </div>
             
             <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                   <span>Progresso</span>
                   <span>{Math.round(progressCheck)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-green-500 transition-all duration-1000" 
                    style={{ width: `${progressCheck}%` }}
                   />
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Seção de Projeção */}
      <div className="glass p-8 rounded-3xl">
         <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
            <BookOpen className="text-cyan-400" size={20} />
            Projeção de Metas
         </h4>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <div className="space-y-1">
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Horas</span>
                     <div className="text-2xl font-bold">{horasSemana.toFixed(1)}h <span className="text-slate-600 text-lg">/ {metaHoras}h</span></div>
                  </div>
                  <Clock className="text-slate-700" size={32} />
               </div>
               
               <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${horasSemana >= metaHoras ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min((horasSemana/metaHoras)*100, 100)}%` }}
                  />
                  {/* Marcador de projeção */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-white/50 z-10" 
                    style={{ left: `${Math.min((projecaoHoras/metaHoras)*100, 100)}%` }}
                    title={`Projeção: ${projecaoHoras.toFixed(1)}h`}
                  />
               </div>
               <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                  <span>Atual</span>
                  <span>Projeção: {projecaoHoras.toFixed(1)}h</span>
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <div className="space-y-1">
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Questões</span>
                     <div className="text-2xl font-bold">{questoesSemana} <span className="text-slate-600 text-lg">/ {metaQuestoes}</span></div>
                  </div>
                  <Target className="text-slate-700" size={32} />
               </div>
               
               <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${questoesSemana >= metaQuestoes ? 'bg-green-500' : 'bg-purple-500'}`}
                    style={{ width: `${Math.min((questoesSemana/metaQuestoes)*100, 100)}%` }}
                  />
               </div>
               <div className="text-right text-[10px] text-slate-500 font-bold uppercase">
                  {Math.round((questoesSemana/metaQuestoes)*100)}% da meta
               </div>
            </div>
         </div>
      </div>

    </div>
  );
};

export default WeeklyGuide;
