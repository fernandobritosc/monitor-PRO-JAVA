import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

export { supabase };

const SESSION_SALT_KEY = '_mp_salt';

function getSessionSalt(): string {
  let salt = sessionStorage.getItem(SESSION_SALT_KEY);
  if (!salt) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    salt = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(SESSION_SALT_KEY, salt);
  }
  return salt;
}

function obfuscate(value: string): string {
  const salt = getSessionSalt();
  let result = '';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i) ^ salt.charCodeAt(i % salt.length);
    result += String.fromCharCode(code);
  }
  return btoa(result);
}

function deobfuscate(encoded: string): string {
  try {
    const salt = getSessionSalt();
    const obfuscated = atob(encoded);
    let result = '';
    for (let i = 0; i < obfuscated.length; i++) {
      const code = obfuscated.charCodeAt(i) ^ salt.charCodeAt(i % salt.length);
      result += String.fromCharCode(code);
    }
    return result;
  } catch {
    return '';
  }
}

function isBase64(str: string): boolean {
  try { return btoa(atob(str)) === str; } catch { return false; }
}

function tryDecrypt(stored: string | null, minLength: number): string {
  if (!stored || stored.length <= minLength) return '';
  const trimmed = stored.trim().replace(/^"|"$/g, '');
  if (isBase64(trimmed)) {
    const decrypted = deobfuscate(trimmed);
    if (decrypted.length > 5) return decrypted;
  }
  return trimmed;
}

export const isConfigured = () => {
  const url = typeof window !== 'undefined' ? localStorage.getItem('monitorpro_supabase_url') : null;
  const key = typeof window !== 'undefined' ? localStorage.getItem('monitorpro_supabase_key') : null;
  return !!(url && key && !url.includes('placeholder'));
};

export const saveAppConfig = (newUrl: string, newKey: string, newAiKey?: string, newGroqKey?: string) => {
  if (!newUrl || !newKey) return;
  localStorage.setItem('monitorpro_supabase_url', newUrl.trim());
  localStorage.setItem('monitorpro_supabase_key', obfuscate(newKey.trim()));
  if (newAiKey) localStorage.setItem('monitorpro_ai_key', obfuscate(newAiKey.trim()));
  if (newGroqKey) localStorage.setItem('monitorpro_groq_key', obfuscate(newGroqKey.trim()));
  window.location.reload();
};

export const resetAppConfig = () => {
  localStorage.clear();
  window.location.reload();
};

export const getGroqKey = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_groq_key');
    const decrypted = tryDecrypt(stored, 5);
    if (decrypted) return decrypted;
  }
  if (typeof import.meta.env !== 'undefined') {
    return import.meta.env.VITE_GROQ_API_KEY || '';
  }
  return "";
};

export const getGeminiKey = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('monitorpro_ai_key');
    const decrypted = tryDecrypt(stored, 10);
    if (decrypted) return decrypted;
  }
  if (typeof import.meta.env !== 'undefined') {
    return import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
  }
  return "";
};
