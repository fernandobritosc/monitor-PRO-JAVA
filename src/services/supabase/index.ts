
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

export { supabase };

export const isConfigured = () => {
  const url = typeof window !== 'undefined' ? localStorage.getItem('monitorpro_supabase_url') : null;
  const key = typeof window !== 'undefined' ? localStorage.getItem('monitorpro_supabase_key') : null;
  return !!(url && key && !url.includes('placeholder'));
};

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

export const getGroqKey = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_groq_key');
    if (stored && stored.length > 5) return stored.trim().replace(/^"|"$/g, '');
  }
  if (typeof import.meta.env !== 'undefined') {
    return import.meta.env.VITE_GROQ_API_KEY || '';
  }
  return "";
};

export const getGeminiKey = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_ai_key');
    if (stored && stored.length > 10) return stored.trim().replace(/^"|"$/g, '');
  }
  if (typeof import.meta.env !== 'undefined') {
    return import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
  }
  return "";
};
