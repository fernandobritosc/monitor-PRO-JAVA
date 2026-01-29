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

const Reports: React.FC<ReportsProps> = ({ records, missaoAtiva }) => {
  // Estado de Filtros
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Padrão: Últimos 30 dias
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
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
          `${Math.floor(s.time/60)}h${s.time%60}m`,
          `${s.correct}/${s.questions}`,
          `${s.questions > 0 ? ((s.correct/s.questions)*100).toFixed(0) : 0}%`
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
          `${Math.floor(r.tempo/60)}h${r.tempo%60}m`,
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
      for(let i = 1; i <= pageCount; i++) {
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
             <FileText className="text-blue-400" /> Central de Relatórios
          </h2>
          <p className="text-slate-400 text-sm mt-1">
             Gere documentos oficiais de desempenho e conferência de estudos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* COLUNA 1: CONFIGURAÇÃO */}
         <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
             <div className="flex items-center gap-2 mb-4 text-slate-300 font-bold uppercase text-xs tracking-widest border-b border-white/5 pb-2">
                 <Filter size={14} /> Filtros de Geração
             </div>

             <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data Inicial</label>
                    <div className="relative">
                       <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                       <input 
                         type="date" 
                         className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                         value={startDate}
                         onChange={e => setStartDate(e.target.value)}
                       />
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data Final</label>
                    <div className="relative">
                       <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                       <input 
                         type="date" 
                         className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                         value={endDate}
                         onChange={e => setEndDate(e.target.value)}
                       />
                    </div>
                 </div>
             </div>

             <div className="pt-4 border-t border-white/5">
                 <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
                    <p className="text-xs text-slate-400 mb-2">Resumo da seleção:</p>
                    <div className="flex justify-between items-center text-sm font-bold text-white mb-1">
                        <span>Registros encontrados:</span>
                        <span className="text-blue-400">{stats.totalRecords}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-white">
                        <span>Horas Computadas:</span>
                        <span className="text-blue-400">{stats.totalHours.toFixed(1)}h</span>
                    </div>
                 </div>

                 <button 
                    onClick={generatePDF}
                    disabled={generating || stats.totalRecords === 0}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                 >
                    {generating ? (
                        <>Gerando PDF...</>
                    ) : (
                        <><Download size={20} /> Baixar Relatório PDF</>
                    )}
                 </button>
             </div>
         </div>

         {/* COLUNA 2 e 3: PREVIEW */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Cards de Preview */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="glass p-5 rounded-2xl border-b-4 border-blue-500">
                   <div className="flex items-center gap-2 text-blue-400 mb-2 text-xs font-bold uppercase tracking-widest">
                      <PieChart size={14} /> Aproveitamento
                   </div>
                   <div className="text-3xl font-black text-white">{stats.accuracy.toFixed(1)}%</div>
                </div>
                <div className="glass p-5 rounded-2xl border-b-4 border-indigo-500">
                   <div className="flex items-center gap-2 text-indigo-400 mb-2 text-xs font-bold uppercase tracking-widest">
                      <CheckSquare size={14} /> Questões
                   </div>
                   <div className="text-3xl font-black text-white">{stats.totalQuestions}</div>
                </div>
                <div className="glass p-5 rounded-2xl border-b-4 border-purple-500">
                   <div className="flex items-center gap-2 text-purple-400 mb-2 text-xs font-bold uppercase tracking-widest">
                      <Printer size={14} /> Páginas Est.
                   </div>
                   <div className="text-3xl font-black text-white">{Math.ceil(stats.totalRecords / 25) + 1}</div>
                </div>
            </div>

            {/* Preview da Tabela */}
            <div className="glass rounded-3xl p-6 border border-white/5 h-[400px] flex flex-col">
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText size={16} /> Prévia dos Dados (Conferência)
                </h4>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30 rounded-xl border border-white/5">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data</th>
                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Matéria</th>
                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assunto</th>
                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Nota</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">
                                        Nenhum registro no período selecionado.
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map(r => (
                                    <tr key={r.id} className="hover:bg-white/5 transition-colors text-xs">
                                        <td className="p-3 text-slate-400 font-mono">
                                            {new Date(r.data_estudo).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-white font-bold">{r.materia}</td>
                                        <td className="p-3 text-slate-300 truncate max-w-[150px]">{r.assunto}</td>
                                        <td className={`p-3 text-right font-bold ${r.taxa >= 80 ? 'text-green-400' : r.taxa < 60 ? 'text-red-400' : 'text-yellow-400'}`}>
                                            {r.taxa.toFixed(0)}%
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