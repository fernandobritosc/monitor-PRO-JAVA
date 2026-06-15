import { db, type OfflineAttempt, type OfflineEdital } from './db';
import { studyRecordsQueries } from '../queries/studyRecords';
import { editaisQueries } from '../queries/editais';
import { logger } from '../../utils/logger';

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: Parameters<T>) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

export const syncService = {
    _syncing: false,
    /**
     * Remove duplicatas locais comparando o conteúdo dos registros.
     * Útil quando o mesmo registro existe com IDs diferentes (ex: numérico vs UUID).
     */
    async deduplicateLocal() {
        const all = await db.studyRecords.toArray();
        const seen = new Map<string, OfflineAttempt>();
        const toDelete: string[] = [];

        for (const r of all) {
            // Cria uma chave única baseada no conteúdo real do estudo
            const key = `${r.user_id}-${r.data_estudo}-${r.materia}-${r.assunto}-${r.acertos}-${r.total}-${r.tempo}`;
            
            if (seen.has(key)) {
                const existing = seen.get(key)!;
                // Se um está sincronizado e o outro não, deletamos o não sincronizado
                if (existing.syncStatus === 'synced' && r.syncStatus === 'pending') {
                    toDelete.push(r.id);
                } else if (existing.syncStatus === 'pending' && r.syncStatus === 'synced') {
                    toDelete.push(existing.id);
                    seen.set(key, r);
                } else {
                    // Se ambos têm o mesmo status, deletamos a duplicata mais nova (ou qualquer uma)
                    toDelete.push(r.id);
                }
            } else {
                seen.set(key, r);
            }
        }

        if (toDelete.length > 0) {
            logger.log(`[DEDUPLICATE] 🧹 Limpando ${toDelete.length} duplicatas locais...`);
            await db.studyRecords.bulkDelete(toDelete);
        }
    },

    /** 
     * Sincroniza tentativas pendentes locais com o Supabase usando batch upsert.
     * Inclui lock para evitar concorrência, exponential backoff com jitter,
     * e marca como 'error' registros que excederam o limite de tentativas.
     */
    async syncPendingAttempts() {
        if (this._syncing) return;
        if (!navigator.onLine) return;

        this._syncing = true;
        try {
            // 0. Limpa duplicatas antes de tentar subir
            await this.deduplicateLocal();

            const allPending = await db.studyRecords
                .where('syncStatus')
                .equals('pending')
                .toArray();

            if (allPending.length === 0) return;

            // Separa registros que excederam o limite de tentativas
            const exhausted = allPending.filter(r => (r.retryCount ?? 0) >= 3);
            const pending = allPending.filter(r => (r.retryCount ?? 0) < 3);

            // Marca como erro os que já tentaram 3+ vezes
            if (exhausted.length > 0) {
                const exhaustedIds = exhausted.map(r => r.id);
                await db.studyRecords.where('id').anyOf(exhaustedIds).modify({
                    syncStatus: 'error' as const,
                    lastModified: Date.now()
                });
                logger.warn('SYNC', `[SYNC] ⛔ ${exhausted.length} registros excederam limite de tentativas e foram marcados como erro.`);
            }

            if (pending.length === 0) return;

            // Exponential backoff com jitter baseado na maior retryCount do lote
            const maxRetry = Math.max(...pending.map(r => r.retryCount ?? 0));
            const baseDelay = Math.min(1000 * Math.pow(2, maxRetry), 30000);
            const jitter = 0.5 + Math.random();
            const delay = Math.round(baseDelay * jitter);

            if (delay > 0) {
                logger.log(`[SYNC] ⏳ Aguardando ${delay}ms (backoff) antes de tentar ${pending.length} registros...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            logger.log(`[SYNC] 🔄 Sincronizando lote de ${pending.length} registros...`);

            // Remove campos locais antes de enviar para o Supabase
            const payloads = pending.map(({ syncStatus: _s, lastModified: _l, retryCount: _r, lastError: _e, ...payload }) => payload);

            // Tenta o Upsert em lote
            const result = await studyRecordsQueries.upsert(payloads);
            
            if (result && result.length > 0) {
                // Mapeia apenas os IDs que o Supabase confirmou que recebeu/atualizou
                const confirmedIds = result.map(r => r.id);
                
                await db.studyRecords.where('id').anyOf(confirmedIds).modify({
                    syncStatus: 'synced',
                    lastModified: Date.now()
                });
                
                const failedCount = pending.length - result.length;
                if (failedCount > 0) {
                    logger.warn('SYNC', `[SYNC] ⚠️ ${failedCount} registros não foram confirmados pelo Supabase.`);
                } else {
                    logger.log(`[SYNC] ✅ Todos os ${result.length} registros sincronizados com sucesso.`);
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error('SYNC', '[SYNC] ❌ Erro na sincronização em lote:', msg);

            // Incrementa retryCount e salva lastError nos registros pendentes
            try {
                const pending = await db.studyRecords
                    .where('syncStatus')
                    .equals('pending')
                    .toArray();

                const pendingIds = pending.map(r => r.id);
                if (pendingIds.length > 0) {
                    await db.studyRecords.where('id').anyOf(pendingIds).modify(record => {
                        record.retryCount = (record.retryCount ?? 0) + 1;
                        record.lastError = msg;
                        record.lastModified = Date.now();
                    });
                }
            } catch {
                // Silencia erro secundário ao atualizar contagem
            }
        } finally {
            this._syncing = false;
        }
    },

    /** 
     * Salva um registro novo. Se offline → pending. Se online → tenta Supabase via Upsert.
     */
    async saveAttempt(record: Record<string, unknown>) {
        const isOnline = navigator.onLine;

        const finalRecord = {
            ...record,
            id: (record.id as string) || crypto.randomUUID()
        };

        const localId = await db.studyRecords.add({
            ...finalRecord,
            syncStatus: 'pending',
            lastModified: Date.now()
        } as OfflineAttempt);

        if (isOnline) {
            try {
                const result = await studyRecordsQueries.upsert(finalRecord);
                if (result && result.length > 0) {
                    await db.studyRecords.update(localId, { syncStatus: 'synced' });
                }
            } catch (err) {
                logger.warn('SYNC', '[SYNC] Falha no cloud (saveAttempt), mantendo pendente:', err);
            }
        }
    },

    /**
     * Sincroniza editais pendentes locais com o Supabase.
     */
    async syncPendingEditais() {
        if (!navigator.onLine) return;

        try {
            const pending = await db.editais
                .where('syncStatus')
                .equals('pending')
                .toArray();

            if (pending.length === 0) return;

            const toSync = pending.filter(r => (r.retryCount ?? 0) < 3);
            const exhausted = pending.filter(r => (r.retryCount ?? 0) >= 3);

            if (exhausted.length > 0) {
                await db.editais.where('id').anyOf(exhausted.map(r => r.id)).modify({ syncStatus: 'error' as const });
            }

            if (toSync.length === 0) return;

            const payloads = toSync.map(({ syncStatus: _s, lastModified: _l, retryCount: _r, ...payload }) => payload);

            const result = await editaisQueries.upsert(payloads);

            if (result && result.length > 0) {
                const confirmedIds = result.map(r => r.id);
                await db.editais.where('id').anyOf(confirmedIds).modify({
                    syncStatus: 'synced',
                    lastModified: Date.now()
                });
            }

            const failed = toSync.filter(r => !result?.some((c: { id: string }) => c.id === r.id));
            if (failed.length > 0) {
                for (const f of failed) {
                    const nextRetry = (f.retryCount ?? 0) + 1;
                    await db.editais.update(f.id, {
                        retryCount: nextRetry,
                        syncStatus: nextRetry >= 3 ? 'error' as const : 'pending' as const
                    });
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error('SYNC', '[SYNC] ❌ Erro na sincronização de editais:', msg);
        }
    },

    /**
     * Salva um edital novo. Se offline → pending. Se online → tenta Supabase via Upsert.
     */
    async saveEdital(record: Record<string, unknown>) {
        const isOnline = navigator.onLine;

        const finalRecord = {
            ...record,
            id: (record.id as string) || crypto.randomUUID()
        };

        const localId = await db.editais.add({
            ...finalRecord,
            syncStatus: 'pending',
            lastModified: Date.now()
        } as OfflineEdital);

        if (isOnline) {
            try {
                const result = await editaisQueries.upsert([finalRecord]);
                if (result && result.length > 0) {
                    await db.editais.update(localId, { syncStatus: 'synced' });
                }
            } catch (err) {
                logger.warn('SYNC', '[SYNC] Falha no cloud (saveEdital), mantendo pendente:', err);
            }
        }
    },

    /**
     * Safe Refresh: Atualiza o cache local de forma segura.
     * 1. Sincroniza pendências.
     * 2. Busca dados frescos.
     * 3. Limpa e repovoa o Dexie apenas após o sucesso do download.
     */
    async safeRefresh(userId: string): Promise<{ success: boolean; message: string }> {
        if (!navigator.onLine) {
            return { success: false, message: 'Sem conexão com a internet.' };
        }

        try {
            logger.log('[SAFE-REFRESH] 🛡️ Iniciando atualização segura...');

            // 1. Tentar sincronizar o que estiver pendente antes de mais nada
            const pendingAttemptsCount = await db.studyRecords.where('syncStatus').equals('pending').count();
            if (pendingAttemptsCount > 0) {
                logger.log(`[SAFE-REFRESH] 🔄 Sincronizando ${pendingAttemptsCount} pendências de estudos...`);
                await this.syncPendingAttempts();
            }

            const pendingEditaisCount = await db.editais.where('syncStatus').equals('pending').count();
            if (pendingEditaisCount > 0) {
                logger.log(`[SAFE-REFRESH] 🔄 Sincronizando ${pendingEditaisCount} pendências de editais...`);
                await this.syncPendingEditais();
            }

            // 2. Buscar dados frescos do Supabase
            const [remoteData, remoteEditais] = await Promise.all([
                studyRecordsQueries.getByUser(userId),
                editaisQueries.getByUser(userId)
            ]);
            if (!remoteData) throw new Error('Falha ao obter dados da nuvem.');

            // 3. Só agora limpamos o cache local (Garante que não ficaremos sem nada)
            await db.studyRecords.clear();
            await db.editais.clear();

            // 4. Repovoar com dados limpos
            if (remoteData.length > 0) {
                const cleanRecords = remoteData.map(r => ({
                    ...r,
                    syncStatus: 'synced' as const,
                    lastModified: Date.now()
                }));
                await db.studyRecords.bulkAdd(cleanRecords);
            }

            if (remoteEditais.length > 0) {
                const cleanEditais = remoteEditais.map(r => ({
                    ...r,
                    syncStatus: 'synced' as const,
                    lastModified: Date.now()
                }));
                await db.editais.bulkAdd(cleanEditais);
            }

            return { 
                success: true, 
                message: `Sucesso! Cache atualizado com ${remoteData.length} registros e ${remoteEditais.length} editais da nuvem.` 
            };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error('SYNC', '[SAFE-REFRESH] ❌ Erro:', msg);
            return { success: false, message: `Falha na atualização: ${msg}` };
        }
    }
};

// Reconexão: sincroniza quando volta online (com debounce de 300ms)
if (typeof window !== 'undefined') {
    const debouncedSync = debounce(() => {
        syncService.syncPendingAttempts();
        syncService.syncPendingEditais();
    }, 300);

    window.addEventListener('online', debouncedSync);
}
