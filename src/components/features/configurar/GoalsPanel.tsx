import { Target, Clock, Settings } from 'lucide-react';

interface StatsSemana {
  horas: number;
  questoes: number;
  projecao: number;
}

interface GoalsPanelProps {
  statsSemana: StatsSemana;
  metaHoras: number;
  metaQuestoes: number;
  onMetaHorasChange: (v: number) => void;
  onMetaQuestoesChange: (v: number) => void;
  onSave: () => void;
}

const GoalsPanel = ({
  statsSemana, metaHoras, metaQuestoes,
  onMetaHorasChange, onMetaQuestoesChange, onSave,
}: GoalsPanelProps) => {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-2">
      <div className="glass p-8 rounded-3xl border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Target className="text-green-500" size={24} />
            Projeção Inteligente de Metas
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Horas Líquidas (Semana)</span>
                <div className="text-2xl font-bold">{statsSemana.horas.toFixed(1)}h <span className="text-slate-600 text-lg">/ {metaHoras}h</span></div>
              </div>
              <Clock className="text-slate-700" size={32} />
            </div>

            <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative">
              <div className={`h-full rounded-full transition-all duration-1000 ${statsSemana.horas >= metaHoras ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min((statsSemana.horas / metaHoras) * 100, 100)}%` }} />
              <div className="absolute top-0 bottom-0 w-1 bg-white/50 z-10" style={{ left: `${Math.min((statsSemana.projecao / metaHoras) * 100, 100)}%` }} title={`Projeção: ${statsSemana.projecao.toFixed(1)}h`} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
              <span>Atual</span>
              <span>Projeção: {statsSemana.projecao.toFixed(1)}h</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Questões</span>
                <div className="text-2xl font-bold">{statsSemana.questoes} <span className="text-slate-600 text-lg">/ {metaQuestoes}</span></div>
              </div>
              <Target className="text-slate-700" size={32} />
            </div>

            <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${statsSemana.questoes >= metaQuestoes ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${Math.min((statsSemana.questoes / metaQuestoes) * 100, 100)}%` }} />
            </div>
            <div className="text-right text-[10px] text-slate-500 font-bold uppercase">
              {Math.round((statsSemana.questoes / metaQuestoes) * 100)}% da meta batida
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 space-y-6">
          <h4 className="font-bold text-white flex items-center gap-2"><Settings size={16} /> Ajustar Metas Semanais</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Meta de Horas Líquidas</label>
              <input type="number" value={metaHoras} onChange={e => onMetaHorasChange(Number(e.target.value))} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-green-500/30 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Meta de Questões</label>
              <input type="number" value={metaQuestoes} onChange={e => onMetaQuestoesChange(Number(e.target.value))} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-green-500/30 transition-all" />
            </div>
          </div>
          <button onClick={onSave} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all active:scale-95">
            Salvar Metas
          </button>
          <p className="text-[10px] text-slate-500 italic">Essas metas são usadas para calcular seu progresso semanal no dashboard e nos estudos diários.</p>
        </div>
      </div>
    </div>
  );
};

export default GoalsPanel;
