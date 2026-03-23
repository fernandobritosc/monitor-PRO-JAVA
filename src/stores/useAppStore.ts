import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveMissaoAtiva } from '../utils/localStorage';
import { logger } from '../utils/logger';

interface AppState {
  // UI State
  missaoAtiva: string;
  showOnboarding: boolean;
  backgroundSyncing: boolean;
  isOfflineMode: boolean;
  userEmail: string | null;
  isDarkMode: boolean;
  
  // Actions
  setMissaoAtiva: (newMissao: string | ((prev: string) => string), userId?: string) => void;
  setShowOnboarding: (show: boolean) => void;
  setBackgroundSyncing: (syncing: boolean) => void;
  setIsOfflineMode: (offline: boolean) => void;
  setUserEmail: (email: string | null) => void;
  toggleDarkMode: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      missaoAtiva: 'Escolha a sua missão',
      showOnboarding: false,
      backgroundSyncing: false,
      isOfflineMode: false,
      userEmail: null,
      isDarkMode: true,

      setMissaoAtiva: (newMissao, userId) => {
        const prev = get().missaoAtiva;
        const finalMissao = typeof newMissao === 'function' ? newMissao(prev) : newMissao;
        
        if (finalMissao !== prev) {
          logger.missaoChanged(prev, finalMissao, userId, 'manual');
          saveMissaoAtiva(finalMissao, userId);
          set({ missaoAtiva: finalMissao });
        }
      },

      setShowOnboarding: (show) => set({ showOnboarding: show }),
      setBackgroundSyncing: (syncing) => set({ backgroundSyncing: syncing }),
      setIsOfflineMode: (offline) => set({ isOfflineMode: offline }),
      setUserEmail: (email) => set({ userEmail: email }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      reset: () => set((state) => ({
        // missaoAtiva NÃO é resetada — preserva entre recarregamentos
        showOnboarding: false,
        backgroundSyncing: false,
        isOfflineMode: false,
        userEmail: null,
        isDarkMode: state.isDarkMode, // preserva o tema também
      }))
    }),
    {
      name: 'app-storage',
    }
  )
);
