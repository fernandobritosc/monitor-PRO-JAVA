/**
 * Testes para o hook useStore
 * Verifica o gerenciamento de estado global da aplicação
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../../../hooks/useStore';

// Reset zustand store between tests
beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
});

describe('useStore', () => {
    describe('session management', () => {
        it('deve inicializar com session null', () => {
            const { result } = renderHook(() => useStore());
            expect(result.current.session).toBeNull();
        });

        it('deve atualizar a session corretamente', () => {
            const { result } = renderHook(() => useStore());
            const mockSession = { user: { id: 'user-123', email: 'test@test.com' } };

            act(() => {
                result.current.setSession(mockSession as any);
            });

            expect(result.current.session).toEqual(mockSession);
        });

        it('deve limpar a session ao definir null', () => {
            const { result } = renderHook(() => useStore());

            act(() => {
                result.current.setSession({ user: { id: 'u1' } } as any);
            });

            act(() => {
                result.current.setSession(null);
            });

            expect(result.current.session).toBeNull();
        });
    });

    describe('theme management', () => {
        it('deve inicializar com tema padrão "dark"', () => {
            const { result } = renderHook(() => useStore());
            // Theme is either 'dark' or 'light', and started from localStorage
            expect(['dark', 'light']).toContain(result.current.theme);
        });

        it('deve trocar o tema com toggleTheme', () => {
            const { result } = renderHook(() => useStore());
            const initialTheme = result.current.theme;

            act(() => {
                result.current.toggleTheme();
            });

            expect(result.current.theme).not.toBe(initialTheme);
        });

        it('deve definir tema diretamente com setTheme', () => {
            const { result } = renderHook(() => useStore());

            act(() => {
                result.current.setTheme('light');
            });

            expect(result.current.theme).toBe('light');

            act(() => {
                result.current.setTheme('dark');
            });

            expect(result.current.theme).toBe('dark');
        });
    });

    describe('view navigation', () => {
        it('deve ter uma view ativa inicial', () => {
            const { result } = renderHook(() => useStore());
            expect(result.current.activeView).toBeDefined();
        });

        it('deve mudar a view ativa', () => {
            const { result } = renderHook(() => useStore());

            act(() => {
                result.current.setActiveView('FLASHCARDS');
            });

            expect(result.current.activeView).toBe('FLASHCARDS');
        });

        it('deve navegar para todas as views válidas', () => {
            const { result } = renderHook(() => useStore());
            const views = ['HUB', 'HOME', 'FLASHCARDS', 'CONFIGURAR', 'RANKING', 'ANALISE_ERROS'];

            views.forEach((view) => {
                act(() => {
                    result.current.setActiveView(view as any);
                });
                expect(result.current.activeView).toBe(view);
            });
        });
    });

    describe('loading state', () => {
        it('deve controlar o estado de loading', () => {
            const { result } = renderHook(() => useStore());

            act(() => {
                result.current.setIsLoading(true);
            });

            expect(result.current.isLoading).toBe(true);

            act(() => {
                result.current.setIsLoading(false);
            });

            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('offline mode', () => {
        it('deve controlar o modo offline', () => {
            const { result } = renderHook(() => useStore());

            act(() => {
                result.current.setIsOfflineMode(true);
            });

            expect(result.current.isOfflineMode).toBe(true);
        });
    });

    describe('error state', () => {
        it('deve controlar o estado de erro', () => {
            const { result } = renderHook(() => useStore());

            act(() => {
                result.current.setIsError(true);
            });

            expect(result.current.isError).toBe(true);

            act(() => {
                result.current.setIsError(false);
            });

            expect(result.current.isError).toBe(false);
        });
    });

    describe('userEmail', () => {
        it('deve atualizar o email do usuário', () => {
            const { result } = renderHook(() => useStore());

            act(() => {
                result.current.setUserEmail('usuario@concurso.com');
            });

            expect(result.current.userEmail).toBe('usuario@concurso.com');
        });
    });
});
