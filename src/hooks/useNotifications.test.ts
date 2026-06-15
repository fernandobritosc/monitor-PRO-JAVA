import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import type { Session } from '@supabase/supabase-js';

const mockSession = { user: { id: 'user-123', email: 'test@test.com' } } as Session;

const mockNotifications = [
  { id: 'notif-1', user_id: 'user-123', read: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 'notif-2', user_id: 'user-123', read: true, created_at: '2024-01-02T00:00:00Z' },
  { id: 'notif-3', user_id: 'user-123', read: false, created_at: '2024-01-03T00:00:00Z' },
];

vi.mock('../services/queries', () => ({
  notificationsQueries: {
    getByUser: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
  },
}));

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchData on mount: should call getByUser with user ID and set notifications', async () => {
    const { notificationsQueries } = await import('../services/queries');
    vi.mocked(notificationsQueries.getByUser).mockResolvedValue(mockNotifications);

    const { result } = renderHook(() => useNotifications(mockSession));

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(3);
      expect(result.current.notifications[0].id).toBe('notif-1');
    });

    expect(notificationsQueries.getByUser).toHaveBeenCalledWith('user-123');
  });

  it('fetchData on mount: should compute unreadCount correctly', async () => {
    const { notificationsQueries } = await import('../services/queries');
    vi.mocked(notificationsQueries.getByUser).mockResolvedValue(mockNotifications);

    const { result } = renderHook(() => useNotifications(mockSession));

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2);
    });
  });

  it('markAsRead with id: should call markAsRead with the id', async () => {
    const { notificationsQueries } = await import('../services/queries');
    vi.mocked(notificationsQueries.getByUser).mockResolvedValue(mockNotifications);
    vi.mocked(notificationsQueries.markAsRead).mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotifications(mockSession));

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(3);
    });

    await act(async () => {
      await result.current.markAsRead('notif-1');
    });

    expect(notificationsQueries.markAsRead).toHaveBeenCalledWith('notif-1');
  });

  it('markAsRead without id: should call markAllAsRead', async () => {
    const { notificationsQueries } = await import('../services/queries');
    vi.mocked(notificationsQueries.getByUser).mockResolvedValue(mockNotifications);
    vi.mocked(notificationsQueries.markAllAsRead).mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotifications(mockSession));

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(3);
    });

    await act(async () => {
      await result.current.markAsRead();
    });

    expect(notificationsQueries.markAllAsRead).toHaveBeenCalledWith('user-123');
  });

  it('markAsRead: should refetch data after marking', async () => {
    const { notificationsQueries } = await import('../services/queries');
    vi.mocked(notificationsQueries.getByUser).mockResolvedValue(mockNotifications);
    vi.mocked(notificationsQueries.markAsRead).mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotifications(mockSession));

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(3);
    });

    // After markAsRead, it should call getByUser again
    vi.mocked(notificationsQueries.getByUser).mockClear();

    await act(async () => {
      await result.current.markAsRead('notif-1');
    });

    expect(notificationsQueries.getByUser).toHaveBeenCalledWith('user-123');
  });

  it('subscribe on mount: should call notificationsQueries.subscribe', async () => {
    const { notificationsQueries } = await import('../services/queries');
    vi.mocked(notificationsQueries.getByUser).mockResolvedValue(mockNotifications);

    renderHook(() => useNotifications(mockSession));

    await waitFor(() => {
      expect(notificationsQueries.subscribe).toHaveBeenCalled();
    });

    expect(notificationsQueries.subscribe).toHaveBeenCalledTimes(1);
    expect(typeof vi.mocked(notificationsQueries.subscribe).mock.calls[0][0]).toBe('function');
  });

  it('unsubscribe on unmount: should call unsubscribe', async () => {
    const { notificationsQueries } = await import('../services/queries');
    vi.mocked(notificationsQueries.getByUser).mockResolvedValue(mockNotifications);

    const unsubscribeMock = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (notificationsQueries.subscribe as any).mockReturnValue({ unsubscribe: unsubscribeMock });

    const { unmount } = renderHook(() => useNotifications(mockSession));

    await waitFor(() => {
      expect(notificationsQueries.subscribe).toHaveBeenCalled();
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('should not fetch data when session is null', async () => {
    const { notificationsQueries } = await import('../services/queries');

    const { result } = renderHook(() => useNotifications(null));

    expect(notificationsQueries.getByUser).not.toHaveBeenCalled();
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should handle getByUser returning empty array', async () => {
    const { notificationsQueries } = await import('../services/queries');
    vi.mocked(notificationsQueries.getByUser).mockResolvedValue([]);

    const { result } = renderHook(() => useNotifications(mockSession));

    await waitFor(() => {
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });
});
