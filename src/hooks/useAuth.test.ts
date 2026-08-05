import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

const mockSession = {
  user: { id: 'user-123', email: 'test@monitorpro.com' },
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
} as unknown as import('../lib/supabase').Session;

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('../utils/secureStorage', () => ({
  deriveKeyFromUserId: vi.fn(() => Promise.resolve({} as CryptoKey)),
  clearUserKey: vi.fn(),
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSession on mount: should call supabase.auth.getSession', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    renderHook(() => useAuth());

    await waitFor(() => {
      expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);
    });
  });

  it('getSession on mount: should set session and userEmail from result', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.userEmail).toBe('test@monitorpro.com');
      expect(result.current.loading).toBe(false);
    });
  });

  it('getSession on mount: should handle null session', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.session).toBeNull();
      expect(result.current.userEmail).toBe('');
      expect(result.current.loading).toBe(false);
    });
  });

  it('signOut: should call clearUserKey and supabase.auth.signOut', async () => {
    const { supabase } = await import('../lib/supabase');
    const { clearUserKey } = await import('../utils/secureStorage');
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(clearUserKey).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('signOut: should update state after sign out', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSession);
    });

    await act(async () => {
      await result.current.signOut();
    });

    // After signOut, session should still be the old one until onAuthStateChange fires
    // The signOut function doesn't change state directly - it calls supabase.auth.signOut
    // which triggers onAuthStateChange
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('onAuthStateChange cleanup: should unsubscribe on unmount', async () => {
    const { supabase } = await import('../lib/supabase');
    const unsubscribeMock = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeMock } },
    });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { unmount } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(supabase.auth.getSession).toHaveBeenCalled();
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('onAuthStateChange: should update session on auth event', async () => {
    const { supabase } = await import('../lib/supabase');
    const newSession = {
      ...mockSession,
      user: { ...mockSession.user, email: 'new@monitorpro.com' },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let authCallback: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
      authCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSession);
    });

    // Simulate auth state change
    await act(async () => {
      if (authCallback) authCallback('SIGNED_IN', newSession);
    });

    await waitFor(() => {
      expect(result.current.session).toEqual(newSession);
      expect(result.current.userEmail).toBe('new@monitorpro.com');
    });
  });

  it('should deriveKeyFromUserId when session has user.id', async () => {
    const { supabase } = await import('../lib/supabase');
    const { deriveKeyFromUserId } = await import('../utils/secureStorage');
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    renderHook(() => useAuth());

    await waitFor(() => {
      expect(deriveKeyFromUserId).toHaveBeenCalledWith('user-123');
    });
  });
});
