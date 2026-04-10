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

    /** Insere um ou mais registros de estudo com whitelist de colunas */
    async insert(records: Partial<StudyRecord> | Partial<StudyRecord>[]) {
        const recordsArray = Array.isArray(records) ? records : [records];
        
        const payload = recordsArray.map(r => {
            const entry: any = {
                user_id: r.user_id,
                concurso: r.concurso,
                materia: r.materia,
                assunto: r.assunto,
                data_estudo: r.data_estudo,
                acertos: r.acertos,
                total: r.total,
                taxa: r.taxa,
                tempo: r.tempo,
                comentarios: r.comentarios || null,
                rev_24h: r.rev_24h,
                rev_07d: r.rev_07d,
                rev_15d: r.rev_15d,
                rev_30d: r.rev_30d,
                tipo: r.tipo || 'Estudo',
                analise_erros: r.analise_erros && r.analise_erros.length > 0 ? r.analise_erros : null
            };

            // Somente inclui o ID se ele existir (evita null violating not-null constraint)
            if (r.id) entry.id = r.id;
            
            return entry;
        });

        const { data, error } = await supabase.from('registros_estudos').insert(payload).select();
        if (error) {
            console.error('❌ Erro no Supabase (Insert):', error.message, error.details);
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
            tipo: record.tipo || 'Estudo', // Adicionado no whitelist de update também
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
};
