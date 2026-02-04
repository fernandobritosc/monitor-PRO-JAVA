import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
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

  return { url, key };
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
  }
);

export const isConfigured = url && key && !url.includes('placeholder');

export const saveAppConfig = (newUrl: string, newKey: string, newAiKey?: string, newGroqKey?: string) => {
  if (!newUrl || !newKey) return;
  localStorage.setItem('monitorpro_supabase_url', newUrl.trim());
  localStorage.setItem('monitorpro_supabase_key', newKey.trim());
  if (newAiKey) localStorage.setItem('monitorpro_ai_key', newAiKey.trim());
  if (newGroqKey) localStorage.setItem('monitorpro_groq_key', newGroqKey.trim());
  window.location.reload();
};

export const resetAppConfig = () => {
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
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_ai_key');
    // Validação relaxada: removemos o check de startsWith('AIza') para aceitar chaves proxy ou mal formatadas mas válidas
    if (stored && stored.length > 10) return stored;
  }

  if (import.meta.env.VITE_GOOGLE_API_KEY) return import.meta.env.VITE_GOOGLE_API_KEY;
  if (import.meta.env.GOOGLE_API_KEY) return import.meta.env.GOOGLE_API_KEY;

  return "";
};