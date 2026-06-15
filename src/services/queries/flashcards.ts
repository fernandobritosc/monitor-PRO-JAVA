/**
 * Data Access Layer — Flashcards
 * Centraliza queries da tabela `flashcards`
 */
import { supabase } from '../supabase';
import { Flashcard } from '../../types';

export const flashcardsQueries = {
    async getByUser(userId: string) {
        const { data, error } = await supabase
            .from('flashcards')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    async getByConcurso(userId: string, concurso: string) {
        const { data, error } = await supabase
            .from('flashcards')
            .select('*')
            .eq('user_id', userId)
            .eq('concurso', concurso);
        if (error) throw error;
        return data ?? [];
    },

    async upsert(records: Partial<Flashcard> | Partial<Flashcard>[]) {
        const recordsArray = Array.isArray(records) ? records : [records];
        const { data, error } = await supabase
            .from('flashcards')
            .upsert(recordsArray, { onConflict: 'id' })
            .select();
        if (error) throw error;
        return data ?? [];
    },

    async update(id: string, updates: Partial<Flashcard>) {
        const { error } = await supabase
            .from('flashcards')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('flashcards')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getOtherMissions(userId: string, excludeConcurso: string) {
        const { data, error } = await supabase
            .from('flashcards')
            .select('concurso')
            .eq('user_id', userId)
            .not('concurso', 'eq', excludeConcurso);
        if (error) throw error;
        const uniqueMissions = Array.from(new Set((data ?? []).map(d => d.concurso))).filter(Boolean) as string[];
        return uniqueMissions.sort();
    },

    async getCommunityCards() {
        const { data, error } = await supabase
            .from('flashcards')
            .select('materia, assunto, front, back, id, status, created_at, ai_generated_assets, original_audio_id, author_name')
            .not('user_id', 'eq', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        return (data ?? []) as Flashcard[];
    },
};
