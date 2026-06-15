import { useState, useEffect, useRef, type MouseEvent } from 'react';
import { getGeminiKey } from '../services/supabase';
import { handlePlayRevisionAudio, generatePodcastAudio } from '../services/aiService';
import { Flashcard } from '../types';

interface UseAudioFlashcardsProps {
  currentCard: Flashcard | undefined;
  aiStreamText: string;
  currentCardIndex: number;
  activeTab: string;
  onPodcastGenerated: (audioId: string) => void;
}

export const useAudioFlashcards = ({ currentCard, aiStreamText, currentCardIndex, activeTab, onPodcastGenerated }: UseAudioFlashcardsProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPlayingNeural, setIsPlayingNeural] = useState(false);
  const [stopNeural, setStopNeural] = useState<(() => void) | null>(null);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastStatus, setPodcastStatus] = useState("");

  const handleSpeak = (text: string, e: MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.2;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

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
    const cancel = await generatePodcastAudio(aiStreamText, audioIdToUse, key,
      (status: string) => setPodcastStatus(status),
      () => { setIsPlayingNeural(true); setPodcastStatus("No ar!"); onPodcastGenerated(audioIdToUse); },
      () => { setIsPlayingNeural(false); setIsGeneratingPodcast(false); setPodcastStatus(""); },
      (err: string) => { alert(err); setIsGeneratingPodcast(false); }
    );
    setStopNeural(() => cancel);
  };

  const stopNeuralRef = useRef(stopNeural);
  stopNeuralRef.current = stopNeural;

  useEffect(() => {
    return () => {
      stopNeuralRef.current?.();
      setIsPlayingNeural(false);
      setIsGeneratingPodcast(false);
    };
  }, [currentCardIndex, activeTab]);

  return {
    isSpeaking,
    isPlayingNeural,
    stopNeural,
    isGeneratingPodcast,
    podcastStatus,
    handleSpeak,
    handlePlayNeural,
    handlePodcastDuo,
  };
};
