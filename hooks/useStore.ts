import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ViewType } from '../types';

interface UserSettings {
    theme: 'dark' | 'light';
    notifications: boolean;
}

interface Mission {
    id: string;
    title: string;
    completed: boolean;
}

interface AppStore {
    // Session / User
    userEmail: string;
    setUserEmail: (email: string) => void;
    session: any | null;
    setSession: (session: any | null) => void;

    // UI State
    activeView: ViewType;
    setActiveView: (view: ViewType) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    theme: 'dark' | 'light';
    setTheme: (theme: 'dark' | 'light') => void;
    toggleTheme: () => void;

    // Sync / Offline State
    isOfflineMode: boolean;
    setIsOfflineMode: (offline: boolean) => void;
    isError: boolean;
    setIsError: (error: boolean) => void;

    // Missions
    missaoAtiva: string;
    setMissaoAtiva: (missao: string) => void;
}

export const useStore = create<AppStore>()(
    persist(
        (set) => ({
            userEmail: '',
            setUserEmail: (email) => set({ userEmail: email }),
            session: null,
            setSession: (session) => set({ session }),

            activeView: 'HUB',
            setActiveView: (view) => set({ activeView: view }),

            isLoading: true,
            setIsLoading: (loading) => set({ isLoading: loading }),

            theme: 'dark',
            setTheme: (theme) => set({ theme }),
            toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

            isOfflineMode: false,
            setIsOfflineMode: (offline) => set({ isOfflineMode: offline }),
            isError: false,
            setIsError: (error) => set({ isError: error }),

            missaoAtiva: '',
            setMissaoAtiva: (missao) => set({ missaoAtiva: missao }),
        }),
        {
            name: 'monitor-pro-state',
            partialize: (state) => ({
                activeView: state.activeView,
                theme: state.theme,
                userEmail: state.userEmail,
                missaoAtiva: state.missaoAtiva,
            }),
        }
    )
);
