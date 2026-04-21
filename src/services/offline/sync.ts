import { db } from './db';
import { studyRecordsQueries } from '../queries/studyRecords';

export const syncService = {
    /** 
     * Sincroniza todas as tentativas pendentes locais com o Supabase.
     * Chamado quando o app volta a ficar online e periodicamente.
     */
    async syncPendingAttempts() {
        if (!navigator.onLine) return;

        try {
            const pending = await db.studyRecords
                .where('syncStatus')
                .anyOf(['pending', 'error'])
                .toArray();

            if (pending.length === 0) return;

            console.log(`[SYNC] 🔄 Sincronizando ${pending.length} registros pendentes...`);

            let synced = 0;
            let failed = 0;

            for (const attempt of pending) {
                try {
                    const { syncStatus, lastModified, id: localId, ...payload } = attempt;

                    // Tenta inserir no Supabase (sem o ID local, pois pode ser UUID incompatível)
                    const result = await studyRecordsQueries.insert(payload);
                    
                    // Verifica se o Supabase realmente salvou (proteção contra RLS silencioso)
                    if (result && result.length > 0) {
                        await db.studyRecords.update(attempt.id, {
                            syncStatus: 'synced',
                            lastModified: Date.now()
                        });
                        synced++;
                    } else {
                        console.warn(`[SYNC] ⚠️ RLS bloqueou registro ${attempt.id} silenciosamente`);
                        await db.studyRecords.update(attempt.id, { syncStatus: 'error' });
                        failed++;
                    }
                } catch (err: any) {
                    // Se for erro de duplicata (já existe no Supabase), marca como synced
                    if (err?.code === '23505') {
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

            console.log(`[SYNC] ✅ Resultado: ${synced} sincronizados, ${failed} falharam`);
        } catch (err) {
            console.error('[SYNC] Erro geral no syncPendingAttempts:', err);
        }
    },

    /** 
     * Salva um registro. Se offline, salva apenas localmente como 'pending'.
     * Se online, tenta salvar no Supabase e faz cache local.
     */
    async saveAttempt(record: any) {
        const isOnline = navigator.onLine;

        const finalRecord = {
            ...record,
            id: record.id || crypto.randomUUID()
        };

        // Salva localmente primeiro (Always Local-First)
        const localId = await db.studyRecords.add({
            ...finalRecord,
            syncStatus: 'pending', // SEMPRE pending até confirmação real
            lastModified: Date.now()
        });

        if (isOnline) {
            try {
                const result = await studyRecordsQueries.insert(finalRecord);
                // Só marca synced se o Supabase REALMENTE retornou os dados
                if (result && result.length > 0) {
                    await db.studyRecords.update(localId, { syncStatus: 'synced' });
                }
                // Se result é vazio (RLS bloqueou), permanece 'pending'
            } catch (err) {
                console.warn('[SYNC] Falha no cloud, mantendo pendente:', err);
            }
        }
    }
};

// Listener para reconexão — sincroniza imediatamente quando volta online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('[SYNC] 🌐 Conexão restaurada, sincronizando...');
        syncService.syncPendingAttempts();
    });

    // Sincronização periódica a cada 2 minutos (pega registros que falharam)
    setInterval(() => {
        if (navigator.onLine) {
            syncService.syncPendingAttempts();
        }
    }, 2 * 60 * 1000);
}
