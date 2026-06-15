import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { deriveKeyFromUserId, clearUserKey } from '../utils/secureStorage';
import type { Session } from '@supabase/auth-js';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUserEmail(session?.user?.email || '');
      setLoading(false);
      if (session?.user?.id) {
        deriveKeyFromUserId(session.user.id).catch(() => {});
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUserEmail(session?.user?.email || '');
      setLoading(false);
      if (session?.user?.id) {
        deriveKeyFromUserId(session.user.id).catch(() => {});
      } else {
        clearUserKey();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    clearUserKey();
    await supabase.auth.signOut();
  };

  return {
    session,
    userEmail,
    loading,
    signOut
  };
};
