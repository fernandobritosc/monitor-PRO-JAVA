import React, { useState, useMemo } from 'react';
import { StudyRecord, ErrorAnalysis } from '../types';
import { Zap, Target, BookOpen, List, Filter, Download, Search, AlertTriangle, CheckCircle2, FileText, ChevronDown, ChevronRight } from 'lucide-react';

interface ErrorAnalysisViewProps {
    records: StudyRecord[];
    missaoAtiva: string;
}

export const ErrorAnalysisView: React.FC<ErrorAnalysisViewProps> = ({ records, missaoAtiva }) => {
    // States para Filtros
    const [filterMateria, setFilterMateria] = useState('');
    const [filterAssunto, setFilterAssunto] = useState('');
    const [filterMeta, setFilterMeta] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Extrair todos os erros qualitativos dos registros da missão ativa
    const allErrors = useMemo(() => {
        const errors: (ErrorAnalysis & { materia: string; assunto: string; meta?: string | number; data: string })[] = [];
        records
            .filter(r => r.concurso === missaoAtiva && r.analise_erros && r.analise_erros.length > 0)
            .forEach(r => {
                r.analise_erros?.forEach(err => {
                    errors.push({
                        ...err,
                        materia: r.materia,
                        assunto: r.assunto,
                        meta: r.meta,
                        data: r.data_estudo
                    });
                });
            });
        return errors.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [records, missaoAtiva]);

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
                err.questao_preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
                err.gatilho.toLowerCase().includes(searchTerm.toLowerCase()) ||
                err.assunto.toLowerCase().includes(searchTerm.toLowerCase());

            return matchMateria && matchAssunto && matchMeta && matchSearch;
        });
    }, [allErrors, filterMateria, filterMeta, searchTerm]);

    // Estatísticas Básicas
    const stats = useMemo(() => {
        const counts = { 'Atenção': 0, 'Lacuna de Base': 0, 'Interpretação': 0 };
        filteredErrors.forEach(err => {
            if (counts[err.tipo_erro] !== undefined) counts[err.tipo_erro]++;
        });
        return counts;
    }, [filteredErrors]);

    const handleExportPDF = () => {
        if (!window.jspdf) {
            alert("Biblioteca PDF não carregada.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFillColor(15, 23, 42); // Navy Dark
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("ALGORITMO DE ERROS IA", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(34, 211, 238); // Cyan
        doc.text(`Relatório Técnico de Falhas - Missão: ${missaoAtiva}`, 14, 30);

        let y = 50;

        // Filtros Aplicados
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.text(`Filtros: Matéria (${filterMateria || 'Todas'}), Assunto (${filterAssunto || 'Todos'}), Meta (${filterMeta || 'Todas'}), Busca (${searchTerm || 'Nenhuma'})`, 14, y);
        y += 10;

        filteredErrors.forEach((err, index) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            doc.setDrawColor(226, 232, 240);
            doc.line(14, y, 196, y);
            y += 5;

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`${index + 1}. [${err.tipo_erro}] - ${err.materia}`, 14, y);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(`Assunto: ${err.assunto} | Meta: ${err.meta || 'N/A'}`, 14, y + 5);

            doc.setTextColor(15, 23, 42);
            doc.setFont("helvetica", "italic");
            const preview = doc.splitTextToSize(`"${err.questao_preview}..."`, 180);
            doc.text(preview, 14, y + 10);

            y += 12 + (preview.length * 4);

            doc.setTextColor(234, 179, 8); // Gatilho
            doc.setFont("helvetica", "bold");
            doc.text(`GATILHO:`, 14, y);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
            const gatilho = doc.splitTextToSize(err.gatilho, 160);
            doc.text(gatilho, 35, y);
            y += (gatilho.length * 4) + 2;

            doc.setTextColor(34, 197, 94); // Sugestão
            doc.setFont("helvetica", "bold");
            doc.text(`AÇÃO:`, 14, y);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
            const sugestao = doc.splitTextToSize(err.sugestao, 160);
            doc.text(sugestao, 35, y);
            y += (sugestao.length * 4) + 10;
        });

        doc.save(`Analise_Erros_${missaoAtiva}_${new Date().toLocaleDateString()}.pdf`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
                            <Zap className="text-yellow-400" size={28} />
                        </div>
                        Laboratório de Falhas IA
                    </h2>
                    <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] mt-3 ml-1">
                        Diagnóstico Qualitativo de Alta Performance
                    </p>
                </div>

                <button
                    onClick={handleExportPDF}
                    disabled={filteredErrors.length === 0}
                    className="bg-white/5 hover:bg-white/10 text-white px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20"
                >
                    <Download size={18} className="text-yellow-400" /> Gerar PDF de Erros
                </button>
            </div>

            {/* Dash de Resumo */}
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

            {/* Barra de Filtros */}
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
                        setFilterAssunto(''); // Reset assunto when materia changes
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

            {/* Lista de Erros */}
            <div className="space-y-4">
                {filteredErrors.length === 0 ? (
                    <div className="text-center py-20 opacity-30 text-xs font-black uppercase tracking-widest">
                        Nenhum registro de erro encontrado com estes filtros.
                    </div>
                ) : (
                    filteredErrors.map((err, idx) => (
                        <div key={idx} className="glass-premium p-8 rounded-[2.5rem] border border-[hsl(var(--border))] group hover:border-[hsl(var(--accent)/0.3)] transition-all relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${err.tipo_erro === 'Atenção' ? 'bg-yellow-500' :
                                err.tipo_erro === 'Interpretação' ? 'bg-blue-500' : 'bg-red-500'
                                }`} />

                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${err.tipo_erro === 'Atenção' ? 'bg-yellow-500/10 text-yellow-500' :
                                            err.tipo_erro === 'Interpretação' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                            {err.tipo_erro}
                                        </span>
                                        <span className="text-[10px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest">
                                            {err.materia} • {err.assunto}
                                        </span>
                                        {err.meta && (
                                            <span className="bg-white/5 text-white/40 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter">
                                                {err.meta}
                                            </span>
                                        )}
                                    </div>

                                    <h5 className="text-sm font-bold text-white leading-relaxed italic opacity-80">
                                        "{err.questao_preview}..."
                                    </h5>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-yellow-500/50 uppercase tracking-widest">Gatilho do Erro</p>
                                            <p className="text-xs text-white font-medium leading-relaxed">{err.gatilho}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-green-500/50 uppercase tracking-widest">Ação Corretiva IA</p>
                                            <p className="text-xs text-green-400 font-bold leading-relaxed">{err.sugestao}</p>
                                        </div>
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
