import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { StudyRecord, ErrorAnalysis } from '../types';
import {
  Trash2,
  Filter,
  Search,
  Edit,
  X,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  Calculator,
  BookOpen,
  List,
  ChevronDown,
  ChevronRight,
  Layers,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { getGeminiKey, getGroqKey } from '../services/supabase';
import { generateAIContent, parseAIJSON } from '../services/aiService';
import { logger } from '../utils/logger';
import { questionsQueries } from '../services/queries';
import { CustomSelector } from '../components/CustomSelector';
import { useAppStore } from '../stores/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { useStudyRecords } from '../hooks/queries/useStudyRecords';
import { useEditais } from '../hooks/queries/useEditais';

const renderHTML = (html: string) => (
  <span
    className="[&_a:hover:text-cyan-300 [&_a]:text-cyan-400 [&_a]:underline [&_br]:block [&_em]:italic [&_p]:my-2 [&_strong]:text-[hsl(var(--text-bright))] [&_u]:underline"
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

// Helper para exibição de data local sem conversão UTC
const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '--/--/----';
  const [year, month, day] = dateStr.split('-');
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
  const [showHistoryTopicsDropdown, setShowHistoryTopicsDropdown] =
    useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowHistoryTopicsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // State Completo do Form de Edição (Igual ao StudyForm)
  const [editForm, setEditForm] = useState<{
    materia: string;
    assunto: string;
    data_estudo: string;
    tempoHHMM: string;
    acertos: number | string;
    total: number | string;
    comentarios: string;
    meta: string;
    tipo: string;
    analise_erros: ErrorAnalysis[];
    gabarito: string;
    minha_resposta: string;
  }>({
    materia: '',
    assunto: '',
    data_estudo: '',
    tempoHHMM: '',
    acertos: '',
    total: '',
    comentarios: '',
    meta: '',
    tipo: '',
    analise_erros: [],
    gabarito: '',
    minha_resposta: '',
  });

  const [errorText, setErrorText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [saveToBank, setSaveToBank] = useState(false); // Novo estado para salvar no banco
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Opções para o dropdown de matérias
  const materiasDisponiveis = useMemo(() => {
    return editais
      .filter((e) => e.concurso === missaoAtiva)
      .map((e) => e.materia)
      .sort();
  }, [editais, missaoAtiva]);

  // Tópicos disponíveis baseado na matéria selecionada no form de edição
  const topicosDisponiveis = useMemo(() => {
    if (!editForm.materia) return [];
    const edital = editais.find(
      (e) => e.concurso === missaoAtiva && e.materia === editForm.materia,
    );
    // Ordenação natural (numérica)
    return edital
      ? [...edital.topicos].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
        )
      : [];
  }, [editais, missaoAtiva, editForm.materia]);

  const numericAcertos = Number(editForm.acertos) || 0;
  const numericTotal = Number(editForm.total) || 0;
  const percentage =
    numericTotal > 0 ? (numericAcertos / numericTotal) * 100 : 0;

  // --- FILTROS ---
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
        if (dateStart) dateMatch = dateMatch && r.data_estudo >= dateStart;
        if (dateEnd) dateMatch = dateMatch && r.data_estudo <= dateEnd;

        return searchMatch && dateMatch;
      });
  }, [records, missaoAtiva, searchTerm, dateStart, dateEnd]);

  // --- AGRUPAMENTO POR MATÉRIA ---
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
    let hours = 0,
      minutes = 0;
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
            percentage: percentage,
            gabarito: editForm.gabarito,
            minha_resposta: editForm.minha_resposta,
          },
        },
        geminiKey,
        groqKey,
        'gemini',
        'analise_erros',
      );

      const parsed: ErrorAnalysis[] = parseAIJSON(result);

      // Enriquecimento com detecção inteligente
      const enriched: ErrorAnalysis[] = parsed.map((p) => ({
        ...p,
        gabarito:
          (p.gabarito || '')
            .toString()
            .replace(/#GABARITO|#ERREI|#ERRO|#RESPOSTA/gi, '')
            .trim() || undefined,
        minha_resposta:
          (p.minha_resposta || '')
            .toString()
            .replace(/#GABARITO|#ERREI|#ERRO|#RESPOSTA/gi, '')
            .trim() || undefined,
      }));

      setEditForm((prev) => ({
        ...prev,
        analise_erros: [...prev.analise_erros, ...enriched],
      }));

      // Limpa os campos para facilitar a próxima adição
      setErrorText('');
      setEditForm((prev) => ({ ...prev, gabarito: '', minha_resposta: '' }));
      setMsg({ type: 'success', text: 'Questão analisada e adicionada!' });
    } catch (error) {
      logger.error('AI', 'Erro na análise de IA:', error);
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
      comentarios: r.comentarios || '',
      meta: String(r.meta || ''),
      tipo: r.tipo || '',
      analise_erros: r.analise_erros || [],
      gabarito: r.gabarito || '',
      minha_resposta: r.minha_resposta || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    const acertos = Number(editForm.acertos);
    const total = Number(editForm.total);

    if (acertos > total) {
      setMsg({ type: 'error', text: 'Erro: Acertos > Total.' });
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
      comentarios: editForm.comentarios,
      meta: (editForm.meta as string).trim() || null,
      tipo: editForm.tipo || null,
      gabarito: editForm.gabarito,
      minha_resposta: editForm.minha_resposta,
      analise_erros:
        editForm.analise_erros.length > 0 ? editForm.analise_erros : undefined,
    };

    // ATUALIZAÇÃO OTIMISTA: A UI atualiza instantaneamente
    onRecordUpdate(updatedRecord);
    setEditingRecord(null); // Fecha o modal
    setLoading(false);

    // Salvar no banco de questões é uma operação secundária (não precisa ser otimista)
    if (saveToBank && editingRecord.tipo !== 'Simulado') {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const questionPayload = {
          user_id: user.id,
          concurso: missaoAtiva,
          data: editForm.data_estudo,
          materia: editForm.materia,
          assunto: editForm.assunto,
          anotacoes: editForm.comentarios,
          status: 'Pendente',
          tags: [],
          meta: 3,
        };
        try {
          await questionsQueries.insertRevision(questionPayload);
        } catch (err) {
          logger.error(
            'DATA',
            'Erro ao inserir questão de revisão',
            err as Error,
          );
        }
      }
    }
  };

  const isSimuladoEdit = editingRecord?.tipo === 'Simulado';

  return (
    <div className="space-y-6 pb-20 duration-500 animate-in fade-in">
      <style>{`
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Busca e Filtros */}
      <div className="glass-premium flex flex-col items-center gap-4 rounded-3xl border border-[hsl(var(--border))] p-5 shadow-2xl md:flex-row">
        <div className="group relative w-full flex-1">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] transition-colors group-focus-within:text-[hsl(var(--accent))]"
            size={20}
          />
          <input
            type="text"
            placeholder="Filtrar histórico por assunto ou nota..."
            className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] py-4 pl-14 pr-6 text-sm font-bold text-[hsl(var(--text-bright))] placeholder-[hsl(var(--text-muted)/0.5)] transition-all focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-2xl border p-4 transition-all duration-300 ${showFilters ? 'border-transparent bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-[hsl(var(--accent)/0.3)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))]'}`}
        >
          <Filter size={24} />
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-4">
          <div className="space-y-2">
            <label className="ml-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">
              Início
            </label>
            <input
              type="date"
              className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] p-4 text-sm font-bold text-[hsl(var(--text-bright))]"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="ml-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">
              Fim
            </label>
            <input
              type="date"
              className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] p-4 text-sm font-bold text-[hsl(var(--text-bright))]"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Alerta de Erro/Sucesso */}
      {msg && (
        <div
          className={`my-6 flex items-center gap-4 rounded-2xl border p-5 text-sm font-black shadow-xl animate-in fade-in slide-in-from-top-4 ${msg.type === 'success' ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-red-500/20 bg-red-500/10 text-red-400'}`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 size={24} />
          ) : (
            <AlertCircle size={24} />
          )}
          <span className="uppercase tracking-widest">{msg.text}</span>
        </div>
      )}

      {/* Lista de Registros AGRUPADA (Accordion) */}
      <div className="space-y-4">
        {sortedMateriaKeys.length === 0 ? (
          <div className="py-20 text-center opacity-40">
            📜 Sem registros para esta missão.
          </div>
        ) : (
          sortedMateriaKeys.map((materia) => {
            const recordsInGroup = groupedRecords[materia];
            const isOpen = openGroups[materia];

            const avgTaxa =
              recordsInGroup.reduce((acc, r) => acc + r.taxa, 0) /
              recordsInGroup.length;
            const totalAcertos = recordsInGroup.reduce(
              (acc, r) => acc + (r.acertos || 0),
              0,
            );
            const totalQuestoes = recordsInGroup.reduce(
              (acc, r) => acc + (r.total || 0),
              0,
            );
            const totalMinutos = recordsInGroup.reduce(
              (acc, r) => acc + (r.tempo || 0),
              0,
            );
            const formattedTime = `${Math.floor(totalMinutos / 60)}h${totalMinutos % 60}m`;

            return (
              <div
                key={materia}
                className="glass-premium group overflow-hidden rounded-[2.5rem] border border-[hsl(var(--border))] shadow-lg transition-all duration-500 hover:shadow-2xl"
              >
                {/* Header do Grupo */}
                <button
                  onClick={() => toggleGroup(materia)}
                  className={`flex w-full items-center justify-between p-8 transition-all duration-500 ${isOpen ? 'bg-[hsl(var(--accent)/0.05)]' : 'hover:bg-white/[0.03]'}`}
                >
                  <div className="flex items-center gap-6">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-xl transition-all duration-500 ${isOpen ? 'rotate-90 scale-110 bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))]' : 'bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] group-hover:scale-105'}`}
                    >
                      {isOpen ? (
                        <ChevronRight size={24} />
                      ) : (
                        <ChevronRight size={24} />
                      )}
                    </div>
                    <div className="text-left">
                      <h4
                        className={`text-xl font-black uppercase leading-none tracking-tighter transition-colors ${isOpen ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-bright))]'}`}
                      >
                        {materia}
                      </h4>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
                        <span className="flex items-center gap-1.5">
                          <Layers
                            size={10}
                            className="text-[hsl(var(--accent))]"
                          />{' '}
                          {recordsInGroup.length} registros
                        </span>
                        <span className="opacity-30">|</span>
                        <span className="flex items-center gap-1.5">
                          <Target size={10} className="text-green-500" /> Média:{' '}
                          {avgTaxa.toFixed(0)}%
                        </span>
                        <span className="opacity-30">|</span>
                        <span className="flex items-center gap-1.5">
                          <Calculator size={10} className="text-purple-500" />{' '}
                          {totalAcertos}/{totalQuestoes}
                        </span>
                        <span className="opacity-30">|</span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={10} className="text-yellow-500" />{' '}
                          {formattedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Lista de Registros do Grupo */}
                {isOpen && (
                  <div className="border-t border-[hsl(var(--border))] bg-black/5 duration-500 animate-in slide-in-from-top-4">
                    {recordsInGroup.map((r) => (
                      <div
                        key={r.id}
                        className={`group/item flex flex-col items-start justify-between gap-6 border-b border-[hsl(var(--border))] p-6 transition-all last:border-0 hover:bg-[hsl(var(--accent)/0.03)] md:flex-row md:items-center`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">
                              {formatDateDisplay(r.data_estudo)}
                            </span>
                            {r.tipo && (
                              <span
                                className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${r.tipo === 'Revisão' ? 'border-orange-500/20 bg-orange-500/10 text-orange-400' : 'border-blue-500/20 bg-blue-500/10 text-blue-400'}`}
                              >
                                {r.tipo}
                              </span>
                            )}
                            <span
                              className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm ${r.taxa >= 80 ? 'border border-green-500/20 bg-green-500/10 text-green-400' : 'border border-yellow-500/20 bg-yellow-500/10 text-yellow-400'}`}
                            >
                              {r.taxa.toFixed(0)}%
                            </span>
                            {r.meta && (
                              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-400">
                                {r.meta}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-base font-black uppercase tracking-tight text-[hsl(var(--text-bright))]">
                            {r.assunto}
                          </p>
                          {r.comentarios && (
                            <div className="mt-2 max-w-xl text-xs font-bold text-[hsl(var(--text-muted))]">
                              <span className="italic">
                                {renderHTML(r.comentarios)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex w-full items-center justify-between gap-8 md:w-auto md:justify-end">
                          <div className="text-right">
                            <div className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">
                              Tempo
                            </div>
                            <div className="text-base font-black tracking-tighter text-[hsl(var(--text-bright))]">
                              {Math.floor(r.tempo / 60)}h{r.tempo % 60}m
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">
                              Acertos
                            </div>
                            <div className="text-base font-black tracking-tighter text-[hsl(var(--text-bright))]">
                              {r.acertos}/{r.total}
                            </div>
                          </div>
                          <div className="flex gap-3">
                            {r.analise_erros && r.analise_erros.length > 0 && (
                              <button
                                onClick={() => {
                                  const key = `diag-${r.id}`;
                                  setOpenGroups((prev) => ({
                                    ...prev,
                                    [key]: !prev[key],
                                  }));
                                }}
                                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${openGroups[`diag-${r.id}`] ? 'border-transparent bg-purple-600 text-white' : 'border-purple-600/20 bg-purple-600/10 text-purple-400 hover:bg-purple-600/20'}`}
                              >
                                <Zap size={14} />{' '}
                                {openGroups[`diag-${r.id}`] ? 'Ocultar' : 'Ver'}{' '}
                                Diagnóstico IA
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(r)}
                              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] p-3 text-[hsl(var(--text-muted))] transition-all hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))] active:scale-95"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-user-block))] p-3 text-[hsl(var(--text-muted))] transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-95"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {/* NOVO: DIAGNÓSTICO IA EXPANSÍVEL */}
                        {openGroups[`diag-${r.id}`] && r.analise_erros && (
                          <div className="mt-6 grid w-full grid-cols-1 gap-4 border-t border-[hsl(var(--border))] pt-6 duration-500 animate-in slide-in-from-top-4 md:grid-cols-2">
                            {r.analise_erros.map((err, idx) => (
                              <div
                                key={idx}
                                className="relative space-y-3 overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-5"
                              >
                                <div
                                  className={`absolute bottom-0 left-0 top-0 w-1 ${
                                    err.tipo_erro === 'Atenção'
                                      ? 'bg-yellow-500'
                                      : err.tipo_erro === 'Interpretação'
                                        ? 'bg-blue-500'
                                        : 'bg-red-500'
                                  }`}
                                />
                                <div className="flex items-start justify-between gap-3">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-tighter ${
                                      err.tipo_erro === 'Atenção'
                                        ? 'bg-yellow-500/10 text-yellow-500'
                                        : err.tipo_erro === 'Interpretação'
                                          ? 'bg-blue-500/10 text-blue-500'
                                          : 'bg-red-500/10 text-red-500'
                                    }`}
                                  >
                                    {err.tipo_erro}
                                  </span>
                                  <span className="line-clamp-1 flex-1 text-[9px] font-bold italic text-slate-500">
                                    "{err.questao_preview}..."
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold tracking-tight text-slate-200">
                                    <span className="mr-2 text-cyan-400">
                                      🎯 GATILHO:
                                    </span>{' '}
                                    {err.gatilho}
                                  </p>
                                  <p className="text-[10px] font-bold leading-relaxed text-slate-400">
                                    <span className="mr-2 text-green-400">
                                      💡 AÇÃO:
                                    </span>{' '}
                                    {err.sugestao}
                                  </p>
                                  {err.sugestao_mentor && (
                                    <p className="mt-2 border-t border-white/5 pt-2 text-[9px] font-black italic text-purple-400/80">
                                      <span className="mr-1">👔 MENTOR:</span>{' '}
                                      {err.sugestao_mentor}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="glass custom-scrollbar relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 p-6 animate-in zoom-in-95">
            <button
              onClick={() => setEditingRecord(null)}
              className="absolute right-6 top-6 text-slate-500 hover:text-white"
            >
              <X size={24} />
            </button>

            <h3 className="mb-8 flex items-center gap-3 text-2xl font-bold">
              <Edit className="text-cyan-400" />
              Editar {isSimuladoEdit ? 'Simulado' : 'Registro'}
            </h3>

            {msg && (
              <div
                className={`mb-6 rounded-xl border p-4 text-sm font-bold ${msg.type === 'success' ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-red-500/20 bg-red-500/10 text-red-400'}`}
              >
                {msg.text}
              </div>
            )}

            <div className="space-y-8">
              {/* GRUPO 1: QUANDO E O QUE */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                    <Clock size={12} /> Data & Tempo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="flex-1 rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      value={editForm.data_estudo}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          data_estudo: e.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="HH:MM"
                      maxLength={5}
                      className="w-24 rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 text-center font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      value={editForm.tempoHHMM}
                      onChange={handleTimeChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                    <BookOpen size={12} /> Matéria
                  </label>
                  <CustomSelector
                    label="Matéria"
                    value={editForm.materia}
                    options={
                      isSimuladoEdit
                        ? ['Geral', ...materiasDisponiveis]
                        : materiasDisponiveis
                    }
                    onChange={(val) =>
                      setEditForm({ ...editForm, materia: val, assunto: '' })
                    }
                    placeholder="Selecione a disciplina..."
                  />
                </div>
              </div>

              {/* GRUPO 2: ASSUNTO (COM DROPDOWN CUSTOMIZADO) */}
              <div className="space-y-2" ref={dropdownRef}>
                <label className="ml-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <List size={12} /> Assunto / Tópico
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 pr-10 font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    value={editForm.assunto}
                    onChange={(e) =>
                      setEditForm({ ...editForm, assunto: e.target.value })
                    }
                    onClick={() => {
                      if (!isSimuladoEdit && topicosDisponiveis.length > 0)
                        setShowHistoryTopicsDropdown(true);
                    }}
                    placeholder={
                      !isSimuladoEdit && editForm.materia
                        ? 'Selecione ou digite o tópico...'
                        : 'Preencha o campo'
                    }
                  />
                  {!isSimuladoEdit && topicosDisponiveis.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowHistoryTopicsDropdown(!showHistoryTopicsDropdown)
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition-colors hover:text-white"
                      title="Ver lista completa de tópicos"
                    >
                      {showHistoryTopicsDropdown ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  )}
                  {showHistoryTopicsDropdown &&
                    !isSimuladoEdit &&
                    topicosDisponiveis.length > 0 && (
                      <div className="custom-scrollbar absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1d26] shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-top-2">
                        <div
                          onClick={() => {
                            setEditForm({ ...editForm, assunto: '' });
                            setShowHistoryTopicsDropdown(false);
                          }}
                          className="cursor-pointer border-b border-white/5 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-white/5"
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
                            className={`flex cursor-pointer items-center gap-3 border-b border-white/5 px-6 py-4 text-xs font-bold transition-all last:border-0 hover:bg-white/5 ${editForm.assunto === t ? 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]' : 'text-slate-300'}`}
                          >
                            <div
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${editForm.assunto === t ? 'animate-pulse bg-[hsl(var(--accent))]' : 'bg-slate-700'}`}
                            />
                            <span className="flex-1 truncate leading-relaxed">
                              {t}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              {/* GRUPO 3: PERFORMANCE */}
              <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-6">
                <label className="mb-4 block flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <Target size={12} /> Desempenho
                </label>
                <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Acertos
                    </span>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 text-center text-lg font-bold text-white transition-all [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-green-500/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={editForm.acertos}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          acertos: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Total
                    </span>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 text-center text-lg font-bold text-white transition-all [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-purple-500/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={editForm.total}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          total: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Meta
                    </span>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 text-center text-lg font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      value={editForm.meta}
                      onChange={(e) =>
                        setEditForm({ ...editForm, meta: e.target.value })
                      }
                      placeholder="Ex: Meta 05"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Tipo
                    </span>
                    <select
                      className="w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 text-sm font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      value={editForm.tipo}
                      onChange={(e) =>
                        setEditForm({ ...editForm, tipo: e.target.value })
                      }
                    >
                      <option value="">Nenhum/Padrão</option>
                      <option value="Estudo">Estudo</option>
                      <option value="Revisão">Revisão</option>
                    </select>
                  </div>

                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-white/5 bg-slate-800/50 p-2">
                    <span className="mb-1 text-[10px] font-bold uppercase text-slate-500">
                      Taxa
                    </span>
                    <div
                      className={`text-4xl font-black ${percentage >= 80 ? 'text-green-400' : percentage >= 60 ? 'text-yellow-400' : 'text-red-400'}`}
                    >
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* GRUPO 5: ANOTAÇÕES */}
              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Anotações / Observações
                </label>
                <textarea
                  className="h-24 w-full rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 text-sm text-slate-300 placeholder-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="Pontos chave, dúvidas ou links..."
                  value={editForm.comentarios}
                  onChange={(e) =>
                    setEditForm({ ...editForm, comentarios: e.target.value })
                  }
                />
              </div>

              {/* NOVO: ALGORITMO DE ERROS IA (RETROATIVO) */}
              {!isSimuladoEdit && (
                <div className="space-y-6 border-t border-white/5 pt-6">
                  <div className="flex items-center justify-between">
                    <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
                      <Zap size={14} /> Algoritmo de Erros (IA)
                    </h5>
                    <div className="flex gap-2">
                      <label className="cursor-pointer rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-400 transition-all hover:bg-cyan-500/20">
                        {isAnalyzing ? '...' : 'Upload .txt'}
                        <input
                          type="file"
                          accept=".txt"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={isAnalyzing}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            analise_erros: [],
                          }))
                        }
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20 active:scale-95"
                      >
                        Limpar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (errorText.trim()) handleAnalyzeErrors(errorText);
                          else
                            setMsg({
                              type: 'error',
                              text: 'Cole o texto do erro primeiro.',
                            });
                        }}
                        disabled={isAnalyzing}
                        className="rounded-xl border border-purple-600/20 bg-purple-600/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-purple-400 transition-all hover:bg-purple-600/30 active:scale-95"
                      >
                        Analisar Texto
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/5 bg-black/20 p-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <label className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <span>Gabarito Oficial</span>
                        {editForm.gabarito && (
                          <span className="animate-pulse text-green-400">
                            Selecionado
                          </span>
                        )}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {['A', 'B', 'C', 'D', 'E', 'Certo', 'Errado'].map(
                          (opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  gabarito: opt,
                                }))
                              }
                              className={`rounded-lg border px-3 py-2 text-[10px] font-black transition-all ${editForm.gabarito === opt ? 'border-green-400 bg-green-500 text-white shadow-lg shadow-green-500/20' : 'border-white/5 bg-slate-900/50 text-slate-400 hover:border-green-500/50'}`}
                            >
                              {opt}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <span>Minha Resposta</span>
                        {editForm.minha_resposta && (
                          <span className="animate-pulse text-purple-400">
                            Selecionado
                          </span>
                        )}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {['A', 'B', 'C', 'D', 'E', 'Certo', 'Errado'].map(
                          (opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  minha_resposta: opt,
                                }))
                              }
                              className={`rounded-lg border px-3 py-2 text-[10px] font-black transition-all ${editForm.minha_resposta === opt ? 'border-purple-400 bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'border-white/5 bg-slate-900/50 text-slate-400 hover:border-purple-500/50'}`}
                            >
                              {opt}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  <textarea
                    className="h-32 w-full resize-none rounded-xl border border-white/5 bg-slate-950/50 px-4 py-3 text-xs font-bold text-slate-400 placeholder-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Cole aqui o texto da questão e seu erro para gerar um novo diagnóstico..."
                    value={errorText}
                    onChange={(e) => setErrorText(e.target.value)}
                  />

                  {editForm.analise_erros.length > 0 && (
                    <div className="space-y-4">
                      {editForm.analise_erros.map((err, idx) => (
                        <div
                          key={idx}
                          className="group relative space-y-3 overflow-hidden rounded-xl border border-white/5 bg-slate-900/50 p-4"
                        >
                          <div
                            className={`absolute bottom-0 left-0 top-0 w-1 ${
                              err.tipo_erro === 'Atenção'
                                ? 'bg-yellow-500'
                                : err.tipo_erro === 'Interpretação'
                                  ? 'bg-blue-500'
                                  : 'bg-red-500'
                            }`}
                          />
                          <div className="flex items-start justify-between">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-tighter ${
                                err.tipo_erro === 'Atenção'
                                  ? 'bg-yellow-500/10 text-yellow-500'
                                  : err.tipo_erro === 'Interpretação'
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : 'bg-red-500/10 text-red-500'
                              }`}
                            >
                              {err.tipo_erro}
                            </span>
                            <button
                              onClick={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  analise_erros: prev.analise_erros.filter(
                                    (_, i) => i !== idx,
                                  ),
                                }))
                              }
                              className="text-slate-600 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="space-y-1">
                            <p className="line-clamp-1 text-[10px] font-bold italic tracking-tight text-slate-200 opacity-60">
                              "{err.questao_preview}..."
                            </p>

                            {err.enunciado_completo && (
                              <div className="my-2 rounded-lg border border-white/5 bg-black/20 p-3">
                                <p className="whitespace-pre-wrap text-[9px] font-medium leading-relaxed text-slate-400">
                                  {err.enunciado_completo}
                                </p>
                              </div>
                            )}

                            <p className="text-[10px] font-bold tracking-tight text-white">
                              <span className="mr-2 text-cyan-400">
                                🎯 GATILHO:
                              </span>{' '}
                              {err.gatilho}
                            </p>
                            <p className="text-[10px] font-bold leading-relaxed text-slate-400">
                              <span className="mr-2 text-green-400">
                                💡 AÇÃO:
                              </span>{' '}
                              {err.sugestao}
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
                <div className="border-t border-white/5 pt-4">
                  <label className="group flex cursor-pointer items-center gap-4 rounded-xl border border-transparent p-4 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/5">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${saveToBank ? 'border-cyan-500 bg-cyan-500' : 'border-slate-600 bg-slate-900/30'}`}
                    >
                      {saveToBank && (
                        <CheckCircle2 size={16} className="text-white" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={saveToBank}
                      onChange={(e) => setSaveToBank(e.target.checked)}
                    />
                    <div className="flex-1">
                      <span
                        className={`block text-sm font-bold ${saveToBank ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}
                      >
                        Salvar no Banco de Questões
                      </span>
                      <span className="text-xs text-slate-500">
                        Cria uma cópia desta edição na sua lista de revisão
                        pendente.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 py-4 font-extrabold text-white shadow-lg shadow-purple-500/20 transition-all hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                ) : (
                  <>
                    <Calculator size={20} /> SALVAR ALTERAÇÕES
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
