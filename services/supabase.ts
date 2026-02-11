import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  // 1. Prioritize localStorage for user-defined config
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('monitorpro_supabase_url') : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('monitorpro_supabase_key') : null;

  if (storedUrl && storedKey && storedUrl.length > 5 && !storedUrl.includes('placeholder')) {
    console.info('[MonitorPro] Supabase config carregado via localStorage (prioridade).');
    return {
      url: storedUrl.trim().replace(/^"|"$/g, ''),
      key: storedKey.trim().replace(/^"|"$/g, '')
    };
  }

  // 2. Fallback to build-time environment variables
  let envUrl = "";
  let envKey = "";
  if (typeof __SUPABASE_URL__ !== 'undefined') envUrl = __SUPABASE_URL__;
  if (typeof __SUPABASE_KEY__ !== 'undefined') envKey = __SUPABASE_KEY__;
  
  if (envUrl && envUrl.length > 5 && !envUrl.includes('undefined')) {
    console.info('[MonitorPro] Supabase config carregado via Build ENV.');
    return {
      url: envUrl.trim().replace(/^"|"$/g, ''),
      key: envKey.trim().replace(/^"|"$/g, '')
    };
  }
  
  // 3. If nothing is found
  console.warn('[MonitorPro] Nenhuma configuração Supabase encontrada (ENV ou localStorage).');
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
 * 1. Configuração do usuário na UI (localStorage)
 * 2. Variáveis de ambiente (Vite / Build)
 */
export const getGroqKey = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_groq_key');
    if (stored && stored.length > 5 && stored.startsWith('gsk_')) {
      console.info('[MonitorPro] Chave Groq carregada do localStorage (prioridade).');
      return stored;
    }
  }
  
  // Fallback para vários formatos de ENV injetados pelo Vite no build
  let envKey = "";
  try {
    // @ts-ignore - Vite define isso no build
    if (typeof import.meta.env !== 'undefined') {
       envKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY || '';
    }
  } catch(e) {}

  if (envKey) {
    console.info('[MonitorPro] Chave Groq carregada de ENV (fallback).');
    return envKey;
  }

  return "";
};

/**
 * Recupera a chave da API Gemini com a seguinte prioridade:
 * 1. Configuração do usuário na UI (localStorage)
 * 2. Variáveis de ambiente (Vite / Build)
 */
export const getGeminiKey = () => {
  // 1. Prioridade máxima: Chave definida pelo usuário no aplicativo.
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_ai_key');
    if (stored && stored.length > 10) {
      console.info('[MonitorPro] Chave Gemini carregada do localStorage (prioridade).');
      return stored;
    }
  }

  // 2. Fallback: Chave injetada durante o build (p. ex., das Environment Variables da Vercel).
  //    Acessada através de `process.env.API_KEY` conforme definido em vite.config.ts.
  let envKey = "";
  try {
    if (typeof process !== 'undefined' && process.env.API_KEY) {
      envKey = process.env.API_KEY ?? '';
    }
  } catch (e) {
     // Em alguns ambientes, `process` pode não estar definido.
  }
  
  if (envKey && envKey.length > 10) {
    console.info('[MonitorPro] Chave Gemini carregada de ENV (fallback).');
    return envKey;
  }

  return "";
};