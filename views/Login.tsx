import React, { useState, useEffect } from 'react';
import { supabase, getAiKey } from '../services/supabase';
import { Mail, Lock, CheckCircle, AlertOctagon, Trash2, Database, KeyRound, Loader2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

interface LoginProps {}

// Safe version check
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.17';

const Login: React.FC<LoginProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Diagnóstico
  const [configSource, setConfigSource] = useState<'Checking...' | 'ENV' | 'STORAGE' | 'MISSING'>('Checking...');
  const [configUrl, setConfigUrl] = useState('');
  const [aiKeyStatus, setAiKeyStatus] = useState<'CHECKING' | 'LOADED' | 'MISSING'>('CHECKING');
  const [aiKeyPrefix, setAiKeyPrefix] = useState('');

  useEffect(() => {
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
            // O App.tsx detectará a sessão automaticamente
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

  return (
    <div className="min-h-screen bg-[#12151D] flex items-center justify-center p-4 relative overflow-hidden font-['Montserrat']">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[150px] rounded-full" />

      <div className="w-full max-w-md z-10 flex flex-col gap-6">
        <div className="text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 mx-auto mb-6 flex items-center justify-center text-4xl shadow-2xl shadow-purple-500/20 animate-in zoom-in duration-700">
            🎯
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-white">
            MONITOR<span className="text-cyan-400">PRO</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-[0.2em]">Acesso Independente v{APP_VERSION}</p>
        </div>

        <form onSubmit={handleAuth} className="glass rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl border-white/5 relative mx-2">
          
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
            <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    required
                    className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-600"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-4 text-slate-500 hover:text-white transition-colors flex items-center justify-center z-20"
                    tabIndex={-1}
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
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
        
        {/* NOVO PAINEL DE DIAGNÓSTICO */}
        <div className="mt-4 mx-2">
          <div className="glass rounded-xl border border-white/5 overflow-hidden">
            <button 
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full p-3 flex justify-between items-center hover:bg-white/5 transition-colors"
            >
              <span className="text-xs font-bold uppercase text-slate-500 tracking-widest">Status do Sistema</span>
              {showDiagnostics ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>

            {showDiagnostics && (
              <div className="p-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 space-y-2 text-xs font-mono text-slate-400">
                <p><strong className="text-white">Versão:</strong> v{APP_VERSION}</p>
                <div className="flex items-center gap-2">
                  <Database size={12} className={configSource === 'MISSING' ? 'text-red-500' : 'text-green-500'} />
                  <p><strong className="text-white">Fonte Cfg:</strong> <span className={configSource === 'MISSING' ? 'text-red-400 font-bold' : 'text-green-400'}>{configSource}</span></p>
                </div>
                <p className="truncate"><strong className="text-white">URL:</strong> {configUrl || 'N/A'}</p>
                <div className="flex items-center gap-2">
                   <KeyRound size={12} className={aiKeyStatus === 'LOADED' ? 'text-cyan-400' : 'text-slate-600'} />
                   <p><strong className="text-white">Chave IA:</strong> <span className={aiKeyStatus === 'LOADED' ? 'text-cyan-400 font-bold' : 'text-slate-500'}>{aiKeyStatus} {aiKeyPrefix && `(${aiKeyPrefix})`}</span></p>
                </div>
                <button 
                    type="button" 
                    onClick={handleClearCache}
                    className="w-full mt-3 inline-flex items-center justify-center gap-2 text-[10px] text-slate-500 hover:text-red-400 transition-colors uppercase font-bold tracking-widest border border-white/5 hover:border-red-500/20 px-3 py-1.5 rounded-full"
                >
                    <Trash2 size={10} /> Resetar Dados Locais
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;