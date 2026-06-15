import { useState, useEffect } from 'react';
import { notificationsQueries } from '../services/queries';
import type { Session } from '@supabase/auth-js';

interface AppNotification {
  id: string;
  user_id: string;
  read: boolean;
  created_at: string;
  [key: string]: unknown;
}

export const useNotifications = (session: Session | null) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = async () => {
    if (!session?.user?.id) return;

    try {
      const data = await notificationsQueries.getByUser(session.user.id);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch {
      // tabela não existe — ignora silenciosamente
    }
  };

  useEffect(() => {
    fetchData();

    if (!session?.user?.id) return;

    const subscription = notificationsQueries.subscribe(() => fetchData());
    return () => { subscription.unsubscribe(); };
  }, [session?.user?.id]);

  const markAsRead = async (id?: string) => {
    if (!session?.user?.id) return;
    try {
      if (id) {
        await notificationsQueries.markAsRead(id);
      } else {
        await notificationsQueries.markAllAsRead(session.user.id);
      }
      fetchData();
    } catch {
      // ignora silenciosamente
    }
  };

  return { notifications, unreadCount, markAsRead };
};