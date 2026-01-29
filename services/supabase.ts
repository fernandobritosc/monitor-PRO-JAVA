
import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const env = import.meta.env || ({} as any);
  
  const url = localStorage.getItem('monitorpro_supabase_url') || env.VITE_SUPABASE_URL;
  const key = localStorage.getItem('monitorpro_supabase_key') || env.VITE_SUPABASE_KEY;

  const isPlaceholder = !url || !key || url.includes('placeholder') || key.includes('placeholder');

  if (isPlaceholder) {
    console.warn("MonitorPro: Credenciais do Supabase não detectadas ou inválidas (placeholders). O App deve redirecionar para Configuração.");
  }

  return { url, key };
};

const { url, key } = getSupabaseConfig();

export const supabase = createClient(
  url || 'https://placeholder.supabase.co', 
  key || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'monitorpro_auth_v7', 
      storage: window.localStorage
    },
  }
);

export const saveAppConfig = (newUrl: string, newKey: string) => {
  localStorage.setItem('monitorpro_supabase_url', newUrl);
  localStorage.setItem('monitorpro_supabase_key', newKey);
  window.location.reload();
};

export const resetAppConfig = () => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('monitorpro_'));
  keys.forEach(k => localStorage.removeItem(k));
  window.location.href = window.location.origin;
};