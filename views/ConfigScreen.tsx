import React, { useState } from 'react';
import { saveAppConfig, resetAppConfig } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';
import { Settings, Link, Key, AlertTriangle, ExternalLink, ClipboardPaste, CheckCircle2, Loader2 } from 'lucide-react';

interface ConfigScreenProps {
  initialError?: string | null;
}

const ConfigScreen: React.FC<ConfigScreenProps> = ({ initialError }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(initialError || null);

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setKey(text.trim());
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      setError('Não foi possível colar. Verifique as permissões do navegador.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTestStatus('testing');
    setLoading(true);

    const trimmedUrl = url.trim();
    const trimmedKey = key.trim();

    // 1. Validação de Formato
    if (!trimmedUrl.startsWith('https://')) {
      setError('A URL deve começar com "https://".');
      setLoading(false);
      setTestStatus('idle');
      return;
    }
    if (!trimmedUrl.includes('.supabase.co')) {
      setError('A URL parece incorreta. Geralmente termina em ".supabase.co".');
      setLoading(false);
      setTestStatus('idle');
      return;
    }
    if (trimmedKey.length < 20) {
      setError('A Chave API parece muito curta.');
      setLoading(false);
      setTestStatus('idle');
      return;
    }

    // 2. Teste de Conexão Real
    try {
      const tempClient = createClient(trimmedUrl, trimmedKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      // Tenta uma requisição pública leve. Se a chave for inválida, o Supabase retorna erro 401 ou mensagem específica.
      // Usamos 'registros_estudos' apenas como alvo de ping. Se não existir, erro é 404, o que significa que a CONEXÃO funcionou.
      const { error: pingError } = await tempClient.from('registros_estudos').select('count', { count: 'exact', head: true });

      if (pingError) {
        // Se o erro for de autenticação, bloqueia.
        if (pingError.message.includes('Invalid API key') || pingError.code === 'PGRST301' || pingError.code === '401') {
           throw new Error('Chave API Inválida: O Supabase recusou a conexão.');
        }
        if (pingError.message.includes('FetchError') || pingError.message.includes('Failed to fetch')) {
           throw new Error('Erro de Rede: Não foi possível alcançar a URL do projeto.');
        }
        // Outros erros (ex: tabela não existe) significam que a chave provavelmente é válida, mas o banco está vazio.
        // Permitimos prosseguir.
      }

      setTestStatus('success');
      
      // Delay pequeno para mostrar o sucesso visualmente antes de recarregar
      setTimeout(() => {
        saveAppConfig(trimmedUrl, trimmedKey);
      }, 500);

    } catch (err: any) {
      console.error("Connection Test Failed:", err);
      setError(err.message || 'Falha ao conectar com estas credenciais.');
      setTestStatus('error');
      setLoading(false);
    }
  };

  const isErrorRecovery = !!initialError;

  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center p-6 relative overflow-hidden font-['Montserrat']">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-lg z-10">
        <div className="text-center mb-10">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br mx-auto mb-6 flex items-center justify-center text-4xl shadow-2xl ${isErrorRecovery || testStatus === 'error' ? 'from-red-500 to-orange-500 shadow-red-500/20' : 'from-purple-500 to-cyan-500 shadow-purple-500/20'}`}>
            {testStatus === 'testing' ? (
               <Loader2 className="animate-spin text-white" size={40} />
            ) : testStatus === 'success' ? (
               <CheckCircle2 className="text-white animate-in zoom-in" size={40} />
            ) : isErrorRecovery ? (
               <AlertTriangle className="text-white" size={40} />
            ) : (
               <Settings className="text-white" size={40} />
            )}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            <span className={`bg-gradient-to-r bg-clip-text text-transparent ${isErrorRecovery || testStatus === 'error' ? 'from-red-400 to-orange-400' : 'from-purple-400 to-cyan-400'}`}>
              {testStatus === 'success' ? 'Conexão Aprovada!' : isErrorRecovery ? 'Erro de Conexão' : 'Configuração Inicial'}
            </span>
          </h1>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.2em]">
            {testStatus === 'success' ? 'Salvando e iniciando...' : isErrorRecovery ? 'Verifique suas credenciais' : 'Conecte seu Banco de Dados'}
          </p>
        </div>

        <form onSubmit={handleSave} className="glass rounded-3xl p-8 space-y-6 shadow-2xl border-white/5 relative">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle size={24} className="shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Link size={12} /> URL do Projeto Supabase
            </label>
            <div className="relative">
              <Link size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="url"
                required
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-600"
                placeholder="https://exemplo.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Key size={12} /> Chave Pública (anon key)
            </label>
            <div className="relative flex items-center">
              <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <input
                type="text"
                required
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-600 font-mono text-xs"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                disabled={loading}
              />
              <button 
                type="button" 
                onClick={handlePasteKey} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors" 
                title="Colar da área de transferência"
                disabled={loading}
              >
                <ClipboardPaste size={16} />
              </button>
            </div>
          </div>
          
          <div className="text-xs text-slate-500 bg-slate-900/30 p-3 rounded-lg border border-white/5">
             <p>As chaves não são armazenadas em nossos servidores. Elas ficam salvas apenas no seu navegador.</p>
             <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-cyan-400 font-bold mt-2 inline-flex items-center gap-1 hover:underline">
                Onde encontrar minhas chaves? <ExternalLink size={12} />
             </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-70 mt-4 flex justify-center items-center gap-2
              ${testStatus === 'success' 
                ? 'bg-green-500 text-white shadow-green-500/20' 
                : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-purple-500/20'
              }`}
          >
            {loading ? (
              <>
                 <Loader2 size={20} className="animate-spin" />
                 {testStatus === 'testing' ? 'Testando Conexão...' : 'Salvando...'}
              </>
            ) : testStatus === 'success' ? (
              <>
                 <CheckCircle2 size={20} />
                 Tudo Pronto!
              </>
            ) : (
              'Testar e Salvar'
            )}
          </button>
        </form>

        <div className="text-center mt-8">
            <button onClick={resetAppConfig} className="text-xs text-slate-600 hover:text-red-400 transition-colors font-bold uppercase tracking-widest">
                Limpar Dados Salvos
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigScreen;