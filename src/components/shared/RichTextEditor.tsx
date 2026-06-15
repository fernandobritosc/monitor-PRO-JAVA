import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorView } from '@tiptap/pm/view';
import { EditorToolbar } from '../ui/EditorToolbar';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: string;
    onImageUpload?: (file: File) => Promise<string | null>;
    className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    content,
    onChange,
    placeholder = '',
    minHeight = 'min-h-[120px]',
    onImageUpload,
    className = 'bg-[hsl(var(--bg-user-block))]',
}) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ underline: false }),
            Underline,
            Image,
            Placeholder.configure({ placeholder }),
        ],
        content,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                class: `prose prose-invert prose-sm max-w-none focus:outline-none ${minHeight} p-5 text-xs text-[hsl(var(--text-bright))]`,
            },
            handlePaste: (_view: EditorView, event: ClipboardEvent) => {
                if (!onImageUpload) return false;
                const items = Array.from(event.clipboardData?.items || []);
                const imageItem = items.find(item => item.type.startsWith('image'));
                if (imageItem) {
                    const file = imageItem.getAsFile();
                    if (file) {
                        onImageUpload(file).then(url => {
                            if (url && editor) {
                                editor.chain().focus().setImage({ src: url }).run();
                            }
                        });
                        return true;
                    }
                }
                return false;
            },
            handleDrop: (_view: EditorView, event: DragEvent) => {
                if (!onImageUpload) return false;
                const files = Array.from(event.dataTransfer?.files || []);
                const imageFile = files.find(file => file.type.startsWith('image'));
                if (imageFile) {
                    onImageUpload(imageFile).then(url => {
                        if (url && editor) {
                            editor.chain().focus().setImage({ src: url }).run();
                        }
                    });
                    return true;
                }
                return false;
            },
        },
    });

    useEffect(() => {
        if (content === '' && editor) {
            editor.commands.setContent('');
        }
    }, [content, editor]);

    if (!editor) return null;

    const handleImageFile = onImageUpload
        ? (file: File) => {
              onImageUpload(file).then(url => {
                  if (url) editor.chain().focus().setImage({ src: url }).run();
              });
          }
        : undefined;

    return (
        <div className={`${className} border border-[hsl(var(--border))] rounded-2xl overflow-hidden focus-within:border-[hsl(var(--accent)/0.5)] transition-all shadow-inner`}>
            <EditorToolbar editor={editor} onImageUpload={handleImageFile} />
            <EditorContent editor={editor} />
        </div>
    );
};
