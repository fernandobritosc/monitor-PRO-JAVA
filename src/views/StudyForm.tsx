import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { EditalMateria, StudyRecord, ErrorAnalysis } from '../types';
import { ExamBoard } from '../constants/examBoards';
import { getErrorMessage } from '../utils/error';
import { logger } from '../utils/logger';
import { generateAIContent, parseAIJSON } from '../services/aiService';
import { syncService } from '../services/offline/sync';
import { useSession } from '../hooks/useSession';
import { useEditais } from '../hooks/queries/useEditais';
import { useAppStore } from '../stores/useAppStore';
import { useTimerStore } from '../stores/useTimerStore';
import { ESTUDO_LIVRE } from '../constants';
import { getLocalToday, handleTimeMask, validateAndConvertTime } from '../utils/form';
import SimuladoFormSection from '../components/features/study/SimuladoFormSection';
import { StudyFormHeader } from '../components/features/study-form/StudyFormHeader';
import { IdentificationSection } from '../components/features/study-form/IdentificationSection';
import { PerformanceSection } from '../components/features/study-form/PerformanceSection';
import { AnalysisSection } from '../components/features/study-form/AnalysisSection';
import { FormMessageBanner } from '../components/shared/FormMessageBanner';
import { SubmitButton } from '../components/shared/SubmitButton';
import { RichTextEditor } from '../components/shared/RichTextEditor';

interface StudyFormProps {
    editais?: EditalMateria[];
    missaoAtiva?: string;
    onSaved?: () => void;
    isSimulado?: boolean;
    onCancel?: () => void;
}

export const StudyForm: React.FC<StudyFormProps> = ({ editais: editaisProps, missaoAtiva: missaoAtivaProps, onSaved: onSavedProps, isSimulado = false, onCancel }) => {
    const { userId } = useSession();
    const { editais: editaisQuery, addTopicoToMateria } = useEditais(userId);
    const missaoAtivaStore = useAppStore(state => state.missaoAtiva);
    const editais = editaisProps ?? editaisQuery;
    const missaoAtiva = missaoAtivaProps ?? missaoAtivaStore;
    const onSaved = onSavedProps ?? (() => {});
    const isEstudoLivre = missaoAtiva === ESTUDO_LIVRE;
    // Form States
    const [dataEstudo, setDataEstudo] = useState(getLocalToday());
    const [tempoHHMM, setTempoHHMM] = useState('');

    // Single Record States
    const [materia, setMateria] = useState('');
    const [assunto, setAssunto] = useState('');
    const [acertos, setAcertos] = useState<string>('');
    const [total, setTotal] = useState<string>('');
    // Error Algorithm States
    const [gabarito, setGabarito] = useState('');
    const [minha_resposta, setMinha_resposta] = useState('');
    const [comentarios, setComentarios] = useState('');
    const [errorText, setErrorText] = useState('');

    // Timer integration
    const timerSeconds = useTimerStore(state => state.seconds);

    const handleFillFromTimer = () => {
        const hrs = Math.floor(timerSeconds / 3600);
        const mins = Math.floor((timerSeconds % 3600) / 60);
        setTempoHHMM(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    };

    // Multi Record States (Simulado)
    const [simuladoScores, setSimuladoScores] = useState<Record<string, { acertos: string, total: string }>>({});

    // Exam Board State
    const [examBoard, setExamBoard] = useState<ExamBoard>('CESPE');

    // UI States
    const [loading, setLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info' | null, text: string }>({ type: null, text: '' });

    // New Meta State
    const [meta, setMeta] = useState('');
    const [tipo, setTipo] = useState<'Estudo' | 'Revisão'>('Estudo');

    // Error Algorithm States (moved up)
    const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysis[]>([]);

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

    // Reseta o formulário quando a missão ativa muda (ignora o mount inicial)
    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        setMateria('');
        setAssunto('');
        setAcertos('');
        setTotal('');
        setComentarios('');
        setGabarito('');
        setMinha_resposta('');
        setErrorText('');
        setErrorAnalysis([]);
        setSimuladoScores({});
        logger.info('UI', `📋 Formulário resetado para nova missão: ${missaoAtiva}`);
    }, [missaoAtiva]);

    // Reseta o assunto quando a matéria muda
    useEffect(() => {
        if (!isSimulado) setAssunto('');
    }, [materia, isSimulado]);

    // Lógica do Algoritmo de Erros
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
                        materia,
                        assunto,
                        tempo: tempoHHMM,
                        acertos,
                        total,
                        percentage: singleStats.percentage,
                        gabarito,
                        minha_resposta: minha_resposta
                    }
                },
                geminiKey,
                groqKey,
                'gemini',
                'analise_erros'
            );

            const parsed: ErrorAnalysis[] = parseAIJSON(result);

            const enriched: ErrorAnalysis[] = parsed.map(p => ({
                ...p,
                gabarito: (p.gabarito || gabarito || "").toString().replace(/#GABARITO|#ERREI|#ERRO|#RESPOSTA/gi, "").trim() || undefined,
                minha_resposta: (p.minha_resposta || minha_resposta || "").toString().replace(/#GABARITO|#ERREI|#ERRO|#RESPOSTA/gi, "").trim() || undefined
            }));

            setErrorAnalysis(prev => [...prev, ...enriched]);

            setErrorText('');
            setGabarito('');
            setMinha_resposta('');
            setMsg({ type: 'success', text: 'Questão analisada e adicionada!' });
        } catch (error) {
            logger.error('AI', 'Erro na análise de IA:', error);
            setMsg({ type: 'error', text: 'Falha ao analisar erros com IA: ' + getErrorMessage(error) });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleImageUpload = async (file: File): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
            const filePath = `images/${fileName}`;

            const { error } = await supabase.storage.from('questions').upload(filePath, file);

            if (error) {
                if (error.message.includes('bucket not found')) {
                    alert('Bucket "questions" não encontrado. Crie o bucket no Supabase Storage primeiro.');
                }
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage.from('questions').getPublicUrl(filePath);
            return publicUrl;
        } catch (error) {
            logger.error('UI', 'Error uploading image:', error);
            return null;
        }
    };

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

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempoHHMM(handleTimeMask(e.target.value));
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

    const handleAnalyze = (text: string) => {
        if (text.trim()) {
            handleAnalyzeErrors(text);
        } else {
            setMsg({ type: 'error', text: 'Cole o texto do erro primeiro.' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({ type: null, text: '' });

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
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (isSimulado) {
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

            const payloads = (Object.entries(simuladoScores) as [string, { acertos: string, total: string }][]).map(([mat, score]) => {
                const a = parseInt(score.acertos || '0');
                const t = parseInt(score.total || '0');
                if (t === 0) return null;

                const weight = t / simuladoStats.total;
                const subTime = Math.round(minutes * weight);

                return {
                    user_id: user?.id,
                    concurso: missaoAtiva,
                    materia: mat,
                    assunto: assunto,
                    data_estudo: dataEstudo,
                    acertos: a,
                    total: t,
                    taxa: (a / t) * 100,
                    tempo: subTime || 1,
                    comentarios: comentarios,
                    rev_24h: false,
                    rev_07d: false,
                    rev_15d: false,
                    rev_30d: false,
                    tipo: 'Simulado'
                };
            }).filter((p): p is NonNullable<typeof p> => p !== null);

            try {
                await Promise.all(payloads.map(p => syncService.saveAttempt(p)));
                setMsg({ type: 'success', text: navigator.onLine ? 'Simulado registrado com sucesso!' : 'Simulado salvo localmente (modo offline)' });
                onSaved();
                setComentarios('');
                setTempoHHMM('');
                setSimuladoScores({});
            } catch (error) {
                setMsg({ type: 'error', text: 'Erro ao salvar simulado: ' + getErrorMessage(error) });
            }

        } else {
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
            if (singleStats.numericTotal > 0 && singleStats.numericAcertos > singleStats.numericTotal) {
                setLoading(false);
                setMsg({ type: 'error', text: 'Acertos não podem ser maiores que o total.' });
                return;
            }

            const payload: Partial<StudyRecord> = {
                user_id: user?.id,
                concurso: missaoAtiva,
                materia,
                assunto,
                data_estudo: dataEstudo,
                acertos: singleStats.numericAcertos,
                total: singleStats.numericTotal,
                taxa: singleStats.percentage,
                tempo: minutes,
                comentarios,
                rev_24h: false,
                rev_07d: false,
                rev_15d: false,
                rev_30d: false,
                meta: meta.trim() || null,
                tipo,
                analise_erros: errorAnalysis.length > 0 ? errorAnalysis : undefined
            };

            try {
                if (isEstudoLivre && assunto && assunto.trim()) {
                    try {
                        await addTopicoToMateria({
                            concurso: missaoAtiva,
                            materia,
                            topico: assunto.trim()
                        });
                    } catch (topicoError) {
                        logger.warn('SYNC', 'Estudo Livre: Erro ao adicionar tópico automaticamente', topicoError);
                    }
                }

                await syncService.saveAttempt(payload);

                setMsg({ type: 'success', text: 'Estudo registrado!' });
                onSaved();
                setAssunto('');
                setAcertos('');
                setTotal('');
                setComentarios('');
                setMeta('');
                setTempoHHMM('');
                setErrorText('');
                setErrorAnalysis([]);
                setTipo('Estudo');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                setMsg({ type: 'error', text: 'Erro ao salvar: ' + getErrorMessage(error) });
            }
        }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-20">
            <FormMessageBanner msg={msg.type ? { type: msg.type, text: msg.text } : null} />

            <form onSubmit={handleSubmit} className="space-y-6">
                <StudyFormHeader isSimulado={isSimulado} onCancel={onCancel} />

                {isSimulado ? (
                    <SimuladoFormSection
                        materiasDisponiveis={materiasDisponiveis}
                        dataEstudo={dataEstudo}
                        onDataEstudoChange={setDataEstudo}
                        assunto={assunto}
                        onAssuntoChange={setAssunto}
                        tempoHHMM={tempoHHMM}
                        onTimeChange={handleTimeChange}
                        simuladoScores={simuladoScores}
                        onSimuladoScoreChange={handleSimuladoScoreChange}
                        board={examBoard}
                        onBoardChange={setExamBoard}
                    />
                ) : (
                    <>
                        <IdentificationSection
                            tipo={tipo}
                            setTipo={setTipo}
                            dataEstudo={dataEstudo}
                            setDataEstudo={setDataEstudo}
                            materia={materia}
                            setMateria={setMateria}
                            materiasDisponiveis={materiasDisponiveis}
                            assunto={assunto}
                            setAssunto={setAssunto}
                            topicosDisponiveis={topicosDisponiveis}
                        />

                        <PerformanceSection
                            acertos={acertos}
                            setAcertos={setAcertos}
                            total={total}
                            setTotal={setTotal}
                            tempoHHMM={tempoHHMM}
                            setTempoHHMM={setTempoHHMM}
                            meta={meta}
                            setMeta={setMeta}
                            taxa={singleStats.percentage}
                            timerSeconds={timerSeconds}
                            onFillFromTimer={handleFillFromTimer}
                        />

                        <AnalysisSection
                            gabarito={gabarito}
                            setGabarito={setGabarito}
                            minha_resposta={minha_resposta}
                            setMinha_resposta={setMinha_resposta}
                            comentarios={comentarios}
                            setComentarios={setComentarios}
                            errorText={errorText}
                            setErrorText={setErrorText}
                            isAnalyzing={isAnalyzing}
                            handleAnalyze={handleAnalyze}
                            errorAnalysis={errorAnalysis}
                            onClearAnalyses={() => setErrorAnalysis([])}
                            onRemoveAnalysis={(idx) => {
                                const filtered = [...errorAnalysis];
                                filtered.splice(idx, 1);
                                setErrorAnalysis(filtered);
                            }}
                            onImageUpload={handleImageUpload}
                            onError={(text) => setMsg({ type: 'error', text })}
                        />
                    </>
                )}

                <div className="space-y-4">
                    {isSimulado && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Anotações Gerais / Observações</label>
                            <RichTextEditor
                                content={comentarios}
                                onChange={setComentarios}
                                placeholder="Pontos chave, links, impressões..."
                                minHeight="min-h-[120px]"
                                onImageUpload={handleImageUpload}
                            />
                        </div>
                    )}

                    <SubmitButton loading={loading} />
                </div>
            </form>
        </div>
    );
};

export default StudyForm;
