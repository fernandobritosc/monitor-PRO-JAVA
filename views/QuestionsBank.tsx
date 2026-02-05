import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Question, EditalMateria } from '../types';
import { Search, Trash2, Edit, ExternalLink, AlertOctagon, CheckCircle2, X } from 'lucide-react';

interface QuestionsBankProps {
  missaoAtiva: string;
  editais: EditalMateria[];
}

// Helper para pegar data local YYYY-MM-DD
const getLocalToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper para links
const formatTextWithLinks = (text: string | undefined) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 hover:decoration-cyan-300 transition-colors inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {part} <ExternalLink size={10} />
        </a>
      );
    }
    return part;
  });
};

const QuestionCard: React.FC<{ 
    q: Question;
    isExpanded: boolean;
    onToggle: (id: string) => void;
    onEdit: (q: Question) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: 'Pendente' | 'Em andamento' | 'Concluída') => void;
}> = ({ q, isExpanded, onToggle, onEdit, onDelete, onStatusChange }) => {
    
    const statusInfo = {
        'Pendente': { color: 'border-yellow-500', text: 'Pendente' },
        'Em andamento': { color: 'border-blue-500', text: 'Em Andamento' },
        'Concluída': { color: 'border-green-500', text: 'Concluída' },
    }[q.status];

    return (
        <div className={`glass rounded-2xl overflow-hidden border-l-4 transition-all duration-300 ${statusInfo.color} ${isExpanded ? 'bg-slate-900/50' : 'bg-transparent'}`}>
            <div className="p-5 cursor-pointer" onClick={() => onToggle(q.id)}>
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{q.materia}</span>
                            {q.simulado && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">{q.simulado}</span>}
                        </div>
                        <h4 className="text-lg font-bold text-white truncate">{q.assunto}</h4>
                    </div>
                    <div className="text-center ml-4">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Relevância</div>
                        <div className={`text-lg font-extrabold ${q.relevancia >= 8 ? 'text-red-400' : 'text-slate-300'}`}>{q.relevancia}</div>
                    </div>
                </div>
                {!isExpanded && q.tags?.length > 0 && (
                     <div className="flex flex-wrap gap-2 mt-3">
                        {q.tags.slice(0,3).map((tag, i) => (
                           <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded">{tag}</span>
                        ))}
                     </div>
                )}
            </div>
            
            {isExpanded && (
                <div className="bg-slate-900/50 border-t border-white/5 p-5 space-y-4 animate-in fade-in">
                    {q.anotacoes && (
                        <div>
                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Anotações / Link</h5>
                            <div className="prose prose-sm prose-invert prose-p:text-slate-300 prose-a:text-cyan-400 text-slate-300 whitespace-pre-wrap">
                                {formatTextWithLinks(q.anotacoes)}
                            </div>
                        </div>
                    )}
                    {q.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
                            {q.tags.map((tag, i) => (
                                <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded">{tag}</span>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-between items-center gap-4 pt-4 border-t border-white/10">
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(q)} className="p-2.5 bg-slate-800/50 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"><Edit size={16}/></button>
                            <button onClick={() => onDelete(q.id)} className="p-2.5 bg-slate-800/50 rounded-lg text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onStatusChange(q.id, 'Pendente')} className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 text-xs font-bold rounded-xl transition-all">
                                🔁 Revisar de Novo
                            </button>
                            <button onClick={() => onStatusChange(q.id, 'Concluída')} className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-300 text-xs font-bold rounded-xl transition-all">
                                ✅ Revisado
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const QuestionsBank: React.FC<QuestionsBankProps> = ({ missaoAtiva, editais }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMateria, setFilterMateria] = useState<string>('Todas');

  // Form States
  const initialFormState = {
    data: getLocalToday(), // Usar data local em vez de UTC
    materia: '',
    assunto: '',
    simulado: '',
    relevancia: 5,
    meta: 3, 
    anotacoes: '',
    tags: '',
    status: 'Pendente' as Question['status'],
  };

  const [formData, setFormData] = useState(initialFormState);

  const materiasDisponiveis = useMemo(() => ['Todas', ...editais.filter(e => e.concurso === missaoAtiva).map(e => e.materia).sort()], [editais, missaoAtiva]);
  
  const topicosDisponiveis = useMemo(() => {
     const edital = editais.find(e => e.concurso === missaoAtiva && e.materia === formData.materia);
     return edital ? [...edital.topicos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })) : [];
  }, [editais, missaoAtiva, formData.materia]);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('questoes_revisao')
      .select('*')
      .eq('user_id', user.id)
      .eq('concurso', missaoAtiva);

    if (error) {
      console.error('Erro ao buscar questões:', error);
      setLoading(false);
      return;
    }

    setQuestions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, [missaoAtiva]);

  // Filtrar questões com base nos filtros
  const reviewQueue = useMemo(() => {
    let filtered = questions;

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.materia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.anotacoes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por matéria
    if (filterMateria !== 'Todas') {
      filtered = filtered.filter(q => q.materia === filterMateria);
    }

    // Ordenar por relevância (maior primeiro) e data (mais recente primeiro)
    return filtered.sort((a, b) => {
      if (b.relevancia !== a.relevancia) {
        return Number(b.relevancia) - Number(a.relevancia);
      }
      const timeB = new Date(b.data).getTime();
      const timeA = new Date(a.data).getTime();
      return (timeB as number) - (timeA as number);
    });
  }, [questions, searchTerm, filterMateria]);

  // Calcular pontos fracos (matérias com mais questões pendentes)
  const weakPoints = useMemo(() => {
    const pendentes = questions.filter(q => q.status === 'Pendente');
    const grouped = pendentes.reduce((acc, q) => {
      const current = acc[q.materia] || 0;
      acc[q.materia] = current + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([materia, count]) => ({ materia, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Top 3 pontos fracos
  }, [questions]);

  const handleEdit = (q: Question) => {
    setIsEditing(q.id);
    setFormData({
      data: q.data,
      materia: q.materia,
      assunto: q.assunto,
      simulado: q.simulado || '',
      relevancia: q.relevancia,
      meta: q.meta || 3,
      anotacoes: q.anotacoes || '',
      tags: Array.isArray(q.tags) ? q.tags.join(', ') : '',
      status: q.status,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(null);
    setFormData(initialFormState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user || !isEditing) return;

    if (!formData.materia && !formData.simulado) {
      alert("Validação: Preencha a Matéria OU identifique o Simulado.");
      return;
    }
    
    const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

    const questionPayload = {
      user_id: user.id,
      concurso: missaoAtiva,
      data: formData.data,
      materia: formData.materia || 'Simulado',
      assunto: formData.assunto,
      simulado: formData.simulado,
      relevancia: formData.relevancia,
      meta: formData.meta,
      anotacoes: formData.anotacoes,
      status: formData.status,
      tags: tagsArray
    };

    const { error } = await supabase
      .from('questoes_revisao')
      .update(questionPayload)
      .eq('id', isEditing);

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      handleCancel();
      fetchQuestions();
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Tem certeza que deseja excluir esta questão do banco?")) return;
    await supabase.from('questoes_revisao').delete().eq('id', id);
    fetchQuestions();
  };

  const handleStatusChange = async (id: string, newStatus: 'Pendente' | 'Em andamento' | 'Concluída') => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
    await supabase.from('questoes_revisao').update({ status: newStatus }).eq('id', id);
  };
  
  const toggleCard = (id: string) => {
      setExpandedCards(prev => ({...prev, [id]: !prev[id]}));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
           Banco de Questões Inteligente
        </h2>
        <p className="text-slate-400 text-sm mt-1">
           Repositório de falhas e questões chave, priorizado para você.
        </p>
      </div>

      {/* Radar de Fraquezas */}
      <div className="glass p-6 rounded-2xl border border-white/5">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-red-400 mb-4">
           <AlertOctagon size={16} /> Radar de Fraquezas
        </h3>
        {weakPoints.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {weakPoints.map(p => (
                  <div key={p.materia} className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                     <div className="font-bold text-white truncate">{p.materia}</div>
                     <div className="text-xs text-red-300">{p.count} questões pendentes</div>
                  </div>
               ))}
            </div>
        ) : (
            <div className="text-center py-4">
               <CheckCircle2 size={24} className="mx-auto text-green-500 mb-2"/>
               <p className="text-sm font-bold text-slate-300">Nenhum ponto crítico detectado.</p>
               <p className="text-xs text-slate-500">Continue estudando para manter tudo em dia!</p>
            </div>
        )}
      </div>

      {/* Formulário (Edit Only) */}
      {showForm && (
        <div className="glass p-8 rounded-3xl border border-white/10 animate-in slide-in-from-top-4 relative">
          <button onClick={handleCancel} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
          <h3 className="font-bold mb-6 flex items-center gap-2 text-xl"><Edit className="text-cyan-400" /> Editar Questão</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400">Matéria</label>
                  <select 
                    className="w-full bg-slate-900 p-2 rounded-lg border border-white/5 mt-1" 
                    value={formData.materia} 
                    onChange={e => setFormData({...formData, materia: e.target.value})}
                  >
                    <option value="">Selecione</option>
                    {editais
                      .filter(e => e.concurso === missaoAtiva)
                      .map(e => e.materia)
                      .sort()
                      .map(m => <option key={m}>{m}</option>)
                    }
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Assunto</label>
                  <input 
                    type="text" 
                    list="topicos-list" 
                    className="w-full bg-slate-900 p-2 rounded-lg border border-white/5 mt-1" 
                    value={formData.assunto} 
                    onChange={e => setFormData({...formData, assunto: e.target.value})} 
                  />
                  <datalist id="topicos-list">
                    {topicosDisponiveis.map(t => <option key={t} value={t}/>)}
                  </datalist>
                </div>
             </div>
             <div>
               <label className="text-xs text-slate-400">Anotações / Link</label>
               <textarea 
                 className="w-full bg-slate-900 p-2 rounded-lg border border-white/5 mt-1 h-24" 
                 value={formData.anotacoes} 
                 onChange={e => setFormData({...formData, anotacoes: e.target.value})} 
               />
             </div>
             <div className="grid grid-cols-3 gap-4">
                 <div>
                   <label className="text-xs text-slate-400">Relevância: {formData.relevancia}</label>
                   <input 
                     type="range" 
                     min="1" 
                     max="10" 
                     className="w-full mt-1 accent-cyan-500" 
                     value={formData.relevancia} 
                     onChange={e => setFormData({...formData, relevancia: Number(e.target.value)})} 
                   />
                 </div>
                 <div>
                   <label className="text-xs text-slate-400">Status</label>
                   <select 
                     className="w-full bg-slate-900 p-2 rounded-lg border border-white/5 mt-1" 
                     value={formData.status} 
                     onChange={e => setFormData({...formData, status: e.target.value as Question['status']})}
                   >
                     <option>Pendente</option>
                     <option>Em andamento</option>
                     <option>Concluída</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-xs text-slate-400">Tags</label>
                   <input 
                     type="text" 
                     placeholder="erro, lei, jurisprudência" 
                     className="w-full bg-slate-900 p-2 rounded-lg border border-white/5 mt-1" 
                     value={formData.tags} 
                     onChange={e => setFormData({...formData, tags: e.target.value})} 
                   />
                 </div>
             </div>
             <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
               <button 
                 type="button" 
                 onClick={handleCancel} 
                 className="px-4 py-2 rounded-lg border border-white/10 text-sm font-bold"
               >
                 Cancelar
               </button>
               <button 
                 type="submit" 
                 className="px-4 py-2 rounded-lg bg-cyan-600 text-sm font-bold"
               >
                 Salvar
               </button>
             </div>
          </form>
        </div>
      )}

      {/* Fila de Revisão */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <h3 className="text-xl font-bold">Fila de Revisão ({reviewQueue.length})</h3>
            <div className="flex gap-2 items-center w-full md:w-auto">
               <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                   <input 
                     type="text" 
                     placeholder="Filtrar na fila..." 
                     className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm" 
                     value={searchTerm} 
                     onChange={e => setSearchTerm(e.target.value)} 
                   />
               </div>
               <select 
                 className="bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm" 
                 value={filterMateria} 
                 onChange={e => setFilterMateria(e.target.value)}
               >
                  {materiasDisponiveis.map(m => <option key={m}>{m}</option>)}
               </select>
            </div>
        </div>
        
        <div className="space-y-4">
            {loading ? (
                <p className="text-center text-slate-500 py-10">Carregando...</p>
            ) : reviewQueue.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                    <p className="font-bold">Nenhuma questão encontrada para os filtros atuais.</p>
                </div>
            ) : (
                reviewQueue.map(q => (
                    <QuestionCard 
                        key={q.id}
                        q={q}
                        isExpanded={!!expandedCards[q.id]}
                        onToggle={toggleCard}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                    />
                ))
            )}
        </div>
      </div>
    </div>
  );
};
// teste de push