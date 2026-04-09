import React, { useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Upload, ImageIcon } from 'lucide-react';

interface EditorToolbarProps {
    editor: Editor | null;
    onImageUpload?: (file: File) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, onImageUpload }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!editor) return null;

    const addImageUrl = () => {
        const url = window.prompt('URL da imagem:');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onImageUpload) {
            onImageUpload(file);
        }
        // Reset input to allow same file again
        e.target.value = '';
    };

    return (
        <div className="flex flex-wrap gap-1 p-2 bg-white/5 border-b border-white/10">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('bold') ? 'text-[hsl(var(--accent))] bg-white/10' : 'text-slate-400'}`}
                title="Negrito"
            >
                <span className="font-bold">B</span>
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('italic') ? 'text-[hsl(var(--accent))] bg-white/10' : 'text-slate-400'}`}
                title="Itálico"
            >
                <span className="italic font-serif">I</span>
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('underline') ? 'text-[hsl(var(--accent))] bg-white/10' : 'text-slate-400'}`}
                title="Sublinhado"
            >
                <span className="underline">U</span>
            </button>
            <div className="w-px h-6 bg-white/10 mx-1 self-center" />
            <div className="flex gap-0.5 items-center">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400 group relative"
                    title="Upload de Imagem"
                >
                    <Upload size={16} />
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                    />
                </button>
                <button
                    type="button"
                    onClick={addImageUrl}
                    className="p-2 rounded hover:bg-white/10 transition-colors text-slate-400 hover:text-cyan-400"
                    title="Inserir via URL"
                >
                    <ImageIcon size={16} />
                </button>
            </div>
        </div>
    );
};
