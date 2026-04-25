import { create } from 'zustand';

export type TimerMode = 'stopwatch' | 'pomodoro';

interface TimerState {
  seconds: number;
  isRunning: boolean;
  mode: TimerMode;
  pomodoroMinutes: number;
  isVisible: boolean;
  showSettings: boolean;
  startTime: number | null; // Timestamp de quando o timer começou a rodar
  baseSeconds: number;      // Segundos acumulados antes do último start
  
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
  pomodoroMinutes: 30,
  isVisible: false,
  showSettings: false,
  startTime: null,
  baseSeconds: 0,

  start: () => set({ 
    isRunning: true,
    startTime: Date.now()
  }),

  pause: () => {
    const { isRunning, startTime, baseSeconds, mode, seconds } = get();
    if (!isRunning) return;

    // Quando pausa, salvamos o tempo atual como a nova base
    set({ 
      isRunning: false, 
      startTime: null,
      baseSeconds: seconds
    });
  },

  reset: () => set((state) => ({ 
    seconds: state.mode === 'pomodoro' ? state.pomodoroMinutes * 60 : 0, 
    baseSeconds: state.mode === 'pomodoro' ? state.pomodoroMinutes * 60 : 0,
    isRunning: false,
    startTime: null
  })),

  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
  setShowSettings: (show) => set({ showSettings: show }),

  setMode: (mode) => set((state) => {
    const initialSeconds = mode === 'pomodoro' ? state.pomodoroMinutes * 60 : 0;
    return { 
      mode, 
      seconds: initialSeconds,
      baseSeconds: initialSeconds,
      isRunning: false,
      startTime: null,
      showSettings: false
    };
  }),

  setPomodoroMinutes: (mins) => set((state) => {
    const seconds = state.mode === 'pomodoro' ? mins * 60 : state.seconds;
    return { 
      pomodoroMinutes: mins,
      seconds: seconds,
      // Se mudar o tempo enquanto rodando, reiniciamos a base para o novo tempo
      startTime: state.isRunning ? Date.now() : state.startTime,
      baseSeconds: state.isRunning ? seconds : (state.mode === 'pomodoro' ? mins * 60 : state.baseSeconds)
    };
  }),

  tick: () => set((state) => {
    if (!state.isRunning || !state.startTime) return {};

    const elapsedMs = Date.now() - state.startTime;
    const elapsedSecs = Math.floor(elapsedMs / 1000);

    if (state.mode === 'stopwatch') {
      const newSeconds = state.baseSeconds + elapsedSecs;
      // Só atualiza o estado se o segundo mudou para evitar re-renders inúteis
      if (newSeconds === state.seconds) return {};
      return { seconds: newSeconds };
    } else {
      const newSeconds = state.baseSeconds - elapsedSecs;
      if (newSeconds <= 0) {
        return { seconds: 0, isRunning: false, startTime: null, baseSeconds: 0 };
      }
      if (newSeconds === state.seconds) return {};
      return { seconds: newSeconds };
    }
  }),
}));
