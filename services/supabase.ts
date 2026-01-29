
import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const env = import.meta.env || ({} as any);
  
  // 1. Tenta pegar do LocalStorage (Config Manual)
  let url = localStorage.getItem('monitorpro_supabase_url');
  let key = localStorage.getItem('monitorpro_supabase_key');

  // 2. Se não tiver no LocalStorage, tenta pegar das Variáveis de Ambiente (Vercel)
  if (!url || url.includes('placeholder')) {
     url = env.VITE_SUPABASE_URL;
  }
  if (!key || key === 'placeholder') {
     key = env.VITE_SUPABASE_KEY;
  }

  // 3. Validação Relaxada (Correção do Bug de Persistência)
  // Antes exigia .supabase.co, agora aceita qualquer HTTPS válido para evitar rejeição acidental
  const isUrlValid = url && url.startsWith('https://') && url.length > 10;
  const isKeyValid = key && key.length > 20;

  if (!isUrlValid || !isKeyValid) {
    console.warn("MonitorPro: Nenhuma credencial válida encontrada. Aguardando configuração manual.");
    return { 
        url: 'https://placeholder.supabase.co', 
        key: 'placeholder' 
    };
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
