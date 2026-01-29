import React, { useMemo } from 'react';
import CircularProgress from '../components/CircularProgress';
import { StudyRecord, EditalMateria, ViewType } from '../types';
import { 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Zap, 
  CalendarDays,
  PlusCircle,
  RotateCcw,
  BarChart3,
  CalendarCheck,
  Target
} from 'lucide-react';

interface HomeViewProps {
  records: StudyRecord[];
  missaoAtiva: string;
  editais: EditalMateria[];
  setActiveView: (view: ViewType) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ records, missaoAtiva, editais, setActiveView }) => {
  const activeRecords = useMemo(() => 
    records.filter(r => r.concurso === missaoAtiva), 
  [records, missaoAtiva]);
  
  // --- CÁLCULOS DO DIA ---
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = activeRecords.filter(r => r.data_estudo === todayStr);
  const todayMinutes = todayRecords.reduce((acc, r) => acc + r.tempo, 0);
  const todayQuestions = todayRecords.reduce((acc, r) => acc + r.total, 0);
  const todayXP = todayMinutes + (todayQuestions * 2);

  // Agrupamento por matéria do dia
  const todaySubjects = useMemo(() => {
    const subjects: Record<string, number> = {};
    todayRecords.forEach(r => {
      subjects[r.materia] = (subjects[r.materia] || 0) + r.tempo;
    });
    return Object.entries(subjects).map(([name, time]) => ({ name, time }));
  }, [todayRecords]);

  // Saudação Inteligente
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  // --- CÁLCULOS GERAIS ---
  const totalQuestions = activeRecords.reduce((acc, r) => acc + r.total, 0);
  const totalCorrect = activeRecords.reduce((acc, r) => acc + r.acertos, 0);
  const precision = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const totalHours = activeRecords.reduce((acc, r) => acc + r.tempo, 0) / 60;

  // --- DIAS ATÉ A PROVA ---
  const daysUntilExam = useMemo(() => {
    const activeEdital = editais.find(e => e.concurso === missaoAtiva);
    if (!activeEdital?.data_prova) return null;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const exam = new Date(activeEdital.data_prova);
    exam.setHours(0,0,0,0);
    
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [editais, missaoAtiva]);

  // --- CÁLCULOS SEMANAIS (SNAPSHOT) ---
  const weeklyStats = useMemo(() => {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay() + (hoje.getDay() === 0 ? -6 : 1));
    inicioSemana.setHours(0,0,0,0);

    const recs = activeRecords.filter(r => new Date(r.data_estudo) >= inicioSemana);
    return {
      hours: recs.reduce((acc, r) => acc + r.tempo, 0) / 60,
      questions: recs.reduce((acc, r) => acc + r.total, 0)
    };
  }, [activeRecords]);

  const metaHoras = 22; // Padrão
  const metaQuestoes = 350; // Padrão

  // --- STREAK (CONSTÂNCIA) AVANÇADO ---
  const { streak, recordStreak, monthProgress } = useMemo(() => {
    const uniqueDates = Array.from(new Set(activeRecords.map(r => r.data_estudo))).sort().reverse();
    
    // Streak Atual
    let currentStreak = 0;
    if (uniqueDates.length > 0) {
      let checkDate = new Date();
      checkDate.setHours(0,0,0,0);
      
      // Ajuste: permite falha se o ultimo estudo foi ontem
      const lastStudy = new Date(uniqueDates[0]);
      lastStudy.setHours(0,0,0,0);
      
      const diffLast = Math.floor((checkDate.getTime() - lastStudy.getTime()) / (1000 * 3600 * 24));
      
      // Se não estudou hoje nem ontem, streak quebrou
      if (diffLast <= 1) {
         currentStreak = 1;
         let pivotDate = new Date(uniqueDates[0]);
         
         for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i]);
            const diffDays = Math.floor((pivotDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
            
            if (diffDays === 1) {
               currentStreak++;
               pivotDate = prevDate;
            } else {
               break;
            }
         }
      }
    }

    // Recorde (Simplificado)
    // Para um recorde real precisaria iterar todo o histórico, vamos usar max(current, stored)
    // Aqui vamos apenas estimar com o current por simplicidade, ou iterar tudo se não for pesado.
    // Iterando tudo para precisão:
    let maxStreak = 0;
    let tempStreak = 0;
    // Precisamos das datas em ordem crescente
    const sortedDates = [...uniqueDates].sort();
    if (sortedDates.length > 0) {
        tempStreak = 1;
        maxStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
            const d1 = new Date(sortedDates[i-1]);
            const d2 = new Date(sortedDates[i]);
            const diff = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
            
            if (diff === 1) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }
            if (tempStreak > maxStreak) maxStreak = tempStreak;
        }
    }

    // Mês Atual
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const studiedDaysInMonth = uniqueDates.filter(d => {
        const date = new Date(d);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return { streak: currentStreak, recordStreak: maxStreak, monthProgress: (studiedDaysInMonth / daysInMonth) * 100 };
  }, [activeRecords]);


  // --- ANÁLISE DE MATÉRIAS (PONTOS FORTES E FRACOS) ---
  const subjectStats = useMemo(() => {
    const stats: Record<string, { correct: number; total: number }> = {};
    activeRecords.forEach(r => {
      if (!stats[r.materia]) stats[r.materia] = { correct: 0, total: 0 };
      stats[r.materia].correct += r.acertos;
      stats[r.materia].total += r.total;
    });
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        precision: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        total: data.total
      }))
      .filter(s => s.total > 10)
      .sort((a, b) => b.precision - a.precision);
  }, [activeRecords]);

  const bestSubjects = subjectStats.slice(0, 3);
  const worstSubjects = subjectStats.length > 3 ? subjectStats.slice(-3).reverse() : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* 1. HERO SECTION: RESUMO DIÁRIO GAMIFICADO */}
      <div className="glass rounded-3xl p-8 border-l-4 border-cyan-500 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl group-hover:scale-110 transition-transform duration-700">⚡</div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 relative z-10">
          <div className="w-full">
            <div className="flex justify-between items-start w-full">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest flex items-center gap-1">
                            <CalendarDays size={12} />
                            Hoje
                        </span>
                        <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-1">
                      {greeting}, Guerreiro!
                    </h2>
                    
                    {todayMinutes === 0 ? (
                        <p className="text-slate-400 text-sm">O dia está passando. Que tal registrar sua primeira sessão?</p>
                    ) : (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {todaySubjects.map((sub, idx) => (
                                <span key={idx} className="bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                    {sub.name}: {Math.floor(sub.time/60) > 0 ? `${Math.floor(sub.time/60)}h` : ''}{sub.time%60}m
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-6 text-right hidden md:flex">
                    <div>
                        <div className="text-3xl font-bold text-white leading-none">
                            {Math.floor(todayMinutes / 60)}<span className="text-sm text-slate-500 font-bold ml-1">h</span>
                            {todayMinutes % 60}<span className="text-sm text-slate-500 font-bold ml-1">m</span>
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Tempo Líquido</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-white leading-none">{todayQuestions}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Questões</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-purple-400 leading-none">+{todayXP}</div>
                        <div className="text-[10px] text-purple-500/70 uppercase font-bold tracking-widest mt-1 flex justify-end gap-1">
                           <Zap size={10} /> XP
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AÇÕES RÁPIDAS (QUICK ACTIONS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setActiveView('REGISTRAR')} className="group bg-gradient-to-br from-slate-800 to-slate-900 hover:from-purple-600/20 hover:to-cyan-600/20 border border-white/5 hover:border-purple-500/50 p-4 rounded-2xl transition-all duration-300 flex flex-col items-center gap-3 shadow-lg">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-purple-500 text-purple-400 group-hover:text-white transition-colors">
                <PlusCircle size={24} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 group-hover:text-white">Registrar</span>
        </button>
        <button onClick={() => setActiveView('REVISOES')} className="group bg-gradient-to-br from-slate-800 to-slate-900 hover:from-orange-600/20 hover:to-red-600/20 border border-white/5 hover:border-orange-500/50 p-4 rounded-2xl transition-all duration-300 flex flex-col items-center gap-3 shadow-lg">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-orange-500 text-orange-400 group-hover:text-white transition-colors">
                <RotateCcw size={24} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 group-hover:text-white">Revisar</span>
        </button>
        <button onClick={() => setActiveView('DASHBOARD')} className="group bg-gradient-to-br from-slate-800 to-slate-900 hover:from-blue-600/20 hover:to-cyan-600/20 border border-white/5 hover:border-cyan-500/50 p-4 rounded-2xl transition-all duration-300 flex flex-col items-center gap-3 shadow-lg">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-cyan-500 text-cyan-400 group-hover:text-white transition-colors">
                <BarChart3 size={24} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 group-hover:text-white">Dashboard</span>
        </button>
        <button onClick={() => setActiveView('GUIA_SEMANAL')} className="group bg-gradient-to-br from-slate-800 to-slate-900 hover:from-green-600/20 hover:to-emerald-600/20 border border-white/5 hover:border-green-500/50 p-4 rounded-2xl transition-all duration-300 flex flex-col items-center gap-3 shadow-lg">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-green-500 text-green-400 group-hover:text-white transition-colors">
                <CalendarCheck size={24} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 group-hover:text-white">Guia Semanal</span>
        </button>
      </div>

      {/* 3. KPIS PRINCIPAIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CircularProgress
          percentage={Math.min((totalHours / 200) * 100, 100)} 
          label="Horas Totais"
          value={`${totalHours.toFixed(0)}h`}
          icon="⏱️"
        />
        <CircularProgress
          percentage={precision}
          label="Precisão Global"
          value={`${precision.toFixed(0)}%`}
          icon="🎯"
          colorStart={precision >= 80 ? '#10B981' : precision >= 60 ? '#F59E0B' : '#EF4444'}
          colorEnd={precision >= 80 ? '#34D399' : precision >= 60 ? '#FBBF24' : '#F87171'}
        />
        <CircularProgress
          percentage={Math.min((totalQuestions / 1000) * 100, 100)}
          label="Banco Questões"
          value={totalQuestions >= 1000 ? `${(totalQuestions/1000).toFixed(1)}k` : totalQuestions.toString()}
          icon="📚"
        />
        {/* Dias para Prova (Dinâmico) */}
        <CircularProgress
          percentage={daysUntilExam ? Math.max(0, Math.min(100, (daysUntilExam / 90) * 100)) : 0} 
          label="Dias p/ Prova"
          value={daysUntilExam !== null ? daysUntilExam.toString() : "--"} 
          icon="📅"
          colorStart="#F59E0B"
          colorEnd="#EF4444"
        />
      </div>

      {/* 4. SPLIT VIEW: METAS E CONSTÂNCIA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* CARTÃO DE METAS SEMANAIS (Snapshot) */}
          <div className="glass rounded-3xl p-8 flex flex-col justify-between">
             <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Target className="text-cyan-400" size={20} />
                    Metas da Semana
                </h3>
                <span className="bg-white/5 text-slate-400 text-[10px] font-bold px-2 py-1 rounded uppercase">
                    Snapshot
                </span>
             </div>

             <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                        <span>Horas</span>
                        <span>{weeklyStats.hours.toFixed(1)}h / {metaHoras}h</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${weeklyStats.hours >= metaHoras ? 'bg-green-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`}
                            style={{ width: `${Math.min((weeklyStats.hours/metaHoras)*100, 100)}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-right mt-1 text-slate-500 font-bold">
                        {weeklyStats.hours >= metaHoras ? 'META BATIDA! 🚀' : 'Continue focando'}
                    </p>
                </div>

                <div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                        <span>Questões</span>
                        <span>{weeklyStats.questions} / {metaQuestoes}</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${weeklyStats.questions >= metaQuestoes ? 'bg-green-500' : 'bg-gradient-to-r from-purple-600 to-pink-500'}`}
                            style={{ width: `${Math.min((weeklyStats.questions/metaQuestoes)*100, 100)}%` }}
                        />
                    </div>
                </div>
             </div>
          </div>

          {/* CARTÃO DE CONSTÂNCIA */}
          <div className="glass rounded-3xl p-8">
             <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="text-green-400" size={20} />
                    Constância
                </h3>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${streak > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {streak > 0 ? 'Ativo' : 'Inativo'}
                </span>
             </div>

             <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <div className="text-2xl font-bold text-white mb-1">{streak}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Dias Seguidos</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <div className="text-2xl font-bold text-green-400 mb-1">{recordStreak}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Recorde</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <div className="text-2xl font-bold text-cyan-400 mb-1">{monthProgress.toFixed(0)}%</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Mês Atual</div>
                </div>
             </div>
             
             <div className="mt-6 text-center">
                <p className="text-xs text-slate-400">
                    Estudar todo dia cria o hábito. Mantenha a chama acesa! 🔥
                </p>
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 5. ANÁLISE TÁTICA */}
        <div className="lg:col-span-2 space-y-6">
           <div className="glass rounded-3xl p-8 h-full">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                 <TrendingUp className="text-purple-400" />
                 Raio-X de Desempenho
              </h3>

              {subjectStats.length === 0 ? (
                 <div className="text-center py-10 opacity-50">
                    <p>Registre mais estudos para gerar sua análise tática.</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Pontos Fortes */}
                   <div>
                      <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                         <CheckCircle2 size={14} /> Dominando
                      </h4>
                      <div className="space-y-3">
                         {bestSubjects.map((s, i) => (
                            <div key={s.name} className="flex items-center justify-between p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                               <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-green-500/50">#{i+1}</span>
                                  <span className="font-bold text-sm">{s.name}</span>
                               </div>
                               <span className="text-green-400 font-bold text-sm">{s.precision.toFixed(0)}%</span>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* Pontos de Atenção */}
                   {worstSubjects.length > 0 && (
                     <div>
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <AlertCircle size={14} /> Atenção Crítica
                        </h4>
                        <div className="space-y-3">
                           {worstSubjects.map((s, i) => (
                              <div key={s.name} className="flex items-center justify-between p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                                 <span className="font-bold text-sm">{s.name}</span>
                                 <div className="flex items-center gap-2">
                                     <span className="text-[10px] text-slate-500">({s.total}q)</span>
                                     <span className="text-red-400 font-bold text-sm">{s.precision.toFixed(0)}%</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
              )}
           </div>
        </div>

        {/* 6. TIMELINE RECENTE */}
        <div className="glass rounded-3xl p-8 h-full flex flex-col">
           <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock className="text-slate-400" />
              Histórico Recente
           </h3>
           
           <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
              {activeRecords.length === 0 ? (
                 <div className="text-sm text-slate-500 text-center mt-10">Nenhum registro encontrado.</div>
              ) : (
                 activeRecords.slice(0, 5).map(r => (
                    <div key={r.id} className="relative pl-4 border-l-2 border-slate-800 py-1">
                       <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                       <div className="bg-white/5 p-3 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                             <span className="text-[10px] font-bold text-cyan-400 uppercase">{r.materia}</span>
                             <span className="text-[10px] text-slate-500">{new Date(r.data_estudo).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-300 line-clamp-1 mb-2">{r.assunto}</p>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                             <span>{Math.floor(r.tempo/60)}h{r.tempo%60}m</span>
                             <span>{r.acertos}/{r.total} ({r.taxa.toFixed(0)}%)</span>
                          </div>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default HomeView;