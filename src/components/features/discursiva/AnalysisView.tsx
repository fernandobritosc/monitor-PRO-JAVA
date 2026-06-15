import { useState, useMemo } from 'react';
import { Discursiva } from '../../../types';
import { generateDiscursivePDF } from '../../../utils/pdfGenerator';
import {
  Sparkles, Download, ChevronUp, ChevronDown, List,
  ImageIcon, MessageSquare, CheckCircle2
} from 'lucide-react';
import DOMPurify from 'dompurify';

interface GrammarTableProps {
  tableData: {
    header: string[];
    body: string[][];
    hasContent: boolean;
  };
}

const GrammarTable = ({ tableData }: GrammarTableProps) => {
  if (!tableData || !tableData.hasContent) {
    return (
      <div className="my-8 p-10 bg-[hsl(var(--bg-user-block))/0.3] rounded-[2rem] border border-dashed border-[hsl(var(--border))] text-center">
        <CheckCircle2 size={32} className="mx-auto text-green-500/30 mb-4" />
        <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em]">Nenhum desvio crítico detectado nesta matriz.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden my-8 glass-premium bg-[hsl(var(--bg-user-block))/0.2] rounded-[2rem] border border-[hsl(var(--border))] shadow-inner">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[hsl(var(--bg-user-block))] border-b border-[hsl(var(--border))]">
            {tableData.header.map((h: string) => <th key={h} className="p-6 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))]">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[hsl(var(--border))]">
          {tableData.body.map((row: string[], rowIndex: number) => (
            <tr key={rowIndex} className="hover:bg-white/5 transition-colors group">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="p-6 text-xs font-medium text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--text-bright))] transition-colors">{cell.replace(/"/g, '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface AnalysisViewProps {
  analysis: Discursiva;
}

const AnalysisView = ({ analysis }: AnalysisViewProps) => {
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [isAnalysisVisible, setIsAnalysisVisible] = useState(true);

  const parsedContent = useMemo(() => {
    const text = analysis.analysis_text;
    if (!text) return { before: null, table: null, after: null };

    const renderProse = (proseText: string) => {
      if (!proseText.trim()) return null;
      let processedHtml = proseText
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-[var(--accent)] mt-6 mb-3">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-[var(--text-bright)] mt-4 mb-2">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^---$/gim, '<hr class="my-6 border-[var(--border)]">')
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/<li><strong>(.*?)<\/strong>:/gim, '<ul class="mt-3 list-none p-0"><li class="font-bold text-slate-300">$1</li><ul class="list-disc ml-5 mt-1">')
        .replace(/(<\/ul><br \/>)<br \/><li><strong>/g, '</ul></ul><ul class="mt-3 list-none p-0"><li class="font-bold text-slate-300">')
        .replace(/\n/g, '<br />')
        .replace(/<\/h2><br \/>/g, '</h2>')
        .replace(/<\/h3><br \/>/g, '</h3>')
        .replace(/<hr><br \/>/g, '<hr>')
        .replace(/<\/li><br \/>/g, '</li>');
      const safeHtml = typeof DOMPurify.sanitize === 'function'
        ? DOMPurify.sanitize(processedHtml)
        : processedHtml;
      return <div className="max-w-prose leading-relaxed" dangerouslySetInnerHTML={{ __html: safeHtml }} />;
    };

    const tableHeaderMarkdown = '### Tabela de Desvios Gramaticais';
    const parts = text.split(tableHeaderMarkdown);
    const before = renderProse(parts[0]);
    let table = null;
    let after = null;

    if (parts.length > 1) {
      const tableAndAfter = parts[1] || '';
      const tableRegex = /(\|.*\|(?:\r?\n\|.*\|)+)/;
      const match = tableAndAfter.match(tableRegex);

      if (match) {
        const tableMarkdown = match[0];
        const afterText = tableAndAfter.replace(tableMarkdown, '');
        after = renderProse(afterText);
        const rows = tableMarkdown.trim().split('\n');
        const header = rows[0].split('|').slice(1, -1).map(h => h.trim());
        const body = rows.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));
        const hasContent = body.some(row => row.join('').trim() !== '' && !row.every(cell => cell.includes('...')));
        table = <GrammarTable tableData={{ header, body, hasContent }} />;
      } else {
        after = renderProse(tableAndAfter);
      }
    }
    return { before, table, after };
  }, [analysis.analysis_text]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {analysis.prompt && (
        <div className="glass-premium bg-[hsl(var(--bg-user-block))/0.3] rounded-3xl p-8 border border-[hsl(var(--border))]">
          <h3 className="text-xs font-black text-[hsl(var(--text-bright))] uppercase tracking-[0.2em] flex items-center gap-3 mb-6">
            <div className="p-2 bg-[hsl(var(--accent)/0.1)] rounded-lg text-[hsl(var(--accent))]"><List size={16} /></div>
            Enunciado de Referência
          </h3>
          <p className="text-sm text-[hsl(var(--text-muted))] leading-relaxed whitespace-pre-wrap bg-[hsl(var(--bg-main))] p-6 rounded-2xl border border-[hsl(var(--border))] shadow-inner">
            {analysis.prompt}
          </p>
        </div>
      )}

      <div className="glass-premium bg-[hsl(var(--bg-user-block))/0.3] rounded-3xl p-8 border border-[hsl(var(--border))] overflow-hidden">
        <button onClick={() => setIsImageVisible(!isImageVisible)} className="flex justify-between items-center w-full group">
          <h3 className="text-xs font-black text-[hsl(var(--text-bright))] uppercase tracking-[0.2em] flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><ImageIcon size={16} /></div>
            Matriz Visual Analisada
          </h3>
          {isImageVisible ? <ChevronUp className="text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--text-bright))]" /> : <ChevronDown className="text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--text-bright))]" />}
        </button>

        {isImageVisible && (
          <div className="mt-8 relative group/img animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="absolute inset-0 bg-gradient-to-tr from-[hsl(var(--accent)/0.1)] to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none rounded-2xl"></div>
            <img src={analysis.image_url} alt={analysis.title} className="rounded-2xl w-full border border-[hsl(var(--border))] shadow-2xl transition-transform duration-700 group-hover/img:scale-[1.01]" />
          </div>
        )}
      </div>

      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <button onClick={() => setIsAnalysisVisible(!isAnalysisVisible)} className="flex items-center gap-4 group text-left">
            <div className="p-3 bg-[hsl(var(--accent)/0.1)] rounded-2xl text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.2)]">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-[hsl(var(--text-bright))] uppercase tracking-widest">Auditoria Neural</h3>
              <p className="text-[9px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-[0.2em]">Resultado completo da avaliação IA</p>
            </div>
            {isAnalysisVisible ? <ChevronUp className="ml-2 text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--text-bright))]" /> : <ChevronDown className="ml-2 text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--text-bright))]" />}
          </button>
          <button onClick={() => generateDiscursivePDF(analysis)} className="px-8 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--bg-main))] text-[hsl(var(--text-muted))] hover:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-[hsl(var(--border))] transition-all active:scale-95 flex items-center gap-3 shadow-xl">
            <Download size={16} /> Exportar Dossiê PDF
          </button>
        </div>

        {isAnalysisVisible && (
          <div className="glass-premium bg-[hsl(var(--bg-card))] rounded-[2.5rem] p-10 border-2 border-[hsl(var(--border))] shadow-2xl animate-in fade-in slide-in-from-top-6 duration-700 relative overflow-visible">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
              <MessageSquare size={120} />
            </div>

            <div className="relative z-10">
              <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-headings:uppercase prose-headings:tracking-tighter prose-hr:border-[hsl(var(--border))]">
                {parsedContent.before}
              </div>
              {parsedContent.table && (
                <div className="my-12">
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                    Mapeamento de Desvios
                  </h3>
                  {parsedContent.table}
                </div>
              )}
              <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-headings:uppercase prose-headings:tracking-tighter prose-hr:border-[hsl(var(--border))]">
                {parsedContent.after}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisView;
