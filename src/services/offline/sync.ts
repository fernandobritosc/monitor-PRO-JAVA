import { db } from './db';
import { studyRecordsQueries } from '../queries/studyRecords';

export const syncService = {
    /**
     * Remove duplicatas locais comparando o conteúdo dos registros.
     * Útil quando o mesmo registro existe com IDs diferentes (ex: numérico vs UUID).
     */
    async deduplicateLocal() {
        const all = await db.studyRecords.toArray();
        const seen = new Map<string, any>();
        const toDelete: string[] = [];

        for (const r of all) {
            // Cria uma chave única baseada no conteúdo real do estudo
            const key = `${r.user_id}-${r.data_estudo}-${r.materia}-${r.assunto}-${r.acertos}-${r.total}-${r.tempo}`;
            
            if (seen.has(key)) {
                const existing = seen.get(key);
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
            console.log(`[DEDUPLICATE] 🧹 Limpando ${toDelete.length} duplicatas locais...`);
            await db.studyRecords.bulkDelete(toDelete);
        }
    },

    /** 
     * Sincroniza tentativas pendentes locais com o Supabase usando batch upsert.
     */
    async syncPendingAttempts() {
        if (!navigator.onLine) return;

        try {
            // 0. Limpa duplicatas antes de tentar subir
            await this.deduplicateLocal();

            const pending = await db.studyRecords
                .where('syncStatus')
                .equals('pending')
                .toArray();

            if (pending.length === 0) return;

            console.log(`[SYNC] 🔄 Sincronizando lote de ${pending.length} registros...`);
            
            // ... resto do código (mantido igual)

            // Remove campos locais antes de enviar para o Supabase
            const payloads = pending.map(({ syncStatus: _s, lastModified: _l, ...payload }) => payload);

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
                    console.warn(`[SYNC] ⚠️ ${failedCount} registros não foram confirmados pelo Supabase.`);
                } else {
                    console.log(`[SYNC] ✅ Todos os ${result.length} registros sincronizados com sucesso.`);
                }
            }
        } catch (err: any) {
            console.error('[SYNC] ❌ Erro na sincronização em lote:', err?.message);
            // Em caso de erro crítico, não alteramos o status para permitir nova tentativa
        }
    },

    /** 
     * Salva um registro novo. Se offline → pending. Se online → tenta Supabase via Upsert.
     */
    async saveAttempt(record: any) {
        const isOnline = navigator.onLine;

        const finalRecord = {
            ...record,
            id: record.id || crypto.randomUUID()
        };

        const localId = await db.studyRecords.add({
            ...finalRecord,
            syncStatus: 'pending',
            lastModified: Date.now()
        });

        if (isOnline) {
            try {
                const result = await studyRecordsQueries.upsert(finalRecord);
                if (result && result.length > 0) {
                    await db.studyRecords.update(localId, { syncStatus: 'synced' });
                }
            } catch (err) {
                console.warn('[SYNC] Falha no cloud (saveAttempt), mantendo pendente:', err);
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
            console.log('[SAFE-REFRESH] 🛡️ Iniciando atualização segura...');

            // 1. Tentar sincronizar o que estiver pendente antes de mais nada
            const pendingCount = await db.studyRecords.where('syncStatus').equals('pending').count();
            if (pendingCount > 0) {
                console.log(`[SAFE-REFRESH] 🔄 Sincronizando ${pendingCount} pendências antes do refresh...`);
                await this.syncPendingAttempts();
            }

            // 2. Buscar dados frescos do Supabase
            const remoteData = await studyRecordsQueries.getByUser(userId);
            if (!remoteData) throw new Error('Falha ao obter dados da nuvem.');

            // 3. Só agora limpamos o cache local (Garante que não ficaremos sem nada)
            await db.studyRecords.clear();

            // 4. Repovoar com dados limpos
            if (remoteData.length > 0) {
                const cleanRecords = remoteData.map(r => ({
                    ...r,
                    syncStatus: 'synced' as const,
                    lastModified: Date.now()
                }));
                await db.studyRecords.bulkAdd(cleanRecords);
            }

            return { 
                success: true, 
                message: `Sucesso! Cache atualizado com ${remoteData.length} registros da nuvem.` 
            };
        } catch (err: any) {
            console.error('[SAFE-REFRESH] ❌ Erro:', err?.message);
            return { success: false, message: `Falha na atualização: ${err?.message}` };
        }
    }
};

// Reconexão: sincroniza quando volta online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        syncService.syncPendingAttempts();
    });
}
