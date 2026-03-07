import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StudyRecord, ErrorAnalysis } from '../types';
import { Zap, Target, BookOpen, List, Filter, Download, Search, AlertTriangle, CheckCircle2, FileText, ChevronDown, ChevronRight, Brain, Sparkles, Loader2, Activity, Info, X, Check } from 'lucide-react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { generateAIContent } from '../services/aiService';
import { CustomSelector } from '../components/CustomSelector';

interface ErrorAnalysisViewProps {
    records: StudyRecord[];
    missaoAtiva: string;
}

const PerformanceHeatmap: React.FC<{ records: StudyRecord[], missaoAtiva: string, onSelectAssunto?: (materia: string, assunto: string) => void }> = ({ records, missaoAtiva, onSelectAssunto }) => {
    const data = useMemo(() => {
        const heatmap: Record<string, Record<string, { total: number, errors: number, hits: number }>> = {};

        records
            .filter(r => r.concurso === missaoAtiva && r.total > 0)
            .forEach(r => {
                if (!heatmap[r.materia]) heatmap[r.materia] = {};
                if (!heatmap[r.materia][r.assunto]) {
                    heatmap[r.materia][r.assunto] = { total: 0, errors: 0, hits: 0 };
                }
                const current = heatmap[r.materia][r.assunto];
                current.total += r.total;
                current.hits += r.acertos;
                // Filtrar apenas erros que não foram resolvidos ainda
                const unresolvedErrors = r.analise_erros?.filter(e => !e.resolved).length || (r.total - r.acertos);
                current.errors += unresolvedErrors;
            });

        return heatmap;
    }, [records, missaoAtiva]);
    // ... (rest of the component remains similar, just adding onSelectAssunto)

    const getIntensityColor = (errors: number, total: number) => {
        const rate = errors / total;
        if (errors === 0) return 'bg-white/5 border-white/5 opacity-40';
        if (rate > 0.6 || errors > 20) return 'bg-red-500/30 border-red-500/50 shadow-[0_0_15px_-5px_red]';
        if (rate > 0.4 || errors > 10) return 'bg-orange-500/30 border-orange-500/50 shadow-[0_0_15px_-5px_orange]';
        if (rate > 0.2 || errors > 5) return 'bg-yellow-500/20 border-yellow-500/40';
        return 'bg-blue-500/10 border-blue-500/20';
    };

    const getTextColor = (errors: number, total: number) => {
        const rate = errors / total;
        if (errors === 0) return 'text-slate-500';
        if (rate > 0.6 || errors > 20) return 'text-red-400';
        if (rate > 0.4 || errors > 10) return 'text-orange-400';
        if (rate > 0.2 || errors > 5) return 'text-yellow-400';
        return 'text-blue-400';
    };

    if (Object.keys(data).length === 0) return null;

    return (
        <div className="glass-premium p-8 rounded-[2.5rem] border border-[hsl(var(--border))] space-y-8 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                <Activity size={120} className="text-[hsl(var(--accent))]" />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Mapa de Calor de Fragilidades
                    </h3>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1 ml-5">
                        Identificação instantânea de gargalos por tópicos
                    </p>
                </div>
                <div className="flex items-center gap-4 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                    <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase"><div className="w-2 h-2 rounded bg-blue-500/20 border border-blue-500/30" /> Estável</div>
                    <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase"><div className="w-2 h-2 rounded bg-yellow-500/20 border border-yellow-500/30" /> Alerta</div>
                    <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase"><div className="w-2 h-2 rounded bg-red-500/30 border border-red-500/30" /> Crítico</div>
                </div>
            </div>

            <div className="space-y-10 relative z-10">
                {Object.entries(data).map(([materia, assuntos]) => (
                    <div key={materia} className="space-y-4">
                        <h4 className="text-[10px] font-black text-[hsl(var(--accent))] uppercase tracking-[0.3em] px-1 border-l-2 border-[hsl(var(--accent))] ml-1">
                            {materia}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {Object.entries(assuntos).map(([assunto, stats]) => (
                                <motion.div
                                    key={assunto}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    onClick={() => onSelectAssunto?.(materia, assunto)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group/item ${getIntensityColor(stats.errors, stats.total)}`}
                                >
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-[9px] font-black text-white leading-tight uppercase line-clamp-2">
                                                {assunto}
                                            </span>
                                            <Info size={10} className="text-white/20 shrink-0" />
                                        </div>
                                        <div className="flex items-end justify-between gap-1">
                                            <div className={`text-lg font-black tracking-tighter ${getTextColor(stats.errors, stats.total)}`}>
                                                {Math.round((stats.hits / stats.total) * 100)}%
                                            </div>
                                            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mb-1">
                                                {stats.errors} erros
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tooltip on Hover */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl opacity-0 group-hover/item:opacity-100 transition-opacity z-20 p-2 text-center pointer-events-none">
                                        <p className="text-[9px] font-black text-white uppercase tracking-tighter">
                                            {stats.hits} Acertos / {stats.total} Total
                                        </p>
                                        <p className="text-[7px] font-bold text-[hsl(var(--accent))] uppercase mt-1">Clique para Recuperar</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const RecoveryMode: React.FC<{
    errors: (ErrorAnalysis & { recordId: string; materia: string; assunto: string; id: string })[];
    onClose: () => void;
    onUpdateError: (recordId: string, errorId: string, resolved: boolean) => Promise<void>;
}> = ({ errors, onClose, onUpdateError }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const currentError = errors[currentIndex];

    const parsedContent = useMemo(() => {
        const text = currentError?.enunciado_completo || currentError?.questao_preview || '';

        // Dividir pelo espaço seguido por uma letra de A-E e um separador (. ou ) ou espaço)
        // Usamos lookahead assertivo para não consumir a letra no split
        const parts = text.split(/\s(?=[A-E][\.\s\)])/);

        if (parts.length <= 1) return { statement: text, alternatives: [] };

        return {
            statement: (parts[0] || '').trim(),
            alternatives: parts.slice(1).map(a => (a || '').trim()).filter(Boolean)
        };
    }, [currentError]);

    if (!currentError) return null;

    const handleAnswer = async () => {
        if (!userAnswer.trim() || isUpdating) return;

        const isCorrect = userAnswer.trim().toLowerCase() === (currentError.gabarito ? String(currentError.gabarito).trim().toLowerCase() : '');
        setIsUpdating(true);

        if (isCorrect) {
            setShowResult('correct');
            await onUpdateError(currentError.recordId, currentError.id, true);
        } else {
            setShowResult('wrong');
            await onUpdateError(currentError.recordId, currentError.id, false);
        }

        setIsUpdating(false);
    };

    const nextQuestion = () => {
        setShowResult(null);
        setUserAnswer('');
        if (currentIndex < errors.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
        >
            <div className="w-full max-w-3xl relative">
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="glass-premium p-8 rounded-[2.5rem] border border-[hsl(var(--border))] space-y-6 shadow-2xl bg-black/40 max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between sticky top-0 bg-transparent backdrop-blur-sm z-10 pb-4 border-b border-white/5">
                        <div className="space-y-1">
                            <h3 className="text-xs font-black text-[hsl(var(--accent))] uppercase tracking-widest">
                                {currentError.materia}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                {currentError.assunto}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {currentError.failed_attempts && currentError.failed_attempts > 0 && (
                                <div className="text-[10px] font-black text-red-400 uppercase tracking-tighter bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 animate-pulse">
                                    {currentError.failed_attempts}x ❌
                                </div>
                            )}
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-white/5 px-3 py-1 rounded-full">
                                Questão {currentIndex + 1} de {errors.length}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                            <p className="text-sm font-medium text-slate-200 leading-relaxed italic">
                                {parsedContent.statement}
                            </p>
                        </div>

                        {parsedContent.alternatives.length > 0 && (
                            <div className="grid grid-cols-1 gap-3">
                                {parsedContent.alternatives.map((alt, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs font-medium text-slate-400 leading-snug">
                                        {alt}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {!showResult ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-4">Sua Resposta (Gabarito)</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Digite a alternativa ou resposta..."
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] outline-none transition-all placeholder:opacity-20"
                                    value={userAnswer}
                                    onChange={e => setUserAnswer(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAnswer()}
                                />
                            </div>
                            <button
                                onClick={handleAnswer}
                                disabled={!userAnswer.trim() || isUpdating}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent))] brightness-90 hover:brightness-110 text-black font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 group"
                            >
                                {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                Confirmar Resposta
                            </button>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-6 rounded-3xl border ${showResult === 'correct' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} space-y-4`}
                        >
                            <div className="flex items-center gap-3">
                                {showResult === 'correct' ? (
                                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                                        <Check size={20} className="stroke-[3]" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-black">
                                        <X size={20} className="stroke-[3]" />
                                    </div>
                                )}
                                <div>
                                    <h4 className={`text-sm font-black uppercase tracking-tight ${showResult === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {showResult === 'correct' ? 'Eliminado!' : 'Tente Novamente'}
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">
                                        Gabarito: <span className="text-white">{currentError.gabarito}</span>
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={nextQuestion}
                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                {currentIndex < errors.length - 1 ? 'Próxima Questão' : 'Concluir Recuperação'}
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export const ErrorAnalysisView: React.FC<ErrorAnalysisViewProps> = ({ records, missaoAtiva }) => {
    // States para Filtros
    const [filterMateria, setFilterMateria] = useState('');
    const [filterAssunto, setFilterAssunto] = useState('');
    const [filterMeta, setFilterMeta] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [macroDiagnosis, setMacroDiagnosis] = useState<string | null>(null);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [selectedRecovery, setSelectedRecovery] = useState<{ materia: string; assunto: string } | null>(null);

    // Extrair todos os erros qualitativos dos registros da missão ativa
    const allErrors = useMemo(() => {
        const errors: (ErrorAnalysis & { recordId: string; materia: string; assunto: string; meta?: string | number | null; data: string; id: string })[] = [];
        records
            .filter(r => r.concurso === missaoAtiva && r.analise_erros && r.analise_erros.length > 0)
            .forEach(r => {
                r.analise_erros?.forEach(err => {
                    const preview = err.questao_preview || '';
                    const fallbackId = `${r.id}-${preview.substring(0, 15).replace(/\s+/g, '')}`;
                    errors.push({
                        ...err,
                        id: err.id || fallbackId,
                        recordId: r.id,
                        materia: r.materia,
                        assunto: r.assunto,
                        meta: r.meta,
                        data: r.data_estudo,
                        sugestao_mentor: (err as any).sugestao_mentor,
                        failed_attempts: err.failed_attempts ? Number(err.failed_attempts) : 0,
                        resolved: !!err.resolved
                    });
                });
            });
        return errors.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [records, missaoAtiva]);

    const [overrides, setOverrides] = useState<Record<string, { resolved?: boolean; failed_attempts?: number }>>({});

    // Erros consolidados com os overrides da sessão
    const localErrors = useMemo(() => {
        return allErrors.map(err => {
            const override = overrides[err.id];
            if (!override) return err;
            return {
                ...err,
                resolved: override.resolved !== undefined ? override.resolved : err.resolved,
                failed_attempts: override.failed_attempts !== undefined ? override.failed_attempts : err.failed_attempts
            };
        });
    }, [allErrors, overrides]);

    const handleUpdateError = async (recordId: string, errorId: string, resolved: boolean) => {
        console.log(`[Recovery] Atualizando Erro - ID: ${errorId}, Resolvido: ${resolved}`);
        try {
            // Atualização Otimista via Overrides
            const currentErr = localErrors.find(e => e.id === errorId);
            const currentAttempts = Number(currentErr?.failed_attempts || 0);
            const newAttempts = !resolved ? currentAttempts + 1 : currentAttempts;

            setOverrides(prev => ({
                ...prev,
                [errorId]: { resolved, failed_attempts: newAttempts }
            }));

            console.log(`[Recovery] Override aplicado: ID ${errorId} -> Tentativas: ${newAttempts}`);

            const record = records.find(r => r.id === recordId);
            if (!record || !record.analise_erros) return;

            const updatedAnalise = record.analise_erros.map(err => {
                const currentId = err.id || `${recordId}-${err.questao_preview.substring(0, 15).replace(/\s+/g, '')}`;
                if (currentId === errorId) {
                    const newAttempts = !resolved ? (Number(err.failed_attempts) || 0) + 1 : Number(err.failed_attempts);
                    return {
                        ...err,
                        id: currentId, // PERSISTE O ID NO BANCO
                        resolved: resolved,
                        failed_attempts: newAttempts
                    };
                }
                return err;
            });

            const { error } = await supabase
                .from('study_records')
                .update({ analise_erros: updatedAnalise })
                .eq('id', recordId);

            if (error) throw error;
            console.log(`[Recovery] Banco de dados atualizado com sucesso para o ID ${errorId}`);
        } catch (err) {
            console.error("[Recovery] Erro ao atualizar status do erro:", err);
        }
    };

    // Opções de Filtro Únicas
    const materiaOptions = useMemo(() => Array.from(new Set(allErrors.map(e => e.materia))).sort(), [allErrors]);

    const assuntoOptions = useMemo(() => {
        const errorsForMateria = filterMateria ? allErrors.filter(e => e.materia === filterMateria) : allErrors;
        return Array.from(new Set(errorsForMateria.map(e => e.assunto))).sort();
    }, [allErrors, filterMateria]);

    const metaOptions = useMemo(() => Array.from(new Set(allErrors.map(e => String(e.meta || '')))).filter(Boolean).sort(), [allErrors]);

    // Aplicar Filtros
    const filteredErrors = useMemo(() => {
        return allErrors.filter(err => {
            const matchMateria = !filterMateria || err.materia === filterMateria;
            const matchAssunto = !filterAssunto || err.assunto === filterAssunto;
            const matchMeta = !filterMeta || String(err.meta) === filterMeta;
            const matchSearch = !searchTerm ||
                (err.questao_preview || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (err.gatilho || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (err.assunto || '').toLowerCase().includes(searchTerm.toLowerCase());

            return matchMateria && matchAssunto && matchMeta && matchSearch;
        });
    }, [allErrors, filterMateria, filterAssunto, filterMeta, searchTerm]);

    // Análise Transversal
    const transversalAnalysis = useMemo(() => {
        if (filteredErrors.length === 0) return null;

        const counts = { 'Atenção': 0, 'Lacuna de Base': 0, 'Interpretação': 0 };
        filteredErrors.forEach(err => {
            if (counts[err.tipo_erro] !== undefined) counts[err.tipo_erro]++;
        });

        const total = filteredErrors.length;
        const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        const percCommon = ((counts[mostCommon as keyof typeof counts] / total) * 100).toFixed(0);

        return {
            total,
            counts,
            insight: `${percCommon}% das suas falhas são por ${mostCommon}.`,
            action: mostCommon === 'Atenção' ? 'Reduzir ritmo e grifar comandos negativos.' :
                mostCommon === 'Lacuna de Base' ? 'Voltar à teoria base deste assunto imediatamente.' :
                    'Melhorar leitura luso-textual e análise de alternativas.'
        };
    }, [filteredErrors]);

    const handleGenerateMacroDiagnosis = async () => {
        if (filteredErrors.length === 0) return;
        setIsSynthesizing(true);
        try {
            const geminiKey = getGeminiKey();
            const groqKey = getGroqKey();

            // Consolidar todos os comentários do mentor para análise
            const mentorReports = filteredErrors.map(err => ({
                materia: err.materia,
                assunto: err.assunto,
                tipo_erro: err.tipo_erro,
                sugestao_mentor: err.sugestao_mentor || 'N/A'
            }));

            const result = await generateAIContent(
                { content: JSON.stringify(mentorReports) },
                geminiKey,
                groqKey,
                'gemini',
                'macro_diagnostico'
            );

            setMacroDiagnosis(result);
        } catch (error) {
            console.error('Erro ao gerar macro-diagnóstico:', error);
            alert("Falha ao gerar o diagnóstico sintético.");
        } finally {
            setIsSynthesizing(false);
        }
    };

    const stats = transversalAnalysis?.counts || { 'Atenção': 0, 'Lacuna de Base': 0, 'Interpretação': 0 };

    const cleanText = (text: string) => {
        if (!text) return "";
        // Remove Emojis and problematic Unicode sequences that jsPDF standard fonts don't support
        return text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\u200D|\uFE0F/g, '')
            .replace(/[^\x00-\x7F\u00C0-\u00FF]/g, match => {
                // Keep Latin-1 supplement (accents for Portuguese)
                return match;
            });
    };

    const handleExportPDF = (isMentor: boolean = false) => {
        if (!window.jspdf) {
            alert("Biblioteca PDF não carregada.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        const contentWidth = pageWidth - (margin * 2);

        let y = 0;

        const drawHeader = (title: string, subTitle: string) => {
            doc.setFillColor(isMentor ? 88 : 15, isMentor ? 28 : 23, isMentor ? 135 : 42);
            doc.rect(0, 0, pageWidth, 45, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text(title, margin, 20);
            doc.setFontSize(9);
            doc.setTextColor(200, 200, 200);
            doc.text(subTitle, margin, 30);

            // Filters metadata
            const filters = [
                filterMateria ? `Matéria: ${filterMateria}` : null,
                filterAssunto ? `Assunto: ${filterAssunto}` : null,
                filterMeta ? `Meta: ${filterMeta}` : null,
                searchTerm ? `Busca: "${searchTerm}"` : null
            ].filter(Boolean).join(" | ");
            if (filters) {
                doc.setFontSize(7);
                doc.text(`Parâmetros de Filtro: ${cleanText(filters)}`, margin, 38);
            }
            return 60;
        };

        const drawFooter = () => {
            const pageCount = (doc.internal as any).getNumberOfPages();
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`MonitorPro v1.0.31 | Gerado em ${new Date().toLocaleString()} | Página ${pageCount}`, margin, pageHeight - 10);
        };

        const checkPageBreak = (needed: number) => {
            if (y + needed > pageHeight - 20) {
                drawFooter();
                doc.addPage();
                y = drawHeader(isMentor ? "PARECER DO MENTOR" : "RELATÓRIO DE MAPEAMENTO DE ERROS", `Missão: ${missaoAtiva}`);
                return true;
            }
            return false;
        };

        y = drawHeader(isMentor ? "PARECER DO MENTOR" : "RELATÓRIO DE MAPEAMENTO DE ERROS", `Missão: ${missaoAtiva}`);

        // Macro Diagnosis Section
        if (macroDiagnosis) {
            let fullText = macroDiagnosis;
            if (isMentor) {
                const parts = macroDiagnosis.split(/##\s+/);
                fullText = "";
                if (parts[1]) fullText += "## " + parts[1];
                if (parts[2]) fullText += "\n\n## " + parts[2];
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(isMentor ? 147 : 34, isMentor ? 51 : 197, isMentor ? 234 : 94);
            doc.text(isMentor ? "DIAGNÓSTICO SINTÉTICO" : "MACRO-ESTRATÉGIA EVOLUTIVA", margin, y);
            y += 10;

            const paragraphs = fullText.split('\n');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);

            paragraphs.forEach(para => {
                if (para && para.trim()) {
                    const isHeading = para.trim().startsWith('##');
                    if (isHeading) {
                        checkPageBreak(15);
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(11);
                        doc.setTextColor(51, 65, 85);
                        const headingText = cleanText(para.replace(/#/g, '').trim());
                        doc.text(headingText, margin, y);
                        y += 8;
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(10);
                        doc.setTextColor(71, 85, 105);
                    } else {
                        const lines = doc.splitTextToSize(cleanText(para), contentWidth);
                        lines.forEach((line: string) => {
                            checkPageBreak(6);
                            doc.text(line, margin, y);
                            y += 5;
                        });
                        y += 2;
                    }
                } else if (para === "") {
                    y += 5;
                }
            });
            y += 10;
        }

        if (!isMentor) {
            const grouped = filteredErrors.reduce((acc, err) => {
                const key = err.materia || 'Sem Matéria';
                if (!acc[key]) acc[key] = [];
                acc[key].push(err);
                return acc;
            }, {} as Record<string, typeof filteredErrors>);

            checkPageBreak(20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text("MAPEAMENTO ANALÍTICO DE FALHAS", margin, y);
            y += 12;

            Object.entries(grouped).forEach(([materia, errors]) => {
                checkPageBreak(25);

                // Subject Header
                doc.setFillColor(241, 245, 249);
                doc.rect(margin, y - 5, contentWidth, 10, 'F');
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text(cleanText(materia).toUpperCase(), margin + 4, y + 2);
                y += 12;

                errors.forEach((err, index) => {
                    checkPageBreak(50); // Mínimo de espaço para começar uma questão

                    doc.setDrawColor(226, 232, 240);
                    doc.line(margin, y, pageWidth - margin, y);
                    y += 8;

                    // Questão Titulo
                    doc.setTextColor(15, 23, 42);
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");

                    const titleLines = doc.splitTextToSize(`${index + 1}. [${cleanText(err.tipo_erro)}] - ${cleanText(err.assunto)}`, contentWidth);
                    titleLines.forEach((line: string) => {
                        checkPageBreak(5);
                        doc.text(line, margin, y);
                        y += 5;
                    });
                    y += 2;

                    // Meta e Data
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.setTextColor(100, 116, 139);
                    doc.text(`Meta: ${err.meta || 'N/A'} | Registro: ${new Date(err.data).toLocaleDateString()}`, margin, y);
                    y += 8;

                    doc.setTextColor(0, 0, 0);
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(9);
                    const enunciado = err.enunciado_completo || `"${err.questao_preview}..."`;
                    const enunciadoLines = doc.splitTextToSize(cleanText(enunciado), contentWidth);

                    enunciadoLines.forEach((line: string) => {
                        checkPageBreak(6);
                        doc.setTextColor(0, 0, 0); // Garante preto nítido após quebra de página
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(9);
                        doc.text(line, margin, y);
                        y += 4.5;
                    });
                    y += 6;

                    // Detalhes (Gatilho e Ação) com alinhamento melhorado
                    const drawDetailField = (label: string, value: string, color: [number, number, number]) => {
                        doc.setTextColor(color[0], color[1], color[2]);
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(8);
                        doc.text(label, margin, y);

                        const valLines = doc.splitTextToSize(cleanText(String(value)), contentWidth - 35);

                        valLines.forEach((line: string, i: number) => {
                            if (checkPageBreak(6)) {
                                // Re-seta estilo após quebra para evitar texto invisível/faded
                                doc.setTextColor(30, 41, 59);
                                doc.setFont("helvetica", "normal");
                                doc.setFontSize(9);
                            } else {
                                doc.setTextColor(30, 41, 59);
                                doc.setFont("helvetica", "normal");
                                doc.setFontSize(9);
                            }
                            doc.text(line, margin + 35, y); // Offset aumentado para evitar sobreposição
                            if (i < valLines.length - 1) y += 4.5;
                        });
                        y += 7;
                    };

                    drawDetailField("GATILHO:", err.gatilho, [180, 83, 9]); // Dark yellow
                    drawDetailField("AÇÃO:", err.sugestao, [22, 101, 52]); // Dark green

                    if (err.gabarito) {
                        drawDetailField("GABARITO OFICIAL:", err.gabarito, [22, 101, 52]); // Green
                    }

                    if (err.minha_resposta) {
                        drawDetailField("MINHA RESPOSTA:", err.minha_resposta, [107, 33, 168]); // Purple
                    }

                    if (err.sugestao_mentor) {
                        drawDetailField("MENTOR:", err.sugestao_mentor, [107, 33, 168]); // Purple
                    }

                    y += 4;
                });
            });
        }

        drawFooter();
        doc.save(`${isMentor ? 'Parecer_Mentor' : 'Relatorio_Evolucao'}_${missaoAtiva}_${new Date().toLocaleDateString()}.pdf`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                            <Activity className="text-cyan-400" size={28} />
                        </div>
                        Diagnóstico Estratégico de Alta Performance
                    </h2>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    <button
                        onClick={handleGenerateMacroDiagnosis}
                        disabled={filteredErrors.length === 0 || isSynthesizing}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-4 rounded-2xl shadow-lg shadow-purple-500/20 flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSynthesizing ? <Loader2 className="animate-spin" size={18} /> : <Brain size={18} />}
                        Gerar Diagnóstico Neural
                    </button>
                    <button
                        onClick={() => handleExportPDF(false)}
                        disabled={filteredErrors.length === 0}
                        className="bg-white/5 hover:bg-white/10 text-white px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20"
                    >
                        <Download size={18} className="text-cyan-400" /> Relatório de Evolução
                    </button>
                    <button
                        onClick={() => handleExportPDF(true)}
                        disabled={filteredErrors.length === 0}
                        className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 px-6 py-4 rounded-2xl border border-purple-600/20 flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20"
                    >
                        <FileText size={18} /> Parecer do Mentor
                    </button>
                </div>
            </div>

            <PerformanceHeatmap
                records={records}
                missaoAtiva={missaoAtiva}
                onSelectAssunto={(materia, assunto) => setSelectedRecovery({ materia, assunto })}
            />

            <AnimatePresence>
                {selectedRecovery && (
                    <RecoveryMode
                        errors={localErrors.filter(e => e.materia === selectedRecovery.materia && e.assunto === selectedRecovery.assunto)}
                        onClose={() => setSelectedRecovery(null)}
                        onUpdateError={handleUpdateError}
                    />
                )}
            </AnimatePresence>

            {transversalAnalysis && (
                <div className="space-y-6">
                    <div className="glass-premium p-8 rounded-[2rem] border border-purple-500/20 bg-gradient-to-r from-purple-600/5 to-cyan-600/5 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-purple-600/10 to-transparent" />
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-3xl shadow-2xl shadow-purple-500/30">
                                🧠
                            </div>
                            <div className="flex-1">
                                <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.4em] mb-2">Insight de IA Transversal</h4>
                                <p className="text-xl font-black text-white tracking-tighter leading-none mb-3">
                                    {transversalAnalysis.insight}
                                </p>
                                <p className="text-xs font-bold text-slate-400 max-w-2xl leading-relaxed">
                                    <span className="text-green-400">Padrão Detectado:</span> {transversalAnalysis.action}
                                </p>
                            </div>
                        </div>
                    </div>

                    {macroDiagnosis && (
                        <div className="glass-premium p-10 rounded-[2.5rem] border border-cyan-500/20 bg-[#0a0c10] relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <Sparkles size={80} className="text-cyan-400" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                                    <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.5em] flex items-center gap-3">
                                        <Target size={14} /> Relatório Sintético do Mentor
                                    </h3>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                                </div>
                                <div className="prose prose-invert max-w-none text-slate-300 text-sm font-medium leading-relaxed space-y-6">
                                    {macroDiagnosis && macroDiagnosis.split('\n').map((line, i) => {
                                        const trimmed = (line || '').trim();
                                        if (trimmed.startsWith('##')) {
                                            return <h4 key={i} className="text-white font-black text-lg mt-10 mb-6 uppercase tracking-tight border-l-4 border-cyan-500 pl-4 bg-cyan-500/5 py-2 rounded-r-lg">{trimmed.replace(/#/g, '').trim()}</h4>;
                                        }
                                        if (trimmed === '') return <div key={i} className="h-2" />;
                                        return <p key={i} className="opacity-90 pl-1">{trimmed}</p>;
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(stats).map(([type, count]) => (
                    <div key={type} className="glass-premium p-6 rounded-[2rem] border border-[hsl(var(--border))] flex items-center justify-between group hover:border-[hsl(var(--accent)/0.3)] transition-all">
                        <div>
                            <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-1">{type}</p>
                            <h4 className="text-3xl font-black text-white tracking-tighter">{count}</h4>
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${type === 'Atenção' ? 'bg-yellow-500/10 text-yellow-500' :
                            type === 'Interpretação' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-premium p-6 rounded-3xl border border-[hsl(var(--border))] grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="relative group md:col-span-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] group-focus-within:text-[hsl(var(--accent))]" size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar..."
                        className="w-full bg-black/20 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold text-white focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] outline-none transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    className="bg-black/20 border border-white/5 rounded-2xl px-4 py-4 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] appearance-none cursor-pointer"
                    value={filterMateria}
                    onChange={e => {
                        setFilterMateria(e.target.value);
                        setFilterAssunto('');
                    }}
                >
                    <option value="">Todas as Matérias</option>
                    {materiaOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <select
                    className="bg-black/20 border border-white/5 rounded-2xl px-4 py-4 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] appearance-none cursor-pointer"
                    value={filterAssunto}
                    onChange={e => setFilterAssunto(e.target.value)}
                >
                    <option value="">Todos os Assuntos</option>
                    {assuntoOptions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                <select
                    className="bg-black/20 border border-white/5 rounded-2xl px-4 py-4 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.3)] appearance-none cursor-pointer"
                    value={filterMeta}
                    onChange={e => setFilterMeta(e.target.value)}
                >
                    <option value="">Todas as Metas</option>
                    {metaOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>

            <div className="space-y-4">
                {localErrors.length === 0 ? (
                    <div className="text-center py-20 opacity-30 text-xs font-black uppercase tracking-widest">
                        Nenhum registro de erro encontrado.
                    </div>
                ) : (
                    localErrors
                        .filter(err => {
                            if (err.resolved) return false; // HIDE RESOLVED ERRORS AS COMBINED
                            const matchMateria = !filterMateria || err.materia === filterMateria;
                            const matchAssunto = !filterAssunto || err.assunto === filterAssunto;
                            const matchMeta = !filterMeta || String(err.meta) === filterMeta;
                            const matchSearch = !searchTerm ||
                                (err.questao_preview || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (err.gatilho || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (err.assunto || '').toLowerCase().includes(searchTerm.toLowerCase());
                            return matchMateria && matchAssunto && matchMeta && matchSearch;
                        })
                        .map((err) => (
                            <div key={err.id} className="glass-premium p-8 rounded-[2.5rem] border border-[hsl(var(--border))] group hover:border-[hsl(var(--accent)/0.3)] transition-all relative overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${err.tipo_erro === 'Atenção' ? 'bg-yellow-500' :
                                    err.tipo_erro === 'Interpretação' ? 'bg-blue-500' : 'bg-red-500'
                                    }`} />

                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="space-y-4 flex-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${err.tipo_erro === 'Atenção' ? 'bg-yellow-500/10 text-yellow-500' :
                                                err.tipo_erro === 'Interpretação' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                {err.tipo_erro}
                                            </span>
                                            {err.failed_attempts !== undefined && Number(err.failed_attempts) > 0 && (
                                                <span className="bg-red-500/30 text-red-100 px-3 py-1 rounded-full text-[11px] font-black border border-red-500/40 shadow-[0_0_15px_-3px_rgba(239,68,68,0.6)] animate-pulse flex items-center gap-1 shrink-0">
                                                    <X size={10} className="stroke-[4]" /> {err.failed_attempts}x Errado
                                                </span>
                                            )}
                                            <span className="text-[10px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest truncate max-w-[300px] md:max-w-none">
                                                {err.materia} • {err.assunto}
                                            </span>
                                            {err.meta && (
                                                <span className="bg-white/5 text-white/40 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter shrink-0">
                                                    {err.meta}
                                                </span>
                                            )}
                                        </div>

                                        <h5 className="text-sm font-bold text-white leading-relaxed italic opacity-80 whitespace-pre-wrap">
                                            {err.enunciado_completo ? err.enunciado_completo : `"${err.questao_preview}..."`}
                                        </h5>

                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-yellow-500/50 uppercase tracking-widest">Gatilho do Erro</p>
                                            <p className="text-xs text-white font-medium leading-relaxed">{err.gatilho}</p>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-green-500/50 uppercase tracking-widest">Ação Corretiva Aluno</p>
                                                <p className="text-xs text-green-400 font-bold leading-relaxed">{err.sugestao}</p>
                                            </div>
                                            {err.sugestao_mentor && (
                                                <div className="pt-3 border-t border-white/5 space-y-1">
                                                    <p className="text-[9px] font-black text-purple-500/50 uppercase tracking-widest flex items-center gap-2">
                                                        <Target size={10} /> Visão do Mentor
                                                    </p>
                                                    <p className="text-[11px] text-purple-300 font-black italic leading-tight">
                                                        {err.sugestao_mentor}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex md:flex-col justify-between items-end md:items-end text-right">
                                        <div className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest">
                                            {new Date(err.data).toLocaleDateString()}
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[hsl(var(--accent)/0.1)] transition-all">
                                            <ChevronRight size={16} className="text-white/20 group-hover:text-[hsl(var(--accent))]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
};
