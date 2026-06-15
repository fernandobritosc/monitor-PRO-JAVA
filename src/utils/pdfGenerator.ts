import { supabase } from '../services/supabase';
import { Discursiva as DiscursivaType, SavedGabarito } from '../types';
import { logger } from '../utils/logger';

interface JsPDFWithAutoTable {
  autoTable: (opts: Record<string, unknown>) => void;
  lastAutoTable: { finalY: number };
}

export const generateDiscursivePDF = async (analysis: DiscursivaType) => {
  try {
    const [{ jsPDF }, { data: { user } }] = await Promise.all([
      import('jspdf'),
      supabase.auth.getUser()
    ]);
    await import('jspdf-autotable');
    const userIdentifier = user?.email || 'N/A';
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const doc_ = doc as unknown as JsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 0;

    doc.setFillColor(18, 21, 29);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("MONITOR", 14, 20);
    const monitorWidth = doc.getTextWidth("MONITOR");
    doc.setTextColor(6, 182, 212);
    doc.text("PRO", 14 + monitorWidth + 1, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 236, 236);
    doc.text("Relatório de Análise Discursiva", 14, 28);

    currentY = 40;
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Informações da Análise", 14, currentY);
    currentY += 5;

    doc_.autoTable({
      startY: currentY,
      body: [
        ['ALUNO(A)', userIdentifier],
        ['TEMA', analysis.title],
        ['ID REGISTRO', analysis.id.substring(0, 8).toUpperCase()],
        ['DATA', new Date(analysis.created_at).toLocaleString('pt-BR')],
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', textColor: [100, 100, 100] } },
    });
    currentY = doc_.lastAutoTable.finalY + 10;

    const text = analysis.analysis_text;
    const criteriaRegex = /###\s*\d+\.\s*(.*?)\n\*\*Nota:\*\*\s*(.*?)\n\*\*Justificativa:\*\*\s*(.*?)\n\*\*Melhoria Sugerida:\*\*\s*(.*?)(?=\n###|\n---)/gs;
    const grammarTableRegex = /\| Linha \(Aprox\.\) \|.*?\|\n\|---\|.*?\|\n((?:\|.*\|\n?)*)/s;
    const improvementPlanRegex = /### Plano de Ação para Melhoria\n(.*?)(?=\n---)/s;
    const finalScoreRegex = /## Nota Final\n\*\*Nota Total:\*\*\s*(.*?)\n\*\*Comentário Final:\*\*\s*(.*)/s;

    doc.setFontSize(14);
    doc.text("Análise por Critério", 14, currentY);
    currentY += 6;
    const criteriaData = [];
    let match;
    while ((match = criteriaRegex.exec(text)) !== null) {
      criteriaData.push([match[1].trim(), match[2].trim(), `${match[3].trim()}\n\nMelhoria: ${match[4].trim()}`]);
    }
    doc_.autoTable({
      startY: currentY,
      head: [['Critério', 'Nota', 'Justificativa & Sugestão']],
      body: criteriaData,
      theme: 'grid',
      headStyles: { fillColor: [88, 28, 135], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 'auto' } },
    });
    currentY = doc_.lastAutoTable.finalY + 10;

    const grammarMatch = text.match(grammarTableRegex);
    if (grammarMatch && (grammarMatch[1] || '').trim()) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.text("Tabela de Desvios Gramaticais", 14, currentY);
      currentY += 6;
      const grammarBody = (grammarMatch[1] || '').trim().split('\n').map(row => row.split('|').slice(1, -1).map(cell => cell.trim()));
      doc_.autoTable({
        startY: currentY,
        head: [['Linha (Aprox.)', 'Trecho com Desvio', 'Sugestão de Correção']],
        body: grammarBody,
        theme: 'striped',
        headStyles: { fillColor: [75, 85, 99] },
        styles: { fontSize: 8 },
      });
      currentY = doc_.lastAutoTable.finalY + 10;
    }

    const planMatch = text.match(improvementPlanRegex);
    if (planMatch && (planMatch[1] || '').trim()) {
      if (currentY > 220) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.text("Plano de Ação para Melhoria", 14, currentY);
      currentY += 6;

      const planBody = [];
      const planText = (planMatch[1] || '').trim();
      const categories = planText.split(/\*\s*\*\*(.*?)\*\*/g).filter(c => c.trim() && c !== ':');

      for (let i = 0; i < categories.length; i += 2) {
        const categoryName = categories[i];
        const actionsText = categories[i + 1] || '';
        const actions = actionsText.split(/\n\s*\*/g).map(action => `• ${action.trim()}`).filter(action => action.length > 2).join('\n');
        planBody.push([categoryName, actions]);
      }

      doc_.autoTable({
        startY: currentY,
        head: [['Critério de Melhoria', 'Plano de Ação Sugerido']],
        body: planBody,
        theme: 'grid',
        headStyles: { fillColor: [40, 50, 60] },
        styles: { fontSize: 8, cellPadding: 3, valign: 'top' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 'auto' } },
      });
      currentY = doc_.lastAutoTable.finalY + 10;
    }

    const finalMatch = text.match(finalScoreRegex);
    if (finalMatch) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc_.autoTable({
        startY: currentY,
        body: [
          [{ content: 'Nota Final', styles: { fontStyle: 'bold' } }, { content: finalMatch[1].trim(), styles: { fontStyle: 'bold', fontSize: 14, halign: 'center' } }],
          [{ content: 'Comentário Geral', styles: { fontStyle: 'bold' } }, finalMatch[2].trim()]
        ],
        theme: 'grid',
        styles: { fontSize: 9 }
      });
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Gerado via MonitorPro - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`Analise_Discursiva_${analysis.id.substring(0, 8)}.pdf`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('DATA', 'Erro ao gerar PDF', error);
    alert("Erro ao gerar PDF: " + error.message);
  }
};

interface GabaritoPDFParams {
  selectedGabarito: SavedGabarito;
  scores: {
    totals: { scoreAI: number; totalAI: number; scoreOfficial: number; totalOfficial: number };
  };
  userAnswers: Record<number, string>;
  officialAnswers: Record<number, string>;
}

export const generateGabaritoPDF = async ({ selectedGabarito, scores, userAnswers, officialAnswers }: GabaritoPDFParams) => {
  try {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF();
    const doc_ = doc as unknown as JsPDFWithAutoTable;
    const { data: { user } } = await supabase.auth.getUser();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 0;

    doc.setFillColor(18, 21, 29);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("MONITOR", 14, 20);
    const monitorWidth = doc.getTextWidth("MONITOR");
    doc.setTextColor(6, 182, 212);
    doc.text("PRO", 14 + monitorWidth + 1, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 236, 236);
    doc.text("Relatório de Análise de Gabarito", 14, 28);

    currentY = 40;
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Informações da Análise", 14, currentY);
    currentY += 5;

    doc_.autoTable({
      startY: currentY,
      body: [
        ['ALUNO(A)', user?.email || 'N/A'],
        ['PROVA', selectedGabarito.file_name],
        ['ID REGISTRO', selectedGabarito.id.substring(0, 8).toUpperCase()],
        ['DATA', new Date(selectedGabarito.created_at).toLocaleString('pt-BR')],
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', textColor: [100, 100, 100] } },
    });
    currentY = doc_.lastAutoTable.finalY + 10;

    doc.setFontSize(14);
    doc.text("Resumo de Desempenho", 14, currentY);
    currentY += 6;
    doc_.autoTable({
      startY: currentY,
      head: [['Comparativo', 'Acertos', 'Total', 'Nota']],
      body: [
        ['vs. IA', scores.totals.scoreAI, scores.totals.totalAI, `${(scores.totals.totalAI > 0 ? (scores.totals.scoreAI) / scores.totals.totalAI * 100 : 0).toFixed(0)}%`],
        ['vs. Gabarito Oficial', scores.totals.scoreOfficial, scores.totals.totalOfficial, `${(scores.totals.totalOfficial > 0 ? (scores.totals.scoreOfficial) / scores.totals.totalOfficial * 100 : 0).toFixed(0)}%`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [88, 28, 135] }
    });
    currentY = doc_.lastAutoTable.finalY + 10;

    doc.setFontSize(14);
    doc.text("Gabarito Detalhado", 14, currentY);
    currentY += 6;
    doc_.autoTable({
      startY: currentY,
      head: [['Questão', 'Sua Resposta', 'Gabarito Oficial', 'Gabarito IA', 'Resultado (vs. Oficial)']],
      body: selectedGabarito.results_json.map(r => [
        r.numero_questao,
        userAnswers[r.numero_questao] || '-',
        officialAnswers[r.numero_questao] || '-',
        r.alternativa_correta_ia,
        (userAnswers[r.numero_questao] && officialAnswers[r.numero_questao]) ? (userAnswers[r.numero_questao] === officialAnswers[r.numero_questao] ? 'CORRETO' : 'ERRADO') : '-'
      ]),
      didParseCell: (data: { column: { index: number }; cell: { raw: string; styles: { textColor: [number, number, number] } } }) => {
        if (data.column.index === 4) {
          if (data.cell.raw === 'CORRETO') data.cell.styles.textColor = [0, 150, 0];
          if (data.cell.raw === 'ERRADO') data.cell.styles.textColor = [200, 0, 0];
        }
      }
    });
    currentY = doc_.lastAutoTable.finalY + 15;

    doc.setFontSize(14);
    doc.text("Análise Detalhada das Questões", 14, currentY);
    currentY += 8;

    selectedGabarito.results_json.forEach(r => {
      if (currentY > 260) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text(`Questão ${r.numero_questao}`, 14, currentY);
      currentY += 6;

      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("Enunciado:", 14, currentY);
      doc.setFont("helvetica", "normal");
      const splitEnunciado = doc.splitTextToSize(r.enunciado, 180);
      doc.text(splitEnunciado, 14, currentY + 4);
      currentY += (splitEnunciado.length * 4) + 6;

      doc.setFont("helvetica", "bold"); doc.text("Justificativa (IA):", 14, currentY);
      doc.setFont("helvetica", "normal");
      const splitJustificativa = doc.splitTextToSize(r.justificativa, 180);
      doc.text(splitJustificativa, 14, currentY + 4);
      currentY += (splitJustificativa.length * 4) + 10;
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Gerado em ${new Date().toLocaleString()} via MonitorPro - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`analise_gabarito_${selectedGabarito.file_name.replace('.pdf', '')}.pdf`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('DATA', 'Erro ao gerar PDF', error);
    alert("Erro ao gerar PDF: " + error.message);
  }
};
