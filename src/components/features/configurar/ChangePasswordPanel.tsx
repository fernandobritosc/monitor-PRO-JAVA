import React, { useState } from 'react';
import { KeyRound, Loader2, CheckCircle2, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const ChangePasswordPanel = () => {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [show, setShow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!current || !newPass || !confirm) {
      setMessage({ type: 'error', text: 'Preencha todos os campos.' });
      return;
    }
    if (newPass.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (newPass !== confirm) {
      setMessage({ type: 'error', text: 'A confirmação não confere com a nova senha.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.changePassword(current, newPass);
    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error });
    } else {
      setMessage({ type: 'success', text: 'Senha alterada com sucesso! Use a nova senha no próximo login.' });
      setCurrent('');
      setNewPass('');
      setConfirm('');
    }
  };

  const inputCls = "w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-orange-500/50 outline-none";
  const labelCls = "text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2";

  return (
    <div className="pt-4 border-t border-white/5 space-y-4">
      <h4 className="text-sm font-bold flex items-center gap-3 mb-1 text-white">
        <KeyRound size={16} className="text-orange-400" /> Alterar Senha
      </h4>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <label className={labelCls}>Senha atual</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} className={inputCls} value={current}
              onChange={e => setCurrent(e.target.value)} placeholder="Sua senha atual" disabled={loading} />
          </div>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Nova senha</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} className={inputCls} value={newPass}
              onChange={e => setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" disabled={loading} />
          </div>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Confirmar nova senha</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} className={inputCls} value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="Repita a nova senha" disabled={loading} />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <EyeOff size={16} />
            </button>
          </div>
        </div>

        {message && (
          <div className={`text-xs p-3 rounded-xl flex items-start gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <span className="shrink-0 mt-0.5">⚠️</span>}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" /> : <KeyRound size={18} />}
          {loading ? 'Alterando...' : 'Alterar Senha'}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordPanel;