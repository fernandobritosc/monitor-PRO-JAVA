import React, { useState, useEffect, useMemo } from 'react';
import { supabase, saveAppConfig } from '../services/supabase';
import { EditalMateria, UserProfile, StudyRecord } from '../types';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error';
import { editaisQueries, profilesQueries } from '../services/queries';
import { Target, DownloadCloud, Settings, Activity, Shield } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useSession } from '../hooks/useSession';
import { useEditais } from '../hooks/queries/useEditais';
import { useStudyRecords } from '../hooks/queries/useStudyRecords';
import { useAppStore } from '../stores/useAppStore';
import { ESTUDO_LIVRE } from '../constants';
import { syncService } from '../services/offline/sync';
import { useQueryClient } from '@tanstack/react-query';
import SystemConfigPanel from '../components/features/configurar/SystemConfigPanel';
import ChangePasswordPanel from '../components/features/configurar/ChangePasswordPanel';
import GoalsPanel from '../components/features/configurar/GoalsPanel';
import MissionsPanel from '../components/features/configurar/MissionsPanel';
import ImportPanel from '../components/features/configurar/ImportPanel';
import DiagnosticsPanel from '../components/features/configurar/DiagnosticsPanel';
import AdminPanel from '../components/features/configurar/AdminPanel';
import SqlScriptModal from '../components/features/configurar/SqlScriptModal';
import MissionFormModal from '../components/features/configurar/MissionFormModal';

interface ConfigurarProps {
  editais?: EditalMateria[];
  records?: StudyRecord[];
  missaoAtiva?: string;
  onUpdated?: () => Promise<void>;
  setMissaoAtiva?: (missao: string) => void;
}

interface SubjectDraft {
  id?: string;
  materia: string;
  topicos: string[];
  peso: number;
}

interface CommunityTemplate {
  id: string;
  title: string;
  cargo: string;
  stats: string;
  materias: unknown[];
}

const Configurar: React.FC<ConfigurarProps> = ({ editais: editaisProps, records: recordsProps, missaoAtiva: missaoAtivaProps, onUpdated: onUpdatedProps, setMissaoAtiva: setMissaoAtivaProps }) => {
  const { userId } = useSession();
  const { editais: editaisQuery } = useEditais(userId);
  const { studyRecords: recordsQuery } = useStudyRecords(userId);
  const missaoAtivaStore = useAppStore(state => state.missaoAtiva);
  const setMissaoAtivaStore = useAppStore(state => state.setMissaoAtiva);

  const editais = editaisProps ?? editaisQuery ?? [];
  const records = recordsProps ?? recordsQuery ?? [];
  const missaoAtiva = missaoAtivaProps ?? missaoAtivaStore ?? '';
  const setMissaoAtiva = setMissaoAtivaProps ?? setMissaoAtivaStore;
  const onUpdated = onUpdatedProps ?? (async () => {});

  const { isInstallable, installApp } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'mission' | 'goals' | 'import' | 'admin' | 'diagnostics' | 'system'>('mission');

  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [approvalMsg, setApprovalMsg] = useState<string | null>(null);

  const [sysUrl, setSysUrl] = useState('');
  const [sysKey, setSysKey] = useState('');
  const [sysAiKey, setSysAiKey] = useState('');
  const [sysGroqKey, setSysGroqKey] = useState('');
  const [sysLoading, setSysLoading] = useState(false);

  const [permissionError, setPermissionError] = useState<boolean>(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const [diagLog, setDiagLog] = useState<string[]>([]);
  const [diagLoading, setLoadingDiag] = useState(false);
  const [resyncLoading, setResyncLoading] = useState(false);
  const [resyncResult, setResyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const queryClient = useQueryClient();

  const [communityTemplates, setCommunityTemplates] = useState<CommunityTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingMission, setLoadingMission] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingOldName, setEditingOldName] = useState<string | null>(null);

  const [formConcurso, setFormConcurso] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formDataProva, setFormDataProva] = useState('');
  const [formSubjects, setFormSubjects] = useState<SubjectDraft[]>([]);

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTopics, setNewSubjectTopics] = useState('');
  const [newSubjectWeight, setNewSubjectWeight] = useState(1);
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserEmail(user.email || '');
      try {
        const profile = await profilesQueries.getById(user.id);
        if (profile?.is_admin === true) {
          setIsAdmin(true);
          fetchUsers();
        }
      } catch (e) { }
    };
    checkAdmin();

    setSysUrl(localStorage.getItem('monitorpro_supabase_url') || '');
    setSysKey(localStorage.getItem('monitorpro_supabase_key') || '');
    setSysAiKey(localStorage.getItem('monitorpro_ai_key') || '');
    setSysGroqKey(localStorage.getItem('monitorpro_groq_key') || '');
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const createEstudoLivreIfNeeded = async () => {
      if (!userId || !editais?.length) return;
      
      const exists = editais.some(e => e.concurso === ESTUDO_LIVRE);
      if (exists) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        await editaisQueries.insert([{
          user_id: user.id,
          concurso: ESTUDO_LIVRE,
          cargo: 'Estudo Livre',
          materia: 'Geral',
          topicos: [],
          is_principal: true,
          peso: 1
        }]);
        
        queryClient.invalidateQueries({ queryKey: ['editais', user.id] });
        if (mounted) await onUpdated();
      } catch (e) {
        logger.error('DATA', 'Erro ao criar Estudo Livre', e);
      }
    };

    createEstudoLivreIfNeeded();
    
    return () => { mounted = false; };
  }, [userId]);

  const [metaHoras, setMetaHoras] = useState(22);
  const [metaQuestoes, setMetaQuestoes] = useState(350);

  useEffect(() => {
    const savedMetas = localStorage.getItem(`metas_semanais_${missaoAtiva}`);
    if (savedMetas) {
      const parsed = JSON.parse(savedMetas);
      setMetaHoras(parsed.horas || 22);
      setMetaQuestoes(parsed.questoes || 350);
    }
  }, [missaoAtiva]);

  const saveMetas = () => {
    localStorage.setItem(`metas_semanais_${missaoAtiva}`, JSON.stringify({ horas: metaHoras, questoes: metaQuestoes }));
    alert("Metas salvas com sucesso!");
  };

  const activeRecords = useMemo(() => records.filter(r => r.concurso === missaoAtiva), [records, missaoAtiva]);

  const statsSemana = useMemo(() => {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay() + (hoje.getDay() === 0 ? -6 : 1));
    inicioSemana.setHours(0, 0, 0, 0);

    const registrosSemana = activeRecords.filter(r => new Date(r.data_estudo) >= inicioSemana);
    const horas = registrosSemana.reduce((acc, r) => acc + r.tempo, 0) / 60;
    const questoes = registrosSemana.reduce((acc, r) => acc + r.total, 0);

    const diasPassados = hoje.getDay() === 0 ? 7 : hoje.getDay();
    const projecao = diasPassados > 0 ? (horas / diasPassados) * 7 : 0;

    return { horas, questoes, projecao };
  }, [activeRecords]);

  const fetchCommunityTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await editaisQueries.getAll(2000);
      if (data && data.length > 0) {
        const grouped: Record<string, EditalMateria[]> = {};
        data.forEach((row: EditalMateria) => {
          const key = row.concurso;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(row);
        });
        const list = Object.keys(grouped).map((concursoName, idx) => {
          const rows = grouped[concursoName];
          return {
            id: `tmpl-${idx}`, title: concursoName, cargo: rows[0].cargo || 'Geral',
            stats: `${rows.length} matérias / ${rows.reduce((acc, r) => acc + (r.topicos?.length || 0), 0)} tópicos`,
            materias: rows
          };
        }).sort((a, b) => a.title.localeCompare(b.title));
        setCommunityTemplates(list);
      }
    } catch (e) { logger.error('DATA', 'Erro fetchCommunityTemplates', e); } finally { setLoadingTemplates(false); }
  };

  const handleImportTemplate = async (template: CommunityTemplate) => {
    setImportingId(template.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");
      const payload = template.materias.map((m: unknown) => {
        const row = m as Partial<EditalMateria>;
        return {
          user_id: user.id, concurso: row.concurso, cargo: row.cargo, materia: row.materia,
          topicos: row.topicos, is_principal: true, data_prova: row.data_prova, peso: row.peso || 1
        };
      });
      await editaisQueries.upsert(payload, false);
      queryClient.invalidateQueries({ queryKey: ['editais', user.id] });
      setMissaoAtiva(template.title); await onUpdated(); alert(`Edital "${template.title}" importado com sucesso!`); setActiveTab('mission');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      logger.error('DATA', 'Erro importando template', e);
      if (message.includes('constraint') || message.includes('ON CONFLICT')) { setPermissionError(true); alert("ERRO DE BANCO DE DADOS: Faltam regras de unicidade. O modal de correção abrirá automaticamente."); }
      else { alert("Erro ao importar: " + message); }
    } finally { setImportingId(null); }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await profilesQueries.getAll();
      if (data) setUsersList(data);
    } catch (e: unknown) { logger.error('DATA', 'Erro ao buscar perfis', e); } finally { setLoadingUsers(false); }
  };

  const runDiagnostics = async () => {
    setLoadingDiag(true);
    const logs: string[] = [];
    const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    try {
      log("Iniciando diagnóstico...");
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) log(`❌ Erro Auth: ${authError.message}`);
      else if (!session) log("❌ Sem sessão ativa.");
      else log(`✅ Autenticado como: ${session.user.email} (ID: ${session.user.id.slice(0, 5)}...)`);
      if (session) {
        const { data: profile, error: profError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profError) { log(`⚠️ Erro Perfil: ${profError.message}`); if (profError.code === '42501') log("🚨 ALERTA: Permissão negada (RLS)."); }
        else { log(`✅ Perfil carregado. Aprovado: ${profile.approved}`); }
        const { count, error: countError } = await supabase.from('editais_materias').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
        if (countError) log(`❌ Erro Contagem Editais: ${countError.message}`); else log(`✅ Editais encontrados: ${count ?? 0}`);
      }
      log("Diagnóstico concluído.");
    } catch (e: unknown) { log(`❌ Erro Fatal: ${e instanceof Error ? e.message : String(e)}`); } finally { setLoadingDiag(false); }
  };

  const toggleUserApproval = async (userId: string, currentStatus: boolean | undefined) => {
    const newStatus = !currentStatus;
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, approved: newStatus } : u));
    setApprovalMsg(newStatus ? 'Usuário APROVADO com sucesso!' : 'Acesso do usuário BLOQUEADO.');
    setTimeout(() => setApprovalMsg(null), 3000);
    try {
      await profilesQueries.updateApproval(userId, newStatus);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errCode = error instanceof Object && 'code' in error ? (error as { code: string }).code : '';
      logger.error('DATA', "Erro no update de perfil:", error);
      if (errCode === '42501' || errMsg.includes('permission')) setPermissionError(true); else alert('Erro ao atualizar: ' + errMsg);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, approved: !newStatus } : u));
    }
  };

  const sqlScript = useMemo(() => {
    return `-- SCRIPT DE CORREÇÃO DEFINITIVA (V3)
-- 1. Tabelas de Editais e Matérias
ALTER TABLE editais_materias ADD COLUMN IF NOT EXISTS peso numeric default 1;
ALTER TABLE editais_materias DISABLE ROW LEVEL SECURITY;
DELETE FROM editais_materias WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, concurso, materia ORDER BY id DESC) as row_num FROM editais_materias) t WHERE t.row_num > 1);
ALTER TABLE editais_materias DROP CONSTRAINT IF EXISTS editais_materias_concurso_materia_key;
ALTER TABLE editais_materias DROP CONSTRAINT IF EXISTS editais_materias_user_id_concurso_materia_key;
DROP INDEX IF EXISTS editais_materias_concurso_materia_key;
DROP INDEX IF EXISTS editais_materias_user_id_concurso_materia_key;
CREATE UNIQUE INDEX editais_materias_user_id_concurso_materia_key ON editais_materias (user_id, concurso, materia);
ALTER TABLE editais_materias ADD CONSTRAINT editais_materias_user_id_concurso_materia_key UNIQUE USING INDEX editais_materias_user_id_concurso_materia_key;
ALTER TABLE editais_materias ENABLE ROW LEVEL SECURITY;

-- 2. Tabela de Registros de Estudos (CORREÇÃO SCHEMA CACHE)
ALTER TABLE registros_estudos ADD COLUMN IF NOT EXISTS analise_erros jsonb default '[]'::jsonb;
ALTER TABLE registros_estudos ADD COLUMN IF NOT EXISTS sugestao_mentor text;
ALTER TABLE registros_estudos ADD COLUMN IF NOT EXISTS meta text;

-- 3. Políticas de Segurança (Editais)
DROP POLICY IF EXISTS "Permitir Leitura Publica" ON editais_materias;
DROP POLICY IF EXISTS "Permitir Criacao Propria" ON editais_materias;
DROP POLICY IF EXISTS "Permitir Edicao Propria" ON editais_materias;
DROP POLICY IF EXISTS "Permitir Exclusao Propria" ON editais_materias;
CREATE POLICY "Permitir Leitura Publica" ON editais_materias FOR SELECT USING (true);
CREATE POLICY "Permitir Criacao Propria" ON editais_materias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permitir Edicao Propria" ON editais_materias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permitir Exclusao Propria" ON editais_materias FOR DELETE USING (auth.uid() = user_id);

-- 4. Perfis e Administração
CREATE TABLE IF NOT EXISTS public.profiles (id uuid references auth.users on delete cascade not null primary key, email text, approved boolean default false, is_admin boolean default false, created_at timestamp with time zone default timezone('utc'::text, now()));
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles" ON profiles; DROP POLICY IF EXISTS "Users update own" ON profiles; DROP POLICY IF EXISTS "Insert profile" ON profiles;
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insert profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

NOTIFY pgrst, 'reload schema';
`;
  }, []);

  const copyToClipboard = () => { navigator.clipboard.writeText(sqlScript); alert("Script copiado! Vá no Supabase > SQL Editor, cole e clique em RUN."); };

  const groupedMissions = useMemo(() => {
    const groups: Record<string, { cargo: string, materiasCount: number, isPrincipal: boolean, dataProva?: string }> = {};
    if (!editais || !Array.isArray(editais)) return [];
    editais.forEach(e => {
      if (!groups[e.concurso]) { groups[e.concurso] = { cargo: e.cargo, materiasCount: 0, isPrincipal: e.is_principal, dataProva: e.data_prova }; }
      groups[e.concurso].materiasCount++;
      if (e.is_principal) groups[e.concurso].isPrincipal = true;
    });
    return Object.entries(groups).map(([concurso, data]) => ({ concurso, ...data }));
  }, [editais]);

  const handleManualRefresh = async () => { if (refreshing) return; setRefreshing(true); try { await onUpdated(); } catch (e) { logger.error('DATA', 'Erro no refresh', e); } finally { setTimeout(() => setRefreshing(false), 800); } };

  const handleOpenCreate = () => { setEditingOldName(null); setFormConcurso(''); setFormCargo(''); setFormDataProva(''); setFormSubjects([]); setNewSubjectName(''); setNewSubjectTopics(''); setNewSubjectWeight(1); setEditingSubjectIndex(null); setIsModalOpen(true); };
  const handleOpenEdit = (concurso: string) => { const missionRows = editais.filter(e => e.concurso === concurso); if (missionRows.length === 0) return; const firstRow = missionRows[0]; setEditingOldName(concurso); setFormConcurso(concurso); setFormCargo(firstRow.cargo); setFormDataProva(firstRow.data_prova || ''); setFormSubjects(missionRows.map(row => ({ id: row.id, materia: row.materia, topicos: row.topicos || [], peso: row.peso || 1 }))); setEditingSubjectIndex(null); setIsModalOpen(true); };
  const processTopicsText = (text: string): string[] => { return text.split(/[\n;]+/).map(t => t.trim()).filter(t => t.length > 0 && t !== '.'); };
  const handleAddSubject = () => { if (!newSubjectName.trim()) return; let finalName = newSubjectName.trim(); let topicsArray = processTopicsText(newSubjectTopics); if (topicsArray.length === 0) topicsArray = ['Geral']; const isDuplicate = formSubjects.some((s, idx) => idx !== editingSubjectIndex && s.materia.toLowerCase() === finalName.toLowerCase()); if (isDuplicate) { alert("Esta matéria já existe na lista."); return; } if (editingSubjectIndex !== null) { setFormSubjects(prev => prev.map((sub, idx) => idx === editingSubjectIndex ? { ...sub, materia: finalName, topicos: topicsArray, peso: newSubjectWeight } : sub)); setEditingSubjectIndex(null); } else { setFormSubjects(prev => [...prev, { materia: finalName, topicos: topicsArray, peso: newSubjectWeight }]); } setNewSubjectName(''); setNewSubjectTopics(''); setNewSubjectWeight(1); };
  const handleEditSubject = (index: number) => { const sub = formSubjects[index]; setNewSubjectName(sub.materia); setNewSubjectTopics(sub.topicos.join('\n')); setNewSubjectWeight(sub.peso || 1); setEditingSubjectIndex(index); };
  const handleCancelSubjectEdit = () => { setNewSubjectName(''); setNewSubjectTopics(''); setNewSubjectWeight(1); setEditingSubjectIndex(null); };
  const handleRemoveSubject = (index: number) => { if (editingSubjectIndex === index) { handleCancelSubjectEdit(); } setFormSubjects(prev => prev.filter((_, i) => i !== index)); };

  const handleSaveMission = async () => {
    if (!formConcurso.trim() || !formCargo.trim()) { alert("Preencha o nome do Concurso e o Cargo."); return; }
    if (formSubjects.length === 0) { alert("Adicione pelo menos uma matéria antes de salvar."); return; }
    setLoadingMission(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada.");
      const isPrincipal = editais.length === 0 || editais.some(e => e.concurso === editingOldName && e.is_principal);
      const dateToSave = formDataProva && formDataProva.trim() !== '' ? formDataProva : undefined;
      const idsToDelete: string[] = [];
      if (editingOldName) { const originalIds = editais.filter(e => e.concurso === editingOldName).map(e => e.id); const currentIds = formSubjects.map(s => s.id).filter(Boolean) as string[]; originalIds.forEach(id => { if (!currentIds.includes(id)) idsToDelete.push(id); }); }
      const isRenamingMission = !!(editingOldName && editingOldName !== formConcurso.trim());
      const toUpdate: Partial<EditalMateria>[] = []; const toInsert: Partial<EditalMateria>[] = []; const seenMaterias = new Set<string>();
      for (const sub of formSubjects) { const matName = sub.materia.trim(); const key = matName.toLowerCase(); if (seenMaterias.has(key)) continue; seenMaterias.add(key); const payload = { user_id: user.id, concurso: formConcurso.trim(), cargo: formCargo.trim(), materia: matName, topicos: sub.topicos, data_prova: dateToSave, is_principal: isPrincipal, peso: sub.peso || 1 }; if (sub.id && !isRenamingMission) { toUpdate.push({ ...payload, id: sub.id }); } else { toInsert.push(payload); } }
      if (idsToDelete.length > 0) { await editaisQueries.deleteMany(idsToDelete); }
      if (toUpdate.length > 0) { await editaisQueries.update(toUpdate); }
      if (toInsert.length > 0) { await editaisQueries.upsert(toInsert, true); }
      if (editingOldName === missaoAtiva && formConcurso !== missaoAtiva) { setMissaoAtiva(formConcurso); } else if (!missaoAtiva) { setMissaoAtiva(formConcurso); }
      queryClient.invalidateQueries({ queryKey: ['editais', user.id] });
      await onUpdated(); setIsModalOpen(false);
    } catch (err: unknown) { const message = getErrorMessage(err); logger.error('DATA', 'Erro salvando form de edição', err); if (message.includes('duplicate key') || message.includes('ON CONFLICT')) { setPermissionError(true); alert("ERRO DE DUPLICIDADE: Matéria duplicada detectada."); } else if (message.includes('schema cache')) { setPermissionError(true); alert("ATUALIZAÇÃO NECESSÁRIA: Execute o script SQL."); } else { alert("Erro ao salvar: " + message); } } finally { setLoadingMission(false); }
  };

  const handleDeleteMission = async (concurso: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar o edital "${concurso}"?`)) { return; }
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    try { 
      setRefreshing(true); 
      const idsToDelete = await editaisQueries.getIdsByConcurso(user.id, concurso); 
      if (!idsToDelete || idsToDelete.length === 0) { 
        if (missaoAtiva === concurso) setMissaoAtiva(''); 
        await onUpdated(); 
        return; 
      } 
      await editaisQueries.deleteMany(idsToDelete); 
      queryClient.invalidateQueries({ queryKey: ['editais', user.id] });
      if (missaoAtiva === concurso) setMissaoAtiva(''); 
      await onUpdated(); 
    } catch (e: unknown) { 
      alert("Falha na exclusão: " + (e instanceof Error ? e.message : String(e))); 
    } finally { 
      setRefreshing(false); 
    }
  };

  const filteredTemplates = useMemo(() => communityTemplates.filter(t => t.title.toLowerCase().includes(importSearch.toLowerCase())), [communityTemplates, importSearch]);

  const handleSaveSystemConfig = async () => {
    setSysLoading(true);
    try {
      saveAppConfig(sysUrl, sysKey, sysAiKey, sysGroqKey);
    } finally {
      setSysLoading(false);
    }
  };

  const handleForceResync = async () => {
    if (!window.confirm(
      '⚠️ FORCE RE-SYNC\n\n' +
      'Isso vai:\n' +
      '1. Apagar TODO o cache local do navegador\n' +
      '2. Baixar dados frescos do Supabase\n\n' +
      'Registros pendentes (não sincronizados) serão PERDIDOS.\n\n' +
      'Continuar?'
    )) return;
    setResyncLoading(true);
    setResyncResult(null);
    const result = await syncService.safeRefresh(userId || '');
    setResyncResult(result);
    setResyncLoading(false);
    if (result.success) {
      queryClient.invalidateQueries();
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">

      <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto">
        <button onClick={() => setActiveTab('mission')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'mission' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}>
          🎯 Missões & Editais
        </button>
        <button onClick={() => setActiveTab('goals')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'goals' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-slate-400 hover:text-white'}`}>
          <Target size={14} /> Metas & Projeção
        </button>
        <button onClick={() => setActiveTab('import')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'import' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}>
          <DownloadCloud size={14} /> Comunidade / Importar
        </button>
        <button onClick={() => setActiveTab('system')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'system' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white'}`}>
          <Settings size={14} /> Sistema & API
        </button>
        <button onClick={() => setActiveTab('diagnostics')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'diagnostics' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white'}`}>
          <Activity size={14} /> Diagnóstico
        </button>
        {isAdmin && (
          <button onClick={() => setActiveTab('admin')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'admin' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white'}`}>
            <Shield size={14} /> Admin
          </button>
        )}
      </div>

      {activeTab === 'system' && (
        <>
          <SystemConfigPanel
            sysUrl={sysUrl} sysKey={sysKey} sysAiKey={sysAiKey} sysGroqKey={sysGroqKey}
            sysLoading={sysLoading} isInstallable={isInstallable}
            onUrlChange={setSysUrl} onKeyChange={setSysKey}
            onAiKeyChange={setSysAiKey} onGroqKeyChange={setSysGroqKey}
            onSave={handleSaveSystemConfig} onInstallApp={installApp}
          />
          <div className="glass rounded-2xl p-6 shadow-xl animate-in slide-in-from-right-2 max-w-2xl mx-auto space-y-2">
            <ChangePasswordPanel />
          </div>
        </>
      )}

      {activeTab === 'goals' && (
        <GoalsPanel
          statsSemana={statsSemana}
          metaHoras={metaHoras} metaQuestoes={metaQuestoes}
          onMetaHorasChange={setMetaHoras} onMetaQuestoesChange={setMetaQuestoes}
          onSave={saveMetas}
        />
      )}

      {activeTab === 'mission' && (
        <MissionsPanel
          groupedMissions={groupedMissions} missaoAtiva={missaoAtiva} refreshing={refreshing}
          onRefresh={handleManualRefresh} onOpenCreate={handleOpenCreate}
          onOpenEdit={handleOpenEdit} onDeleteMission={handleDeleteMission}
          onSelectMission={setMissaoAtiva}
          onShowSql={() => setShowSqlModal(true)}
        />
      )}

      {activeTab === 'import' && (
        <ImportPanel
          filteredTemplates={filteredTemplates} loadingTemplates={loadingTemplates}
          importSearch={importSearch} importingId={importingId}
          onSearchChange={setImportSearch} onImportTemplate={handleImportTemplate}
        />
      )}

      {activeTab === 'diagnostics' && (
        <DiagnosticsPanel
          diagLog={diagLog} diagLoading={diagLoading}
          resyncLoading={resyncLoading} resyncResult={resyncResult}
          onRunDiagnostics={runDiagnostics} onForceResync={handleForceResync}
          onShowSql={() => setShowSqlModal(true)}
        />
      )}

      {activeTab === 'admin' && isAdmin && (
        <AdminPanel
          usersList={usersList} currentUserEmail={currentUserEmail}
          loadingUsers={loadingUsers} userSearch={userSearch}
          approvalMsg={approvalMsg}
          onUserSearchChange={setUserSearch} onToggleApproval={toggleUserApproval}
          onShowSql={() => setShowSqlModal(true)}
        />
      )}

      <SqlScriptModal
        show={permissionError || showSqlModal}
        permissionError={permissionError}
        sqlScript={sqlScript}
        onClose={() => { setPermissionError(false); setShowSqlModal(false); }}
        onCopy={copyToClipboard}
      />

      <MissionFormModal
        isOpen={isModalOpen}
        editingOldName={editingOldName}
        formConcurso={formConcurso} formCargo={formCargo}
        formDataProva={formDataProva} formSubjects={formSubjects}
        newSubjectName={newSubjectName} newSubjectTopics={newSubjectTopics}
        newSubjectWeight={newSubjectWeight} editingSubjectIndex={editingSubjectIndex}
        loading={loadingMission}
        onClose={() => { setIsModalOpen(false); setLoadingMission(false); }}
        onFormConcursoChange={setFormConcurso}
        onFormCargoChange={setFormCargo}
        onFormDataProvaChange={setFormDataProva}
        onNewSubjectNameChange={setNewSubjectName}
        onNewSubjectTopicsChange={setNewSubjectTopics}
        onNewSubjectWeightChange={setNewSubjectWeight}
        onAddSubject={handleAddSubject}
        onEditSubject={handleEditSubject}
        onCancelSubjectEdit={handleCancelSubjectEdit}
        onRemoveSubject={handleRemoveSubject}
        onSubmit={handleSaveMission}
      />
    </div>
  );
};

export default Configurar;
