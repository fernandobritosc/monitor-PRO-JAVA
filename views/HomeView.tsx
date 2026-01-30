
import React, { useMemo } from 'react';
import CircularProgress from '../components/CircularProgress';
import { StudyRecord, EditalMateria, ViewType } from '../types';
import { 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
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
  const activeRecords = useMemo(() => records.filter(r => r.concurso === missaoAtiva), [records, missaoAtiva]);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = activeRecords.filter(r => r.data_estudo === todayStr);
  const todayMinutes = todayRecords.reduce((acc, r) => acc + r.tempo, 0);
  const todayQuestions = todayRecords.reduce((acc, r) => acc + r.total, 0);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const totalQuestions = activeRecords.reduce((acc, r) => acc + r.total, 0);
  const totalCorrect = activeRecords.reduce((acc, r) => acc + r.acertos, 0);
  const precision = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const totalHours = activeRecords.reduce((acc, r) => acc + r.tempo, 0) / 60;

  const daysUntilExam = useMemo(() => {
    const activeEdital = editais.find(e => e.concurso === missaoAtiva);
    if (!activeEdital?.data_prova) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const exam = new Date(activeEdital.data_prova);
    exam.setHours(0,0,0,0);
    const diffTime = exam.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 3600 * 24)));
  }, [editais, missaoAtiva]);

  const { streak, recordStreak } = useMemo(() => {
    // Fix: Explicitly type uniqueDates as string[] to avoid unknown parameter in Date constructor
    const uniqueDates: string[] = Array.from(new Set(activeRecords.map(r => r.data_estudo))).sort().reverse();
    let currentStreak = 0;
    if (uniqueDates.length > 0) {
      let checkDate = new Date();
      checkDate.setHours(0,0,0,0);
      const lastStudy = new Date(uniqueDates[0]);
      lastStudy.setHours(0,0,0,0);
      if (Math.floor((checkDate.getTime() - lastStudy.getTime()) / (1000 * 3600 * 24)) <= 1) {
         currentStreak = 1;
         let pivotDate = new Date(uniqueDates[0]);
         for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i]);
            if (Math.floor((pivotDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24)) === 1) {
               currentStreak++;
               pivotDate = prevDate;
            } else break;
         }
      }
    }
    return { streak: currentStreak, recordStreak: 0 }; // Recorde simplificado
  }, [activeRecords]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      <div className="glass rounded-2xl p-6 border-l-2 border-cyan-500 relative overflow-hidden group">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 relative z-10 w-full">
            <div className="w-full">
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest flex items-center gap-1">
                        <CalendarDays size={12} /> Hoje
                    </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-1">
                  {greeting}, Guerreiro!
                </h2>
                <p className="text-slate-400 text-sm">Resumo da sua atividade de hoje.</p>
            </div>

            <div className="flex gap-8 text-right shrink-0">
                <div>
                    <div className="text-3xl font-bold text-white">
                        {Math.floor(todayMinutes / 60)}h{todayMinutes % 60}m
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Tempo</div>
                </div>
                <div>
                    <div className="text-3xl font-bold text-white">{todayQuestions}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Questões</div>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setActiveView('REGISTRAR')} className="group bg-slate-800/30 border border-white/5 p-3 rounded-xl transition-all hover:border-purple-500/50 flex flex-col items-center gap-3">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-purple-500 text-purple-400 group-hover:text-white transition-colors"><PlusCircle size={24} /></div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Registrar</span>
        </button>
        <button onClick={() => setActiveView('REVISOES')} className="group bg-slate-800/30 border border-white/5 p-3 rounded-xl transition-all hover:border-orange-500/50 flex flex-col items-center gap-3">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-orange-500 text-orange-400 group-hover:text-white transition-colors"><RotateCcw size={24} /></div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Revisar</span>
        </button>
        <button onClick={() => setActiveView('DASHBOARD')} className="group bg-slate-800/30 border border-white/5 p-3 rounded-xl transition-all hover:border-cyan-500/50 flex flex-col items-center gap-3">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-cyan-500 text-cyan-400 group-hover:text-white transition-colors"><BarChart3 size={24} /></div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Analisar</span>
        </button>
        <button onClick={() => setActiveView('GUIA_SEMANAL')} className="group bg-slate-800/30 border border-white/5 p-3 rounded-xl transition-all hover:border-green-500/50 flex flex-col items-center gap-3">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-green-500 text-green-400 group-hover:text-white transition-colors"><CalendarCheck size={24} /></div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Guia</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CircularProgress percentage={Math.min((totalHours / 200) * 100, 100)} label="Horas Totais" value={`${totalHours.toFixed(0)}h`} icon="⏱️" />
        <CircularProgress percentage={precision} label="Precisão" value={`${precision.toFixed(0)}%`} icon="🎯" colorStart={precision >= 80 ? '#10B981' : '#EF4444'} />
        <CircularProgress percentage={Math.min((totalQuestions / 1000) * 100, 100)} label="Questões" value={totalQuestions.toString()} icon="📚" />
        <CircularProgress percentage={daysUntilExam ? Math.max(0, Math.min(100, (daysUntilExam / 90) * 100)) : 0} label="Dias p/ Prova" value={daysUntilExam !== null ? daysUntilExam.toString() : "--"} icon="📅" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass rounded-2xl p-6 flex flex-col justify-between">
             <h3 className="text-lg font-bold flex items-center gap-2 mb-6"><Target className="text-cyan-400" size={20} /> Metas da Semana</h3>
             <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-xs font-bold uppercase text-slate-500 mb-2"><span>Horas</span><span>{totalHours.toFixed(1)}h / 22h</span></div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${Math.min((totalHours/22)*100, 100)}%` }} /></div>
                </div>
             </div>
          </div>
          <div className="glass rounded-2xl p-6">
             <h3 className="text-lg font-bold flex items-center gap-2 mb-6"><TrendingUp className="text-green-400" size={20} /> Constância</h3>
             <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5"><div className="text-2xl font-bold text-white">{streak}</div><div className="text-[10px] text-slate-500 uppercase font-bold">Dias Seguidos</div></div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5"><div className="text-2xl font-bold text-green-400">ATIVO</div><div className="text-[10px] text-slate-500 uppercase font-bold">Status</div></div>
             </div>
          </div>
      </div>
    </div>
  );
};

export default HomeView;