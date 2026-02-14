
import React, { useState, useMemo } from 'react';
import { StudyRecord } from '../types';
import { FileText, Download, Calendar, Filter, PieChart, CheckSquare, Printer } from 'lucide-react';

// Declaração para TypeScript reconhecer a biblioteca global
declare global {
    interface Window {
        jspdf: any;
    }
}

interface ReportsProps {
    records: StudyRecord[];
    missaoAtiva: string;
}

// Helper para pegar data local YYYY-MM-DD
const getLocalToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Reports: React.FC<ReportsProps> = ({ records, missaoAtiva }) => {
    // Estado de Filtros
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30); // Padrão: Últimos 30 dias
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [endDate, setEndDate] = useState(getLocalToday());
    const [generating, setGenerating] = useState(false);

    // Filtragem dos dados
    const filteredRecords = useMemo(() => {
        return records
            .filter(r => r.concurso === missaoAtiva)
            .filter(r => r.data_estudo >= startDate && r.data_estudo <= endDate)
            .sort((a, b) => new Date(b.data_estudo).getTime() - new Date(a.data_estudo).getTime()); // Mais recentes primeiro
    }, [records, missaoAtiva, startDate, endDate]);

    // Estatísticas do Período
    const stats = useMemo(() => {
        const totalRecords = filteredRecords.length;
        const totalMinutes = filteredRecords.reduce((acc, r) => acc + r.tempo, 0);
        const totalHours = totalMinutes / 60;

        const totalQuestions = filteredRecords.reduce((acc, r) => acc + r.total, 0);
        const totalCorrect = filteredRecords.reduce((acc, r) => acc + r.acertos, 0);
        const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

        // Agrupamento por Matéria
        const subjectStats: Record<string, { time: number, questions: number, correct: number }> = {};
        filteredRecords.forEach(r => {
            if (!subjectStats[r.materia]) subjectStats[r.materia] = { time: 0, questions: 0, correct: 0 };
            subjectStats[r.materia].time += r.tempo;
            subjectStats[r.materia].questions += r.total;
            subjectStats[r.materia].correct += r.acertos;
        });

        const sortedSubjects = Object.entries(subjectStats)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.time - a.time);

        return { totalRecords, totalHours, totalQuestions, accuracy, sortedSubjects };
    }, [filteredRecords]);


    const generatePDF = () => {
        setGenerating(true);

        try {
            // VERIFICAÇÃO CRÍTICA: Checa se a lib foi carregada pelo script do index.html
            if (!window.jspdf) {
                throw new Error("Biblioteca PDF não encontrada. Verifique sua conexão com a internet e recarregue a página.");
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // O plugin autotable se anexa automaticamente ao jsPDF quando carregado via CDN.
            // A chamada deve ser feita diretamente na instância: doc.autoTable(options)
            const hasAutoTable = typeof (doc as any).autoTable === 'function';

            if (!hasAutoTable) {
                console.warn("Plugin AutoTable não detectado corretamente.");
                throw new Error("Plugin de tabelas PDF não carregou. Tente recarregar a página.");
            }

            const pageWidth = doc.internal.pageSize.width;

            // --- HEADER ---
            doc.setFillColor(14, 17, 23); // Dark Background
            doc.rect(0, 0, pageWidth, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("MONITORPRO", 14, 20);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(6, 182, 212); // Cyan
            doc.text("Relatório de Performance & Conferência", 14, 28);

            doc.setTextColor(200, 200, 200);
            doc.text(`Missão: ${missaoAtiva}`, pageWidth - 14, 20, { align: 'right' });
            doc.text(`Período: ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}`, pageWidth - 14, 28, { align: 'right' });

            let currentY = 50;

            // --- RESUMO ESTATÍSTICO ---
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("1. Resumo do Período", 14, currentY);

            currentY += 10;

            const summaryData = [
                ['Horas Líquidas', `${Math.floor(stats.totalHours)}h ${(stats.totalHours % 1 * 60).toFixed(0)}m`],
                ['Questões Realizadas', stats.totalQuestions.toString()],
                ['Aproveitamento Global', `${stats.accuracy.toFixed(1)}%`],
                ['Sessões de Estudo', stats.totalRecords.toString()]
            ];

            (doc as any).autoTable({
                startY: currentY,
                head: [['Métrica', 'Valor']],
                body: summaryData,
                theme: 'grid',
                headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' }, // Purple
                styles: { fontSize: 10, cellPadding: 3 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
                margin: { left: 14, right: 14 }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;

            // --- DISTRIBUIÇÃO POR MATÉRIA ---
            doc.text("2. Distribuição por Disciplina", 14, currentY);
            currentY += 6;

            const subjectData = stats.sortedSubjects.map(s => [
                s.name,
                `${Math.floor(s.time / 60)}h${s.time % 60}m`,
                `${s.correct}/${s.questions}`,
                `${s.questions > 0 ? ((s.correct / s.questions) * 100).toFixed(0) : 0}%`
            ]);

            (doc as any).autoTable({
                startY: currentY,
                head: [['Disciplina', 'Tempo', 'Questões', 'Nota']],
                body: subjectData,
                theme: 'striped',
                headStyles: { fillColor: [75, 85, 99], textColor: 255 },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;

            // --- TABELA DE CONFERÊNCIA (LOGS DETALHADOS) ---
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(14);
            doc.text("3. Conferência de Registros (Auditoria)", 14, currentY);
            currentY += 6;

            const recordsData = filteredRecords.map(r => [
                new Date(r.data_estudo).toLocaleDateString(),
                r.materia,
                r.assunto,
                `${Math.floor(r.tempo / 60)}h${r.tempo % 60}m`,
                `${r.acertos}/${r.total}`,
                `${r.taxa.toFixed(0)}%`,
                r.dificuldade === 'Simulado' ? 'SIMULADO' : ''
            ]);

            (doc as any).autoTable({
                startY: currentY,
                head: [['Data', 'Matéria', 'Assunto', 'Tempo', 'Qts', '%', 'Obs']],
                body: recordsData,
                theme: 'plain',
                headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' }, // Cyan
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 35, fontStyle: 'bold' },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 20, halign: 'center' },
                    4: { cellWidth: 20, halign: 'center' },
                    5: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                    6: { cellWidth: 20, fontSize: 7 }
                },
                margin: { left: 14, right: 14 },
                didParseCell: (data: any) => {
                    if (data.row.raw[6] === 'SIMULADO' && data.section === 'body') {
                        data.cell.styles.fillColor = [254, 243, 199];
                    }
                    if (data.column.index === 5 && data.section === 'body') {
                        const val = parseFloat(data.cell.raw as string);
                        if (val < 60) data.cell.styles.textColor = [220, 38, 38];
                        if (val >= 80) data.cell.styles.textColor = [22, 163, 74];
                    }
                }
            });

            // --- FOOTER ---
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Gerado em ${new Date().toLocaleString()} via MonitorPro - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
            }

            doc.save(`Relatorio_MonitorPro_${missaoAtiva}_${endDate}.pdf`);

        } catch (err: any) {
            console.error("Erro ao gerar PDF:", err);
            alert("Erro ao gerar o PDF: " + err.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 border-b border-[hsl(var(--border))] pb-10">
                <div>
                    <h2 className="text-4xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                            <FileText className="text-indigo-400" size={32} />
                        </div>
                        Central Neural de Relatórios
                    </h2>
                    <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] mt-3 ml-1">
                        Arquivamento e Auditoria de Alta Performance
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">

                {/* COLUNA 1: CONFIGURAÇÃO */}
                <div className="lg:col-span-1 glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] rounded-[2.5rem] p-8 shadow-2xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                        <Filter size={80} className="text-indigo-500" />
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] relative z-10">
                        <div className="w-1 h-3 bg-indigo-500 rounded-full" /> Parâmetros de Filtro
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div>
                            <label className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-3 block">Horizonte Inicial</label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 group-hover:scale-110 transition-transform" size={16} />
                                <input
                                    type="date"
                                    className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl pl-12 pr-4 py-4 text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all shadow-inner"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-3 block">Extremo Final</label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 group-hover:scale-110 transition-transform" size={16} />
                                <input
                                    type="date"
                                    className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl pl-12 pr-4 py-4 text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all shadow-inner"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-[hsl(var(--border))] space-y-8 relative z-10">
                        <div className="bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl p-6 shadow-xl">
                            <p className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-4">Snapshot Neural</p>
                            <div className="flex justify-between items-center text-[10px] font-black text-white mb-3">
                                <span className="uppercase tracking-widest opacity-60">Registros:</span>
                                <span className="text-indigo-400">{stats.totalRecords}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-white">
                                <span className="uppercase tracking-widest opacity-60">Volume Horário:</span>
                                <span className="text-indigo-400">{stats.totalHours.toFixed(1)}h</span>
                            </div>
                        </div>

                        <button
                            onClick={generatePDF}
                            disabled={generating || stats.totalRecords === 0}
                            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-[11px] font-black uppercase tracking-[0.2em] py-6 rounded-[1.5rem] shadow-2xl shadow-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 border border-white/10"
                        >
                            {generating ? (
                                <>Processando Dossiê...</>
                            ) : (
                                <><Download size={18} /> Exportar Revista PDF</>
                            )}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-10">

                    {/* Cards de Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        <div className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <PieChart size={60} className="text-blue-500" />
                            </div>
                            <div className="flex items-center gap-3 text-blue-400 mb-6 text-[9px] font-black uppercase tracking-[0.2em] relative z-10">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_blue]" /> Aproveitamento Neural
                            </div>
                            <div className="text-4xl font-black text-white relative z-10 tracking-tighter">{stats.accuracy.toFixed(1)}%</div>
                            <div className="mt-4 w-full bg-[hsl(var(--bg-main))] h-1 rounded-full overflow-hidden shadow-inner">
                                <div className="bg-blue-500 h-full rounded-full shadow-[0_0_10px_blue]" style={{ width: `${stats.accuracy}%` }}></div>
                            </div>
                        </div>

                        <div className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <CheckSquare size={60} className="text-emerald-500" />
                            </div>
                            <div className="flex items-center gap-3 text-emerald-400 mb-6 text-[9px] font-black uppercase tracking-[0.2em] relative z-10">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_emerald]" /> Volume de Treino
                            </div>
                            <div className="text-4xl font-black text-white relative z-10 tracking-tighter">{stats.totalQuestions} <span className="text-xs text-[hsl(var(--text-muted))] uppercase font-bold tracking-widest ml-1">itens</span></div>
                        </div>

                        <div className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <Printer size={60} className="text-amber-500" />
                            </div>
                            <div className="flex items-center gap-3 text-amber-400 mb-6 text-[9px] font-black uppercase tracking-[0.2em] relative z-10">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_amber]" /> Dossiê Digital
                            </div>
                            <div className="text-4xl font-black text-white relative z-10 tracking-tighter">{Math.ceil(stats.totalRecords / 25) + 1} <span className="text-xs text-[hsl(var(--text-muted))] uppercase font-bold tracking-widest ml-1">pp</span></div>
                        </div>
                    </div>

                    {/* Preview da Tabela */}
                    <div className="glass-premium bg-[hsl(var(--bg-card))] border-2 border-[hsl(var(--border))] rounded-[2.5rem] p-10 shadow-2xl h-[500px] flex flex-col relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-8">
                            <h4 className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] flex items-center gap-4">
                                <div className="p-2 bg-white/5 rounded-xl border border-[hsl(var(--border))]"><FileText size={16} /></div>
                                Logs de Auditoria em Tempo Real
                            </h4>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-75"></div>
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-150"></div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[hsl(var(--bg-main)/0.3)] rounded-[2rem] border border-[hsl(var(--border))] shadow-inner">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[hsl(var(--bg-main)/0.8)] sticky top-0 z-10 backdrop-blur-xl border-b border-[hsl(var(--border))]">
                                    <tr>
                                        <th className="p-6 text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest">Cronologia</th>
                                        <th className="p-6 text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest">Núcleo Central</th>
                                        <th className="p-6 text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest">Esfera de Estudo</th>
                                        <th className="p-6 text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest text-right">Eficiência</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[hsl(var(--border))]">
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-6 opacity-20">
                                                    <Filter size={64} className="text-[hsl(var(--text-muted))]" />
                                                    <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em]">Nenhum registro detectado no horizonte.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map(r => (
                                            <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-6 text-[10px] font-black text-[hsl(var(--text-muted))] font-mono uppercase tracking-widest">
                                                    {new Date(r.data_estudo).toLocaleDateString()}
                                                </td>
                                                <td className="p-6 text-xs font-black text-[hsl(var(--text-bright))] uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{r.materia}</td>
                                                <td className="p-6 text-[11px] font-medium text-[hsl(var(--text-muted))] group-hover:text-white transition-colors">{r.assunto}</td>
                                                <td className="p-6 text-right">
                                                    <div className="flex items-center justify-end gap-3 font-black text-xs">
                                                        <span className={r.taxa >= 80 ? 'text-emerald-400 shadow-[0_0_10px_emerald/0.2]' : r.taxa < 60 ? 'text-red-400 shadow-[0_0_10px_red/0.2]' : 'text-amber-400 shadow-[0_0_10px_amber/0.2]'}>
                                                            {r.taxa.toFixed(0)}%
                                                        </span>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${r.taxa >= 80 ? 'bg-emerald-500' : r.taxa < 60 ? 'bg-red-500' : 'bg-amber-500'}`} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default Reports;
