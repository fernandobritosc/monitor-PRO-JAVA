import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStudyRecords } from './useStudyRecords';
import { createElement } from 'react';

const mockRecords = [
  {
    id: 'record-1',
    user_id: 'user-123',
    concurso: 'TRF',
    materia: 'Direito Constitucional',
    assunto: 'Direitos Fundamentais',
    data_estudo: '2024-01-01',
    acertos: 8,
    total: 10,
    taxa: 80,
    tempo: 60,
    rev_24h: false,
    rev_07d: false,
    rev_15d: false,
    rev_30d: false,
  },
  {
    id: 'record-2',
    user_id: 'user-123',
    concurso: 'TRF',
    materia: 'Direito Administrativo',
    assunto: 'Licitações',
    data_estudo: '2024-01-02',
    acertos: 5,
    total: 10,
    taxa: 50,
    tempo: 45,
    rev_24h: false,
    rev_07d: false,
    rev_15d: false,
    rev_30d: false,
  },
];

interface WhereClause {
  equals: ReturnType<typeof vi.fn>;
}

interface DbMock {
  studyRecords: {
    toArray: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    bulkPut: ReturnType<typeof vi.fn>;
    bulkAdd: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    bulkDelete: ReturnType<typeof vi.fn>;
    _whereClause: WhereClause;
    _recordsResult: { toArray: ReturnType<typeof vi.fn> };
  };
}

const mockDb: DbMock = vi.hoisted(() => {
  const recordsResult = {
    toArray: vi.fn().mockResolvedValue([]),
  };
  const whereClause = {
    equals: vi.fn().mockReturnValue(recordsResult),
  };

  return {
    studyRecords: {
      toArray: vi.fn().mockResolvedValue([]),
      where: vi.fn().mockReturnValue(whereClause),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      bulkDelete: vi.fn().mockResolvedValue(undefined),
      _whereClause: whereClause,
      _recordsResult: recordsResult,
    },
  };
});

const mocks = vi.hoisted(() => {
  // Create a reusable channel mock that returns itself from all methods
  function createChannelMock() {
    const channel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
      on: vi.fn(),
      subscribe: vi.fn(),
    };
    channel.on.mockReturnValue(channel);
    channel.subscribe.mockReturnValue(channel);
    return channel;
  }

  return {
    studyRecordsQueries: {
      getByUser: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    supabase: {
      channel: vi.fn(() => createChannelMock()),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock('../../services/offline/db', () => ({
  db: mockDb,
}));

vi.mock('../../services/queries/studyRecords', () => ({
  studyRecordsQueries: mocks.studyRecordsQueries,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: mocks.supabase,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function Wrapper({ children }: { children: any }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useStudyRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { onLine: true });

    // Reset mock defaults to return mockRecords via the where chain
    mockDb.studyRecords._recordsResult.toArray.mockResolvedValue(mockRecords);
    mockDb.studyRecords.toArray.mockResolvedValue(mockRecords);
  });

  it('should fetch data from local DB when userId is provided', async () => {
    const { result } = renderHook(() => useStudyRecords('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDb.studyRecords.where).toHaveBeenCalledWith('user_id');
    expect(mockDb.studyRecords.where().equals).toHaveBeenCalledWith('user-123');
    expect(result.current.studyRecords).toEqual(mockRecords);
  });

  it('should call studyRecordsQueries.getByUser when online', async () => {
    mocks.studyRecordsQueries.getByUser.mockResolvedValue(mockRecords);

    const { result } = renderHook(() => useStudyRecords('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mocks.studyRecordsQueries.getByUser).toHaveBeenCalledWith('user-123');
  });

  it('should not fetch when userId is undefined', async () => {
    const { result } = renderHook(() => useStudyRecords(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.studyRecords).toEqual([]);
    expect(mocks.studyRecordsQueries.getByUser).not.toHaveBeenCalled();
    // The query is not enabled (enabled: !!userId = false), so Dexie should not be queried
    expect(mockDb.studyRecords._recordsResult.toArray).not.toHaveBeenCalled();
  });

  it('should set up Supabase realtime subscription', async () => {
    renderHook(() => useStudyRecords('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mocks.supabase.channel).toHaveBeenCalledWith('schema-db-changes');
    });

    // Get the channel mock that was created
    const channelMock = vi.mocked(mocks.supabase.channel).mock.results[0]?.value;

    expect(channelMock.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'registros_estudos',
        filter: 'user_id=eq.user-123',
      },
      expect.any(Function),
    );

    expect(channelMock.subscribe).toHaveBeenCalled();
  });

  it('should clean up Supabase subscription on unmount', async () => {
    const { unmount } = renderHook(() => useStudyRecords('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mocks.supabase.channel).toHaveBeenCalled();
    });

    // Get the actual channel object that was created by the hoisted factory
    const actualChannel = vi.mocked(mocks.supabase.channel).mock.results[0]?.value;

    unmount();

    expect(mocks.supabase.removeChannel).toHaveBeenCalledWith(actualChannel);
  });

  it('should handle offline mode gracefully', async () => {
    vi.stubGlobal('navigator', { onLine: false });

    const { result } = renderHook(() => useStudyRecords('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should NOT call getByUser when offline
    expect(mocks.studyRecordsQueries.getByUser).not.toHaveBeenCalled();

    // Should still return local data
    expect(result.current.studyRecords).toEqual(mockRecords);
  });
});
