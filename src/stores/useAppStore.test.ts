import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './useAppStore';

// Mock das dependências
vi.mock('../utils/logger', () => ({
  logger: {
    missaoChanged: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../utils/localStorage', () => ({
  saveMissaoAtiva: vi.fn(),
  getMissaoAtiva: vi.fn()
}));

describe('useAppStore', () => {
  beforeEach(() => {
    // Reseta o estado da store antes de cada teste
    useAppStore.getState().reset();
    vi.clearAllMocks();
  });

  it('deve ter o estado inicial correto', () => {
    const state = useAppStore.getState();
    expect(state.missaoAtiva).toBe('Escolha a sua missão');
    expect(state.showOnboarding).toBe(false);
    expect(state.isDarkMode).toBe(true);
    expect(state.isOfflineMode).toBe(false);
    expect(state.userEmail).toBeNull();
  });

  it('deve atualizar a missaoAtiva corretamente', () => {
    const { setMissaoAtiva } = useAppStore.getState();
    setMissaoAtiva('Nova Missão', 'user-123');
    
    expect(useAppStore.getState().missaoAtiva).toBe('Nova Missão');
  });

  it('deve aceitar função de atualização em setMissaoAtiva', () => {
    const { setMissaoAtiva } = useAppStore.getState();
    setMissaoAtiva((prev) => `${prev} Atualizada`);
    
    expect(useAppStore.getState().missaoAtiva).toBe('Escolha a sua missão Atualizada');
  });

  it('deve alternar o modo dark', () => {
    const { toggleDarkMode } = useAppStore.getState();
    const initialMode = useAppStore.getState().isDarkMode;
    
    toggleDarkMode();
    expect(useAppStore.getState().isDarkMode).toBe(!initialMode);
    
    toggleDarkMode();
    expect(useAppStore.getState().isDarkMode).toBe(initialMode);
  });

  it('deve atualizar o email do usuário', () => {
    const { setUserEmail } = useAppStore.getState();
    setUserEmail('test@example.com');
    expect(useAppStore.getState().userEmail).toBe('test@example.com');
    
    setUserEmail(null);
    expect(useAppStore.getState().userEmail).toBeNull();
  });

  it('deve atualizar o estado de onboarding', () => {
    const { setShowOnboarding } = useAppStore.getState();
    setShowOnboarding(true);
    expect(useAppStore.getState().showOnboarding).toBe(true);
  });

  it('deve atualizar o modo offline', () => {
    const { setIsOfflineMode } = useAppStore.getState();
    setIsOfflineMode(true);
    expect(useAppStore.getState().isOfflineMode).toBe(true);
  });

  it('deve resetar o estado para os valores padrão', () => {
    const store = useAppStore.getState();
    
    store.setMissaoAtiva('Outra Missão');
    store.setUserEmail('user@test.com');
    store.setIsOfflineMode(true);
    
    store.reset();
    
    const newState = useAppStore.getState();
    expect(newState.missaoAtiva).toBe('Escolha a sua missão');
    expect(newState.userEmail).toBeNull();
    expect(newState.isOfflineMode).toBe(false);
  });
});
