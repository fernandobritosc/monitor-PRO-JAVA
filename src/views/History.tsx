import React, { useState, useMemo } from 'react';
import { StudyRecord } from '../types';
import {
  Trash2, Filter, Search, Edit, Clock, Target,
  Calculator, ChevronRight, Zap, Layers,
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { useStudyRecords } from '../hooks/queries/useStudyRecords';
import { useEditais } from '../hooks/queries/useEditais';
import HistoryEditModal from '../components/features/history/HistoryEditModal';

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '--/--/----';
  const datePart = String(dateStr).split('T')[0];
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return String(dateStr);
  return `${day}/${month}/${year}`;
};

const History: React.FC = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const missaoAtiva = useAppStore((s) => s.missaoAtiva);
  const {
    studyRecords: records,
    updateRecord: onRecordUpdate,
    deleteRecord: onRecordDelete,
  } = useStudyRecords(userId);
  const { editais } = useEditais(userId);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [editingRecord, setEditingRecord] = useState<StudyRecord | null>(null);

  const materiasDisponiveis = useMemo(() => {
    return editais
      .filter((e) => e.concurso === missaoAtiva)
      .map((e) => e.materia)
      .sort();
  }, [editais, missaoAtiva]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => r.concurso === missaoAtiva)
      .filter((r) => {
        const searchMatch =
          r.materia.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.comentarios &&
            r.comentarios.toLowerCase().includes(searchTerm.toLowerCase()));
        let dateMatch = true;
        const recDate = String(r.data_estudo || '').split('T')[0];
        if (dateStart) dateMatch = dateMatch && recDate >= dateStart;
        if (dateEnd) dateMatch = dateMatch && recDate <= dateEnd;
        return searchMatch && dateMatch;
      });
  }, [records, missaoAtiva, searchTerm, dateStart, dateEnd]);

  const groupedRecords = useMemo(() => {
    const groups: Record<string, StudyRecord[]> = {};
    filteredRecords.forEach((r) => {
      const key = r.materia;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [filteredRecords]);

  const sortedMateriaKeys = useMemo(
    () => Object.keys(groupedRecords).sort(),
    [groupedRecords],
  );

  const toggleGroup = (materia: string) => {
    setOpenGroups((prev) => ({ ...prev, [materia]: !prev[materia] }));
  };

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este registro permanentemente?')) return;
    onRecordDelete(id);
  };

  const handleSaveEdit = (record: StudyRecord) => {
    onRecordUpdate(record);
    setEditingRecord(null);
  };

  const minutesToHHMM = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-20 duration-500 animate-in fade-in">
      <style>{`
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div className="glass-premium flex flex-col items-center gap-4 rounded-3xl border border-[hsl(var(--border))] p-5 shadow-2xl md:flex-row">
        <div className="group relative w-full flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] transition-colors group-focus-within:text-[hsl(var(--accent))]" size={20} />
          <input type="text" placeholder="Filtrar histórico por assunto ou nota..."
            className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] py-4 pl-14 pr-6 text-sm font-bold text-[hsl(var(--text-bright))] placeholder-[hsl(var(--text-muted)/0.5)] transition-all focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)]"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`rounded-2xl border p-4 transition-all duration-300 ${showFilters ? 'border-transparent bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-[hsl(var(--accent)/0.3)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))]'}`}>
          <Filter size={24} />
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-4">
          <div className="space-y-2">
            <label className="ml-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">Início</label>
            <input type="date" className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] p-4 text-sm font-bold text-[hsl(var(--text-bright))]"
              value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="ml-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">Fim</label>
            <input type="date" className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] p-4 text-sm font-bold text-[hsl(var(--text-bright))]"
              value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedMateriaKeys.length === 0 ? (
          <div className="py-20 text-center opacity-40">📜 Sem registros para esta missão.</div>
        ) : (
          sortedMateriaKeys.map((materia) => {
            const recordsInGroup = groupedRecords[materia];
            const isOpen = openGroups[materia];
            const totalAcertos = recordsInGroup.reduce((acc, r) => acc + (r.acertos || 0), 0);
            const totalQuestoes = recordsInGroup.reduce((acc, r) => acc + (r.total || 0), 0);
            const avgTaxa = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0;
            const totalMinutos = recordsInGroup.reduce((acc, r) => acc + (r.tempo || 0), 0);
            const formattedTime = `${Math.floor(totalMinutos / 60)}h${totalMinutos % 60}m`;

            return (
              <div key={materia} className="glass-premium group overflow-hidden rounded-[2.5rem] border border-[hsl(var(--border))] shadow-lg transition-all duration-500 hover:shadow-2xl">
                <button onClick={() => toggleGroup(materia)}
                  className={`flex w-full items-center justify-between p-8 transition-all duration-500 ${isOpen ? 'bg-[hsl(var(--accent)/0.05)]' : 'hover:bg-white/[0.03]'}`}>
                  <div className="flex items-center gap-6">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-xl transition-all duration-500 ${isOpen ? 'rotate-90 scale-110 bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))]' : 'bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] group-hover:scale-105'}`}>
                      {isOpen ? <ChevronRight size={24} /> : <ChevronRight size={24} />}
                    </div>
                    <div className="text-left">
                      <h4 className={`text-xl font-black uppercase leading-none tracking-tighter transition-colors ${isOpen ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-bright))]'}`}>{materia}</h4>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
                        <span className="flex items-center gap-1.5"><Layers size={10} className="text-[hsl(var(--accent))]" /> {recordsInGroup.length} registros</span>
                        <span className="opacity-30">|</span>
                        <span className="flex items-center gap-1.5"><Target size={10} className="text-green-500" /> Média: {avgTaxa.toFixed(0)}%</span>
                        <span className="opacity-30">|</span>
                        <span className="flex items-center gap-1.5"><Clock size={10} className="text-purple-500" /> {formattedTime}</span>
                      </div>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-3 px-8 pb-8 duration-500 animate-in slide-in-from-top-4">
                    {recordsInGroup.map((r) => (
                      <div key={r.id} className="group/card relative overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-5 transition-all duration-300 hover:border-white/10 hover:bg-black/30">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex flex-1 flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-[hsl(var(--accent)/0.1)] px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-[hsl(var(--accent))]">{r.assunto || 'Geral'}</span>
                              <span className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-500">{formatDateDisplay(r.data_estudo)}</span>
                              {r.tipo === 'Simulado' && <span className="rounded-lg bg-purple-500/10 px-2.5 py-1 text-[10px] font-black text-purple-400">SIMULADO</span>}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-black text-slate-400"><Calculator size={12} className="mr-1 inline text-cyan-400" />{r.acertos}/{r.total}</span>
<span className={`text-lg font-black ${(Number(r.taxa) || 0) >= 80 ? 'text-green-400' : (Number(r.taxa) || 0) >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {(Number(r.taxa) || 0).toFixed(0)}%
                              </span>
                              <span className="text-[10px] font-bold text-slate-500"><Clock size={10} className="mr-1 inline" />{minutesToHHMM(r.tempo)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.analise_erros && r.analise_erros.length > 0 && (
                              <button onClick={() => setOpenGroups(prev => ({ ...prev, [`diag-${r.id}`]: !prev[`diag-${r.id}`] }))}
                                className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-400 transition-all hover:bg-cyan-500/20 active:scale-95">
                                <Zap size={18} />
                              </button>
                            )}
                            <button onClick={() => setEditingRecord(r)}
                              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] p-3 text-[hsl(var(--text-muted))] transition-all hover:bg-purple-500/10 hover:text-purple-400 active:scale-95">
                              <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(r.id)}
                              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] p-3 text-[hsl(var(--text-muted))] transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-95">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {openGroups[`diag-${r.id}`] && r.analise_erros && (
                          <div className="mt-6 grid w-full grid-cols-1 gap-4 border-t border-[hsl(var(--border))] pt-6 duration-500 animate-in slide-in-from-top-4 md:grid-cols-2">
                            {r.analise_erros.map((err, idx) => (
                              <div key={idx} className="relative space-y-3 overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-5">
                                <div className={`absolute bottom-0 left-0 top-0 w-1 ${err.tipo_erro === 'Atenção' ? 'bg-yellow-500' : err.tipo_erro === 'Interpretação' ? 'bg-blue-500' : 'bg-red-500'}`} />
                                <div className="flex items-start justify-between gap-3">
                                  <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-tighter ${err.tipo_erro === 'Atenção' ? 'bg-yellow-500/10 text-yellow-500' : err.tipo_erro === 'Interpretação' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {err.tipo_erro}
                                  </span>
                                  <span className="line-clamp-1 flex-1 text-[9px] font-bold italic text-slate-500">"{err.questao_preview}..."</span>
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold tracking-tight text-slate-200"><span className="mr-2 text-cyan-400">🎯 GATILHO:</span> {err.gatilho}</p>
                                  <p className="text-[10px] font-bold leading-relaxed text-slate-400"><span className="mr-2 text-green-400">💡 AÇÃO:</span> {err.sugestao}</p>
                                  {err.sugestao_mentor && <p className="mt-2 border-t border-white/5 pt-2 text-[9px] font-black italic text-purple-400/80"><span className="mr-1">👔 MENTOR:</span> {err.sugestao_mentor}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <HistoryEditModal
        editingRecord={editingRecord}
        materiasDisponiveis={materiasDisponiveis}
        editais={editais}
        missaoAtiva={missaoAtiva}
        onSave={handleSaveEdit}
        onClose={() => setEditingRecord(null)}
      />
    </div>
  );
};

export default History;
