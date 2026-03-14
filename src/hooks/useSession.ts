import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/auth-js';

/**
 * Hook leve que expõe a sessão atual sem criar subscriptions adicionais.
 * Para um provider-level subscription, use useAuth em App.tsx.
 * Este hook é otimizado para uso em views/componentes que precisam apenas do userId.
 */
export const useSession = () => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Leitura síncrona do cache - não cria subscription
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Escuta mudanças de estado de auth para manter sincronizado
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    userId: session?.user?.id,
  };
};
