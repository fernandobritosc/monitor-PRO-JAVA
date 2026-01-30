
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Settings, User, Mail, Lock, CheckCircle, AlertOctagon } from 'lucide-react';

interface LoginProps {
  // onConfigClick: () => void; // Removido
}

const Login: React.FC<LoginProps> = (/* { onConfigClick } */) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rememberEmail, setRememberEmail] = useState(false);

  // Carregar e-mail salvo ao iniciar
  useEffect(() => {
    const savedEmail = localStorage.getItem('monitorpro_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        // CADASTRO SIMPLIFICADO
        // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'signUp' property.
        const { data, error } = await (supabase.auth as any).signUp({ 
          email, 
          password,
        });

        if (error) throw error;
        
        if (data.user) {
           setSuccessMsg('Conta criada! O login será automático ou você pode entrar agora.');
           setIsSignUp(false);
           // Não limpa a senha para facilitar
        }

      } else {
        // LOGIN DIRETO
        // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'signInWithPassword' property.
        const { error } = await (supabase.auth as any).signInWithPassword({ email, password });
        if (error) throw error;

        // Salvar e-mail se solicitado
        if (rememberEmail) {
          localStorage.setItem('monitorpro_saved_email', email);
        } else {
          localStorage.removeItem('monitorpro_saved_email');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#12151D] flex items-center justify-center p-6 relative overflow-hidden font-['Montserrat']"> {/* Nova cor de fundo */}
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[150px] rounded-full" /> {/* Blur aumentado */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[150px] rounded-full" /> {/* Blur aumentado */}

      {/* Botão de Reset/Configuração Manual (Removido) */}
      {/*
      <button 
        onClick={onConfigClick}
        className="absolute top-6 right-6 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest z-50 bg-black/20 px-4 py-2 rounded-full border border-white/5 hover:bg-white/10 hover:border-red-500/30 hover:text-red-400"
      >
        <Settings size={14} />
        Alterar Conexão / Limpar Dados
      </button>
      */}

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 mx-auto mb-6 flex items-center justify-center text-4xl shadow-2xl shadow-purple-500/20 animate-in zoom-in duration-700">
            🎯
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-white">
            MONITOR<span className="text-cyan-400">PRO</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.2em]">Acesso Independente</p>
        </div>

        <form onSubmit={handleAuth} className="glass rounded-3xl p-8 space-y-5 shadow-2xl border-white/5 relative">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Mail size={12} /> E-mail
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="username"
              required
              className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-600" {/* Ajustado de /50 e /10 */}
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
              id="password"
              name="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-600" {/* Ajustado de /50 e /10 */}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isSignUp && (
            <div className="flex items-center gap-2 py-1 cursor-pointer" onClick={() => setRememberEmail(!rememberEmail)}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberEmail ? 'bg-purple-500 border-purple-500' : 'border-slate-600 bg-slate-900/30'}`}> {/* Ajustado de /50 */}
                {rememberEmail && <CheckCircle size={12} className="text-white" />}
              </div>
              <span className="text-xs text-slate-400 select-none">Lembrar meu e-mail</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex flex-col gap-1 animate-in shake">
              <div className="flex items-center gap-2">
                 <AlertOctagon size={16} className="shrink-0" />
                 <span className="font-bold">{error}</span>
              </div>
              
              {(error.toLowerCase().includes('login') && error.toLowerCase().includes('disabled')) || error.includes('desativado') ? (
                 <div className="text-[10px] text-red-300 pl-6 border-l-2 border-red-500/30 ml-1 mt-1">
                    ⚠️ <b>Ação Necessária no Painel Supabase:</b>
                    <br/>
                    Auth {'>'} Providers {'>'} Email {'>'} Enable Email provider
                 </div>
              ) : null}
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
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl shadow-md shadow-purple-500/10 transition-all disabled:opacity-50 mt-4 flex justify-center items-center gap-2" {/* Ajustado sombra de lg/20 para md/10 */}
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

        <p className="mt-8 text-center text-slate-600 text-[10px] uppercase tracking-widest">
          MonitorPro Intelligence Security
        </p>
      </div>
    </div>
  );
};

export default Login;