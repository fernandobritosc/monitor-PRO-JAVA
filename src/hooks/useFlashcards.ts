import { useState, useEffect, useMemo, useCallback, type MouseEvent } from 'react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { flashcardsQueries } from '../services/queries';
import { AIProviderName, deleteCachedAudio } from '../services/aiService';
import { EditalMateria, Flashcard, CommunityDeck } from '../types';
import { getErrorMessage } from '../utils/error';
import { normalizeText } from '../utils/text';
import { findDuplicate as findDuplicateCard } from '../utils/flashcards';
import { useAIFlashcards } from './useAIFlashcards';
import { useAudioFlashcards } from './useAudioFlashcards';
import { useFlashcardsStudy } from './useFlashcardsStudy';
import { logger } from '../utils/logger';

interface FlashcardsProps {
  missaoAtiva: string;
  editais: EditalMateria[];
}

export const useFlashcards = ({ missaoAtiva, editais }: FlashcardsProps) => {
  const [activeTab, setActiveTab] = useState<'study' | 'manage' | 'community'>('study');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [communityDecks, setCommunityDecks] = useState<CommunityDeck[]>([]);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [previewDeck, setPreviewDeck] = useState<CommunityDeck | null>(null);
  const [importingState, setImportingState] = useState<{ loading: boolean, text: string }>({ loading: false, text: '' });
  const [selectedAI, setSelectedAI] = useState<AIProviderName | 'auto'>('auto');
  const [filterMateria, setFilterMateria] = useState<string>('Todas');
  const [filterAssunto, setFilterAssunto] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterPodcast, setFilterPodcast] = useState<string>('Todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({ front: '', back: '', materia: '', assunto: '' });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [duplicateWarningId, setDuplicateWarningId] = useState<string | null>(null);
  const [similarityThreshold] = useState(0.8);
  const [geminiKeyAvailable, setGeminiKeyAvailable] = useState(false);
  const [groqKeyAvailable, setGroqKeyAvailable] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [podcastCache, setPodcastCache] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setGeminiKeyAvailable(!!getGeminiKey());
    setGroqKeyAvailable(!!getGroqKey());
  }, []);

  const syncPodcastCache = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.storage.from('audio-revisions').list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
      if (error) { logger.error('AUDIO', "Erro ao listar áudios:", error); return; }
      if (data) {
        const podcastIds = new Set<string>();
        let count = 0;
        data.forEach((file) => {
          if (file.name && file.name.endsWith('_podcast.wav')) {
            const id = file.name.replace('_podcast.wav', '');
            podcastIds.add(id);
            count++;
          }
        });
        logger.log(`✅ Sincronização: ${count} podcasts identificados no servidor.`);
        setPodcastCache(podcastIds);
      }
    } catch (e) { 
      logger.error('AUDIO', "Erro exceção sync podcast:", getErrorMessage(e)); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const materias = useMemo(() => {
    const m = new Set<string>();
    m.add('Todas');
    editais.forEach(e => { if (e.concurso === missaoAtiva) m.add(e.materia); });
    cards.forEach(c => m.add(c.materia));
    const list = Array.from(m).filter(x => x !== 'Todas').sort();
    return ['Todas', ...list];
  }, [editais, missaoAtiva, cards]);

  const assuntoOptions = useMemo(() => {
    const topics = new Set<string>();
    let sourceCards = cards;
    if (filterMateria !== 'Todas') {
      sourceCards = cards.filter(c => c.materia === filterMateria);
    }
    sourceCards.forEach(card => {
      if (card.assunto) topics.add(card.assunto);
    });
    return ['Todos', ...Array.from(topics).sort()];
  }, [cards, filterMateria]);

  const statusOptions = useMemo(() => ['Todos', 'novo', 'aprendendo', 'revisando', 'aprendido', 'revisar', 'pendente'], []);

  const availableTopics = useMemo(() => {
    if (!newCard.materia || newCard.materia === 'Todas') return [];
    const edital = editais.find(e => e.concurso === missaoAtiva && e.materia === newCard.materia);
    return edital ? [...edital.topicos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })) : [];
  }, [editais, missaoAtiva, newCard.materia]);

  const userCardSignatures = useMemo(() => {
    const signatures = new Set<string>();
    cards.forEach(c => signatures.add(`${normalizeText(c.materia)}||${normalizeText(c.front)}`));
    return signatures;
  }, [cards]);

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");
      const data = await flashcardsQueries.getByUser(user.id);
      setCards(data as Flashcard[]);
    } catch (error) { 
      logger.error('DATA', 'Erro ao carregar flashcards:', getErrorMessage(error)); 
    } finally { 
      setLoading(false); 
    }
  };

  const loadCommunityDecks = async () => {
    setLoadingCommunity(true);
    try {
      const data = await flashcardsQueries.getCommunityCards();
      const decksMap = new Map<string, CommunityDeck>();
      data.forEach((card) => {
        if (!decksMap.has(card.materia)) {
          decksMap.set(card.materia, { materia: card.materia, count: 0, cards: [] });
        }
        const deck = decksMap.get(card.materia)!;
        deck.count++;
        deck.cards.push(card);
      });
      const validDecks = Array.from(decksMap.values()).filter(d => d.count > 0);
      setCommunityDecks(validDecks);
    } catch (error) { 
      logger.error('DATA', 'Erro ao carregar decks:', getErrorMessage(error)); 
    } finally { 
      setLoadingCommunity(false); 
    }
  };

  const filteredCards = useMemo(() => {
    let filtered = [...cards];
    if (filterMateria !== 'Todas') {
      const normalizedFilter = normalizeText(filterMateria);
      filtered = filtered.filter(card => normalizeText(card.materia) === normalizedFilter);
    }
    if (filterAssunto !== 'Todos') filtered = filtered.filter(card => card.assunto === filterAssunto);
    if (filterStatus !== 'Todos') filtered = filtered.filter(card => card.status === filterStatus);
    if (filterPodcast === 'Com Podcast') { filtered = filtered.filter(card => podcastCache.has(card.original_audio_id || card.id)); }
    else if (filterPodcast === 'Sem Podcast') { filtered = filtered.filter(card => !podcastCache.has(card.original_audio_id || card.id)); }
    return filtered;
  }, [cards, filterMateria, filterAssunto, filterStatus, filterPodcast, podcastCache]);

  const {
    studyQueue, setStudyQueue,
    currentCardIndex, setCurrentCardIndex,
    isFlipped, setIsFlipped,
    sessionStats, showSessionSummary,
    currentCard,
    startStudySession, endSession, handleCardResult,
  } = useFlashcardsStudy({ filteredCards, onCardResult: loadFlashcards });

  const {
    aiStreamText,
    aiLoading,
    mnemonicText,
    mnemonicLoading,
    extraFormat,
    extraContent,
    extraLoading,
    followUpQuery, setFollowUpQuery,
    activeAiTool, setActiveAiTool,
    generateAIExplanation,
    handleGenerateMnemonic,
    handleGenerateExtraFormat,
    handleSendFollowUp,
  } = useAIFlashcards({ currentCard, studyQueue, currentCardIndex, setStudyQueue, selectedAI });

  const {
    isSpeaking,
    isPlayingNeural,
    stopNeural,
    isGeneratingPodcast,
    podcastStatus,
    handleSpeak,
    handlePlayNeural,
    handlePodcastDuo,
  } = useAudioFlashcards({ currentCard, aiStreamText, currentCardIndex, activeTab, onPodcastGenerated: (audioId) => setPodcastCache(prev => new Set(prev).add(audioId)) });

  const importCards = async (cardsToImport: Partial<Flashcard>[], type: 'deck' | 'topic' | 'single') => {
    setImportingState({ loading: true, text: type === 'single' ? '' : 'Importando...' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const userName = user.email?.split('@')[0] || 'Eu';
      const payload = cardsToImport.map(c => ({
        user_id: user.id,
        concurso: missaoAtiva,
        materia: c.materia || 'Geral',
        assunto: c.assunto || '',
        front: c.front || '',
        back: c.back || '',
        ai_generated_assets: c.ai_generated_assets || undefined,
        original_audio_id: c.original_audio_id || c.id,
        author_name: userName,
        status: 'novo' as Flashcard['status']
      }));
      const uniquePayload = payload.filter(p => !userCardSignatures.has(`${normalizeText(p.materia)}||${normalizeText(p.front)}`));
      const skippedCount = payload.length - uniquePayload.length;
      if (uniquePayload.length === 0) {
        alert('Todos os cards selecionados já existem no seu inventário.');
        return;
      }
      await flashcardsQueries.upsert(uniquePayload);
      const newLocalCards = uniquePayload.map((p, idx) => ({ ...p, id: `temp-${Date.now()}-${idx}`, created_at: new Date().toISOString() })) as Flashcard[];
      setCards(prev => [...prev, ...newLocalCards]);
      if (previewDeck) {
        const importedIds = new Set(cardsToImport.map(c => c.id));
        const remainingCards = previewDeck.cards.filter((c) => !importedIds.has(c.id));
        if (remainingCards.length === 0) { 
          setPreviewDeck(null); 
          setCommunityDecks(prev => prev.filter(d => d.materia !== previewDeck.materia)); 
        } else { 
          setPreviewDeck({ ...previewDeck, cards: remainingCards, count: remainingCards.length }); 
        }
      }
      if (type !== 'single') {
        alert(`${uniquePayload.length} cards importados.${skippedCount > 0 ? ` (${skippedCount} já existentes ignorados)` : ''}`);
      }
    } catch (error) { 
      alert('Erro ao importar: ' + getErrorMessage(error)); 
    } finally { 
      setImportingState({ loading: false, text: '' }); 
    }
  };

  const handleImportDeck = (deckOrEvent?: CommunityDeck | MouseEvent) => {
    const targetDeck = (deckOrEvent && (deckOrEvent as CommunityDeck).cards) ? (deckOrEvent as CommunityDeck) : previewDeck;
    if (!targetDeck) return;
    if (!confirm(`Deseja importar TODOS os ${targetDeck.cards.length} cards de ${targetDeck.materia}?`)) return;
    importCards(targetDeck.cards, 'deck');
  };

  const handleImportTopic = (topic: string) => {
    if (!previewDeck) return;
    const cardsInTopic = previewDeck.cards.filter((c) => c.assunto === topic);
    if (cardsInTopic.length === 0) return;
    if (!confirm(`Importar ${cardsInTopic.length} cards do tópico "${topic}"?`)) return;
    importCards(cardsInTopic, 'topic');
  };

  const handleImportSingle = (card: Flashcard) => { importCards([card], 'single'); };

  const handleEdit = (card: Flashcard) => { setNewCard({ materia: card.materia, assunto: card.assunto || '', front: card.front, back: card.back }); setEditingId(card.id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => { setNewCard({ front: '', back: '', materia: '', assunto: '' }); setEditingId(null); };
  const clearForm = () => { setNewCard({ front: '', back: '', materia: '', assunto: '' }); setSaveMessage(null); }

  const saveOrUpdateCard = async () => {
    if (!newCard.front.trim() || !newCard.back.trim() || !newCard.materia) { alert('Preencha todos os campos obrigatórios'); return; }
    const duplicate = findDuplicateCard(newCard.front, newCard.materia, cards, editingId, similarityThreshold);
    if (duplicate) {
      alert('Flashcard duplicado detectado! Verifique o card destacado abaixo.'); setDuplicateWarningId(duplicate.id);
      setTimeout(() => { const el = document.getElementById(`card-${duplicate.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
      setTimeout(() => setDuplicateWarningId(null), 3000); return;
    }
    setSaveMessage(null);
    try {
      if (editingId) {
        await flashcardsQueries.update(editingId, {
          materia: newCard.materia,
          assunto: newCard.assunto,
          front: newCard.front,
          back: newCard.back,
          ai_generated_assets: undefined,
          original_audio_id: undefined
        });
        cancelEdit();
        alert('Flashcard atualizado!');
        deleteCachedAudio(editingId);
        setPodcastCache(prev => { const n = new Set(prev); n.delete(editingId); return n; });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        const authorName = user.email?.split('@')[0] || 'Anônimo';
        await flashcardsQueries.upsert({
          user_id: user.id,
          concurso: missaoAtiva,
          materia: newCard.materia,
          assunto: newCard.assunto,
          front: newCard.front,
          back: newCard.back,
          author_name: authorName,
          status: 'novo' as Flashcard['status']
        });
        setNewCard(prev => ({ ...prev, front: '', back: '' }));
        setSaveMessage("Salvo! Campos mantidos para próximo card.");
        setTimeout(() => setSaveMessage(null), 3000);
      }
      loadFlashcards();
    } catch (error) { 
      alert('Erro: ' + getErrorMessage(error)); 
    }
  };

  const deleteCard = async (id: string) => {
    if (!confirm('Excluir este flashcard?')) return;
    try {
      await flashcardsQueries.delete(id);
      deleteCachedAudio(id);
      setPodcastCache(prev => { const n = new Set(prev); n.delete(id); return n; });
      loadFlashcards();
    } catch (error) { logger.error('DATA', getErrorMessage(error)); }
  };

  const previewTopics = useMemo(() => {
    if (!previewDeck) return [];
    const topics = new Set<string>();
    previewDeck.cards.forEach((c: Flashcard) => { if (c.assunto) topics.add(c.assunto); });
    return Array.from(topics).sort();
  }, [previewDeck]);

  const generatePDF = async () => {
    if (filteredCards.length === 0) { alert("Nenhum card para exportar com os filtros atuais."); return; }
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório de Flashcards", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Missão: ${missaoAtiva}`, 14, 32);
      doc.text(`Filtro Matéria: ${filterMateria}`, 14, 38);
      doc.text(`Filtro Assunto: ${filterAssunto}`, 14, 44);
      const tableColumn = ["ID", "Pergunta", "Resposta", "Assunto"];
      const tableRows: (string | null)[][] = [];
      filteredCards.forEach(card => {
        const cardData = [card.id.substring(0, 8), card.front, card.back, card.assunto || 'N/A'];
        tableRows.push(cardData);
      });
      (doc as unknown as { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
        head: [tableColumn], body: tableRows, startY: 50,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [75, 85, 99] },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 60 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 30 } }
      });
      const date = new Date().toLocaleDateString("pt-BR").replace(/\//g, '-');
      const fileName = `Flashcards_${filterMateria}_${filterAssunto}_${date}.pdf`;
      doc.save(fileName);
    } catch (err) { 
      alert("Erro ao gerar PDF: " + getErrorMessage(err)); 
    } finally { 
      setIsGeneratingPdf(false); 
    }
  };

  useEffect(() => {
    loadFlashcards();
    syncPodcastCache();
    if (activeTab === 'community') loadCommunityDecks();
  }, [activeTab]);

  useEffect(() => {
    setFilterMateria('Todas');
    setFilterAssunto('Todos');
    setFilterStatus('Todos');
    setFilterPodcast('Todos');
    setNewCard({ front: '', back: '', materia: '', assunto: '' });
    setEditingId(null);
    logger.log('🔄 Flashcards: Filtros resetados para nova missão:', missaoAtiva);
    loadFlashcards();
  }, [missaoAtiva]);

  const otherMissionsWithCards = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      return await flashcardsQueries.getOtherMissions(user.id, missaoAtiva);
    } catch (e) {
      logger.error('DATA', "Erro ao carregar outras missões:", e);
      return [];
    }
  }, [missaoAtiva]);

  const fetchCardsFromMission = async (sourceMission: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const data = await flashcardsQueries.getByConcurso(user.id, sourceMission);
      return data as Flashcard[];
    } catch (e) {
      logger.error('DATA', "Erro ao buscar cards da missão:", e);
      return [];
    }
  };

  const getActiveProviderName = () => { if (selectedAI === 'gemini') return geminiKeyAvailable ? 'Gemini' : 'Groq (Fallback)'; if (selectedAI === 'groq') return groqKeyAvailable ? 'Groq' : 'Gemini (Fallback)'; return geminiKeyAvailable ? 'Gemini (Auto)' : 'Groq (Auto)'; }

  const handleExportLabPDF = async () => {
    if (!currentCard) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const element = document.getElementById('neural-content-box');
      const viewport = element?.querySelector('.neural-content-viewport') as HTMLElement;
      if (!element || !viewport) {
        alert("Erro: Conteúdo do Laboratório não encontrado.");
        return;
      }
      const originalMaxHeight = viewport.style.maxHeight;
      const originalOverflow = viewport.style.overflowY;
      viewport.style.maxHeight = 'none';
      viewport.style.overflowY = 'visible';
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#0F172A',
        logging: false,
        useCORS: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      viewport.style.maxHeight = originalMaxHeight;
      viewport.style.overflowY = originalOverflow;
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = await import('jspdf');
      const pdfWidth = 595.28;
      const pdfHeight = 841.89;
      const margin = 40;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;
      const doc = new jsPDF('p', 'pt', 'a4');
      const bgColor = [15, 23, 42];
      const setupPageLayout = () => {
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(0, 0, pdfWidth, pdfHeight, 'F');
        doc.rect(0, 0, pdfWidth, margin, 'F');
        doc.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
      };
      setupPageLayout();
      doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.rect(0, 0, pdfWidth, margin, 'F');
      doc.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
      heightLeft -= contentHeight;
      while (heightLeft > 0) {
        position = (heightLeft - imgHeight) + margin;
        doc.addPage();
        setupPageLayout();
        doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(0, 0, pdfWidth, margin, 'F');
        doc.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
        heightLeft -= contentHeight;
      }
      const fileName = `Neural_Lab_${activeAiTool}_${currentCard.id.substring(0, 5)}.pdf`;
      doc.save(fileName);
      logger.log("✅ PDF Multi-página com margens exportado!");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('PDF', "Erro ao exportar PDF visual:", error);
      alert("Erro ao gerar PDF visual: " + error.message);
    }
  };

  return {
    activeTab, setActiveTab, cards, loading, loadingCommunity, communityDecks,
    showSqlModal, setShowSqlModal, previewDeck, setPreviewDeck, importingState,
    selectedAI, setSelectedAI, studyQueue, currentCardIndex, setCurrentCardIndex,
    isFlipped, setIsFlipped, aiStreamText, followUpQuery, setFollowUpQuery,
    aiLoading, mnemonicText, mnemonicLoading, extraFormat, extraContent, extraLoading,
    activeAiTool, setActiveAiTool, handleExportLabPDF,
    filterMateria, setFilterMateria, filterAssunto, setFilterAssunto,
    filterStatus, setFilterStatus, filterPodcast, setFilterPodcast,
    sessionStats, showSessionSummary, editingId, newCard, setNewCard,
    saveMessage, duplicateWarningId, isSpeaking, geminiKeyAvailable,
    groqKeyAvailable, isGeneratingPdf, podcastCache, isSyncing, isPlayingNeural,
    stopNeural, isGeneratingPodcast, podcastStatus,
    materias, assuntoOptions, statusOptions, availableTopics, currentCard,
    loadFlashcards, loadCommunityDecks, importCards, handleImportDeck, handleImportTopic,
    handleImportSingle, generateAIExplanation, handleGenerateMnemonic,
    handleGenerateExtraFormat, handleEdit, cancelEdit, clearForm, saveOrUpdateCard,
    deleteCard, startStudySession, endSession, handleCardResult, handleSpeak,
    handlePlayNeural, handlePodcastDuo, handleSendFollowUp, filteredCards,
    previewTopics, generatePDF, syncPodcastCache, getActiveProviderName,
    otherMissionsWithCards, fetchCardsFromMission
  };
};
