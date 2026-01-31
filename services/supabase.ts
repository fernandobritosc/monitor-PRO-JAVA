import { createClient } from '@supabase/supabase-js';

// Função única e limpa para evitar o erro de "redeclarar variável"
const getSupabaseConfig = () => {
  // TESTE DE FORÇA BRUTA: Chaves fixas para ignorar qualquer erro de ambiente ou cache
  const url = "https://dyxtalcvjcprmhuktyfd.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8";

  return { url, key };
};

const { url, key } = getSupabaseConfig();

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'monitorpro_auth_v9',
    storage: window.localStorage
  },
});

export const saveAppConfig = (newUrl: string, newKey: string) => {
  localStorage.setItem('monitorpro_supabase_url', newUrl.trim());
  localStorage.setItem('monitorpro_supabase_key', newKey.trim());
  window.location.reload();
};

export const resetAppConfig = () => {
  localStorage.removeItem('monitorpro_supabase_url');
  localStorage.removeItem('monitorpro_supabase_key');
  localStorage.removeItem('monitorpro_auth_v9');
  window.location.reload();
};