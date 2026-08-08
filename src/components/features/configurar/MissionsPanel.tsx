import { RefreshCw, Loader2, PlusCircle, Calendar, Database, Edit, Trash, CheckCircle } from 'lucide-react';

interface GroupedMission {
  concurso: string;
  cargo: string;
  materiasCount: number;
  isPrincipal: boolean;
  dataProva?: string;
}

interface MissionsPanelProps {
  groupedMissions: GroupedMission[];
  missaoAtiva: string;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onOpenEdit: (concurso: string) => void;
  onDeleteMission: (concurso: string) => void;
  onSelectMission: (concurso: string) => void;
  onShowSql: () => void;
}

const MissionsPanel = ({
  groupedMissions, missaoAtiva, refreshing,
  onRefresh, onOpenCreate, onOpenEdit, onDeleteMission, onSelectMission, onShowSql,
}: MissionsPanelProps) => {
  return (
    <div className="glass rounded-2xl p-6 shadow-xl animate-in slide-in-from-right-2">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h3 className="text-2xl font-black tracking-tight">Suas Missões</h3>
          <button onClick={onRefresh} disabled={refreshing} className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-50" title="Sincronizar Missões"><RefreshCw size={18} className={refreshing ? "animate-spin text-cyan-400" : ""} /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={onShowSql} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold rounded-xl border border-yellow-500/20 flex items-center gap-2 transition-all"><Database size={14} /> Permissões (SQL)</button>
          <button onClick={onOpenCreate} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"><PlusCircle size={16} /> Criar Edital</button>
        </div>
      </div>
      <div className="space-y-4">
        {refreshing && groupedMissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-cyan-400" size={40} /><p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Buscando dados no Supabase...</p></div>
        ) : groupedMissions.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-3xl">
            <div className="text-5xl mb-4">📭</div>
            <h4 className="text-white font-bold mb-1">Nenhuma missão encontrada</h4>
            <p className="text-slate-500 text-sm mb-6">Crie seu primeiro edital para começar a monitorar.</p>
            <button onClick={onOpenCreate} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 mx-auto"><PlusCircle size={18} /> Criar Agora</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {groupedMissions.map(m => {
              const isActive = m.concurso === missaoAtiva;
              let provaFormatada = 'Data não definida';
              if (m.dataProva) {
                const [ano, mes, dia] = m.dataProva.split('-');
                provaFormatada = `${dia}/${mes}/${ano}`;
              }
              return (
                <div key={m.concurso} className={`p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isActive ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}>
                  <div className="flex items-center gap-5">
                    <div className={`w-3 h-3 rounded-full ${m.isPrincipal ? 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.4)]' : 'bg-slate-700'}`} />
                    <div>
                      <h4 className="font-black text-xl text-white tracking-tight">{m.concurso}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{m.cargo}</p>
                        <span className="w-1 h-1 bg-slate-600 rounded-full" />
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1"><Calendar size={10} /> {provaFormatada}</p>
                        <span className="w-1 h-1 bg-slate-600 rounded-full" />
                        <p className="text-xs text-slate-500 font-bold">{m.materiasCount} matérias</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isActive && <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20">ATIVA</span>}
                    {!isActive && (
                      <button onClick={() => onSelectMission(m.concurso)} className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-cyan-500/20">
                        <CheckCircle size={14} /> Selecionar
                      </button>
                    )}
                    <button onClick={() => onOpenEdit(m.concurso)} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 rounded-xl transition-all"><Edit size={16} /></button>
                    <button onClick={() => onDeleteMission(m.concurso)} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-xl transition-all"><Trash size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionsPanel;
