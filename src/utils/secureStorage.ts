const KEY_STORAGE_KEY = '_mp_ek';
const SALT_STORAGE_KEY = '_mp_pbkdf2_salt';
const USER_KEY_FLAG = '_mp_user_key';

let apiKeyCache: { gemini?: string; groq?: string } = {};

export function getApiKeyCache() {
  return apiKeyCache;
}

function clearApiKeyCache() {
  apiKeyCache = {};
}

async function preDecryptApiKeys(): Promise<void> {
  const geminiStored = localStorage.getItem('monitorpro_ai_key');
  const groqStored = localStorage.getItem('monitorpro_groq_key');
  const cache: typeof apiKeyCache = {};

  if (geminiStored) {
    const decrypted = await decryptValue(geminiStored);
    if (decrypted !== geminiStored) cache.gemini = decrypted;
  }
  if (groqStored) {
    const decrypted = await decryptValue(groqStored);
    if (decrypted !== groqStored) cache.groq = decrypted;
  }

  apiKeyCache = cache;
}

export async function deriveKeyFromUserId(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  let salt = localStorage.getItem(SALT_STORAGE_KEY);
  if (!salt) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    salt = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(SALT_STORAGE_KEY, salt);
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exportedKey = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(Array.from(new Uint8Array(exportedKey))));
  sessionStorage.setItem(USER_KEY_FLAG, 'true');

  preDecryptApiKeys().catch(() => {});

  return key;
}

export function clearUserKey(): void {
  clearApiKeyCache();
  sessionStorage.removeItem(KEY_STORAGE_KEY);
  sessionStorage.removeItem(USER_KEY_FLAG);
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const storedKey = sessionStorage.getItem(KEY_STORAGE_KEY);
  if (storedKey) {
    const keyData = JSON.parse(storedKey);
    return await crypto.subtle.importKey(
      'raw',
      new Uint8Array(keyData),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exportedKey = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(Array.from(new Uint8Array(exportedKey))));

  return key;
}

export async function encryptValue(value: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(value);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch {
    return value;
  }
}

export async function decryptValue(encryptedValue: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return encryptedValue;
  }
}

export function setSecurely(key: string, value: string): void {
  encryptValue(value).then(encrypted => {
    localStorage.setItem(key, encrypted);
  });
}

export async function getSecurely(key: string): Promise<string | null> {
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  return decryptValue(stored);
}

export function isEncrypted(value: string): boolean {
  try {
    const decoded = atob(value);
    return decoded.length > 12;
  } catch {
    return false;
  }
}
