import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  // Primeiro tenta pegar do localStorage (se usuário configurou manualmente)
  const storedUrl = localStorage.getItem('monitorpro_supabase_url');
  const storedKey = localStorage.getItem('monitorpro_supabase_key');
  
  // Se não existir no localStorage, usa as credenciais padrão
  const url = storedUrl || "https://dyxtalcvjcprmhuktyfd.supabase.co";
  const key = storedKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8";
  
  return { url, key };
};

const { url, key } = getSupabaseConfig();

// Valida se as credenciais estão presentes
if (!url || !key) {
  console.error('Credenciais do Supabase não configuradas');
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'monitorpro_auth_v9',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
});

export const saveAppConfig = (newUrl: string, newKey: string) => {
  if (!newUrl || !newKey) {
    console.error('URL e Key são obrigatórios');
    return;
  }
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

// Função auxiliar para verificar se as credenciais estão válidas
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('_health').select('*').limit(1);
    return !error;
  } catch (error) {
    console.error('Erro ao conectar com Supabase:', error);
    return false;
  }
};