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
  
  if(url && !url.includes('placeholder')) console.info('[MonitorPro] Supabase config carregado via', storedUrl ? 'localStorage' : 'Build ENV');
  
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

// Deprecated: Usar getGeminiKey() ou getGroqKey() para clareza.
export const getAiKey = () => {
  const gemini = getGeminiKey();
  if (gemini) return gemini;
  return getGroqKey();
};

/**
 * Recupera a chave da API Groq com a seguinte prioridade:
 * 1. Configuração do usuário na UI (localStorage: 'monitorpro_groq_key')
 * 2. Variáveis de ambiente do Vite (VITE_GROQ_API_KEY)
 * 3. Variáveis de ambiente gerais (GROQ_API_KEY)
 */
export const getGroqKey = () => {
  // 1. LocalStorage (configuração manual do usuário)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_groq_key');
    if (stored && stored.length > 5 && stored.startsWith('gsk_')) {
      console.info('[MonitorPro] Chave Groq carregada do localStorage.');
      return stored;
    }
  }
  
  // 2. Variáveis de ambiente (Vite)
  if (import.meta.env.VITE_GROQ_API_KEY) {
    console.info('[MonitorPro] Chave Groq carregada de VITE_GROQ_API_KEY.');
    return import.meta.env.VITE_GROQ_API_KEY;
  }
  if (import.meta.env.GROQ_API_KEY) {
    console.info('[MonitorPro] Chave Groq carregada de GROQ_API_KEY.');
    return import.meta.env.GROQ_API_KEY;
  }

  return "";
};

/**
 * Recupera a chave da API Gemini com a seguinte prioridade:
 * 1. Configuração do usuário na UI (localStorage: 'monitorpro_ai_key')
 * 2. Variáveis de ambiente do Vite (VITE_GOOGLE_API_KEY)
 * 3. Variáveis de ambiente gerais (GOOGLE_API_KEY)
 * 4. Chave injetada no build (process.env.API_KEY, comum em Vercel/Netlify)
 */
export const getGeminiKey = () => {
  // 1. Local Storage (Configuração Manual na UI)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_ai_key');
    if (stored && stored.length > 10) {
      console.info('[MonitorPro] Chave Gemini carregada do localStorage.');
      return stored;
    }
  }

  // 2. Variáveis de Ambiente Diretas (Vite)
  if (import.meta.env.VITE_GOOGLE_API_KEY) {
    console.info('[MonitorPro] Chave Gemini carregada de VITE_GOOGLE_API_KEY.');
    return import.meta.env.VITE_GOOGLE_API_KEY;
  }
  if (import.meta.env.GOOGLE_API_KEY) {
    console.info('[MonitorPro] Chave Gemini carregada de GOOGLE_API_KEY.');
    return import.meta.env.GOOGLE_API_KEY;
  }

  // 3. Process Env Injetado (vite.config.ts define) - FUNDAMENTAL PARA VERCEL
  // A chave 'process.env.API_KEY' é substituída em tempo de build pelo valor da variável de ambiente.
  if (typeof process !== 'undefined' && process.env?.API_KEY && process.env.API_KEY.length > 10) {
    console.info('[MonitorPro] Chave Gemini carregada de process.env.API_KEY (Build).');
    return process.env.API_KEY;
  }

  return "";
};