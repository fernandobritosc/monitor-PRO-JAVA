import { db } from './db';
import { studyRecordsQueries } from '../queries/studyRecords';

export const syncService = {
    /** 
     * Sincroniza tentativas pendentes locais com o Supabase.
     * Apenas registros GENUINAMENTE novos (criados offline ou com falha real).
     */
    async syncPendingAttempts() {
        if (!navigator.onLine) return;

        try {
            const pending = await db.studyRecords
                .where('syncStatus')
                .equals('pending')
                .toArray();

            if (pending.length === 0) return;

            console.log(`[SYNC] 🔄 Sincronizando ${pending.length} registros pendentes...`);

            let synced = 0;
            let failed = 0;

            for (const attempt of pending) {
                try {
                    // Mantém o ID original no payload para evitar duplicatas
                    const { syncStatus, lastModified, ...payload } = attempt;

                    const result = await studyRecordsQueries.insert(payload);
                    
                    if (result && result.length > 0) {
                        await db.studyRecords.update(attempt.id, {
                            syncStatus: 'synced',
                            lastModified: Date.now()
                        });
                        synced++;
                    } else {
                        // RLS bloqueou silenciosamente — marca como error para não retentar infinitamente
                        await db.studyRecords.update(attempt.id, { syncStatus: 'error' });
                        failed++;
                    }
                } catch (err: any) {
                    if (err?.code === '23505') {
                        // Duplicata = já existe no Supabase, marcar como synced
                        await db.studyRecords.update(attempt.id, {
                            syncStatus: 'synced',
                            lastModified: Date.now()
                        });
                        synced++;
                    } else {
                        console.error(`[SYNC] ❌ Falha no registro ${attempt.id}:`, err?.message);
                        await db.studyRecords.update(attempt.id, { syncStatus: 'error' });
                        failed++;
                    }
                }
            }

            if (synced > 0 || failed > 0) {
                console.log(`[SYNC] ✅ Resultado: ${synced} sincronizados, ${failed} falharam`);
            }
        } catch (err) {
            console.error('[SYNC] Erro geral:', err);
        }
    },

    /** 
     * Salva um registro novo. Se offline → pending. Se online → tenta Supabase.
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
                const result = await studyRecordsQueries.insert(finalRecord);
                if (result && result.length > 0) {
                    await db.studyRecords.update(localId, { syncStatus: 'synced' });
                }
            } catch (err) {
                console.warn('[SYNC] Falha no cloud, mantendo pendente:', err);
            }
        }
    },

    /**
     * Force Re-sync: Limpa TODO o cache local (Dexie) e re-hidrata com dados frescos do Supabase.
     * Usa para corrigir duplicatas, dados inflados ou cache corrompido.
     */
    async forceResync(userId: string): Promise<{ success: boolean; recordCount: number; message: string }> {
        if (!navigator.onLine) {
            return { success: false, recordCount: 0, message: 'Sem conexão com a internet. Conecte-se e tente novamente.' };
        }

        if (!userId) {
            return { success: false, recordCount: 0, message: 'Usuário não autenticado.' };
        }

        try {
            console.log('[FORCE-RESYNC] 🔄 Iniciando resync forçado...');

            // 1. Contar registros locais antes da limpeza
            const localBefore = await db.studyRecords.count();
            console.log(`[FORCE-RESYNC] 📊 Registros locais antes: ${localBefore}`);

            // 2. Limpar TODOS os registros locais do Dexie
            await db.studyRecords.clear();
            console.log('[FORCE-RESYNC] 🗑️ Cache local limpo.');

            // 3. Buscar dados frescos do Supabase
            const remoteData = await studyRecordsQueries.getByUser(userId);
            const remoteCount = remoteData?.length || 0;
            console.log(`[FORCE-RESYNC] ☁️ Registros no Supabase: ${remoteCount}`);

            // 4. Inserir dados limpos no Dexie
            if (remoteData && remoteCount > 0) {
                const cleanRecords = remoteData.map(r => ({
                    ...r,
                    syncStatus: 'synced' as const,
                    lastModified: Date.now()
                }));
                await db.studyRecords.bulkAdd(cleanRecords);
            }

            const message = `Resync concluído! ${localBefore} registros locais → ${remoteCount} registros limpos do Supabase.`;
            console.log(`[FORCE-RESYNC] ✅ ${message}`);

            return { success: true, recordCount: remoteCount, message };
        } catch (err: any) {
            const message = `Erro no resync: ${err?.message || 'Desconhecido'}`;
            console.error(`[FORCE-RESYNC] ❌ ${message}`);
            return { success: false, recordCount: 0, message };
        }
    }
};

// Reconexão: sincroniza quando volta online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        syncService.syncPendingAttempts();
    });
}
