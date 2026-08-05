import { supabase } from '../../lib/supabase';
import { getApiKeyCache, encryptValue } from '../../utils/secureStorage';

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

function tryLegacyDecrypt(stored: string | null): string {
  if (!stored) return '';
  const trimmed = stored.trim().replace(/^"|"$/g, '');
  if (isBase64(trimmed)) {
    const decrypted = deobfuscate(trimmed);
    if (decrypted.length > 5) return decrypted;
  }
  return stored;
}

function readApiKeyFromStorage(storageKey: string): string {
  const cache = getApiKeyCache();
  const cacheKey = storageKey === 'monitorpro_ai_key' ? 'gemini' : 'groq';
  if (cache[cacheKey]) return cache[cacheKey];

  const stored = localStorage.getItem(storageKey);
  if (!stored) return '';

  const legacy = tryLegacyDecrypt(stored);
  if (legacy !== stored) {
    encryptValue(legacy).then(enc => localStorage.setItem(storageKey, enc));
    return legacy;
  }
  return stored;
}

// O backend próprio é fixo (VITE_API_URL ou /api). Não há mais Supabase a configurar.
export const isConfigured = () => {
  return true;
};

export const saveAppConfig = (newUrl: string, newKey: string, newAiKey?: string, newGroqKey?: string) => {
  // Ignora URL/anon key do Supabase (o backend agora é fixo). Mantém apenas as chaves de IA.
  if (newAiKey) encryptValue(newAiKey.trim()).then(enc => localStorage.setItem('monitorpro_ai_key', enc));
  if (newGroqKey) encryptValue(newGroqKey.trim()).then(enc => localStorage.setItem('monitorpro_groq_key', enc));
  window.location.reload();
};

export const resetAppConfig = () => {
  localStorage.removeItem('monitorpro_supabase_url');
  localStorage.removeItem('monitorpro_supabase_key');
  localStorage.removeItem('monitorpro_ai_key');
  localStorage.removeItem('monitorpro_groq_key');
  window.location.reload();
};

export const getGroqKey = () => {
  const fromStorage = readApiKeyFromStorage('monitorpro_groq_key');
  if (fromStorage) return fromStorage;
  if (typeof import.meta.env !== 'undefined') {
    return import.meta.env.VITE_GROQ_API_KEY || '';
  }
  return "";
};

export const getGeminiKey = () => {
  const fromStorage = readApiKeyFromStorage('monitorpro_ai_key');
  if (fromStorage) return fromStorage;
  if (typeof import.meta.env !== 'undefined') {
    return import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
  }
  return "";
};