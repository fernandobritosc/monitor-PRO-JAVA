import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { StudyRecord, EditalMateria, ErrorAnalysis } from '../types';
import { Trash2, Filter, Search, Edit, X, Calendar, Clock, Target, AlertCircle, CheckCircle2, Calculator, BookOpen, List, ChevronDown, ChevronRight, Layers, ChevronUp, Zap, FileText } from 'lucide-react';
import { getGeminiKey, getGroqKey } from '../services/supabase';
import { generateAIContent, parseAIJSON } from '../services/aiService';
import { CustomSelector } from '../components/CustomSelector';

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
      meta: string;
      analise_erros: ErrorAnalysis[];
   }>({
      materia: '',
      assunto: '',
      data_estudo: '',
      tempoHHMM: '',
      acertos: '',
      total: '',
      relevancia: 5,
      comentarios: '',
      dificuldade: '🟡 Médio',
      meta: '',
      analise_erros: []
   });

   const [errorText, setErrorText] = useState('');
   const [isAnalyzing, setIsAnalyzing] = useState(false);

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
      setEditForm({ ...editForm, tempoHHMM: value });
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

   const handleAnalyzeErrors = async (text: string) => {
      if (!text.trim()) return;
      setIsAnalyzing(true);
      try {
         const geminiKey = getGeminiKey();
         const groqKey = getGroqKey();

         const result = await generateAIContent(
            {
               content: text,
               stats: {
                  materia: editForm.materia,
                  assunto: editForm.assunto,
                  tempo: editForm.tempoHHMM,
                  acertos: editForm.acertos,
                  total: editForm.total,
                  percentage: percentage
               }
            },
            geminiKey,
            groqKey,
            'gemini',
            'analise_erros'
         );


         const parsed: ErrorAnalysis[] = parseAIJSON(result);
         setEditForm(prev => ({ ...prev, analise_erros: parsed }));
      } catch (error) {
         console.error('Erro na análise de IA:', error);
         setMsg({ type: 'error', text: 'Falha ao analisar erros com IA.' });
      } finally {
         setIsAnalyzing(false);
      }
   };

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
         const content = event.target?.result as string;
         setErrorText(content);
         handleAnalyzeErrors(content);
      };
      reader.readAsText(file);
   };

   const openEditModal = (r: StudyRecord) => {
      setEditingRecord(r);
      setSaveToBank(false); // Resetar checkbox ao abrir
      setErrorText('');
      setEditForm({
         materia: r.materia,
         assunto: r.assunto,
         data_estudo: r.data_estudo,
         tempoHHMM: minutesToHHMM(r.tempo),
         acertos: r.acertos,
         total: r.total,
         relevancia: r.relevancia,
         comentarios: r.comentarios || '',
         dificuldade: r.dificuldade,
         meta: String(r.meta || ''),
         analise_erros: r.analise_erros || []
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
         dificuldade: editForm.dificuldade,
         meta: (editForm.meta as string).trim() || null,
         analise_erros: editForm.analise_erros.length > 0 ? editForm.analise_erros : undefined
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
         <div className="glass-premium p-5 rounded-3xl border border-[hsl(var(--border))] flex flex-col md:flex-row gap-4 items-center shadow-2xl">
            <div className="relative flex-1 w-full group">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] group-focus-within:text-[hsl(var(--accent))] transition-colors" size={20} />
               <input type="text" placeholder="Filtrar histórico por assunto ou nota..." className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] transition-all placeholder-[hsl(var(--text-muted)/0.5)]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`p-4 rounded-2xl border transition-all duration-300 ${showFilters ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-[hsl(var(--accent)/0.3)] border-transparent' : 'bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] border-[hsl(var(--border))] hover:text-[hsl(var(--text-bright))]'}`}>
               <Filter size={24} />
            </button>
         </div>

         {showFilters && (
            <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-3">Início</label>
                  <input type="date" className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl p-4 text-sm font-bold text-[hsl(var(--text-bright))]" value={dateStart} onChange={e => setDateStart(e.target.value)} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-3">Fim</label>
                  <input type="date" className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl p-4 text-sm font-bold text-[hsl(var(--text-bright))]" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
               </div>
            </div>
         )}

         {/* Alerta de Erro/Sucesso */}
         {msg && (
            <div className={`my-6 p-5 rounded-2xl text-sm font-black border flex items-center gap-4 animate-in fade-in slide-in-from-top-4 shadow-xl ${msg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
               {msg.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
               <span className="uppercase tracking-widest">{msg.text}</span>
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
                  const formattedTime = `${Math.floor(totalMinutos / 60)}h${totalMinutos % 60}m`;

                  return (
                     <div key={materia} className="glass-premium border border-[hsl(var(--border))] rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl group shadow-lg">
                        {/* Header do Grupo */}
                        <button
                           onClick={() => toggleGroup(materia)}
                           className={`w-full flex items-center justify-between p-8 transition-all duration-500 ${isOpen ? 'bg-[hsl(var(--accent)/0.05)]' : 'hover:bg-white/[0.03]'}`}
                        >
                           <div className="flex items-center gap-6">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl ${isOpen ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] scale-110 rotate-90' : 'bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] group-hover:scale-105'}`}>
                                 {isOpen ? <ChevronRight size={24} /> : <ChevronRight size={24} />}
                              </div>
                              <div className="text-left">
                                 <h4 className={`font-black text-xl tracking-tighter uppercase leading-none transition-colors ${isOpen ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-bright))]'}`}>{materia}</h4>
                                 <div className="text-[10px] font-black uppercase tracking-[0.2em] flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[hsl(var(--text-muted))]">
                                    <span className="flex items-center gap-1.5"><Layers size={10} className="text-[hsl(var(--accent))]" /> {recordsInGroup.length} registros</span>
                                    <span className="opacity-30">|</span>
                                    <span className="flex items-center gap-1.5"><Target size={10} className="text-green-500" /> Média: {avgTaxa.toFixed(0)}%</span>
                                    <span className="opacity-30">|</span>
                                    <span className="flex items-center gap-1.5"><Calculator size={10} className="text-purple-500" /> {totalAcertos}/{totalQuestoes}</span>
                                    <span className="opacity-30">|</span>
                                    <span className="flex items-center gap-1.5"><Clock size={10} className="text-yellow-500" /> {formattedTime}</span>
                                 </div>
                              </div>
                           </div>
                        </button>

                        {/* Lista de Registros do Grupo */}
                        {isOpen && (
                           <div className="border-t border-[hsl(var(--border))] bg-black/5 animate-in slide-in-from-top-4 duration-500">
                              {recordsInGroup.map(r => (
                                 <div key={r.id} className={`p-6 border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--accent)/0.03)] transition-all flex flex-col md:flex-row gap-6 justify-between items-start md:items-center group/item`}>
                                    <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-3 mb-2">
                                          <span className="text-[9px] font-black text-[hsl(var(--text-muted))] bg-[hsl(var(--bg-user-block))] px-3 py-1 rounded-full border border-[hsl(var(--border))] uppercase tracking-widest">
                                             {formatDateDisplay(r.data_estudo)}
                                          </span>
                                          <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${r.taxa >= 80 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                                             {r.taxa.toFixed(0)}%
                                          </span>
                                          {r.dificuldade === 'Simulado' && (
                                             <span className="text-[9px] font-black bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20 uppercase tracking-widest">Simulado</span>
                                          )}
                                          {r.meta && (
                                             <span className="text-[9px] font-black bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/20 uppercase tracking-widest">
                                                {r.meta}
                                             </span>
                                          )}
                                       </div>
                                       <p className="font-black text-[hsl(var(--text-bright))] text-base tracking-tight truncate uppercase">{r.assunto}</p>
                                       {r.comentarios && <p className="text-xs font-bold text-[hsl(var(--text-muted))] truncate mt-2 max-w-xl italic">"{r.comentarios}"</p>}
                                    </div>

                                    <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                                       <div className="text-right">
                                          <div className="text-[9px] text-[hsl(var(--text-muted))] font-black uppercase tracking-widest">Tempo</div>
                                          <div className="text-base font-black text-[hsl(var(--text-bright))] tracking-tighter">{Math.floor(r.tempo / 60)}h{r.tempo % 60}m</div>
                                       </div>
                                       <div className="text-right">
                                          <div className="text-[9px] text-[hsl(var(--text-muted))] font-black uppercase tracking-widest">Acertos</div>
                                          <div className="text-base font-black text-[hsl(var(--text-bright))] tracking-tighter">{r.acertos}/{r.total}</div>
                                       </div>
                                       <div className="flex gap-3">
                                          {r.analise_erros && r.analise_erros.length > 0 && (
                                             <button
                                                onClick={() => {
                                                   const key = `diag-${r.id}`;
                                                   setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest active:scale-95 ${openGroups[`diag-${r.id}`] ? 'bg-purple-600 text-white border-transparent' : 'bg-purple-600/10 text-purple-400 border-purple-600/20 hover:bg-purple-600/20'}`}
                                             >
                                                <Zap size={14} /> {openGroups[`diag-${r.id}`] ? 'Ocultar' : 'Ver'} Diagnóstico IA
                                             </button>
                                          )}
                                          <button onClick={() => openEditModal(r)} className="p-3 bg-[hsl(var(--bg-user-block))] rounded-xl text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--border))] transition-all active:scale-95"><Edit size={18} /></button>
                                          <button onClick={() => handleDelete(r.id)} className="p-3 bg-[hsl(var(--bg-user-block))] rounded-xl text-[hsl(var(--text-muted))] hover:text-red-400 hover:bg-red-500/10 border border-[hsl(var(--border))] transition-all active:scale-95"><Trash2 size={18} /></button>
                                       </div>
                                    </div>

                                    {/* NOVO: DIAGNÓSTICO IA EXPANSÍVEL */}
                                    {openGroups[`diag-${r.id}`] && r.analise_erros && (
                                       <div className="w-full mt-6 pt-6 border-t border-[hsl(var(--border))] grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-500">
                                          {r.analise_erros.map((err, idx) => (
                                             <div key={idx} className="bg-black/20 border border-white/5 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${err.tipo_erro === 'Atenção' ? 'bg-yellow-500' :
                                                   err.tipo_erro === 'Interpretação' ? 'bg-blue-500' : 'bg-red-500'
                                                   }`} />
                                                <div className="flex justify-between items-start gap-3">
                                                   <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${err.tipo_erro === 'Atenção' ? 'bg-yellow-500/10 text-yellow-500' :
                                                      err.tipo_erro === 'Interpretação' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                                                      }`}>
                                                      {err.tipo_erro}
                                                   </span>
                                                   <span className="text-[9px] text-slate-500 font-bold italic line-clamp-1 flex-1">
                                                      "{err.questao_preview}..."
                                                   </span>
                                                </div>
                                                <div className="space-y-1.5">
                                                   <p className="text-[10px] text-slate-200 font-bold tracking-tight">
                                                      <span className="text-cyan-400 mr-2">🎯 GATILHO:</span> {err.gatilho}
                                                   </p>
                                                   <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                                                      <span className="text-green-400 mr-2">💡 AÇÃO:</span> {err.sugestao}
                                                   </p>
                                                   {err.sugestao_mentor && (
                                                      <p className="text-[9px] text-purple-400/80 font-black italic mt-2 border-t border-white/5 pt-2">
                                                         <span className="mr-1">👔 MENTOR:</span> {err.sugestao_mentor}
                                                      </p>
                                                   )}
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

         {/* Modal Edição - AGORA IGUAL AO STUDY FORM */}
         {editingRecord && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="glass w-full max-w-4xl rounded-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/10 relative">

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
                              <Clock size={12} /> Data & Tempo
                           </label>
                           <div className="flex gap-2">
                              <input type="date" className="flex-1 bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium" value={editForm.data_estudo} onChange={e => setEditForm({ ...editForm, data_estudo: e.target.value })} />
                              <input type="text" placeholder="HH:MM" maxLength={5} className="w-24 bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium text-center" value={editForm.tempoHHMM} onChange={handleTimeChange} />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                              <BookOpen size={12} /> Matéria
                           </label>
                           <CustomSelector
                              label="Matéria"
                              value={editForm.materia}
                              options={isSimuladoEdit ? ["Geral", ...materiasDisponiveis] : materiasDisponiveis}
                              onChange={(val) => setEditForm({ ...editForm, materia: val, assunto: '' })}
                              placeholder="Selecione a disciplina..."
                           />
                        </div>
                     </div>

                     {/* GRUPO 2: ASSUNTO (COM DROPDOWN CUSTOMIZADO) */}
                     <div className="space-y-2" ref={dropdownRef}>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                           <List size={12} /> Assunto / Tópico
                        </label>
                        <div className="relative">
                           <input
                              type="text"
                              className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium"
                              value={editForm.assunto}
                              onChange={e => setEditForm({ ...editForm, assunto: e.target.value })}
                              onClick={() => {
                                 if (!isSimuladoEdit && topicosDisponiveis.length > 0) setShowHistoryTopicsDropdown(true);
                              }}
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
                              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d26] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 backdrop-blur-3xl">
                                 <div
                                    onClick={() => { setEditForm({ ...editForm, assunto: '' }); setShowHistoryTopicsDropdown(false); }}
                                    className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-white/5 cursor-pointer border-b border-white/5 transition-all"
                                 >
                                    Limpar Seleção
                                 </div>
                                 {topicosDisponiveis.map((t, idx) => (
                                    <div
                                       key={idx}
                                       onClick={() => {
                                          setEditForm({ ...editForm, assunto: t });
                                          setShowHistoryTopicsDropdown(false);
                                       }}
                                       className={`px-6 py-4 text-xs font-bold transition-all border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer flex items-center gap-3 ${editForm.assunto === t ? 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]' : 'text-slate-300'}`}
                                    >
                                       <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${editForm.assunto === t ? 'bg-[hsl(var(--accent))] animate-pulse' : 'bg-slate-700'}`} />
                                       <span className="flex-1 leading-relaxed truncate">{t}</span>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>

                     {/* GRUPO 3: PERFORMANCE */}
                     <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block flex items-center gap-2">
                           <Target size={12} /> Desempenho
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                           <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">Acertos</span>
                              <input type="number" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-bold text-lg text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={editForm.acertos} onChange={e => setEditForm({ ...editForm, acertos: Number(e.target.value) })} />
                           </div>

                           <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">Total</span>
                              <input type="number" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-bold text-lg text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={editForm.total} onChange={e => setEditForm({ ...editForm, total: Number(e.target.value) })} />
                           </div>

                           <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">Meta</span>
                              <input type="text" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white font-bold text-lg text-center" value={editForm.meta} onChange={e => setEditForm({ ...editForm, meta: e.target.value })} placeholder="Ex: Meta 05" />
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
                                       onClick={() => setEditForm({ ...editForm, dificuldade: d as any })}
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
                                 onChange={(e) => setEditForm({ ...editForm, relevancia: parseInt(e.target.value) })}
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
                           onChange={(e) => setEditForm({ ...editForm, comentarios: e.target.value })}
                        />
                     </div>

                     {/* NOVO: ALGORITMO DE ERROS IA (RETROATIVO) */}
                     {!isSimuladoEdit && (
                        <div className="pt-6 border-t border-white/5 space-y-6">
                           <div className="flex items-center justify-between">
                              <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                 <Zap size={14} /> Algoritmo de Erros (IA)
                              </h5>
                              <div className="flex gap-2">
                                 <label className="cursor-pointer bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-cyan-500/20">
                                    {isAnalyzing ? '...' : 'Upload .txt'}
                                    <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} disabled={isAnalyzing} />
                                 </label>
                                 <button
                                    type="button"
                                    onClick={() => setEditForm(prev => ({ ...prev, analise_erros: [] }))}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 active:scale-95"
                                 >
                                    Limpar
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => {
                                       if (errorText.trim()) handleAnalyzeErrors(errorText);
                                       else setMsg({ type: 'error', text: 'Cole o texto do erro primeiro.' });
                                    }}
                                    disabled={isAnalyzing}
                                    className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-purple-600/20 active:scale-95"
                                 >
                                    Analisar Texto
                                 </button>
                              </div>
                           </div>

                           <textarea
                              className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all h-32 text-xs text-slate-400 font-bold placeholder-slate-700 resize-none"
                              placeholder="Cole aqui o texto da questão e seu erro para gerar um novo diagnóstico..."
                              value={errorText}
                              onChange={(e) => setErrorText(e.target.value)}
                           />

                           {editForm.analise_erros.length > 0 && (
                              <div className="space-y-4">
                                 {editForm.analise_erros.map((err, idx) => (
                                    <div key={idx} className="bg-slate-900/50 border border-white/5 rounded-xl p-4 space-y-3 relative overflow-hidden group">
                                       <div className={`absolute left-0 top-0 bottom-0 w-1 ${err.tipo_erro === 'Atenção' ? 'bg-yellow-500' :
                                          err.tipo_erro === 'Interpretação' ? 'bg-blue-500' : 'bg-red-500'
                                          }`} />
                                       <div className="flex justify-between items-start">
                                          <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${err.tipo_erro === 'Atenção' ? 'bg-yellow-500/10 text-yellow-500' :
                                             err.tipo_erro === 'Interpretação' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                                             }`}>
                                             {err.tipo_erro}
                                          </span>
                                          <button
                                             onClick={() => setEditForm(prev => ({ ...prev, analise_erros: prev.analise_erros.filter((_, i) => i !== idx) }))}
                                             className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                                          >
                                             <X size={14} />
                                          </button>
                                       </div>
                                       <div className="space-y-1">
                                          <p className="text-[10px] text-slate-200 font-bold tracking-tight line-clamp-1 opacity-60 italic">"{err.questao_preview}..."</p>

                                          {err.enunciado_completo && (
                                             <div className="bg-black/20 p-3 rounded-lg border border-white/5 my-2">
                                                <p className="text-[9px] text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">
                                                   {err.enunciado_completo}
                                                </p>
                                             </div>
                                          )}

                                          <p className="text-[10px] text-white font-bold tracking-tight">
                                             <span className="text-cyan-400 mr-2">🎯 GATILHO:</span> {err.gatilho}
                                          </p>
                                          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                                             <span className="text-green-400 mr-2">💡 AÇÃO:</span> {err.sugestao}
                                          </p>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     )}

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
         )
         }
      </div >
   );
};

export default History;