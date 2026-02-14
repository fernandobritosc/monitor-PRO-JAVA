import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { streamAIContent, AIProvider, generatePodcastAudio, handlePlayRevisionAudio, deleteCachedAudio, generateAIContent } from '../services/aiService';
import { EditalMateria, Flashcard } from '../types';

interface FlashcardsProps {
  missaoAtiva: string;
  editais: EditalMateria[];
}

// SCRIPT SQL COMPLETO: Tabela + Colunas Novas + Storage + Policies + BACKFILL
const SQL_FLASHCARDS_POLICY = `
-- 1. TABELA DE FLASHCARDS
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  materia text NOT NULL,
  assunto text,
  front text NOT NULL,
  back text NOT NULL,
  ai_generated_assets jsonb,
  original_audio_id text,
  author_name text,
  status text DEFAULT 'novo',
  next_review timestamp with time zone,
  interval numeric,
  ease_factor numeric,
  created_at timestamp with time zone DEFAULT now()
);

-- GARANTIR COLUNAS NOVAS (Para quem já tem a tabela)
ALTER TABLE flashcards DROP COLUMN IF EXISTS ai_explanation;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS ai_generated_assets jsonb;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS original_audio_id text;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS author_name text;

-- 2. STORAGE (PASTA DE ÁUDIO)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-revisions', 'audio-revisions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Audio" ON storage.objects;
CREATE POLICY "Public Access Audio" ON storage.objects FOR SELECT USING ( bucket_id = 'audio-revisions' );

DROP POLICY IF EXISTS "Authenticated Upload Audio" ON storage.objects;
CREATE POLICY "Authenticated Upload Audio" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'audio-revisions' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Delete Audio" ON storage.objects;
CREATE POLICY "Authenticated Delete Audio" ON storage.objects FOR DELETE USING ( bucket_id = 'audio-revisions' AND auth.role() = 'authenticated' );

-- 3. POLÍTICAS DE SEGURANÇA DA TABELA (RLS)
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- IMPORTANTE: Permitir leitura pública para a aba Comunidade funcionar
DROP POLICY IF EXISTS "Permitir Leitura Publica Flashcards" ON flashcards;
CREATE POLICY "Permitir Leitura Publica Flashcards" ON flashcards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir Criacao Propria Flashcards" ON flashcards;
CREATE POLICY "Permitir Criacao Propria Flashcards" ON flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir Edicao Propria Flashcards" ON flashcards;
CREATE POLICY "Permitir Edicao Propria Flashcards" ON flashcards FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir Exclusao Propria Flashcards" ON flashcards;
CREATE POLICY "Permitir Exclusao Propria Flashcards" ON flashcards FOR DELETE USING (auth.uid() = user_id);

-- 4. ÍNDICES E LIMPEZA DE DUPLICADOS
DELETE FROM flashcards WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, materia, front ORDER BY created_at DESC) as row_num FROM flashcards) t WHERE t.row_num > 1);
DROP INDEX IF EXISTS flashcards_user_materia_front_key;
CREATE UNIQUE INDEX flashcards_user_materia_front_key ON flashcards (user_id, materia, front);

-- 5. ATUALIZAR CARDS ANTIGOS (BACKFILL AUTOR)
-- Isso preenche o nome do autor em cards criados antes dessa atualização
UPDATE flashcards f
SET author_name = (
    SELECT split_part(email, '@', 1)
    FROM auth.users u
    WHERE u.id = f.user_id
)
WHERE author_name IS NULL;
`;

const normalizeText = (text: string) => text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,:;()?!]/g, "").replace(/\s+/g, " ").trim() : '';

const getSimilarity = (s1: string, s2: string): number => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const editDistance = (a: string, b: string) => {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
        else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[b.length][a.length];
  };
  return (longer.length - editDistance(longer, shorter)) / longer.length;
};

export const useFlashcards = ({ missaoAtiva, editais }: FlashcardsProps) => {
  const [activeTab, setActiveTab] = useState<'study' | 'manage' | 'community'>('study');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [communityDecks, setCommunityDecks] = useState<any[]>([]);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [previewDeck, setPreviewDeck] = useState<any>(null);
  const [importingState, setImportingState] = useState<{ loading: boolean, text: string }>({ loading: false, text: '' });
  const [selectedAI, setSelectedAI] = useState<AIProvider | 'auto'>('auto');
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [aiStreamText, setAiStreamText] = useState<string>("");
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [mnemonicText, setMnemonicText] = useState<string>("");
  const [mnemonicLoading, setMnemonicLoading] = useState(false);

  const [extraFormat, setExtraFormat] = useState<'mapa' | 'fluxo' | 'tabela' | 'info' | null>(null);
  const [extraContent, setExtraContent] = useState<string>('');
  const [extraLoading, setExtraLoading] = useState<boolean>(false);

  const [filterMateria, setFilterMateria] = useState<string>('Todas');
  const [filterAssunto, setFilterAssunto] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterPodcast, setFilterPodcast] = useState<string>('Todos');

  const [sessionStats, setSessionStats] = useState({ learned: 0, review: 0, total: 0 });
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({ front: '', back: '', materia: '', assunto: '' });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [duplicateWarningId, setDuplicateWarningId] = useState<string | null>(null);
  const [similarityThreshold] = useState(0.8);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [geminiKeyAvailable, setGeminiKeyAvailable] = useState(false);
  const [groqKeyAvailable, setGroqKeyAvailable] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [podcastCache, setPodcastCache] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  const [isPlayingNeural, setIsPlayingNeural] = useState(false);
  const [stopNeural, setStopNeural] = useState<(() => void) | null>(null);

  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastStatus, setPodcastStatus] = useState("");
  const [activeAiTool, setActiveAiTool] = useState<'explanation' | 'mnemonic' | 'mapa' | 'fluxo' | 'tabela' | 'info'>('explanation');

  useEffect(() => {
    setGeminiKeyAvailable(!!getGeminiKey());
    setGroqKeyAvailable(!!getGroqKey());
  }, []);

  const syncPodcastCache = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.storage.from('audio-revisions').list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
      if (error) { console.error("Erro ao listar áudios:", error); return; }
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
        console.log(`✅ Sincronização: ${count} podcasts identificados no servidor.`);
        setPodcastCache(podcastIds);
      }
    } catch (e) { console.error("Erro exceção sync podcast:", e); } finally { setIsSyncing(false); }
  };

  const materias = useMemo(() => {
    const filteredEditais = editais.filter(e => e.concurso === missaoAtiva);
    const unique = Array.from(new Set(filteredEditais.map(e => e.materia)));
    return ['Todas', ...unique.sort()];
  }, [editais, missaoAtiva]);

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

  const currentCard = studyQueue[currentCardIndex];

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) throw new Error("Usuário não logado");

      const { data, error } = await supabase.from('flashcards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error) { console.error('Erro ao carregar flashcards:', error); } finally { setLoading(false); }
  };

  const loadCommunityDecks = async () => {
    setLoadingCommunity(true);
    try {
      const { data: { user } } = await (supabase.auth as any).getUser();

      const { data, error } = await supabase.from('flashcards')
        .select('materia, assunto, front, back, id, status, created_at, ai_generated_assets, original_audio_id, author_name')
        .not('user_id', 'eq', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      const decksMap = new Map();
      data?.forEach((card: any) => {
        if (!decksMap.has(card.materia)) decksMap.set(card.materia, { materia: card.materia, count: 0, cards: [] });
        const deck = decksMap.get(card.materia);
        deck.count++;
        deck.cards.push(card);
      });
      const validDecks = Array.from(decksMap.values()).filter(d => d.count > 0);
      setCommunityDecks(validDecks);
    } catch (error) { console.error('Erro ao carregar decks:', error); } finally { setLoadingCommunity(false); }
  };

  const importCards = async (cardsToImport: any[], type: 'deck' | 'topic' | 'single', topicName?: string) => {
    setImportingState({ loading: true, text: type === 'single' ? '' : 'Importando...' });
    try {
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const userName = user.email?.split('@')[0] || 'Eu';

      const payload = cardsToImport.map(c => ({
        user_id: user.id,
        materia: c.materia,
        assunto: c.assunto,
        front: c.front,
        back: c.back,
        ai_generated_assets: c.ai_generated_assets,
        original_audio_id: c.original_audio_id || c.id,
        author_name: userName,
        status: 'novo' as Flashcard['status']
      }));

      const { error } = await supabase.from('flashcards').insert(payload);
      if (error) throw error;

      const newLocalCards = payload.map((p, idx) => ({ ...p, id: `temp-${Date.now()}-${idx}`, created_at: new Date().toISOString() })) as Flashcard[];
      setCards(prev => [...prev, ...newLocalCards]);

      if (previewDeck) {
        const importedIds = new Set(cardsToImport.map(c => c.id));
        const remainingCards = previewDeck.cards.filter((c: any) => !importedIds.has(c.id));
        if (remainingCards.length === 0) { setPreviewDeck(null); setCommunityDecks(prev => prev.filter(d => d.materia !== previewDeck.materia)); }
        else { setPreviewDeck({ ...previewDeck, cards: remainingCards, count: remainingCards.length }); }
      }
      if (type !== 'single') alert(`${payload.length} cards importados com sucesso!`);
    } catch (error: any) { alert('Erro ao importar: ' + error.message); } finally { setImportingState({ loading: false, text: '' }); }
  };

  const handleImportDeck = (deckOrEvent?: any) => {
    const targetDeck = (deckOrEvent && deckOrEvent.cards) ? deckOrEvent : previewDeck;
    if (!targetDeck) return;
    if (!confirm(`Deseja importar TODOS os ${targetDeck.cards.length} cards de ${targetDeck.materia}?`)) return;
    importCards(targetDeck.cards, 'deck');
  };

  const handleImportTopic = (topic: string) => {
    if (!previewDeck) return;
    const cardsInTopic = previewDeck.cards.filter((c: any) => c.assunto === topic);
    if (cardsInTopic.length === 0) return;
    if (!confirm(`Importar ${cardsInTopic.length} cards do tópico "${topic}"?`)) return;
    importCards(cardsInTopic, 'topic', topic);
  };

  const handleImportSingle = (card: any) => { importCards([card], 'single'); };

  const saveAiAsset = async (assetType: keyof NonNullable<Flashcard['ai_generated_assets']>, content: string) => {
    if (!currentCard) return;

    const currentAssets = studyQueue[currentCardIndex]?.ai_generated_assets || {};
    const newAssets = { ...currentAssets, [assetType]: content };

    const updatedQueue = studyQueue.map((c, i) =>
      i === currentCardIndex ? { ...c, ai_generated_assets: newAssets } : c
    );
    setStudyQueue(updatedQueue);

    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ ai_generated_assets: newAssets })
        .eq('id', currentCard.id);
      if (error) throw error;
      // FIX: Explicitly convert assetType to a string to avoid implicit conversion error with symbols.
      console.log(`✅ Asset '${String(assetType)}' salvo para o card ${currentCard.id}`);
    } catch (error) {
      console.error("Erro ao salvar asset de IA:", error);
    }
  };

  const generateAIExplanation = async () => {
    if (!currentCard || aiLoading) return;

    setAiLoading(true);
    setAiStreamText('');
    setFollowUpQuery('');

    const preferred = selectedAI === 'auto' ? undefined : selectedAI;
    let accumulatedText = "";

    const prompt = `Pergunta: "${currentCard.front}"\nResposta: "${currentCard.back}"`;

    await streamAIContent(prompt, {
      onChunk: (text: string) => { setAiStreamText(prev => prev + text); accumulatedText += text; },
      onComplete: async () => { setAiLoading(false); await saveAiAsset('explanation', accumulatedText); },
      onError: (error: Error) => {
        console.error("AI Fatal Error:", error);
        setAiStreamText('❌ Falha Crítica: Todos os motores de IA falharam.\n\nDetalhes: ' + error.message + '\n\n💡 Tente trocar manualmente para Groq nas configurações ou verifique suas chaves.');
        setAiLoading(false);
      }
    }, getGeminiKey(), getGroqKey(), preferred);
  };

  const handleGenerateMnemonic = async () => {
    if (!currentCard || mnemonicLoading) return;
    setMnemonicLoading(true);
    setMnemonicText("");

    try {
      const concept = `PERGUNTA: '${currentCard.front}' / RESPOSTA: '${currentCard.back}'`;
      const result = await generateAIContent(concept, getGeminiKey(), getGroqKey(), selectedAI === 'auto' ? undefined : selectedAI, 'flashcard');
      setMnemonicText(result);
      await saveAiAsset('mnemonic', result);
    } catch (error: any) {
      console.error("Erro ao gerar mnemônico:", error);
      setMnemonicText("Desculpe, não foi possível criar um mnemônico agora.");
    } finally {
      setMnemonicLoading(false);
    }
  };

  const handleGenerateExtraFormat = async (format: 'mapa' | 'fluxo' | 'tabela' | 'info') => {
    if (!currentCard || extraLoading) return;
    setExtraFormat(format);
    setExtraLoading(true);
    setExtraContent("");

    try {
      const concept = `PERGUNTA: '${currentCard.front}' / RESPOSTA: '${currentCard.back}'`;

      const result = await generateAIContent(concept, getGeminiKey(), getGroqKey(), selectedAI === 'auto' ? undefined : selectedAI, format);
      setActiveAiTool(format);

      if (!result || result.trim() === '') {
        throw new Error("A IA retornou uma resposta vazia.");
      }

      setExtraContent(result);
      await saveAiAsset(format, result);
    } catch (error: any) {
      console.error(`Erro ao gerar ${format}:`, error);
      setExtraContent(`Desculpe, não foi possível gerar o formato "${format}" para este card. Motivo: ${error.message}`);
    } finally {
      setExtraLoading(false);
    }
  };

  const findDuplicate = (front: string, materia: string) => {
    const normalizedFront = normalizeText(front);
    return cards.find(card => {
      if (editingId && card.id === editingId) return false;
      if (card.materia !== materia) return false;
      return getSimilarity(normalizedFront, normalizeText(card.front)) > similarityThreshold;
    });
  };

  const handleEdit = (card: Flashcard) => { setNewCard({ materia: card.materia, assunto: card.assunto || '', front: card.front, back: card.back }); setEditingId(card.id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => { setNewCard({ front: '', back: '', materia: '', assunto: '' }); setEditingId(null); };
  const clearForm = () => { setNewCard({ front: '', back: '', materia: '', assunto: '' }); setSaveMessage(null); }

  const saveOrUpdateCard = async () => {
    if (!newCard.front.trim() || !newCard.back.trim() || !newCard.materia) { alert('Preencha todos os campos obrigatórios'); return; }
    const duplicate = findDuplicate(newCard.front, newCard.materia);
    if (duplicate) {
      alert('Flashcard duplicado detectado! Verifique o card destacado abaixo.'); setDuplicateWarningId(duplicate.id);
      setTimeout(() => { const el = document.getElementById(`card-${duplicate.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
      setTimeout(() => setDuplicateWarningId(null), 3000); return;
    }
    setSaveMessage(null);
    try {
      if (editingId) {
        const { error } = await supabase.from('flashcards').update({
          materia: newCard.materia,
          assunto: newCard.assunto,
          front: newCard.front,
          back: newCard.back,
          ai_generated_assets: null,
          original_audio_id: null
        }).eq('id', editingId);

        if (error) throw error;
        alert('Flashcard atualizado!');
        deleteCachedAudio(editingId);
        setPodcastCache(prev => { const n = new Set(prev); n.delete(editingId); return n; });
        cancelEdit();
      } else {
        const { data: { user } } = await (supabase.auth as any).getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const authorName = user.email?.split('@')[0] || 'Anônimo';

        const { error } = await supabase.from('flashcards').insert([{
          user_id: user.id,
          materia: newCard.materia,
          assunto: newCard.assunto,
          front: newCard.front,
          back: newCard.back,
          author_name: authorName,
          status: 'novo' as Flashcard['status']
        }]);
        if (error) throw error;
        setNewCard(prev => ({ ...prev, front: '', back: '' }));
        setSaveMessage("Salvo! Campos mantidos para próximo card.");
        setTimeout(() => setSaveMessage(null), 3000);
      }
      loadFlashcards();
    } catch (error: any) { alert('Erro: ' + error.message); }
  };

  const updateCardStatus = async (id: string, status: Flashcard['status']) => { try { const { error } = await supabase.from('flashcards').update({ status }).eq('id', id); if (error) throw error; loadFlashcards(); } catch (error) { console.error(error); } };

  const deleteCard = async (id: string) => {
    if (!confirm('Excluir este flashcard?')) return;
    try {
      const { error } = await supabase.from('flashcards').delete().eq('id', id);
      if (error) throw error;
      deleteCachedAudio(id);
      setPodcastCache(prev => { const n = new Set(prev); n.delete(id); return n; });
      loadFlashcards();
    } catch (error) { console.error(error); }
  };

  const smartShuffle = (inputCards: Flashcard[]) => {
    const groups: Record<string, Flashcard[]> = {};
    inputCards.forEach(c => { if (!groups[c.materia]) groups[c.materia] = []; groups[c.materia].push(c); });
    Object.keys(groups).forEach(key => { groups[key] = groups[key].sort(() => Math.random() - 0.5); });
    const result: Flashcard[] = []; let lastMateria: string | null = null; let remainingCount = inputCards.length;
    while (remainingCount > 0) {
      const availableMaterias = Object.keys(groups).filter(k => groups[k].length > 0);
      let candidates = availableMaterias.filter(m => m !== lastMateria);
      if (candidates.length === 0) candidates = availableMaterias;
      if (candidates.length === 0) break;
      const chosenMateria = candidates[Math.floor(Math.random() * candidates.length)];
      const card = groups[chosenMateria].pop();
      if (card) { result.push(card); lastMateria = chosenMateria; remainingCount--; }
    }
    return result;
  };

  const startStudySession = () => {
    const filtered = filteredCards.filter(card => card.status === 'novo' || card.status === 'revisando' || card.status === 'pendente');
    if (filtered.length === 0) { alert('Nenhum card para estudar com os filtros atuais!'); return; }
    const shuffledQueue = smartShuffle([...filtered]);
    setStudyQueue(shuffledQueue); setCurrentCardIndex(0); setIsFlipped(false); setAiStreamText(""); setFollowUpQuery("");
    setSessionStats({ learned: 0, review: 0, total: shuffledQueue.length }); setShowSessionSummary(false);
  };

  const endSession = () => { setStudyQueue([]); setCurrentCardIndex(0); setIsFlipped(false); setAiStreamText(""); setFollowUpQuery(""); setMnemonicText(""); setShowSessionSummary(false); };

  const handleCardResult = async (status: Flashcard['status']) => {
    if (!currentCard) return;
    if (status === 'aprendendo' || status === 'aprendido') { setSessionStats(prev => ({ ...prev, learned: prev.learned + 1 })); }
    else if (status === 'revisando' || status === 'revisar') { setSessionStats(prev => ({ ...prev, review: prev.review + 1 })); }
    updateCardStatus(currentCard.id, status);
    const nextIndex = currentCardIndex + 1;
    if (nextIndex < studyQueue.length) { setCurrentCardIndex(nextIndex); } else { setShowSessionSummary(true); }
  };

  useEffect(() => {
    if (studyQueue.length > 0 && currentCardIndex < studyQueue.length) {
      const card = studyQueue[currentCardIndex];
      setIsFlipped(false);
      setFollowUpQuery("");
      setAiStreamText(card.ai_generated_assets?.explanation ?? "");
      setMnemonicText(card.ai_generated_assets?.mnemonic ?? "");
      setExtraContent('');
      setExtraFormat(null);
      setActiveAiTool('explanation');
    }
  }, [currentCardIndex, studyQueue]);

  useEffect(() => {
    setAiStreamText("");
    setMnemonicText("");
    setExtraContent('');
    setExtraFormat(null);
  }, [selectedAI]);

  const handleSpeak = (text: string, e: React.MouseEvent) => { e.stopPropagation(); if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; } const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'pt-BR'; utterance.rate = 1.2; utterance.onend = () => setIsSpeaking(false); utterance.onerror = () => setIsSpeaking(false); setIsSpeaking(true); window.speechSynthesis.speak(utterance); };

  const handlePlayNeural = async () => {
    if (isPlayingNeural) { if (stopNeural) stopNeural(); setIsPlayingNeural(false); setStopNeural(null); return; }
    if (!aiStreamText || !currentCard) return;
    const key = getGeminiKey();
    if (!key) { alert("Chave Gemini necessária para o modo Podcast."); return; }
    setIsPlayingNeural(true);
    const audioIdToUse = currentCard.original_audio_id || currentCard.id;
    const cancel = await handlePlayRevisionAudio(aiStreamText, audioIdToUse, key, () => setIsPlayingNeural(true), () => setIsPlayingNeural(false), (err: string) => { alert(err); setIsPlayingNeural(false); });
    setStopNeural(() => cancel);
  };

  const handlePodcastDuo = async () => {
    if (isPlayingNeural || isGeneratingPodcast) { if (stopNeural) stopNeural(); setIsPlayingNeural(false); setIsGeneratingPodcast(false); setPodcastStatus(""); setStopNeural(null); return; }
    if (!aiStreamText || !currentCard) return;
    const key = getGeminiKey();
    if (!key) { alert("Chave Gemini necessária."); return; }
    setIsGeneratingPodcast(true);
    const audioIdToUse = currentCard.original_audio_id || currentCard.id;
    const cancel = await generatePodcastAudio(aiStreamText, audioIdToUse, key, (status: string) => setPodcastStatus(status), () => { setIsPlayingNeural(true); setPodcastStatus("No ar!"); setPodcastCache(prev => new Set(prev).add(audioIdToUse)); }, () => { setIsPlayingNeural(false); setIsGeneratingPodcast(false); setPodcastStatus(""); }, (err: string) => { alert(err); setIsGeneratingPodcast(false); });
    setStopNeural(() => cancel);
  };

  useEffect(() => { return () => { if (stopNeural) stopNeural(); setIsPlayingNeural(false); setIsGeneratingPodcast(false); }; }, [currentCardIndex, activeTab]);

  const handleSendFollowUp = async () => {
    if (!currentCard || !followUpQuery.trim() || !aiStreamText) return;
    const preferred = selectedAI === 'auto' ? undefined : selectedAI;
    setAiLoading(true);
    const questionText = `\n\n🤔 **Você:** ${followUpQuery}\n\n🤖 **Tutor:** `;
    setAiStreamText(prev => prev + questionText);
    const queryToSend = followUpQuery;
    setFollowUpQuery("");
    const contextPrompt = `ATENÇÃO: Você é um Tutor Especialista.\nCONTEXTO: Matéria: ${currentCard.materia}. Card: "${currentCard.front}" -> "${currentCard.back}".\nHISTÓRICO: ${aiStreamText}\nNOVA PERGUNTA: "${queryToSend}"\nDIRETRIZES: 1. Responda apenas à nova dúvida. 2. Seja didático.`;

    let fullConversation = aiStreamText + questionText;

    await streamAIContent(contextPrompt, {
      onChunk: (text: string) => {
        setAiStreamText(prev => prev + text);
        fullConversation += text;
      },
      onComplete: async () => {
        setAiLoading(false);
        await saveAiAsset('explanation', fullConversation);
      },
      onError: (error: Error) => { setAiStreamText(prev => prev + '\n[Erro na resposta]'); setAiLoading(false); }
    }, getGeminiKey(), getGroqKey(), preferred);
  };

  const filteredCards = useMemo(() => {
    let filtered = [...cards];
    if (filterMateria !== 'Todas') filtered = filtered.filter(card => card.materia === filterMateria);
    if (filterAssunto !== 'Todos') filtered = filtered.filter(card => card.assunto === filterAssunto);
    if (filterStatus !== 'Todos') filtered = filtered.filter(card => card.status === filterStatus);
    if (filterPodcast === 'Com Podcast') { filtered = filtered.filter(card => podcastCache.has(card.original_audio_id || card.id)); }
    else if (filterPodcast === 'Sem Podcast') { filtered = filtered.filter(card => !podcastCache.has(card.original_audio_id || card.id)); }
    return filtered;
  }, [cards, filterMateria, filterAssunto, filterStatus, filterPodcast, podcastCache]);

  const previewTopics = useMemo(() => {
    if (!previewDeck) return [];
    const topics = new Set<string>();
    previewDeck.cards.forEach((c: any) => { if (c.assunto) topics.add(c.assunto); });
    return Array.from(topics).sort();
  }, [previewDeck]);

  const generatePDF = () => {
    if (filteredCards.length === 0) { alert("Nenhum card para exportar com os filtros atuais."); return; }
    setIsGeneratingPdf(true);
    try {
      if (!window.jspdf) { throw new Error("Biblioteca PDF (jsPDF) não carregada. Verifique a conexão ou recarregue a página."); }
      const { jsPDF } = window.jspdf;
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
      (doc as any).autoTable({
        head: [tableColumn], body: tableRows, startY: 50,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [75, 85, 99] },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 60 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 30 } }
      });
      const date = new Date().toLocaleDateString("pt-BR").replace(/\//g, '-');
      const fileName = `Flashcards_${filterMateria}_${filterAssunto}_${date}.pdf`;
      doc.save(fileName);
    } catch (err: any) { alert("Erro ao gerar PDF: " + err.message); } finally { setIsGeneratingPdf(false); }
  };

  useEffect(() => {
    loadFlashcards();
    syncPodcastCache();
    if (activeTab === 'community') loadCommunityDecks();
  }, [activeTab]);

  const getActiveProviderName = () => { if (selectedAI === 'gemini') return geminiKeyAvailable ? 'Gemini' : 'Groq (Fallback)'; if (selectedAI === 'groq') return groqKeyAvailable ? 'Groq' : 'Gemini (Fallback)'; return geminiKeyAvailable ? 'Gemini (Auto)' : 'Groq (Auto)'; }

  const handleExportLabPDF = async () => {
    if (!currentCard || (!aiStreamText && !mnemonicText && !extraContent)) return;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Configuração de Estilo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(40, 44, 52);
    doc.text("Neural Study Guide", 20, 30);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Gerado por Monitor Pro AI - ${new Date().toLocaleDateString()}`, 20, 40);

    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);

    // Conteúdo
    doc.setFontSize(16);
    doc.setTextColor(40, 44, 52);
    doc.text(`Tópico: ${currentCard.front}`, 20, 60);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const activeToolLabel = {
      explanation: 'Análise Profunda',
      mnemonic: 'Mnemônico',
      mapa: 'Mapa Mental',
      tabela: 'Tabela Comparativa',
      fluxo: 'Fluxograma',
      info: 'Infográfico'
    }[activeAiTool];

    doc.text(`Ferramenta: ${activeToolLabel}`, 20, 75);

    doc.setFont("helvetica", "normal");
    const content = activeAiTool === 'explanation' ? aiStreamText :
      activeAiTool === 'mnemonic' ? mnemonicText :
        extraContent;

    const splitText = doc.splitTextToSize(content.replace(/[*#]/g, ''), 170);
    doc.text(splitText, 20, 90);

    doc.save(`Neural_Lab_${activeAiTool}_${currentCard.id.substring(0, 5)}.pdf`);
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
    SQL_FLASHCARDS_POLICY,
    loadFlashcards, loadCommunityDecks, importCards, handleImportDeck, handleImportTopic,
    handleImportSingle, generateAIExplanation, handleGenerateMnemonic,
    handleGenerateExtraFormat, handleEdit, cancelEdit, clearForm, saveOrUpdateCard,
    deleteCard, startStudySession, endSession, handleCardResult, handleSpeak,
    handlePlayNeural, handlePodcastDuo, handleSendFollowUp, filteredCards,
    previewTopics, generatePDF, syncPodcastCache, getActiveProviderName,
  };
};