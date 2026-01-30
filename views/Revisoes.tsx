
import React, { useState, useMemo, useEffect } from 'react';
import { StudyRecord, EditalMateria } from '../types';
import { RefreshCcw, Calendar, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle, X, Filter, Search, SlidersHorizontal, Trash2, FileText, Target, Zap } from 'lucide-react';
import { supabase } from '../services/supabase';

interface RevisoesProps {
  records: StudyRecord[];
  missaoAtiva: string;
  editais: EditalMateria[];
  onUpdated: () => void;
}

// Tipo interno para gerenciar a revisão na UI
interface PendingReview extends StudyRecord {
  reviewType: '24h' | '07d' | '15d' | '30d';
  daysOverdue: number;
  reviewDate: Date;
}

// Helper para formatar links
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
          className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 hover:decoration-300 transition-colors break-all relative z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// Componente extraído para evitar re-renderização e perda de scroll (Fix tela pulando)
interface ReviewCardProps {
  item: PendingReview;
  isOverdue: boolean;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onComplete: (item: PendingReview) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ item, isOverdue, isExpanded, onToggle, onComplete }) => {
  const badgeColor = isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20';
  const typeLabel = { '24h': '24 Horas', '07d': '7 Dias', '15d': '15 Dias', '30d': '30 Dias' }[item.reviewType];

  // Verifica se deve mostrar botão de expandir (se texto longo ou tem anotações)
  const hasLongContent = item.assunto.length > 80;
  const hasNotes = !!item.comentarios && item.comentarios.trim().length > 0;
  const showExpandButton = hasLongContent || hasNotes;

  return (
    <div className={`glass rounded-xl p-4 border-l-2 transition-all hover:bg-white/[0.02] ${isOverdue ? 'border-red-500' : 'border-green-500'}`}> {/* Reduzido de 2xl p-5 border-l-4 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-2 items-center">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${badgeColor}`}>
            {isOverdue ? `Atrasado ${item.daysOverdue} dias` : 'Para Hoje'}
          </span>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">
            Rev. {typeLabel}
          </span>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Estudado em {new Date(item.data_estudo).toLocaleDateString('pt-BR')}
        </span>
      </div>

      <h4 className="text-lg font-bold text-white mb-1">{item.materia}</h4>
      
      <div className="relative">
        <p className={`text-sm text-slate-400 leading-relaxed transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
          {item.assunto}
        </p>

        {/* Seção de Anotações - Só aparece se expandido e se houver conteúdo */}
        {hasNotes && isExpanded && (
           <div className="mt-4 p-3 bg-slate-900/30 rounded-xl border border-white/5 animate-in fade-in"> {/* Ajustado de /50 */}
              <div className="flex items-center gap-2 mb-1 text-xs font-bold text-purple-400 uppercase tracking-wide">
                 <FileText size={12} /> Anotações
              </div>
              <p className="text-xs text-slate-300 italic whitespace-pre-wrap">
                {formatTextWithLinks(item.comentarios)}
              </p>
           </div>
        )}

        {showExpandButton && (
          <button 
            type="button" // Importante para não submeter formulários acidentalmente
            onClick={() => onToggle(item.id)}
            className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 flex items-center gap-1 font-bold"
          >
            {isExpanded ? (
              <><ChevronUp size={12}/> Recolher</>
            ) : (
              <><ChevronDown size={12}/> {hasNotes ? 'Ler tudo (+ anotações)' : 'Ler tudo'}</>
            )}
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
         <div className="text-xs text-slate-500">
            Relevância: <span className="text-yellow-500 font-bold">Nível {item.relevancia}</span>
         </div>
         <button 
          onClick={() => onComplete(item)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isOverdue ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white'}`}
         >
           <CheckCircle2 size={16} />
           Concluir
         </button>
      </div>
    </div>
  );
};

const Revisoes: React.FC<RevisoesProps> = ({ records, missaoAtiva, editais, onUpdated }) => {
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  
  // States do Modal de Conclusão
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [tempoHHMM, setTempoHHMM] = useState(''); // Input livre para tempo (HHMM)
  const [reviewQuestions, setReviewQuestions] = useState(0);
  const [reviewCorrect, setReviewCorrect] = useState(0);

  const [loading, setLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  
  // Filtros States
  const [showFilters, setShowFilters] = useState(false);
  const [filterMateria, setFilterMateria] = useState('');
  const [filterAssunto, setFilterAssunto] = useState('');
  const [filterRelevancia, setFilterRelevancia] = useState(1);

  // Lista de Matérias do Edital para o Dropdown
  const materiasOptions = useMemo(() => {
    return editais
      .filter(e => e.concurso === missaoAtiva)
      .map(e => e.materia)
      .sort();
  }, [editais, missaoAtiva]);

  // Reset do formulário ao abrir modal
  useEffect(() => {
    if (selectedReview) {
      setReviewDate(new Date().toISOString().split('T')[0]);
      setTempoHHMM('');
      setReviewQuestions(0);
      setReviewCorrect(0);
    }
  }, [selectedReview]);

  // Lógica de Processamento de Revisões
  const { overdue, today, upcomingCount, totalFiltered } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const pending: PendingReview[] = [];
    let future = 0;

    // Filtra registros do concurso ativo E REMOVE SIMULADOS
    const activeRecords = records.filter(r => 
      r.concurso === missaoAtiva && 
      r.dificuldade !== 'Simulado' && 
      r.materia !== 'SIMULADO'
    );

    activeRecords.forEach(r => {
      const studyDate = new Date(r.data_estudo);
      studyDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((now.getTime() - studyDate.getTime()) / (1000 * 3600 * 24));
      
      let type: '24h' | '07d' | '15d' | '30d' | null = null;
      let targetDays = 0;

      // Hierarquia de Revisão
      if (!r.rev_24h) { type = '24h'; targetDays = 1; }
      else if (!r.rev_07d) { type = '07d'; targetDays = 7; }
      else if (!r.rev_15d) { type = '15d'; targetDays = 15; }
      else if (!r.rev_30d) { type = '30d'; targetDays = 30; }

      if (type) {
        // Data alvo da revisão
        const targetDate = new Date(studyDate);
        targetDate.setDate(targetDate.getDate() + targetDays);
        
        const isDue = diffDays >= targetDays;
        
        if (isDue) {
          pending.push({
            ...r,
            reviewType: type,
            daysOverdue: diffDays - targetDays,
            reviewDate: targetDate
          });
        } else {
          future++;
        }
      }
    });

    // Aplica Filtros de UI na lista de pendentes
    const filteredPending = pending.filter(item => {
      // Filtro de Matéria (Dropdown = Match Exato)
      const matchMateria = !filterMateria || item.materia === filterMateria;
      // Filtro de Assunto (Busca textual)
      const matchAssunto = !filterAssunto || item.assunto.toLowerCase().includes(filterAssunto.toLowerCase());
      // Filtro de Relevância (Mínima)
      const matchRelevancia = item.relevancia >= filterRelevancia;
      
      return matchMateria && matchAssunto && matchRelevancia;
    });

    // Ordenar: Mais atrasados primeiro, depois por relevância
    const sorted = filteredPending.sort((a, b) => b.daysOverdue - a.daysOverdue || b.relevancia - a.relevancia);

    return {
      overdue: sorted.filter(r => r.daysOverdue > 0),
      today: sorted.filter(r => r.daysOverdue <= 0),
      upcomingCount: future,
      totalFiltered: sorted.length
    };
  }, [records, missaoAtiva, filterMateria, filterAssunto, filterRelevancia]);

  const validateTimeInput = (val: string): number | null => {
    if (!val) return 0;
    const cleaned = val.replace(/\D/g, '');
    
    if (cleaned.length === 0) return 0;

    let hours = 0;
    let minutes = 0;

    // Lógica para interpretar o input
    // 1 a 2 dígitos: Considera minutos (ex: "45" -> 45 min)
    // 3 a 4 dígitos: Considera HHMM (ex: "130" -> 1h 30m)
    if (cleaned.length <= 2) {
       minutes = parseInt(cleaned);
    } else if (cleaned.length === 3) {
       hours = parseInt(cleaned.substring(0, 1));
       minutes = parseInt(cleaned.substring(1));
    } else if (cleaned.length === 4) {
       hours = parseInt(cleaned.substring(0, 2));
       minutes = parseInt(cleaned.substring(2));
    } else {
        return -1; // Formato inválido
    }

    if (minutes > 59) return -2; // Minutos inválidos (ex: 80 min em formato HHMM)
    
    return hours * 60 + minutes;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      value = `${value.slice(0, 2)}:${value.slice(2)}`;
    }
    setTempoHHMM(value);
  };

  // Função para concluir revisão
  const handleCompleteReview = async () => {
    if (!selectedReview) return;

    // VALIDAÇÃO 1: Tempo
    const calculatedMinutes = validateTimeInput(tempoHHMM);
    if (calculatedMinutes === -1) {
      alert('Formato de tempo inválido! Use HH:MM (ex: 01:30 para 1h30min) ou apenas minutos (ex: 45).');
      return;
    }
    if (calculatedMinutes === -2) {
      alert('Tempo inválido! Os minutos não podem ser superiores a 59 em formatos de hora (ex: use 02:20 para 2h20, não 01:80).');
      return;
    }
    const finalTime = calculatedMinutes || 0;

    // VALIDAÇÃO 2: Questões
    if (reviewQuestions > 0 && reviewCorrect > reviewQuestions) {
      alert('Erro: O número de acertos não pode ser maior que o total de questões!');
      return;
    }

    setLoading(true);

    try {
      // Cálculos de Performance
      const taxa = reviewQuestions > 0 ? (reviewCorrect / reviewQuestions) * 100 : 0;
      const isHighPerformance = taxa > 85; // Critério para pular revisões

      // 1. Atualizar Flags no Registro Original
      const fieldToUpdate = `rev_${selectedReview.reviewType}`;
      const updates: any = { [fieldToUpdate]: true };

      // MECANISMO DE AVANÇO: Se acertou > 85%, pula as revisões intermediárias (7d, 15d)
      if (isHighPerformance) {
        if (selectedReview.reviewType === '24h') {
          updates['rev_07d'] = true; // Pula 7d
          updates['rev_15d'] = true; // Pula 15d -> Vai direto para 30d
        } else if (selectedReview.reviewType === '07d') {
          updates['rev_15d'] = true; // Pula 15d -> Vai direto para 30d
        }
        // Se já for 15d, o próximo natural é 30d, então não precisa de lógica extra
      }
      
      const { error: updateError } = await supabase
        .from('registros_estudos')
        .update(updates)
        .eq('id', selectedReview.id);

      if (updateError) throw updateError;

      // 2. CRIAR NOVO REGISTRO PARA ESTATÍSTICAS (Evita duplicar na fila de revisão)
      if (finalTime > 0 || reviewQuestions > 0) {
        // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'getUser' property.
        const { data: { user } } = await (supabase.auth as any).getUser();
        
        let dificuldadeCalc: any = '🟡 Médio';
        if (reviewQuestions > 0) {
           if (taxa >= 80) dificuldadeCalc = '🟢 Fácil';
           else if (taxa < 60) dificuldadeCalc = '🔴 Difícil';
        }

        const statsRecord = {
          user_id: user?.id,
          concurso: selectedReview.concurso,
          materia: selectedReview.materia,
          assunto: selectedReview.assunto, // Mantém mesmo assunto para agrupar nos gráficos
          data_estudo: reviewDate, // USA A DATA SELECIONADA
          acertos: reviewCorrect,
          total: reviewQuestions,
          taxa: taxa,
          tempo: finalTime,
          dificuldade: dificuldadeCalc,
          relevancia: selectedReview.relevancia,
          comentarios: `Revisão (${selectedReview.reviewType}) realizada.${isHighPerformance ? ' Desempenho alto: avançou etapas.' : ''}`,
          // MARCA TODAS AS REVISÕES COMO FEITAS NESTE NOVO REGISTRO PARA NÃO GERAR REDUNDÂNCIA
          rev_24h: true,
          rev_07d: true,
          rev_15d: true,
          rev_30d: true
        };

        const { error: insertError } = await supabase.from('registros_estudos').insert(statsRecord);
        if (insertError) throw insertError;
      }

      onUpdated(); // Recarrega dados
      setSelectedReview(null);
      // Resets são tratados pelo useEffect

    } catch (error: any) {
      alert('Erro ao concluir revisão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const clearFilters = () => {
    setFilterMateria('');
    setFilterAssunto('');
    setFilterRelevancia(1);
  };

  const hasActiveFilters = filterMateria || filterAssunto || filterRelevancia > 1;

  // Renderização do Percentual de Acerto no Modal
  const renderPerformanceBadge = () => {
    if (reviewQuestions === 0) return null;
    const p = (reviewCorrect / reviewQuestions) * 100;
    
    let colorClass = 'text-red-400 border-red-500/30 bg-red-500/10';
    let label = 'Baixo';
    
    if (p > 85) { colorClass = 'text-green-400 border-green-500/30 bg-green-500/10'; label = 'Excelente (Avançar)'; }
    else if (p >= 60) { colorClass = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'; label = 'Médio'; }

    return (
       <div className={`mt-2 flex items-center justify-between p-3 rounded-xl border ${colorClass}`}>
          <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
          <span className="text-lg font-bold">{p.toFixed(0)}%</span>
       </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
              <RefreshCcw size={24} />
            </div>
            <div>
               <h3 className="text-2xl font-bold">Radar de Revisões</h3>
               <p className="text-slate-400 text-sm">
                 {totalFiltered} tópicos para revisar · {upcomingCount} agendados
               </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${showFilters || hasActiveFilters ? 'bg-purple-500/20 border-purple-500/50 text-white' : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'}`}
          >
            {hasActiveFilters ? <Filter size={16} className="text-purple-400" /> : <SlidersHorizontal size={16} />}
            Filtros
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>}
          </button>
        </div>

        {/* Área de Filtros Expansível */}
        {showFilters && (
          <div className="glass p-5 rounded-xl border border-white/10 animate-in slide-in-from-top-2"> {/* Reduzido de p-6 2xl */}
            <div className="flex justify-between items-center mb-4">
               <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                 <Filter size={14} /> Filtrar Revisões
               </h4>
               {hasActiveFilters && (
                 <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold">
                   <Trash2 size={12} /> Limpar
                 </button>
               )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Filtro Matéria - AGORA COM DROPDOWN */}
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase">Matéria</label>
                 <div className="relative">
                   <select 
                     className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 appearance-none text-slate-300" {/* Ajustado de /900 e /10 */}
                     value={filterMateria}
                     onChange={(e) => setFilterMateria(e.target.value)}
                   >
                     <option value="">Todas as matérias</option>
                     {materiasOptions.map(m => (
                       <option key={m} value={m}>{m}</option>
                     ))}
                   </select>
                   <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                 </div>
               </div>

               {/* Filtro Assunto - MANTIDO TEXTO LIVRE */}
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase">Assunto</label>
                 <div className="relative">
                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                   <input 
                     type="text" 
                     placeholder="Ex: Atos Administrativos..."
                     className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" {/* Ajustado de /900 e /10 */}
                     value={filterAssunto}
                     onChange={(e) => setFilterAssunto(e.target.value)}
                   />
                 </div>
               </div>

               {/* Filtro Relevância - 1 A 10 */}
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                   <span>Relevância Mínima</span>
                   <span className="text-purple-400">{filterRelevancia > 1 ? filterRelevancia : 'Todas'}</span>
                 </label>
                 <input 
                   type="range" 
                   min="1" 
                   max="10" 
                   step="1"
                   className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer mt-2"
                   value={filterRelevancia}
                   onChange={(e) => setFilterRelevancia(Number(e.target.value))}
                 />
                 <div className="flex justify-between text-[10px] text-slate-600 font-bold px-1">
                   <span>1</span>
                   <span>10</span>
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {overdue.length === 0 && today.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center space-y-4 border-dashed border-2 border-slate-800"> {/* Reduzido de 3xl */}
           <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto text-slate-500 mb-4">
             {hasActiveFilters ? <Filter size={40} /> : <CheckCircle2 size={40} className="text-green-500" />}
           </div>
           <h4 className="text-xl font-bold text-white">
             {hasActiveFilters ? 'Nenhuma revisão encontrada' : 'Tudo limpo por aqui!'}
           </h4>
           <p className="text-slate-400 max-w-md mx-auto">
             {hasActiveFilters 
                ? 'Tente ajustar os filtros para ver mais resultados.' 
                : 'Você zerou suas revisões pendentes. Aproveite para avançar no edital ou descansar.'
             }
           </p>
           {hasActiveFilters && (
             <button onClick={clearFilters} className="text-purple-400 font-bold text-sm hover:underline">
               Limpar todos os filtros
             </button>
           )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Seção Atrasados */}
          {overdue.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-widest text-xs">
                <AlertCircle size={14} /> Críticas ({overdue.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {overdue.map(item => (
                  <ReviewCard 
                    key={item.id} 
                    item={item} 
                    isOverdue={true} 
                    isExpanded={!!expandedCards[item.id]} 
                    onToggle={toggleExpand}
                    onComplete={setSelectedReview}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Seção Hoje */}
          {today.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400 font-bold uppercase tracking-widest text-xs">
                <Calendar size={14} /> Para Hoje ({today.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {today.map(item => (
                  <ReviewCard 
                    key={item.id} 
                    item={item} 
                    isOverdue={false} 
                    isExpanded={!!expandedCards[item.id]} 
                    onToggle={toggleExpand}
                    onComplete={setSelectedReview}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Conclusão Atualizado */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12151D] border border-slate-800 w-full max-w-sm rounded-2xl p-5 relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"> {/* Ajustado de #0E1117 slate-700 md 3xl p-6 */}
            <button 
              onClick={() => setSelectedReview(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white z-10"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto text-cyan-400 mb-4">
                <Clock size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Concluir Revisão</h3>
              <p className="text-slate-400 text-sm mt-2 font-bold uppercase">{selectedReview.materia}</p>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar space-y-6">
              <div className="bg-slate-900/30 p-4 rounded-xl border border-white/5"> {/* Ajustado de /50 */}
                <p className="text-sm text-slate-300 font-medium line-clamp-3 italic">
                  "{selectedReview.assunto}"
                </p>
                <div className="flex justify-between items-center text-xs text-slate-500 uppercase font-bold mt-2 pt-2 border-t border-white/5">
                  <span>Tipo: {selectedReview.reviewType}</span>
                  <span>Original: {new Date(selectedReview.data_estudo).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* Data e Tempo Row */}
              <div className="grid grid-cols-2 gap-4">
                  {/* Data Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block flex items-center gap-2">
                      <Calendar size={12} /> Data
                    </label>
                    <input
                        type="date"
                        className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white font-bold" {/* Ajustado de /50 */}
                        value={reviewDate}
                        onChange={(e) => setReviewDate(e.target.value)}
                    />
                  </div>

                  {/* Tempo Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block flex items-center gap-2">
                      <Clock size={12} /> Tempo
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="HH:MM"
                        maxLength={5}
                        className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white font-bold text-center" {/* Ajustado de /50 */}
                        value={tempoHHMM}
                        onChange={handleTimeChange}
                      />
                      <div className="text-[10px] text-slate-500 mt-1 pl-1 text-center">
                         HH:MM ou Minutos
                      </div>
                    </div>
                  </div>
              </div>

              {/* Campos de Questões */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block flex items-center gap-2">
                  <Target size={12} /> Desempenho (Opcional)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Total</span>
                    <input 
                      type="number" 
                      min="0"
                      value={reviewQuestions}
                      onChange={(e) => setReviewQuestions(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white font-bold text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" {/* Ajustado de /50 */}
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Acertos</span>
                    <input 
                      type="number" 
                      min="0"
                      max={reviewQuestions}
                      value={reviewCorrect}
                      onChange={(e) => setReviewCorrect(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-14 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50 text-white font-bold text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" {/* Ajustado de /50 */}
                    />
                  </div>
                </div>
                {renderPerformanceBadge()}
                {(reviewQuestions > 0 && (reviewCorrect/reviewQuestions) > 0.85) && (
                   <div className="mt-2 text-[10px] text-green-400 flex items-center gap-1">
                      <Zap size={10} /> Alta performance: Próximas revisões serão antecipadas.
                   </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <button 
                onClick={handleCompleteReview}
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Salvando...' : '✅ Confirmar e Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Revisoes;