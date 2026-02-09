
import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
<<<<<<< HEAD
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
=======
  let envUrl = "";
  let envKey = "";

  // Globals definidos no vite.config.ts
  if (typeof __SUPABASE_URL__ !== 'undefined') envUrl = __SUPABASE_URL__;
  if (typeof __SUPABASE_KEY__ !== 'undefined') envKey = __SUPABASE_KEY__;

  // Fallback para import.meta.env (Vite)
  if (!envUrl && typeof import.meta !== 'undefined' && import.meta.env) {
    envUrl = import.meta.env.VITE_SUPABASE_URL || "";
    envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  }

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('monitorpro_supabase_url') : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('monitorpro_supabase_key') : null;

  let url = envUrl && envUrl.length > 5 && !envUrl.includes('undefined') ? envUrl : (storedUrl || "");
  let key = envUrl && envKey ? envKey : (storedKey || "");

  url = url ? url.trim().replace(/^"|"$/g, '') : "";
  key = key ? key.trim().replace(/^"|"$/g, '') : "";
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608

  return { url, key };
};

const { url, key } = getSupabaseConfig();

export const supabase = createClient(
<<<<<<< HEAD
  url, 
  key,
=======
  url && url.startsWith('http') ? url : "https://placeholder.supabase.co",
  key || "placeholder",
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
<<<<<<< HEAD
      storageKey: 'monitorpro_auth_v9', 
      storage: window.localStorage
=======
      storageKey: 'monitorpro-auth-token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
    },
  }
);

<<<<<<< HEAD
export const saveAppConfig = (newUrl: string, newKey: string) => {
  // Limpa espaços em branco que causam erros
  const cleanUrl = newUrl.trim();
  const cleanKey = newKey.trim();
  
  localStorage.setItem('monitorpro_supabase_url', cleanUrl);
  localStorage.setItem('monitorpro_supabase_key', cleanKey);
  
  // Força reload para aplicar
=======
export const isConfigured = url && key && !url.includes('placeholder');

export const saveAppConfig = (newUrl: string, newKey: string, newAiKey?: string, newGroqKey?: string) => {
  if (!newUrl || !newKey) return;
  localStorage.setItem('monitorpro_supabase_url', newUrl.trim());
  localStorage.setItem('monitorpro_supabase_key', newKey.trim());
  if (newAiKey) localStorage.setItem('monitorpro_ai_key', newAiKey.trim());
  if (newGroqKey) localStorage.setItem('monitorpro_groq_key', newGroqKey.trim());
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  window.location.reload();
};

export const resetAppConfig = () => {
<<<<<<< HEAD
  // Remove chaves de configuração
  localStorage.removeItem('monitorpro_supabase_url');
  localStorage.removeItem('monitorpro_supabase_key');
  // Remove sessão antiga para evitar conflito
  localStorage.removeItem('monitorpro_auth_v9');
  
  window.location.reload();
};
=======
  localStorage.clear();
  window.location.reload();
};

export const getAiKey = () => {
  let key = "";

  // 1. LocalStorage (configuração manual)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_ai_key');
    if (stored && stored.length > 5) return stored;
  }

  // 2. Variáveis de ambiente
  if (import.meta.env.VITE_GROQ_API_KEY) return import.meta.env.VITE_GROQ_API_KEY;
  if (import.meta.env.GROQ_API_KEY) return import.meta.env.GROQ_API_KEY;
  if (import.meta.env.VITE_GOOGLE_API_KEY) return import.meta.env.VITE_GOOGLE_API_KEY;
  if (import.meta.env.GOOGLE_API_KEY) return import.meta.env.GOOGLE_API_KEY;

  // 3. process.env (definido via vite.config.ts)
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    key = process.env.API_KEY;
  }

  if (!key || key.length < 5) {
    if (import.meta.env.VITE_API_KEY) key = import.meta.env.VITE_API_KEY;
    else if (import.meta.env.API_KEY) key = import.meta.env.API_KEY;
  }

  return key;
};

export const getGroqKey = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_groq_key');
    if (stored && stored.length > 5 && stored.startsWith('gsk_')) return stored;
  }

  if (import.meta.env.VITE_GROQ_API_KEY) return import.meta.env.VITE_GROQ_API_KEY;
  if (import.meta.env.GROQ_API_KEY) return import.meta.env.GROQ_API_KEY;

  return "";
};

export const getGeminiKey = () => {
  // 1. Local Storage (Configuração Manual na UI)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_ai_key');
    if (stored && stored.length > 10) return stored;
  }

  // 2. Variáveis de Ambiente Diretas (Vite)
  if (import.meta.env.VITE_GOOGLE_API_KEY) return import.meta.env.VITE_GOOGLE_API_KEY;
  if (import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY;
  if (import.meta.env.GOOGLE_API_KEY) return import.meta.env.GOOGLE_API_KEY;

  // 3. Process Env Injetado (vite.config.ts define) - FUNDAMENTAL PARA VERCEL
  // A chave 'process.env.API_KEY' é substituída em tempo de build pelo valor da variável de ambiente
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }

  return "";
};
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
