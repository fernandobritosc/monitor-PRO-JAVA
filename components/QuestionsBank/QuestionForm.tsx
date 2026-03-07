import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { X, Plus, CheckCircle2, Zap } from 'lucide-react';
import EditorToolbar from './EditorToolbar';
import { Question } from '../../types';

interface QuestionFormProps {
    initialData: any;
    isEditing: boolean;
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
    savedMaterias: string[];
    topicosSugeridos: string[];
    savedBancas: string[];
    savedAnos: number[];
    savedOrgaos: string[];
    savedCargos: string[];
    handleImageUpload: (file: File) => Promise<string | null>;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
    initialData,
    isEditing,
    onSave,
    onCancel,
    savedMaterias,
    topicosSugeridos,
    savedBancas,
    savedAnos,
    savedOrgaos,
    savedCargos,
    handleImageUpload
}) => {
    const [formData, setFormData] = useState(initialData);
    const [showSmartPaste, setShowSmartPaste] = useState(false);
    const [smartPasteText, setSmartPasteText] = useState('');

    const handleSmartPaste = (text: string) => {
        setSmartPasteText(text);
        if (!text.trim()) return;

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const newAlts: any[] = [];
        let currentAltText = '';
        let currentLabel = '';
        const labelRegex = /^([A-E]|[a-e])([\)\.\-\s]|$)/;

        lines.forEach((line) => {
            const match = line.match(labelRegex);
            if (match) {
                if (currentLabel) {
                    newAlts.push({
                        id: Math.random().toString(36).substr(2, 9),
                        label: currentLabel.toUpperCase(),
                        texto: currentAltText.trim(),
                        is_correct: false
                    });
                }
                currentLabel = match[1];
                currentAltText = line.replace(/^([A-E]|[a-e])[\)\.\-\s]*/i, '').trim();
            } else if (currentLabel) {
                currentAltText += (currentAltText ? ' ' : '') + line;
            }
        });

        if (currentLabel) {
            newAlts.push({
                id: Math.random().toString(36).substr(2, 9),
                label: currentLabel.toUpperCase(),
                texto: currentAltText.trim(),
                is_correct: false
            });
        }

        if (newAlts.length > 0) {
            setFormData((prev: any) => ({
                ...prev,
                alternativas: newAlts,
                tipo: 'Multipla Escolha'
            }));
        }
    };

    const createEditorProps = (targetEditor: string) => ({
        attributes: {
            class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] p-6 text-[hsl(var(--text-bright))]'
        },
        handlePaste: (view: any, event: ClipboardEvent) => {
            const items = Array.from(event.clipboardData?.items || []);
            const imageItem = items.find(item => item.type.startsWith('image'));

            if (imageItem) {
                const file = imageItem.getAsFile();
                if (file) {
                    handleImageUpload(file).then(url => {
                        if (url && (targetEditor === 'enunciado' ? enunciadoEditor : respostaEditor)) {
                            (targetEditor === 'enunciado' ? enunciadoEditor : respostaEditor)?.chain().focus().setImage({ src: url }).run();
                        }
                    });
                    return true;
                }
            }
            return false;
        },
        handleDrop: (view: any, event: DragEvent) => {
            const files = Array.from(event.dataTransfer?.files || []);
            const imageFile = files.find(file => file.type.startsWith('image'));

            if (imageFile) {
                handleImageUpload(imageFile).then(url => {
                    if (url && (targetEditor === 'enunciado' ? enunciadoEditor : respostaEditor)) {
                        (targetEditor === 'enunciado' ? enunciadoEditor : respostaEditor)?.chain().focus().setImage({ src: url }).run();
                    }
                });
                return true;
            }
            return false;
        }
    });

    const enunciadoEditor = useEditor({
        extensions: [
            StarterKit.configure({ underline: false }),
            Underline,
            Image,
            Placeholder.configure({ placeholder: 'Digite o enunciado...' })
        ],
        content: formData.enunciado,
        onUpdate: ({ editor }) => setFormData((prev: any) => ({ ...prev, enunciado: editor.getHTML() })),
        editorProps: createEditorProps('enunciado'),
    });

    const respostaEditor = useEditor({
        extensions: [
            StarterKit.configure({ underline: false }),
            Underline,
            Image,
            Placeholder.configure({ placeholder: 'Digite o gabarito comentado...' })
        ],
        content: formData.resposta,
        onUpdate: ({ editor }) => setFormData((prev: any) => ({ ...prev, resposta: editor.getHTML() })),
        editorProps: createEditorProps('resposta'),
    });

    useEffect(() => {
        enunciadoEditor?.commands.setContent(formData.enunciado || '');
        respostaEditor?.commands.setContent(formData.resposta || '');
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <div className="glass-premium p-4 rounded-2xl border border-[hsl(var(--accent)/0.3)] shadow-2xl relative">
            <button onClick={onCancel} className="absolute top-4 right-4 p-1.5 bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"><X size={14} /></button>
            <h3 className="text-sm font-black uppercase tracking-widest mb-4 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                {isEditing ? 'Editar Registro' : 'Novo Cadastro'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    {[
                        { field: 'tec_id', label: 'ID/URL TEC', list: null },
                        { field: 'banca', label: 'Banca', list: savedBancas },
                        { field: 'ano', label: 'Ano', list: savedAnos },
                        { field: 'orgao', label: 'Orgão', list: savedOrgaos },
                        { field: 'cargo', label: 'Cargo', list: savedCargos }
                    ].map(item => (
                        <div key={item.field} className="space-y-1">
                            <label className="text-[7px] font-black uppercase text-slate-500 ml-1 tracking-widest">
                                {item.label}
                            </label>
                            <input
                                type="text"
                                list={item.list ? `list-form-${item.field}` : undefined}
                                placeholder={item.field === 'tec_id' ? 'Ex: 123456' : ''}
                                className="w-full bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-lg px-2.5 py-1.5 text-[9px] font-bold text-[hsl(var(--text-bright))] focus:border-[hsl(var(--accent)/0.5)] transition-all"
                                value={(formData as any)[item.field]}
                                onChange={e => setFormData({ ...formData, [item.field]: item.field === 'ano' ? (parseInt(e.target.value) || '') : e.target.value })}
                            />
                            {item.list && (
                                <datalist id={`list-form-${item.field}`}>
                                    {item.list.map((val, i) => <option key={i} value={val.toString()} />)}
                                </datalist>
                            )}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['materia', 'assunto'].map(field => (
                        <div key={field} className="space-y-1">
                            <label className="text-[7px] font-black uppercase text-slate-500 ml-1 tracking-widest">{field}</label>
                            <input
                                type="text"
                                list={`list-form-${field}`}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-[hsl(var(--text-bright))] focus:border-[hsl(var(--accent)/0.5)] transition-all"
                                value={(formData as any)[field]}
                                onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                            />
                            <datalist id={`list-form-${field}`}>
                                {(field === 'materia' ? savedMaterias : topicosSugeridos).map((item, i) => <option key={i} value={item} />)}
                            </datalist>
                        </div>
                    ))}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[7px] font-black uppercase text-slate-500 ml-1 tracking-widest flex items-center gap-1.5">
                        Enunciado <span className="text-[6px] opacity-30 uppercase font-bold">(Imagens & Rich Text)</span>
                    </label>
                    <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:border-[hsl(var(--accent)/0.3)] transition-all shadow-inner">
                        <EditorToolbar
                            editor={enunciadoEditor}
                            onImageUpload={(file) => handleImageUpload(file).then(url => url && enunciadoEditor?.chain().focus().setImage({ src: url }).run())}
                        />
                        <EditorContent editor={enunciadoEditor} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[7px] font-black uppercase text-slate-500 ml-1 tracking-widest">Tipo de Item</label>
                        <div className="flex gap-2">
                            {['Multipla Escolha', 'Certo/Errado'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({
                                        ...formData,
                                        tipo: type as any,
                                        alternativas: type === 'Certo/Errado' ? [
                                            { id: '1', label: 'Certo', texto: 'Certo', is_correct: true },
                                            { id: '2', label: 'Errado', texto: 'Errado', is_correct: false }
                                        ] : []
                                    })}
                                    className={`px-4 py-1.5 rounded-lg text-[8px] font-black transition-all ${formData.tipo === type ? 'bg-[hsl(var(--accent))] text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'}`}
                                >
                                    {type.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[8px] font-black uppercase text-[hsl(var(--accent))] tracking-widest flex items-center gap-1.5">
                                <CheckCircle2 size={10} /> Configuração de Gabarito
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowSmartPaste(!showSmartPaste)}
                                className={`text-[7px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${showSmartPaste ? 'bg-[hsl(var(--accent))] text-black border-[hsl(var(--accent))]' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                            >
                                <Zap size={10} /> {showSmartPaste ? 'Fechar Scanner' : 'Smart Paste'}
                            </button>
                        </div>

                        {showSmartPaste && (
                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 space-y-2 animate-in zoom-in-95 duration-300">
                                <textarea
                                    placeholder="Cole as alternativas do site aqui..."
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-[9px] font-bold text-slate-200 min-h-[120px] focus:border-purple-500/50 transition-all outline-none"
                                    value={smartPasteText}
                                    onChange={(e) => handleSmartPaste(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            {(formData.alternativas || []).map((alt: any, i: number) => (
                                <div key={alt.id} className="flex gap-2 items-center group/alt">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, alternativas: (formData.alternativas || []).map((a: any) => ({ ...a, is_correct: a.id === alt.id })), gabarito_oficial: String.fromCharCode(65 + i) })}
                                        className={`w-8 h-8 rounded-lg font-black text-[10px] flex items-center justify-center transition-all shadow-lg shrink-0 border ${alt.is_correct
                                            ? 'bg-green-500 border-green-400 text-black scale-105 shadow-green-500/20'
                                            : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        {alt.is_correct ? <CheckCircle2 size={14} /> : (formData.tipo === 'Multipla Escolha' ? String.fromCharCode(65 + i) : alt.label[0])}
                                    </button>
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            placeholder={`Texto da opção ${String.fromCharCode(65 + i)}...`}
                                            className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-[10px] font-bold transition-all pr-10 ${alt.is_correct
                                                ? 'border-green-500/30 text-green-400 bg-green-500/5'
                                                : 'border-white/10 focus:border-[hsl(var(--accent)/0.5)] text-slate-300'
                                                }`}
                                            value={alt.texto}
                                            onChange={e => {
                                                const newAlts = [...(formData.alternativas || [])];
                                                newAlts[i].texto = e.target.value;
                                                setFormData({ ...formData, alternativas: newAlts });
                                            }}
                                        />
                                        {formData.tipo === 'Multipla Escolha' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newAlts = (formData.alternativas || []).filter((a: any) => a.id !== alt.id);
                                                    setFormData({ ...formData, alternativas: newAlts });
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-red-400 transition-all"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {formData.tipo === 'Multipla Escolha' && (formData.alternativas || []).length < 5 && (
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, alternativas: [...(formData.alternativas || []), { id: Date.now().toString(), texto: '', label: '', is_correct: false }] })}
                                    className="w-full py-2 border border-dashed border-white/10 rounded-lg text-[7px] font-black text-slate-500 hover:text-[hsl(var(--accent))] hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 tracking-widest uppercase"
                                >
                                    <Plus size={10} /> Adicionar Opção
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[7px] font-black uppercase text-slate-500 ml-1 tracking-widest flex items-center gap-1.5">
                            Gabarito Comentado <span className="text-[6px] opacity-30 uppercase font-bold">(Opcional)</span>
                        </label>
                        <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:border-[hsl(var(--accent)/0.3)] transition-all shadow-inner">
                            <EditorToolbar
                                editor={respostaEditor}
                                onImageUpload={(file) => handleImageUpload(file).then(url => url && respostaEditor?.chain().focus().setImage({ src: url }).run())}
                            />
                            <EditorContent editor={respostaEditor} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-[8px] font-black uppercase text-slate-500 hover:text-white transition-all tracking-widest"
                        >
                            Descartar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-black font-black uppercase text-[8px] shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all tracking-widest"
                        >
                            {isEditing ? 'Salvar Alterações' : 'Concluir Registro'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default QuestionForm;
