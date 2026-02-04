
import React, { useState, useEffect } from 'react';
import { supabase, getAiKey } from '../services/supabase';
import { Mail, Lock, CheckCircle, AlertOctagon, Trash2, Database, KeyRound, Loader2 } from 'lucide-react';

interface LoginProps {}

const Login: React.FC<LoginProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rememberEmail, setRememberEmail] = useState(false);
  
  // State para controlar se estamos tentando recuperar uma sessão existente
  const [isRestoring, setIsRestoring] = useState(true);

  // Diagnóstico
  const [configSource, setConfigSource] = useState<'Checking...' | 'ENV' | 'STORAGE' | 'MISSING'>('Checking...');
  const [configUrl, setConfigUrl] = useState('');
  const [aiKeyStatus, setAiKeyStatus] = useState<'CHECKING' | 'LOADED' | 'MISSING'>('CHECKING');
  const [aiKeyPrefix, setAiKeyPrefix] = useState('');

  // Carregar e-mail salvo ao iniciar e verificar token
  useEffect(() => {
    // 1. Verifica se existe token antes de mostrar o form
    const hasToken = typeof window !== 'undefined' && localStorage.getItem('monitorpro-auth-token');
    
    // Se tiver token, mantém o loading (isRestoring) um pouco mais para dar tempo do App.tsx validar
    if (hasToken) {
       const timer = setTimeout(() => {
          setIsRestoring(false); // Se demorar mais de 2.5s, libera o form (timeout de segurança)
       }, 2500);
       return () => clearTimeout(timer);
    } else {
       setIsRestoring(false);
    }

    const savedEmail = localStorage.getItem('monitorpro_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }

    // Check Config Source
    // @ts-ignore
    const envUrl = typeof __SUPABASE_URL__ !== 'undefined' ? __SUPABASE_URL__ : import.meta.env?.VITE_SUPABASE_URL;
    const storedUrl = localStorage.getItem('monitorpro_supabase_url');
    
    if (envUrl && envUrl.length > 5) {
        setConfigSource('ENV');
        setConfigUrl(envUrl);
    } else if (storedUrl) {
        setConfigSource('STORAGE');
        setConfigUrl(storedUrl);
    } else {
        setConfigSource('MISSING');
    }

    // Check AI Key
    const key = getAiKey();
    if (key && key.length > 10) {
        setAiKeyStatus('LOADED');
        setAiKeyPrefix(key.substring(0, 4) + '...');
    } else {
        setAiKeyStatus('MISSING');
    }

  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await (supabase.auth as any).signUp({ 
          email, 
          password,
        });

        if (error) throw error;
        
        if (data.user) {
           setSuccessMsg('Conta criada! Faça login para continuar.');
           setIsSignUp(false);
        }
        setLoading(false);

      } else {
        const { data, error } = await (supabase.auth as any).signInWithPassword({ email, password });
        if (error) throw error;

        if (rememberEmail) {
          localStorage.setItem('monitorpro_saved_email', email);
        } else {
          localStorage.removeItem('monitorpro_saved_email');
        }

        if (data.session) {
            setSuccessMsg('Login realizado! Entrando...');
            // O redirecionamento acontece automaticamente pelo App.tsx ouvindo a sessão
        }
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Erro na autenticação');
    }
  };

  const handleClearCache = () => {
    if(confirm('Isso limpará TODOS os dados locais deste site. Continuar?')) {
        localStorage.clear();
        window.location.reload();
    }
  };

  const hasToken = typeof window !== 'undefined' && localStorage.getItem('monitorpro-auth-token');

  // Se estiver restaurando e tiver token, mostra loader ao invés do form
  if (isRestoring && hasToken) {
      return (
        <div className="min-h-screen bg-[#12151D] flex flex-col items-center justify-center p-6 font-['Montserrat']">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mb-6 animate-pulse">
                <Loader2 className="text-white animate-spin" size={40} />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Restaurando Acesso...</h2>
            <p className="text-slate-500 text-sm">Verificando suas credenciais salvas (v{__APP_VERSION__})</p>
            <button onClick={() => setIsRestoring(false)} className="mt-8 text-xs text-slate-600 hover:text-white underline">
                Cancelar e entrar com outra conta
            </button>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#12151D] flex items-center justify-center p-6 relative overflow-hidden font-['Montserrat']">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[150px] rounded-full" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 mx-auto mb-6 flex items-center justify-center text-4xl shadow-2xl shadow-purple-500/20 animate-in zoom-in duration-700">
            🎯
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-white">
            MONITOR<span className="text-cyan-400">PRO</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.2em]">Acesso Independente v{__APP_VERSION__}</p>
        </div>

        <form onSubmit={handleAuth} className="glass rounded-3xl p-8 space-y-5 shadow-2xl border-white/5 relative">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Mail size={12} /> E-mail
            </label>
            <input
              type="email"
              autoComplete="username"
              required
              className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-600"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Lock size={12} /> Senha
            </label>
            <input
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-600"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isSignUp && (
            <div className="flex justify-between items-center py-1">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setRememberEmail(!rememberEmail)}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberEmail ? 'bg-purple-500 border-purple-500' : 'border-slate-600 bg-slate-900/30'}`}>
                  {rememberEmail && <CheckCircle size={12} className="text-white" />}
                </div>
                <span className="text-xs text-slate-400 select-none">Lembrar e-mail</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex flex-col gap-1 animate-in shake">
              <div className="flex items-center gap-2">
                 <AlertOctagon size={16} className="shrink-0" />
                 <span className="font-bold">{error}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle size={16} className="shrink-0" />
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl shadow-md shadow-purple-500/10 transition-all disabled:opacity-50 mt-4 flex justify-center items-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSignUp ? (
              'Criar Conta'
            ) : (
              'Entrar'
            )}
          </button>

          <div className="text-center pt-4 border-t border-white/5 mt-6">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMsg(null); }}
              className="text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-white transition-colors"
            >
              {isSignUp ? 'Já tem conta? Fazer Login' : 'Não tem conta? Cadastrar'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center space-y-4">
          <p className="text-slate-600 text-[10px] uppercase tracking-widest">
            MonitorPro Intelligence Security
          </p>
          <button 
            type="button" 
            onClick={handleClearCache}
            className="inline-flex items-center gap-2 text-[10px] text-slate-500 hover:text-red-400 transition-colors uppercase font-bold tracking-widest border border-white/5 hover:border-red-500/20 px-3 py-1.5 rounded-full"
          >
             <Trash2 size={10} /> Resetar Dados Locais
          </button>
        </div>
      </div>

      {/* DEBUG FOOTER */}
      <div className="absolute bottom-2 right-2 text-[9px] text-slate-700 font-mono text-right opacity-50 hover:opacity-100 transition-opacity pointer-events-none flex flex-col gap-1">
        <div className="font-bold text-white">v{__APP_VERSION__}</div>
        <div className="flex items-center justify-end gap-2">
            <span className={configSource === 'MISSING' ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>
                Cfg Source: {configSource}
            </span>
            <Database size={10} />
        </div>
        <div className="truncate max-w-[200px]">URL: {configUrl || 'N/A'}</div>
        <div className={hasToken ? 'text-green-500' : 'text-yellow-600'}>Session Stored: {hasToken ? 'YES' : 'NO'}</div>
        <div className={aiKeyStatus === 'LOADED' ? 'text-cyan-400 font-bold flex items-center gap-1 justify-end' : 'text-slate-600 flex items-center gap-1 justify-end'}>
            AI Key: {aiKeyStatus} {aiKeyPrefix && `(${aiKeyPrefix})`} {aiKeyStatus === 'LOADED' && <KeyRound size={8} />}
        </div>
      </div>
    </div>
  );
};

export default Login;
