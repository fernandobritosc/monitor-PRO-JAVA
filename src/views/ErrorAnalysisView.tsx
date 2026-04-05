import React, { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { StudyRecord, ErrorAnalysis } from '../types';
import { useSession } from '../hooks/useSession';
import { useStudyRecords } from '../hooks/queries/useStudyRecords';
import { useAppStore } from '../stores/useAppStore';
import { generateAIContent } from '../services/aiService';
import { getGeminiKey, getGroqKey } from '../services/supabase';

// Componentes Modulares Traduzidos
import { PainelCofre } from '../components/features/error-vault/PainelCofre';
import { SessaoRevisao } from '../components/features/error-vault/SessaoRevisao';

interface ErrorAnalysisViewProps {
    records?: StudyRecord[];
    missaoAtiva?: string;
}

const normalizeText = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, ' ');

export const ErrorAnalysisView: React.FC<ErrorAnalysisViewProps> = ({ 
    records: recordsProps, 
    missaoAtiva: missaoAtivaProps 
}) => {
    const { userId } = useSession();
    const { studyRecords: recordsQuery, updateRecord } = useStudyRecords(userId);
    const missaoAtivaStore = useAppStore(state => state.missaoAtiva);
    const records = recordsProps ?? recordsQuery ?? [];
    const missaoAtiva = missaoAtivaProps ?? missaoAtivaStore ?? '';

    // Estados de Controle traduzidos
    const [viewMode, setViewMode] = useState<'painel' | 'revisao'>('painel');
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [macroDiagnosis, setMacroDiagnosis] = useState<string | null>(null);
    const [selectedAssunto, setSelectedAssunto] = useState<{ materia: string; assunto: string } | null>(null);
    const [overrides, setOverrides] = useState<Record<string, { resolved?: boolean; failed_attempts?: number }>>({});
    
    // Filtros de busca
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMateria, setFilterMateria] = useState('');

    // Extração de Erros
    const allErrors = useMemo(() => {
        const errors: (ErrorAnalysis & { recordId: string; materia: string; assunto: string; meta?: string | number | null; data: string; id: string })[] = [];
        records
            .filter(r => r.concurso === missaoAtiva && r.analise_erros && r.analise_erros.length > 0)
            .forEach(r => {
                r.analise_erros?.forEach((err: ErrorAnalysis, errIdx: number) => {
                    const preview = err.questao_preview || '';
                    const fallbackId = `${r.id}-${errIdx}-${preview.substring(0, 10).replace(/\s+/g, '')}`;
                    errors.push({
                        ...err,
                        id: err.id || fallbackId,
                        recordId: r.id,
                        materia: r.materia,
                        assunto: r.assunto,
                        meta: r.meta,
                        data: r.data_estudo,
                        sugestao_mentor: (err as any).sugestao_mentor,
                        failed_attempts: err.failed_attempts ? Number(err.failed_attempts) : 0,
                        resolved: !!err.resolved
                    });
                });
            });
        return errors.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [records, missaoAtiva]);

    const localErrors = useMemo(() => {
        return allErrors.map(err => {
            const override = overrides[err.id];
            if (!override) return err;
            return {
                ...err,
                resolved: override.resolved !== undefined ? override.resolved : err.resolved,
                failed_attempts: override.failed_attempts !== undefined ? override.failed_attempts : err.failed_attempts
            };
        });
    }, [allErrors, overrides]);

    const handleUpdateError = async (recordId: string, errorId: string, resolved: boolean) => {
        try {
            const currentErr = localErrors.find(e => e.id === errorId);
            const currentAttempts = Number(currentErr?.failed_attempts || 0);
            const newAttempts = !resolved ? currentAttempts + 1 : currentAttempts;

            setOverrides(prev => ({ ...prev, [errorId]: { resolved, failed_attempts: newAttempts } }));

            const record = records.find(r => r.id === recordId);
            if (!record || !record.analise_erros) return;

            const updatedAnalise = record.analise_erros.map((err: ErrorAnalysis, errIdx: number) => {
                const preview = err.questao_preview || '';
                const currentId = err.id || `${recordId}-${errIdx}-${preview.substring(0, 10).replace(/\s+/g, '')}`;
                if (currentId === errorId) {
                    return {
                        ...err,
                        id: currentId,
                        resolved: resolved,
                        failed_attempts: !resolved ? (Number(err.failed_attempts) || 0) + 1 : Number(err.failed_attempts)
                    };
                }
                return { ...err, id: currentId };
            });

            await updateRecord({ ...record, analise_erros: updatedAnalise });
        } catch (err) {
            console.error("[Cofre] Falha ao sincronizar:", err);
        }
    };

    const handleGenerateMacro = async () => {
        const filterPending = localErrors.filter(e => !e.resolved);
        if (filterPending.length === 0) return;
        
        setIsSynthesizing(true);
        try {
            const geminiKey = getGeminiKey();
            const groqKey = getGroqKey();
            const mentorReports = filterPending.map(err => ({
                materia: err.materia,
                assunto: err.assunto,
                tipo_erro: err.tipo_erro,
                sugestao_mentor: err.sugestao_mentor || 'N/A'
            }));

            const result = await generateAIContent(
                { content: JSON.stringify(mentorReports) },
                geminiKey,
                groqKey,
                'gemini',
                'macro_diagnostico'
            );
            setMacroDiagnosis(result);
            alert("Diagnóstico Neural Gerado com Sucesso!");
        } catch (error) {
            console.error('Erro AI:', error);
        } finally {
            setIsSynthesizing(false);
        }
    };

    // Filtros e Estatísticas
    const stats = useMemo(() => {
        const counts = { 'Atenção': 0, 'Lacuna de Base': 0, 'Interpretação': 0 };
        localErrors.filter(e => !e.resolved).forEach(err => {
            if (counts[err.tipo_erro as keyof typeof counts] !== undefined) {
                counts[err.tipo_erro as keyof typeof counts]++;
            }
        });
        return counts;
    }, [localErrors]);

    const sessionQueue = useMemo(() => {
        if (!selectedAssunto) return [];
        return localErrors.filter(e => 
            !e.resolved && 
            normalizeText(e.materia) === normalizeText(selectedAssunto.materia) &&
            normalizeText(e.assunto) === normalizeText(selectedAssunto.assunto)
        );
    }, [localErrors, selectedAssunto]);

    const subjectStats = useMemo(() => {
        if (!selectedAssunto) return { hits: 0, errors: 0 };
        const mat = normalizeText(selectedAssunto.materia);
        const subjectRecords = records.filter(r => normalizeText(r.materia) === mat);
        const hits = subjectRecords.reduce((acc, r) => acc + (r.acertos || 0), 0);
        const total = subjectRecords.reduce((acc, r) => acc + (r.total || 0), 0);
        return { hits, errors: total - hits };
    }, [records, selectedAssunto]);

    // Re-integração da lógica de PDF
    const handleExportPDF = (isMentor: boolean = false) => {
        if (!(window as any).jspdf) {
            alert("Biblioteca PDF não carregada.");
            return;
        }

        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        const contentWidth = pageWidth - (margin * 2);
        let y = 0;

        const cleanStr = (text: string) => (text || "").replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\u200D|\uFE0F/g, '').replace(/[^\x00-\x7F\u00C0-\u00FF]/g, m => m);

        const drawHeader = (title: string, subTitle: string) => {
            doc.setFillColor(isMentor ? 88 : 15, isMentor ? 28 : 23, isMentor ? 135 : 42);
            doc.rect(0, 0, pageWidth, 45, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text(title, margin, 20);
            doc.setFontSize(9);
            doc.text(subTitle, margin, 30);
            return 60;
        };

        const drawFooter = () => {
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8); doc.setTextColor(150);
            doc.text(`MonitorPro Cofre de Erros | Gerado em ${new Date().toLocaleString()} | Página ${pageCount}`, margin, pageHeight - 10);
        };

        y = drawHeader(isMentor ? "PARECER DO MENTOR" : "RELATÓRIO DE EVOLUÇÃO", `Missão: ${missaoAtiva}`);

        if (macroDiagnosis) {
            doc.setFontSize(14); doc.setTextColor(isMentor ? 147 : 34, isMentor ? 51 : 197, isMentor ? 234 : 94);
            doc.text("DIAGNÓSTICO SINTÉTICO", margin, y); y += 10;
            doc.setFontSize(10); doc.setTextColor(30, 41, 59);
            const lines = doc.splitTextToSize(cleanStr(macroDiagnosis), contentWidth);
            lines.forEach((line: string) => {
                if (y > pageHeight - 20) { doc.addPage(); y = 20; }
                doc.text(line, margin, y); y += 5;
            });
            y += 10;
        }

        if (!isMentor) {
            const pending = localErrors.filter(e => !e.resolved);
            pending.forEach((err, idx) => {
                if (y > pageHeight - 40) { doc.addPage(); y = 20; }
                doc.setFontSize(11); doc.setFont("helvetica", "bold");
                doc.text(`${idx + 1}. [${err.tipo_erro}] - ${err.materia}`, margin, y); y += 8;
                doc.setFontSize(9); doc.setFont("helvetica", "normal");
                const desc = doc.splitTextToSize(cleanStr(err.questao_preview || ''), contentWidth);
                desc.forEach((l: string) => { doc.text(l, margin, y); y += 5; });
                y += 5;
            });
        }

        drawFooter();
        doc.save(`MonitorPro_Cofre_${isMentor ? 'Mentor' : 'Analise'}_${missaoAtiva}.pdf`);
    };

    return (
        <div className="w-full flex flex-col space-y-6">
            <AnimatePresence mode="wait">
                {viewMode === 'painel' ? (
                    <PainelCofre 
                        key="painel"
                        records={records}
                        localErrors={localErrors}
                        missaoAtiva={missaoAtiva}
                        isSynthesizing={isSynthesizing}
                        stats={stats}
                        onGenerateMacro={handleGenerateMacro}
                        onExportPDF={handleExportPDF}
                        onSelectAssunto={(m, a) => {
                            setSelectedAssunto({ materia: m, assunto: a });
                            setViewMode('revisao');
                        }}
                    />
                ) : (
                    <SessaoRevisao 
                        key="revisao"
                        errors={sessionQueue}
                        subjectStats={subjectStats}
                        onClose={() => {
                            setViewMode('painel');
                            setSelectedAssunto(null);
                        }}
                        onUpdateError={handleUpdateError}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ErrorAnalysisView;
