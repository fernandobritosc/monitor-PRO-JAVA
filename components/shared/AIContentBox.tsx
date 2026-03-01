import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Copy, RefreshCw, DownloadCloud, Brain } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

// Componente unificado para caixas de conteúdo da IA
export const AIContentBox: React.FC<{
    title: string;
    icon: React.ReactNode;
    content: string;
    isLoading: boolean;
    isMarkdown?: boolean;
    children?: React.ReactNode;
    onRegenerate?: () => void;
    accentColor?: string;
    activeTool?: string;
    handleExportLabPDF?: () => void;
}> = ({ title, icon, content, isLoading, isMarkdown = false, children, onRegenerate, accentColor = "purple", activeTool = "explanation", handleExportLabPDF }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isLoading && !content && !children) return null;

    const colorMap = {
        purple: "text-purple-400 border-purple-500/30",
        cyan: "text-cyan-400 border-cyan-500/30",
        emerald: "text-emerald-400 border-emerald-500/30",
        orange: "text-orange-400 border-orange-500/30",
        blue: "text-blue-400 border-blue-500/30",
    };

    return (
        <div id="neural-content-box" className={`mt-4 bg-slate-900/40 border border-white/5 backdrop-blur-md rounded-[2rem] p-8 animate-in zoom-in-95 duration-500 shadow-inner`}>
            <div className="flex justify-between items-center mb-6">
                <div className={`flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] ${colorMap[accentColor as keyof typeof colorMap] || colorMap.purple}`}>
                    <div className={`p-2 rounded-xl bg-white/5 border ${colorMap[accentColor as keyof typeof colorMap] || colorMap.purple}`}>
                        {icon}
                    </div>
                    {title}
                </div>
                <div className="flex items-center gap-3">
                    {onRegenerate && content && !isLoading && (
                        <button onClick={onRegenerate} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-cyan-400 transition-all border border-white/5" title="Recalibrar IA">
                            <RefreshCw size={16} />
                        </button>
                    )}
                    {handleExportLabPDF && content && !isLoading && (
                        <button onClick={handleExportLabPDF} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-emerald-400 transition-all border border-white/5" title="Exportar PDF">
                            <DownloadCloud size={16} />
                        </button>
                    )}
                    {content && (
                        <button onClick={handleCopy} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5">
                            {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                        </button>
                    )}
                </div>
            </div>
            {isLoading ? (
                <div className="flex flex-col justify-center items-center py-16 gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-t-2 border-purple-500 animate-spin"></div>
                        <Sparkles size={20} className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto text-purple-400 animate-pulse" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Sincronizando Sinapses...</p>
                </div>
            ) : (
                <div className="leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar pr-4 pb-4 scroll-smooth neural-content-viewport">
                    {isMarkdown ? (
                        <MarkdownRenderer
                            content={content}
                            visualMode={activeTool !== 'explanation' && activeTool !== 'description'}
                        />
                    ) : (
                        <div className="text-slate-300 whitespace-pre-wrap text-sm font-medium">{content}</div>
                    )}
                    {children}
                </div>
            )}
        </div>
    );
};
