/**
 * Data Access Layer — Registros de Estudos
 * Centraliza todas as queries da tabela `registros_estudos`
 */
import { supabase } from '../../lib/supabase';
import { StudyRecord } from '../../types';

export const studyRecordsQueries = {
    /** Busca todos os registros de um usuário (max 2000, desc por data) */
    async getByUser(userId: string) {
        const { data, error } = await supabase
            .from('registros_estudos')
            .select('*')
            .eq('user_id', userId)
            .order('data_estudo', { ascending: false })
            .limit(2000);
        if (error) throw error;
        return data ?? [];
    },

    /** Insere ou atualiza registros de estudo (Upsert) */
    async upsert(records: Partial<StudyRecord> | Partial<StudyRecord>[]) {
        const recordsArray = Array.isArray(records) ? records : [records];
        
        const payload = recordsArray.map(r => {
            const entry: Record<string, unknown> = {
                user_id: r.user_id,
                concurso: r.concurso,
                materia: r.materia,
                assunto: r.assunto,
                data_estudo: r.data_estudo,
                acertos: Number(r.acertos) || 0,
                total: Number(r.total) || 0,
                taxa: Number(r.taxa) || 0,
                tempo: Number(r.tempo) || 0,
                comentarios: r.comentarios || null,
                rev_24h: !!r.rev_24h,
                rev_07d: !!r.rev_07d,
                rev_15d: !!r.rev_15d,
                rev_30d: !!r.rev_30d,
                tipo: r.tipo || 'Estudo',
                meta: r.meta ? String(r.meta) : null,
                analise_erros: r.analise_erros && r.analise_erros.length > 0 ? r.analise_erros : null
            };

            // Se o ID for um número (banco legado), mandamos como número. 
            // Se for string (UUID), mandamos como string.
            if (r.id) {
                const numericId = Number(r.id);
                entry.id = !isNaN(numericId) && String(numericId) === String(r.id) ? numericId : r.id;
            }
            
            return entry;
        });

        console.log('[SUPABASE] Upsert Payload:', payload);

        const { data, error } = await supabase
            .from('registros_estudos')
            .upsert(payload, { onConflict: 'id' })
            .select();

        if (error) {
            console.error('❌ Erro no Supabase (Upsert):', error.message);
            console.error('🔍 Detalhes:', error.details);
            console.error('💡 Dica:', error.hint);
            console.error('📦 Payload enviado:', JSON.stringify(payload, null, 2));
            throw error;
        }
        return data as StudyRecord[];
    },

    /** Atualiza um registro existente */
    async update(record: StudyRecord) {
        // Whitelist rigorosa: apenas colunas confirmadas que existem em registros_estudos
        const payload = {
            user_id: record.user_id, // Essencial para RLS em algumas políticas
            concurso: record.concurso,
            materia: record.materia,
            assunto: record.assunto,
            data_estudo: record.data_estudo,
            acertos: record.acertos,
            total: record.total,
            taxa: record.taxa,
            tempo: record.tempo,
            comentarios: record.comentarios || null,
            rev_24h: record.rev_24h,
            rev_07d: record.rev_07d,
            rev_15d: record.rev_15d,
            rev_30d: record.rev_30d,
            tipo: record.tipo || 'Estudo',
            meta: record.meta ?? null,
            analise_erros: record.analise_erros && record.analise_erros.length > 0 ? record.analise_erros : null
        };

        const { error } = await supabase
            .from('registros_estudos')
            .update(payload)
            .eq('id', record.id);
        
        if (error) {
            console.error('❌ Erro no Supabase (Update):', error.message, error.details, error.hint);
            throw error;
        }
    },

    /** Deleta um registro por ID */
    async delete(id: string) {
        const { error } = await supabase
            .from('registros_estudos')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    /** Deleta múltiplos registros por IDs */
    async deleteMany(ids: string[]) {
        const { error } = await supabase
            .from('registros_estudos')
            .delete()
            .in('id', ids);
        if (error) throw error;
    },
    /** Conta total de registros do usuário */
    async getCount(userId: string) {
        const { count, error } = await supabase
            .from('registros_estudos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        if (error) throw error;
        return count || 0;
    },
};
