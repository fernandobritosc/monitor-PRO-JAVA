import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, X, Clock, Settings } from 'lucide-react';
import { useTimerStore } from '../../stores/useTimerStore';

export const StudyTimer: React.FC = () => {
    const { 
        seconds, isRunning, mode, isVisible, showSettings, pomodoroMinutes,
        start, pause, reset, toggleVisibility, setShowSettings, setMode, setPomodoroMinutes, tick 
    } = useTimerStore();

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hrs > 0 ? hrs.toString().padStart(2, '0') + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Inicializar áudio e gerenciar título da aba
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.load();

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            document.title = 'MonitorPro - Sistema Inteligente';
        };
    }, []);

    // Atualizar título da aba dinamicamente
    useEffect(() => {
        if (!isVisible) {
            document.title = 'MonitorPro - Sistema Inteligente';
            return;
        }

        let flashInterval: NodeJS.Timeout;

        if (mode === 'pomodoro' && seconds === 0 && !isRunning) {
            flashInterval = setInterval(() => {
                document.title = document.title === '⚠️ TEMPO ESGOTADO ⚠️' ? '00:00 - MonitorPro' : '⚠️ TEMPO ESGOTADO ⚠️';
            }, 500);
        } else {
            const timeStr = formatTime(seconds);
            document.title = `${isRunning ? '▶' : '⏸'} ${timeStr} - MonitorPro`;
        }

        return () => {
            if (flashInterval) clearInterval(flashInterval);
        };
    }, [seconds, isRunning, isVisible, mode]);

    // Efeito de contagem de alta precisão
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning) {
            // Verificamos a cada 200ms para garantir fluidez visual,
            // mas o cálculo no store é baseado no Date.now() real.
            interval = setInterval(() => {
                tick();
            }, 200);
        }
        return () => clearInterval(interval);
    }, [isRunning, tick]);

    // Alerta sonoro quando o Pomodoro zera
    useEffect(() => {
        if (mode === 'pomodoro' && seconds === 0 && !isRunning && isVisible) {
             const playSound = async () => {
                 try {
                     if (audioRef.current) {
                         audioRef.current.currentTime = 0;
                         await audioRef.current.play();
                     }
                 } catch (e) {
                     console.log("Audio play blocked - Interaction required", e);
                 }
             };
             playSound();
        }
    }, [seconds, mode, isRunning, isVisible]);

    const handleStart = () => {
        // Tentar dar play/pause rapidamente para desbloquear o áudio no navegador (interação do usuário)
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
            }).catch(() => {});
        }
        start();
    };

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-[100] p-4 flex justify-center pointer-events-none"
        >
            <div className="w-full max-w-4xl p-4 rounded-3xl border border-white/20 shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.5)] flex items-center justify-between pointer-events-auto bg-[#c21807] backdrop-blur-xl">
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                            <Clock size={20} />
                        </div>
                        <div className="min-w-[80px]">
                            <span className="block text-[8px] font-black uppercase tracking-widest text-white/60">
                                {mode === 'stopwatch' ? 'Cronômetro' : 'Pomodoro'}
                            </span>
                            <span className="text-2xl font-black text-white tracking-tighter tabular-nums">
                                {formatTime(seconds)}
                            </span>
                        </div>
                    </div>

                    <div className="h-10 w-px bg-white/10 hidden md:block" />

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={isRunning ? pause : handleStart}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isRunning ? 'bg-white/20 text-white ring-2 ring-white/10' : 'bg-white text-[#c21807] shadow-xl scale-110 active:scale-95'}`}
                        >
                            {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                        </button>
                        <button 
                            onClick={reset}
                            className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
                            title="Resetar"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                 </div>

                 <div className="flex items-center gap-4">
                    <div className="hidden sm:flex p-1 bg-black/20 rounded-xl border border-white/10">
                        <button 
                            onClick={() => setMode('stopwatch')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${mode === 'stopwatch' ? 'bg-white text-[#c21807]' : 'text-white/60 hover:text-white'}`}
                        >
                            LIVRE
                        </button>
                        <button 
                            onClick={() => setMode('pomodoro')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${mode === 'pomodoro' ? 'bg-white text-[#c21807]' : 'text-white/60 hover:text-white'}`}
                        >
                            POMODORO
                        </button>
                    </div>

                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-3 rounded-xl transition-all ${showSettings ? 'bg-white text-[#c21807]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title="Configurações de Tempo"
                    >
                        <Settings size={20} />
                    </button>

                    <button 
                        onClick={toggleVisibility}
                        className="p-3 bg-black/20 text-white/60 hover:text-white rounded-xl transition-all"
                        title="Fechar"
                    >
                        <X size={20} />
                    </button>
                 </div>

                 {/* Settings Bubble */}
                 <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.9 }}
                            animate={{ opacity: 1, y: -80, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                            className="absolute right-4 bottom-24 bg-zinc-900/95 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl w-64 space-y-4 pointer-events-auto"
                        >
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tempo do Pomodoro</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {[15, 25, 30, 45, 60, 90].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setPomodoroMinutes(m)}
                                        className={`py-2 rounded-xl text-[10px] font-black transition-all ${pomodoroMinutes === m ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                                    >
                                        {m}m
                                    </button>
                                ))}
                            </div>
                            <div className="pt-2 border-t border-white/5">
                                <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest text-center">O cronômetro irá disparar um alerta sonoro ao finalizar.</p>
                            </div>
                        </motion.div>
                    )}
                 </AnimatePresence>
            </div>
        </motion.div>
    );
};
