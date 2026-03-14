import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { Question, EditalMateria, GlobalQuestion, QuestionAttempt } from '../types';
import { Search, Trash2, Edit, ExternalLink, AlertOctagon, CheckCircle2, X, ChevronDown, ChevronUp, FileText, Target, Zap, Layers, Clock, Plus, Brain, Volume2, Sparkles, Trophy, RotateCcw, ChevronLeft, ChevronRight, Save, Headphones, Music, Table, Map as MapIcon, Send, MessageSquarePlus, Hash, PlusCircle, BarChart2, Upload, ImageIcon, RefreshCw } from 'lucide-react';
import { streamAIContent, AIProviderName, generateAIContent, handlePlayRevisionAudio, generatePodcastAudio, deleteCachedAudio } from '../services/aiService';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { logger } from '../utils/logger';
import { questionsQueries, profilesQueries } from '../services/queries';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { QuestionAnalytics } from '../components/QuestionsBank/QuestionAnalytics';
import { QuestionCard } from '../components/QuestionsBank/QuestionCard';
import QuestionForm from '../components/QuestionsBank/QuestionForm';
import { QuestionsFilter } from '../components/QuestionsBank/QuestionsFilter';
import { getLocalToday, extractTecId, formatTextWithLinks } from '../components/QuestionsBank/utils';
import Image from '@tiptap/extension-image';
import { CustomSelector } from '../components/CustomSelector';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useSession } from '../hooks/useSession';
import { useEditais } from '../hooks/queries/useEditais';
import { useAppStore } from '../stores/useAppStore';

interface QuestionsBankProps {
  missaoAtiva?: string;
  editais?: EditalMateria[];
  initialTab?: 'gerador' | 'cadastro';
}


const QuestionsBank: React.FC<QuestionsBankProps> = ({ missaoAtiva: missaoAtivaProps, editais: editaisProps, initialTab = 'gerador' }) => {
  const { userId } = useSession();
  const { editais: editaisQuery } = useEditais(userId);
  const missaoAtivaStore = useAppStore(state => state.missaoAtiva);
  const editais = editaisProps ?? editaisQuery;
  const missaoAtiva = missaoAtivaProps ?? missaoAtivaStore;
  const [questions, setQuestions] = useState<GlobalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [activeBankTab, setActiveBankTab] = useState<'gerador' | 'cadastro'>(initialTab);

  useEffect(() => {
    setActiveBankTab(initialTab);
  }, [initialTab]);

  // Filtros Avançados
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMateria, setFilterMateria] = useState<string>('Todas');
  const [filterAssunto, setFilterAssunto] = useState<string>('Todos');
  const [filterBanca, setFilterBanca] = useState<string>('Todas');
  const [filterAno, setFilterAno] = useState<string>('Todos');
  const [filterOrgao, setFilterOrgao] = useState<string>('Todos');
  const [filterCargo, setFilterCargo] = useState<string>('Todos');
  const [filterPodcast, setFilterPodcast] = useState<string>('Todos');
  const [showFilters, setShowFilters] = useState(false);

  // Podcast States
  const [podcastCache, setPodcastCache] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastStatus, setPodcastStatus] = useState("");

  // Form States
  const initialFormState = {
    data: getLocalToday(),
    materia: '',
    assunto: '',
    banca: '',
    ano: new Date().getFullYear(),
    orgao: '',
    cargo: '',
    enunciado: '',
    resposta: '',
    anotacoes: '',
    tags: '',
    tipo: 'Multipla Escolha' as Question['tipo'],
    alternativas: [] as Question['alternativas'],
    tec_id: '',
    gabarito_oficial: '' as string,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [smartPasteText, setSmartPasteText] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'study'>('study');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [selectedAI, setSelectedAI] = useState<AIProviderName | 'auto'>('auto');
  const [aiStreamText, setAiStreamText] = useState<string>("");
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [mnemonicText, setMnemonicText] = useState<string>("");
  const [mnemonicLoading, setMnemonicLoading] = useState(false);
  const [extraFormat, setExtraFormat] = useState<'mapa' | 'fluxo' | 'tabela' | 'info' | null>(null);
  const [extraContent, setExtraContent] = useState<string>('');
  const [extraLoading, setExtraLoading] = useState<boolean>(false);
  const [isPlayingNeural, setIsPlayingNeural] = useState(false);
  const [stopNeural, setStopNeural] = useState<(() => void) | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeAiTool, setActiveAiTool] = useState<'explanation' | 'mnemonic' | 'mapa' | 'fluxo' | 'tabela' | 'info'>('explanation');
  const [geminiKeyAvailable, setGeminiKeyAvailable] = useState(false);
  const [groqKeyAvailable, setGroqKeyAvailable] = useState(false);
  const lastQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    setGeminiKeyAvailable(!!getGeminiKey());
    setGroqKeyAvailable(!!getGroqKey());
  }, []);

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error } = await supabase.storage
        .from('questions')
        .upload(filePath, file);

      if (error) {
        if (error.message.includes('bucket not found')) {
          alert('Bucket "questions" não encontrado. Crie o bucket no Supabase Storage primeiro.');
        }
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('questions')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const syncPodcastCache = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.storage.from('audio-revisions').list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
      if (error) { logger.error('DATA', "Erro ao listar áudios:", error); return; }
      if (data) {
        const podcastIds = new Set<string>();
        let count = 0;
        data.forEach((file: any) => {
          if (file.name && file.name.endsWith('_podcast.wav')) {
            const id = file.name.replace('_podcast.wav', '');
            podcastIds.add(id);
            count++;
          }
        });
        logger.info('DATA', `✅ Sincronização: ${count} podcasts identificados no servidor.`);
        setPodcastCache(podcastIds);
      }
    } catch (e) { logger.error('DATA', "Erro exceção sync podcast:", e); } finally { setIsSyncing(false); }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUser(user);

    try {
      const isAdmin = await profilesQueries.isAdmin(user.id);
      if (user.email === 'fernandobritosc@gmail.com' || isAdmin) setIsAdmin(true);
    } catch (e) { }

    try {
      const data = await questionsQueries.getAll();
      setQuestions(data || []);
    } catch (error) {
      logger.error('DATA', 'Erro ao buscar questões:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
    syncPodcastCache();
  }, [missaoAtiva]);

  const reviewQueue = useMemo(() => {
    let filtered = questions;
    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.materia.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterMateria !== 'Todas') filtered = filtered.filter(q => q.materia === filterMateria);
    if (filterAssunto !== 'Todos') filtered = filtered.filter(q => q.assunto === filterAssunto);
    if (filterBanca !== 'Todas') filtered = filtered.filter(q => q.banca === filterBanca);
    if (filterAno !== 'Todos') filtered = filtered.filter(q => q.ano === Number(filterAno));
    if (filterOrgao !== 'Todos') filtered = filtered.filter(q => q.orgao === filterOrgao);
    if (filterCargo !== 'Todos') filtered = filtered.filter(q => q.cargo === filterCargo);

    if (filterPodcast === 'Com Podcast') {
      filtered = filtered.filter(q => podcastCache.has(q.original_audio_id || q.id));
    } else if (filterPodcast === 'Sem Podcast') {
      filtered = filtered.filter(q => !podcastCache.has(q.original_audio_id || q.id));
    }

    return [...filtered].sort((a, b) => (Number(b.relevancia) || 0) - (Number(a.relevancia) || 0));
  }, [questions, searchTerm, filterMateria, filterAssunto, filterBanca, filterAno, filterOrgao, filterCargo, filterPodcast, podcastCache]);

  const currentQuestion = viewMode === 'study' ? reviewQueue[currentQuestionIndex] : null;

  useEffect(() => {
    if (currentQuestion?.id !== lastQuestionIdRef.current) {
      // Load cached AI assets from DB
      const cached = currentQuestion?.ai_generated_assets;
      setAiStreamText(cached?.explanation || "");
      setMnemonicText(cached?.mnemonic || "");
      setExtraContent("");
      setAiLoading(false);
      setMnemonicLoading(false);
      setExtraLoading(false);
      setExtraFormat(null);
      setFollowUpQuery("");
      setActiveAiTool('explanation');
      if (stopNeural) stopNeural();
      setIsPlayingNeural(false);
      lastQuestionIdRef.current = currentQuestion?.id || null;
    }
  }, [currentQuestion?.id]);

  // Accumulator ref to capture full stream text for saving
  const streamAccRef = useRef<string>("");

  const saveAiAsset = async (questionId: string, assetType: string, content: string) => {
    try {
      const q = questions.find(item => item.id === questionId);
      if (!q) return;

      const updatedAssets = {
        ...(q.ai_generated_assets || {}),
        [assetType]: content
      };

      await questionsQueries.update(questionId, { ai_generated_assets: updatedAssets });

      setQuestions(prev => prev.map(item => item.id === questionId ? { ...item, ai_generated_assets: updatedAssets } : item));
    } catch (err: any) {
      logger.error('DATA', "Erro ao salvar asset da IA:", err);
    }
  };

  const generateAIExplanation = async (question: GlobalQuestion) => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiStreamText("");
    streamAccRef.current = "";
    setActiveAiTool('explanation');

    const prompt = `Analise a seguinte questão de concurso e forneça uma explicação detalhada, comentando cada alternativa e explicando por que a correta é a correta.
                                Banca: ${question.banca || 'N/A'}
                                Órgão: ${question.orgao || 'N/A'}
                                Ano: ${question.ano || 'N/A'}
                                Enunciado: ${question.enunciado}
                                Alternativas: ${JSON.stringify(question.alternativas)}`;

    try {
      await streamAIContent(
        prompt,
        {
          onChunk: (chunk) => {
            streamAccRef.current += chunk;
            setAiStreamText(prev => prev + chunk);
          },
          onComplete: async () => {
            setAiLoading(false);
            // Auto-save completed explanation to DB cache
            if (streamAccRef.current) {
              await saveAiAsset(question.id, 'explanation', streamAccRef.current);
            }
          },
          onError: (err) => {
            console.error(err);
            setAiLoading(false);
          }
        },
        getGeminiKey(),
        getGroqKey(),
        selectedAI === 'auto' ? undefined : selectedAI
      );
    } catch (err) {
      setAiLoading(false);
    }
  };

  const handleGenerateMnemonic = async (question: GlobalQuestion) => {
    if (mnemonicLoading) return;
    setMnemonicLoading(true);
    setActiveAiTool('mnemonic');

    const prompt = `Crie um mnemônico ou uma rima curta e infalível para ajudar a memorizar o conceito principal desta questão:\n\n${question.enunciado}`;

    try {
      const content = await generateAIContent(
        prompt,
        getGeminiKey(),
        getGroqKey(),
        selectedAI === 'auto' ? undefined : selectedAI,
        'flashcard'
      );
      setMnemonicText(content);
      await saveAiAsset(question.id, 'mnemonic', content);
    } catch (err) {
      logger.error('AI', 'Erro generate mnemonic:', err);
    } finally {
      setMnemonicLoading(false);
    }
  };

  const handleGenerateExtraFormat = async (question: GlobalQuestion, format: 'mapa' | 'fluxo' | 'tabela' | 'info') => {
    if (extraLoading) return;
    setExtraLoading(true);
    setExtraFormat(format);
    setActiveAiTool(format);

    try {
      const content = await generateAIContent(
        question.enunciado || '',
        getGeminiKey(),
        getGroqKey(),
        selectedAI === 'auto' ? undefined : selectedAI,
        format
      );
      setExtraContent(content);
      await saveAiAsset(question.id, format, content);
    } catch (err) {
      logger.error('AI', 'Erro generate extra format:', err);
    } finally {
      setExtraLoading(false);
    }
  };

  const handleSendFollowUp = async (question: GlobalQuestion) => {
    if (!followUpQuery.trim() || aiLoading) return;
    const query = followUpQuery;
    setFollowUpQuery("");
    setAiLoading(true);
    setAiStreamText(prev => prev + `\n\n--- \n**Pergunta:** ${query}\n\n`);

    try {
      await streamAIContent(
        `Com base na questão anterior, responda à seguinte dúvida: ${query}`,
        {
          onChunk: (chunk) => setAiStreamText(prev => prev + chunk),
          onComplete: () => setAiLoading(false),
          onError: (err) => {
            logger.error('AI', 'Erro stream AI content:', err);
            setAiLoading(false);
          }
        },
        getGeminiKey(),
        getGroqKey(),
        selectedAI === 'auto' ? undefined : selectedAI
      );
    } catch (err) {
      setAiLoading(false);
    }
  };

  const handlePlayNeural = async (question: GlobalQuestion, text: string) => {
    if (isPlayingNeural && stopNeural) {
      stopNeural();
      setIsPlayingNeural(false);
      return;
    }

    const stop = await handlePlayRevisionAudio(
      text,
      question.id,
      getGeminiKey() || '',
      () => setIsPlayingNeural(true),
      () => setIsPlayingNeural(false),
      () => setIsPlayingNeural(false)
    );
    setStopNeural(() => stop);
  };

  const handlePodcastDuo = async (question: GlobalQuestion) => {
    if (isGeneratingPodcast) return;
    const audioIdToUse = question.original_audio_id || question.id;
    setIsGeneratingPodcast(true);

    const stop = await generatePodcastAudio(
      aiStreamText || question.enunciado || '',
      audioIdToUse,
      getGeminiKey() || '',
      setPodcastStatus,
      () => {
        setIsGeneratingPodcast(false);
        setIsPlayingNeural(true);
        setPodcastCache(prev => new Set(prev).add(audioIdToUse));
      },
      () => setIsPlayingNeural(false),
      () => {
        setIsGeneratingPodcast(false);
        setIsPlayingNeural(false);
      }
    );
    setStopNeural(() => stop);
  };

  const handleExportLabPDF = async (questionId: string) => {
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const element = document.getElementById('neural-content-box');
      const viewport = element?.querySelector('.neural-content-viewport') as HTMLElement;

      if (!element || !viewport) {
        alert("Erro: Conteúdo do Laboratório não encontrado.");
        return;
      }

      // Map tool names to Portuguese
      const toolLabels: Record<string, string> = {
        'explanation': 'EXPLICAÇÃO DETALHADA',
        'mnemonic': 'MNEMÔNICO & MEMORIZAÇÃO',
        'map': 'MAPA MENTAL ESTRUTURADO',
        'table': 'TABELA COMPARATIVA TÉCNICA',
        'info': 'INFOGRÁFICO RESUMIDO',
        'fluxo': 'FLUXOGRAMA DE PROCESSOS'
      };

      // Find question info for the header
      const question = questions.find(q => q.id === questionId);
      const subject = question?.assunto || 'Assunto Geral';

      // Preparação para captura total
      const originalMaxHeight = viewport.style.maxHeight;
      const originalOverflow = viewport.style.overflowY;

      viewport.style.maxHeight = 'none';
      viewport.style.overflowY = 'visible';

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        logging: false,
        useCORS: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('neural-content-box');
          if (clonedElement) {
            // Force core container to be invisible/paper-white
            clonedElement.style.backgroundColor = 'transparent';
            clonedElement.style.color = '#000000';
            clonedElement.style.border = 'none';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.padding = '0';

            // Hard exclusion of UI artifacts
            const toHide = clonedElement.querySelectorAll('.pdf-exclude, button, .lucide');
            toHide.forEach((el: any) => el.style.display = 'none');

            // Force EVERY descendant to high-contrast black and transparent background
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el: any) => {
              const style = (el as HTMLElement).style;
              style.color = '#000000';
              style.backgroundColor = 'transparent';
              style.borderColor = '#000000';
              style.boxShadow = 'none';
              style.textShadow = 'none';
              style.transition = 'none';
              style.animation = 'none';

              // Remove gradient text effects
              if (style.webkitBackgroundClip === 'text' || style.backgroundClip === 'text') {
                style.webkitBackgroundClip = 'initial';
                style.backgroundClip = 'initial';
                style.backgroundImage = 'none';
              }
            });

            // Ensure the viewport is fully expanded and clean
            const viewportClone = clonedElement.querySelector('.neural-content-viewport') as HTMLElement;
            if (viewportClone) {
              viewportClone.style.maxHeight = 'none';
              viewportClone.style.overflow = 'visible';
              viewportClone.style.padding = '0';
              viewportClone.style.margin = '0';
            }
          }
        }
      });

      viewport.style.maxHeight = originalMaxHeight;
      viewport.style.overflowY = originalOverflow;

      // SIZE OPTIMIZATION: JPEG with 0.7 quality instead of PNG
      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      const { jsPDF } = await import('jspdf');

      const pdfWidth = 595.28;
      const pdfHeight = 841.89;
      const margin = 40;
      const headerHeight = 70;
      const footerHeight = 30;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeightPerPage = pdfHeight - (margin * 2) - headerHeight - footerHeight;

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // COMPRESSION: Use internal jsPDF compression
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      const drawHeader = (pNum: number) => {
        // Professional background
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pdfWidth, headerHeight + 10, 'F');

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(1);
        doc.line(margin, headerHeight + 5, pdfWidth - margin, headerHeight + 5);

        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFont("helvetica", "bold");
        doc.text((missaoAtiva || "MONITOR PRO").toUpperCase(), margin, 25);

        doc.setFontSize(10);
        doc.setTextColor(147, 51, 234); // purple-600
        const toolLabel = `LAB NEURAL: ${toolLabels[activeAiTool] || activeAiTool.toUpperCase()}`;
        doc.text(toolLabel, margin, 42);

        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(subject.toUpperCase(), margin, 58);

        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`PÁGINA ${pNum}`, pdfWidth - margin - 45, 25);
      };

      const drawFooter = () => {
        doc.setFontSize(6);
        doc.setTextColor(203, 213, 225);
        doc.text("GERADO AUTOMATICAMENTE POR MONITOR PRO AI - ALTA PERFORMANCE", pdfWidth / 2, pdfHeight - 15, { align: "center" });
      };

      let heightLeft = imgHeight;
      let pNum = 1;

      // Page 1
      drawHeader(pNum);
      drawFooter();
      doc.addImage(imgData, 'JPEG', margin, margin + headerHeight, imgWidth, imgHeight, undefined, 'FAST');

      heightLeft -= contentHeightPerPage;

      while (heightLeft > 0) {
        doc.addPage();
        pNum++;

        // Exact position with 1px overlap to prevent blank lines
        const sliceY = margin + headerHeight - (pNum - 1) * contentHeightPerPage;

        doc.addImage(imgData, 'JPEG', margin, sliceY, imgWidth, imgHeight, undefined, 'FAST');

        // Redraw Header & White box to cover bleed
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pdfWidth, margin + headerHeight, 'F');
        drawHeader(pNum);

        // Redraw Footer & White box to cover bleed
        doc.setFillColor(255, 255, 255);
        doc.rect(0, pdfHeight - margin - footerHeight, pdfWidth, margin + footerHeight, 'F');
        drawFooter();

        heightLeft -= contentHeightPerPage;
      }

      const fileName = `Laboratorio_Neural_${activeAiTool}_${questionId.substring(0, 5)}.pdf`;
      doc.save(fileName);
    } catch (err: any) {
      console.error("Erro ao exportar PDF:", err);
      alert("Erro ao exportar PDF: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  const getActiveProviderName = () => {
    if (selectedAI !== 'auto') return selectedAI.toUpperCase();
    const gemini = getGeminiKey();
    if (gemini && gemini.length > 10) return 'GEMINI 2.0';
    return 'GROQ';
  };

  const savedMaterias = useMemo(() => Array.from(new Set(questions.map(q => q.materia).filter(Boolean))).sort(), [questions]);
  const savedAssuntosGerais = useMemo(() => Array.from(new Set(questions.map(q => q.assunto))).sort(), [questions]);
  const savedBancas = useMemo(() => Array.from(new Set(questions.map(q => q.banca || '').filter(Boolean))).sort(), [questions]);
  const savedAnos = useMemo(() => Array.from(new Set(questions.map(q => q.ano || 0).filter(Boolean))).sort((a, b) => b - a), [questions]);
  const savedOrgaos = useMemo(() => Array.from(new Set(questions.map(q => q.orgao || '').filter(Boolean))).sort(), [questions]);
  const savedCargos = useMemo(() => Array.from(new Set(questions.map(q => q.cargo || '').filter(Boolean))).sort(), [questions]);

  // Assuntos filtrados pela matéria selecionada no form — sempre do banco, nunca do edital
  const topicosSugeridos = useMemo(() => {
    const selectedMateria = formData.materia?.trim().toLowerCase();
    if (!selectedMateria) return savedAssuntosGerais;
    // Filtra assuntos do banco que correspondem à matéria selecionada (case-insensitive)
    const fromDB = Array.from(new Set(
      questions
        .filter(q => q.materia?.trim().toLowerCase() === selectedMateria)
        .map(q => q.assunto)
        .filter(Boolean)
    )).sort();
    return fromDB.length > 0 ? fromDB : savedAssuntosGerais;
  }, [formData.materia, questions, savedAssuntosGerais]);

  const handleEdit = (q: GlobalQuestion) => {
    const correctIndex = q.alternativas?.findIndex(a => a.is_correct);
    const letter = (correctIndex !== undefined && correctIndex !== -1) ? String.fromCharCode(65 + correctIndex) : '';

    setIsEditing(q.id);
    setActiveBankTab('cadastro');
    setFormData({
      ...initialFormState,
      ...q,
      alternativas: q.alternativas || [],
      tags: Array.isArray(q.tags) ? q.tags.join(', ') : '',
      gabarito_oficial: letter,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(null);
    setFormData(initialFormState);
  };

  const logAttempt = async (question: GlobalQuestion, selectedAltId: string | null, tempo?: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { logger.warn('AI', '[logAttempt] No user session'); return; }
      const isCorrect = question.alternativas?.find(a => a.id === selectedAltId)?.is_correct || false;
      logger.info('DATA', `[logAttempt] Saving attempt: ${question.id}, ${selectedAltId}, ${isCorrect}, ${tempo}`);

      const payload: any = {
        user_id: user.id,
        question_id: question.id,
        selected_alt: selectedAltId || 'N/A',
        is_correct: isCorrect,
        materia: question.materia,
        assunto: question.assunto,
        banca: question.banca,
        tempo_resposta: tempo ?? null
      };

      const { error } = await questionsQueries.insertAttempt(payload);

      if (error) {
        logger.warn('DATA', `[logAttempt] Insert error (tentando sem tempo_resposta): ${error.message}`);
        const { error: error2 } = await questionsQueries.insertAttemptWithoutTime(payload);
        if (error2) logger.error('DATA', `[logAttempt] Falha definitiva no insert: ${error2.message}`);
        else logger.info('DATA', '[logAttempt] Saved (sem tempo_resposta)');
      } else {
        logger.info('DATA', '[logAttempt] Saved OK');
      }
    } catch (e) {
      logger.error('DATA', '[logAttempt] Exceção:', e);
    }
  };

  const handleSaveForm = async (updatedFormData: any) => {
    if (!isAdmin) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = { ...updatedFormData, tags: updatedFormData.tags.split(',').map((t: string) => t.trim()).filter(Boolean), created_by: user.id };
    delete (payload as any).gabarito_oficial;

    try {
      await questionsQueries.upsert(payload, isEditing || undefined);
      handleCancel(); fetchQuestions();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !confirm("Excluir questão?")) return;
    try {
      await questionsQueries.delete(id);
      fetchQuestions();
    } catch (error: any) {
      logger.error('DATA', 'Erro ao excluir questão', error);
      alert('Erro ao excluir questão');
    }
  };

  const toggleCard = (id: string) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      {/* Minimalist Lab Header (Generator Only) */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-glow">
          <div className="w-3.5 h-3.5 rounded bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-[hsl(var(--bg-main))] shadow-inner">
            <Brain size={7} />
          </div>
          <p className="text-[7px] font-black uppercase text-white/70 tracking-widest leading-none">Lab Neural</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-0.5 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-[5.5px] font-bold text-slate-500 uppercase tracking-widest">Banco Sincronizado</span>
        </div>
      </div>

      {activeBankTab === 'gerador' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Barra de Busca & Filtros Compacta */}
          <QuestionsFilter
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            showFilters={showFilters} setShowFilters={setShowFilters}
            isSyncing={isSyncing} syncPodcastCache={syncPodcastCache}
            filterMateria={filterMateria} setFilterMateria={setFilterMateria} savedMaterias={savedMaterias}
            filterAssunto={filterAssunto} setFilterAssunto={setFilterAssunto} savedAssuntosGerais={savedAssuntosGerais}
            filterBanca={filterBanca} setFilterBanca={setFilterBanca} savedBancas={savedBancas}
            filterOrgao={filterOrgao} setFilterOrgao={setFilterOrgao} savedOrgaos={savedOrgaos}
            filterCargo={filterCargo} setFilterCargo={setFilterCargo} savedCargos={savedCargos}
            filterAno={filterAno} setFilterAno={setFilterAno} savedAnos={savedAnos}
            filterPodcast={filterPodcast} setFilterPodcast={setFilterPodcast}
          />

          {/* Listagem Control Headers */}
          <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="text-[7px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
              <Brain size={9} className="text-[hsl(var(--accent))]" />
              {viewMode === 'study' ? `Foco (${currentQuestionIndex + 1}/${reviewQueue.length})` : `Resultados (${reviewQueue.length})`}
            </h3>
            <div className="flex gap-0.5 p-0.5 bg-white/5 border border-white/10 rounded-md">
              <button
                onClick={() => {
                  setViewMode('study');
                  setCurrentQuestionIndex(0);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[6.5px] font-black uppercase tracking-widest transition-all ${viewMode === 'study' ? 'bg-[hsl(var(--accent))] text-black' : 'text-slate-500 hover:text-white'}`}
              >
                <Brain size={8} /> Estudo
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[6.5px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-[hsl(var(--accent))] text-black' : 'text-slate-500 hover:text-white'}`}
              >
                <Layers size={8} /> Lista
              </button>
            </div>
          </div>

          {/* Listagem or Study Mode */}
          {viewMode === 'list' ? (
            <div className="space-y-4">
              {loading ? (
                <p className="text-center py-10 text-[10px] uppercase font-black tracking-widest animate-pulse">Carregando...</p>
              ) : reviewQueue.map(q => (
                <QuestionCard
                  key={q.id} q={q} isExpanded={!!expandedCards[q.id]} isAdmin={isAdmin}
                  onToggle={toggleCard} onDelete={handleDelete} onSolve={logAttempt}
                  onEdit={handleEdit}
                  selectedAI={selectedAI}
                  setSelectedAI={setSelectedAI}
                  aiStreamText={aiStreamText}
                  aiLoading={aiLoading}
                  mnemonicText={mnemonicText}
                  mnemonicLoading={mnemonicLoading}
                  extraContent={extraContent}
                  extraLoading={extraLoading}
                  activeAiTool={activeAiTool}
                  setActiveAiTool={setActiveAiTool}
                  onGenerateExplanation={generateAIExplanation}
                  onGenerateMnemonic={handleGenerateMnemonic}
                  onGenerateExtra={handleGenerateExtraFormat}
                  onSendFollowUp={handleSendFollowUp}
                  followUpQuery={followUpQuery}
                  setFollowUpQuery={setFollowUpQuery}
                  isPlayingNeural={isPlayingNeural}
                  onPlayAudio={handlePlayNeural}
                  onPlayPodcast={handlePodcastDuo}
                  handleExportLabPDF={handleExportLabPDF}
                  isGeneratingPodcast={isGeneratingPodcast}
                  podcastStatus={podcastStatus}
                  podcastCache={podcastCache}
                />
              ))}
              {!loading && reviewQueue.length === 0 && (
                <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-xl">
                  <AlertOctagon size={24} className="mx-auto text-slate-700 mb-2" />
                  <p className="text-slate-600 font-black uppercase text-[8px] tracking-widest">Nenhuma questão encontrada</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {reviewQueue.length > 0 ? (
                <div className="space-y-3 animate-in zoom-in-95 duration-500">
                  {/* Progress Bar Extreme */}
                  <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                      style={{ width: `${((currentQuestionIndex + 1) / reviewQueue.length) * 100}%` }}
                    />
                  </div>

                  <QuestionCard
                    key={reviewQueue[currentQuestionIndex].id}
                    q={reviewQueue[currentQuestionIndex]}
                    isExpanded={true}
                    isAdmin={isAdmin}
                    onToggle={() => { }}
                    onDelete={handleDelete}
                    onSolve={logAttempt}
                    onEdit={handleEdit}
                    selectedAI={selectedAI}
                    setSelectedAI={setSelectedAI}
                    aiStreamText={aiStreamText}
                    aiLoading={aiLoading}
                    mnemonicText={mnemonicText}
                    mnemonicLoading={mnemonicLoading}
                    extraContent={extraContent}
                    extraLoading={extraLoading}
                    activeAiTool={activeAiTool}
                    setActiveAiTool={setActiveAiTool}
                    onGenerateExplanation={generateAIExplanation}
                    onGenerateMnemonic={handleGenerateMnemonic}
                    onGenerateExtra={handleGenerateExtraFormat}
                    onSendFollowUp={handleSendFollowUp}
                    followUpQuery={followUpQuery}
                    setFollowUpQuery={setFollowUpQuery}
                    isPlayingNeural={isPlayingNeural}
                    onPlayAudio={handlePlayNeural}
                    onPlayPodcast={handlePodcastDuo}
                    handleExportLabPDF={handleExportLabPDF}
                    isGeneratingPodcast={isGeneratingPodcast}
                    podcastStatus={podcastStatus}
                    podcastCache={podcastCache}
                  />

                  {/* Navigation Controls Ultra-Compact */}
                  <div className="glass p-1.5 rounded-xl border border-[hsl(var(--accent)/0.1)] flex justify-between items-center shadow-lg">
                    <button
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                      className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-10"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                      {currentQuestionIndex + 1} / {reviewQueue.length}
                    </span>

                    <button
                      disabled={currentQuestionIndex === reviewQueue.length - 1}
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[hsl(var(--accent))] text-black rounded-lg font-black uppercase text-[8px] tracking-widest transition-all hover:scale-105 active:scale-95"
                    >
                      Próxima <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-xl">
                  <AlertOctagon size={24} className="mx-auto text-slate-700 mb-2" />
                  <p className="text-slate-600 font-black uppercase text-[8px] tracking-widest">Filtre as questões para iniciar o estudo</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeBankTab === 'cadastro' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          {!(showForm || isEditing) ? (
            <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[hsl(var(--accent)/0.1)] flex items-center justify-center text-[hsl(var(--accent))] animate-pulse">
                <PlusCircle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-widest">Gestão do Banco</h3>
                <p className="text-slate-600 font-bold text-[7px] uppercase tracking-widest mt-1">Clique para novo registro</p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-6 py-2 bg-[hsl(var(--accent))] text-black rounded-lg font-black uppercase text-[8px] tracking-widest transition-all hover:scale-105 shadow-lg active:scale-95 shadow-cyan-500/10"
              >
                <Plus size={14} /> Nova Questão
              </button>
            </div>
          ) : (
            <QuestionForm
              initialData={formData}
              isEditing={!!isEditing}
              onSave={handleSaveForm}
              onCancel={handleCancel}
              savedMaterias={savedMaterias}
              topicosSugeridos={topicosSugeridos}
              savedBancas={savedBancas}
              savedAnos={savedAnos}
              savedOrgaos={savedOrgaos}
              savedCargos={savedCargos}
              handleImageUpload={handleImageUpload}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionsBank;
