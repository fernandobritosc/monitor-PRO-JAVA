import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { EditalMateria } from '../types';
import { CheckCircle2, AlertCircle, Calculator, Clock, BookOpen, Target, Zap, AlertTriangle, List, Layers, X } from 'lucide-react';

interface StudyFormProps {
  editais: EditalMateria[];
  missaoAtiva: string;
  onSaved: () => void;
  isSimulado?: boolean;
  onCancel?: () => void;
}

const StudyForm: React.FC<StudyFormProps> = ({ editais, missaoAtiva, onSaved, isSimulado = false, onCancel }) => {
  // Form States
  const [dataEstudo, setDataEstudo] = useState(new Date().toISOString().split('T')[0]);
  const [tempoHHMM, setTempoHHMM] = useState('');
  
  // Single Record States
  const [materia, setMateria] = useState('');
  const [assunto, setAssunto] = useState('');
  const [acertos, setAcertos] = useState<string>(''); 
  const [total, setTotal] = useState<string>('');     
  const [dificuldade, setDificuldade] = useState<any>('🟡 Médio');
  const [relevancia, setRelevancia] = useState(5);
  const [comentarios, setComentarios] = useState('');
  const [saveToBank, setSaveToBank] = useState(false);

  // Multi Record States (Simulado)
  const [simuladoScores, setSimuladoScores] = useState<Record<string, { acertos: string, total: string }>>({});
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

  const materiasDisponiveis = useMemo(() => {
     return editais.filter(e => e.concurso === missaoAtiva).map(e => e.materia).sort();
  }, [editais, missaoAtiva]);

  // Filtra os tópicos baseados na matéria selecionada (apenas para modo Estudo)
  const topicosDisponiveis = useMemo(() => {
    if (!materia) return [];
    const edital = editais.find(e => e.concurso === missaoAtiva && e.materia === materia);
    return edital ? edital.topicos.sort() : [];
  }, [editais, missaoAtiva, materia]);

  // Reseta o assunto quando a matéria muda
  useEffect(() => {
    if (!isSimulado) setAssunto('');
  }, [materia, isSimulado]);

  // Stats do Simulado (Live)
  const simuladoStats = useMemo(() => {
     let totalAcertos = 0;
     let totalQuestoes = 0;
     Object.values(simuladoScores).forEach(s => {
        const a = parseInt(s.acertos || '0');
        const t = parseInt(s.total || '0');
        if (!isNaN(a)) totalAcertos += a;
        if (!isNaN(t)) totalQuestoes += t;
     });
     return { 
        acertos: totalAcertos, 
        total: totalQuestoes, 
        perc: totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0 
     };
  }, [simuladoScores]);

  // Stats do Estudo Individual (Live)
  const singleStats = useMemo(() => {
    const numericAcertos = parseInt(acertos) || 0;
    const numericTotal = parseInt(total) || 0;
    const percentage = numericTotal > 0 ? (numericAcertos / numericTotal) * 100 : 0;
    return { percentage, numericAcertos, numericTotal };
  }, [acertos, total]);

  // Efeito Dificuldade (Single)
  useEffect(() => {
    if (singleStats.numericTotal > 0 && !isSimulado) {
      if (singleStats.percentage >= 80) setDificuldade('🟢 Fácil');
      else if (singleStats.percentage < 60) setDificuldade('🔴 Difícil');
      else setDificuldade('🟡 Médio');
    }
  }, [singleStats.percentage, singleStats.numericTotal, isSimulado]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      value = `${value.slice(0, 2)}:${value.slice(2)}`;
    }
    setTempoHHMM(value);
  };

  const validateAndConvertTime = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 0) return 0;
    let hours = 0;
    let minutes = 0;
    if (cleaned.length <= 2) {
      minutes = parseInt(cleaned);
    } else if (cleaned.length === 3) {
      hours = parseInt(cleaned.substring(0, 1));
      minutes = parseInt(cleaned.substring(1));
    } else if (cleaned.length >= 4) {
      hours = parseInt(cleaned.substring(0, 2));
      minutes = parseInt(cleaned.substring(2));
    }
    if (minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const handleSimuladoScoreChange = (materia: string, field: 'acertos' | 'total', val: string) => {
      setSimuladoScores(prev => ({
          ...prev,
          [materia]: {
              ...prev[materia],
              [field]: val
          }
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ type: null, text: '' });
    
    // --- VALIDAÇÃO TEMPO ---
    const minutes = validateAndConvertTime(tempoHHMM);
    if (minutes === null) {
      setMsg({ type: 'error', text: 'Tempo inválido. Use formato HH:MM.' });
      return;
    }
    if (minutes === 0) {
       setMsg({ type: 'error', text: 'Informe o tempo total de estudo/prova.' });
       return;
    }

    if (!assunto || assunto.trim().length < 3) {
      setMsg({ type: 'error', text: isSimulado ? 'Dê um nome ao Simulado.' : 'Preencha o assunto.' });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (isSimulado) {
        // --- MODO SIMULADO (MÚLTIPLOS REGISTROS) ---
        if (simuladoStats.total === 0) {
            setLoading(false);
            setMsg({ type: 'error', text: 'Preencha o desempenho de pelo menos uma matéria.' });
            return;
        }

        // Validação: Acertos > Total para cada matéria
        const invalidEntry = Object.entries(simuladoScores).find(([_, score]) => {
             const a = parseInt(score.acertos || '0');
             const t = parseInt(score.total || '0');
             return t > 0 && a > t;
        });

        if (invalidEntry) {
             setLoading(false);
             setMsg({ type: 'error', text: `Erro em ${invalidEntry[0]}: Acertos não podem ser maiores que o total.` });
             return;
        }

        const payloads = Object.entries(simuladoScores).map(([mat, score]) => {
            const a = parseInt(score.acertos || '0');
            const t = parseInt(score.total || '0');
            if (t === 0) return null;

            // Distribuição Proporcional do Tempo
            const weight = t / simuladoStats.total;
            const subTime = Math.round(minutes * weight);

            return {
                user_id: user?.id,
                concurso: missaoAtiva,
                materia: mat,
                assunto: assunto, // Nome do Simulado igual para todos
                data_estudo: dataEstudo,
                acertos: a,
                total: t,
                taxa: (a/t) * 100,
                tempo: subTime || 1, // Evita 0
                dificuldade: 'Simulado',
                relevancia: 10, // Simulados sempre relevantes
                comentarios: comentarios,
                rev_24h: false,
                rev_07d: false,
                rev_15d: false,
                rev_30d: false
            };
        }).filter(Boolean); // Remove nulos

        const { error } = await supabase.from('registros_estudos').insert(payloads);
        
        if (error) {
            setMsg({ type: 'error', text: 'Erro ao salvar simulado: ' + error.message });
        } else {
            setMsg({ type: 'success', text: 'Simulado registrado com sucesso!' });
            onSaved();
            // Reset
            setAssunto('');
            setComentarios('');
            setTempoHHMM('');
            setSimuladoScores({});
        }

    } else {
        // --- MODO ESTUDO (ÚNICO REGISTRO) ---
        if (!materia) {
            setLoading(false);
            setMsg({ type: 'error', text: 'Selecione uma matéria.' });
            return;
        }
        if (singleStats.numericTotal <= 0) {
            setLoading(false);
            setMsg({ type: 'error', text: 'Total de questões deve ser maior que zero.' });
            return;
        }
        if (singleStats.numericAcertos > singleStats.numericTotal) {
            setLoading(false);
            setMsg({ type: 'error', text: 'Acertos não podem ser maiores que o total.' });
            return;
        }

        const payload = {
            user_id: user?.id,
            concurso: missaoAtiva,
            materia,
            assunto,
            data_estudo: dataEstudo,
            acertos: singleStats.numericAcertos,
            total: singleStats.numericTotal,
            taxa: singleStats.percentage,
            tempo: minutes,
            dificuldade,
            relevancia,
            comentarios,
            rev_24h: false,
            rev_07d: false,
            rev_15d: false,
            rev_30d: false
        };

        const { error } = await supabase.from('registros_estudos').insert(payload);
        
        // Opcional: Banco de Questões
        let bankError = null;
        if (!error && saveToBank) {
            const questionPayload = {
                user_id: user?.id,
                concurso: missaoAtiva,
                data: dataEstudo,
                materia,
                assunto,
                relevancia,
                anotacoes: comentarios,
                status: 'Pendente',
                tags: [], 
                meta: 3
            };
            const { error: qError } = await supabase.from('questoes_revisao').insert(questionPayload);
            bankError = qError;
        }

        if (error || bankError) {
            setMsg({ type: 'error', text: 'Erro ao salvar: ' + (error?.message || bankError?.message) });
        } else {
            setMsg({ type: 'success', text: 'Estudo registrado!' });
            onSaved();
            // Reset parcial
            setAssunto('');
            setAcertos('');
            setTotal('');
            setComentarios('');
            setSaveToBank(false);
            setTempoHHMM('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-20">
      
      {msg.type && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border ${msg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
           {msg.type === 'success' ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}
           {msg.text}
        </div>
      )}

      <div className="glass rounded-3xl p-8 shadow-2xl border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
           <Zap size={120} />
        </div>

        <h3 className="text-2xl font-extrabold mb-8 flex items-center gap-3 relative z-10">
          <span className={`w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 text-white flex items-center justify-center text-lg shadow-lg ${isSimulado ? 'shadow-cyan-500/20' : 'shadow-purple-500/20'}`}>
             {isSimulado ? '🏆' : '📝'}
          </span>
          {isSimulado ? 'Registrar Novo Simulado' : 'Registrar Novo Estudo'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          
          {/* HEADER COMUM: DATA, TEMPO, NOME */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Clock size={12}/> Data & Tempo Total
              </label>
              <div className="flex gap-2">
                 <input
                  type="date"
                  required
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium"
                  value={dataEstudo}
                  onChange={(e) => setDataEstudo(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="HH:MM"
                  maxLength={5}
                  required
                  className="w-32 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium text-center"
                  value={tempoHHMM}
                  onChange={handleTimeChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <List size={12}/> {isSimulado ? 'Nome do Simulado' : 'Assunto / Tópico'}
              </label>
              <input
                type="text"
                required
                list={!isSimulado ? "topicos-options" : undefined}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium placeholder-slate-600"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder={isSimulado ? "Ex: 1º Simulado TJ-SP" : "Ex: Crase"}
              />
              {!isSimulado && materia && (
                <datalist id="topicos-options">
                   {topicosDisponiveis.map((t, index) => <option key={index} value={t} />)}
                </datalist>
              )}
            </div>
          </div>

          {isSimulado ? (
            // --- UI ESPECÍFICA PARA SIMULADO (GRADE DE MATÉRIAS) ---
            <div className="space-y-4">
               <div className="flex justify-between items-center px-4 mb-2">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Layers size={12}/> Desempenho por Matéria
                   </label>
               </div>
               
               <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                   <div className="col-span-6">Matéria</div>
                   <div className="col-span-3 text-center">Acertos</div>
                   <div className="col-span-3 text-center">Total</div>
               </div>

               <div className="glass bg-slate-900/40 rounded-2xl p-2 border border-white/5 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {materiasDisponiveis.map(mat => {
                      const score = simuladoScores[mat] || { acertos: '', total: '' };
                      const a = parseInt(score.acertos || '0');
                      const t = parseInt(score.total || '0');
                      const isInvalid = t > 0 && a > t;

                      return (
                          <div key={mat} className="grid grid-cols-12 gap-4 items-center p-3 hover:bg-white/5 rounded-xl transition-colors">
                              <div className="col-span-6 font-bold text-sm text-slate-300 truncate" title={mat}>{mat}</div>
                              <div className="col-span-3">
                                  <input 
                                    type="number" 
                                    placeholder="0" 
                                    className={`w-full bg-slate-950 border ${isInvalid ? 'border-red-500 text-red-400' : 'border-white/10 text-green-400'} rounded-lg px-2 py-2 text-center text-sm font-bold focus:outline-none focus:ring-1 focus:ring-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                    value={score.acertos}
                                    onChange={e => handleSimuladoScoreChange(mat, 'acertos', e.target.value)}
                                  />
                              </div>
                              <div className="col-span-3">
                                  <input 
                                    type="number" 
                                    placeholder="0" 
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-2 text-center text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={score.total}
                                    onChange={e => handleSimuladoScoreChange(mat, 'total', e.target.value)}
                                  />
                              </div>
                          </div>
                      );
                  })}
               </div>
               
               {/* TOTALIZADOR */}
               <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-2xl border border-white/5 flex justify-between items-center shadow-lg">
                   <div>
                       <div className="text-xs font-bold text-slate-400 uppercase mb-1">Resumo da Prova</div>
                       <div className={`text-sm font-bold uppercase tracking-widest ${simuladoStats.perc >= 80 ? 'text-green-400' : simuladoStats.perc >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                           {simuladoStats.perc.toFixed(1)}% Aproveitamento
                       </div>
                   </div>
                   <div className="text-right">
                       <div className="text-3xl font-black text-white leading-none">
                           {simuladoStats.acertos} <span className="text-lg text-slate-500 font-medium">/ {simuladoStats.total}</span>
                       </div>
                       <div className="text-[10px] text-slate-500 uppercase font-bold mt-1">Questões Totais</div>
                   </div>
               </div>
            </div>
          ) : (
             // --- UI PADRÃO (MATÉRIA ÚNICA) ---
             <>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <BookOpen size={12}/> Matéria
                    </label>
                    <select
                        required
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium appearance-none"
                        value={materia}
                        onChange={(e) => setMateria(e.target.value)}
                    >
                        <option value="">Selecione a matéria...</option>
                        {materiasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block flex items-center gap-2">
                        <Target size={12}/> Desempenho
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Acertos</span>
                            <input
                                type="number"
                                min="0"
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-white font-bold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={acertos}
                                onChange={(e) => setAcertos(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Total Questões</span>
                            <input
                                type="number"
                                min="1"
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-bold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={total}
                                onChange={(e) => setTotal(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col items-center justify-center bg-slate-800/50 rounded-xl p-2 border border-white/5 h-full">
                            <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Taxa</span>
                            <div className={`text-4xl font-black transition-colors duration-500 ${singleStats.percentage >= 80 ? 'text-green-400' : singleStats.percentage >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {singleStats.percentage.toFixed(0)}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* DIFICULDADE E RELEVÂNCIA (SINGLE) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Dificuldade Sentida</label>
                     <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/10">
                       {['🟢 Fácil', '🟡 Médio', '🔴 Difícil'].map(d => (
                         <button
                          key={d}
                          type="button"
                          onClick={() => setDificuldade(d)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${dificuldade === d ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                         >
                           {d.split(' ')[1]}
                         </button>
                       ))}
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                        <span>Relevância</span>
                        <span className="text-cyan-400">{relevancia}/10</span>
                     </label>
                     <input 
                      type="range" min="1" max="10" 
                      className="w-full accent-cyan-500 h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer" 
                      value={relevancia}
                      onChange={(e) => setRelevancia(parseInt(e.target.value))}
                     />
                   </div>
                </div>
             </>
          )}

          {/* ANOTAÇÕES GERAIS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Anotações Gerais / Observações</label>
            <textarea
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all h-24 text-sm text-slate-300 placeholder-slate-600"
              placeholder="Pontos chave, links, impressões..."
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
            />
          </div>

          {/* OPÇÕES FINAIS */}
          {!isSimulado && (
            <div className="pt-4 border-t border-white/5">
               <label className="flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${saveToBank ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 bg-slate-900'}`}>
                     {saveToBank && <CheckCircle2 size={16} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={saveToBank} onChange={e => setSaveToBank(e.target.checked)} />
                  <div className="flex-1">
                     <span className={`text-sm font-bold block ${saveToBank ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        Salvar no Banco de Questões
                     </span>
                  </div>
               </label>
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-white/5">
            {isSimulado && onCancel && (
                <button 
                   type="button" 
                   onClick={onCancel}
                   className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold py-4 rounded-2xl transition-all border border-white/5"
                >
                   CANCELAR
                </button>
            )}

            <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold py-5 rounded-2xl shadow-xl shadow-purple-500/20 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
                {loading ? (
                   <>
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     Salvando...
                   </>
                ) : (
                   <>
                     <Calculator size={20} /> SALVAR REGISTRO
                   </>
                )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudyForm;