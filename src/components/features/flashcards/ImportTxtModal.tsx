import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X, DownloadCloud, Save, ChevronDown, ChevronUp, Lock, Loader2
} from 'lucide-react';
import { EditalMateria, Flashcard } from '../../../types';
import { CustomSelector } from '../../CustomSelector';

interface ImportTxtModalProps {
  isOpen: boolean;
  onClose: () => void;
  materias: string[];
  editais: EditalMateria[];
  missaoAtiva: string;
  importingState: { loading: boolean };
  importCards: (cards: Partial<Flashcard>[], type: "deck" | "topic" | "single") => Promise<void>;
}

const ImportTxtModal: React.FC<ImportTxtModalProps> = ({
  isOpen, onClose, materias, editais, missaoAtiva,
  importingState, importCards
}) => {
  const [rawImportText, setRawImportText] = useState('');
  const [txtPreviewCards, setTxtPreviewCards] = useState<Partial<Flashcard>[]>([]);
  const [importMateria, setImportMateria] = useState('');
  const [importAssunto, setImportAssunto] = useState('');
  const [showImportTopicsDropdown, setShowImportTopicsDropdown] = useState(false);
  const importDropdownRef = useRef<HTMLDivElement>(null);

  const availableImportTopics = useMemo(() => {
    if (!importMateria || importMateria === 'Todas') return [];
    const edital = editais.find(e => e.concurso === missaoAtiva && e.materia === importMateria);
    return edital ? [...edital.topicos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })) : [];
  }, [editais, missaoAtiva, importMateria]);

  useEffect(() => {
    if (!rawImportText) {
      setTxtPreviewCards([]);
      return;
    }
    const lines = rawImportText.split('\n').filter(line => line.trim().length > 0);
    const parsedCards = lines.map((line, idx) => {
      const parts = line.split(';');
      if (parts.length >= 2) {
        return {
          id: `txt-temp-${idx}`,
          front: parts[0].trim(),
          back: parts.slice(1).join(';').trim()
        };
      }
      return null;
    }).filter(c => c !== null);
    setTxtPreviewCards(parsedCards);
  }, [rawImportText]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(event.target as Node)) {
        setShowImportTopicsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConfirmTxtImport = () => {
    if (!importMateria) {
      alert("Por favor, selecione ou digite a matéria.");
      return;
    }
    if (txtPreviewCards.length === 0) {
      alert("Nenhum flashcard válido detectado para importar.");
      return;
    }

    const finalCards = txtPreviewCards.map(c => ({
      ...c,
      materia: importMateria,
      assunto: importAssunto,
    }));

    importCards(finalCards, 'deck');
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setTxtPreviewCards([]);
    setRawImportText('');
    setImportMateria('');
    setImportAssunto('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
      <div className="glass-premium bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] w-full max-w-4xl rounded-2xl p-6 relative shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b border-[hsl(var(--border))] pb-4">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-[hsl(var(--text-bright))] flex items-center gap-2">
              <DownloadCloud className="text-[hsl(var(--accent))]" /> Importar Flashcards em Lote
            </h3>
            <p className="text-[hsl(var(--text-muted))] text-[10px] font-bold uppercase tracking-widest mt-1">Cole o texto no formato: Pergunta;Resposta (uma por linha)</p>
          </div>
          <button onClick={handleClose} className="p-2 bg-[hsl(var(--bg-user-block))] rounded-lg text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] border border-[hsl(var(--border))] transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-2 block ml-1">Matéria (Obrigatório)</label>
            <div className="bg-[hsl(var(--bg-main))] rounded-2xl border border-[hsl(var(--border))]">
              <CustomSelector
                label="Matéria"
                value={importMateria}
                options={materias.filter((m) => m !== 'Todas' && m !== 'Todos')}
                onChange={setImportMateria}
                placeholder="Selecione ou digite..."
              />
            </div>
          </div>
          <div ref={importDropdownRef} className="relative">
            <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-2 block ml-1 flex justify-between items-center">
              Assunto (Opcional)
              {importAssunto && <span className="text-[9px] text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 flex items-center gap-1.5 animate-pulse"><Lock size={10} /> Parâmetro Fixado</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                value={importAssunto}
                onChange={(e) => setImportAssunto(e.target.value)}
                onClick={() => { if (availableImportTopics.length > 0) setShowImportTopicsDropdown(true); }}
                className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-4 py-3.5 text-sm text-[hsl(var(--text-bright))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] placeholder-[hsl(var(--text-muted)/0.5)]"
                placeholder="Ex: Lei 8.112/90"
              />
              {availableImportTopics.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowImportTopicsDropdown(!showImportTopicsDropdown)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] rounded-lg transition-colors"
                >
                  {showImportTopicsDropdown ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              )}
              {showImportTopicsDropdown && availableImportTopics.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                  <div
                    onClick={() => { setImportAssunto(''); setShowImportTopicsDropdown(false); }}
                    className="px-6 py-4 text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest hover:bg-[hsl(var(--bg-user-block))] cursor-pointer border-b border-[hsl(var(--border))] transition-all"
                  >
                    Limpar Seleção
                  </div>
                  {availableImportTopics.map((t, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setImportAssunto(t);
                        setShowImportTopicsDropdown(false);
                      }}
                      className={`px-6 py-4 text-xs font-bold transition-all border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--bg-user-block))] cursor-pointer flex items-center gap-3 ${importAssunto === t ? 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]' : 'text-[hsl(var(--text-muted))]'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${importAssunto === t ? 'bg-[hsl(var(--accent))] animate-pulse' : 'bg-[hsl(var(--text-muted))]'}`} />
                      <span className="flex-1 leading-relaxed truncate">{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest mb-2 block ml-1">Conteúdo Em Lote (Pegue do Excel, Word ou TXT)</label>
          <textarea
            value={rawImportText}
            onChange={(e) => setRawImportText(e.target.value)}
            className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-2xl px-5 py-4 text-sm text-[hsl(var(--text-bright))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] placeholder-[hsl(var(--text-muted)/0.5)] custom-scrollbar min-h-[120px] resize-y shadow-inner"
            placeholder="Exemplo:&#10;Quem descobriu o Brasil?;Pedro Álvares Cabral&#10;O que é o Princípio da Legalidade?;Ninguém é obrigado a fazer ou deixar de fazer algo senão em virtude de lei."
          />
        </div>

        {txtPreviewCards.length > 0 && (
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[hsl(var(--bg-main))] rounded-xl border border-[hsl(var(--border))] p-4 grid grid-cols-1 gap-3">
            <div className="text-[10px] font-black text-[hsl(var(--accent))] uppercase tracking-widest mb-2 px-2">Pré-visualização ({txtPreviewCards.length} cards detectados)</div>
            {txtPreviewCards.map((card) => (
              <div key={card.id} className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] p-4 rounded-xl flex flex-col gap-2">
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-cyan-500">P:</span>
                  <p className="text-sm text-[hsl(var(--text-bright))] font-medium">{card.front}</p>
                </div>
                <div className="h-px bg-[hsl(var(--border))] w-full my-1" />
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-purple-500">R:</span>
                  <p className="text-xs text-[hsl(var(--text-muted))] whitespace-pre-wrap">{card.back}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-[hsl(var(--border))]">
          <button onClick={handleClose} className="px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-bright))] hover:bg-[hsl(var(--bg-user-block))] border border-transparent hover:border-[hsl(var(--border))] transition-all">Cancelar</button>
          <button
            onClick={handleConfirmTxtImport}
            disabled={txtPreviewCards.length === 0 || !importMateria || importingState.loading}
            className="px-8 py-3 bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[hsl(var(--bg-main))] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95"
          >
            {importingState.loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Importar {txtPreviewCards.length} Cards
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportTxtModal;
