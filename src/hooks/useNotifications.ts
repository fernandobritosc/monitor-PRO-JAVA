import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/auth-js';

export const useNotifications = (session: Session | null) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = async () => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    // Ignora silenciosamente se a tabela não existir (404)
    if (error?.code === 'PGRST116' || (error as any)?.status === 404) return;

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  useEffect(() => {
    fetchData();

    if (session?.user?.id) {
      const channel = supabase
        .channel('public:notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`
        }, () => {
          fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session?.user?.id]);

  const markAsRead = async (id?: string) => {
    if (!session?.user?.id) return;

    if (id) {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    } else {
      await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id);
    }
    fetchData();
  };

  return {
    notifications,
    unreadCount,
    markAsRead
  };
};