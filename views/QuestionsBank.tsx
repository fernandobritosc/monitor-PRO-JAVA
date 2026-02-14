import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Question, EditalMateria } from '../types';
import { Search, Trash2, Edit, ExternalLink, AlertOctagon, CheckCircle2, X, ChevronDown, ChevronUp, FileText, Target, Zap, Layers, Clock } from 'lucide-react';

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
    'Pendente': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', accent: 'bg-yellow-500' },
    'Em andamento': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', accent: 'bg-blue-500' },
    'Concluída': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', accent: 'bg-green-500' },
  }[q.status];

  return (
    <div className={`glass-premium rounded-[2rem] overflow-hidden border transition-all duration-500 group ${isExpanded ? `border-[hsl(var(--accent)/0.4)] shadow-2xl` : 'border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.2)]'}`}>
      <div className="p-6 cursor-pointer" onClick={() => onToggle(q.id)}>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-2 h-2 rounded-full ${statusInfo.accent} shadow-[0_0_8px_${statusInfo.accent.replace('bg-', '')}CC] animate-pulse`}></div>
              <span className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">{q.materia}</span>
              {q.simulado && (
                <span className="text-[9px] font-black bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] px-3 py-1 rounded-full border border-[hsl(var(--accent)/0.2)] uppercase tracking-widest">
                  {q.simulado}
                </span>
              )}
            </div>
            <h4 className={`text-xl font-black uppercase tracking-tighter transition-colors duration-300 ${isExpanded ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-bright))] group-hover:text-[hsl(var(--accent))]'}`}>
              {q.assunto}
            </h4>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mb-1">Impacto</div>
            <div className={`text-2xl font-black tracking-tighter ${q.relevancia >= 8 ? 'text-red-400' : 'text-[hsl(var(--text-bright))]'}`}>
              {q.relevancia}<span className="text-xs opacity-30">/10</span>
            </div>
          </div>
        </div>
        {!isExpanded && q.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {q.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[9px] font-black bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] px-3 py-1.5 rounded-xl border border-[hsl(var(--border))] uppercase tracking-widest">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="bg-black/5 border-t border-[hsl(var(--border))] p-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
          {q.anotacoes && (
            <div className="space-y-3">
              <h5 className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] flex items-center gap-2">
                <FileText size={14} className="text-[hsl(var(--accent))]" /> Anotações Contextuais
              </h5>
              <div className="bg-[hsl(var(--bg-user-block))] p-6 rounded-2xl border border-[hsl(var(--border))] text-sm font-bold text-[hsl(var(--text-main))] leading-relaxed whitespace-pre-wrap">
                {formatTextWithLinks(q.anotacoes)}
              </div>
            </div>
          )}
          {q.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-6 border-t border-[hsl(var(--border))]">
              {q.tags.map((tag, i) => (
                <span key={i} className="text-[9px] font-black bg-[hsl(var(--bg-card))] text-[hsl(var(--text-bright))] px-4 py-2 rounded-full border border-[hsl(var(--border))] uppercase tracking-[0.15em]">{tag}</span>
              ))}
            </div>
          )}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-[hsl(var(--border))]">
            <div className="flex gap-4 w-full md:w-auto">
              <button onClick={() => onEdit(q)} className="flex-1 md:flex-none p-4 bg-[hsl(var(--bg-user-block))] rounded-2xl text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] hover:border-[hsl(var(--accent)/0.3)] transition-all border border-[hsl(var(--border))] active:scale-95"><Edit size={20} /></button>
              <button onClick={() => onDelete(q.id)} className="flex-1 md:flex-none p-4 bg-[hsl(var(--bg-user-block))] rounded-2xl text-[hsl(var(--text-muted))] hover:text-red-400 hover:border-red-500/30 transition-all border border-[hsl(var(--border))] active:scale-95"><Trash2 size={20} /></button>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button onClick={() => onStatusChange(q.id, 'Pendente')} className="flex-1 px-8 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-yellow-500/10 text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-[hsl(var(--border))] hover:border-yellow-500/30 transition-all active:scale-95">
                Reciclar Erro
              </button>
              <button onClick={() => onStatusChange(q.id, 'Concluída')} className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-500 text-[hsl(var(--bg-main))] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-green-500/20 transition-all hover:scale-105 active:scale-95">
                Dominado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionsBank: React.FC<QuestionsBankProps> = ({ missaoAtiva, editais }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMateria, setFilterMateria] = useState<string>('Todas');

  // Custom Dropdown State
  const [showTopicsDropdown, setShowTopicsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTopicsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        (q.anotacoes && q.anotacoes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtrar por matéria
    if (filterMateria !== 'Todas') {
      filtered = filtered.filter(q => q.materia === filterMateria);
    }

    // Ordenar por relevância (maior primeiro) e data (mais recente primeiro)
    return [...filtered].sort((a: Question, b: Question) => {
      // FIX: The 'relevancia' property might not be a number at runtime.
      // This ensures values are properly converted before subtraction.
      const relDiff = (Number(b.relevancia) || 0) - (Number(a.relevancia) || 0);
      if (relDiff !== 0) {
        return relDiff;
      }

      const timeB = new Date(b.data).getTime();
      const timeA = new Date(a.data).getTime();

      // Handle potential invalid dates which result in NaN
      const valB = isNaN(timeB) ? 0 : timeB;
      const valA = isNaN(timeA) ? 0 : timeA;

      return valB - valA;
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
    if (!confirm("Tem certeza que deseja excluir esta questão do banco?")) return;
    await supabase.from('questoes_revisao').delete().eq('id', id);
    fetchQuestions();
  };

  const handleStatusChange = async (id: string, newStatus: 'Pendente' | 'Em andamento' | 'Concluída') => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
    await supabase.from('questoes_revisao').update({ status: newStatus }).eq('id', id);
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
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
      <div className="glass-premium p-8 rounded-[2.5rem] border border-[hsl(var(--border))] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--accent)/0.05)] blur-3xl rounded-full"></div>
        <h3 className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.25em] text-red-400 mb-8">
          <AlertOctagon size={18} className="animate-pulse" /> Zonas de Perigo (Fraquezas)
        </h3>
        {weakPoints.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {weakPoints.map((p, idx) => (
              <div key={p.materia} className="glass-premium bg-red-500/5 p-6 rounded-[1.5rem] border border-red-500/20 shadow-xl transition-transform hover:scale-[1.05] duration-500">
                <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Ponto Crítico #{idx + 1}</div>
                <div className="font-black text-xl text-[hsl(var(--text-bright))] uppercase tracking-tighter truncate leading-tight">{p.materia}</div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                  <div className="text-[10px] font-black text-red-300 uppercase tracking-widest">{p.count} Falhas Mapeadas</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-2xl shadow-green-500/10">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <p className="text-xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter">Domínio Total em Campo</p>
            <p className="text-[10px] text-[hsl(var(--text-muted))] font-black uppercase tracking-[0.2em] mt-3">Nenhum ponto crítico detectado nesta missão.</p>
          </div>
        )}
      </div>

      {/* Formulário (Edit Only) */}
      {showForm && (
        <div className="glass-premium p-10 rounded-[2.5rem] border border-[hsl(var(--accent)/0.3)] shadow-[0_0_50px_rgba(var(--accent-rgb),0.1)] animate-in slide-in-from-top-6 duration-700 relative z-50">
          <button onClick={handleCancel} className="absolute top-8 right-8 p-2 bg-[hsl(var(--bg-user-block))] rounded-xl text-[hsl(var(--text-muted))] hover:text-white transition-all active:scale-95"><X size={20} /></button>

          <div className="flex items-center gap-5 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center shadow-xl text-white">
              <Edit size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))]">Aperfeiçoar Questão</h3>
              <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">Refinar metadados e anotações estratégicas</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <Layers size={14} className="text-[hsl(var(--accent))]" /> Matéria Principal
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-6 py-4 text-sm font-bold text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] transition-all cursor-pointer"
                    value={formData.materia}
                    onChange={e => setFormData({ ...formData, materia: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {editais
                      .filter(e => e.concurso === missaoAtiva)
                      .map(e => e.materia)
                      .sort()
                      .map(m => <option key={m} className="bg-[hsl(var(--bg-sidebar))]">{m}</option>)
                    }
                  </select>
                  <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] pointer-events-none" />
                </div>
              </div>
              <div className="space-y-3" ref={dropdownRef}>
                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <Target size={14} className="text-[hsl(var(--accent))]" /> Assunto Específico
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-6 py-4 text-sm font-bold text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] transition-all placeholder-[hsl(var(--text-muted)/0.5)]"
                    value={formData.assunto}
                    onChange={e => setFormData({ ...formData, assunto: e.target.value })}
                    onClick={() => {
                      if (topicosDisponiveis.length > 0) setShowTopicsDropdown(true);
                    }}
                    placeholder="Ex: Princípios de Direito Administrativo"
                  />
                  {topicosDisponiveis.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowTopicsDropdown(!showTopicsDropdown)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-1 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))]"
                    >
                      {showTopicsDropdown ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  )}
                  {showTopicsDropdown && topicosDisponiveis.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-[hsl(var(--bg-sidebar))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-4 backdrop-blur-3xl">
                      {topicosDisponiveis.map((t, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, assunto: t }));
                            setShowTopicsDropdown(false);
                          }}
                          className="px-6 py-4 text-sm font-bold text-[hsl(var(--text-main))] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))] cursor-pointer border-b border-[hsl(var(--border))] last:border-0 transition-all"
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                <FileText size={14} className="text-[hsl(var(--accent))]" /> Anotações e Insights Estratégicos
              </label>
              <textarea
                className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-3xl px-6 py-4 text-sm font-bold text-[hsl(var(--text-main))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] transition-all h-32 placeholder-[hsl(var(--text-muted)/0.5)] resize-none"
                placeholder="Descreva por que errou ou o que é fundamental lembrar aqui..."
                value={formData.anotacoes}
                onChange={e => setFormData({ ...formData, anotacoes: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex justify-between">
                  <span>Relevância</span>
                  <span className="text-[hsl(var(--accent))]">{formData.relevancia}/10</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  className="w-full h-2 bg-[hsl(var(--bg-user-block))] rounded-full appearance-none cursor-pointer accent-[hsl(var(--accent))]"
                  value={formData.relevancia}
                  onChange={e => setFormData({ ...formData, relevancia: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Status da Revisão</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-xl px-6 py-4 text-sm font-bold text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] transition-all cursor-pointer"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as Question['status'] })}
                  >
                    <option value="Pendente">🔴 Pendente</option>
                    <option value="Em andamento">🔵 Em Andamento</option>
                    <option value="Concluída">🟢 Concluída</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] pointer-events-none" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Tags (Separar por Vírgula)</label>
                <input
                  type="text"
                  placeholder="erro, lei seco, pegadinha"
                  className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-xl px-6 py-4 text-sm font-bold text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] transition-all placeholder-[hsl(var(--text-muted)/0.5)]"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-6 pt-8 border-t border-[hsl(var(--border))]">
              <button
                type="button"
                onClick={handleCancel}
                className="px-8 py-4 rounded-xl border border-[hsl(var(--border))] text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-user-block))] hover:text-white transition-all active:scale-95"
              >
                Descartar Alterações
              </button>
              <button
                type="submit"
                className="px-10 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-[hsl(var(--bg-main))] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all hover:scale-[1.05] active:scale-95"
              >
                Confirmar Edição
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fila de Revisão */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-[hsl(var(--bg-user-block))] p-6 rounded-[2rem] border border-[hsl(var(--border))] shadow-xl">
          <h3 className="text-xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))]">
            Fila de Revisão <span className="text-[hsl(var(--accent))] ml-2 opacity-100">[{reviewQueue.length}]</span>
          </h3>
          <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] group-focus-within:text-[hsl(var(--accent))] transition-colors" size={20} />
              <input
                type="text"
                placeholder="Buscar erro estratégico..."
                className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] transition-all placeholder-[hsl(var(--text-muted)/0.5)]"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative w-full md:w-64">
              <select
                className="w-full appearance-none bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] transition-all cursor-pointer"
                value={filterMateria}
                onChange={e => setFilterMateria(e.target.value)}
              >
                {materiasDisponiveis.map(m => <option key={m} className="bg-[hsl(var(--bg-sidebar))]">{m}</option>)}
              </select>
              <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] pointer-events-none" />
            </div>
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

export default QuestionsBank;
