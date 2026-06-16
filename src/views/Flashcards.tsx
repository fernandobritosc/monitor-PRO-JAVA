import React, { useState, useEffect, useRef } from 'react';
import { useFlashcards } from '../hooks/useFlashcards';
import {
  Zap, Layers, Brain, Loader2, BookOpen, X, DownloadCloud,
  Database, Copy, Sparkles, Volume2, ChevronLeft, ChevronRight,
  Tag, Mic2, RefreshCw, FileText, ArrowRightLeft
} from 'lucide-react';
import { FlashcardsTabs } from '../components/features/flashcards/FlashcardsTabs';
import { StudyFilterBar } from '../components/features/flashcards/StudyFilterBar';
import { CardResultButtons } from '../components/features/flashcards/CardResultButtons';
import { NeuralLab } from '../components/features/flashcards/NeuralLab';
import { FlashcardForm } from '../components/features/flashcards/FlashcardForm';
import { FlashcardGrid } from '../components/features/flashcards/FlashcardGrid';
import { CommunityDeckSection } from '../components/features/flashcards/CommunityDeckSection';
import { SessionSummary } from '../components/shared/SessionSummary';
import { EditalMateria } from '../types';
import { CustomFilterDropdown } from '../components/shared/CustomFilterDropdown';
import ImportTxtModal from '../components/features/flashcards/ImportTxtModal';
import MissionImportModal from '../components/features/flashcards/MissionImportModal';
import { useSession } from '../hooks/useSession';
import { useEditais } from '../hooks/queries/useEditais';
import { useAppStore } from '../stores/useAppStore';
import { SQL_FLASHCARDS_POLICY } from '../constants/flashcards';
import { logger } from '../utils/logger';

const Flashcards: React.FC<{ missaoAtiva?: string; editais?: EditalMateria[] }> = ({ missaoAtiva: missaoAtivaProps, editais: editaisProps }) => {
  const { userId } = useSession();
  const { editais: editaisQuery } = useEditais(userId);
  const missaoAtivaStore = useAppStore(state => state.missaoAtiva);
  const editais = editaisProps ?? editaisQuery ?? [];
  const missaoAtiva = missaoAtivaProps ?? missaoAtivaStore ?? '';
  const {
    activeTab, setActiveTab, loadingCommunity, communityDecks,
    showSqlModal, setShowSqlModal, previewDeck, setPreviewDeck, importingState,
    selectedAI, setSelectedAI, studyQueue, currentCardIndex, setCurrentCardIndex,
    isFlipped, setIsFlipped, aiStreamText, followUpQuery, setFollowUpQuery,
    aiLoading, mnemonicText, mnemonicLoading, extraFormat, extraContent, extraLoading,
    filterMateria, setFilterMateria, filterAssunto, setFilterAssunto,
    filterStatus, setFilterStatus, filterPodcast, setFilterPodcast,
    sessionStats, showSessionSummary, editingId, newCard, setNewCard,
    saveMessage, duplicateWarningId, isSpeaking, geminiKeyAvailable,
    groqKeyAvailable, isGeneratingPdf, podcastCache, isSyncing, isPlayingNeural,
    isGeneratingPodcast, podcastStatus, activeAiTool, setActiveAiTool,
    materias, assuntoOptions, statusOptions, availableTopics, currentCard,
    importCards, handleImportDeck, handleImportTopic,
    handleImportSingle, generateAIExplanation, handleGenerateMnemonic,
    handleGenerateExtraFormat, handleEdit, cancelEdit, clearForm, saveOrUpdateCard,
    deleteCard, startStudySession, endSession, handleCardResult, handleSpeak,
    handlePlayNeural, handlePodcastDuo, handleSendFollowUp, filteredCards,
    previewTopics, generatePDF, syncPodcastCache, getActiveProviderName, handleExportLabPDF,
    otherMissionsWithCards, fetchCardsFromMission,
  } = useFlashcards({ missaoAtiva, editais });

  const [showTopicsDropdown, setShowTopicsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showImportTxtModal, setShowImportTxtModal] = useState(false);
  const [showMissionImportModal, setShowMissionImportModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTopicsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] border border-white/20">
              <Brain size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))]">Flashcards Neural</h1>
              <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" /> Otimização de retenção ativa via IA
              </p>
            </div>
          </div>

          <FlashcardsTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {activeTab === 'study' && (
          <div className="glass-premium rounded-[2.5rem] p-10 shadow-10 border border-[hsl(var(--border))] overflow-visible">

            <StudyFilterBar
              materias={materias}
              filterMateria={filterMateria}
              setFilterMateria={setFilterMateria}
              assuntos={assuntoOptions}
              filterAssunto={filterAssunto}
              setFilterAssunto={setFilterAssunto}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              statusOptions={statusOptions}
              cardsCount={filteredCards.length}
              studyQueue={studyQueue}
              startStudySession={startStudySession}
            />

            {/* AI Selector & Stats */}
            <div className="glass-premium bg-[hsl(var(--accent)/0.03)] border border-[hsl(var(--accent)/0.1)] rounded-[2rem] p-8 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden mt-10">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[hsl(var(--accent)/0.05)] blur-3xl rounded-full"></div>

              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--bg-user-block))] flex items-center justify-center text-[hsl(var(--accent))] shadow-lg border border-[hsl(var(--border))]">
                  <Sparkles size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[hsl(var(--text-bright))] uppercase tracking-widest">Motor Cognitivo</h4>
                  <div className="text-[9px] font-black text-[hsl(var(--text-muted))] flex gap-3 mt-2 uppercase tracking-[0.2em]">
                    <span className={geminiKeyAvailable ? 'text-green-500' : ''}>Gemini: {geminiKeyAvailable ? 'ONLINE' : 'OFFLINE'}</span>
                    <span className="opacity-30">|</span>
                    <span className={groqKeyAvailable ? 'text-green-500' : ''}>Groq: {groqKeyAvailable ? 'ONLINE' : 'OFFLINE'}</span>
                  </div>
                </div>
              </div>

              <div className="flex p-1.5 bg-[hsl(var(--bg-main))]/80 backdrop-blur-sm rounded-xl border border-[hsl(var(--border))] shadow-inner gap-1 overflow-hidden relative z-50">
                {(['auto', 'gemini', 'groq'] as const).map(provider => (
                  <button
                    key={provider}
                    onClick={() => { logger.log(`AI: ${provider}`); setSelectedAI(provider); }}
                    className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 ${selectedAI === provider ? 'bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] shadow-lg opacity-100' : 'text-[hsl(var(--text-muted))] hover:bg-white/5 opacity-70 hover:opacity-100'}`}
                  >
                    {provider === 'auto' ? 'Auto' : provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {studyQueue.length === 0 ? (
              <div className="glass-premium rounded-[2rem] py-24 text-center border-dashed border-2 border-[hsl(var(--border))] mt-10">
                <div className="w-24 h-24 bg-[hsl(var(--bg-user-block))] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl border border-[hsl(var(--border))]">
                  <Brain size={48} className="text-[hsl(var(--text-muted))]" />
                </div>
                <h4 className="text-2xl font-black text-[hsl(var(--text-bright))] uppercase tracking-tighter">Motor de Estudo Inativo</h4>
                <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mt-4 max-w-sm mx-auto leading-relaxed">
                  Configure os filtros acima e inicie o protocolo para carregar os cards neurais.
                </p>
                <p className="text-[9px] font-black text-[hsl(var(--accent))] uppercase tracking-[0.1em] mt-6">{filteredCards.length} cards mapeados em sua base</p>
              </div>
            ) : showSessionSummary ? (
              <SessionSummary sessionStats={sessionStats} endSession={endSession} showSessionSummary={showSessionSummary} />
            ) : (
              <div className="perspective-2000">
                <div className="grid grid-cols-3 gap-6 mb-10 mt-10">
                  <div className="glass-premium bg-green-500/5 border border-green-500/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg">
                    <div className="text-lg font-black text-green-400">{sessionStats.learned}</div>
                    <div className="text-[8px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.15em]">Aprendidos</div>
                  </div>
                  <div className="glass-premium bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg">
                    <div className="text-lg font-black text-yellow-400">{sessionStats.review}</div>
                    <div className="text-[8px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.15em]">Revisar</div>
                  </div>
                  <div className="glass-premium bg-blue-500/5 border border-[hsl(var(--border))] p-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg">
                    <div className="text-lg font-black text-blue-400">{currentCardIndex + 1}<span className="text-[hsl(var(--text-muted))] opacity-30">/</span>{studyQueue.length}</div>
                    <div className="text-[8px] font-black uppercase text-[hsl(var(--text-muted))] tracking-[0.15em]">Progresso</div>
                  </div>
                </div>

                <div className={`relative w-full h-[550px] md:h-96 cursor-pointer transform-style-3d transition-all duration-700 ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => !isSpeaking && setIsFlipped(!isFlipped)}>
                  {/* Front Face */}
                  <div className={`absolute inset-0 backface-hidden glass-premium bg-gradient-to-br from-[hsl(var(--bg-card))] to-[hsl(var(--bg-main))] border-4 border-[hsl(var(--accent)/0.15)] rounded-[2.5rem] p-10 flex flex-col ${isFlipped ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="flex justify-between items-start mb-10">
                      <div className="bg-[hsl(var(--bg-user-block))] px-4 py-2 md:px-5 md:py-2.5 rounded-full border border-[hsl(var(--border))] flex items-center gap-2 md:gap-3 shadow-inner">
                        <BookOpen size={16} className="text-[hsl(var(--accent))] shrink-0" />
                        <span className="text-[10px] md:text-xs font-bold text-[hsl(var(--text-bright))] uppercase tracking-widest truncate max-w-[150px] md:max-w-[250px]">
                          {currentCard.materia} {currentCard.assunto && <span className="text-[hsl(var(--text-muted))] mx-2">//</span>} {currentCard.assunto}
                        </span>
                      </div>
                      <button onClick={(e) => handleSpeak(currentCard.front, e)} className="p-3 bg-[hsl(var(--bg-user-block))] rounded-xl text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--bg-main))] transition-all border border-[hsl(var(--border))] active:scale-95 shadow-lg">
                        <Volume2 size={18} />
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center px-2 md:px-6 overflow-y-auto custom-scrollbar">
                      <p className="text-lg md:text-4xl font-black text-[hsl(var(--text-bright))] text-center leading-[1.4] tracking-tight uppercase my-auto max-h-full py-4">
                        {currentCard.front}
                      </p>
                    </div>
                    <div className="mt-10 flex flex-col items-center gap-4">
                      {currentCard.author_name && (
                        <span className="text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest opacity-40">Autor: {currentCard.author_name}</span>
                      )}
                      <div className="flex items-center gap-3 text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.25em] animate-pulse">
                        <ArrowRightLeft size={12} /> Clique para Inverter
                      </div>
                    </div>
                  </div>

                  {/* Back Face */}
                  <div className={`absolute inset-0 backface-hidden rotate-y-180 glass-premium bg-gradient-to-br from-[hsl(var(--accent)/0.1)] to-[hsl(var(--accent)/0.05)] border-4 border-[hsl(var(--accent)/0.3)] rounded-[2.5rem] p-10 flex flex-col ${isFlipped ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex justify-between items-start mb-10">
                      <span className="bg-[hsl(var(--accent))] text-[hsl(var(--bg-main))] px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[hsl(var(--accent)/0.2)]">Resposta Consolidada</span>
                      <button onClick={(e) => handleSpeak(currentCard.back, e)} className="p-3 bg-[hsl(var(--bg-user-block))] rounded-xl text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--bg-main))] transition-all border border-[hsl(var(--border))] active:scale-95 shadow-lg">
                        <Volume2 size={18} />
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center px-2 md:px-6 overflow-y-auto custom-scrollbar">
                      <p className="text-base md:text-3xl font-bold text-[hsl(var(--text-bright))] text-center leading-relaxed my-auto max-h-full py-4">
                        {currentCard.back}
                      </p>
                    </div>
                    <div className="mt-10 flex flex-col items-center gap-4">
                      <div className="flex items-center gap-3 text-[9px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.25em]">
                        <ArrowRightLeft size={12} /> Voltar para Pergunta
                      </div>
                    </div>
                  </div>
                </div>

                {/* Study Actions */}
                <div className="mt-10 flex flex-col gap-5">
                  <CardResultButtons onResult={handleCardResult} />

                  <div className="grid grid-cols-2 gap-6">
                    <button onClick={() => { if (currentCardIndex > 0) { setCurrentCardIndex(currentCardIndex - 1); } }} disabled={currentCardIndex === 0} className="px-8 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--bg-main))] disabled:opacity-30 text-[hsl(var(--text-muted))] hover:text-white rounded-2xl font-black uppercase tracking-widest transition-all border border-[hsl(var(--border))] flex items-center justify-center gap-3 text-[10px] active:scale-95">
                      <ChevronLeft size={18} /> Anterior
                    </button>
                    <button onClick={() => { if (currentCardIndex < studyQueue.length - 1) { setCurrentCardIndex(currentCardIndex + 1); } }} disabled={currentCardIndex === studyQueue.length - 1} className="px-8 py-4 bg-[hsl(var(--bg-user-block))] hover:bg-[hsl(var(--bg-main))] disabled:opacity-30 text-[hsl(var(--text-muted))] hover:text-white rounded-2xl font-black uppercase tracking-widest transition-all border border-[hsl(var(--border))] flex items-center justify-center gap-3 text-[10px] active:scale-95">
                      Próximo <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <NeuralLab
                  currentCard={currentCard}
                  aiStreamText={aiStreamText}
                  setAiStreamText={setFollowUpQuery}
                  aiLoading={aiLoading}
                  generateAIExplanation={generateAIExplanation}
                  mnemonicText={mnemonicText}
                  setMnemonicText={setFollowUpQuery}
                  mnemonicLoading={mnemonicLoading}
                  handleGenerateMnemonic={handleGenerateMnemonic}
                  extraFormat={extraFormat}
                  setExtraFormat={setFollowUpQuery}
                  extraContent={extraContent}
                  setExtraContent={setFollowUpQuery}
                  extraLoading={extraLoading}
                  followUpQuery={followUpQuery}
                  setFollowUpQuery={setFollowUpQuery}
                  handleSendFollowUp={handleSendFollowUp}
                  activeAiTool={activeAiTool}
                  setActiveAiTool={setActiveAiTool}
                  handleGenerateExtraFormat={handleGenerateExtraFormat}
                  showPodcastPanel={false}
                  setShowPodcastPanel={() => {}}
                  handleGeneratePodcast={() => {}}
                  isGeneratingPodcast={isGeneratingPodcast}
                  podcastUrl=""
                  podcastDisplayTitle=""
                  syncPodcastCache={syncPodcastCache}
                  isPlayingNeural={isPlayingNeural}
                  handlePlayNeural={handlePlayNeural}
                  handlePodcastDuo={handlePodcastDuo}
                  podcastStatus={podcastStatus}
                  isSpeaking={isSpeaking}
                  getActiveProviderName={getActiveProviderName}
                  handleExportLabPDF={handleExportLabPDF}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="glass-premium rounded-[2.5rem] p-10 shadow-2xl space-y-12 border border-[hsl(var(--border))] overflow-visible">

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-[hsl(var(--border))] pb-10">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-[hsl(var(--text-bright))] flex items-center gap-4">
                  <Layers className="text-[hsl(var(--accent))]" /> Inventário Neural
                </h3>
                <p className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.2em] mt-2">Gestão completa de sua base de conhecimento</p>
              </div>

              <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                <CustomFilterDropdown label="Matéria" value={filterMateria} options={materias} onChange={setFilterMateria} icon={<BookOpen size={16} />} widthClass="w-full sm:w-56" />
                <CustomFilterDropdown label="Assunto" value={filterAssunto} options={assuntoOptions} onChange={setFilterAssunto} icon={<Tag size={16} />} widthClass="w-full sm:w-56" />

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <CustomFilterDropdown label="Podcast" value={filterPodcast} options={['Todos', 'Com Podcast', 'Sem Podcast']} onChange={setFilterPodcast} icon={<Mic2 size={16} />} widthClass="flex-1" />
                  <button onClick={syncPodcastCache} disabled={isSyncing} className="p-4 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl hover:bg-white/5 transition-colors text-[hsl(var(--text-muted))] hover:text-white active:scale-95" title="Sincronizar áudios">
                    <RefreshCw size={20} className={isSyncing ? "animate-spin text-[hsl(var(--accent))]" : ""} />
                  </button>
                </div>

                <button
                  onClick={generatePDF}
                  disabled={isGeneratingPdf || filteredCards.length === 0}
                  className="w-full sm:w-auto px-6 py-4 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-muted))] hover:text-white hover:bg-white/5 flex items-center justify-center gap-3 transition-all disabled:opacity-30 active:scale-95"
                >
                  {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  <span>Exportar PDF ({filteredCards.length})</span>
                </button>
                <button
                  onClick={() => setShowMissionImportModal(true)}
                  className="w-full sm:w-auto px-6 py-4 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[hsl(var(--accent))] hover:text-white hover:bg-[hsl(var(--accent)/0.1)] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
                >
                  <Copy size={16} />
                  <span>Reciclar Missão</span>
                </button>
                <button
                  onClick={() => setShowImportTxtModal(true)}
                  className="w-full sm:w-auto px-6 py-4 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-bright))] hover:text-white hover:bg-white/5 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
                >
                  <DownloadCloud size={16} className="text-cyan-400" />
                  <span>Importar em Lote</span>
                </button>
              </div>
            </div>

            <FlashcardForm
              newCard={newCard}
              setNewCard={setNewCard}
              editingId={editingId}
              saveOrUpdateCard={saveOrUpdateCard}
              cancelEdit={cancelEdit}
              editais={editais}
              missaoAtiva={missaoAtiva}
              showTopicsDropdown={showTopicsDropdown}
              setShowTopicsDropdown={setShowTopicsDropdown}
              saveMessage={saveMessage}
              materias={materias}
              availableTopics={availableTopics}
              clearForm={clearForm}
            />

            <div className="space-y-8">
              <h4 className="text-sm font-black text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] flex items-center gap-4">
                Células Mapeadas <span className="w-12 h-px bg-[hsl(var(--border))]"></span> <span className="text-[10px] text-[hsl(var(--accent))]">{filteredCards.length} Unidades</span>
              </h4>

              <FlashcardGrid
                filteredCards={filteredCards}
                handleDeleteCard={deleteCard}
                handleEditCard={handleEdit}
                podcastCache={podcastCache}
                duplicateWarningId={duplicateWarningId}
                editingId={editingId}
              />
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <CommunityDeckSection
            communityDecks={communityDecks}
            importDeck={handleImportDeck}
            loadingCommunity={loadingCommunity}
            previewDeck={previewDeck}
            setPreviewDeck={setPreviewDeck}
            setShowSqlModal={setShowSqlModal}
            importingState={importingState}
            handleImportTopic={handleImportTopic}
            handleImportSingle={handleImportSingle}
            previewTopics={previewTopics}
          />
        )}
      </div>

      {showSqlModal && (<div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4"><div className="bg-slate-950 border border-slate-700 w-full max-w-3xl rounded-2xl p-8 relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"><button onClick={() => setShowSqlModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button><div className="flex items-center gap-3 mb-4 text-cyan-400"><Database size={32} /><h3 className="text-xl font-bold">Habilitar Compartilhamento</h3></div><p className="text-slate-300 text-sm mb-4">Execute este script no Supabase.</p><div className="relative bg-slate-900 rounded-xl border border-white/10 flex-1 overflow-hidden flex flex-col"><div className="p-4 overflow-y-auto custom-scrollbar flex-1 text-slate-200 text-[11px] font-mono"><pre className="whitespace-pre-wrap">{SQL_FLASHCARDS_POLICY}</pre></div><div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end"><button onClick={() => { navigator.clipboard.writeText(SQL_FLASHCARDS_POLICY); alert("Copiado!"); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"><Copy size={14} /> Copiar SQL</button></div></div></div></div>)}

      <ImportTxtModal
        isOpen={showImportTxtModal}
        onClose={() => { setShowImportTxtModal(false); }}
        materias={materias}
        editais={editais}
        missaoAtiva={missaoAtiva}
        importingState={importingState}
        importCards={importCards}
      />

      <MissionImportModal
        isOpen={showMissionImportModal}
        onClose={() => { setShowMissionImportModal(false); }}
        otherMissionsWithCards={otherMissionsWithCards}
        fetchCardsFromMission={fetchCardsFromMission}
        importingState={importingState}
        importCards={importCards}
      />
      <style>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }`}</style>
    </div >
  );
};

export default Flashcards;
