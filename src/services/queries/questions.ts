/**
 * Data Access Layer — Questões e Tentativas
 * Centraliza queries de `banco_questoes`, `questao_tentativas`, `questoes_revisao`
 */
import { supabase } from '../supabase';
import { Question, QuestionAttempt } from '../../types';

export const questionsQueries = {
    // ── banco_questoes ──

    /** Lista todas as questões (admin/global) */
    async getAll() {
        const { data, error } = await supabase
            .from('banco_questoes')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    /** Cria ou atualiza uma questão */
    async upsert(question: Partial<Question>, id?: string) {
        if (id) {
            const { error } = await supabase.from('banco_questoes').update(question).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('banco_questoes').insert([question]);
            if (error) throw error;
        }
    },

    /** Atualiza uma questão específica */
    async update(id: string, updates: Partial<Question> | Record<string, any>) {
        const { error } = await supabase.from('banco_questoes').update(updates).eq('id', id);
        if (error) throw error;
    },

    /** Deleta uma questão */
    async delete(id: string) {
        const { error } = await supabase.from('banco_questoes').delete().eq('id', id);
        if (error) throw error;
    },

    // ── questao_tentativas ──

    /** Busca tentativas de uma questão */
    async getAttempts(questionId: string) {
        const { data, error } = await supabase
            .from('questao_tentativas')
            .select('*')
            .eq('question_id', questionId);
        if (error) throw error;
        return data ?? [];
    },

    /** Busca as tentativas de um usuário */
    async getUserAttempts(userId: string) {
        const { data, error } = await supabase
            .from('questao_tentativas')
            .select('*')
            .eq('user_id', userId)
            .order('attempted_at', { ascending: true });
        if (error) throw error;
        return data ?? [];
    },

    /** Registra uma tentativa */
    async insertAttempt(attempt: Partial<QuestionAttempt>) {
        const { error } = await supabase.from('questao_tentativas').insert([attempt]);
        return { error };
    },

    /** Registra tentativa sem tempo (fallback) */
    async insertAttemptWithoutTime(attempt: Partial<QuestionAttempt>) {
        const { tempo_resposta, ...rest } = attempt as any;
        const { error } = await supabase.from('questao_tentativas').insert([rest]);
        return { error };
    },

    // ── questoes_revisao ──

    /** Insere questão de revisão */
    async insertRevision(revision: Record<string, any>) {
        const { error } = await supabase.from('questoes_revisao').insert(revision);
        if (error) throw error;
    },
};
