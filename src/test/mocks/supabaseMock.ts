/**
 * Mock completo do módulo Supabase para testes unitários.
 * Evita chamadas reais à API durante testes.
 */
import { vi } from 'vitest';

export const mockUser = {
    id: 'test-user-id-123',
    email: 'test@monitorporo.com',
    created_at: '2024-01-01T00:00:00Z',
};

export const mockSession = {
    user: mockUser,
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
};

export const mockFlashcard = {
    id: 'card-123',
    user_id: mockUser.id,
    materia: 'Direito Constitucional',
    assunto: 'Direitos Fundamentais',
    front: 'O que é o princípio da dignidade da pessoa humana?',
    back: 'Fundamento da República Federativa do Brasil, art. 1º, III CF/88.',
    status: 'novo' as const,
    interval: 0,
    ease_factor: 2.5,
    next_review: null,
    ai_generated_assets: null,
    original_audio_id: null,
    author_name: 'test',
    created_at: '2024-01-01T00:00:00Z',
};

export const mockStudyRecord = {
    id: 'record-123',
    user_id: mockUser.id,
    materia: 'Direito Constitucional',
    assunto: 'Direitos Fundamentais',
    data: '2024-01-01',
    tempo_estudo: 60,
    revisao: false,
    concurso: 'TRF',
    created_at: '2024-01-01T00:00:00Z',
};

// Mock do cliente Supabase com todas as operações comuns
const createMockSupabaseChain = (data: any = [], error: any = null) => {
    const chain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: data?.[0] ?? null, error }),
        then: vi.fn().mockResolvedValue({ data, error }),
    };

    // Make all methods resolve with data
    Object.keys(chain).forEach((key) => {
        if (key !== 'then' && key !== 'single') {
            (chain as any)[key] = vi.fn().mockReturnValue({
                ...chain,
                // Final resolution
                then: (fn: any) => fn({ data, error }),
            });
        }
    });

    return chain;
};

export const createMockSupabase = (overrides?: {
    flashcards?: any[];
    studyRecords?: any[];
    authError?: any;
}) => {
    const flashcards = overrides?.flashcards ?? [mockFlashcard];
    const studyRecords = overrides?.studyRecords ?? [mockStudyRecord];

    return {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
            getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
            signInWithPassword: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
            signUp: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
            onAuthStateChange: vi.fn().mockReturnValue({
                data: { subscription: { unsubscribe: vi.fn() } },
            }),
        },
        from: vi.fn().mockImplementation((table: string) => {
            const data = table === 'flashcards' ? flashcards : studyRecords;
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({ data, error: null }),
                        not: vi.fn().mockReturnValue({
                            then: (fn: any) => fn({ data, error: null }),
                        }),
                    }),
                    not: vi.fn().mockReturnValue({
                        then: (fn: any) => fn({ data, error: null }),
                    }),
                    order: vi.fn().mockResolvedValue({ data, error: null }),
                }),
                insert: vi.fn().mockReturnValue({
                    then: (fn: any) => fn({ data: null, error: null }),
                }),
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
                upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
        }),
        storage: {
            from: vi.fn().mockReturnValue({
                list: vi.fn().mockResolvedValue({ data: [], error: null }),
                upload: vi.fn().mockResolvedValue({ data: null, error: null }),
                remove: vi.fn().mockResolvedValue({ data: null, error: null }),
                getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/audio.wav' } }),
            }),
        },
    };
};
