import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const MissionBanner: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-3xl -mr-32 -mt-32" />
      <div className="flex items-center gap-6 relative z-10">
        <div className="p-4 bg-yellow-500/20 rounded-2xl">
          <Sparkles className="text-yellow-500" size={28} />
        </div>
        <div>
          <h3 className="text-lg font-black text-yellow-500 uppercase tracking-tighter">Radar Global Ativado</h3>
          <p className="text-xs text-[hsl(var(--text-muted))] font-medium mt-1 leading-relaxed">
            Você ainda não selecionou sua missão principal. Exibindo dados de <span className="text-yellow-500 font-bold italic underline">todos os seus estudos</span>.
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate('/configurar')}
        className="px-8 py-3 bg-yellow-500 text-[hsl(var(--bg-main))] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_-5px_rgba(234,179,8,0.4)] relative z-10"
      >
        Definir Missão
      </button>
    </div>
  );
};

export default MissionBanner;
