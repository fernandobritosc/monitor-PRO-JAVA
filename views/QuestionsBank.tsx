import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { StudyRecord, EditalMateria } from '../types';
import { Trash2, Filter, Search, Edit, X, Calendar, Clock, Target, AlertCircle, CheckCircle2, Calculator, BookOpen, List, ChevronDown, ChevronRight, Layers, ChevronUp } from 'lucide-react';

interface HistoryProps {
  records: StudyRecord[];
  missaoAtiva: string;
  editais: EditalMateria[];
  onRecordUpdate: (record: StudyRecord) => void;
  onRecordDelete: (recordId: string) => void;
}

// Helper para exibição de data local sem conversão UTC
const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '--/--/----';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
};

const History: React.FC<HistoryProps> = ({ records, missaoAtiva, editais, onRecordUpdate, onRecordDelete }) => {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Accordion State
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Edição
  const [editingRecord, setEditingRecord] = useState<StudyRecord | null>(null);
  
  // Custom Dropdown State
  const [showHistoryTopicsDropdown, setShowHistoryTopicsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowHistoryTopicsDropdown(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // State Completo do Form de Edição (Igual ao StudyForm)
  const [editForm, setEditForm] = useState<{
    materia: string;
    assunto: string;
    data_estudo: string;
    tempoHHMM: string;
    acertos: number | string;
    total: number | string;
    relevancia: number;
    comentarios: string;
    dificuldade: '🟢 Fácil' | '🟡 Médio' | '🔴 Difícil' | 'Simulado';
  }>({
    materia: '',
    assunto: '',
    data_estudo: '',
    tempoHHMM: '',
    acertos: '',
    total: '',
    relevancia: 5,
    comentarios: '',
    dificuldade: '🟡 Médio'
  });
  
  const [saveToBank, setSaveToBank] = useState(false); // Novo estado para salvar no banco
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Opções para o dropdown de matérias
  const materiasDisponiveis = useMemo(() => {
    return editais.filter(e => e.concurso === missaoAtiva).map(e => e.materia).sort();
  }, [editais, missaoAtiva]);

  // Tópicos disponíveis baseado na matéria selecionada no form de edição
  const topicosDisponiveis = useMemo(() => {
    if (!editForm.materia) return [];
    const edital = editais.find(e => e.concurso === missaoAtiva && e.materia === editForm.materia);
    // Ordenação natural (numérica)
    return edital ? [...edital.topicos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })) : [];
  }, [editais, missaoAtiva, editForm.materia]);

  // Cálculo Automático de Porcentagem e Dificuldade Sugerida
  const numericAcertos = Number(editForm.acertos) || 0;
  const numericTotal = Number(editForm.total) || 0;
  const percentage = numericTotal > 0 ? (numericAcertos / numericTotal) * 100 : 0;

  useEffect(() => {
    // Atualiza a dificuldade sugerida se estiver editando (exceto Simulados)
    if (editingRecord && editingRecord.dificuldade !== 'Simulado' && numericTotal > 0) {
       let suggested: '🟢 Fácil' | '🟡 Médio' | '🔴 Difícil' = '🟡 Médio';
       if (percentage >= 80) suggested = '🟢 Fácil';
       else if (percentage < 60) suggested = '🔴 Difícil';
    }
  }, [percentage, numericTotal, editingRecord]);


  // --- FILTROS ---
  const filteredRecords = useMemo(() => {
    return records
      .filter(r => r.concurso === missaoAtiva)
      .filter(r => {
        const searchMatch = 
          r.materia.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.comentarios && r.comentarios.toLowerCase().includes(searchTerm.toLowerCase()));

        let dateMatch = true;
        if (dateStart) dateMatch = dateMatch && r.data_estudo >= dateStart;
        if (dateEnd) dateMatch = dateMatch && r.data_estudo <= dateEnd;

        return searchMatch && dateMatch;
      });
  }, [records, missaoAtiva, searchTerm, dateStart, dateEnd]);

  // --- AGRUPAMENTO POR MATÉRIA ---
  const groupedRecords = useMemo(() => {
    const groups: Record<string, StudyRecord[]> = {};
    filteredRecords.forEach(r => {
       const key = r.materia;
       if (!groups[key]) groups[key] = [];
       groups[key].push(r);
    });
    return groups;
  }, [filteredRecords]);

  const sortedMateriaKeys = useMemo(() => Object.keys(groupedRecords).sort(), [groupedRecords]);

  const toggleGroup = (materia: string) => {
    setOpenGroups(prev => ({ ...prev, [materia]: !prev[materia] }));
  };

  // --- HELPERS ---
  const minutesToHHMM = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      value = `${value.slice(0, 2)}:${value.slice(2)}`;
    }
    setEditForm({...editForm, tempoHHMM: value});
  };

  const validateTimeInput = (val: string): number => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 0) return 0;
    let hours = 0, minutes = 0;
    if (cleaned.length <= 2) minutes = parseInt(cleaned);
    else if (cleaned.length === 3) {
       hours = parseInt(cleaned.substring(0, 1));
       minutes = parseInt(cleaned.substring(1));
    } else {
       hours = parseInt(cleaned.substring(0, 2));
       minutes = parseInt(cleaned.substring(2));
    }
    return hours * 60 + minutes;
  };

  // --- AÇÕES ---
  const handleDelete = (id: string) => {
    if (!confirm('Excluir este registro permanentemente?')) return;
    onRecordDelete(id); // Chama a função otimista do App.tsx
  };

  const openEditModal = (r: StudyRecord) => {
    setEditingRecord(r);
    setSaveToBank(false); // Resetar checkbox ao abrir
    setEditForm({
      materia: r.materia,
      assunto: r.assunto,
      data_estudo: r.data_estudo,
      tempoHHMM: minutesToHHMM(r.tempo),
      acertos: r.acertos,
      total: r.total,
      relevancia: r.relevancia,
      comentarios: r.comentarios || '',
      dificuldade: r.dificuldade
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    
    const acertos = Number(editForm.acertos);
    const total = Number(editForm.total);

    if (acertos > total) {
      setMsg({ type: 'error', text: "Erro: Acertos > Total." });
      return;
    }

    setLoading(true);
    setMsg(null);

    const tempo = validateTimeInput(editForm.tempoHHMM);
    const taxa = total > 0 ? (acertos / total) * 100 : 0;
    
    const updatedRecord: StudyRecord = {
        ...editingRecord, // Mantém IDs e outras props não editáveis
        materia: editForm.materia,
        assunto: editForm.assunto,
        data_estudo: editForm.data_estudo,
        acertos,
        total,
        taxa,
        tempo,
        relevancia: editForm.relevancia,
        comentarios: editForm.comentarios,
        dificuldade: editForm.dificuldade
    };
    
    // ATUALIZAÇÃO OTIMISTA: A UI atualiza instantaneamente
    onRecordUpdate(updatedRecord); 
    setEditingRecord(null); // Fecha o modal
    setLoading(false);

    // Salvar no banco de questões é uma operação secundária (não precisa ser otimista)
    if (saveToBank && editingRecord.dificuldade !== 'Simulado') {
        const { data: { user } } = await (supabase.auth as any).getUser();
        if (user) {
            const questionPayload = {
               user_id: user.id,
               concurso: missaoAtiva,
               data: editForm.data_estudo,
               materia: editForm.materia,
               assunto: editForm.assunto,
               relevancia: editForm.relevancia,
               anotacoes: editForm.comentarios,
               status: 'Pendente',
               tags: [], 
               meta: 3
            };
            await supabase.from('questoes_revisao').insert(questionPayload);
        }
    }
  };

  const isSimuladoEdit = editingRecord?.dificuldade === 'Simulado';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <style>{`
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Busca e Filtros */}
      <div className="glass p-4 rounded-xl border border-white/10 flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="text" placeholder="Filtrar histórico por assunto ou nota..." className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-purple-500/50" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
         </div>
         <button onClick={() => setShowFilters(!showFilters)} className={`p-3 rounded-xl border border-white/5 ${showFilters ? 'bg-purple-500/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
            <Filter size={20} />
         </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
           <input type="date" className="bg-slate-900/30 border border-white/5 rounded-xl p-3 text-sm" value={dateStart} onChange={e => setDateStart(e.target.value)} />
           <input type="date" className="bg-slate-900/30 border border-white/5 rounded-xl p-3 text-sm" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
        </div>
      )}
      
      {/* Alerta de Erro/Sucesso */}
      {msg && (
        <div className={`my-4 p-3 rounded-xl text-sm font-bold border flex items-center gap-2 animate-in fade-in ${msg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Lista de Registros AGRUPADA (Accordion) */}
      <div className="space-y-4">
        {sortedMateriaKeys.length === 0 ? (
          <div className="text-center py-20 opacity-40">📜 Sem registros para esta missão.</div>
        ) : (
          sortedMateriaKeys.map(materia => {
             const recordsInGroup = groupedRecords[materia];
             const isOpen = openGroups[materia];
             
             const avgTaxa = recordsInGroup.reduce((acc, r) => acc + r.taxa, 0) / recordsInGroup.length;
             const totalAcertos = recordsInGroup.reduce((acc, r) => acc + (r.acertos || 0), 0);
             const totalQuestoes = recordsInGroup.reduce((acc, r) => acc + (r.total || 0), 0);
             const totalMinutos = recordsInGroup.reduce((acc, r) => acc + (r.tempo || 0), 0);
             const formattedTime = `${Math.floor(totalMinutos/60)}h${totalMinutos%60}m`;

             return (
               <div key={materia} className="glass border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
                  {/* Header do Grupo */}
                  <button 
                    onClick={() => toggleGroup(materia)}
                    className="w-full flex items-center justify-between p-5 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
                  >
                     <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${isOpen ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                           {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                        <div className="text-left">
                           <h4 className="font-bold text-lg text-white">{materia}</h4>
                           <div className="text-xs text-slate-500 font-bold uppercase tracking-wide flex flex-wrap gap-x-3 gap-y-1 mt-1">
                              <span>{recordsInGroup.length} registros</span>
                              <span className="opacity-50">•</span>
                              <span>Média: {avgTaxa.toFixed(0)}%</span>
                              <span className="opacity-50">•</span>
                              <span className="text-slate-400">{totalAcertos}/{totalQuestoes} Acertos</span>
                              <span className="opacity-50">•</span>
                              <span className="text-slate-400">{formattedTime}</span>
                           </div>
                        </div>
                     </div>
                     <div className="hidden md:block">
                        <Layers size={16} className="text-slate-600" />
                     </div>
                  </button>

                  {/* Lista de Registros do Grupo */}
                  {isOpen && (
                     <div className="border-t border-white/5 bg-black/20 animate-in slide-in-from-top-2">
                        {recordsInGroup.map(r => (
                           <div key={r.id} className={`p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center group`}>
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded uppercase">
                                       {formatDateDisplay(r.data_estudo)}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${r.taxa >= 80 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                       {r.taxa.toFixed(0)}%
                                    </span>
                                    {r.dificuldade === 'Simulado' && (
                                       <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded uppercase">Simulado</span>
                                    )}
                                 </div>
                                 <p className="font-medium text-slate-300 text-sm truncate">{r.assunto}</p>
                                 {r.comentarios && <p className="text-xs text-slate-500 truncate mt-1 max-w-lg">{r.comentarios}</p>}
                              </div>

                              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                 <div className="text-right">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">Tempo</div>
                                    <div className="text-sm font-bold text-slate-300">{Math.floor(r.tempo/60)}h{r.tempo%60}m</div>
                                 </div>
                                 <div className="text-right">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">Acertos</div>
                                    <div className="text-sm font-bold text-slate-300">{r.acertos}/{r.total}</div>
                                 </div>
                                 <div className="flex gap-2">
                                    <button onClick={() => openEditModal(r)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(r.id)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={16}/></button>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
             );
          })
        )}
      </div>

      {/* Modal Edição - AGORA IGUAL AO STUDY FORM */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="glass w-full max-w-xl rounded-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/10 relative">
              
              <button onClick={() => setEditingRecord(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={24} /></button>

              <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                 <Edit className="text-cyan-400" /> 
                 Editar {isSimuladoEdit ? 'Simulado' : 'Registro'}
              </h3>

              {msg && <div className={`mb-6 p-4 rounded-xl text-sm font-bold border ${msg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{msg.text}</div>}

              <div className="space-y-8">
                 {/* GRUPO 1: QUANDO E O QUE */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Clock size={12}/> Data & Tempo
                       </label>
                       <div className="flex gap-2">
                          <input type="date" className="flex-1 bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium" value={editForm.data_estudo} onChange={e => setEditForm({...editForm, data_estudo: e.target.value})} />
                          <input type="text" placeholder="HH:MM" maxLength={5} className="w-24 bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium text-center" value={editForm.tempoHHMM} onChange={handleTimeChange} />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <BookOpen size={12}/> Matéria
                       </label>
                       <select
                         className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium appearance-none"
                         value={editForm.materia}
                         onChange={(e) => setEditForm({...editForm, materia: e.target.value, assunto: ''})}
                       >
                          {isSimuladoEdit && <option value="Geral">Geral / Completo</option>}
                          {materiasDisponiveis.includes(editForm.materia) ? null : <option value={editForm.materia}>{editForm.materia} (Legado)</option>}
                          {materiasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                    </div>
                 </div>

                 {/* GRUPO 2: ASSUNTO (COM DROPDOWN CUSTOMIZADO) */}
                 <div className="space-y-2" ref={dropdownRef}>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <List size={12}/> Assunto / Tópico
                    </label>
                    <div className="relative">
                        <input 
                          type="text" 
                          className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium"
                          value={editForm.assunto} 
                          onChange={e => setEditForm({...editForm, assunto: e.target.value})} 
                          placeholder={!isSimuladoEdit && editForm.materia ? "Selecione ou digite o tópico..." : "Preencha o campo"}
                        />
                        {!isSimuladoEdit && topicosDisponiveis.length > 0 && (
                            <button 
                                type="button"
                                onClick={() => setShowHistoryTopicsDropdown(!showHistoryTopicsDropdown)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"
                                title="Ver lista completa de tópicos"
                            >
                                {showHistoryTopicsDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        )}
                        {showHistoryTopicsDropdown && !isSimuladoEdit && topicosDisponiveis.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d26] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                                {topicosDisponiveis.map((t, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => {
                                            setEditForm({...editForm, assunto: t});
                                            setShowHistoryTopicsDropdown(false);
                                        }}
                                        className="px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                 </div>

                 {/* GRUPO 3: PERFORMANCE */}
                 <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block flex items-center gap-2">
                       <Target size={12}/> Desempenho
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                       <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Acertos</span>
                          <input type="number" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-bold text-lg text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={editForm.acertos} onChange={e => setEditForm({...editForm, acertos: Number(e.target.value)})} />
                       </div>
                       
                       <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Total</span>
                          <input type="number" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-bold text-lg text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={editForm.total} onChange={e => setEditForm({...editForm, total: Number(e.target.value)})} />
                       </div>

                       <div className="flex flex-col items-center justify-center bg-slate-800/50 rounded-xl p-2 border border-white/5 h-full">
                          <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Taxa</span>
                          <div className={`text-4xl font-black ${percentage >= 80 ? 'text-green-400' : percentage >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                             {percentage.toFixed(0)}%
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* GRUPO 4: CLASSIFICAÇÃO */}
                 {!isSimuladoEdit && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Dificuldade Sentida</label>
                        <div className="flex gap-2 bg-slate-900/30 p-1 rounded-xl border border-white/5">
                          {['🟢 Fácil', '🟡 Médio', '🔴 Difícil'].map(d => (
                            <button
                             key={d}
                             type="button"
                             onClick={() => setEditForm({...editForm, dificuldade: d as any})}
                             className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editForm.dificuldade === d ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              {d.split(' ')[1]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                           <span>Relevância</span>
                           <span className="text-cyan-400">{editForm.relevancia}/10</span>
                        </label>
                        <input 
                         type="range" 
                         min="1" 
                         max="10" 
                         className="w-full accent-cyan-500 h-2 bg-slate-900/30 rounded-lg appearance-none cursor-pointer"
                         value={editForm.relevancia}
                         onChange={(e) => setEditForm({...editForm, relevancia: parseInt(e.target.value)})}
                        />
                      </div>
                   </div>
                 )}

                 {/* GRUPO 5: ANOTAÇÕES */}
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Anotações / Observações</label>
                   <textarea
                     className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all h-24 text-sm text-slate-300 placeholder-slate-600"
                     placeholder="Pontos chave, dúvidas ou links..."
                     value={editForm.comentarios}
                     onChange={(e) => setEditForm({...editForm, comentarios: e.target.value})}
                   />
                 </div>

                 {/* GRUPO 6: OPÇÕES FINAIS (NOVO) */}
                 {!isSimuladoEdit && (
                    <div className="pt-4 border-t border-white/5">
                       <label className="flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${saveToBank ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 bg-slate-900/30'}`}>
                             {saveToBank && <CheckCircle2 size={16} className="text-white" />}
                          </div>
                          <input type="checkbox" className="hidden" checked={saveToBank} onChange={e => setSaveToBank(e.target.checked)} />
                          <div className="flex-1">
                             <span className={`text-sm font-bold block ${saveToBank ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                Salvar no Banco de Questões
                             </span>
                             <span className="text-xs text-slate-500">Cria uma cópia desta edição na sua lista de revisão pendente.</span>
                          </div>
                       </label>
                    </div>
                 )}

                 <button onClick={handleSaveEdit} disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Calculator size={20} /> SALVAR ALTERAÇÕES</>}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default History;
