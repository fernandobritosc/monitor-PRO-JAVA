import { create } from 'zustand';

export type TimerMode = 'stopwatch' | 'pomodoro';

interface TimerState {
  seconds: number;
  isRunning: boolean;
  mode: TimerMode;
  pomodoroMinutes: number;
  isVisible: boolean;
  showSettings: boolean;
  
  // Actions
  start: () => void;
  pause: () => void;
  reset: () => void;
  toggleVisibility: () => void;
  setShowSettings: (show: boolean) => void;
  setMode: (mode: TimerMode) => void;
  setPomodoroMinutes: (mins: number) => void;
  tick: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  seconds: 0,
  isRunning: false,
  mode: 'stopwatch',
  pomodoroMinutes: 30, // Padrão solicitado pelo usuário ou comum
  isVisible: false,
  showSettings: false,

  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),
  reset: () => set((state) => ({ 
    seconds: state.mode === 'pomodoro' ? state.pomodoroMinutes * 60 : 0, 
    isRunning: false 
  })),
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
  setShowSettings: (show) => set({ showSettings: show }),
  setMode: (mode) => set((state) => ({ 
    mode, 
    seconds: mode === 'pomodoro' ? state.pomodoroMinutes * 60 : 0,
    isRunning: false,
    showSettings: false
  })),
  setPomodoroMinutes: (mins) => set((state) => ({ 
    pomodoroMinutes: mins,
    seconds: state.mode === 'pomodoro' ? mins * 60 : state.seconds 
  })),
  tick: () => set((state) => {
    if (!state.isRunning) return {};
    if (state.mode === 'stopwatch') {
      return { seconds: state.seconds + 1 };
    } else {
      const nextSeconds = state.seconds - 1;
      if (nextSeconds <= 0) {
        return { seconds: 0, isRunning: false };
      }
      return { seconds: nextSeconds };
    }
  }),
}));
