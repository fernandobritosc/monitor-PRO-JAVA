
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const getSupabaseConfig = () => {
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('monitorpro_supabase_url') : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('monitorpro_supabase_key') : null;

  if (storedUrl && storedKey && storedUrl.length > 5 && !storedUrl.includes('placeholder')) {
    return {
      url: storedUrl.trim().replace(/^"|"$/g, ''),
      key: storedKey.trim().replace(/^"|"$/g, '')
    };
  }

  let envUrl = "";
  let envKey = "";
  // Vite env variables fallback
  if (typeof import.meta.env !== 'undefined') {
    envUrl = import.meta.env.VITE_SUPABASE_URL || '';
    envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }

  if (envUrl && envUrl.length > 5 && !envUrl.includes('undefined')) {
    return {
      url: envUrl.trim().replace(/^"|"$/g, ''),
      key: envKey.trim().replace(/^"|"$/g, '')
    };
  }

  logger.warn('STORAGE', 'Nenhuma configuração Supabase encontrada (ENV ou localStorage)');
  return { url: "", key: "" };
};

const { url, key } = getSupabaseConfig();

export const supabase = createClient(
  url && url.startsWith('http') ? url : "https://placeholder.supabase.co",
  key || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'monitorpro-auth-token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      heartbeatIntervalMs: 30000,
    }
  }
);
