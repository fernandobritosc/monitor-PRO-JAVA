import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Copy, RefreshCw, DownloadCloud } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

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
        purple: "text-purple-400 dark:text-purple-400 border-purple-500/30",
        cyan: "text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
        emerald: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        orange: "text-orange-600 dark:text-orange-400 border-orange-500/30",
        blue: "text-blue-600 dark:text-blue-400 border-blue-500/30",
    };

    return (
        <div className="mt-3 bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] backdrop-blur-md rounded-xl p-4 animate-in zoom-in-95 duration-500 shadow-inner">
            <div className="flex justify-between items-center mb-4 pdf-exclude">
                <div className={`flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] ${colorMap[accentColor as keyof typeof colorMap] || colorMap.purple}`}>
                    <div className={`p-2 rounded-xl bg-[hsl(var(--bg-user-block))] border ${colorMap[accentColor as keyof typeof colorMap] || colorMap.purple}`}>
                        {icon}
                    </div>
                    {title}
                </div>
                <div className="flex items-center gap-3">
                    {onRegenerate && content && !isLoading && (
                        <button onClick={onRegenerate} className="p-3 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--accent-glow))] rounded-xl text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] transition-all border border-[hsl(var(--border))]" title="Recalibrar IA">
                            <RefreshCw size={16} />
                        </button>
                    )}
                    {handleExportLabPDF && content && !isLoading && (
                        <button onClick={handleExportLabPDF} className="p-3 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--accent-glow))] rounded-xl text-[hsl(var(--text-muted))] hover:text-emerald-500 transition-all border border-[hsl(var(--border))]" title="Exportar PDF">
                            <DownloadCloud size={16} />
                        </button>
                    )}
                    {content && (
                        <button onClick={handleCopy} className="p-3 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--accent-glow))] rounded-xl text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] transition-all border border-[hsl(var(--border))]">
                            {copied ? <CheckCircle2 size={16} className="text-green-500 dark:text-green-400" /> : <Copy size={16} />}
                        </button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col justify-center items-center py-10 gap-3">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full border-t-2 border-purple-500 animate-spin"></div>
                        <Sparkles size={14} className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto text-purple-400 animate-pulse" />
                    </div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))] animate-pulse">Sincronizando Sinapses...</p>
                </div>
            ) : (
                <div className="leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar pr-4 pb-4 scroll-smooth">
                    {isMarkdown ? (
                        <MarkdownRenderer
                            content={content}
                            visualMode={activeTool !== 'explanation' && activeTool !== 'description'}
                        />
                    ) : (
                        <div className="text-[hsl(var(--text-main))] whitespace-pre-wrap text-sm font-medium">{content}</div>
                    )}
                    {children}
                </div>
            )}
        </div>
    );
};