import { db, OfflineAttempt } from './db';
import { studyRecordsQueries } from '../queries/studyRecords';
import { supabase } from '../supabase';

export const syncService = {
    /** 
     * Sincroniza todas as tentativas pendentes locais com o Supabase.
     * Chamado quando o app volta a ficar online.
     */
    async syncPendingAttempts() {
        if (!navigator.onLine) return;

        try {
            const pending = await db.attempts.where('syncStatus').equals('pending').toArray();

            for (const attempt of pending) {
                try {
                    // No sync local, IDs numéricos são gerados pelo Dexie.
                    // Removemos o ID interno para o Supabase gerar o UUID.
                    const { id, syncStatus, lastModified, ...payload } = attempt;

                    await studyRecordsQueries.insert(payload);

                    // Marca como sincronizado localmente
                    await db.attempts.update(attempt.id!, {
                        syncStatus: 'synced',
                        lastModified: Date.now()
                    });
                } catch (err) {
                    console.error(`Falha ao sincronizar tentativa ${attempt.id}:`, err);
                    await db.attempts.update(attempt.id!, { syncStatus: 'error' });
                }
            }
        } catch (err) {
            console.error('Erro no syncService.syncPendingAttempts:', err);
        }
    },

    /** 
     * Salva um registro. Se offline, salva apenas localmente como 'pending'.
     * Se online, tenta salvar no Supabase e faz cache local.
     */
    async saveAttempt(record: any) {
        const isOnline = navigator.onLine;

        // Salva localmente primeiro (Always Local-First para rapidez)
        const localId = await db.attempts.add({
            ...record,
            syncStatus: isOnline ? 'synced' : 'pending',
            lastModified: Date.now()
        });

        if (isOnline) {
            try {
                await studyRecordsQueries.insert(record);
            } catch (err) {
                console.warn('Falha ao salvar no cloud, retornando para pendente local:', err);
                await db.attempts.update(localId, { syncStatus: 'pending' });
            }
        }
    }
};

// Listener para reconexão
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        syncService.syncPendingAttempts();
    });
}
