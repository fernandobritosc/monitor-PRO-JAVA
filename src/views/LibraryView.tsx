import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { EditalMateria } from '../types';
import { logger } from '../utils/logger';
import { Book, Upload, FileText, Search, Plus, X, Loader2, Download, Trash2, CheckCircle, ExternalLink, Bot, Headphones, Play, Pause, Music, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFChatModal from '../components/Library/PDFChatModal';
import { AudioConverter } from '../utils/AudioConverter';
import { useSession } from '../hooks/useSession';
import { useEditais } from '../hooks/queries/useEditais';
import { useAppStore } from '../stores/useAppStore';
import { useResizeObserver } from '../hooks/useResizeObserver';

interface StudyMaterial {
    id: string;
    name: string;
    materia: string;
    assunto: string;
    storage_path: string;
    file_size: number;
    podcast_path?: string;
    podcast_file_size?: number;
    created_at: string;
}

interface LibraryViewProps {
    editais?: EditalMateria[];
    missaoAtiva?: string;
}

const LibraryView: React.FC<LibraryViewProps> = ({ editais: editaisProps, missaoAtiva: missaoAtivaProps }) => {
    const { userId } = useSession();
    const { editais: editaisQuery } = useEditais(userId);
    const missaoAtivaStore = useAppStore(state => state.missaoAtiva);
    const editais = editaisProps ?? editaisQuery ?? [];
    const missaoAtiva = missaoAtivaProps ?? missaoAtivaStore ?? '';

    const [materials, setMaterials] = useState<StudyMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedMateria, setSelectedMateria] = useState<string | null>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
    const [isPDFLoading, setIsPDFLoading] = useState(true);
    const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());

    // IA Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMaterial, setChatMaterial] = useState<StudyMaterial | null>(null);

    // Form para upload
    const [uploading, setUploading] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [files, setFiles] = useState<File[]>([]);
    const [podcastFile, setPodcastFile] = useState<File | null>(null);
    const [formMateria, setFormMateria] = useState('');
    const [formAssunto, setFormAssunto] = useState('');

    // Attach podcast to existing material
    const [isAttachOpen, setIsAttachOpen] = useState(false);
    const [targetMaterial, setTargetMaterial] = useState<StudyMaterial | null>(null);

    // Audio Player State
    const [playingMaterialId, setPlayingMaterialId] = useState<string | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

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

    const [pdfContainerRef, pdfDimensions] = useResizeObserver<HTMLDivElement>();

    useEffect(() => {
        if (selectedPDF) {
            logger.debug('LIBRARY', `PDF Aberto - Dimensões do container: ${pdfDimensions.width}x${pdfDimensions.height}`);
        }
    }, [selectedPDF, pdfDimensions]);

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

        // Validação de tamanho (ex: 100MB para podcast)
        if (podcastFile && podcastFile.size > 100 * 1024 * 1024) {
            alert("O arquivo de áudio é muito grande. O limite recomendado é de 100MB.");
            return;
        }

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

                let podcastPath = null;
                let podcastSize = null;

                if (podcastFile && files.length === 1) {
                    let fileToUpload = podcastFile;

                    // Converte se for M4A ou se for maior que 20MB
                    if (podcastFile.name.toLowerCase().endsWith('.m4a') || podcastFile.size > 20 * 1024 * 1024) {
                        setIsConverting(true);
                        try {
                            console.log("Comprimindo áudio para economizar espaço...");
                            fileToUpload = await AudioConverter.convertToMp3(podcastFile, 64);
                            console.log("Conversão concluída!", {
                                de: (podcastFile.size / 1024 / 1024).toFixed(1) + "MB",
                                para: (fileToUpload.size / 1024 / 1024).toFixed(1) + "MB"
                            });
                        } catch (convErr) {
                            console.error("Erro na compressão (continuando com original):", convErr);
                        } finally {
                            setIsConverting(false);
                        }
                    }

                    const podcastName = `podcast-${Date.now()}-${sanitizePath(fileToUpload.name)}`;
                    const pPath = `${user.id}/${podcastName}`;

                    setUploadProgress(10);

                    console.log("Iniciando upload de podcast:", {
                        name: fileToUpload.name,
                        type: fileToUpload.type,
                        size: fileToUpload.size
                    });

                    const { data: pUploadData, error: pError } = await supabase.storage
                        .from('study-materials')
                        .upload(pPath, fileToUpload, {
                            contentType: fileToUpload.type || 'audio/mp3',
                            upsert: true
                        });

                    if (pError) {
                        console.error("Erro no upload do podcast (handleUpload):", pError);
                    } else {
                        podcastPath = pPath;
                        podcastSize = fileToUpload.size;
                        setUploadProgress(90);
                    }
                }

                setUploadProgress(95);

                const { data, error: dbError } = await supabase
                    .from('study_materials')
                    .insert({
                        user_id: user.id,
                        name: file.name,
                        materia: formMateria,
                        assunto: formAssunto,
                        storage_path: filePath,
                        file_size: file.size,
                        podcast_path: podcastPath,
                        podcast_file_size: podcastSize
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
            setPodcastFile(null);
            setFormAssunto('');
            fetchMaterials();

        } catch (e: any) {
            logger.error('LIBRARY', 'Erro no upload', e);
            alert("Erro ao processar uploads: " + e.message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleAttachPodcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!podcastFile || !targetMaterial) return;

        let fileToUpload = podcastFile;
        if (podcastFile.name.toLowerCase().endsWith('.m4a') || podcastFile.size > 20 * 1024 * 1024) {
            setIsConverting(true);
            try {
                fileToUpload = await AudioConverter.convertToMp3(podcastFile, 64);
            } catch (convErr) {
                console.error("Erro na compressão:", convErr);
            } finally {
                setIsConverting(false);
            }
        }

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não logado");

            const sanitizePath = (name: string) => {
                return name
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9.-]/g, '_');
            };

            const podcastName = `podcast-${Date.now()}-${sanitizePath(podcastFile.name)}`;
            const pPath = `${user.id}/${podcastName}`;

            setUploadProgress(20);

            console.log("Anexando podcast final:", {
                name: fileToUpload.name,
                type: fileToUpload.type,
                size: fileToUpload.size
            });

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('study-materials')
                .upload(pPath, fileToUpload, {
                    contentType: fileToUpload.type || 'audio/mp3',
                    upsert: true
                });

            if (uploadError) {
                console.error("Supabase Storage Error Details:", {
                    message: uploadError.message,
                    name: uploadError.name,
                    error: uploadError
                });
                throw uploadError;
            }

            setUploadProgress(80);

            const { error: dbError } = await supabase
                .from('study_materials')
                .update({
                    podcast_path: pPath,
                    podcast_file_size: fileToUpload.size
                })
                .eq('id', targetMaterial.id);

            if (dbError) throw dbError;

            setUploadProgress(100);
            setIsAttachOpen(false);
            setPodcastFile(null);
            setTargetMaterial(null);
            fetchMaterials();

        } catch (e: any) {
            logger.error('LIBRARY', 'Erro ao anexar podcast', e);
            alert("Erro ao anexar: " + e.message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async (material: StudyMaterial) => {
        if (!window.confirm("Deseja excluir este material?")) return;

        try {
            const filesToRemove = [material.storage_path];
            if (material.podcast_path) {
                filesToRemove.push(material.podcast_path);
            }

            await supabase.storage.from('study-materials').remove(filesToRemove);
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

            setIsPDFLoading(true);
            setSelectedPDF(url);
        } catch (e) {
            alert("Erro ao abrir PDF");
        }
    };

    const playPodcast = async (material: StudyMaterial) => {
        if (!material.podcast_path) return;

        // Se já estiver tocando o mesmo áudio, alterna play/pause
        if (playingMaterialId === material.id && audioRef.current) {
            if (isAudioPlaying) {
                audioRef.current.pause();
                setIsAudioPlaying(false);
            } else {
                // Tenta dar play novamente
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => setIsAudioPlaying(true)).catch(e => logger.error('AUDIO', 'Erro ao dar play', e));
                }
            }
            return;
        }

        try {
            // Garante que paramos qualquer áudio anterior
            stopAudio();

            // Seta id imediatamente para feedback visual
            setPlayingMaterialId(material.id);
            setIsAudioPlaying(true); // Otimismo para UI Loading

            // BUG FIX MOBILE: Desbloqueia o elemento de áudio imediatamente com o gesto do usuário
            if (audioRef.current) {
                // Toca um áudio silencioso invisível super curto (base64 wav)
                audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
                audioRef.current.play().catch(() => { });
            }

            const { data, error } = await supabase.storage
                .from('study-materials')
                .createSignedUrl(material.podcast_path, 3600);

            if (error) throw error;

            setAudioUrl(data.signedUrl);

            if (audioRef.current) {
                audioRef.current.src = data.signedUrl;
                audioRef.current.play()
                    .then(() => setIsAudioPlaying(true))
                    .catch(e => {
                        console.error("Audio playback failed", e);
                        setIsAudioPlaying(false);
                    });
            }
        } catch (e) {
            logger.error('LIBRARY', 'Erro ao carregar podcast', e);
            alert("Erro ao carregar podcast");
            setPlayingMaterialId(null);
            setIsAudioPlaying(false);
        }
    };

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setPlayingMaterialId(null);
        setAudioUrl(null);
        setIsAudioPlaying(false);
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
                                    {material.podcast_path ? (
                                        <button
                                            onClick={() => playPodcast(material)}
                                            className={`p-2 rounded-xl transition-all shadow-lg ${playingMaterialId === material.id ? 'bg-green-500 text-white' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white'}`}
                                            title={playingMaterialId === material.id ? (isAudioPlaying ? "Pausar" : "Continuar") : "Ouvir Podcast"}
                                        >
                                            {playingMaterialId === material.id && isAudioPlaying ? <Pause size={18} /> : <Headphones size={18} />}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { setTargetMaterial(material); setIsAttachOpen(true); }}
                                            className="p-2 bg-white/5 text-slate-500 rounded-xl hover:bg-indigo-500/20 hover:text-indigo-400 transition-all shadow-lg"
                                            title="Anexar Podcast"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openPDF(material)}
                                        className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg"
                                        title="Ler Material"
                                    >
                                        <ExternalLink size={18} />
                                    </button>
                                </div>
                            </div>
                            {playingMaterialId === material.id && (
                                <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {isAudioPlaying ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                                            ) : (
                                                <Loader2 size={12} className="text-slate-400 animate-spin" />
                                            )}
                                            <span className="text-[10px] font-black text-green-400 tracking-wider">
                                                {isAudioPlaying ? 'PODCAST ATIVO' : 'CARREGANDO...'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={stopAudio}
                                            className="text-slate-500 hover:text-red-400 transition-colors"
                                            title="Sair do Áudio"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl">
                                        <button
                                            onClick={() => playPodcast(material)}
                                            className="w-10 h-10 flex items-center justify-center bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition-all shadow-lg active:scale-90"
                                        >
                                            {isAudioPlaying ? <Pause size={20} /> : <Play size={20} />}
                                        </button>

                                        <div className="flex-1 flex flex-col gap-1">
                                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: isAudioPlaying ? "100%" : "auto" }}
                                                    transition={{ duration: 300, ease: "linear" }}
                                                    className="h-full bg-indigo-500"
                                                />
                                            </div>
                                            <div className="flex justify-between text-[8px] font-bold text-slate-500">
                                                <span>{isAudioPlaying ? 'Tocando...' : 'Pausado / Carregando'}</span>
                                                <div className="flex gap-4">
                                                    <span onClick={stopAudio} className="cursor-pointer hover:text-white transition-colors">PARAR</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                                    onClick={() => {
                                        setSelectedPDF(null);
                                        setIsPDFLoading(true);
                                    }}
                                    className="bg-white/10 hover:bg-red-500 text-white p-2 rounded-full transition-all ml-2"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div 
                            ref={pdfContainerRef}
                            className="flex-1 w-full bg-slate-800 relative flex flex-col items-center justify-center overflow-hidden"
                        >
                            {/* Placeholder/Loader Background */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none bg-slate-900/50">
                                {isPDFLoading ? (
                                    <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                        <Loader2 size={40} className="text-indigo-400 animate-spin" />
                                        <p className="text-indigo-200/50 text-[10px] font-black uppercase tracking-widest">
                                            Preparando Documento...
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <FileText size={48} className="text-slate-700 mb-4" />
                                        <p className="text-slate-500 text-sm max-w-xs">
                                            Se o PDF não carregar abaixo, clique em <b>"Abrir em Nova Aba"</b> acima.
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* O Iframe agora renderiza independente do Observer para começar o download mais rápido */}
                            {selectedPDF && (
                                <iframe
                                    key={selectedPDF}
                                    src={`${selectedPDF}#toolbar=0&view=FitH`}
                                    className={`w-full h-full border-none bg-white relative z-10 transition-opacity duration-700 ${isPDFLoading ? 'opacity-0' : 'opacity-100'}`}
                                    title="PDF Viewer"
                                    onLoad={() => {
                                        logger.debug('LIBRARY', 'PDF Carregado no Iframe');
                                        setIsPDFLoading(false);
                                    }}
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Elemento de áudio global para garantir autoplay no mobile */}
            <audio
                ref={audioRef}
                id="global-podcast-audio"
                controls={false}
                preload="auto"
                onPlay={() => setIsAudioPlaying(true)}
                onPause={() => setIsAudioPlaying(false)}
                onEnded={() => { setPlayingMaterialId(null); setIsAudioPlaying(false); }}
                className="w-0 h-0 absolute pointer-events-none opacity-0"
            />

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
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Podcast AI (Opcional - NotebookLM MP3)</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            onChange={e => setPodcastFile(e.target.files ? e.target.files[0] : null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-center group-hover:border-indigo-500/50 transition-all flex items-center justify-center gap-3">
                                            {podcastFile ? (
                                                <>
                                                    <Music className="text-green-400" size={18} />
                                                    <span className="text-xs font-bold text-white truncate max-w-[200px]">{podcastFile.name}</span>
                                                    <button type="button" onClick={(e) => { e.preventDefault(); setPodcastFile(null); }} className="text-slate-500 hover:text-red-400 ml-2"><X size={14} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <Headphones className="text-slate-500" size={18} />
                                                    <span className="text-xs font-bold text-slate-500">Adicionar podcast de áudio</span>
                                                </>
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
                                        {assuntosDisponiveis.map((a: string) => (
                                            <option key={a} value={a} className="bg-slate-900 text-white py-2">
                                                {a.length > 50 ? a.substring(0, 50) + '...' : a}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={uploading || files.length === 0 || !formMateria}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 overflow-hidden relative"
                                >
                                    {uploading && (
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-white/10 transition-all duration-500"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    )}
                                    <div className="flex items-center gap-3">
                                        {uploading ? <Loader2 className="animate-spin" /> : (isConverting ? <Settings2 className="animate-spin text-yellow-400" /> : <Plus />)}
                                        {isConverting ? 'Comprimindo Áudio...' : (uploading ? `Enviando...` : 'Adicionar à Biblioteca')}
                                    </div>
                                    {uploading && uploadProgress > 0 && (
                                        <span className="text-[10px] opacity-70">
                                            {uploadProgress}% concluído
                                        </span>
                                    )}
                                </button>
                                {podcastFile && podcastFile.size > 20 * 1024 * 1024 && (
                                    <p className="text-[10px] text-yellow-500 font-bold text-center mt-2">
                                        ⚠️ Arquivo grande detectado ({(podcastFile.size / 1024 / 1024).toFixed(1)}MB). O upload pode demorar um pouco.
                                    </p>
                                )}
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Modal de Anexar Podcast */}
            <AnimatePresence>
                {isAttachOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-950 border border-white/10 w-full max-w-md rounded-3xl p-6 relative shadow-2xl"
                        >
                            <button onClick={() => setIsAttachOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>

                            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                                <Headphones className="text-indigo-400" /> Anexar Podcast
                            </h3>
                            <p className="text-slate-500 text-xs mb-6">PDF: <span className="text-indigo-300">{targetMaterial?.name}</span></p>

                            <form onSubmit={handleAttachPodcast} className="space-y-6">
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="audio/*,.m4a"
                                            onChange={e => setPodcastFile(e.target.files ? e.target.files[0] : null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            required
                                        />
                                        <div className="w-full bg-slate-900/50 border-2 border-dashed border-white/10 rounded-2xl p-8 text-center group-hover:border-indigo-500/50 transition-all flex flex-col items-center gap-3">
                                            {podcastFile ? (
                                                <>
                                                    <Music className="text-green-400" size={32} />
                                                    <span className="text-sm font-bold text-white truncate max-w-full">{podcastFile.name}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="text-slate-500" size={32} />
                                                    <span className="text-xs font-bold text-slate-500">Selecione o arquivo .m4a ou .mp3</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={uploading || isConverting || !podcastFile}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all disabled:opacity-50"
                                >
                                    {uploading && (
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-white/10 transition-all duration-500"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    )}
                                    <div className="flex items-center gap-2">
                                        {isConverting ? <Settings2 className="animate-spin text-yellow-400" size={18} /> : (uploading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />)}
                                        <span>{isConverting ? 'Otimizando Áudio...' : (uploading ? 'Enviando...' : 'Confirmar Anexo')}</span>
                                    </div>
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
