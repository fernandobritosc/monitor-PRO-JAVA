import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, Brain, Sparkles, ChevronRight, AlertCircle, Send, User, Bot } from 'lucide-react';
import { ErrorAnalysis } from '../../../types';
import { generateAIContent } from '../../../services/aiService';
import { getGeminiKey, getGroqKey } from '../../../services/supabase';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface SessaoRevisaoProps {
    errors: (ErrorAnalysis & { recordId: string; materia: string; assunto: string; id: string })[];
    subjectStats: { hits: number; errors: number };
    onClose: () => void;
    onUpdateError: (recordId: string, errorId: string, resolved: boolean) => Promise<void>;
}

const normalizeText = (s: string | undefined | null) => (s || "").trim().toLowerCase().replace(/\s+/g, ' ');

export const SessaoRevisao: React.FC<SessaoRevisaoProps> = ({ 
    errors: initialErrors, 
    subjectStats,
    onClose, 
    onUpdateError 
}) => {
    const [queue, setQueue] = useState(() => [...initialErrors]);
    const [userAnswer, setUserAnswer] = useState('');
    const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    
    // Estados do Chat Interativo
    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const currentError = queue[0];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, isGeneratingExplanation]);

    const parsedContent = useMemo(() => {
        if (!currentError) return { statement: "", alternatives: [], isBinary: false };
        const raw = currentError.enunciado_completo || currentError.questao_preview || "";

        const normalized = raw
            .replace(/<li[^>]*>/gi, "\n")
            .replace(/<\/li>/gi, "")
            .replace(/<ul[^>]*>|<\/ul>/gi, "")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&nbsp;/g, " ");

        // 1. Parsing Inteligente: Detecta alternativas [A-E] mesmo em linha única
        const altRegex = /([A-E])\s*[\.\-\)]/g;
        const matches = Array.from(normalized.matchAll(altRegex));

        if (matches.length >= 2) {
            const alternatives: { letter: string; text: string }[] = [];
            let firstMatchIdx = matches[0].index!;
            const statement = normalized.substring(0, firstMatchIdx).trim();

            for (let i = 0; i < matches.length; i++) {
                const start = matches[i].index!;
                const end = i < matches.length - 1 ? matches[i + 1].index! : normalized.length;
                const fullText = normalized.substring(start, end).trim();
                const letter = matches[i][1].toUpperCase();
                
                // Limpa o texto da alternativa (remove prefixos e sufixos de pontuação)
                const text = fullText
                    .replace(/^[A-E]\s*[\.\-\)]\s*/i, "")
                    .replace(/[*;]\s*$/, "")
                    .trim();
                
                alternatives.push({ letter, text });
            }
            return { statement, alternatives, isBinary: false };
        }

        // 2. Fallback: Parsing por quebra de linha (modo legível padrão)
        const alternatives: { letter: string; text: string }[] = [];
        const altLineRegex = /^([A-E])\s*[\.\-\)]\s*/i;
        const rawLines = normalized.split("\n").map(l => l.trim()).filter(Boolean);
        const statementLines: string[] = [];

        for (const line of rawLines) {
            const match = line.match(altLineRegex);
            if (match) {
                alternatives.push({ letter: match[1].toUpperCase(), text: line });
            } else if (alternatives.length === 0) {
                statementLines.push(line);
            }
        }

        if (alternatives.length === 0) {
            const statement = statementLines.join(" ").trim();
            const isBinaryStyle = /#GABARITO\s*[CE]/i.test(normalized) || /\b(Certo|Errado)\b/i.test(normalized);
            return {
                statement: statement.replace(/#GABARITO\s*[A-Ea-eCEce]/i, "").trim(),
                alternatives: isBinaryStyle ? [
                    { letter: "C", text: "Certo" },
                    { letter: "E", text: "Errado" }
                ] : [],
                isBinary: true
            };
        }

        return { statement: statementLines.join(" ").trim(), alternatives, isBinary: false };
    }, [currentError]);

    const handleAnswer = async (selectedLetter?: string) => {
        const finalAnswer = selectedLetter || userAnswer;
        if (!finalAnswer.trim() || isUpdating) return;

        const targetGabarito = String(currentError?.gabarito || '').trim().toLowerCase();
        
        const normalize = (val: string) => val.trim().toLowerCase()
            .replace(/[\s\)]/g, "")
            .replace(/^certo$/, "c")
            .replace(/^errado$/, "e");

        const isCorrect = normalize(finalAnswer) === normalize(targetGabarito);
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

    const handleConsultAI = async () => {
        if (!currentError || isGeneratingExplanation) return;
        setIsGeneratingExplanation(true);
        setShowExplanation(true);
        setChatHistory([]); // Reseta histórico para a nova questão
        try {
            const geminiKey = getGeminiKey();
            const groqKey = getGroqKey();
            
            const promptContext = {
                materia: currentError.materia,
                assunto: currentError.assunto,
                tipo_erro: currentError.tipo_erro,
                attempts: currentError.failed_attempts,
                question: parsedContent.statement,
                gabarito: currentError.gabarito,
                isCorrect: showResult === 'correct'
            };

            const response = await generateAIContent(
                { content: JSON.stringify(promptContext) },
                geminiKey,
                groqKey,
                'gemini',
                'explicar_erro'
            );
            setAiExplanation(response);
            setChatHistory([{ role: 'assistant', content: response }]);
        } catch (error) {
            console.error('Erro na IA:', error);
            setAiExplanation("Não consegui gerar a explicação.");
        } finally {
            setIsGeneratingExplanation(false);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isChatLoading || !currentError) return;
        
        const userMsg = chatInput.trim();
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsChatLoading(true);

        try {
            const geminiKey = getGeminiKey();
            const groqKey = getGroqKey();

            const chatContext = {
                materia: currentError.materia,
                assunto: currentError.assunto,
                question: parsedContent.statement,
                gabarito: currentError.gabarito,
                history: chatHistory,
                lastMessage: userMsg
            };

            const response = await generateAIContent(
                { content: JSON.stringify(chatContext) },
                geminiKey,
                groqKey,
                'gemini',
                'chat_error_vault'
            );

            setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { role: 'assistant', content: "Desculpe, tive um problema ao processar sua dúvida." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const nextQuestion = () => {
        setShowResult(null);
        setUserAnswer('');
        setShowExplanation(false);
        setAiExplanation(null);
        setChatHistory([]);
        setQueue(prev => prev.slice(1));
    };

    if (queue.length === 0) {
        onClose();
        return null;
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-screen-2xl mx-auto flex flex-col space-y-8 min-h-[85vh]"
        >
            {/* Header de Sessão */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-premium p-6 rounded-3xl border border-[hsl(var(--border))]">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={onClose} 
                        className="flex items-center gap-3 px-5 py-2.5 bg-[hsl(var(--bg-main))] rounded-2xl hover:bg-[hsl(var(--accent)/0.1)] transition-all text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] font-black uppercase tracking-widest text-[10px] border border-[hsl(var(--border))]"
                    >
                        <X size={16} /> Sair da Sessão
                    </button>
                    <div className="h-10 w-px bg-[hsl(var(--border))]" />
                    <div className="flex flex-1 justify-between items-center">
                        <div>
                            <h4 className="text-[11px] font-black text-[hsl(var(--text-bright))] uppercase tracking-widest">{currentError.materia}</h4>
                            <p className="text-[8px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mt-0.5">{currentError.assunto}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500/[0.08] border border-emerald-500/20 px-4 py-2 rounded-2xl flex items-center gap-3">
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Performance</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-sm font-black text-emerald-600">{subjectStats.hits}</span>
                                    <span className="text-[8px] font-bold text-emerald-500/60 uppercase">Acertos</span>
                                </div>
                                <div className="w-px h-3 bg-emerald-500/20" />
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-sm font-black text-red-600">{subjectStats.errors}</span>
                                    <span className="text-[8px] font-bold text-red-500/60 uppercase">Erros</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-[hsl(var(--bg-main))] px-6 py-3 rounded-2xl border border-[hsl(var(--border))]">
                    <span className="text-[10px] font-black text-[hsl(var(--text-main))] uppercase tracking-tighter">
                        Questão <span className="text-[hsl(var(--accent))]">{initialErrors.length - queue.length + 1}</span> de {initialErrors.length}
                    </span>
                </div>
            </div>

            {/* Layout Principal Expansível */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch flex-1">
                
                {/* Área da Questão - Ocupa mais espaço agora (8 colunas) */}
                <div className={`${showExplanation ? 'lg:col-span-8' : 'lg:col-span-12'} w-full space-y-8 transition-all duration-500 flex flex-col`}>
                    <motion.div 
                        layout
                        className="glass-premium p-8 md:p-12 rounded-[3.5rem] border border-[hsl(var(--border))] space-y-10 shadow-2xl relative overflow-hidden flex-1"
                    >
                        {/* Indicador de Reincidência */}
                        {Number(currentError.failed_attempts || 0) > 0 && (
                            <div className="absolute top-8 right-8 flex items-center gap-2 text-red-500 bg-red-500/5 px-4 py-2 rounded-full border border-red-500/20">
                                <AlertCircle size={14} />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Reincidência ({currentError.failed_attempts}x)</span>
                            </div>
                        )}

                        {/* Enunciado */}
                        <div className="space-y-6">
                            <h5 className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.5em] flex items-center gap-4">
                                <span className="w-8 h-px bg-[hsl(var(--border))]" /> Enunciado
                            </h5>
                            <div 
                                className="text-lg md:text-2xl text-[hsl(var(--text-bright))] leading-relaxed font-semibold prose dark:prose-invert max-w-none antialiased selection:bg-[hsl(var(--accent)/0.2)]"
                                dangerouslySetInnerHTML={{ __html: parsedContent.statement }}
                            />
                        </div>

                        {/* Alternativas */}
                        <div className="grid grid-cols-1 gap-4">
                            {parsedContent.alternatives.map((alt, idx) => (
                                <button
                                    key={idx}
                                    disabled={!!showResult || isUpdating}
                                    onClick={() => handleAnswer(alt.letter)}
                                    className={`w-full p-6 p-y-5 rounded-3xl border text-left transition-all relative overflow-hidden group flex items-start gap-5 ${
                                        showResult === 'correct' && normalizeText(currentError?.gabarito) === normalizeText(alt.letter) ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' :
                                        showResult === 'wrong' && normalizeText(userAnswer || '') === normalizeText(alt.letter) ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' :
                                        showResult && normalizeText(currentError?.gabarito) === normalizeText(alt.letter) ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' :
                                        'bg-[hsl(var(--bg-main)/0.4)] border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.4)] hover:bg-[hsl(var(--accent)/0.02)]'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm border transition-all ${
                                        showResult === 'correct' && normalizeText(currentError?.gabarito) === normalizeText(alt.letter) ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' :
                                        showResult === 'wrong' && normalizeText(userAnswer || '') === normalizeText(alt.letter) ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' :
                                        'bg-[hsl(var(--bg-card))] border-[hsl(var(--border))] text-[hsl(var(--text-muted))] group-hover:border-[hsl(var(--accent))] group-hover:text-[hsl(var(--accent))]'
                                    }`}>
                                        {alt.letter}
                                    </div>
                                    <div 
                                        dangerouslySetInnerHTML={{ __html: alt.text.replace(/^[A-E]\s*[\.\-\)]\s*/i, '') }} 
                                        className="text-sm md:text-base font-bold pt-2 text-[hsl(var(--text-main))]" 
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Barra de Ação de Resultado */}
                        <AnimatePresence>
                            {showResult && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`p-8 rounded-[2.5rem] border flex flex-col md:flex-row justify-between items-center gap-8 ${
                                        showResult === 'correct' ? 'bg-emerald-500/[0.03] border-emerald-500/20' : 'bg-red-500/[0.03] border-red-500/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl ${
                                            showResult === 'correct' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                        }`}>
                                            {showResult === 'correct' ? <Check size={28} strokeWidth={3} /> : <X size={28} strokeWidth={3} />}
                                        </div>
                                        <div>
                                            <h4 className={`text-lg font-black uppercase tracking-tight ${showResult === 'correct' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {showResult === 'correct' ? 'Análise de Acerto' : 'Análise de Erro'}
                                            </h4>
                                            <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mt-1">
                                                Gabarito: <span className="text-[hsl(var(--text-bright))] ml-2 bg-[hsl(var(--bg-main))] px-3 py-1 rounded-lg border border-[hsl(var(--border))]">{currentError.gabarito}</span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        {!showExplanation && (
                                            <button 
                                                onClick={handleConsultAI}
                                                className="flex-1 md:flex-none px-6 py-4 bg-[hsl(var(--accent)/0.1)] hover:bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-[hsl(var(--accent)/0.2)] flex items-center justify-center gap-3 group"
                                            >
                                                <Brain size={18} className="group-hover:scale-110 transition-transform" /> Mentor Neural
                                            </button>
                                        )}
                                        <button 
                                            onClick={nextQuestion}
                                            className="grow md:flex-none px-10 py-4 bg-[hsl(var(--text-bright))] text-[hsl(var(--bg-main))] hover:brightness-110 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group shadow-xl"
                                        >
                                            {queue.length > 1 ? 'Próxima' : 'Concluir'} <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* Sidebar IA - Mentor Neural Interativo (4 colunas) */}
                <AnimatePresence>
                    {showExplanation && (
                        <motion.aside 
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            className="lg:col-span-4 h-full sticky top-32 min-h-[600px] flex flex-col"
                        >
                            <div className="glass-premium p-6 md:p-8 rounded-[3.5rem] border border-[hsl(var(--accent)/0.2)] bg-gradient-to-b from-[hsl(var(--accent)/0.02)] to-transparent h-full flex flex-col gap-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                                
                                {/* Header do Chat */}
                                <div className="flex items-center justify-between relative z-10 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-[hsl(var(--accent)/0.1)] flex items-center justify-center">
                                            <Sparkles size={20} className="text-[hsl(var(--accent))]" />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black text-[hsl(var(--text-bright))] uppercase tracking-[0.2em]">Mentor Neural</h4>
                                            <p className="text-[8px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest mt-0.5">Chat Interativo</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowExplanation(false)} className="w-8 h-8 rounded-full bg-[hsl(var(--bg-main))] flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-main))] transition-all border border-[hsl(var(--border))]">
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Área de Mensagens */}
                                <div 
                                    ref={scrollRef}
                                    className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 relative z-10 p-2"
                                >
                                    {chatHistory.map((msg, i) => (
                                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2`}>
                                            <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                {msg.role === 'user' ? <User size={12} className="text-[hsl(var(--text-muted))]" /> : <Bot size={12} className="text-[hsl(var(--accent))]" />}
                                                <span className="text-[8px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">{msg.role === 'user' ? 'Você' : 'Mentor'}</span>
                                            </div>
                                            <div className={`max-w-[90%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                                                msg.role === 'user' 
                                                    ? 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--text-bright))] border border-[hsl(var(--accent)/0.1)] rounded-tr-none' 
                                                    : 'bg-[hsl(var(--bg-card))] text-[hsl(var(--text-main))] border border-[hsl(var(--border))] rounded-tl-none'
                                            }`}>
                                                {msg.content.split('\n').map((line, idx) => (
                                                    <p key={idx} className={line.startsWith('#') ? 'font-black uppercase tracking-widest text-xs mt-4 mb-2 text-[hsl(var(--accent))]' : 'mb-2 last:mb-0'}>
                                                        {line.replace(/#/g, '').trim()}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {isGeneratingExplanation || isChatLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                                            <Loader2 size={24} className="animate-spin text-[hsl(var(--accent))]" />
                                            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[hsl(var(--text-muted))] animate-pulse">Sintetizando Conhecimento...</p>
                                        </div>
                                    ) : null}
                                </div>

                                {/* Input do Chat */}
                                <div className="relative z-10 shrink-0 pt-4 border-t border-[hsl(var(--border))]">
                                    <div className="flex gap-2 relative">
                                        <input 
                                            type="text" 
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Tire sua dúvida com o mentor..."
                                            className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl pl-6 pr-14 py-4 text-xs font-medium focus:ring-2 focus:ring-[hsl(var(--accent)/0.2)] focus:border-[hsl(var(--accent)/0.4)] outline-none transition-all placeholder:text-[hsl(var(--text-muted))]"
                                        />
                                        <button 
                                            onClick={handleSendMessage}
                                            disabled={!chatInput.trim() || isChatLoading}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[hsl(var(--accent)/0.2)] disabled:opacity-50 disabled:grayscale"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-[hsl(var(--accent)/0.03)] blur-[100px] rounded-full pointer-events-none" />
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
