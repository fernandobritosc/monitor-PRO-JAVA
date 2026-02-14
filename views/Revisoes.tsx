
import React, { useState, useMemo, useEffect } from 'react';
import { StudyRecord, EditalMateria } from '../types';
import { RefreshCcw, Calendar, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle, X, Filter, Search, SlidersHorizontal, Trash2, FileText, Target, Zap, BarChart2 } from 'lucide-react';
import { supabase } from '../services/supabase';

interface RevisoesProps {
  records: StudyRecord[];
  missaoAtiva: string;
  editais: EditalMateria[];
  onRecordUpdate: (record: StudyRecord) => void;
  onUpdated: () => void;
}

// Tipo interno para gerenciar a revisão na UI
interface PendingReview extends StudyRecord {
  reviewType: '24h' | '07d' | '15d' | '30d';
  daysOverdue: number;
  reviewDate: Date;
}

// Helper para pegar data local YYYY-MM-DD
const getLocalToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

// Componente de Card Refatorado
const ReviewCard: React.FC<{
  item: PendingReview;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onComplete: (item: PendingReview) => void;
}> = ({ item, isExpanded, onToggle, onComplete }) => {
  const isOverdue = item.daysOverdue > 0;
  const badgeColor = isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]';

  const typeInfo = {
    '24h': { label: '24h', icon: <Clock size={12} />, color: 'text-cyan-400' },
    '07d': { label: '7d', icon: <Calendar size={12} />, color: 'text-purple-400' },
    '15d': { label: '15d', icon: <Calendar size={12} />, color: 'text-indigo-400' },
    '30d': { label: '30d', icon: <Calendar size={12} />, color: 'text-pink-400' }
  }[item.reviewType];

  const hasNotes = !!item.comentarios && item.comentarios.trim().length > 0;

  return (
    <div className={`glass-premium rounded-[2.5rem] p-6 border transition-all duration-500 group ${isExpanded ? `border-[hsl(var(--accent)/0.4)] shadow-2xl` : `hover:border-[hsl(var(--accent)/0.2)] ${isOverdue ? 'border-red-500/20' : 'border-[hsl(var(--border))]'}`}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${badgeColor}`}>
              {isOverdue ? `ATRASO ${item.daysOverdue}D` : 'PONTUAL'}
            </span>
            <span className={`flex items-center gap-1.5 text-[9px] font-black ${typeInfo.color} bg-[hsl(var(--bg-user-block))] px-3 py-1 rounded-full border border-[hsl(var(--border))] uppercase tracking-widest`}>
              {typeInfo.icon} {typeInfo.label}
            </span>
          </div>
          <h4 className="text-xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter truncate leading-tight group-hover:text-[hsl(var(--accent))] transition-colors duration-300">{item.materia}</h4>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mb-1">Impacto</div>
          <div className={`text-2xl font-black tracking-tighter ${item.relevancia >= 8 ? 'text-red-400' : 'text-yellow-400'}`}>{item.relevancia}</div>
        </div>
      </div>

      <div className="bg-black/10 p-5 rounded-[1.5rem] border border-[hsl(var(--border))] space-y-4">
        <div className="relative">
          <p className={`text-sm font-bold text-[hsl(var(--text-main))] leading-relaxed transition-all ${isExpanded ? '' : 'line-clamp-3'}`}>{item.assunto}</p>
          {(item.assunto.length > 100 || hasNotes) && (
            <button onClick={() => onToggle(item.id)} className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--accent))] hover:text-white mt-3 flex items-center gap-2 transition-all">
              {isExpanded ? <><ChevronUp size={14} /> Menos</> : <><ChevronDown size={14} /> Detalhes</>}
            </button>
          )}
        </div>

        {hasNotes && isExpanded && (
          <div className="pt-4 border-t border-[hsl(var(--border))] animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-purple-400 uppercase tracking-widest"><FileText size={14} /> Insights Ativos</div>
            <div className="text-xs font-bold text-[hsl(var(--text-muted))] leading-relaxed whitespace-pre-wrap bg-[hsl(var(--bg-main))] p-4 rounded-xl border border-[hsl(var(--border))]">
              {formatTextWithLinks(item.comentarios)}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] pt-4 border-t border-[hsl(var(--border))]">
          <div className="flex items-center gap-2" title="Eficiência do estudo original">
            <BarChart2 size={12} className="text-[hsl(var(--accent))]" />
            <span>Taxa: <span className="text-[hsl(var(--text-bright))]">{item.taxa.toFixed(0)}%</span></span>
          </div>
          <span className="opacity-50">Base: {new Date(item.data_estudo).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => onComplete(item)}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] hover:bg-gradient-to-r hover:from-green-600 hover:to-emerald-500 hover:text-[hsl(var(--bg-main))] hover:shadow-xl hover:shadow-green-500/20 border border-[hsl(var(--border))] group/btn active:scale-95"
        >
          <CheckCircle2 size={18} className="transition-transform group-hover/btn:scale-110" /> Dominar Tópico
        </button>
      </div>
    </div>
  );
};


const Revisoes: React.FC<RevisoesProps> = ({ records, missaoAtiva, editais, onRecordUpdate, onUpdated }) => {
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);

  // States do Modal de Conclusão
  const [reviewDate, setReviewDate] = useState(getLocalToday());
  const [tempoHHMM, setTempoHHMM] = useState('');
  const [reviewQuestions, setReviewQuestions] = useState(0);
  const [reviewCorrect, setReviewCorrect] = useState(0);

  const [loading, setLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Filtros States
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilterMateria, setQuickFilterMateria] = useState('Todas'); // NOVO
  const [filterAssunto, setFilterAssunto] = useState('');
  const [filterRelevancia, setFilterRelevancia] = useState(1);

  // Reset do formulário ao abrir modal
  useEffect(() => {
    if (selectedReview) {
      setReviewDate(getLocalToday());
      setTempoHHMM('');
      setReviewQuestions(0);
      setReviewCorrect(0);
    }
  }, [selectedReview]);

  // Lógica de Processamento de Revisões
  const { overdue, today, upcomingCount, totalFiltered, materiasOptions } = useMemo(() => {
    const now = new Date();
    // Normaliza 'agora' para 00:00 local
    now.setHours(0, 0, 0, 0);

    const pending: PendingReview[] = [];
    let future = 0;
    const uniqueMaterias = new Set<string>();

    const activeRecords = records.filter(r =>
      r.concurso === missaoAtiva && r.dificuldade !== 'Simulado' && r.materia !== 'SIMULADO'
    );

    activeRecords.forEach(r => {
      // IMPORTANTE: Trata a string 'YYYY-MM-DD' como data local, não UTC
      const [year, month, day] = r.data_estudo.split('-').map(Number);
      const studyDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date

      const diffDays = Math.floor((now.getTime() - studyDate.getTime()) / (1000 * 3600 * 24));

      let type: '24h' | '07d' | '15d' | '30d' | null = null;
      let targetDays = 0;

      if (!r.rev_24h) { type = '24h'; targetDays = 1; }
      else if (!r.rev_07d) { type = '07d'; targetDays = 7; }
      else if (!r.rev_15d) { type = '15d'; targetDays = 15; }
      else if (!r.rev_30d) { type = '30d'; targetDays = 30; }

      if (type) {
        uniqueMaterias.add(r.materia);
        const targetDate = new Date(studyDate);
        targetDate.setDate(targetDate.getDate() + targetDays);
        if (diffDays >= targetDays) {
          pending.push({ ...r, reviewType: type, daysOverdue: diffDays - targetDays, reviewDate: targetDate });
        } else {
          future++;
        }
      }
    });

    // Aplica Filtros de UI
    const filteredPending = pending.filter(item => {
      const matchQuickMateria = quickFilterMateria === 'Todas' || item.materia === quickFilterMateria;
      const matchAssunto = !filterAssunto || item.assunto.toLowerCase().includes(filterAssunto.toLowerCase());
      const matchRelevancia = item.relevancia >= filterRelevancia;
      return matchQuickMateria && matchAssunto && matchRelevancia;
    });

    const sorted = filteredPending.sort((a, b) => b.daysOverdue - a.daysOverdue || b.relevancia - a.relevancia);

    return {
      overdue: sorted.filter(r => r.daysOverdue > 0),
      today: sorted.filter(r => r.daysOverdue <= 0),
      upcomingCount: future,
      totalFiltered: sorted.length,
      materiasOptions: Array.from(uniqueMaterias).sort()
    };
  }, [records, missaoAtiva, quickFilterMateria, filterAssunto, filterRelevancia]);

  const validateTimeInput = (val: string): number | null => {
    if (!val) return 0;
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 0) return 0;
    let hours = 0, minutes = 0;
    if (cleaned.length <= 2) minutes = parseInt(cleaned);
    else if (cleaned.length === 3) {
      hours = parseInt(cleaned.substring(0, 1));
      minutes = parseInt(cleaned.substring(1));
    } else if (cleaned.length === 4) {
      hours = parseInt(cleaned.substring(0, 2));
      minutes = parseInt(cleaned.substring(2));
    } else return -1;
    if (minutes > 59) return -2;
    return hours * 60 + minutes;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) value = `${value.slice(0, 2)}:${value.slice(2)}`;
    setTempoHHMM(value);
  };

  const handleCompleteReview = async () => {
    if (!selectedReview) return;
    const calculatedMinutes = validateTimeInput(tempoHHMM);
    if (calculatedMinutes === null || calculatedMinutes < 0) {
      alert('Formato de tempo inválido!'); return;
    }
    if (reviewQuestions > 0 && reviewCorrect > reviewQuestions) {
      alert('Erro: Acertos > Total!'); return;
    }

    setLoading(true);
    try {
      const taxa = reviewQuestions > 0 ? (reviewCorrect / reviewQuestions) * 100 : 0;
      const isHighPerformance = taxa > 85;
      const fieldToUpdate = `rev_${selectedReview.reviewType}`;
      const updates: any = { [fieldToUpdate]: true };

      if (isHighPerformance) {
        if (selectedReview.reviewType === '24h') { updates['rev_07d'] = true; updates['rev_15d'] = true; }
        else if (selectedReview.reviewType === '07d') { updates['rev_15d'] = true; }
      }

      const recordWithUpdates = { ...selectedReview, ...updates };
      delete (recordWithUpdates as any).reviewType;
      delete (recordWithUpdates as any).daysOverdue;
      delete (recordWithUpdates as any).reviewDate;

      onRecordUpdate(recordWithUpdates);

      if (calculatedMinutes > 0 || reviewQuestions > 0) {
        const { data: { user } } = await (supabase.auth as any).getUser();
        let dificuldadeCalc: any = '🟡 Médio';
        if (reviewQuestions > 0) {
          if (taxa >= 80) dificuldadeCalc = '🟢 Fácil'; else if (taxa < 60) dificuldadeCalc = '🔴 Difícil';
        }
        const statsRecord = {
          user_id: user?.id, concurso: selectedReview.concurso, materia: selectedReview.materia,
          assunto: selectedReview.assunto, data_estudo: reviewDate, acertos: reviewCorrect,
          total: reviewQuestions, taxa: taxa, tempo: calculatedMinutes, dificuldade: dificuldadeCalc,
          relevancia: selectedReview.relevancia,
          comentarios: `Revisão (${selectedReview.reviewType}) realizada.${isHighPerformance ? ' Desempenho alto: avançou etapas.' : ''}`,
          rev_24h: true, rev_07d: true, rev_15d: true, rev_30d: true
        };
        const { error: insertError } = await supabase.from('registros_estudos').insert(statsRecord);
        if (insertError) throw insertError;
        onUpdated();
      }

      setSelectedReview(null);
    } catch (error: any) {
      alert('Erro ao concluir revisão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  const clearFilters = () => { setQuickFilterMateria('Todas'); setFilterAssunto(''); setFilterRelevancia(1); };
  const hasActiveFilters = quickFilterMateria !== 'Todas' || filterAssunto || filterRelevancia > 1;

  const renderPerformanceBadge = () => {
    if (reviewQuestions === 0) return null;
    const p = (reviewCorrect / reviewQuestions) * 100;
    let colorClass = 'text-red-400 border-red-500/30 bg-red-500/10'; let label = 'Baixo';
    if (p > 85) { colorClass = 'text-green-400 border-green-500/30 bg-green-500/10'; label = 'Excelente (Avançar)'; }
    else if (p >= 60) { colorClass = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'; label = 'Médio'; }
    return <div className={`mt-2 flex items-center justify-between p-3 rounded-xl border ${colorClass}`}><span className="text-xs font-bold uppercase tracking-widest">{label}</span><span className="text-lg font-bold">{p.toFixed(0)}%</span></div>;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 text-[hsl(var(--bg-main))] flex items-center justify-center shadow-xl shadow-orange-500/20"><RefreshCcw size={28} /></div>
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))]">Curva de Esquecimento</h3>
              <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mt-1">
                {totalFiltered} temas críticos para retenção estratégica
              </p>
            </div>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${showFilters || hasActiveFilters ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] border-transparent shadow-lg shadow-[hsl(var(--accent)/0.3)]' : 'bg-[hsl(var(--bg-user-block))] border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-white'}`}>
            <SlidersHorizontal size={18} /> Filtros de Revisão
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar-h">
          {['Todas', ...materiasOptions].map(m => (
            <button
              key={m}
              onClick={() => setQuickFilterMateria(m)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${quickFilterMateria === m ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.3)] shadow-xl' : 'bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] border-[hsl(var(--border))] hover:bg-white/5'}`}
            >
              {m}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="glass-premium p-8 rounded-[2rem] border border-[hsl(var(--border))] shadow-2xl animate-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-[10px] font-black text-[hsl(var(--text-muted))] flex items-center gap-3 uppercase tracking-[0.2em]">
                <Filter size={16} className="text-[hsl(var(--accent))]" /> Refinar Ciclo
              </h4>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-[10px] font-black text-red-400 hover:text-red-300 flex items-center gap-2 uppercase tracking-widest transition-all">
                  <Trash2 size={14} /> Redefinir
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Assunto / Tópico</label>
                <div className="relative group">
                  <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] group-focus-within:text-[hsl(var(--accent))] transition-colors" />
                  <input type="text" placeholder="Ex: Controle de Constitucionalidade..." className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] transition-all placeholder-[hsl(var(--text-muted)/0.5)]" value={filterAssunto} onChange={(e) => setFilterAssunto(e.target.value)} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex justify-between">
                  <span>Relevância Prioritária</span>
                  <span className="text-[hsl(var(--accent))]">{filterRelevancia > 1 ? `Mínima ${filterRelevancia}` : 'Todas'}</span>
                </label>
                <div className="pt-3">
                  <input type="range" min="1" max="10" step="1" className="w-full h-2 bg-[hsl(var(--bg-user-block))] rounded-full appearance-none cursor-pointer accent-[hsl(var(--accent))]" value={filterRelevancia} onChange={(e) => setFilterRelevancia(Number(e.target.value))} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {totalFiltered === 0 ? (
        <div className="glass-premium rounded-[3rem] p-20 text-center space-y-6 border-dashed border-2 border-[hsl(var(--border))]">
          <div className="w-24 h-24 bg-[hsl(var(--bg-user-block))] rounded-full flex items-center justify-center mx-auto shadow-2xl border border-[hsl(var(--border))]">
            {hasActiveFilters ? <Filter size={40} className="text-[hsl(var(--text-muted))]" /> : <CheckCircle2 size={40} className="text-green-500" />}
          </div>
          <div>
            <h4 className="text-2xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter">
              {hasActiveFilters ? 'Refino Infecundo' : 'Sapiência Consolidada'}
            </h4>
            <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] max-w-md mx-auto mt-4">
              {hasActiveFilters ? 'Nenhuma revisão compatível com os filtros atuais.' : 'Você zerou as pendências críticas deste ciclo. Domínio de mestre!'}
            </p>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-8 py-3 rounded-xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] text-[10px] font-black uppercase tracking-widest hover:bg-[hsl(var(--accent)/0.2)] transition-all">
              Limpar Parâmetros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-6 lg:col-span-1">
            <div className="flex items-center gap-3 text-red-400 font-black uppercase tracking-[0.2em] text-[10px] px-6 py-2 bg-red-500/5 rounded-full border border-red-500/20 w-fit">
              <AlertCircle size={14} /> Ciclos Críticos ({overdue.length})
            </div>
            {overdue.map(item => <ReviewCard key={item.id} item={item} isExpanded={!!expandedCards[item.id]} onToggle={toggleExpand} onComplete={setSelectedReview} />)}
          </div>
          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-center gap-3 text-green-400 font-black uppercase tracking-[0.2em] text-[10px] px-6 py-2 bg-green-500/5 rounded-full border border-green-500/20 w-fit">
              <Calendar size={14} /> Cronograma Hoje ({today.length})
            </div>
            {today.map(item => <ReviewCard key={item.id} item={item} isExpanded={!!expandedCards[item.id]} onToggle={toggleExpand} onComplete={setSelectedReview} />)}
          </div>
        </div>
      )}

      {selectedReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] w-full max-w-md rounded-[2.5rem] p-10 relative animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh] shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <button onClick={() => setSelectedReview(null)} className="absolute top-8 right-8 p-2 bg-[hsl(var(--bg-user-block))] rounded-xl text-[hsl(var(--text-muted))] hover:text-white transition-all active:scale-95 z-10"><X size={20} /></button>

            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto text-white mb-6 shadow-2xl shadow-cyan-500/20">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))]">Validar Retenção</h3>
              <p className="text-[10px] font-black text-[hsl(var(--accent))] uppercase tracking-[0.2em] mt-2">{selectedReview.materia}</p>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar space-y-8">
              <div className="bg-[hsl(var(--bg-user-block))] p-6 rounded-2xl border border-[hsl(var(--border))]">
                <p className="text-sm font-bold text-[hsl(var(--text-main))] leading-relaxed italic">"{selectedReview.assunto}"</p>
                <div className="flex justify-between items-center text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mt-4 pt-4 border-t border-[hsl(var(--border))]">
                  <span>Etapa: {selectedReview.reviewType}</span>
                  <span>Base: {new Date(selectedReview.data_estudo).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Data</label>
                  <input type="date" className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] text-[hsl(var(--text-bright))] font-black uppercase tracking-widest text-xs" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2">Tempo (HH:MM)</label>
                  <input type="text" placeholder="00:00" maxLength={5} className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] text-[hsl(var(--text-bright))] font-black text-center text-lg" value={tempoHHMM} onChange={handleTimeChange} />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><Target size={14} className="text-[hsl(var(--accent))]" /> Desempenho na Sessão</label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-[hsl(var(--text-muted))] uppercase">Total</span>
                    <input type="number" min="0" value={reviewQuestions} onChange={(e) => setReviewQuestions(parseInt(e.target.value) || 0)} className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl pl-14 pr-4 py-4 focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] text-[hsl(var(--text-bright))] font-black text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-[hsl(var(--text-muted))] uppercase">Acertos</span>
                    <input type="number" min="0" max={reviewQuestions} value={reviewCorrect} onChange={(e) => setReviewCorrect(parseInt(e.target.value) || 0)} className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl pl-16 pr-4 py-4 focus:ring-2 focus:ring-green-500/30 text-green-400 font-black text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                </div>
                {renderPerformanceBadge()}
                {(reviewQuestions > 0 && (reviewCorrect / reviewQuestions) > 0.85) && (
                  <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <Zap size={16} className="text-green-400 animate-pulse" />
                    <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Sincronia Neural: Etapas futuristas desbloqueadas!</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-[hsl(var(--border))]">
              <button
                onClick={handleCompleteReview}
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-[hsl(var(--bg-main))] font-black py-5 rounded-2xl shadow-2xl shadow-cyan-500/30 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95 text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3"
              >
                {loading ? 'Sincronizando...' : 'Consolidar Evolução'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Revisoes;
