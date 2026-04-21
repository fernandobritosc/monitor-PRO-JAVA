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
    }
};

// Reconexão: sincroniza quando volta online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        syncService.syncPendingAttempts();
    });
}
