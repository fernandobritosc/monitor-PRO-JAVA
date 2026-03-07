/**
 * Data Access Layer — Gabaritos
 * Centraliza queries da tabela `gabaritos_salvos`
 */
import { supabase } from '../supabase';
import { SavedGabarito } from '../../types';

export const gabaritosQueries = {
    /** Lista todos os gabaritos salvos (desc por data) */
    async getAll() {
        const { data, error } = await supabase
            .from('gabaritos_salvos')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    /** Insere um gabarito e retorna o registro criado */
    async insert(gabarito: Partial<SavedGabarito>) {
        const { data, error } = await supabase
            .from('gabaritos_salvos')
            .insert(gabarito)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /** Atualiza respostas de um gabarito */
    async updateAnswers(id: string, updates: { user_answers_json?: any; official_answers_json?: any; results_json?: any }) {
        const { error } = await supabase
            .from('gabaritos_salvos')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    /** Atualiza um gabarito genericamente */
    async update(id: string, updates: Partial<SavedGabarito>) {
        const { error } = await supabase
            .from('gabaritos_salvos')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    /** Deleta um gabarito */
    async delete(id: string) {
        const { error } = await supabase.from('gabaritos_salvos').delete().eq('id', id);
        if (error) throw error;
    },
};
