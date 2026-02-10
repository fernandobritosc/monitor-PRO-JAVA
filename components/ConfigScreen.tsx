<<<<<<< HEAD
import React, { useState } from 'react';
import { saveAppConfig, resetAppConfig } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';
import { Settings, Link, Key, AlertTriangle, ExternalLink, ClipboardPaste, CheckCircle2, Loader2 } from 'lucide-react';
=======

import React, { useState } from 'react';
import { saveAppConfig, resetAppConfig } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';
import { Settings, Link, Key, AlertTriangle, ExternalLink, ClipboardPaste, CheckCircle2, Loader2, Sparkles, Zap } from 'lucide-react';
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608

interface ConfigScreenProps {
  initialError?: string | null;
}

const ConfigScreen: React.FC<ConfigScreenProps> = ({ initialError }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
<<<<<<< HEAD
=======
  const [aiKey, setAiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
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
      setError('Não foi possível colar. Use Ctrl+V.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTestStatus('testing');
    setLoading(true);

    const trimmedUrl = url.trim();
    const trimmedKey = key.trim();
<<<<<<< HEAD
=======
    const trimmedAiKey = aiKey.trim();
    const trimmedGroqKey = groqKey.trim();
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608

    // Validação Básica
    if (!trimmedUrl.startsWith('https://')) {
      setError('A URL deve começar com "https://".');
      setLoading(false);
      setTestStatus('idle');
      return;
    }

    if (trimmedKey.length < 20) {
<<<<<<< HEAD
      setError('A Chave API parece muito curta.');
=======
      setError('A Chave API Supabase parece muito curta.');
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
      setLoading(false);
      setTestStatus('idle');
      return;
    }

    // Teste de Conexão
    try {
      // Cria cliente temporário para testar
      const tempClient = createClient(trimmedUrl, trimmedKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      // Faz um ping leve no banco. 
<<<<<<< HEAD
      // Se a chave estiver errada, retorna erro 401 ou similar.
=======
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
      const { error: pingError } = await tempClient.from('profiles').select('count', { count: 'exact', head: true });

      if (pingError) {
        // Se for erro de autenticação, rejeita.
        if (pingError.message.includes('Invalid API key') || pingError.code === 'PGRST301' || pingError.code === '401') {
           throw new Error('Chave API recusada pelo Supabase. Verifique se copiou a "anon" key corretamente.');
        }
        // Se for erro de conexão (URL errada)
        if (pingError.message.includes('FetchError') || pingError.message.includes('Failed to fetch')) {
           throw new Error('Não foi possível conectar nesta URL. Verifique o endereço.');
        }
<<<<<<< HEAD
        // Outros erros (tabela não existe, RLS, etc) indicam que a CONEXÃO funcionou, então prosseguimos.
=======
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
      }

      setTestStatus('success');
      
      // Salva as credenciais e recarrega
      setTimeout(() => {
<<<<<<< HEAD
        saveAppConfig(trimmedUrl, trimmedKey);
=======
        saveAppConfig(trimmedUrl, trimmedKey, trimmedAiKey, trimmedGroqKey);
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
      }, 800);

    } catch (err: any) {
      console.error("Connection Test Failed:", err);
      setError(err.message || 'Falha ao conectar. Verifique os dados.');
      setTestStatus('error');
      setLoading(false);
    }
  };

  const isErrorRecovery = !!initialError || !!error;

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
              {testStatus === 'success' ? 'Sucesso!' : isErrorRecovery ? 'Verifique a Conexão' : 'Configurar Acesso'}
            </span>
          </h1>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.2em]">
            {testStatus === 'success' ? 'Salvando no navegador...' : 'Conecte seu banco de dados'}
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
              <Link size={12} /> URL do Projeto
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
<<<<<<< HEAD
              <Key size={12} /> API Key (anon/public)
=======
              <Key size={12} /> Supabase API Key (anon/public)
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
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
                title="Colar"
                disabled={loading}
              >
                <ClipboardPaste size={16} />
              </button>
            </div>
          </div>
<<<<<<< HEAD
          
          <div className="text-xs text-slate-500 bg-slate-900/30 p-3 rounded-lg border border-white/5">
             <p>Seus dados ficarão salvos neste navegador.</p>
=======

          <div className="pt-4 border-t border-white/5 grid grid-cols-1 gap-4">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Sparkles size={12} className="text-yellow-400" /> Google Gemini API Key
                </label>
                <input
                type="password"
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all text-white placeholder-slate-600 font-mono text-xs"
                placeholder="AIza..."
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                disabled={loading}
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Zap size={12} className="text-orange-400" /> Groq API Key
                </label>
                <input
                type="password"
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-white placeholder-slate-600 font-mono text-xs"
                placeholder="gsk_..."
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                disabled={loading}
                />
            </div>
            <p className="text-[10px] text-slate-500 px-1">Chaves de IA são opcionais, mas recomendadas para explicações automáticas.</p>
          </div>
          
          <div className="text-xs text-slate-500 bg-slate-900/30 p-3 rounded-lg border border-white/5">
             <p>Seus dados ficarão salvos apenas neste navegador.</p>
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
             <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-cyan-400 font-bold mt-2 inline-flex items-center gap-1 hover:underline">
                Pegar chaves no Supabase <ExternalLink size={12} />
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
                 {testStatus === 'testing' ? 'Testando...' : 'Salvando...'}
              </>
            ) : testStatus === 'success' ? (
              <>
                 <CheckCircle2 size={20} />
                 Salvo com Sucesso!
              </>
            ) : (
              'Salvar Conexão'
            )}
          </button>
        </form>

        <div className="text-center mt-8">
            <button onClick={resetAppConfig} className="text-xs text-slate-600 hover:text-red-400 transition-colors font-bold uppercase tracking-widest">
                Limpar Dados e Reiniciar
            </button>
        </div>
      </div>
    </div>
  );
};

<<<<<<< HEAD
export default ConfigScreen;
=======
export default ConfigScreen;
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
