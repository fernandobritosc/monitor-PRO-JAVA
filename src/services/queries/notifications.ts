/**
 * Data Access Layer — Notificações
 * Centraliza queries da tabela `notifications`
 */
import { supabase } from '../supabase';

export const notificationsQueries = {
    async getByUser(userId: string) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    async getUnreadCount(userId: string) {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);
        if (error) throw error;
        return count ?? 0;
    },

    async markAsRead(id: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);
        if (error) throw error;
    },

    async markAllAsRead(userId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false);
        if (error) throw error;
    },

    subscribe(callback: (payload: unknown) => void) {
        return supabase
            .channel('notifications-realtime')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'notifications' },
                callback
            )
            .subscribe();
    },
};
