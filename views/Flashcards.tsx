
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, getGeminiKey, getGroqKey } from '../services/supabase';
import { streamAIContent, AIProvider } from '../services/aiService';
import { EditalMateria, Flashcard } from '../types';
import { 
  Zap, Plus, Trash2, Layers, Brain, CheckCircle2, XCircle, RotateCcw, 
  Loader2, Filter, BookOpen, Edit2, Save, X, DownloadCloud, Users, 
  Globe, Database, Copy, ChevronDown, Shuffle, Eye, Sparkles, AlertTriangle, Settings, Volume2, Info, List, RefreshCw, Lock, ChevronLeft, ChevronRight, Trophy, Target, Tag
} from 'lucide-react';

interface FlashcardsProps {
  missaoAtiva: string;
  editais: EditalMateria[];
}

interface LocalFlashcard extends Omit<Flashcard, 'status' | 'created_at'> {
  status: 'novo' | 'aprendendo' | 'revisando' | 'aprendido' | 'revisar' | 'pendente';
  created_at?: string;
}

const SQL_FLASHCARDS_POLICY = `
-- Garante que a tabela existe
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  materia text NOT NULL,
  assunto text,
  front text NOT NULL,
  back text NOT NULL,
  status text DEFAULT 'novo',
  next_review timestamp with time zone,
  interval numeric,
  ease_factor numeric,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas para evitar erro de duplicidade
DROP POLICY IF EXISTS "Permitir Leitura Publica Flashcards" ON flashcards;
DROP POLICY IF EXISTS "Permitir Criacao Propria Flashcards" ON flashcards;
DROP POLICY IF EXISTS "Permitir Edicao Propria Flashcards" ON flashcards;
DROP POLICY IF EXISTS "Permitir Exclusao Propria Flashcards" ON flashcards;

-- Cria as novas políticas
CREATE POLICY "Permitir Leitura Publica Flashcards" ON flashcards FOR SELECT USING (true);
CREATE POLICY "Permitir Criacao Propria Flashcards" ON flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permitir Edicao Propria Flashcards" ON flashcards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permitir Exclusao Propria Flashcards" ON flashcards FOR DELETE USING (auth.uid() = user_id);

-- Índice único para evitar duplicatas exatas
CREATE UNIQUE INDEX IF NOT EXISTS flashcards_user_materia_front_key ON flashcards (user_id, materia, front);
`;

const normalizeText = (text: string) => {
  if (!text) return '';
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,:;()?!]/g, "").replace(/\s-(?=\s)/g, '').replace(/\s(de|da|do|a|o|e|em|para|com|por|na|no)\s/g, " ").replace(/\s{2,}/g, " ").trim();
};

const getSimilarity = (s1: string, s2: string): number => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  const editDistance = (a: string, b: string) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
      }
    }
    return matrix[b.length][a.length];
  };
  return (longerLength - editDistance(longer, shorter)) / longerLength;
};

interface CustomFilterDropdownProps {
  label: string; value: string; options: string[]; onChange: (val: string) => void;
  icon?: React.ReactNode; widthClass?: string; colorClass?: string; align?: 'left' | 'right';
}

const CustomFilterDropdown: React.FC<CustomFilterDropdownProps> = ({ label, value, options, onChange, icon, widthClass = "w-48", colorClass = "focus:ring-cyan-500", align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const displayValue = value === 'Todas' || value === 'Todos' ? label : value;
  const defaultValue = label.includes('Matéria') ? 'Todas' : (label.includes('Selecione') ? '' : 'Todos');
  const defaultLabel = label.includes('Selecione') ? 'Limpar Seleção' : (label.includes('Matéria') ? 'Todas' : 'Todos');
  return (
    <div className={`relative ${widthClass}`} ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 flex justify-between items-center transition-all hover:bg-slate-800/50 ${isOpen ? 'ring-2 ring-opacity-50 ' + colorClass : ''}`}><div className="flex items-center gap-2 truncate flex-1 min-w-0">{icon}<span className="truncate">{displayValue || label}</span></div><ChevronDown size={14} className={`ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>
      {isOpen && (<div className={`absolute top-full mt-2 ${align === 'right' ? 'right-0' : 'left-0'} max-h-[300px] overflow-y-auto bg-[#1a1d26] border border-white/10 rounded-xl shadow-2xl z-[9999] custom-scrollbar animate-in fade-in slide-in-from-top-2`} style={{ width: '300px', maxWidth: '90vw' }}><div onClick={() => { onChange(defaultValue); setIsOpen(false); }} className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{defaultLabel}</span></div>{options.length === 0 ? (<div className="p-4 text-center text-xs text-slate-500 italic">Sem opções disponíveis</div>) : (options.map((opt, idx) => (<div key={idx} onClick={() => { onChange(opt); setIsOpen(false); }} className={`p-3 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors flex items-start gap-2 ${value === opt ? 'bg-cyan-500/10' : ''}`}><div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${value === opt ? 'bg-cyan-400' : 'bg-slate-700'}`} /><span className={`text-xs font-medium leading-relaxed flex-1 ${value === opt ? 'text-cyan-100' : 'text-slate-300'}`} style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>{opt}</span></div>)))}</div>)}
    </div>
  );
};

const Flashcards: React.FC<FlashcardsProps> = ({ missaoAtiva, editais }) => {
  const [activeTab, setActiveTab] = useState<'study' | 'manage' | 'community'>('study');
  const [cards, setCards] = useState<LocalFlashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [communityDecks, setCommunityDecks] = useState<any[]>([]);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [previewDeck, setPreviewDeck] = useState<any>(null);
  const [importingState, setImportingState] = useState<{ loading: boolean, text: string }>({ loading: false, text: '' });
  const [selectedAI, setSelectedAI] = useState<AIProvider | 'auto'>('auto');
  const [studyQueue, setStudyQueue] = useState<LocalFlashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [aiStreamText, setAiStreamText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [filterMateria, setFilterMateria] = useState<string>('Todas');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // States da Sessão
  const [sessionStats, setSessionStats] = useState({ learned: 0, review: 0, total: 0 });
  const [showSessionSummary, setShowSessionSummary] = useState(false);

  // States para Edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({ front: '', back: '', materia: '', assunto: '' });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  // States para Aviso de Duplicidade
  const [duplicateWarningId, setDuplicateWarningId] = useState<string | null>(null);
  
  const [similarityThreshold] = useState(0.8);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Estados para forçar re-render na detecção de chave
  const [geminiKeyAvailable, setGeminiKeyAvailable] = useState(false);
  const [groqKeyAvailable, setGroqKeyAvailable] = useState(false);

  useEffect(() => {
    // Verifica chaves ao montar
    setGeminiKeyAvailable(!!getGeminiKey());
    setGroqKeyAvailable(!!getGroqKey());
  }, []);

  // FILTRO CORRIGIDO: Mostra apenas matérias da MISSÃO ATIVA
  const materias = useMemo(() => { 
    const filteredEditais = editais.filter(e => e.concurso === missaoAtiva);
    const unique = Array.from(new Set(filteredEditais.map(e => e.materia))); 
    return ['Todas', ...unique.sort()]; 
  }, [editais, missaoAtiva]);

  const statusOptions = useMemo(() => ['Todos', 'novo', 'aprendendo', 'revisando', 'aprendido', 'revisar', 'pendente'], []);

  // SUGESTÃO DE TÓPICOS PARA O CAMPO ASSUNTO COM SORT NUMÉRICO
  const availableTopics = useMemo(() => {
    if (!newCard.materia || newCard.materia === 'Todas') return [];
    const edital = editais.find(e => e.concurso === missaoAtiva && e.materia === newCard.materia);
    // Ordenação numérica corrigida
    return edital ? [...edital.topicos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })) : [];
  }, [editais, missaoAtiva, newCard.materia]);

  // ASSINATURAS DOS CARDS DO USUÁRIO (Para detectar duplicatas rapidamente)
  const userCardSignatures = useMemo(() => {
      const signatures = new Set<string>();
      cards.forEach(c => signatures.add(`${normalizeText(c.materia)}||${normalizeText(c.front)}`));
      return signatures;
  }, [cards]);

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('flashcards').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCards((data || []).map((card: any) => ({ ...card, status: card.status as LocalFlashcard['status'], created_at: card.created_at || new Date().toISOString() })));
    } catch (error) { console.error('Erro ao carregar flashcards:', error); } finally { setLoading(false); }
  };

  const loadCommunityDecks = async () => {
    setLoadingCommunity(true);
    try {
      // 1. Busca todos os cards públicos
      const { data, error } = await supabase.from('flashcards').select('materia, assunto, front, back, id, status, created_at').not('user_id', 'eq', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      
      const decksMap = new Map();
      
      data?.forEach((card: any) => {
        // 2. Filtra cards que o usuário já tem (pela assinatura)
        const signature = `${normalizeText(card.materia)}||${normalizeText(card.front)}`;
        if (userCardSignatures.has(signature)) return; // Pula card se já existe

        if (!decksMap.has(card.materia)) decksMap.set(card.materia, { materia: card.materia, count: 0, cards: [] });
        const deck = decksMap.get(card.materia); 
        deck.count++; 
        deck.cards.push(card);
      });
      
      // 3. Filtra decks vazios (caso o usuário tenha todos os cards de uma matéria)
      const validDecks = Array.from(decksMap.values()).filter(d => d.count > 0);
      setCommunityDecks(validDecks);

    } catch (error) { console.error('Erro ao carregar decks:', error); } finally { setLoadingCommunity(false); }
  };

  // FUNÇÃO GENÉRICA PARA IMPORTAR LISTA DE CARDS
  const importCards = async (cardsToImport: any[], type: 'deck' | 'topic' | 'single', topicName?: string) => {
      setImportingState({ loading: true, text: type === 'single' ? '' : 'Importando...' });
      
      try {
          const userId = (await (supabase.auth as any).getUser()).data.user?.id;
          if (!userId) throw new Error('Usuário não autenticado');

          const payload = cardsToImport.map(c => ({
              user_id: userId,
              materia: c.materia,
              assunto: c.assunto,
              front: c.front,
              back: c.back,
              status: 'novo' as LocalFlashcard['status']
          }));

          const { error } = await supabase.from('flashcards').insert(payload);
          if (error) throw error;

          // ATUALIZAÇÃO OTIMISTA LOCAL
          // 1. Adiciona aos cards do usuário
          const newLocalCards = payload.map((p, idx) => ({ 
              ...p, 
              id: `temp-${Date.now()}-${idx}`, 
              created_at: new Date().toISOString() 
          })) as LocalFlashcard[];
          
          setCards(prev => [...prev, ...newLocalCards]);

          // 2. Remove da Preview (Efeito "Sumir")
          if (previewDeck) {
              const importedIds = new Set(cardsToImport.map(c => c.id));
              const remainingCards = previewDeck.cards.filter((c: any) => !importedIds.has(c.id));
              
              if (remainingCards.length === 0) {
                  setPreviewDeck(null); // Fecha se acabou
                  // Remove também da lista geral da comunidade
                  setCommunityDecks(prev => prev.filter(d => d.materia !== previewDeck.materia));
              } else {
                  setPreviewDeck({ ...previewDeck, cards: remainingCards, count: remainingCards.length });
              }
          }

          if (type !== 'single') alert(`${payload.length} cards importados com sucesso!`);

      } catch (error: any) {
          alert('Erro ao importar: ' + error.message);
      } finally {
          setImportingState({ loading: false, text: '' });
      }
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

  const handleImportSingle = (card: any) => {
      importCards([card], 'single');
  };

  const generateAIExplanation = async (prompt: string) => {
    setAiLoading(true); setAiStreamText('');
    const preferred = selectedAI === 'auto' ? undefined : selectedAI;
    await streamAIContent(prompt, { onChunk: (text) => setAiStreamText(prev => prev + text), onComplete: () => setAiLoading(false), onError: (error) => { setAiStreamText('Erro: ' + error.message); setAiLoading(false); } }, getGeminiKey(), getGroqKey(), preferred);
  };

  const findDuplicate = (front: string, materia: string) => {
    const normalizedFront = normalizeText(front);
    return cards.find(card => {
      // Ignora o próprio card se estiver editando
      if (editingId && card.id === editingId) return false;
      if (card.materia !== materia) return false;
      return getSimilarity(normalizedFront, normalizeText(card.front)) > similarityThreshold;
    });
  };

  const handleEdit = (card: LocalFlashcard) => {
    setNewCard({
      materia: card.materia,
      assunto: card.assunto || '',
      front: card.front,
      back: card.back
    });
    setEditingId(card.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setNewCard({ front: '', back: '', materia: '', assunto: '' });
    setEditingId(null);
  };

  const clearForm = () => {
    setNewCard({ front: '', back: '', materia: '', assunto: '' });
    setSaveMessage(null);
  }

  const saveOrUpdateCard = async () => {
    if (!newCard.front.trim() || !newCard.back.trim() || !newCard.materia) { alert('Preencha todos os campos obrigatórios'); return; }
    
    const duplicate = findDuplicate(newCard.front, newCard.materia);
    if (duplicate) { 
        alert('Flashcard duplicado detectado! Verifique o card destacado abaixo.'); 
        setDuplicateWarningId(duplicate.id);
        
        // Scroll até o card duplicado se estiver visível
        setTimeout(() => {
            const el = document.getElementById(`card-${duplicate.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        // Remove o alerta após 3 segundos
        setTimeout(() => setDuplicateWarningId(null), 3000);
        return; 
    }
    
    setSaveMessage(null);
    try {
      if (editingId) {
        // UPDATE
        const { error } = await supabase.from('flashcards').update({
            materia: newCard.materia,
            assunto: newCard.assunto,
            front: newCard.front,
            back: newCard.back
        }).eq('id', editingId);
        
        if (error) throw error;
        alert('Flashcard atualizado!');
        cancelEdit();
      } else {
        // INSERT
        const userId = (await (supabase.auth as any).getUser()).data.user?.id;
        if (!userId) throw new Error('Usuário não autenticado');
        const { error } = await supabase.from('flashcards').insert([{ 
            user_id: userId, 
            materia: newCard.materia, 
            assunto: newCard.assunto, 
            front: newCard.front, 
            back: newCard.back, 
            status: 'novo' as LocalFlashcard['status'] 
        }]);
        if (error) throw error;
        
        // MANTÉM MATÉRIA E ASSUNTO, LIMPA APENAS O CONTEÚDO
        // AQUI ESTÁ A LÓGICA DE PERSISTÊNCIA QUE VOCÊ PEDIU
        setNewCard(prev => ({ ...prev, front: '', back: '' }));
        setSaveMessage("Salvo! Campos mantidos para próximo card.");
        setTimeout(() => setSaveMessage(null), 3000);
      }
      loadFlashcards();
    } catch (error: any) { alert('Erro: ' + error.message); }
  };

  const updateCardStatus = async (id: string, status: LocalFlashcard['status']) => {
    try { const { error } = await supabase.from('flashcards').update({ status }).eq('id', id); if (error) throw error; loadFlashcards(); } catch (error) { console.error(error); }
  };

  const deleteCard = async (id: string) => {
    if (!confirm('Excluir este flashcard?')) return;
    try { const { error } = await supabase.from('flashcards').delete().eq('id', id); if (error) throw error; loadFlashcards(); } catch (error) { console.error(error); }
  };

  // SMART SHUFFLE: Algoritmo para evitar matérias repetidas consecutivas
  const smartShuffle = (inputCards: LocalFlashcard[]) => {
    // 1. Agrupar por matéria
    const groups: Record<string, LocalFlashcard[]> = {};
    inputCards.forEach(c => {
        if (!groups[c.materia]) groups[c.materia] = [];
        groups[c.materia].push(c);
    });

    // 2. Embaralhar dentro dos grupos (Randomização interna)
    Object.keys(groups).forEach(key => {
        groups[key] = groups[key].sort(() => Math.random() - 0.5);
    });

    const result: LocalFlashcard[] = [];
    let lastMateria: string | null = null;
    let remainingCount = inputCards.length;

    while (remainingCount > 0) {
        // Matérias que ainda têm cards disponíveis
        const availableMaterias = Object.keys(groups).filter(k => groups[k].length > 0);
        
        // Tenta filtrar matérias diferentes da última usada
        let candidates = availableMaterias.filter(m => m !== lastMateria);
        
        // Se só sobrou a mesma matéria (fim da fila), é obrigado a usar ela
        if (candidates.length === 0) {
            candidates = availableMaterias;
        }

        if (candidates.length === 0) break; // Should not happen if remainingCount > 0

        // Escolhe uma matéria aleatória dentre os candidatos válidos
        const chosenMateria = candidates[Math.floor(Math.random() * candidates.length)];
        
        // Extrai o card e remove do grupo
        const card = groups[chosenMateria].pop();
        if (card) {
            result.push(card);
            lastMateria = chosenMateria;
            remainingCount--;
        }
    }
    
    return result;
  };

  const startStudySession = () => {
    const filtered = filteredCards.filter(card => card.status === 'novo' || card.status === 'revisando' || card.status === 'pendente');
    if (filtered.length === 0) { alert('Nenhum card para estudar com os filtros atuais!'); return; }
    
    // Usa o Smart Shuffle em vez do sort simples
    const shuffledQueue = smartShuffle([...filtered]);
    
    setStudyQueue(shuffledQueue); 
    setCurrentCardIndex(0); 
    setIsFlipped(false); 
    setAiStreamText("");
    setSessionStats({ learned: 0, review: 0, total: shuffledQueue.length }); // Reset stats
    setShowSessionSummary(false); // Reset summary screen
  };

  const endSession = () => {
      setStudyQueue([]);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setAiStreamText("");
      setShowSessionSummary(false);
  };

  // NOVA FUNÇÃO: Processa o card e avança para o próximo
  const handleCardResult = async (status: LocalFlashcard['status']) => {
    if (!currentCard) return;
    
    // Atualiza estatísticas da sessão local
    if (status === 'aprendendo' || status === 'aprendido') {
        setSessionStats(prev => ({ ...prev, learned: prev.learned + 1 }));
    } else if (status === 'revisando' || status === 'revisar') {
        setSessionStats(prev => ({ ...prev, review: prev.review + 1 }));
    }

    updateCardStatus(currentCard.id, status);
    
    const nextIndex = currentCardIndex + 1;
    if (nextIndex < studyQueue.length) {
        setIsFlipped(false); setAiStreamText(""); setCurrentCardIndex(nextIndex);
    } else {
        // Fim da fila -> Mostrar resumo
        setShowSessionSummary(true);
    }
  };

  const handleSpeak = (text: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR'; utterance.rate = 1.2;
      utterance.onend = () => setIsSpeaking(false); utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true); window.speechSynthesis.speak(utterance);
  };

  // --- NOVA FUNÇÃO DE PROMPT DINÂMICO ---
  const handleAskAI = () => {
    if (!currentCard) return;

    // Determina qual IA será usada para escolher o prompt adequado
    // Se estiver em 'auto', prioriza Gemini (se chave existe), senão Groq
    const effectiveProvider = selectedAI === 'auto'
        ? (geminiKeyAvailable ? 'gemini' : 'groq')
        : selectedAI;

    let prompt = "";

    if (effectiveProvider === 'gemini') {
        // Prompt Otimizado para Gemini: Curto, Objetivo + Mnemônico
        prompt = `Atue como um especialista em concursos públicos.
Seja direto e conciso na sua resposta.
1. Explique o conceito de forma resumida e clara (máximo 3 linhas).
2. Dê 1 exemplo prático curto.
3. Crie um macete mnemônico (sigla, frase ou rima) criativo para ajudar a decorar.

Item: "${currentCard.front}"
Resposta esperada: "${currentCard.back}"`;
    } else {
        // Prompt Padrão para Groq: Detalhado e Didático
        prompt = `Explique de forma detalhada e didática, agindo como um professor especialista na matéria.
        
        Pergunta: "${currentCard.front}"
        Resposta: "${currentCard.back}"`;
    }

    generateAIExplanation(prompt);
  };

  const filteredCards = useMemo(() => {
    let filtered = [...cards];
    if (filterMateria !== 'Todas') filtered = filtered.filter(card => card.materia === filterMateria);
    if (filterStatus !== 'Todos') filtered = filtered.filter(card => card.status === filterStatus);
    return filtered;
  }, [cards, filterMateria, filterStatus]);

  // Lista única de tópicos para o Modal de Preview
  const previewTopics = useMemo(() => {
      if (!previewDeck) return [];
      const topics = new Set<string>();
      previewDeck.cards.forEach((c: any) => {
          if (c.assunto) topics.add(c.assunto);
      });
      return Array.from(topics).sort();
  }, [previewDeck]);

  useEffect(() => { loadFlashcards(); if (activeTab === 'community') loadCommunityDecks(); }, [activeTab]);

  const currentCard = studyQueue[currentCardIndex];

  const getActiveProviderName = () => {
    if (selectedAI === 'gemini') return geminiKeyAvailable ? 'Gemini' : 'Groq (Fallback: Gemini OFF)';
    if (selectedAI === 'groq') return groqKeyAvailable ? 'Groq' : 'Gemini (Fallback: Groq OFF)';
    if (geminiKeyAvailable) return 'Gemini (Auto)';
    if (groqKeyAvailable) return 'Groq (Auto)';
    return 'Nenhum Provedor Ativo';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div><h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Flashcard Master</h1><p className="text-slate-400 mt-2">Domine qualquer conteúdo</p></div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setActiveTab('study')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'study' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}><Brain size={18} className="inline mr-2" /> Estudo</button>
            <button onClick={() => setActiveTab('manage')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'manage' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}><Layers size={18} className="inline mr-2" /> Gerenciar</button>
            <button onClick={() => setActiveTab('community')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'community' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}><Globe size={18} className="inline mr-2" /> Comunidade</button>
          </div>
        </div>

        {activeTab === 'study' && (
          <div className="glass rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/5 pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2"><Brain className="text-cyan-400" /> Modo Estudo</h3>
                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                  <CustomFilterDropdown label="Matéria" value={filterMateria} options={materias} onChange={setFilterMateria} icon={<BookOpen size={14} />} widthClass="w-full md:w-48" />
                  <CustomFilterDropdown label="Status" value={filterStatus} options={statusOptions} onChange={setFilterStatus} icon={<Filter size={14} />} widthClass="w-full md:w-40" />
                  <button onClick={startStudySession} className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"><Zap size={16} /> Iniciar Sessão {studyQueue.length > 0 && '(Smart Shuffle)'}</button>
                </div>
              </div>
              
              <div className="bg-slate-900/40 border border-purple-500/20 rounded-xl p-4 flex flex-col gap-3">
                 <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Sparkles size={20} /></div>
                        <div>
                            <h4 className="text-sm font-bold text-white">Inteligência Artificial</h4>
                            <div className="text-[10px] text-slate-400 flex gap-2 mt-0.5">
                                <span className={geminiKeyAvailable ? 'text-green-400 font-bold' : 'text-slate-600'}>Gemini: {geminiKeyAvailable ? 'ON' : 'OFF'}</span>
                                <span>•</span>
                                <span className={groqKeyAvailable ? 'text-green-400 font-bold' : 'text-slate-600'}>Groq: {groqKeyAvailable ? 'ON' : 'OFF'}</span>
                            </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 bg-slate-950/50 p-1 rounded-lg border border-white/5 w-full md:w-auto justify-center">
                        <button onClick={() => setSelectedAI('auto')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex-1 md:flex-none ${selectedAI === 'auto' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Auto</button>
                        <button onClick={() => setSelectedAI('gemini')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 flex-1 md:flex-none ${selectedAI === 'gemini' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Gemini {!geminiKeyAvailable && <AlertTriangle size={10} className="text-yellow-500"/>}</button>
                        <button onClick={() => setSelectedAI('groq')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 flex-1 md:flex-none ${selectedAI === 'groq' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Groq {!groqKeyAvailable && <AlertTriangle size={10} className="text-yellow-500"/>}</button>
                     </div>
                 </div>
                 
                 <div className="text-[10px] text-slate-400 bg-black/20 p-2 rounded-lg border border-white/5 flex items-start gap-2">
                    <Info size={12} className="text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                        <span className="text-cyan-300 font-bold">Dica:</span> 
                        <span className="ml-1">Use <strong className="text-white">Gemini</strong> para respostas rápidas com <span className="text-yellow-400">macetes mnemônicos</span>. Use <strong className="text-white">Groq</strong> para explicações <span className="text-purple-400">detalhadas</span> estilo aula. "Auto" escolhe o melhor disponível.</span>
                    </div>
                 </div>
              </div>
            </div>

            {studyQueue.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl"><Brain size={48} className="mx-auto text-slate-700 mb-4" /><p className="text-slate-500">Selecione filtros e clique em "Iniciar Sessão"</p><p className="text-slate-600 text-sm mt-2">{filteredCards.length} cards disponíveis</p></div>
            ) : showSessionSummary ? (
                // TELA DE RESUMO DA SESSÃO
                <div className="glass rounded-2xl p-10 text-center animate-in zoom-in-95 border-2 border-slate-800">
                    <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/20">
                        <Trophy size={48} className="text-yellow-400" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-white mb-2">Sessão Finalizada!</h2>
                    <p className="text-slate-400 mb-8">Ótimo trabalho revisando seus flashcards.</p>
                    
                    <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
                        <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                            <div className="text-3xl font-black text-green-400 mb-1">{sessionStats.learned}</div>
                            <div className="text-xs font-bold uppercase text-slate-400 tracking-widest">Aprendidos</div>
                        </div>
                        <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                            <div className="text-3xl font-black text-yellow-400 mb-1">{sessionStats.review}</div>
                            <div className="text-xs font-bold uppercase text-slate-400 tracking-widest">Revisar</div>
                        </div>
                        <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                            <div className="text-3xl font-black text-blue-400 mb-1">{sessionStats.total}</div>
                            <div className="text-xs font-bold uppercase text-slate-400 tracking-widest">Total</div>
                        </div>
                    </div>

                    <button onClick={endSession} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-white/10 shadow-lg">
                        Voltar para o Menu
                    </button>
                </div>
            ) : (
              <div className="perspective-1000">
                {/* GRADE DE PROGRESSO DA SESSÃO */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-lg flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} className="text-green-400" />
                        <span className="font-bold text-green-400 text-sm">{sessionStats.learned}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold hidden md:inline">Aprendidos</span>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg flex items-center justify-center gap-2">
                        <RotateCcw size={16} className="text-yellow-400" />
                        <span className="font-bold text-yellow-400 text-sm">{sessionStats.review}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold hidden md:inline">Revisar</span>
                    </div>
                    <div className="bg-slate-800/50 border border-white/5 p-2 rounded-lg flex items-center justify-center gap-2">
                        <Target size={16} className="text-blue-400" />
                        <span className="font-bold text-blue-400 text-sm">{currentCardIndex + 1}/{studyQueue.length}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold hidden md:inline">Progresso</span>
                    </div>
                </div>

                <div className={`relative w-full h-[450px] md:h-96 cursor-pointer transform-style-3d transition-all duration-500 ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => !isSpeaking && setIsFlipped(!isFlipped)}>
                  {/* Frente */}
                  <div className={`absolute inset-0 backface-hidden bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/30 rounded-2xl p-5 md:p-8 flex flex-col ${isFlipped ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="flex justify-between items-start mb-4 md:mb-6 shrink-0">
                        <div className="flex flex-col gap-1 min-w-0 flex-1 mr-2">
                            <span className="px-3 py-1 bg-cyan-900/50 text-cyan-400 rounded-full text-[10px] md:text-xs font-bold inline-block self-start truncate max-w-full">
                                {currentCard.materia} {currentCard.assunto && `• ${currentCard.assunto}`}
                            </span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={(e) => handleSpeak(currentCard.front, e)} className="p-2 bg-slate-800 rounded-full text-cyan-400 hover:bg-cyan-500/20 transition-all border border-cyan-500/20"><Volume2 size={14}/></button>
                        </div>
                    </div>
                    {/* SCROLLABLE CONTENT */}
                    <div className="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar w-full">
                        <p className="text-lg md:text-3xl text-center text-white leading-relaxed">{currentCard.front}</p>
                    </div>
                    <div className="mt-4 md:mt-6 text-center text-slate-500 text-xs shrink-0">Clique para virar</div>
                  </div>
                  {/* Verso */}
                  <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-purple-900/80 to-purple-800/80 border-2 border-purple-500/30 rounded-2xl p-5 md:p-8 flex flex-col ${isFlipped ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex justify-between items-start mb-4 md:mb-6 shrink-0">
                        <span className="px-3 py-1 bg-purple-900/50 text-purple-400 rounded-full text-[10px] md:text-xs font-bold">Resposta</span>
                        <button onClick={(e) => handleSpeak(currentCard.back, e)} className="p-2 bg-slate-800 rounded-full text-purple-400 hover:bg-purple-500/20 transition-all border border-purple-500/20"><Volume2 size={14}/></button>
                    </div>
                    <div className="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar w-full">
                        <p className="text-base md:text-2xl text-center text-white leading-relaxed">{currentCard.back}</p>
                    </div>
                  </div>
                </div>

                {/* CONTROLS (Mobile Optimized Grid) */}
                <div className="mt-6 flex flex-col gap-3">
                    {/* Row 1: Actions (Main Buttons) */}
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => handleCardResult('revisando')} 
                            className="px-4 py-4 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-500/20 rounded-xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                        >
                            <RotateCcw size={20} /> 
                            <span className="text-xs uppercase tracking-widest">Revisar</span>
                        </button>
                        <button 
                            onClick={() => handleCardResult('aprendendo')} 
                            className="px-4 py-4 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/20 rounded-xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                        >
                            <CheckCircle2 size={20} /> 
                            <span className="text-xs uppercase tracking-widest">Aprendido</span>
                        </button>
                    </div>

                    {/* Row 2: Navigation */}
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => { if (currentCardIndex > 0) { setCurrentCardIndex(currentCardIndex - 1); setIsFlipped(false); setAiStreamText(""); } }} 
                            disabled={currentCardIndex === 0} 
                            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 text-sm border border-white/5 active:bg-slate-700"
                        >
                            <ChevronLeft size={16} /> Anterior
                        </button>
                        <button 
                            onClick={() => { if (currentCardIndex < studyQueue.length - 1) { setCurrentCardIndex(currentCardIndex + 1); setIsFlipped(false); setAiStreamText(""); } }} 
                            disabled={currentCardIndex === studyQueue.length - 1} 
                            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 text-sm border border-white/5 active:bg-slate-700"
                        >
                            Próximo <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="mt-6">
                  <button onClick={handleAskAI} disabled={aiLoading} className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20 active:scale-95"><Sparkles size={18} />{aiLoading ? 'Gerando explicação...' : 'Pedir Explicação à IA'}</button>
                  {(aiStreamText || aiLoading) && (<div className="mt-4 bg-slate-900/80 border border-white/10 rounded-2xl p-6 animate-in slide-in-from-bottom-4"><div className="flex items-center gap-2 mb-2 text-purple-400 font-bold text-xs uppercase tracking-widest"><Sparkles size={12} /> Explicação ({getActiveProviderName()})</div><p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-sm">{aiStreamText}</p></div>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANAGE & COMMUNITY TABS */}
        {activeTab === 'manage' && (
          <div className="glass rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"><h3 className="text-xl font-bold flex items-center gap-2"><Layers className="text-cyan-400" /> Gerenciar Flashcards</h3><div className="flex flex-wrap gap-3"><button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2"><Filter size={14} /> Filtros</button><CustomFilterDropdown label="Matéria" value={filterMateria} options={materias} onChange={setFilterMateria} icon={<BookOpen size={14} />} widthClass="w-48" /></div></div>
            <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        {editingId ? <><Edit2 size={18} className="text-yellow-400"/> Editar Flashcard</> : <><Plus size={18} /> Criar Novo Flashcard</>}
                    </h4>
                    
                    {editingId && (
                        <button onClick={cancelEdit} className="text-xs text-red-400 hover:text-white font-bold flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                            <X size={12} /> Cancelar Edição
                        </button>
                    )}
                </div>
                {saveMessage && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in"><CheckCircle2 size={16}/> {saveMessage}</div>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                            Matéria
                            {!editingId && newCard.materia && <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><Lock size={8} /> Fixado</span>}
                        </label>
                        <select value={newCard.materia} onChange={(e) => setNewCard({...newCard, materia: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"><option value="">Selecione...</option>{materias.filter(m => m !== 'Todas').map(m => <option key={m} value={m}>{m}</option>)}</select>
                    </div>
                    {/* CAMPO ASSUNTO RESTAURADO COM DATALIST */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                            Assunto (Opcional)
                            {!editingId && newCard.assunto && <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><Lock size={8} /> Fixado</span>}
                        </label>
                        <input type="text" list="flashcard-topics" value={newCard.assunto} onChange={(e) => setNewCard({...newCard, assunto: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Ex: Crase, Atos Administrativos..." />
                        {newCard.materia && (
                            <datalist id="flashcard-topics">
                                {availableTopics.map(t => <option key={t} value={t} />)}
                            </datalist>
                        )}
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-400 mb-2">Pergunta</label>
                    <input type="text" value={newCard.front} onChange={(e) => setNewCard({...newCard, front: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Pergunta..." />
                </div>
                <div className="mb-4"><label className="block text-sm font-bold text-slate-400 mb-2">Resposta</label><textarea value={newCard.back} onChange={(e) => setNewCard({...newCard, back: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none min-h-[100px]" placeholder="Resposta..." /></div>
                
                <div className="flex gap-4 items-center mt-6">
                    <button 
                        onClick={saveOrUpdateCard} 
                        className={`flex-1 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white transition-all shadow-lg ${editingId ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-500/20' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'}`}
                    >
                        {editingId ? <RefreshCw size={16} /> : <Save size={16} />} 
                        {editingId ? 'Atualizar Flashcard' : 'Salvar Flashcard'}
                    </button>

                    {/* BOTÃO LIMPAR REPOSICIONADO E EVIDENCIADO */}
                    {!editingId && (newCard.materia || newCard.assunto || newCard.front || newCard.back) && (
                        <button 
                            onClick={clearForm} 
                            className="px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white transition-all bg-red-600/80 hover:bg-red-500 border border-red-500/50 shadow-lg shadow-red-500/10"
                            title="Limpar formulário completo para nova matéria"
                        >
                            <RotateCcw size={16} /> Limpar Tudo
                        </button>
                    )}
                </div>
            </div>
            {filteredCards.length === 0 ? <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl"><p className="text-slate-500">Nada aqui.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredCards.map(card => (<div key={card.id} id={`card-${card.id}`} className={`bg-slate-900/30 border rounded-2xl p-6 transition-all group relative ${duplicateWarningId === card.id ? 'ring-4 ring-red-500 bg-red-500/10 animate-pulse z-10' : ''} ${editingId === card.id ? 'border-yellow-500 ring-1 ring-yellow-500' : 'border-white/5 hover:border-cyan-500/30'}`}><div className="flex justify-between items-start mb-4"><span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-900/30 text-blue-400">{card.status}</span><div className="flex gap-2"><button onClick={() => handleEdit(card)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-900/20"><Edit2 size={14} /></button><button onClick={() => deleteCard(card.id)} className="p-2 bg-red-900/20 hover:bg-red-900/30 rounded-lg text-red-400"><Trash2 size={14} /></button></div></div><h4 className="text-lg font-bold text-white mb-2">{card.front}</h4><p className="text-sm text-slate-400 mb-4 line-clamp-3">{card.back}</p><div className="flex justify-between items-center text-xs text-slate-600"><span>{card.materia}</span><span>{card.assunto}</span></div></div>))}</div>}
          </div>
        )}

        {activeTab === 'community' && (
          <div className="glass rounded-2xl p-6 shadow-xl space-y-6"><div className="flex justify-between items-center"><div><h3 className="text-xl font-bold flex items-center gap-2"><Globe className="text-cyan-400"/> Comunidade</h3><p className="text-slate-400 text-sm">Baixe cards de outros.</p></div><button onClick={() => setShowSqlModal(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold rounded-xl border border-yellow-500/20 flex items-center gap-2"><Database size={14} /> Permissões</button></div>{loadingCommunity ? <div className="text-center py-20"><Loader2 className="animate-spin text-cyan-400 mx-auto" /></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{communityDecks.map(deck => (<div key={deck.materia} className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 hover:border-cyan-500/50 transition-all group relative"><h4 className="text-lg font-bold text-white mb-1">{deck.materia}</h4><p className="text-sm text-slate-400 mb-6">{deck.count} cards disponíveis</p><div className="grid grid-cols-2 gap-2"><button onClick={() => setPreviewDeck(deck)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 border border-white/5"><Eye size={14} /> Espiar</button><button onClick={() => handleImportDeck(deck)} disabled={importingState.loading} className="bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2">{importingState.loading ? <Loader2 className="animate-spin" size={14} /> : <DownloadCloud size={14} />} Clonar Tudo</button></div></div>))}</div>}</div>
        )}
      </div>

      {showSqlModal && (<div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4"><div className="bg-slate-950 border border-slate-700 w-full max-w-3xl rounded-2xl p-8 relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"><button onClick={() => setShowSqlModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button><div className="flex items-center gap-3 mb-4 text-cyan-400"><Database size={32} /><h3 className="text-xl font-bold">Habilitar Compartilhamento</h3></div><p className="text-slate-300 text-sm mb-4">Execute este script no Supabase.</p><div className="relative bg-slate-900 rounded-xl border border-white/10 flex-1 overflow-hidden flex flex-col"><div className="p-4 overflow-y-auto custom-scrollbar flex-1 text-slate-200 text-[11px] font-mono"><pre className="whitespace-pre-wrap">{SQL_FLASHCARDS_POLICY}</pre></div><div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end"><button onClick={() => { navigator.clipboard.writeText(SQL_FLASHCARDS_POLICY); alert("Copiado!"); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"><Copy size={14} /> Copiar SQL</button></div></div></div></div>)}
      
      {/* NOVO MODAL DE PREVIEW REFORMULADO */}
      {previewDeck && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-700 w-full max-w-5xl rounded-2xl p-6 relative shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Eye className="text-cyan-400"/> {previewDeck.materia}</h3>
                        <p className="text-slate-400 text-sm">{previewDeck.count} cards disponíveis para importação</p>
                    </div>
                    <button onClick={() => setPreviewDeck(null)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white"><X size={20}/></button>
                </div>

                {/* Sub-header: Importar Por Assunto */}
                {previewTopics.length > 0 && (
                    <div className="mb-4 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Tag size={12}/> Importar por Assunto (Tópico)</h4>
                        <div className="flex flex-wrap gap-2">
                            {previewTopics.map(topic => (
                                <button 
                                    key={topic}
                                    onClick={() => handleImportTopic(topic)}
                                    disabled={importingState.loading}
                                    className="bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/5 transition-all flex items-center gap-1.5"
                                >
                                    <DownloadCloud size={10} />
                                    {topic}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Card List Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30 rounded-xl border border-white/5 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {previewDeck.cards.map((card: any) => (
                        <div key={card.id} className="bg-slate-900 border border-white/10 p-4 rounded-xl flex flex-col gap-3 group hover:border-cyan-500/30 transition-all relative">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded truncate max-w-[150px]">{card.assunto || 'Geral'}</span>
                                <button 
                                    onClick={() => handleImportSingle(card)}
                                    disabled={importingState.loading}
                                    className="p-1.5 bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white rounded-lg transition-colors border border-white/5"
                                    title="Importar este card"
                                >
                                    <DownloadCloud size={14} />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-xs font-bold text-cyan-500 min-w-[20px] mt-0.5">P:</span>
                                <p className="text-sm text-slate-200 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{card.front}</p>
                            </div>
                            <div className="h-px bg-white/5 w-full" />
                            <div className="flex gap-2">
                                <span className="text-xs font-bold text-purple-500 min-w-[20px] mt-0.5">R:</span>
                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{card.back}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button onClick={() => setPreviewDeck(null)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all">Cancelar</button>
                    <button onClick={handleImportDeck} disabled={importingState.loading} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2">
                        {importingState.loading ? <Loader2 className="animate-spin" size={18} /> : <DownloadCloud size={18} />} 
                        {importingState.loading ? 'Importando...' : 'Importar TUDO (Restantes)'}
                    </button>
                </div>
            </div>
        </div>
      )}
      <style>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }`}</style>
    </div>
  );
};

export default Flashcards;
