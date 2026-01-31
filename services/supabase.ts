
import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const env = import.meta.env || ({} as any);
  
  // 1. FORÇA A LEITURA DA VERCEL PRIMEIRO (Prioridade Total)
  let url = env.VITE_SUPABASE_URL;
  let key = env.VITE_SUPABASE_ANON_KEY;

  // 2. SE A VERCEL FALHAR, TENTA O LOCALSTORAGE
  if (!url || url.includes('placeholder')) {
      url = localStorage.getItem('monitorpro_supabase_url');
  }
  if (!key || key === 'placeholder') {
      key = localStorage.getItem('monitorpro_supabase_key');
  }

  // 3. VALIDAÇÃO FINAL
  const isUrlValid = url && url.startsWith('https://') && url.length > 10;
  const isKeyValid = key && key.length > 20;

  if (!isUrlValid || !isKeyValid) {
    return { url: 'https://placeholder.supabase.co', key: 'placeholder' };
  }

  return { url, key };
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
      storageKey: 'monitorpro_auth_v9', 
      storage: window.localStorage
    },
  }
);

export const saveAppConfig = (newUrl: string, newKey: string) => {
  // Limpa espaços em branco que causam erros
  const cleanUrl = newUrl.trim();
  const cleanKey = newKey.trim();
  
  localStorage.setItem('monitorpro_supabase_url', cleanUrl);
  localStorage.setItem('monitorpro_supabase_key', cleanKey);
  
  // Força reload para aplicar
  window.location.reload();
};

export const resetAppConfig = () => {
  // Remove chaves de configuração
  localStorage.removeItem('monitorpro_supabase_url');
  localStorage.removeItem('monitorpro_supabase_key');
  // Remove sessão antiga para evitar conflito
  localStorage.removeItem('monitorpro_auth_v9');
  
  window.location.reload();
};
//force update