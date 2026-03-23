import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/auth-js';

export const useNotifications = (session: Session | null) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      // Ignora silenciosamente se a tabela não existir (404 / PGRST116)
      if (error) {
        const status = (error as any)?.status ?? (error as any)?.code;
        if (status === 404 || status === 'PGRST116' || error.message?.includes('does not exist')) return;
        return; // ignora qualquer outro erro de notificação silenciosamente
      }

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch {
      // tabela não existe — ignora silenciosamente
    }
  };

  useEffect(() => {
    fetchData();

    if (!session?.user?.id) return;

    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`
      }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const markAsRead = async (id?: string) => {
    if (!session?.user?.id) return;
    try {
      if (id) {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
      } else {
        await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id);
      }
      fetchData();
    } catch {
      // ignora silenciosamente
    }
  };

  return { notifications, unreadCount, markAsRead };
};