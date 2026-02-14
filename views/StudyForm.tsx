import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import { EditalMateria } from '../types';
import { CheckCircle2, AlertCircle, Calculator, Clock, BookOpen, Target, Zap, AlertTriangle, List, Layers, X, FileText, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface StudyFormProps {
    editais: EditalMateria[];
    missaoAtiva: string;
    onSaved: () => void;
    isSimulado?: boolean;
    onCancel?: () => void;
}

// Helper para pegar data local YYYY-MM-DD
const getLocalToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const StudyForm: React.FC<StudyFormProps> = ({ editais, missaoAtiva, onSaved, isSimulado = false, onCancel }) => {
    // Form States
    const [dataEstudo, setDataEstudo] = useState(getLocalToday());
    const [tempoHHMM, setTempoHHMM] = useState('');

    // Single Record States
    const [materia, setMateria] = useState('');
    const [assunto, setAssunto] = useState('');
    const [acertos, setAcertos] = useState<string>('');
    const [total, setTotal] = useState<string>('');
    const [dificuldade, setDificuldade] = useState<any>('🟡 Médio');
    const [relevancia, setRelevancia] = useState(5);
    const [comentarios, setComentarios] = useState('');
    const [saveToBank, setSaveToBank] = useState(false);

    // Multi Record States (Simulado)
    const [simuladoScores, setSimuladoScores] = useState<Record<string, { acertos: string, total: string }>>({});

    // UI States
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

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

    const materiasDisponiveis = useMemo(() => {
        return editais.filter(e => e.concurso === missaoAtiva).sort((a, b) => a.materia.localeCompare(b.materia));
    }, [editais, missaoAtiva]);

    // Filtra os tópicos baseados na matéria selecionada (apenas para modo Estudo)
    const topicosDisponiveis = useMemo(() => {
        if (!materia) return [];
        const edital = editais.find(e => e.concurso === missaoAtiva && e.materia === materia);
        // Ordenação natural para respeitar números (1., 2., 10., etc)
        return edital ? [...edital.topicos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })) : [];
    }, [editais, missaoAtiva, materia]);

    // Reseta o assunto quando a matéria muda
    useEffect(() => {
        if (!isSimulado) setAssunto('');
    }, [materia, isSimulado]);

    // Stats do Simulado (Live)
    const simuladoStats = useMemo(() => {
        let totalAcertos = 0;
        let totalQuestoes = 0;

        let weightedPoints = 0;
        let maxWeightedPoints = 0;

        materiasDisponiveis.forEach(m => {
            const s = simuladoScores[m.materia];
            if (s) {
                const a = parseInt(s.acertos || '0');
                const t = parseInt(s.total || '0');
                const peso = m.peso || 1;

                if (!isNaN(a)) totalAcertos += a;
                if (!isNaN(t)) totalQuestoes += t;

                if (!isNaN(a)) weightedPoints += (a * peso);
                if (!isNaN(t)) maxWeightedPoints += (t * peso);
            }
        });

        return {
            acertos: totalAcertos,
            total: totalQuestoes,
            perc: totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0,
            weighted: weightedPoints,
            maxWeighted: maxWeightedPoints
        };
    }, [simuladoScores, materiasDisponiveis]);

    // Stats do Estudo Individual (Live)
    const singleStats = useMemo(() => {
        const numericAcertos = parseInt(acertos) || 0;
        const numericTotal = parseInt(total) || 0;
        const percentage = numericTotal > 0 ? (numericAcertos / numericTotal) * 100 : 0;
        return { percentage, numericAcertos, numericTotal };
    }, [acertos, total]);

    // Efeito Dificuldade (Single)
    useEffect(() => {
        if (singleStats.numericTotal > 0 && !isSimulado) {
            if (singleStats.percentage >= 80) setDificuldade('🟢 Fácil');
            else if (singleStats.percentage < 60) setDificuldade('🔴 Difícil');
            else setDificuldade('🟡 Médio');
        }
    }, [singleStats.percentage, singleStats.numericTotal, isSimulado]);

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);
        if (value.length >= 3) {
            value = `${value.slice(0, 2)}:${value.slice(2)}`;
        }
        setTempoHHMM(value);
    };

    const validateAndConvertTime = (val: string) => {
        const cleaned = val.replace(/\D/g, '');
        if (cleaned.length === 0) return 0;
        let hours = 0;
        let minutes = 0;
        if (cleaned.length <= 2) {
            minutes = parseInt(cleaned);
        } else if (cleaned.length === 3) {
            hours = parseInt(cleaned.substring(0, 1));
            minutes = parseInt(cleaned.substring(1));
        } else if (cleaned.length >= 4) {
            hours = parseInt(cleaned.substring(0, 2));
            minutes = parseInt(cleaned.substring(2));
        }
        if (minutes > 59) return null;
        return hours * 60 + minutes;
    };

    const handleSimuladoScoreChange = (materia: string, field: 'acertos' | 'total', val: string) => {
        setSimuladoScores(prev => ({
            ...prev,
            [materia]: {
                ...prev[materia] || { acertos: '', total: '' },
                [field]: val
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({ type: null, text: '' });

        // --- VALIDAÇÃO TEMPO ---
        const minutes = validateAndConvertTime(tempoHHMM);
        if (minutes === null) {
            setMsg({ type: 'error', text: 'Tempo inválido. Use formato HH:MM.' });
            return;
        }

        if (!assunto || assunto.trim().length < 3) {
            setMsg({ type: 'error', text: isSimulado ? 'Dê um nome ao Simulado.' : 'Preencha o assunto.' });
            return;
        }

        setLoading(true);
        // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'getUser' property.
        const { data: { user } } = await (supabase.auth as any).getUser();

        if (isSimulado) {
            // --- MODO SIMULADO (MÚLTIPLOS REGISTROS) ---
            if (minutes === 0) {
                setLoading(false);
                setMsg({ type: 'error', text: 'Informe o tempo total de prova.' });
                return;
            }
            if (simuladoStats.total === 0) {
                setLoading(false);
                setMsg({ type: 'error', text: 'Preencha o desempenho de pelo menos uma matéria.' });
                return;
            }

            // Validação: Acertos > Total para cada matéria
            // Fix: Explicitly type the score object in find
            const invalidEntry = (Object.entries(simuladoScores) as [string, { acertos: string, total: string }][]).find(([_, score]) => {
                const a = parseInt(score.acertos || '0');
                const t = parseInt(score.total || '0');
                return t > 0 && a > t;
            });

            if (invalidEntry) {
                setLoading(false);
                setMsg({ type: 'error', text: `Erro em ${invalidEntry[0]}: Acertos não podem ser maiores que o total.` });
                return;
            }

            // Fix: Explicitly type the score object in map
            const payloads = (Object.entries(simuladoScores) as [string, { acertos: string, total: string }][]).map(([mat, score]) => {
                const a = parseInt(score.acertos || '0');
                const t = parseInt(score.total || '0');
                if (t === 0) return null;

                // Distribuição Proporcional do Tempo
                const weight = t / simuladoStats.total;
                const subTime = Math.round(minutes * weight);

                return {
                    user_id: user?.id,
                    concurso: missaoAtiva,
                    materia: mat,
                    assunto: assunto, // Nome do Simulado igual para todos
                    data_estudo: dataEstudo,
                    acertos: a,
                    total: t,
                    taxa: (a / t) * 100,
                    tempo: subTime || 1, // Evita 0
                    dificuldade: 'Simulado',
                    relevancia: 10, // Simulados sempre relevantes
                    comentarios: comentarios,
                    rev_24h: false,
                    rev_07d: false,
                    rev_15d: false,
                    rev_30d: false
                };
            }).filter(Boolean); // Remove nulos

            const { error } = await supabase.from('registros_estudos').insert(payloads);

            if (error) {
                setMsg({ type: 'error', text: 'Erro ao salvar simulado: ' + error.message });
            } else {
                setMsg({ type: 'success', text: 'Simulado registrado com sucesso!' });
                onSaved();
                // Reset
                setAssunto('');
                setComentarios('');
                setTempoHHMM('');
                setSimuladoScores({});
            }

        } else {
            // --- MODO ESTUDO (ÚNICO REGISTRO) ---
            if (minutes === 0) {
                setLoading(false);
                setMsg({ type: 'error', text: 'Informe o tempo de estudo.' });
                return;
            }
            if (!materia) {
                setLoading(false);
                setMsg({ type: 'error', text: 'Selecione uma matéria.' });
                return;
            }
            if (singleStats.numericTotal <= 0) {
                setLoading(false);
                setMsg({ type: 'error', text: 'Total de questões deve ser maior que zero.' });
                return;
            }
            if (singleStats.numericAcertos > singleStats.numericTotal) {
                setLoading(false);
                setMsg({ type: 'error', text: 'Acertos não podem ser maiores que o total.' });
                return;
            }

            const payload = {
                user_id: user?.id,
                concurso: missaoAtiva,
                materia,
                assunto,
                data_estudo: dataEstudo,
                acertos: singleStats.numericAcertos,
                total: singleStats.numericTotal,
                taxa: singleStats.percentage,
                tempo: minutes,
                dificuldade,
                relevancia,
                comentarios,
                rev_24h: false,
                rev_07d: false,
                rev_15d: false,
                rev_30d: false
            };

            const { error } = await supabase.from('registros_estudos').insert(payload);

            // Opcional: Banco de Questões
            let bankError = null;
            if (!error && saveToBank) {
                const questionPayload = {
                    user_id: user?.id,
                    concurso: missaoAtiva,
                    data: dataEstudo,
                    materia,
                    assunto,
                    relevancia,
                    anotacoes: comentarios,
                    status: 'Pendente',
                    tags: [],
                    meta: 3
                };
                const { error: qError } = await supabase.from('questoes_revisao').insert(questionPayload);
                bankError = qError;
            }

            if (error || bankError) {
                setMsg({ type: 'error', text: 'Erro ao salvar: ' + (error?.message || bankError?.message) });
            } else {
                setMsg({ type: 'success', text: 'Estudo registrado!' });
                onSaved();
                // Reset parcial
                setAssunto('');
                setAcertos('');
                setTotal('');
                setComentarios('');
                setSaveToBank(false);
                setTempoHHMM('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-20">

            {msg.type && (
                <div className={`mb-8 p-6 rounded-2xl flex items-center gap-4 text-sm font-black border animate-in slide-in-from-top-4 ${msg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {msg.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                    <span className="uppercase tracking-widest">{msg.text}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black flex items-center gap-5 relative z-10 text-[hsl(var(--text-bright))] uppercase tracking-tighter">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-2xl transition-transform duration-500 hover:scale-110 ${isSimulado ? 'bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent-secondary))] shadow-[hsl(var(--accent)/0.3)]' : 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-500/30'}`}>
                            {isSimulado ? '🏆' : '📝'}
                        </div>
                        <span className="text-gradient leading-tight">
                            {isSimulado ? 'Novo Simulado' : 'Novo Estudo'}
                        </span>
                    </h3>
                    {isSimulado && onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex items-center gap-2 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--bg-main))] text-[hsl(var(--text-muted))] font-black px-6 py-2.5 rounded-2xl transition-all border border-[hsl(var(--border))] text-[10px] uppercase tracking-widest active:scale-95"
                        >
                            <X size={14} /> VOLTAR
                        </button>
                    )}
                </div>

                {isSimulado ? (
                    // --- UI ESPECÍFICA PARA SIMULADO (GRADE DE MATÉRIAS) ---
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Calendar size={14} className="text-[hsl(var(--accent))]" /> Data da Prova
                                </label>
                                <input type="date" required className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-black uppercase tracking-widest" value={dataEstudo} onChange={(e) => setDataEstudo(e.target.value)} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <List size={14} className="text-[hsl(var(--accent))]" /> Nome do Simulado
                                </label>
                                <input type="text" required className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-bold placeholder-[hsl(var(--text-muted)/0.5)]" value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex: 1º Simulado TJ-SP" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-center px-4">
                                <label className="text-[11px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Layers size={14} className="text-[hsl(var(--accent))]" /> Desempenho por Matéria
                                </label>
                            </div>

                            {/* Header Desktop - Oculto em Mobile */}
                            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                                <div className="col-span-6">Matéria / Peso</div>
                                <div className="col-span-3 text-center">Acertos</div>
                                <div className="col-span-3 text-center">Total</div>
                            </div>

                            <div className="glass-premium rounded-3xl p-2 border border-[hsl(var(--border))] space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {materiasDisponiveis.map(mat => {
                                    const score = simuladoScores[mat.materia] || { acertos: '', total: '' };
                                    const a = parseInt(score.acertos || '0');
                                    const t = parseInt(score.total || '0');
                                    const isInvalid = t > 0 && a > t;

                                    return (
                                        <div key={mat.materia} className="grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-4 items-center p-3 md:p-2 hover:bg-white/5 rounded-lg transition-colors border-b border-white/5 md:border-0 last:border-0">
                                            {/* Matéria (Ocupa linha inteira no mobile, ou 6 cols no desktop) */}
                                            <div className="col-span-2 md:col-span-6 flex justify-between md:block items-center mb-1 md:mb-0">
                                                <div className="font-bold text-sm text-slate-300 truncate" title={mat.materia}>{mat.materia}</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase bg-slate-800 px-2 py-0.5 rounded md:bg-transparent md:px-0">Peso {mat.peso || 1}</div>
                                            </div>

                                            {/* Inputs (Lado a lado no mobile) */}
                                            <div className="col-span-1 md:col-span-3 relative">
                                                <label className="md:hidden text-[9px] text-slate-500 font-bold uppercase mb-1 block">Acertos</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className={`w-full bg-slate-950/30 border ${isInvalid ? 'border-red-500 text-red-400' : 'border-white/10 text-green-400'} rounded-lg px-2 py-2 md:py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-1 focus:ring-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                                    value={score.acertos}
                                                    onChange={e => handleSimuladoScoreChange(mat.materia, 'acertos', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-3 relative">
                                                <label className="md:hidden text-[9px] text-slate-500 font-bold uppercase mb-1 block">Total</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className="w-full bg-slate-950/30 border border-white/10 rounded-lg px-2 py-2 md:py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={score.total}
                                                    onChange={e => handleSimuladoScoreChange(mat.materia, 'total', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <Clock size={14} className="text-[hsl(var(--accent))]" /> Tempo Total de Prova
                                    </label>
                                    <input type="text" placeholder="HH:MM" maxLength={5} required className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-black text-center text-lg" value={tempoHHMM} onChange={handleTimeChange} />
                                </div>

                                <div className="glass-premium bg-gradient-to-r from-[hsl(var(--bg-user-block))] to-[hsl(var(--bg-card))] p-6 rounded-3xl border border-[hsl(var(--border))] flex flex-col justify-center shadow-2xl gap-2">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-1">Aproveitamento</div>
                                            <div className={`text-2xl font-black uppercase tracking-tighter ${simuladoStats.perc >= 80 ? 'text-green-400' : simuladoStats.perc >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {simuladoStats.perc.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-[hsl(var(--text-bright))] leading-none tracking-tighter">
                                                {simuladoStats.acertos} <span className="text-base text-[hsl(var(--text-muted))] font-medium">/ {simuladoStats.total}</span>
                                            </div>
                                            <div className="text-[9px] text-[hsl(var(--text-muted))] uppercase font-black tracking-widest mt-1">Questões Totais</div>
                                        </div>
                                    </div>
                                    {simuladoStats.maxWeighted > 0 && (
                                        <div className="pt-3 border-t border-[hsl(var(--border))] flex justify-between items-center">
                                            <div className="text-[10px] font-black text-[hsl(var(--accent))] uppercase tracking-widest">Pontuação Ponderada</div>
                                            <div className="text-base font-black text-[hsl(var(--text-bright))] tracking-tighter">
                                                {simuladoStats.weighted.toFixed(1)} <span className="text-[hsl(var(--text-muted))] text-xs">/ {simuladoStats.maxWeighted}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    // --- UI PADRÃO (MATÉRIA ÚNICA) ---
                    <>
                        {/* PASSO 1: IDENTIFICAÇÃO */}
                        <div className="glass-premium p-8 rounded-3xl border border-[hsl(var(--border))] space-y-6">
                            <h4 className="text-xs font-black text-[hsl(var(--text-muted))] flex items-center gap-3 uppercase tracking-[0.2em]"><BookOpen size={18} className="text-[hsl(var(--accent))]" /> Identificação</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Data do Estudo</label>
                                    <input type="date" required className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-black uppercase tracking-widest" value={dataEstudo} onChange={(e) => setDataEstudo(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Matéria</label>
                                    <div className="relative">
                                        <select required className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-bold appearance-none cursor-pointer" value={materia} onChange={(e) => setMateria(e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {materiasDisponiveis.map(m => <option key={m.materia} value={m.materia}>{m.materia}</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2" ref={dropdownRef}>
                                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Assunto / Tópico</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all text-[hsl(var(--text-bright))] font-bold placeholder-[hsl(var(--text-muted)/0.5)]"
                                        value={assunto}
                                        onChange={(e) => {
                                            setAssunto(e.target.value);
                                        }}
                                        onClick={() => {
                                            if (materia && topicosDisponiveis.length > 0) setShowTopicsDropdown(true);
                                        }}
                                        placeholder="Ex: Crase"
                                    />
                                    {materia && topicosDisponiveis.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowTopicsDropdown(!showTopicsDropdown)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] rounded-lg transition-colors"
                                            title="Ver lista completa de tópicos"
                                        >
                                            {showTopicsDropdown ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                    )}
                                    {showTopicsDropdown && materia && topicosDisponiveis.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-3 bg-[hsl(var(--bg-sidebar))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-4 backdrop-blur-3xl">
                                            {topicosDisponiveis.map((t, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => {
                                                        setAssunto(t);
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

                        {/* PASSO 2: PERFORMANCE */}
                        <div className="glass-premium p-8 rounded-3xl border border-[hsl(var(--border))] space-y-6">
                            <h4 className="text-xs font-black text-[hsl(var(--text-muted))] flex items-center gap-3 uppercase tracking-[0.2em]"><Target size={18} className="text-[hsl(var(--accent))]" /> Performance</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2"><label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Tempo (HH:MM)</label><input type="text" placeholder="HH:MM" maxLength={5} required className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] text-[hsl(var(--text-bright))] font-black text-center text-lg" value={tempoHHMM} onChange={handleTimeChange} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Acertos</label><input type="number" min="0" className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500/50 text-green-400 font-black text-center text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={acertos} onChange={(e) => setAcertos(e.target.value)} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Total Questões</label><input type="number" min="1" className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] text-[hsl(var(--text-bright))] font-black text-center text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
                            </div>
                            {singleStats.numericTotal > 0 && <div className={`flex flex-col items-center justify-center bg-[hsl(var(--bg-user-block))] rounded-2xl p-6 border transition-all duration-500 ${singleStats.percentage >= 80 ? 'border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : singleStats.percentage >= 60 ? 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]'}`}><span className="text-[10px] text-[hsl(var(--text-muted))] font-black uppercase tracking-[0.2em] mb-2">Taxa de Aproveitamento</span><div className={`text-4xl font-black tracking-tighter ${singleStats.percentage >= 80 ? 'text-green-400' : singleStats.percentage >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{singleStats.percentage.toFixed(0)}%</div></div>}
                        </div>

                        {/* PASSO 3: ANÁLISE */}
                        <div className="glass-premium p-8 rounded-3xl border border-[hsl(var(--border))] space-y-6">
                            <h4 className="text-xs font-black text-[hsl(var(--text-muted))] flex items-center gap-3 uppercase tracking-[0.2em]"><FileText size={18} className="text-[hsl(var(--accent))]" /> Análise Qualitativa</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3"><label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Dificuldade Sentida</label><div className="flex gap-2 bg-[hsl(var(--bg-user-block))] p-1.5 rounded-2xl border border-[hsl(var(--border))]">{['🟢 Fácil', '🟡 Médio', '🔴 Difícil'].map(d => (<button key={d} type="button" onClick={() => setDificuldade(d)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dificuldade === d ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg shadow-[hsl(var(--accent)/0.3)]' : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))]'}`}>{d.split(' ')[1]}</button>))}</div></div>
                                <div className="space-y-3"><label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1 flex justify-between"><span>Relevância</span><span className="text-[hsl(var(--accent))]">{relevancia}/10</span></label><input type="range" min="1" max="10" className="w-full accent-[hsl(var(--accent))] h-2 bg-[hsl(var(--bg-user-block))] rounded-full appearance-none cursor-pointer" value={relevancia} onChange={(e) => setRelevancia(parseInt(e.target.value))} /></div>
                            </div>
                            <div className="space-y-3"><label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Anotações / Observações</label><textarea className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all h-32 text-sm text-[hsl(var(--text-main))] font-bold placeholder-[hsl(var(--text-muted)/0.5)] resize-none" placeholder="Pontos chave, links, impressões..." value={comentarios} onChange={(e) => setComentarios(e.target.value)} /></div>
                        </div>
                    </>
                )}

                {/* ANOTAÇÕES GERAIS (Simulado) & AÇÕES FINAIS */}
                <div className="space-y-4">
                    {isSimulado && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Anotações Gerais / Observações</label>
                            <textarea
                                className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all h-24 text-sm text-slate-300 placeholder-slate-600"
                                placeholder="Pontos chave, links, impressões..."
                                value={comentarios}
                                onChange={(e) => setComentarios(e.target.value)}
                            />
                        </div>
                    )}
                    {!isSimulado && (
                        <div className="pt-4 border-t border-white/5">
                            <label className="flex items-center gap-4 cursor-pointer group p-3 rounded-xl border border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${saveToBank ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 bg-slate-900/30'}`}>
                                    {saveToBank && <CheckCircle2 size={14} className="text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={saveToBank} onChange={e => setSaveToBank(e.target.checked)} />
                                <div className="flex-1">
                                    <span className={`text-sm font-bold block ${saveToBank ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                        Salvar no Banco de Questões
                                    </span>
                                </div>
                            </label>
                        </div>
                    )}

                    <div className="flex gap-6 pt-6 border-t border-[hsl(var(--border))]">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-[hsl(var(--accent))] hover:scale-[1.02] active:scale-95 text-[hsl(var(--bg-main))] font-black py-5 rounded-2xl shadow-2xl shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 text-xs uppercase tracking-[0.2em]"
                        >
                            {loading ? (
                                <>
                                    <div className="w-6 h-6 border-4 border-[hsl(var(--bg-main))/0.3] border-t-[hsl(var(--bg-main))] rounded-full animate-spin"></div>
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <Calculator size={20} /> <span>Salvar Registro Inteligente</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default StudyForm;