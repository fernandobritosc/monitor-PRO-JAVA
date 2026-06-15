# Plano: Extrair Hooks de useFlashcards.ts (707 → ~350 linhas)

## Objetivo
Separar as 3 responsabilidades distintas do hook monolítico `useFlashcards.ts` em hooks menores e focados, mantendo a API de retorno idêntica através de composição.

## Estrutura Atual

```
useFlashcards.ts (707 linhas)
├── State declarations (~50 linhas)
├── syncPodcastCache (linhas 71-94)
├── Materias/Assuntos/Status memos (~30 linhas)
├── loadFlashcards / loadCommunityDecks (~50 linhas)
├── importCards + handlers (~80 linhas)
├── saveAiAsset (~25 linhas)
├── generateAIExplanation / mnemonic / extra (~70 linhas)  ← Alvo 1
├── findDuplicate → já extraído para utils
├── Card CRUD (edit, save, delete) (~70 linhas)
├── smartShuffle → já extraído para utils
├── startStudySession / endSession / handleCardResult (~80 linhas)
├── Effects (troca de card, troca de tool, missão) (~50 linhas)
├── handleSpeak / handlePlayNeural / handlePodcastDuo (~30 linhas) ← Alvo 2
├── handleSendFollowUp (~25 linhas)
├── filteredCards / previewTopics / generatePDF (~60 linhas)
├── otherMissionsWithCards / fetchCardsFromMission (~40 linhas)
├── getActiveProviderName / handleExportLabPDF (~105 linhas)
└── return (~25 linhas)
```

## Alvo 1: Extrair `useAIFlashcards.ts` (~120 linhas)

### Responsabilidade
Geração de conteúdo AI para o card atual (explanation, mnemonic, mapa, tabela, fluxo, info) + follow-up.

### Estado para mover
| State | Tipo |
|-------|------|
| `aiStreamText` | string |
| `aiLoading` | boolean |
| `mnemonicText` | string |
| `mnemonicLoading` | boolean |
| `extraFormat` | 'mapa' \| 'fluxo' \| 'tabela' \| 'info' \| null |
| `extraContent` | string |
| `extraLoading` | boolean |
| `followUpQuery` | string |
| `activeAiTool` | enum |
| `aiStreamText` set | string |

### Handlers para mover
- `generateAIExplanation`
- `handleGenerateMnemonic`
- `handleGenerateExtraFormat`
- `handleSendFollowUp`
- `saveAiAsset`

### Props de entrada
```typescript
interface UseAIFlashcardsProps {
  currentCard: Flashcard | undefined;
  studyQueue: Flashcard[];
  currentCardIndex: number;
  setStudyQueue: (queue: Flashcard[]) => void;
  selectedAI: AIProviderName | 'auto';
  geminiKey: string;
  groqKey: string;
}
```

### Effects para mover
- Efeito que carrega assets ao trocar de ferramenta (activeAiTool change)
- Efeito que reseta AI text ao trocar de selectedAI

## Alvo 2: Extrair `useAudioFlashcards.ts` (~50 linhas)

### Responsabilidade
Reprodução de áudio (TTS), podcast duo, estado de reprodução.

### Estado para mover
| State | Tipo |
|-------|------|
| `isSpeaking` | boolean |
| `isPlayingNeural` | boolean |
| `stopNeural` | (() => void) \| null |
| `isGeneratingPodcast` | boolean |
| `podcastStatus` | string |

### Handlers para mover
- `handleSpeak`
- `handlePlayNeural`
- `handlePodcastDuo`

### Props de entrada
```typescript
interface UseAudioFlashcardsProps {
  currentCard: Flashcard | undefined;
  aiStreamText: string;
  currentCardIndex: number;
  activeTab: string;
}
```

## O que Permanece em useFlashcards.ts (~350 linhas)

Após as extrações, o hook principal mantém:

- **Data loading**: `loadFlashcards`, `loadCommunityDecks`, `syncPodcastCache`
- **Import**: `importCards`, `handleImportDeck`, `handleImportTopic`, `handleImportSingle`
- **CRUD**: `handleEdit`, `cancelEdit`, `clearForm`, `saveOrUpdateCard`, `deleteCard`
- **Study session**: `startStudySession`, `endSession`, `handleCardResult`
- **Utility**: `generatePDF`, `handleExportLabPDF`
- **Cross-mission**: `otherMissionsWithCards`, `fetchCardsFromMission`
- **Composição**: chama `useAIFlashcards` e `useAudioFlashcards` internamente, mescla os estados e handlers no return

## Como Fica o Return

```typescript
return {
  // States do próprio hook
  activeTab, setActiveTab, cards, loading, ...
  // States mesclados dos sub-hooks
  ...aiFlashcards, // aiStreamText, aiLoading, ...
  ...audioFlashcards, // isSpeaking, isPlayingNeural, ...
  // Handlers mesclados
  generateAIExplanation, handlePlayNeural, ...
  // Handlers do próprio hook
  loadFlashcards, importCards, handleEdit, ...
};
```

## Verificação
- `npx tsc --noEmit` → zero erros
- `npm run lint` → sem novos erros (apenas pré-existentes)
- Testar rota de estudo: gerar explanation, mnemonic, follow-up
- Testar áudio: TTS, podcast duo
- Testar importação: lote, missão, comunidade
