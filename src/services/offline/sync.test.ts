/**
 * Testes para o Sync Service (sync.ts)
 * Valida a estrutura do syncService e o fluxo básico de sincronização
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock factory ────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  // Dexie db mock
  db: {
    studyRecords: {
      toArray: vi.fn<(...args: unknown[]) => unknown[]>(),
      where: vi.fn<(...args: unknown[]) => { equals: (val: string) => { toArray: () => unknown[]; count: () => number; modify: (fn: unknown) => void }; anyOf: (ids: string[]) => { modify: (fn: unknown) => void }; count: () => number }>(),
      add: vi.fn<(...args: unknown[]) => string>(),
      update: vi.fn<(...args: unknown[]) => void>(),
      clear: vi.fn<(...args: unknown[]) => void>(),
      bulkAdd: vi.fn<(...args: unknown[]) => void>(),
      bulkDelete: vi.fn<(...args: unknown[]) => void>(),
    },
    editais: {
      toArray: vi.fn<(...args: unknown[]) => unknown[]>(),
      where: vi.fn<(...args: unknown[]) => { equals: (val: string) => { toArray: () => unknown[]; count: () => number; modify: (fn: unknown) => void }; anyOf: (ids: string[]) => { modify: (fn: unknown) => void }; count: () => number }>(),
      add: vi.fn<(...args: unknown[]) => string>(),
      update: vi.fn<(...args: unknown[]) => void>(),
      clear: vi.fn<(...args: unknown[]) => void>(),
      bulkAdd: vi.fn<(...args: unknown[]) => void>(),
    },
  },
  studyRecordsQueries: {
    getByUser: vi.fn<(...args: unknown[]) => unknown[]>(),
    upsert: vi.fn<(...args: unknown[]) => unknown[]>(),
  },
  editaisQueries: {
    getByUser: vi.fn<(...args: unknown[]) => unknown[]>(),
    upsert: vi.fn<(...args: unknown[]) => unknown[]>(),
  },
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('./db', () => ({
  db: mocks.db,
}));

vi.mock('../queries/studyRecords', () => ({
  studyRecordsQueries: mocks.studyRecordsQueries,
}));

vi.mock('../queries/editais', () => ({
  editaisQueries: mocks.editaisQueries,
}));

vi.mock('../../utils/logger', () => ({
  logger: mocks.logger,
}));

// ── SUT ─────────────────────────────────────────────────────────
import { syncService } from './sync';
import { db } from './db';
import { studyRecordsQueries } from '../queries/studyRecords';
import { editaisQueries } from '../queries/editais';

// ── Helpers ─────────────────────────────────────────────────────
const whereChain = (items: unknown[] = []) => ({
  equals: vi.fn(() => ({
    toArray: vi.fn<(...args: unknown[]) => unknown[]>().mockResolvedValue(items),
    count: vi.fn<(...args: unknown[]) => number>().mockResolvedValue(items.length),
    modify: vi.fn<(...args: unknown[]) => void>().mockResolvedValue(undefined),
  })),
  anyOf: vi.fn((_ids: string[]) => ({
    modify: vi.fn<(...args: unknown[]) => void>().mockResolvedValue(undefined),
  })),
  count: vi.fn<(...args: unknown[]) => number>().mockResolvedValue(0),
});

// ── Tests ───────────────────────────────────────────────────────
describe('syncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Configura navigator.onLine como true para testes de sync
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true,
    });

    // Mock global crypto.randomUUID
    if (!globalThis.crypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: { randomUUID: vi.fn(() => 'mock-uuid-12345') },
        writable: true,
      });
    } else {
      globalThis.crypto.randomUUID = vi.fn(() => 'mock-uuid-12345') as unknown as () => `${string}-${string}-${string}-${string}-${string}`;
    }
  });

  // ── Test 1: Estrutura do syncService ──
  describe('1. Estrutura do serviço', () => {
    it('deve expor os métodos esperados', () => {
      expect(syncService).toBeDefined();
      expect(typeof syncService.deduplicateLocal).toBe('function');
      expect(typeof syncService.syncPendingAttempts).toBe('function');
      expect(typeof syncService.saveAttempt).toBe('function');
      expect(typeof syncService.syncPendingEditais).toBe('function');
      expect(typeof syncService.saveEdital).toBe('function');
      expect(typeof syncService.safeRefresh).toBe('function');
      expect(syncService._syncing).toBe(false);
    });
  });

  // ── Test 2: saveAttempt salva localmente ──
  describe('2. saveAttempt', () => {
    it('deve adicionar registro no Dexie com syncStatus pending', async () => {
      mocks.db.studyRecords.add.mockResolvedValue('local-id-1' as never);
      mocks.studyRecordsQueries.upsert.mockResolvedValue([]);

      const record = {
        user_id: 'user-1',
        materia: 'Direito Constitucional',
        assunto: 'Direitos Fundamentais',
      };

      await syncService.saveAttempt(record);

      // Verifica se adicionou no Dexie
      expect(mocks.db.studyRecords.add).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          materia: 'Direito Constitucional',
          syncStatus: 'pending',
          lastModified: expect.any(Number),
        }),
      );
    });

    it('deve tentar upsert no Supabase quando online', async () => {
      mocks.db.studyRecords.add.mockResolvedValue('local-id-2' as never);
      mocks.studyRecordsQueries.upsert.mockResolvedValue([{ id: 'local-id-2' }] as never);

      const record = { user_id: 'user-1', materia: 'Matéria A', assunto: 'Assunto B' };
      await syncService.saveAttempt(record);

      expect(mocks.studyRecordsQueries.upsert).toHaveBeenCalled();
      // Deve ter marcado como synced após upsert bem-sucedido
      expect(mocks.db.studyRecords.update).toHaveBeenCalledWith('local-id-2', {
        syncStatus: 'synced',
      });
    });
  });

  // ── Test 3: syncPendingAttempts fluxo básico ──
  describe('3. syncPendingAttempts', () => {
    it('deve sincronizar registros pendentes com sucesso', async () => {
      const pendingRecords = [
        {
          id: 'p1',
          user_id: 'user-1',
          materia: 'Dir. Constitucional',
          assunto: 'Art. 5º',
          acertos: 5,
          total: 10,
          syncStatus: 'pending' as const,
          retryCount: 0,
          lastModified: Date.now(),
        },
      ];

      // Configura a cadeia de chamadas do Dexie
      const mockWhere = {
        equals: vi.fn(() => ({
          toArray: vi.fn<(...args: unknown[]) => unknown[]>().mockResolvedValue(pendingRecords),
          count: vi.fn<(...args: unknown[]) => number>().mockResolvedValue(pendingRecords.length),
          modify: vi.fn<(...args: unknown[]) => void>().mockResolvedValue(undefined),
        })),
        anyOf: vi.fn((_ids: string[]) => ({
          modify: vi.fn<(...args: unknown[]) => void>().mockResolvedValue(undefined),
        })),
      };

      mocks.db.studyRecords.where.mockReturnValue(mockWhere as never);
      mocks.db.studyRecords.toArray.mockResolvedValue([] as never);
      mocks.studyRecordsQueries.upsert.mockResolvedValue(pendingRecords as never);

      // Mock deduplicateLocal - faz a verificação de duplicatas (sem duplicatas)
      mocks.db.studyRecords.toArray.mockResolvedValue([] as never);

      await syncService.syncPendingAttempts();

      expect(mocks.studyRecordsQueries.upsert).toHaveBeenCalled();
      // Verifica que tentou marcar como synced
      expect(mockWhere.anyOf).toHaveBeenCalled();
    });

    it('não deve sincronizar se já estiver sincronizando', async () => {
      syncService._syncing = true;

      await syncService.syncPendingAttempts();

      expect(mocks.studyRecordsQueries.upsert).not.toHaveBeenCalled();

      syncService._syncing = false;
    });

    it('não deve sincronizar se estiver offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        writable: true,
        value: false,
      });

      await syncService.syncPendingAttempts();

      expect(mocks.studyRecordsQueries.upsert).not.toHaveBeenCalled();
    });
  });

  // ── Test 4: safeRefresh estrutura ──
  describe('4. safeRefresh', () => {
    it('deve retornar falha se estiver offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        writable: true,
        value: false,
      });

      const result = await syncService.safeRefresh('user-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Sem conexão');
    });

    it('deve buscar dados remotos e repovoar o cache', async () => {
      // Nenhum pendente
      mocks.db.studyRecords.where.mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn<(...args: unknown[]) => unknown[]>().mockResolvedValue([]),
          count: vi.fn<(...args: unknown[]) => number>().mockResolvedValue(0),
          modify: vi.fn<(...args: unknown[]) => void>().mockResolvedValue(undefined),
        })),
      } as never);

      mocks.db.editais.where.mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn<(...args: unknown[]) => unknown[]>().mockResolvedValue([]),
          count: vi.fn<(...args: unknown[]) => number>().mockResolvedValue(0),
          modify: vi.fn<(...args: unknown[]) => void>().mockResolvedValue(undefined),
        })),
      } as never);

      const remoteRecords = [
        { id: 'r1', user_id: 'user-1', materia: 'Dir. Admin' },
      ];
      const remoteEditais = [
        { id: 'e1', user_id: 'user-1', materia: 'Português' },
      ];

      mocks.studyRecordsQueries.getByUser.mockResolvedValue(remoteRecords as never);
      mocks.editaisQueries.getByUser.mockResolvedValue(remoteEditais as never);

      const result = await syncService.safeRefresh('user-1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('1 registros');
      expect(mocks.db.studyRecords.clear).toHaveBeenCalled();
      expect(mocks.db.editais.clear).toHaveBeenCalled();
      expect(mocks.db.studyRecords.bulkAdd).toHaveBeenCalled();
      expect(mocks.db.editais.bulkAdd).toHaveBeenCalled();
    });
  });
});
