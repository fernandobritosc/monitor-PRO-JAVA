import React, { useState, useEffect } from 'react';
import { supabase, getGeminiKey } from '../services/supabase';
import { preserveMissaoOnClear } from '../utils/localStorage';
import { Mail, Lock, CheckCircle, AlertOctagon, Trash2, Database, KeyRound, Loader2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { APP_VERSION } from '../constants';

interface LoginProps { }

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
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
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
    const key = getGeminiKey();
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
    if (confirm('Isso limpará TODOS os dados locais deste site. Continuar?')) {
      preserveMissaoOnClear(); // Usa função utilitária
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden font-['Montserrat'] text-foreground">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-secondary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[420px] z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Header / Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center text-4xl shadow-xl shadow-accent/20 mb-6 ring-1 ring-white/10 dark:ring-white/5">
            🎯
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            MONITOR<span className="text-accent">PRO</span>
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium uppercase tracking-[0.2em]">SISTEMA INTELIGENTE</p>
        </div>

        {/* Main Card */}
        <div className="w-full glass-premium rounded-[2rem] shadow-2xl relative">
          <div className="p-8 md:p-10 space-y-6">

            {/* Messages */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl flex items-start gap-3 animate-in shake">
                <AlertOctagon size={18} className="shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm p-4 rounded-xl flex items-center gap-3 animate-in fade-in">
                <CheckCircle size={18} className="shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-5">

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Mail size={14} /> E-mail de Acesso
                </label>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  className="w-full bg-user-block/30 border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-muted-foreground/50 text-foreground text-sm font-medium"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Lock size={14} /> Senha Segura
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    required
                    className="w-full bg-user-block/30 border border-border rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-muted-foreground/50 text-foreground text-sm font-medium tracking-wide"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-4 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center z-20"
                    tabIndex={-1}
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <div className="flex justify-between items-center py-2 px-1">
                  <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setRememberEmail(!rememberEmail)}>
                    <div className={`w-5 h-5 rounded shadow-sm border flex items-center justify-center transition-all duration-300 ${rememberEmail ? 'bg-accent border-accent text-white' : 'bg-background border-border group-hover:border-muted-foreground'}`}>
                      {rememberEmail && <CheckCircle size={14} className="animate-in zoom-in" />}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground select-none group-hover:text-foreground transition-colors">Lembrar acesso</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-accent to-accent-secondary hover:from-accent/90 hover:to-accent-secondary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-accent/20 transition-all duration-300 disabled:opacity-50 mt-2 flex justify-center items-center gap-2 text-sm uppercase tracking-widest active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isSignUp ? (
                  'Criar Conta Agora'
                ) : (
                  'Entrar no Sistema'
                )}
              </button>
            </form>

            <div className="pt-6 border-t border-border/50 text-center">
              <p className="text-sm text-muted-foreground">
                {isSignUp ? 'Já possui registro?' : 'Ainda não tem acesso?'}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMsg(null); }}
                  className="ml-2 font-bold text-accent hover:text-accent-secondary transition-colors"
                >
                  {isSignUp ? 'Fazer login' : 'Cadastre-se'}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer / Diagnostics */}
        <div className="mt-8 w-full">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="mx-auto flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors py-2 px-4 rounded-full"
          >
            <Database size={12} />
            <span>Diagnóstico do Sistema</span>
            {showDiagnostics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showDiagnostics && (
            <div className="mt-4 p-4 rounded-xl bg-user-block border border-border animate-in fade-in slide-in-from-top-2 text-xs font-mono text-muted-foreground space-y-3">
              <p className="flex justify-between"><strong className="text-foreground">App Version:</strong> <span>v{APP_VERSION}</span></p>

              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                <strong className="text-foreground flex items-center gap-1.5"><Database size={12} className={configSource === 'MISSING' ? 'text-destructive' : 'text-emerald-500'} /> Supabase DB:</strong>
                <span className={configSource === 'MISSING' ? 'text-destructive font-bold' : 'text-emerald-500'}>{configSource}</span>
              </div>

              <p className="truncate text-[10px] opacity-70 text-right">{configUrl || 'N/A'}</p>

              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                <strong className="text-foreground flex items-center gap-1.5"><KeyRound size={12} className={aiKeyStatus === 'LOADED' ? 'text-accent' : 'text-muted-foreground'} /> Engine IA:</strong>
                <span className={aiKeyStatus === 'LOADED' ? 'text-accent font-bold' : 'text-muted-foreground'}>{aiKeyStatus} {aiKeyPrefix && `(${aiKeyPrefix})`}</span>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="w-full flex items-center justify-center gap-2 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors uppercase font-bold tracking-widest border border-border px-3 py-2 rounded-lg"
                >
                  <Trash2 size={12} /> Resetar Cache Local
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Login;