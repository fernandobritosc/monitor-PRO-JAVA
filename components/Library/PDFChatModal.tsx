import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Loader2, Sparkles, Zap, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface PDFChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    materialId: string;
    materialName: string;
}

const PDFChatModal: React.FC<PDFChatModalProps> = ({ isOpen, onClose, materialId, materialName }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [provider, setProvider] = useState<'gemini' | 'groq'>('gemini');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const { data, error: invokeError } = await supabase.functions.invoke('chat-with-pdf', {
                body: {
                    materialId,
                    message: userMsg,
                    provider
                }
            });

            if (invokeError) {
                throw new Error(invokeError.message || "Erro ao invocar função de IA");
            }

            // O backend já retorna o campo 'text' limpo
            const aiContent = data.text || "Não consegui processar uma resposta.";

            setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
        } catch (e: any) {
            logger.error('LIBRARY', 'Erro no chat PDF', e);
            setMessages(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${e.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        if (window.confirm("Deseja limpar o histórico deste chat?")) {
            setMessages([]);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-950 border-l border-white/10 z-[250] flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-slate-900/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                                <Bot size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-tight truncate w-48">Chat IA: {materialName}</h4>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={() => setProvider('gemini')}
                                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border transition-all ${provider === 'gemini' ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-800 text-slate-500 border-transparent'}`}
                                    >
                                        Gemini Pro
                                    </button>
                                    <button
                                        onClick={() => setProvider('groq')}
                                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border transition-all ${provider === 'groq' ? 'bg-orange-500 text-white border-orange-400' : 'bg-slate-800 text-slate-500 border-transparent'}`}
                                    >
                                        Groq (Fast)
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={clearChat} className="p-2 text-slate-500 hover:text-red-400 transition-colors" title="Limpar Chat"><Trash2 size={18} /></button>
                            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                                <Sparkles size={48} className="text-indigo-400 animate-pulse" />
                                <div className="max-w-xs">
                                    <p className="text-sm font-bold text-white">Como posso ajudar nos seus estudos?</p>
                                    <p className="text-[10px] text-slate-400 mt-2">Peça resumos, tire dúvidas sobre conceitos ou solicite mapas mentais baseados neste PDF.</p>
                                </div>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-slate-900 border border-white/5 text-slate-200 rounded-tl-none'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        {msg.role === 'assistant' ? <Bot size={12} className="text-indigo-400" /> : <User size={12} className="text-indigo-200" />}
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                                            {msg.role === 'assistant' ? 'IA Tutor' : 'Você'}
                                        </span>
                                    </div>
                                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                                    <Loader2 className="animate-spin text-indigo-400" size={16} />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Processando conhecimento...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-slate-900/50 border-t border-white/10">
                        <div className="relative">
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder="Pergunte qualquer coisa sobre o material..."
                                className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none h-20 custom-scrollbar"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="absolute right-2 bottom-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-50 active:scale-95"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 opacity-40">
                                {provider === 'gemini' ? <Sparkles size={10} className="text-blue-400" /> : <Zap size={10} className="text-orange-400" />}
                                <span className="text-[8px] font-bold uppercase text-white">{provider === 'gemini' ? 'Multimodal Ativado' : 'Fast Mode'}</span>
                            </div>
                            <span className="text-[8px] text-slate-600 font-mono">Shift + Enter para nova linha</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PDFChatModal;
