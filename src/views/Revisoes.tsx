import React, { useState, useMemo, useEffect } from 'react';
import { StudyRecord } from '../types';
import {
  RefreshCcw,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  Search,
  SlidersHorizontal,
  Trash2,
  FileText,
  Target,
  Zap,
  BarChart2,
} from 'lucide-react';
import { getErrorMessage } from '../utils/error';
import { supabase } from '../services/supabase';
import { useAppStore } from '../stores/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { useStudyRecords } from '../hooks/queries/useStudyRecords';

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

// Renderiza HTML com estilos aplicados
const renderHTML = (html: string) => (
  <span
    className="[&_a:hover:text-cyan-300 [&_a]:text-cyan-400 [&_a]:underline [&_br]:block [&_em]:italic [&_p]:my-2 [&_strong]:text-purple-300 [&_u]:underline"
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

// Componente de Card Refatorado
const ReviewCard: React.FC<{
  item: PendingReview;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onComplete: (item: PendingReview) => void;
}> = ({ item, isExpanded, onToggle, onComplete }) => {
  const isOverdue = item.daysOverdue > 0;
  const badgeColor = isOverdue
    ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
    : 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]';

  const typeInfo = {
    '24h': { label: '24h', icon: <Clock size={12} />, color: 'text-cyan-400' },
    '07d': {
      label: '7d',
      icon: <Calendar size={12} />,
      color: 'text-purple-400',
    },
    '15d': {
      label: '15d',
      icon: <Calendar size={12} />,
      color: 'text-indigo-400',
    },
    '30d': {
      label: '30d',
      icon: <Calendar size={12} />,
      color: 'text-pink-400',
    },
  }[item.reviewType];

  const hasNotes = !!item.comentarios && item.comentarios.trim().length > 0;

  return (
    <div
      className={`glass-premium group rounded-[2.5rem] border p-6 transition-all duration-500 ${isExpanded ? `border-[hsl(var(--accent)/0.4)] shadow-2xl` : `hover:border-[hsl(var(--accent)/0.2)] ${isOverdue ? 'border-red-500/20' : 'border-[hsl(var(--border))]'}`}`}
    >
      <div className="mb-6 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${badgeColor}`}
            >
              {isOverdue ? `ATRASO ${item.daysOverdue}D` : 'PONTUAL'}
            </span>
            <span
              className={`flex items-center gap-1.5 text-[9px] font-black ${typeInfo.color} rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] px-3 py-1 uppercase tracking-widest`}
            >
              {typeInfo.icon} {typeInfo.label}
            </span>
          </div>
          <h4 className="truncate text-xl font-black uppercase leading-tight tracking-tighter text-[hsl(var(--text-bright))] transition-colors duration-300 group-hover:text-[hsl(var(--accent))]">
            {item.materia}
          </h4>
        </div>
      </div>

      <div className="space-y-4 rounded-[1.5rem] border border-[hsl(var(--border))] bg-black/10 p-5">
        <div className="relative">
          <p
            className={`text-sm font-bold leading-relaxed text-[hsl(var(--text-main))] transition-all ${isExpanded ? '' : 'line-clamp-3'}`}
          >
            {item.assunto}
          </p>
          {(item.assunto.length > 100 || hasNotes) && (
            <button
              onClick={() => onToggle(item.id)}
              className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--accent))] transition-all hover:text-white"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={14} /> Menos
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> Detalhes
                </>
              )}
            </button>
          )}
        </div>

        {hasNotes && isExpanded && (
          <div className="border-t border-[hsl(var(--border))] pt-4 animate-in slide-in-from-top-2">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400">
              <FileText size={14} /> Insights Ativos
            </div>
            <div className="whitespace-pre-wrap rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] p-4 text-xs font-bold leading-relaxed text-[hsl(var(--text-muted))]">
              {item.comentarios ? renderHTML(item.comentarios) : null}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-4 text-[9px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
          <div
            className="flex items-center gap-2"
            title="Eficiência do estudo original"
          >
            <BarChart2 size={12} className="text-[hsl(var(--accent))]" />
            <span>
              Taxa:{' '}
              <span className="text-[hsl(var(--text-bright))]">
                {item.taxa.toFixed(0)}%
              </span>
            </span>
          </div>
          <span className="opacity-50">
            Base: {new Date(item.data_estudo).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => onComplete(item)}
          className="group/btn flex w-full items-center justify-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))] transition-all hover:bg-gradient-to-r hover:from-green-600 hover:to-emerald-500 hover:text-[hsl(var(--bg-main))] hover:shadow-xl hover:shadow-green-500/20 active:scale-95"
        >
          <CheckCircle2
            size={18}
            className="transition-transform group-hover/btn:scale-110"
          />{' '}
          Dominar Tópico
        </button>
      </div>
    </div>
  );
};

const Revisoes: React.FC = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const missaoAtiva = useAppStore((s) => s.missaoAtiva);
  const {
    studyRecords: records,
    updateRecord,
    insertRecord,
  } = useStudyRecords(userId);
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(
    null,
  );

  // States do Modal de Conclusão
  const [sessionDate, setSessionDate] = useState(getLocalToday());
  const [tempoHHMM, setTempoHHMM] = useState('');
  const [reviewQuestions, setReviewQuestions] = useState(0);
  const [reviewCorrect, setReviewCorrect] = useState(0);

  const [loading, setLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(
    {},
  );

  // Filtros States
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilterMateria, setQuickFilterMateria] = useState('Todas'); // NOVO
  const [filterAssunto, setFilterAssunto] = useState('');

  // Reset do formulário ao abrir modal
  useEffect(() => {
    if (selectedReview) {
      setSessionDate(getLocalToday());
      setTempoHHMM('');
      setReviewQuestions(0);
      setReviewCorrect(0);
    }
  }, [selectedReview]);

  // Lógica de Processamento de Revisões
  const { overdue, today, upcomingCount, totalFiltered, materiasOptions } =
    useMemo(() => {
      const now = new Date();
      // Normaliza 'agora' para 00:00 local
      now.setHours(0, 0, 0, 0);

      const pending: PendingReview[] = [];
      let future = 0;
      const uniqueMaterias = new Set<string>();

      const activeRecords = records.filter(
        (r) =>
          r.concurso === missaoAtiva &&
          r.tipo !== 'Simulado' &&
          r.materia !== 'SIMULADO',
      );

      if (records.length > 0 && activeRecords.length === 0) {
        console.warn(
          `⚠️ Revisoes: ${records.length} registros totais encontrados, mas ZERO para a missão "${missaoAtiva}". Verifique se o nome do concurso bate.`,
        );
      }

      activeRecords.forEach((r) => {
        // IMPORTANTE: Trata a string 'YYYY-MM-DD' como data local, não UTC
        const [year, month, day] = r.data_estudo.split('-').map(Number);
        const studyDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date

        const diffDays = Math.floor(
          (now.getTime() - studyDate.getTime()) / (1000 * 3600 * 24),
        );

        let type: '24h' | '07d' | '15d' | '30d' | null = null;
        let targetDays = 0;

        if (!r.rev_24h) {
          type = '24h';
          targetDays = 1;
        } else if (!r.rev_07d) {
          type = '07d';
          targetDays = 7;
        } else if (!r.rev_30d) {
          type = '30d';
          targetDays = 30;
        }

        if (type) {
          const typeInfo = type; // Keep for closure if needed
          uniqueMaterias.add(r.materia);
          const targetDate = new Date(studyDate);
          targetDate.setDate(targetDate.getDate() + targetDays);
          if (diffDays >= targetDays) {
            pending.push({
              ...r,
              reviewType: type,
              daysOverdue: diffDays - targetDays,
              reviewDate: targetDate,
            });
          } else {
            future++;
          }
        }
      });

      // Aplica Filtros de UI
      const filteredPending = pending.filter((item) => {
        const matchQuickMateria =
          quickFilterMateria === 'Todas' || item.materia === quickFilterMateria;
        const matchAssunto =
          !filterAssunto ||
          item.assunto.toLowerCase().includes(filterAssunto.toLowerCase());
        return matchQuickMateria && matchAssunto;
      });

      const sorted = filteredPending.sort(
        (a, b) => b.daysOverdue - a.daysOverdue,
      );

      return {
        overdue: sorted.filter((r) => r.daysOverdue > 0),
        today: sorted.filter((r) => r.daysOverdue <= 0),
        upcomingCount: future,
        totalFiltered: sorted.length,
        materiasOptions: Array.from(uniqueMaterias).sort(),
      };
    }, [records, missaoAtiva, quickFilterMateria, filterAssunto]);

  const validateTimeInput = (val: string): number | null => {
    if (!val) return 0;
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 0) return 0;
    let hours = 0,
      minutes = 0;
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
      alert('Formato de tempo inválido!');
      return;
    }
    if (reviewQuestions > 0 && reviewCorrect > reviewQuestions) {
      alert('Erro: Acertos > Total!');
      return;
    }

    // Não precisamos bloquear a UI com loading aqui,
    // pois useStudyRecords já faz atualizações otimistas
    try {
      const taxa =
        reviewQuestions > 0 ? (reviewCorrect / reviewQuestions) * 100 : 0;
      const isHighPerformance = taxa > 85;
      const updates: Partial<StudyRecord> = {};
      const field = `rev_${selectedReview.reviewType}` as keyof StudyRecord;
      (updates as any)[field] = true;

      if (isHighPerformance) {
        if (selectedReview.reviewType === '24h') {
          updates.rev_07d = true;
          updates.rev_15d = true;
        } else if (selectedReview.reviewType === '07d') {
          updates.rev_15d = true;
        }
      }

      // Criar uma cópia limpa do StudyRecord (removendo campos da interface PendingReview)
      // Usamos prefixo _ para ignorar campos que não pertencem ao StudyRecord
      const {
        reviewType: _rt,
        daysOverdue: _do,
        reviewDate: _rd,
        ...baseRecord
      } = selectedReview;
      const recordWithUpdates: StudyRecord = {
        ...baseRecord,
        ...updates,
      };

      // Executa as mutações (elas são otimistas agora)
      updateRecord(recordWithUpdates);

      if (calculatedMinutes > 0 || reviewQuestions > 0) {
        const statsRecord = {
          user_id: userId,
          concurso: selectedReview.concurso,
          materia: selectedReview.materia,
          assunto: selectedReview.assunto,
          data_estudo: sessionDate,
          acertos: reviewCorrect,
          total: reviewQuestions,
          taxa: taxa,
          tempo: calculatedMinutes,
          comentarios: `Revisão (${selectedReview.reviewType}) realizada.${isHighPerformance ? ' Desempenho alto: avançou etapas.' : ''}`,
          rev_24h: true,
          rev_07d: true,
          rev_15d: true,
          rev_30d: true,
          tipo: 'Revisão' as const,
        };
        insertRecord(statsRecord);
      }

      // Fecha o modal imediatamente
      setSelectedReview(null);
    } catch (error) {
      console.error('Erro ao processar revisão:', error);
      alert('Erro ao concluir revisão: ' + getErrorMessage(error));
    } finally {
      // Opcionalmente podemos manter o state de loading se acharmos necessário
      // mas para ser instantâneo, melhor fechar o modal.
    }
  };

  const toggleExpand = (id: string) =>
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  const clearFilters = () => {
    setQuickFilterMateria('Todas');
    setFilterAssunto('');
  };
  const hasActiveFilters = quickFilterMateria !== 'Todas' || filterAssunto;

  const renderPerformanceBadge = () => {
    if (reviewQuestions === 0) return null;
    const p = (reviewCorrect / reviewQuestions) * 100;
    let colorClass = 'text-red-400 border-red-500/30 bg-red-500/10';
    let label = 'Baixo';
    if (p > 85) {
      colorClass = 'text-green-400 border-green-500/30 bg-green-500/10';
      label = 'Excelente (Avançar)';
    } else if (p >= 60) {
      colorClass = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      label = 'Médio';
    }
    return (
      <div
        className={`mt-2 flex items-center justify-between rounded-xl border p-3 ${colorClass}`}
      >
        <span className="text-xs font-bold uppercase tracking-widest">
          {label}
        </span>
        <span className="text-lg font-bold">{p.toFixed(0)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-10 pb-20 duration-700 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 text-[hsl(var(--bg-main))] shadow-xl shadow-orange-500/20">
              <RefreshCcw size={28} />
            </div>
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))]">
                Revisão Ativa
              </h3>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
                {totalFiltered} temas críticos para retenção estratégica
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-3 rounded-2xl border px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${showFilters || hasActiveFilters ? 'border-transparent bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-[hsl(var(--accent)/0.3)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] hover:text-white'}`}
          >
            <SlidersHorizontal size={18} /> Filtros de Revisão
          </button>
        </div>

        {/* Quick Filters */}
        <div className="custom-scrollbar-h flex items-center gap-3 overflow-x-auto pb-4">
          {['Todas', ...materiasOptions].map((m) => (
            <button
              key={m}
              onClick={() => setQuickFilterMateria(m)}
              className={`whitespace-nowrap rounded-xl border px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${quickFilterMateria === m ? 'border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))] shadow-xl' : 'border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] hover:bg-white/5'}`}
            >
              {m}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="glass-premium rounded-[2rem] border border-[hsl(var(--border))] p-8 shadow-2xl duration-500 animate-in slide-in-from-top-4">
            <div className="mb-8 flex items-center justify-between">
              <h4 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
                <Filter size={16} className="text-[hsl(var(--accent))]" />{' '}
                Refinar Ciclo
              </h4>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:text-red-300"
                >
                  <Trash2 size={14} /> Redefinir
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
                  Assunto / Tópico
                </label>
                <div className="group relative">
                  <Search
                    size={18}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] transition-colors group-focus-within:text-[hsl(var(--accent))]"
                  />
                  <input
                    type="text"
                    placeholder="Ex: Controle de Constitucionalidade..."
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] py-4 pl-14 pr-6 text-sm font-bold text-[hsl(var(--text-bright))] placeholder-[hsl(var(--text-muted)/0.5)] transition-all focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)]"
                    value={filterAssunto}
                    onChange={(e) => setFilterAssunto(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {totalFiltered === 0 ? (
        <div className="glass-premium space-y-6 rounded-[3rem] border-2 border-dashed border-[hsl(var(--border))] p-20 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] shadow-2xl">
            {hasActiveFilters ? (
              <Filter size={40} className="text-[hsl(var(--text-muted))]" />
            ) : (
              <CheckCircle2 size={40} className="text-green-500" />
            )}
          </div>
          <div>
            <h4 className="text-2xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))]">
              {hasActiveFilters ? 'Refino Infecundo' : 'Sapiência Consolidada'}
            </h4>
            <p className="mx-auto mt-4 max-w-md text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
              {hasActiveFilters
                ? 'Nenhuma revisão compatível com os filtros atuais.'
                : 'Você zerou as pendências críticas deste ciclo. Domínio de mestre!'}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="rounded-xl bg-[hsl(var(--accent)/0.1)] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--accent))] transition-all hover:bg-[hsl(var(--accent)/0.2)]"
            >
              Limpar Parâmetros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="flex w-fit items-center gap-3 rounded-full border border-red-500/20 bg-red-500/5 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
              <RefreshCcw size={16} className="animate-spin-slow" /> Ciclos Críticos (
              {overdue.length})
            </div>
            {overdue.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                isExpanded={!!expandedCards[item.id]}
                onToggle={toggleExpand}
                onComplete={setSelectedReview}
              />
            ))}
          </div>
          <div className="space-y-6">
            <div className="flex w-fit items-center gap-3 rounded-full border border-green-500/20 bg-green-500/5 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-green-400">
              <Calendar size={16} /> Cronograma Hoje ({today.length})
            </div>
            {today.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                isExpanded={!!expandedCards[item.id]}
                onToggle={toggleExpand}
                onComplete={setSelectedReview}
              />
            ))}
          </div>
        </div>
      )}

      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-xl duration-300 animate-in fade-in">
          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-[2.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--bg-card))] p-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] duration-500 animate-in zoom-in-95">
            <button
              onClick={() => setSelectedReview(null)}
              className="absolute right-8 top-8 z-10 rounded-xl bg-[hsl(var(--bg-user-block))] p-2 text-[hsl(var(--text-muted))] transition-all hover:text-white active:scale-95"
            >
              <X size={20} />
            </button>

            <div className="mb-8 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-2xl shadow-cyan-500/20">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))]">
                Validar Retenção
              </h3>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--accent))]">
                {selectedReview?.materia}
              </p>
            </div>

            <div className="custom-scrollbar space-y-8 overflow-y-auto pr-2">
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] p-6">
                <p className="text-sm font-bold italic leading-relaxed text-[hsl(var(--text-main))]">
                  "{selectedReview?.assunto}"
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4 text-[9px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">
                  <span>Etapa: {selectedReview?.reviewType}</span>
                  <span>
                    Base:{' '}
                    {selectedReview &&
                      new Date(selectedReview.data_estudo).toLocaleDateString(
                        'pt-BR',
                      )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
                    Data
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] px-5 py-4 text-xs font-black uppercase tracking-widest text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)]"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
                    Tempo (HH:MM)
                  </label>
                  <input
                    type="text"
                    placeholder="00:00"
                    maxLength={5}
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] px-5 py-4 text-center text-lg font-black text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)]"
                    value={tempoHHMM}
                    onChange={handleTimeChange}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="ml-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
                  <Target size={14} className="text-[hsl(var(--accent))]" />{' '}
                  Desempenho na Sessão
                </label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-[hsl(var(--text-muted))]">
                      Total
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={reviewQuestions}
                      onChange={(e) =>
                        setReviewQuestions(parseInt(e.target.value) || 0)
                      }
                      className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] py-4 pl-14 pr-4 text-right font-black text-[hsl(var(--text-bright))] [appearance:textfield] focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-[hsl(var(--text-muted))]">
                      Acertos
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={reviewQuestions}
                      value={reviewCorrect}
                      onChange={(e) =>
                        setReviewCorrect(parseInt(e.target.value) || 0)
                      }
                      className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] py-4 pl-16 pr-4 text-right font-black text-green-400 [appearance:textfield] focus:ring-2 focus:ring-green-500/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                {renderPerformanceBadge()}
                {reviewQuestions > 0 &&
                  reviewCorrect / reviewQuestions > 0.85 && (
                    <div className="flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/5 p-4 animate-in fade-in slide-in-from-bottom-2">
                      <Zap size={16} className="animate-pulse text-green-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-400">
                        Sincronia Neural: Etapas futuristas desbloqueadas!
                      </span>
                    </div>
                  )}
              </div>
            </div>

            <div className="mt-10 border-t border-[hsl(var(--border))] pt-8">
              <button
                onClick={handleCompleteReview}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--bg-main))] shadow-2xl shadow-cyan-500/30 transition-all hover:scale-[1.02] hover:from-cyan-500 hover:to-blue-500 active:scale-95 disabled:opacity-50"
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
