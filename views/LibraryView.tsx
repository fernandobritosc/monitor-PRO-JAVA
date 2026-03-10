import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { EditalMateria } from '../types';
import { logger } from '../utils/logger';
import { Book, Upload, FileText, Search, Plus, X, Loader2, Download, Trash2, CheckCircle, ExternalLink, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFChatModal from '../components/Library/PDFChatModal';

interface StudyMaterial {
    id: string;
    name: string;
    materia: string;
    assunto: string;
    storage_path: string;
    file_size: number;
    created_at: string;
}

interface LibraryViewProps {
    editais: EditalMateria[];
    missaoAtiva: string;
}

const LibraryView: React.FC<LibraryViewProps> = ({ editais, missaoAtiva }) => {
    const [materials, setMaterials] = useState<StudyMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedMateria, setSelectedMateria] = useState<string | null>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
    const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());

    // IA Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMaterial, setChatMaterial] = useState<StudyMaterial | null>(null);

    // Form para upload
    const [uploading, setUploading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [formMateria, setFormMateria] = useState('');
    const [formAssunto, setFormAssunto] = useState('');

    // Filtra matérias baseadas na missão ativa
    const materiasDaMissao = editais
        .filter(e => e.concurso === missaoAtiva)
        .map(e => e.materia);

    const materiasUnicas = Array.from(new Set(materiasDaMissao)).sort();

    // Filtra assuntos baseados na matéria selecionada no form
    const assuntosDisponiveis = editais
        .find(e => e.concurso === missaoAtiva && e.materia === formMateria)
        ?.topicos.sort() || [];

    useEffect(() => {
        setFormAssunto('');
    }, [formMateria]);

    useEffect(() => {
        fetchMaterials();
        checkCache();
    }, []);

    const checkCache = async () => {
        try {
            const { db } = await import('../services/offline/db');
            const cached = await db.table('materials_cache').toArray();
            setCachedIds(new Set(cached.map(c => c.id)));
        } catch (e) {
            console.warn("Offline cache not available yet");
        }
    };

    const fetchMaterials = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('study_materials')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMaterials(data || []);
        } catch (e) {
            logger.error('LIBRARY', 'Erro ao carregar materiais', e);
        } finally {
            setLoading(false);
        }
    };

    const downloadForOffline = async (material: StudyMaterial) => {
        try {
            const { data, error } = await supabase.storage
                .from('study-materials')
                .download(material.storage_path);

            if (error) throw error;

            const { db } = await import('../services/offline/db');
            await db.table('materials_cache').put({
                ...material,
                content: data // Blob
            });

            setCachedIds(prev => new Set([...prev, material.id]));
        } catch (e) {
            logger.error('LIBRARY', 'Erro ao salvar offline', e);
            alert("Falha ao salvar material para acesso offline.");
        }
    };

    const removeCache = async (id: string) => {
        try {
            const { db } = await import('../services/offline/db');
            await db.table('materials_cache').delete(id);
            setCachedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch (e) {
            logger.error('LIBRARY', 'Erro ao remover cache', e);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0 || !formMateria) return;

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não logado");

            const sanitizePath = (name: string) => {
                return name
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                    .replace(/[^a-zA-Z0-9.-]/g, '_'); // Troca espaços e especiais por _
            };

            // Processa arquivos sequencialmente para evitar sobrecarga e garantir ordem
            for (const file of files) {
                const fileName = `${Date.now()}-${sanitizePath(file.name)}`;
                const filePath = `${user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('study-materials')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error(`Erro ao subir ${file.name}:`, uploadError);
                    continue; // Pula para o próximo se este falhar
                }

                const { data, error: dbError } = await supabase
                    .from('study_materials')
                    .insert({
                        user_id: user.id,
                        name: file.name,
                        materia: formMateria,
                        assunto: formAssunto,
                        storage_path: filePath,
                        file_size: file.size
                    })
                    .select()
                    .single();

                if (dbError) {
                    console.error(`Erro DB para ${file.name}:`, dbError);
                } else if (data) {
                    // Auto-cache after upload
                    downloadForOffline(data);
                }
            }

            setIsUploadOpen(false);
            setFiles([]);
            setFormAssunto('');
            fetchMaterials();

        } catch (e: any) {
            logger.error('LIBRARY', 'Erro no upload', e);
            alert("Erro ao processar uploads: " + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (material: StudyMaterial) => {
        if (!window.confirm("Deseja excluir este material?")) return;

        try {
            await supabase.storage.from('study-materials').remove([material.storage_path]);
            await supabase.from('study_materials').delete().eq('id', material.id);
            await removeCache(material.id);
            setMaterials(prev => prev.filter(m => m.id !== material.id));
        } catch (e) {
            logger.error('LIBRARY', 'Erro ao deletar', e);
        }
    };

    const openPDF = async (material: StudyMaterial) => {
        try {
            const { db } = await import('../services/offline/db');
            const cached = await db.table('materials_cache').get(material.id);

            let url = '';
            if (cached) {
                url = URL.createObjectURL(cached.content);
            } else {
                const { data, error } = await supabase.storage
                    .from('study-materials')
                    .createSignedUrl(material.storage_path, 3600);
                if (error) throw error;
                url = data.signedUrl;
            }

            setSelectedPDF(url);
        } catch (e) {
            alert("Erro ao abrir PDF");
        }
    };

    const openChat = (material: StudyMaterial) => {
        setChatMaterial(material);
        setIsChatOpen(true);
    };

    const filteredMaterials = materials.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
            (m.assunto?.toLowerCase() || '').includes(search.toLowerCase());
        const matchesMateria = selectedMateria ? m.materia === selectedMateria : true;

        // Filtra apenas arquivos que pertencem a matérias da missão ativa
        const estaNaMissao = materiasUnicas.includes(m.materia);

        return matchesSearch && matchesMateria && estaNaMissao;
    });

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                        <Book className="text-indigo-400" size={32} />
                        Biblioteca de Estudo
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Organize e acesse seus materiais em qualquer lugar.</p>
                </div>
                <button
                    onClick={() => setIsUploadOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                >
                    <Plus size={20} /> Adicionar PDF
                </button>
            </div>

            {/* Filtros e Busca */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou assunto..."
                        className="w-full bg-slate-900/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="bg-slate-900/40 border border-white/5 rounded-2xl px-4 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    value={selectedMateria || ''}
                    onChange={e => setSelectedMateria(e.target.value || null)}
                >
                    <option value="">Todas as Matérias</option>
                    {materiasUnicas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>

            {/* Grid de Materiais */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-indigo-400" size={48} />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Organizando estantes...</p>
                </div>
            ) : filteredMaterials.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-xl font-bold text-white mb-2">Sua biblioteca está vazia</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">Comece a subir seus materiais em PDF para acessá-los aqui.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredMaterials.map((material) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={material.id}
                            className="group bg-slate-900/40 border border-white/5 rounded-3xl p-5 hover:border-indigo-500/50 transition-all hover:bg-slate-900/60 relative flex flex-col h-full shadow-2xl"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    <FileText size={24} />
                                </div>
                                <button
                                    onClick={() => handleDelete(material)}
                                    className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <h4 className="font-bold text-white text-lg mb-1 line-clamp-2" title={material.name}>
                                {material.name}
                            </h4>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/20">
                                    {material.materia}
                                </span>
                                {material.assunto && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                                        {material.assunto}
                                    </span>
                                )}
                            </div>

                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-600 font-mono">
                                        {(material.file_size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    {cachedIds.has(material.id) ? (
                                        <button
                                            onClick={() => removeCache(material.id)}
                                            className="p-2 text-green-400 hover:bg-green-500/10 rounded-xl transition-all"
                                            title="Salvo Offline (Remover)"
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => downloadForOffline(material)}
                                            className="p-2 text-slate-500 hover:bg-white/5 rounded-xl transition-all"
                                            title="Salvar Offline"
                                        >
                                            <Download size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openChat(material)}
                                        className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg"
                                        title="Conversar com este Material"
                                    >
                                        <Bot size={18} />
                                    </button>
                                    <button
                                        onClick={() => openPDF(material)}
                                        className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg"
                                        title="Ler Material"
                                    >
                                        <ExternalLink size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Visualizador de PDF Integrado */}
            <AnimatePresence>
                {selectedPDF && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/95 z-[200] flex flex-col"
                    >
                        <div className="p-4 flex justify-between items-center bg-slate-900/50 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-xs font-black uppercase text-indigo-400 tracking-[0.3em]">Modo Leitura MonitorPro</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={selectedPDF}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                    <ExternalLink size={14} /> Abrir em Nova Aba
                                </a>
                                <button
                                    onClick={() => setSelectedPDF(null)}
                                    className="bg-white/10 hover:bg-red-500 text-white p-2 rounded-full transition-all ml-2"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 w-full bg-slate-800 relative flex flex-col items-center justify-center">
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none">
                                <FileText size={48} className="text-slate-700 mb-4" />
                                <p className="text-slate-500 text-sm max-w-xs">
                                    Se o PDF não carregar abaixo, clique em <b>"Abrir em Nova Aba"</b> acima.
                                </p>
                            </div>
                            <iframe
                                src={`${selectedPDF}#toolbar=0`}
                                className="w-full h-full border-none bg-white"
                                title="PDF Viewer"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Upload */}
            <AnimatePresence>
                {isUploadOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="bg-slate-950 border border-white/10 w-full max-w-lg rounded-3xl p-8 relative shadow-2xl"
                        >
                            <button onClick={() => setIsUploadOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={24} /></button>

                            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                <Upload className="text-indigo-400" /> Adicionar Material
                            </h3>

                            <form onSubmit={handleUpload} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Arquivo PDF</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            multiple
                                            onChange={e => setFiles(Array.from(e.target.files || []))}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            required
                                        />
                                        <div className="w-full bg-slate-900/50 border-2 border-dashed border-white/10 rounded-2xl p-8 text-center group-hover:border-indigo-500/50 transition-all">
                                            {files.length > 0 ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <CheckCircle className="text-green-400" />
                                                    <span className="text-sm font-bold text-white mb-2">
                                                        {files.length} {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
                                                    </span>
                                                    <div className="max-h-32 overflow-y-auto w-full space-y-1 px-4">
                                                        {files.map((f, i) => (
                                                            <div key={i} className="text-[10px] text-slate-400 truncate text-left border-l border-indigo-500/30 pl-2">
                                                                {f.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-slate-500">
                                                    <Upload size={32} />
                                                    <span className="text-xs font-bold">Clique ou arraste o arquivo PDF</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Matéria Relacionada</label>
                                    <select
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                        value={formMateria}
                                        onChange={e => setFormMateria(e.target.value)}
                                        required
                                    >
                                        <option value="">Selecione a Matéria...</option>
                                        {materiasUnicas.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assunto (Tópico do Edital)</label>
                                    <select
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none disabled:opacity-50 appearance-none transition-all truncate"
                                        style={{ maxWidth: '100%' }}
                                        value={formAssunto}
                                        onChange={e => setFormAssunto(e.target.value)}
                                        disabled={!formMateria}
                                    >
                                        <option value="">{formMateria ? 'Selecione o Assunto...' : 'Primeiro selecione a matéria'}</option>
                                        {assuntosDisponiveis.map(a => (
                                            <option key={a} value={a} className="bg-slate-900 text-white py-2">
                                                {a.length > 50 ? a.substring(0, 50) + '...' : a}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={uploading || files.length === 0 || !formMateria}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                                >
                                    {uploading ? <Loader2 className="animate-spin" /> : <Plus />}
                                    {uploading ? `Enviando ${files.length} arquivos...` : 'Adicionar à Biblioteca'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Modal de Chat IA */}
            <PDFChatModal
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                materialId={chatMaterial?.id || ''}
                materialName={chatMaterial?.name || ''}
            />
        </div>
    );
};

export default LibraryView;
