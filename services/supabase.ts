
import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const env = import.meta.env || ({} as any);
  
  // Tenta pegar do LocalStorage (Config Manual) OU das Variáveis de Ambiente (Vercel)
  const url = localStorage.getItem('monitorpro_supabase_url') || env.VITE_SUPABASE_URL;
  const key = localStorage.getItem('monitorpro_supabase_key') || env.VITE_SUPABASE_KEY;

  // Verifica se as chaves são válidas
  const isUrlValid = url && url.includes('https://') && url.includes('.supabase.co');
  const isKeyValid = key && key.length > 20;

  if (!isUrlValid || !isKeyValid) {
    console.warn("MonitorPro: Credenciais inválidas ou ausentes. Verifique as Variáveis de Ambiente na Vercel (VITE_SUPABASE_URL e VITE_SUPABASE_KEY).");
  }

  return { 
    url: isUrlValid ? url : 'https://placeholder.supabase.co', 
    key: isKeyValid ? key : 'placeholder' 
  };
};

const { url, key } = getSupabaseConfig();

export const supabase = createClient(
  url, 
  key,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Mudamos para v9 para invalidar sessões antigas que causam loop e forçar um novo login limpo
      storageKey: 'monitorpro_auth_v9', 
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
