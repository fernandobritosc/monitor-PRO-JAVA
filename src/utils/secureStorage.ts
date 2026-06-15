const KEY_STORAGE_KEY = '_mp_ek';

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
