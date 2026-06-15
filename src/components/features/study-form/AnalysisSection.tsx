import React from 'react';
import { cn } from '../../../utils/cn';
import { FileText, Zap } from 'lucide-react';
import { RichTextEditor } from '../../shared/RichTextEditor';
import ErrorAnalysisBlock from '../../shared/ErrorAnalysisBlock';
import { ErrorAnalysis } from '../../../types';

interface AnalysisSectionProps {
    gabarito: string;
    setGabarito: (v: string) => void;
    minha_resposta: string;
    setMinha_resposta: (v: string) => void;
    comentarios: string;
    setComentarios: (v: string) => void;
    errorText: string;
    setErrorText: (v: string) => void;
    isAnalyzing: boolean;
    handleAnalyze: (text: string) => void;
    errorAnalysis: ErrorAnalysis[];
    onClearAnalyses: () => void;
    onRemoveAnalysis?: (idx: number) => void;
    onImageUpload?: (file: File) => Promise<string | null>;
    onError?: (text: string) => void;
}

const GABARITO_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'Certo', 'Errado'] as const;

export const AnalysisSection: React.FC<AnalysisSectionProps> = ({
    gabarito,
    setGabarito,
    minha_resposta,
    setMinha_resposta,
    comentarios,
    setComentarios,
    errorText,
    setErrorText,
    isAnalyzing,
    handleAnalyze,
    errorAnalysis,
    onClearAnalyses,
    onRemoveAnalysis,
    onImageUpload,
    onError,
}) => {
    return (
        <div className="glass-premium p-8 rounded-3xl border border-[hsl(var(--border))] space-y-6">
            <h4 className="text-xs font-black text-[hsl(var(--text-muted))] flex items-center gap-3 uppercase tracking-[0.2em]"><FileText size={18} className="text-[hsl(var(--accent))]" /> Análise Qualitativa</h4>
            <div className="space-y-3">
                <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest ml-1">Anotações / Observações</label>
                <RichTextEditor
                    content={comentarios}
                    onChange={setComentarios}
                    placeholder="Pontos chave, links, impressões..."
                    minHeight="min-h-[120px]"
                    onImageUpload={onImageUpload}
                />
            </div>

            <div className="pt-6 border-t border-[hsl(var(--border))] space-y-6">
                <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black text-[hsl(var(--accent))] uppercase tracking-[0.2em] flex items-center gap-2">
                        <Zap size={14} /> Algoritmo de Erros (IA)
                    </h5>
                    <div className="flex gap-2">
                        {errorAnalysis.length > 0 && (
                            <button
                                type="button"
                                onClick={onClearAnalyses}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 active:scale-95"
                            >
                                Limpar Análises ({errorAnalysis.length})
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (errorText.trim()) {
                                    handleAnalyze(errorText);
                                } else if (onError) {
                                    onError('Cole o texto do erro primeiro.');
                                }
                            }}
                            disabled={isAnalyzing}
                            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-purple-600/20 active:scale-95"
                        >
                            Analisar Texto Colado
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[hsl(var(--bg-main))] p-4 rounded-2xl border border-[hsl(var(--border))]">
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest flex justify-between items-center">
                            <span>Gabarito Oficial</span>
                            {gabarito && <span className="text-green-400 animate-pulse">Selecionado</span>}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {GABARITO_OPTIONS.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setGabarito(opt)}
                                    className={cn(
                                        'px-3 py-2 rounded-lg text-[10px] font-black transition-all border',
                                        gabarito === opt
                                            ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/20'
                                            : 'bg-[hsl(var(--bg-user-block))] border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-green-500/50',
                                    )}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest flex justify-between items-center">
                            <span>Minha Resposta</span>
                            {minha_resposta && <span className="text-purple-400 animate-pulse">Selecionado</span>}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {GABARITO_OPTIONS.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setMinha_resposta(opt)}
                                    className={cn(
                                        'px-3 py-2 rounded-lg text-[10px] font-black transition-all border',
                                        minha_resposta === opt
                                            ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                                            : 'bg-[hsl(var(--bg-user-block))] border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:border-purple-500/50',
                                    )}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <RichTextEditor
                    content={errorText}
                    onChange={setErrorText}
                    placeholder="Cole aqui o texto da questão e seu erro (ou use a barra de ferramentas para inserir imagem)..."
                    minHeight="min-h-[160px]"
                    onImageUpload={onImageUpload}
                    className="bg-[hsl(var(--bg-main))]"
                />

                <ErrorAnalysisBlock
                    analyses={errorAnalysis}
                    onRemove={(idx) => {
                        if (onRemoveAnalysis) {
                            onRemoveAnalysis(idx);
                        }
                    }}
                />
            </div>
        </div>
    );
};
