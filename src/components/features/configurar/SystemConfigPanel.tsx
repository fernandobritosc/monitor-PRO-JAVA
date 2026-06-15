import { Settings, Link, Key, Sparkles, Zap, Save, Loader2, Smartphone } from 'lucide-react';
import KeyStatusIndicator from './KeyStatusIndicator';

interface SystemConfigPanelProps {
  sysUrl: string;
  sysKey: string;
  sysAiKey: string;
  sysGroqKey: string;
  sysLoading: boolean;
  isInstallable: boolean;
  onUrlChange: (v: string) => void;
  onKeyChange: (v: string) => void;
  onAiKeyChange: (v: string) => void;
  onGroqKeyChange: (v: string) => void;
  onSave: () => void;
  onInstallApp: () => void;
}

const SystemConfigPanel = ({
  sysUrl, sysKey, sysAiKey, sysGroqKey, sysLoading,
  isInstallable,
  onUrlChange, onKeyChange, onAiKeyChange, onGroqKeyChange,
  onSave, onInstallApp,
}: SystemConfigPanelProps) => {
  return (
    <div className="glass rounded-2xl p-6 shadow-xl animate-in slide-in-from-right-2 max-w-2xl mx-auto space-y-8">
      <div>
        <h3 className="text-2xl font-bold flex items-center gap-3 mb-2"><Settings className="text-orange-400" /> Configuração do Sistema</h3>
        <p className="text-slate-400 text-sm">Gerencie suas chaves de API e conexões. Essas informações ficam salvas apenas no seu navegador.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Link size={12} /> Supabase URL</label><KeyStatusIndicator value={sysUrl} type="url" /></div>
          <input type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-orange-500/50 outline-none" value={sysUrl} onChange={e => onUrlChange(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Key size={12} /> Supabase Anon Key</label><KeyStatusIndicator value={sysKey} type="supabase" /></div>
          <input type="password" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-orange-500/50 outline-none" value={sysKey} onChange={e => onKeyChange(e.target.value)} />
        </div>

        <div className="pt-4 border-t border-white/5 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Sparkles size={12} className="text-yellow-400" /> Google Gemini API Key</label><KeyStatusIndicator value={sysAiKey} type="gemini" /></div>
            <input type="password" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-yellow-500/50 outline-none" value={sysAiKey} onChange={e => onAiKeyChange(e.target.value)} placeholder="AIza..." />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Zap size={12} className="text-orange-400" /> Groq API Key</label><KeyStatusIndicator value={sysGroqKey} type="groq" /></div>
            <input type="password" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-orange-500/50 outline-none" value={sysGroqKey} onChange={e => onGroqKeyChange(e.target.value)} placeholder="gsk_..." />
          </div>
          <p className="text-[10px] text-slate-500 px-1">Chaves de IA são opcionais. Se preenchidas, ativam explicações automáticas nos Flashcards.</p>
        </div>
      </div>

      <button onClick={onSave} disabled={sysLoading} className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50">
        {sysLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
        Salvar e Recarregar
      </button>

      {isInstallable && (
        <div className="pt-6 border-t border-white/10 animate-in slide-in-from-bottom-2">
          <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Smartphone className="text-indigo-400" size={24} />
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest">App no Dispositivo</h4>
                <p className="text-[10px] text-slate-400">Instale como um aplicativo para acesso rápido e offline.</p>
              </div>
            </div>
            <button onClick={onInstallApp} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
              Instalar Agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemConfigPanel;
