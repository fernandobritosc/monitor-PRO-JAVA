
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Question, EditalMateria } from '../types';
import { Search, Trash2, Edit, ExternalLink, Clock, Target, Zap, X } from 'lucide-react';

interface QuestionsBankProps {
  missaoAtiva: string;
  editais: EditalMateria[];
}

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

const QuestionsBank: React.FC<QuestionsBankProps> = ({ missaoAtiva, editais }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterRelevancia, setFilterRelevancia] = useState<number>(0);

  // Form States
  const initialFormState = {
    data: new Date().toISOString().split('T')[0],
    materia: '',
    assunto: '',
    simulado: '',
    relevancia: 5,
    meta: 3, 
    tempoHHMM: '', // Tempo gasto real
    acertos: 0,
    total: 0,
    anotacoes: '',
    tags: '',
    status: 'Pendente' as Question['status'],
    saveToHistory: false
  };

  const [formData, setFormData] = useState(initialFormState);

  const materiasDisponiveis = editais.filter(e => e.concurso === missaoAtiva).map(e => e.materia);
  
  // Lista de tópicos baseada na matéria selecionada
  const topicosDisponiveis = useMemo(() => {
     const edital = editais.find(e => e.concurso === missaoAtiva && e.materia === formData.materia);
     return edital ? edital.topicos : [];
  }, [editais, missaoAtiva, formData.materia]);

  const fetchQuestions = async () => {
    setLoading(true);
    // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'getUser' property.
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('questoes_revisao')
      .select('*')
      .eq('user_id', user.id)
      .eq('concurso', missaoAtiva)
      .order('data', { ascending: false });

    if (error) {
      console.error('Erro ao buscar questões:', error);
    } else {
      setQuestions((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, [missaoAtiva]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const total = questions.length;
    const done = questions.filter(q => q.status === 'Concluída').length;
    const pending = questions.filter(q => q.status === 'Pendente').length;
    const highPriority = questions.filter(q => q.relevancia >= 8 && q.status !== 'Concluída').length;
    return { total, done, pending, highPriority };
  }, [questions]);

  // Helper de Tempo (HH:MM -> Minutos)
  const validateTimeInput = (val: string): number | null => {
    if (!val) return 0;
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 0) return 0;

    let hours = 0;
    let minutes = 0;

    if (cleaned.length <= 2) {
       minutes = parseInt(cleaned);
    } else if (cleaned.length === 3) {
       hours = parseInt(cleaned.substring(0, 1));
       minutes = parseInt(cleaned.substring(1));
    } else if (cleaned.length === 4) {
       hours = parseInt(cleaned.substring(0, 2));
       minutes = parseInt(cleaned.substring(2));
    } else {
        return null; 
    }

    if (minutes > 59) return null;
    return hours * 60 + minutes;
  };

  // Helper inverso (Minutos -> HH:MM string)
  const minutesToHHMM = (mins: number | undefined) => {
    if (!mins && mins !== 0) return '';
    if (mins === 0) return '';
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
    setFormData({...formData, tempoHHMM: value});
  };

  const handleEdit = (question: Question) => {
    setFormData({
      ...initialFormState,
      data: question.data,
      materia: question.materia,
      assunto: question.assunto,
      simulado: question.simulado || '',
      relevancia: question.relevancia,
      meta: question.meta || 0,
      tempoHHMM: minutesToHHMM(question.tempo),
      acertos: question.acertos || 0,
      total: question.total || 0,
      anotacoes: question.anotacoes || '',
      tags: question.tags ? question.tags.join(', ') : '',
      status: question.status,
      saveToHistory: false
    });
    setIsEditing(question.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(null);
    setFormData(initialFormState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'getUser' property.
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) return;

    // 1. VALIDAÇÃO: Campos Obrigatórios
    if (!formData.materia && !formData.simulado) {
      alert("Validação: Preencha a Matéria OU identifique o Simulado de origem.");
      return;
    }
    if (formData.relevancia < 1 || formData.relevancia > 10) {
      alert("Validação: A relevância deve ser entre 1 e 10.");
      return;
    }
    
    // 2. VALIDAÇÃO: Tempo
    const tempoCalculado = validateTimeInput(formData.tempoHHMM);
    if (tempoCalculado === null) {
      alert("Validação: Formato de tempo inválido. Use HH:MM (ex: 01:30 para 1h30m).");
      return;
    }

    // 3. VALIDAÇÃO: Acertos vs Total
    if (formData.total > 0 && formData.acertos > formData.total) {
      alert("Validação: O número de acertos não pode ser maior que o total.");
      return;
    }

    const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

    // Payload para o Banco de Questões
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

    let error;

    if (isEditing) {
      // UPDATE
      const { error: updateError } = await supabase
        .from('questoes_revisao')
        .update(questionPayload)
        .eq('id', isEditing);
      error = updateError;
    } 
    // REMOVIDO: Opção de INSERT via este form, pois a criação foi unificada no Registrar.

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

  const handleStatusChange = async (id: string, newStatus: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: newStatus as any } : q));
    await supabase.from('questoes_revisao').update({ status: newStatus }).eq('id', id);
    fetchQuestions(); 
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = 
      q.assunto.toLowerCase().includes(searchTerm.toLowerCase()) || 
      q.materia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.anotacoes && q.anotacoes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.tags && q.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesStatus = filterStatus === 'Todos' || q.status === filterStatus;
    const matchesRelevancia = q.relevancia >= filterRelevancia;

    return matchesSearch && matchesStatus && matchesRelevancia;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      
      {/* Header e Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
             Banco de Questões
          </h2>
          <p className="text-slate-400 text-sm mt-1">
             Repositório inteligente de falhas e questões chaves.
          </p>
        </div>
        {/* Botão de Nova Questão Removido - Unificado no Registrar */}
      </div>

      {/* Painel de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-2xl border-b-4 border-purple-500">
           <div className="text-xs text-slate-500 uppercase font-bold tracking-widest">Total</div>
           <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="glass p-4 rounded-2xl border-b-4 border-yellow-500">
           <div className="text-xs text-slate-500 uppercase font-bold tracking-widest">Pendentes</div>
           <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
        </div>
        <div className="glass p-4 rounded-2xl border-b-4 border-red-500">
           <div className="text-xs text-slate-500 uppercase font-bold tracking-widest">Alta Prioridade</div>
           <div className="text-2xl font-bold text-red-400">{stats.highPriority}</div>
        </div>
        <div className="glass p-4 rounded-2xl border-b-4 border-green-500">
           <div className="text-xs text-slate-500 uppercase font-bold tracking-widest">Concluídas</div>
           <div className="text-2xl font-bold text-green-400">{stats.done}</div>
        </div>
      </div>

      {/* Formulário (Edit Only) */}
      {showForm && (
        <div className="glass p-8 rounded-3xl border border-white/10 animate-in slide-in-from-top-4 relative">
          <button onClick={handleCancel} className="absolute top-4 right-4 text-slate-500 hover:text-white">
             <X size={20} />
          </button>
          
          <h3 className="font-bold mb-6 flex items-center gap-2 text-xl">
             <Edit className="text-cyan-400" /> Editar Questão
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
                 <input type="date" className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-purple-500/50 outline-none" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} required />
               </div>
               
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase">Matéria</label>
                 <select 
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-purple-500/50 outline-none" 
                    value={formData.materia} 
                    onChange={e => setFormData({...formData, materia: e.target.value, assunto: ''})}
                 >
                    <option value="">Selecione...</option>
                    {materiasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
                 </select>
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Assunto / Tópico</label>
                  <input 
                    type="text" 
                    list="topicos-list"
                    placeholder="Busque ou digite..." 
                    className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-purple-500/50 outline-none" 
                    value={formData.assunto} 
                    onChange={e => setFormData({...formData, assunto: e.target.value})} 
                    required 
                  />
                  <datalist id="topicos-list">
                    {topicosDisponiveis.map((t, idx) => (
                      <option key={idx} value={t} />
                    ))}
                  </datalist>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Origem / Simulado</label>
                  <input type="text" placeholder="Ex: QConcursos..." className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-purple-500/50 outline-none" value={formData.simulado} onChange={e => setFormData({...formData, simulado: e.target.value})} />
               </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tempo Gasto</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="HH:MM"
                      maxLength={5}
                      className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-purple-500/50 outline-none text-center" 
                      value={formData.tempoHHMM} 
                      onChange={handleTimeChange} 
                    />
                    <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                     <span>Relevância</span>
                     <span className={`text-xs ${formData.relevancia > 7 ? 'text-red-400' : 'text-slate-400'}`}>{formData.relevancia}/10</span>
                  </label>
                  <input type="range" min="1" max="10" className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" value={formData.relevancia} onChange={e => setFormData({...formData, relevancia: parseInt(e.target.value)})} />
               </div>
            </div>
            
            <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
               <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Target size={12}/> Acertos</label>
                     <input 
                        type="number"
                        className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-green-500/50 outline-none font-bold text-green-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        value={formData.acertos} 
                        onChange={e => setFormData({...formData, acertos: parseInt(e.target.value) || 0})} 
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Target size={12}/> Total</label>
                     <input 
                        type="number" 
                        className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-purple-500/50 outline-none font-bold text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        value={formData.total} 
                        onChange={e => setFormData({...formData, total: parseInt(e.target.value) || 0})} 
                     />
                  </div>
               </div>
               
               <div className="flex flex-col items-center justify-center p-2">
                  <span className="text-xs font-bold text-slate-500 uppercase mb-1">Aproveitamento</span>
                  <div className={`text-3xl font-black ${formData.total > 0 && (formData.acertos/formData.total) > 0.8 ? 'text-green-400' : 'text-slate-400'}`}>
                     {formData.total > 0 ? ((formData.acertos/formData.total)*100).toFixed(0) : 0}%
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tags</label>
                  <input type="text" placeholder="erro, revisão, lei seca..." className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-purple-500/50 outline-none" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Meta de Revisão (min)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 3 min (tempo alvo p/ reler)" 
                    className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-purple-500/50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    value={formData.meta} 
                    onChange={e => setFormData({...formData, meta: parseInt(e.target.value)})} 
                  />
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase">Anotações / Link da Questão</label>
               <textarea placeholder="Cole o link da questão aqui ou escreva o motivo do erro..." className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 w-full h-32 focus:ring-2 focus:ring-purple-500/50 outline-none" value={formData.anotacoes} onChange={e => setFormData({...formData, anotacoes: e.target.value})} />
            </div>

            <div className="flex flex-col md:flex-row justify-end items-center gap-4 border-t border-white/10 pt-4">
               <div className="flex gap-3 w-full md:w-auto">
                  <button type="button" onClick={handleCancel} className="flex-1 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-bold transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all">
                      Salvar Alterações
                  </button>
               </div>
            </div>
          </form>
        </div>
      )}

      {/* Barra de Ferramentas / Filtros */}
      <div className="glass rounded-3xl p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex-1 w-full bg-slate-900/30 p-2 rounded-xl border border-white/5 flex items-center gap-2">
            <Search className="text-slate-500 ml-2" size={18} />
            <input 
               type="text" 
               placeholder="Buscar em assuntos, tags ou anotações..." 
               className="bg-transparent border-none focus:ring-0 text-white w-full h-full outline-none text-sm placeholder-slate-500"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         
         <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             <select 
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold uppercase text-slate-400 focus:outline-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
             >
                <option value="Todos">Status: Todos</option>
                <option value="Pendente">Pendentes</option>
                <option value="Em andamento">Em Andamento</option>
                <option value="Concluída">Concluídas</option>
             </select>

             <select 
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold uppercase text-slate-400 focus:outline-none"
                value={filterRelevancia}
                onChange={(e) => setFilterRelevancia(Number(e.target.value))}
             >
                <option value={0}>Prioridade: Todas</option>
                <option value={5}>Média (5+)</option>
                <option value={8}>Alta (8+)</option>
             </select>
         </div>
      </div>

      {/* Lista de Questões */}
      {loading ? (
        <div className="text-center py-20">
           <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
           <p className="text-slate-500">Carregando seu banco...</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-20 opacity-50">
           <div className="text-6xl mb-4">📭</div>
           <p className="text-slate-400">Nenhuma questão encontrada com estes filtros.</p>
        </div>
      ) : (
        <div className="space-y-4">
           {filteredQuestions.map(q => (
              <div key={q.id} className={`glass rounded-2xl p-6 border-l-4 transition-all group ${q.status === 'Concluída' ? 'border-green-500 opacity-70 hover:opacity-100' : q.relevancia >= 8 ? 'border-red-500' : 'border-purple-500'}`}>
                 <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                    <div className="flex-1">
                       <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${q.status === 'Concluída' ? 'bg-green-500/20 text-green-400' : q.status === 'Em andamento' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-300'}`}>
                             {q.status}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-1 rounded">
                             {new Date(q.data).toLocaleDateString('pt-BR')}
                          </span>
                          {q.simulado && (
                             <span className="text-[10px] text-cyan-400 font-bold bg-cyan-900/20 px-2 py-1 rounded border border-cyan-500/20">
                                📝 {q.simulado}
                             </span>
                          )}
                          {/* Display de Performance no Card */}
                          {q.total !== undefined && q.total > 0 && (
                             <span className="text-[10px] text-white font-bold bg-slate-800 px-2 py-1 rounded flex items-center gap-1 border border-white/5">
                                <Zap size={10} className="text-yellow-400" />
                                {q.acertos}/{q.total} ({(q.acertos!/q.total!*100).toFixed(0)}%)
                             </span>
                          )}
                       </div>
                       <h4 className="text-lg font-bold text-white mb-1">{q.materia}</h4>
                       <p className="text-sm text-slate-300 font-medium">{q.assunto}</p>
                    </div>

                    <div className="flex items-center gap-3">
                       <div className="text-right hidden md:block">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">Relevância</div>
                          <div className={`font-bold ${q.relevancia >= 8 ? 'text-red-400' : 'text-slate-300'}`}>{q.relevancia}/10</div>
                       </div>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(q)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors" title="Editar">
                             <Edit size={16} />
                          </button>
                          <button onClick={() => handleDelete(q.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors" title="Excluir">
                             <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                 </div>

                 {q.anotacoes && (
                    <div className="bg-slate-900/50 p-4 rounded-xl text-sm text-slate-400 italic mb-4 border border-white/5 whitespace-pre-wrap">
                       {formatTextWithLinks(q.anotacoes)}
                    </div>
                 )}

                 <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2">
                       {q.tags?.map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-400 font-bold">#{tag}</span>
                       ))}
                       {q.meta > 0 && (
                          <span className="text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-400 font-bold flex items-center gap-1">
                             <Clock size={10} /> Meta de Rev: {q.meta}min
                          </span>
                       )}
                       {q.tempo && q.tempo > 0 && (
                          <span className="text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-400 font-bold flex items-center gap-1">
                             <Clock size={10} className="text-cyan-400"/> Gasto: {Math.floor(q.tempo/60)}h{q.tempo%60}m
                          </span>
                       )}
                    </div>
                    
                    <div className="flex bg-slate-900 rounded-lg p-1 gap-1">
                       {/* Added type="button" for explicit button behavior. */}
                       <button 
                        type="button"
                        onClick={() => handleStatusChange(q.id, 'Pendente')} 
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${q.status === 'Pendente' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}
                       >
                          Pendente
                       </button>
                       {/* Added type="button" for explicit button behavior. */}
                       <button 
                        type="button"
                        onClick={() => handleStatusChange(q.id, 'Em andamento')} 
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${q.status === 'Em andamento' ? 'bg-yellow-600 text-white' : 'text-slate-500 hover:text-yellow-400'}`}
                       >
                          Andamento
                       </button>
                       {/* Added type="button" for explicit button behavior. */}
                       <button 
                        type="button"
                        onClick={() => handleStatusChange(q.id, 'Concluída')} 
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${q.status === 'Concluída' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-green-400'}`}
                       >
                          Concluída
                       </button>
                    </div>
                 </div>
              </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default QuestionsBank;
