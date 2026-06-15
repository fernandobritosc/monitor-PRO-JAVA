import React from 'react';
import { ErrorAnalysis } from '../../types';
import { X } from 'lucide-react';

interface ErrorAnalysisBlockProps {
  analyses: ErrorAnalysis[];
  onRemove: (index: number) => void;
}

const ErrorAnalysisBlock: React.FC<ErrorAnalysisBlockProps> = ({ analyses, onRemove }) => {
  if (analyses.length === 0) return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      {analyses.map((err, idx) => (
        <div key={idx} className="bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-3 relative overflow-hidden group">
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
            err.tipo_erro === 'Atenção' ? 'bg-yellow-500' :
            err.tipo_erro === 'Interpretação' ? 'bg-blue-500' : 'bg-red-500'
          }`} />
          <div className="flex justify-between items-start">
            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${
              err.tipo_erro === 'Atenção' ? 'bg-yellow-500/10 text-yellow-500' :
              err.tipo_erro === 'Interpretação' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {err.tipo_erro}
            </span>
            <span className="text-[9px] text-[hsl(var(--text-muted))] font-bold italic truncate flex-1 ml-3">
              "{(err.questao_preview || '').replace(/<[^>]*>?/gm, '')}..."
            </span>
            {(err.gabarito || err.minha_resposta) && (
              <div className="flex gap-2 ml-auto shrink-0">
                {err.gabarito && <span className="text-[8px] font-black bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">GAB: {err.gabarito}</span>}
                {err.minha_resposta && <span className="text-[8px] font-black bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">EU: {err.minha_resposta}</span>}
              </div>
            )}
            <button onClick={() => onRemove(idx)}
              className="ml-2 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">
              <X size={14} />
            </button>
          </div>
          {err.enunciado_completo && (
            <div className="rounded-lg bg-black/20 border border-white/5 p-3">
              <p className="text-[9px] font-medium leading-relaxed text-slate-400 whitespace-pre-wrap">{err.enunciado_completo}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-[10px] text-[hsl(var(--text-bright))] font-bold tracking-tight">
              <span className="text-[hsl(var(--accent))] mr-2">🎯 GATILHO:</span> {err.gatilho}
            </p>
            <p className="text-[10px] text-[hsl(var(--text-muted))] font-bold leading-relaxed">
              <span className="text-green-400 mr-2">💡 AÇÃO:</span> {err.sugestao}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ErrorAnalysisBlock;
