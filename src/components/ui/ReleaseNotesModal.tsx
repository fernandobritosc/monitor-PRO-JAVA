import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { APP_RELEASES } from '../../constants/changelog';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-[90%] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col z-[10000] bg-[#0f172a]/95 backdrop-blur-xl rounded-[2rem] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.7)] pointer-events-auto"
          >
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">Histórico de Atualizações</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                  Changelog & Release Notes
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              {APP_RELEASES.map((release, index) => (
                <div key={release.version} className={`relative pl-8 ${index !== APP_RELEASES.length - 1 ? 'border-l-2 border-slate-800 pb-8' : ''}`}>
                  <div className="absolute -left-[11px] top-0 p-1 bg-[#0f172a] border border-slate-800 rounded-full">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`} />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-4">
                    <h3 className={`text-xl font-black tracking-tighter ${index === 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                      v{release.version}
                    </h3>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> {release.date}</span>
                      <span className="flex items-center gap-1.5"><Clock size={14} /> {release.time}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm font-medium text-slate-300 mb-4">
                    {release.description}
                  </p>
                  
                  <div className="space-y-3">
                    {release.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-xs text-slate-400 leading-relaxed font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
