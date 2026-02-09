
<<<<<<< HEAD

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { EditalMateria, UserProfile } from '../types';
import { PlusCircle, Shield, Search, Loader2, Edit, Trash2, Save, X, RefreshCw, Calendar, BookOpen, CheckCircle2, AlertTriangle, Terminal, Database, Copy, Activity, FileText, DownloadCloud, Users, ArrowRight, Briefcase } from 'lucide-react';
=======
import React, { useState, useEffect, useMemo } from 'react';
import { supabase, saveAppConfig } from '../services/supabase'; 
import { EditalMateria, UserProfile } from '../types';
import { PlusCircle, Shield, Search, Loader2, Edit, Trash2, Save, X, RefreshCw, Calendar, BookOpen, CheckCircle2, AlertTriangle, Terminal, Database, Copy, Activity, FileText, DownloadCloud, Users, ArrowRight, Briefcase, Calculator, Settings, Key, Link, Sparkles, Zap } from 'lucide-react';
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608

interface ConfigurarProps {
  editais: EditalMateria[];
  missaoAtiva: string;
  onUpdated: () => Promise<void>;
  setMissaoAtiva: (missao: string) => void;
}

interface SubjectDraft {
  id?: string;
  materia: string;
  topicos: string[];
<<<<<<< HEAD
}

const Configurar: React.FC<ConfigurarProps> = ({ editais, missaoAtiva, onUpdated, setMissaoAtiva }) => {
  const [activeTab, setActiveTab] = useState<'mission' | 'import' | 'admin' | 'diagnostics'>('mission');
=======
  peso: number;
}

const Configurar: React.FC<ConfigurarProps> = ({ editais, missaoAtiva, onUpdated, setMissaoAtiva }) => {
  const [activeTab, setActiveTab] = useState<'mission' | 'import' | 'admin' | 'diagnostics' | 'system'>('mission');
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [approvalMsg, setApprovalMsg] = useState<string | null>(null);
  
<<<<<<< HEAD
=======
  // States do Sistema (API Keys)
  const [sysUrl, setSysUrl] = useState('');
  const [sysKey, setSysKey] = useState('');
  const [sysAiKey, setSysAiKey] = useState('');
  const [sysGroqKey, setSysGroqKey] = useState(''); // NOVO
  const [sysLoading, setSysLoading] = useState(false);

>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  // Estado para Erro de RLS e Modal SQL
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Estados de Diagnóstico
  const [diagLog, setDiagLog] = useState<string[]>([]);
<<<<<<< HEAD
  const [diagLoading, setLoadingDiag] = useState(false); // Renamed from diagLoading to avoid conflict
=======
  const [diagLoading, setLoadingDiag] = useState(false);
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608

  // Estados da Comunidade / Importação
  const [communityTemplates, setCommunityTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingMission, setLoadingMission] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingOldName, setEditingOldName] = useState<string | null>(null);

  // Form States
  const [formConcurso, setFormConcurso] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formDataProva, setFormDataProva] = useState('');
  const [formSubjects, setFormSubjects] = useState<SubjectDraft[]>([]);

  // Subject Input States
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTopics, setNewSubjectTopics] = useState('');
<<<<<<< HEAD
=======
  const [newSubjectWeight, setNewSubjectWeight] = useState(1); 
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
<<<<<<< HEAD
      // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'getUser' property.
=======
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) return;
      setCurrentUserEmail(user.email || '');
      try {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
        if (user.email === 'fernandobritosc@gmail.com' || profile?.is_admin === true) {
          setIsAdmin(true);
          fetchUsers();
        }
      } catch (e) {}
    };
    checkAdmin();
<<<<<<< HEAD
  }, []);

  // Busca Templates da Comunidade quando a aba é ativada
  useEffect(() => {
    if (activeTab === 'import') {
        fetchCommunityTemplates();
    }
  }, [activeTab]);

=======
    
    // Carregar configurações atuais
    setSysUrl(localStorage.getItem('monitorpro_supabase_url') || '');
    setSysKey(localStorage.getItem('monitorpro_supabase_key') || '');
    setSysAiKey(localStorage.getItem('monitorpro_ai_key') || '');
    setSysGroqKey(localStorage.getItem('monitorpro_groq_key') || ''); // NOVO
  }, []);

>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  const fetchCommunityTemplates = async () => {
    setLoadingTemplates(true);
    try {
        const { data, error } = await supabase.from('editais_materias').select('*').limit(2000);
<<<<<<< HEAD
        
=======
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
        if (!error && data && data.length > 0) {
            const grouped: Record<string, any[]> = {};
            data.forEach((row: any) => {
                const key = row.concurso;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(row);
            });
<<<<<<< HEAD

            const list = Object.keys(grouped).map((concursoName, idx) => {
                const rows = grouped[concursoName];
                const mainCargo = rows[0].cargo || 'Geral';
                const totalMaterias = rows.length;
                const totalTopicos = rows.reduce((acc, r) => acc + (r.topicos?.length || 0), 0);

                return {
                    id: `tmpl-${idx}`,
                    title: concursoName,
                    cargo: mainCargo,
                    stats: `${totalMaterias} matérias / ${totalTopicos} tópicos`,
                    materias: rows // Guarda os dados brutos para clonagem
                };
            }).sort((a, b) => a.title.localeCompare(b.title));

            setCommunityTemplates(list);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingTemplates(false);
    }
=======
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
    } catch (e) { console.error(e); } finally { setLoadingTemplates(false); }
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  };

  const handleImportTemplate = async (template: any) => {
      setImportingId(template.id);
      try {
<<<<<<< HEAD
          // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'getUser' property.
          const { data: { user } } = await (supabase.auth as any).getUser();
          if (!user) throw new Error("Usuário não logado");

          // Prepara payload para o usuário atual
          const payload = template.materias.map((m: any) => ({
              user_id: user.id,
              concurso: m.concurso, // Mantém o nome original
              cargo: m.cargo,
              materia: m.materia,
              topicos: m.topicos,
              is_principal: true, // Define como principal ao importar
              data_prova: m.data_prova
          }));

          // UPSERT para evitar duplicidade
          const { error } = await supabase.from('editais_materias').upsert(payload, {
              onConflict: 'user_id,concurso,materia',
              ignoreDuplicates: false 
          });

          if (error) throw error;

          setMissaoAtiva(template.title);
          await onUpdated();
          alert(`Edital "${template.title}" importado com sucesso!`);
          setActiveTab('mission'); // Volta para a aba de missões

      } catch (e: any) {
          alert("Erro ao importar: " + e.message);
      } finally {
          setImportingId(null);
      }
=======
          const { data: { user } } = await (supabase.auth as any).getUser();
          if (!user) throw new Error("Usuário não logado");
          const payload = template.materias.map((m: any) => ({
              user_id: user.id, concurso: m.concurso, cargo: m.cargo, materia: m.m.materia,
              topicos: m.topicos, is_principal: true, data_prova: m.data_prova, peso: m.peso || 1
          }));
          const { error } = await supabase.from('editais_materias').upsert(payload, { onConflict: 'user_id,concurso,materia', ignoreDuplicates: false });
          if (error) throw error;
          setMissaoAtiva(template.title); await onUpdated(); alert(`Edital "${template.title}" importado com sucesso!`); setActiveTab('mission');
      } catch (e: any) {
          console.error(e);
          if (e.message?.includes('constraint') || e.message?.includes('ON CONFLICT')) { setPermissionError(true); alert("ERRO DE BANCO DE DADOS: Faltam regras de unicidade. O modal de correção abrirá automaticamente."); }
          else { alert("Erro ao importar: " + e.message); }
      } finally { setImportingId(null); }
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (data) setUsersList(data);
    } catch (e) {} finally { setLoadingUsers(false); }
  };

  const runDiagnostics = async () => {
    setLoadingDiag(true);
    const logs: string[] = [];
    const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
<<<<<<< HEAD

    try {
        log("Iniciando diagnóstico...");
        
        // 1. Auth Check
        // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'getSession' property.
=======
    try {
        log("Iniciando diagnóstico...");
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
        const { data: { session }, error: authError } = await (supabase.auth as any).getSession();
        if (authError) log(`❌ Erro Auth: ${authError.message}`);
        else if (!session) log("❌ Sem sessão ativa.");
        else log(`✅ Autenticado como: ${session.user.email} (ID: ${session.user.id.slice(0,5)}...)`);
<<<<<<< HEAD

        if (session) {
            // 2. Profile Check
            const { data: profile, error: profError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (profError) {
                log(`⚠️ Erro Perfil: ${profError.message} (Código: ${profError.code})`);
                if (profError.code === '42501') log("🚨 ALERTA: Permissão negada (RLS). Execute o SQL de configuração.");
                if (profError.code === 'PGRST116') log("⚠️ Perfil não encontrado na tabela.");
            } else {
                log(`✅ Perfil carregado. Aprovado: ${profile.approved}, Admin: ${profile.is_admin}`);
            }

            // 3. Data Check (Editais)
            const { count, error: countError } = await supabase.from('editais_materias').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
            if (countError) log(`❌ Erro Contagem Editais: ${countError.message}`);
            else log(`✅ Editais encontrados: ${count ?? 0}`);

            // 4. Data Check (Registros)
            const { count: recCount, error: recError } = await supabase.from('registros_estudos').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
            if (recError) log(`❌ Erro Contagem Registros: ${recError.message}`);
            else log(`✅ Registros encontrados: ${recCount ?? 0}`);
        }

        log("Diagnóstico concluído.");
    } catch (e: any) {
        log(`❌ Erro Fatal: ${e.message}`);
    } finally {
        setLoadingDiag(false);
    }
=======
        if (session) {
            const { data: profile, error: profError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (profError) { log(`⚠️ Erro Perfil: ${profError.message}`); if (profError.code === '42501') log("🚨 ALERTA: Permissão negada (RLS)."); }
            else { log(`✅ Perfil carregado. Aprovado: ${profile.approved}`); }
            const { count, error: countError } = await supabase.from('editais_materias').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
            if (countError) log(`❌ Erro Contagem Editais: ${countError.message}`); else log(`✅ Editais encontrados: ${count ?? 0}`);
        }
        log("Diagnóstico concluído.");
    } catch (e: any) { log(`❌ Erro Fatal: ${e.message}`); } finally { setLoadingDiag(false); }
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  };

  const toggleUserApproval = async (userId: string, currentStatus: boolean | undefined) => {
    const newStatus = !currentStatus;
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, approved: newStatus } : u));
    setApprovalMsg(newStatus ? 'Usuário APROVADO com sucesso!' : 'Acesso do usuário BLOQUEADO.');
    setTimeout(() => setApprovalMsg(null), 3000);
<<<<<<< HEAD

    const { error } = await supabase.from('profiles').update({ approved: newStatus }).eq('id', userId);
    if (error) {
        console.error("Erro no update de perfil:", error);
        // Fix: Use optional chaining when accessing error.message
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('row-level security')) {
             setPermissionError(true);
        } else {
             alert('Erro ao atualizar: ' + error.message);
        }
=======
    const { error } = await supabase.from('profiles').update({ approved: newStatus }).eq('id', userId);
    if (error) {
        console.error("Erro no update de perfil:", error);
        if (error.code === '42501' || error.message?.includes('permission')) setPermissionError(true); else alert('Erro ao atualizar: ' + error.message);
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, approved: !newStatus } : u));
    }
  };

  const sqlScript = useMemo(() => {
<<<<<<< HEAD
     return `-- 1. CORREÇÃO DA TRAVA (CONSTRAINT)
-- Remove a trava global que impede nomes repetidos entre usuários diferentes
alter table editais_materias drop constraint if exists editais_materias_concurso_materia_key;

-- Cria a trava correta: Nome único APENAS dentro da conta do mesmo usuário
alter table editais_materias drop constraint if exists editais_materias_user_id_concurso_materia_key;
alter table editais_materias add constraint editais_materias_user_id_concurso_materia_key unique (user_id, concurso, materia);

-- 2. REGRAS DE ACESSO (RLS)
alter table editais_materias enable row level security;

-- Limpa regras antigas
drop policy if exists "Permitir Leitura Publica" on editais_materias;
drop policy if exists "Permitir Criacao Propria" on editais_materias;
drop policy if exists "Permitir Edicao Propria" on editais_materias;
drop policy if exists "Permitir Exclusao Propria" on editais_materias;

-- Cria novas regras
create policy "Permitir Leitura Publica" on editais_materias for select using (true);
create policy "Permitir Criacao Propria" on editais_materias for insert with check (auth.uid() = user_id);
create policy "Permitir Edicao Propria" on editais_materias for update using (auth.uid() = user_id);
create policy "Permitir Exclusao Propria" on editais_materias for delete using (auth.uid() = user_id);

-- 3. PERFIL (Opcional, apenas para garantir)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  approved boolean default false,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table profiles enable row level security;
create policy "Public profiles" on profiles for select using (true);
create policy "Users update own" on profiles for update using (auth.uid() = id);
create policy "Insert profile" on profiles for insert with check (auth.uid() = id);
`;
  }, [currentUserEmail]);

  const copyToClipboard = () => {
     navigator.clipboard.writeText(sqlScript);
     alert("Script copiado! Vá no Supabase > SQL Editor, cole e clique em RUN.");
  };
=======
     return `-- SCRIPT DE CORREÇÃO DEFINITIVA + COLUNA PESO
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
DROP POLICY IF EXISTS "Permitir Leitura Publica" ON editais_materias;
DROP POLICY IF EXISTS "Permitir Criacao Propria" ON editais_materias;
DROP POLICY IF EXISTS "Permitir Edicao Propria" ON editais_materias;
DROP POLICY IF EXISTS "Permitir Exclusao Propria" ON editais_materias;
CREATE POLICY "Permitir Leitura Publica" ON editais_materias FOR SELECT USING (true);
CREATE POLICY "Permitir Criacao Propria" ON editais_materias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permitir Edicao Propria" ON editais_materias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permitir Exclusao Propria" ON editais_materias FOR DELETE USING (auth.uid() = user_id);
NOTIFY pgrst, 'reload schema';
CREATE TABLE IF NOT EXISTS public.profiles (id uuid references auth.users on delete cascade not null primary key, email text, approved boolean default false, is_admin boolean default false, created_at timestamp with time zone default timezone('utc'::text, now()));
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles" ON profiles; DROP POLICY IF EXISTS "Users update own" ON profiles; DROP POLICY IF EXISTS "Insert profile" ON profiles;
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insert profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
`;
  }, [currentUserEmail]);

  const copyToClipboard = () => { navigator.clipboard.writeText(sqlScript); alert("Script copiado! Vá no Supabase > SQL Editor, cole e clique em RUN."); };
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608

  const groupedMissions = useMemo(() => {
    const groups: Record<string, { cargo: string, materiasCount: number, isPrincipal: boolean, dataProva?: string }> = {};
    if (!editais || !Array.isArray(editais)) return [];
<<<<<<< HEAD
    
    editais.forEach(e => {
      if (!groups[e.concurso]) {
        groups[e.concurso] = { 
          cargo: e.cargo, 
          materiasCount: 0, 
          isPrincipal: e.is_principal,
          dataProva: e.data_prova
        };
      }
=======
    editais.forEach(e => {
      if (!groups[e.concurso]) { groups[e.concurso] = { cargo: e.cargo, materiasCount: 0, isPrincipal: e.is_principal, dataProva: e.data_prova }; }
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
      groups[e.concurso].materiasCount++;
      if (e.is_principal) groups[e.concurso].isPrincipal = true;
    });
    return Object.entries(groups).map(([concurso, data]) => ({ concurso, ...data }));
  }, [editais]);

<<<<<<< HEAD
  const handleManualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onUpdated();
    } catch (e) {
      console.error("Refresh Error:", e);
    } finally {
      setTimeout(() => setRefreshing(false), 800);
    }
  };

  const handleOpenCreate = () => {
    setEditingOldName(null);
    setFormConcurso('');
    setFormCargo('');
    setFormDataProva('');
    setFormSubjects([]);
    setNewSubjectName('');
    setNewSubjectTopics('');
    setEditingSubjectIndex(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (concurso: string) => {
    const missionRows = editais.filter(e => e.concurso === concurso);
    if (missionRows.length === 0) return;
    
    const firstRow = missionRows[0];
    setEditingOldName(concurso);
    setFormConcurso(concurso);
    setFormCargo(firstRow.cargo);
    setFormDataProva(firstRow.data_prova || '');
    setFormSubjects(missionRows.map(row => ({ 
        id: row.id, 
        materia: row.materia, 
        topicos: row.topicos || [] 
    })));
    setEditingSubjectIndex(null);
    setIsModalOpen(true);
  };

  const processTopicsText = (text: string): string[] => {
    return text.split(/[\n;]+/).map(t => t.trim()).filter(t => t.length > 0 && t !== '.');
  };
  
  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    let finalName = newSubjectName.trim();
    let topicsArray = processTopicsText(newSubjectTopics);
    if (topicsArray.length === 0) topicsArray = ['Geral'];
    
    if (editingSubjectIndex !== null) {
      setFormSubjects(prev => prev.map((sub, idx) => 
        idx === editingSubjectIndex 
          ? { ...sub, materia: finalName, topicos: topicsArray }
          : sub
      ));
      setEditingSubjectIndex(null);
    } else {
      setFormSubjects(prev => [...prev, { materia: finalName, topicos: topicsArray }]);
    }
    setNewSubjectName('');
    setNewSubjectTopics('');
  };

  const handleEditSubject = (index: number) => {
    const sub = formSubjects[index];
    setNewSubjectName(sub.materia);
    setNewSubjectTopics(sub.topicos.join('\n'));
    setEditingSubjectIndex(index);
  };

  const handleCancelSubjectEdit = () => {
    setNewSubjectName('');
    setNewSubjectTopics('');
    setEditingSubjectIndex(null);
  };

  const handleRemoveSubject = (index: number) => {
    if (editingSubjectIndex === index) {
      handleCancelSubjectEdit();
    }
    setFormSubjects(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveMission = async () => {
    if (!formConcurso.trim() || !formCargo.trim()) {
      alert("Preencha o nome do Concurso e o Cargo.");
      return;
    }
    if (formSubjects.length === 0) {
      alert("Adicione pelo menos uma matéria antes de salvar.");
      return;
    }

    setLoadingMission(true);
    try {
      // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'getUser' property.
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) throw new Error("Sessão expirada.");

      const isPrincipal = editais.length === 0 || editais.some(e => e.concurso === editingOldName && e.is_principal);
      const dateToSave = formDataProva && formDataProva.trim() !== '' ? formDataProva : null;

      // 1. Prepara todos os payloads
      const payloads = formSubjects.map(sub => {
          const base = {
             user_id: user.id,
             concurso: formConcurso,
             cargo: formCargo,
             materia: sub.materia,
             topicos: sub.topicos,
             data_prova: dateToSave,
             is_principal: isPrincipal
          };
          
          // Se tiver ID, adiciona para o UPSERT saber que é update
          if (sub.id) return { ...base, id: sub.id };
          return base;
      });

      // 2. Identifica itens removidos (Estavam no banco mas não estão no form)
      if (editingOldName) {
          const originalIds = editais
             .filter(e => e.concurso === editingOldName)
             .map(e => e.id);
          
          const currentIds = formSubjects
             .map(s => s.id)
             .filter(Boolean) as string[];
          
          const idsToDelete = originalIds.filter(id => !currentIds.includes(id));
          
          if (idsToDelete.length > 0) {
             await supabase.from('editais_materias').delete().in('id', idsToDelete);
          }
      }

      // 3. Executa UPSERT em tudo (Cria novos ou Atualiza existentes)
      // Importante: 'onConflict' deve corresponder à constraint UNIQUE do banco
      const { error } = await supabase.from('editais_materias').upsert(payloads, {
          onConflict: 'user_id,concurso,materia', 
          ignoreDuplicates: false
      });

      if (error) throw error;

      if (editingOldName === missaoAtiva && formConcurso !== missaoAtiva) {
        setMissaoAtiva(formConcurso);
      } else if (!missaoAtiva) {
        setMissaoAtiva(formConcurso);
      }

      await onUpdated(); 
      setIsModalOpen(false);

    } catch (err: any) {
      console.error(err);
      if (err.message.includes('duplicate key') || err.message.includes('constraint')) {
          alert("ERRO DE DUPLICIDADE: Você precisa rodar o 'Script de Correção' no botão 'Permissões (SQL)' para destravar o banco de dados.");
      } else {
          alert("Erro ao salvar: " + err.message);
      }
    } finally {
      setLoadingMission(false);
    }
  };

  const handleDeleteMission = async (concurso: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar o edital "${concurso}"?\nIsso removerá todas as matérias configuradas para este concurso.`)) {
        return;
    }

    // Fix: Cast supabase.auth to any to resolve TypeScript error regarding missing 'getUser' property.
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) return;

    try {
      setRefreshing(true); 
      const { data: dbItems, error: fetchError } = await supabase.from('editais_materias').select('id').eq('user_id', user.id).eq('concurso', concurso);
      if (fetchError) {
        // Safely extract error message, accounting for potential non-object errors
        const errorMessage = fetchError?.message || String(fetchError);
        throw new Error("Erro ao buscar dados: " + errorMessage);
      }

      if (!dbItems || dbItems.length === 0) {
          if (missaoAtiva === concurso) setMissaoAtiva(''); 
          await onUpdated();
          return;
      }

      const idsToDelete = dbItems.map(i => i.id);
      const { error: deleteError } = await supabase.from('editais_materias').delete().in('id', idsToDelete);
      
      if (deleteError) {
          // Safely extract error message and code, accounting for potential non-object errors
          const deleteErrorMessage = deleteError?.message || String(deleteError);
          const deleteErrorCode = deleteError?.code || null;

          if (deleteErrorCode === '42501' || deleteErrorMessage?.includes('row-level security')) {
              throw new Error("PERMISSÃO NEGADA: Execute o script SQL de configuração (botão na tela) para corrigir.");
          }
          // Always throw a proper Error object with a safely extracted message
          throw new Error(deleteErrorMessage);
      }
      
      if (missaoAtiva === concurso) setMissaoAtiva(''); 
      await onUpdated();
      
    } catch (e: any) {
      alert("Falha na exclusão: " + e.message);
    } finally {
      setRefreshing(false);
    }
=======
  const handleManualRefresh = async () => { if (refreshing) return; setRefreshing(true); try { await onUpdated(); } catch (e) { console.error(e); } finally { setTimeout(() => setRefreshing(false), 800); } };

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
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) throw new Error("Sessão expirada.");
      const isPrincipal = editais.length === 0 || editais.some(e => e.concurso === editingOldName && e.is_principal);
      const dateToSave = formDataProva && formDataProva.trim() !== '' ? formDataProva : null;
      const idsToDelete: string[] = [];
      if (editingOldName) { const originalIds = editais.filter(e => e.concurso === editingOldName).map(e => e.id); const currentIds = formSubjects.map(s => s.id).filter(Boolean) as string[]; originalIds.forEach(id => { if (!currentIds.includes(id)) idsToDelete.push(id); }); }
      const toUpdate: any[] = []; const toInsert: any[] = []; const seenMaterias = new Set<string>();
      for (const sub of formSubjects) { const matName = sub.materia.trim(); const key = matName.toLowerCase(); if (seenMaterias.has(key)) continue; seenMaterias.add(key); const payload = { user_id: user.id, concurso: formConcurso.trim(), cargo: formCargo.trim(), materia: matName, topicos: sub.topicos, data_prova: dateToSave, is_principal: isPrincipal, peso: sub.peso || 1 }; if (sub.id) { toUpdate.push({ ...payload, id: sub.id }); } else { toInsert.push(payload); } }
      if (idsToDelete.length > 0) { const { error } = await supabase.from('editais_materias').delete().in('id', idsToDelete); if (error) throw error; }
      if (toUpdate.length > 0) { const { error } = await supabase.from('editais_materias').upsert(toUpdate); if (error) throw error; }
      if (toInsert.length > 0) { const { error } = await supabase.from('editais_materias').insert(toInsert); if (error) throw error; }
      if (editingOldName === missaoAtiva && formConcurso !== missaoAtiva) { setMissaoAtiva(formConcurso); } else if (!missaoAtiva) { setMissaoAtiva(formConcurso); }
      await onUpdated(); setIsModalOpen(false);
    } catch (err: any) { console.error(err); if (err.message.includes('duplicate key') || err.message.includes('ON CONFLICT')) { setPermissionError(true); alert("ERRO DE DUPLICIDADE: Matéria duplicada detectada."); } else if (err.message.includes('schema cache')) { setPermissionError(true); alert("ATUALIZAÇÃO NECESSÁRIA: Execute o script SQL."); } else { alert("Erro ao salvar: " + err.message); } } finally { setLoadingMission(false); }
  };

  const handleDeleteMission = async (concurso: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar o edital "${concurso}"?`)) { return; }
    const { data: { user } } = await (supabase.auth as any).getUser(); if (!user) return;
    try { setRefreshing(true); const { data: dbItems, error: fetchError } = await supabase.from('editais_materias').select('id').eq('user_id', user.id).eq('concurso', concurso); if (fetchError) throw new Error(fetchError.message); if (!dbItems || dbItems.length === 0) { if (missaoAtiva === concurso) setMissaoAtiva(''); await onUpdated(); return; } const idsToDelete = dbItems.map(i => i.id); const { error: deleteError } = await supabase.from('editais_materias').delete().in('id', idsToDelete); if (deleteError) throw new Error(deleteError.message); if (missaoAtiva === concurso) setMissaoAtiva(''); await onUpdated(); } catch (e: any) { alert("Falha na exclusão: " + e.message); } finally { setRefreshing(false); }
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  };

  const filteredUsers = usersList.filter(u => u.email?.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredTemplates = communityTemplates.filter(t => t.title.toLowerCase().includes(importSearch.toLowerCase()));

<<<<<<< HEAD
=======
  // HANDLE PARA SALVAR CONFIGURAÇÕES DO SISTEMA
  const handleSaveSystemConfig = async () => {
      setSysLoading(true);
      try {
          saveAppConfig(sysUrl, sysKey, sysAiKey, sysGroqKey);
      } finally {
          setSysLoading(false);
      }
  };

>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* TABS HEADER */}
      <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto">
         <button onClick={() => setActiveTab('mission')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'mission' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}>
            🎯 Missões & Editais
         </button>
         <button onClick={() => setActiveTab('import')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'import' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}>
            <DownloadCloud size={14} /> Comunidade / Importar
         </button>
<<<<<<< HEAD
=======
         <button onClick={() => setActiveTab('system')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'system' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white'}`}>
            <Settings size={14} /> Sistema & API
         </button>
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
         <button onClick={() => setActiveTab('diagnostics')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'diagnostics' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white'}`}>
            <Activity size={14} /> Diagnóstico
         </button>
         {isAdmin && (
            <button onClick={() => setActiveTab('admin')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'admin' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white'}`}>
               <Shield size={14} /> Admin
            </button>
         )}
      </div>

<<<<<<< HEAD
      {/* CONTEÚDO TAB: MISSÕES (PADRÃO) */}
=======
      {/* CONTEÚDO TAB: SISTEMA (CONFIGURAÇÃO) */}
      {activeTab === 'system' && (
         <div className="glass rounded-2xl p-6 shadow-xl animate-in slide-in-from-right-2 max-w-2xl mx-auto space-y-8">
             <div>
                 <h3 className="text-2xl font-bold flex items-center gap-3 mb-2"><Settings className="text-orange-400" /> Configuração do Sistema</h3>
                 <p className="text-slate-400 text-sm">Gerencie suas chaves de API e conexões. Essas informações ficam salvas apenas no seu navegador.</p>
             </div>

             <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Link size={12} /> Supabase URL</label>
                    <input type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-orange-500/50 outline-none" value={sysUrl} onChange={e => setSysUrl(e.target.value)} placeholder="https://..." />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Key size={12} /> Supabase Anon Key</label>
                    <input type="password" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-orange-500/50 outline-none" value={sysKey} onChange={e => setSysKey(e.target.value)} />
                 </div>
                 
                 <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Sparkles size={12} className="text-yellow-400" /> Google Gemini API Key
                        </label>
                        <input 
                            type="password" 
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-yellow-500/50 outline-none" 
                            value={sysAiKey} 
                            onChange={e => setSysAiKey(e.target.value)} 
                            placeholder="AIza..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Zap size={12} className="text-orange-400" /> Groq API Key
                        </label>
                        <input 
                            type="password" 
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-orange-500/50 outline-none" 
                            value={sysGroqKey} 
                            onChange={e => setSysGroqKey(e.target.value)} 
                            placeholder="gsk_..."
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 px-1">Chaves de IA são opcionais. Se preenchidas, ativam explicações automáticas nos Flashcards.</p>
                 </div>
             </div>

             <button 
                onClick={handleSaveSystemConfig}
                disabled={sysLoading}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
             >
                {sysLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                Salvar e Recarregar
             </button>
         </div>
      )}

      {/* OUTRAS TABS (Missão, Import, Admin, Diagnostics) - Mantidas iguais, apenas renderizando condicionalmente */}
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
      {activeTab === 'mission' && (
        <div className="glass rounded-2xl p-6 shadow-xl animate-in slide-in-from-right-2">
            <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black tracking-tight">Suas Missões</h3>
<<<<<<< HEAD
                <button 
                    onClick={handleManualRefresh} 
                    disabled={refreshing}
                    className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-50"
                    title="Sincronizar Missões"
                >
                    <RefreshCw size={18} className={refreshing ? "animate-spin text-cyan-400" : ""} />
                </button>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowSqlModal(true)} 
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold rounded-xl border border-yellow-500/20 flex items-center gap-2 transition-all"
                >
                    <Database size={14} /> Permissões (SQL)
                </button>
                <button onClick={handleOpenCreate} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all">
                    <PlusCircle size={16} /> Criar Edital
                </button>
            </div>
            </div>

            <div className="space-y-4">
            {refreshing && groupedMissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-cyan-400" size={40} />
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Buscando dados no Supabase...</p>
                </div>
            ) : groupedMissions.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-3xl">
                    <div className="text-5xl mb-4">📭</div>
                    <h4 className="text-white font-bold mb-1">Nenhuma missão encontrada</h4>
                    <p className="text-slate-500 text-sm mb-6">Crie seu primeiro edital para começar a monitorar.</p>
                    <button onClick={handleOpenCreate} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 mx-auto">
                        <PlusCircle size={18} /> Criar Agora
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                {groupedMissions.map(m => {
                    const isActive = m.concurso === missaoAtiva;
                    let provaFormatada = 'Data não definida';
                    if (m.dataProva) {
                        const [ano, mes, dia] = m.dataProva.split('-');
                        provaFormatada = `${dia}/${mes}/${ano}`;
                    }
                    
                    return (
                    <div key={m.concurso} className={`p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isActive ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}>
                        <div className="flex items-center gap-5">
                            <div className={`w-3 h-3 rounded-full ${m.isPrincipal ? 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.4)]' : 'bg-slate-700'}`} />
                            <div>
                            <h4 className="font-black text-xl text-white tracking-tight">{m.concurso}</h4>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{m.cargo}</p>
                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                    <Calendar size={10} /> {provaFormatada}
                                </p>
                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                    {m.materiasCount} matérias
                                </p>
                            </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setMissaoAtiva(m.concurso)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all ${isActive ? 'bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-slate-800 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'}`}>
                            {isActive ? 'Missão Ativa' : 'Ativar Missão'}
                            </button>
                            <div className="w-px h-8 bg-white/5 mx-2" />
                            <button onClick={() => handleOpenEdit(m.concurso)} className="p-2.5 text-slate-500 hover:text-cyan-400 bg-slate-800/50 rounded-xl hover:bg-cyan-400/10 transition-all" title="Editar Edital"><Edit size={16} /></button>
                            <button onClick={() => handleDeleteMission(m.concurso)} className="p-2.5 text-slate-500 hover:text-red-400 bg-slate-800/50 rounded-xl hover:bg-red-400/10 transition-all" title="Apagar Edital"><Trash2 size={16} /></button>
                        </div>
                    </div>
                    )
                })}
                </div>
            )}
            </div>
        </div>
      )}

      {/* CONTEÚDO TAB: IMPORTAR / COMUNIDADE */}
      {activeTab === 'import' && (
         <div className="glass rounded-2xl p-6 shadow-xl animate-in slide-in-from-right-2 space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                    <h3 className="text-xl font-bold flex items-center gap-2"><DownloadCloud className="text-blue-400"/> Banco Comunitário de Editais</h3>
                    <p className="text-slate-400 text-sm mt-1">Navegue e clone editais criados por outros usuários. Compartilhamento livre.</p>
                 </div>
                 <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                        type="text" 
                        placeholder="Buscar concurso..." 
                        className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs"
                        value={importSearch} 
                        onChange={e => setImportSearch(e.target.value)} 
                    />
                 </div>
             </div>

             {loadingTemplates ? (
                 <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-blue-400" size={40} />
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Carregando banco de dados...</p>
                 </div>
             ) : filteredTemplates.length === 0 ? (
                 <div className="text-center py-16 text-slate-500 italic">
                    Nenhum edital encontrado. Tente outro termo de busca.
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map(tmpl => (
                        <div key={tmpl.id} className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 hover:border-blue-500/50 transition-all group hover:bg-slate-900/50 relative">
                            <div className="absolute top-4 right-4 text-slate-600 group-hover:text-blue-400">
                                <Users size={18} />
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 pr-6 truncate">{tmpl.title}</h4>
                            <div className="space-y-1 mb-6">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{tmpl.cargo}</p>
                                <p className="text-xs text-slate-500">{tmpl.stats}</p>
                            </div>
                            <button 
                                onClick={() => handleImportTemplate(tmpl)}
                                disabled={importingId === tmpl.id}
                                className="w-full bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                {importingId === tmpl.id ? <Loader2 className="animate-spin" size={14} /> : <DownloadCloud size={14} />}
                                {importingId === tmpl.id ? 'Importando...' : 'Clonar Edital'}
                            </button>
                        </div>
                    ))}
                 </div>
             )}
=======
                <button onClick={handleManualRefresh} disabled={refreshing} className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-50" title="Sincronizar Missões"><RefreshCw size={18} className={refreshing ? "animate-spin text-cyan-400" : ""} /></button>
            </div>
            <div className="flex gap-2"><button onClick={() => setShowSqlModal(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold rounded-xl border border-yellow-500/20 flex items-center gap-2 transition-all"><Database size={14} /> Permissões (SQL)</button><button onClick={handleOpenCreate} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"><PlusCircle size={16} /> Criar Edital</button></div>
            </div>
            <div className="space-y-4">
            {refreshing && groupedMissions.length === 0 ? (<div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-cyan-400" size={40} /><p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Buscando dados no Supabase...</p></div>) : groupedMissions.length === 0 ? (<div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-3xl"><div className="text-5xl mb-4">📭</div><h4 className="text-white font-bold mb-1">Nenhuma missão encontrada</h4><p className="text-slate-500 text-sm mb-6">Crie seu primeiro edital para começar a monitorar.</p><button onClick={handleOpenCreate} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 mx-auto"><PlusCircle size={18} /> Criar Agora</button></div>) : (<div className="grid grid-cols-1 gap-4">{groupedMissions.map(m => { const isActive = m.concurso === missaoAtiva; let provaFormatada = 'Data não definida'; if (m.dataProva) { const [ano, mes, dia] = m.dataProva.split('-'); provaFormatada = `${dia}/${mes}/${ano}`; } return (<div key={m.concurso} className={`p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isActive ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}><div className="flex items-center gap-5"><div className={`w-3 h-3 rounded-full ${m.isPrincipal ? 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.4)]' : 'bg-slate-700'}`} /><div><h4 className="font-black text-xl text-white tracking-tight">{m.concurso}</h4><div className="flex items-center gap-3 mt-1"><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{m.cargo}</p><span className="w-1 h-1 bg-slate-600 rounded-full"></span><p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1"><Calendar size={10} /> {provaFormatada}</p><span className="w-1 h-1 bg-slate-600 rounded-full"></span><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{m.materiasCount} matérias</p></div></div></div><div className="flex items-center gap-2"><button onClick={() => setMissaoAtiva(m.concurso)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all ${isActive ? 'bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-slate-800 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'}`}>{isActive ? 'Missão Ativa' : 'Ativar Missão'}</button><div className="w-px h-8 bg-white/5 mx-2" /><button onClick={() => handleOpenEdit(m.concurso)} className="p-2.5 text-slate-500 hover:text-cyan-400 bg-slate-800/50 rounded-xl hover:bg-cyan-400/10 transition-all" title="Editar Edital"><Edit size={16} /></button><button onClick={() => handleDeleteMission(m.concurso)} className="p-2.5 text-slate-500 hover:text-red-400 bg-slate-800/50 rounded-xl hover:bg-red-400/10 transition-all" title="Apagar Edital"><Trash2 size={16} /></button></div></div>) })}</div>)}</div>
        </div>
      )}

      {/* CONTEÚDO TAB: IMPORTAR */}
      {activeTab === 'import' && (
         <div className="glass rounded-2xl p-6 shadow-xl animate-in slide-in-from-right-2 space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div><h3 className="text-xl font-bold flex items-center gap-2"><DownloadCloud className="text-blue-400"/> Banco Comunitário de Editais</h3><p className="text-slate-400 text-sm mt-1">Navegue e clone editais criados por outros usuários. Compartilhamento livre.</p></div>
                 <div className="relative w-full md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} /><input type="text" placeholder="Buscar concurso..." className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs" value={importSearch} onChange={e => setImportSearch(e.target.value)} /></div>
             </div>
             {loadingTemplates ? (<div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-blue-400" size={40} /><p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Carregando banco de dados...</p></div>) : filteredTemplates.length === 0 ? (<div className="text-center py-16 text-slate-500 italic">Nenhum edital encontrado. Tente outro termo de busca.</div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredTemplates.map(tmpl => (<div key={tmpl.id} className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 hover:border-blue-500/50 transition-all group hover:bg-slate-900/50 relative"><div className="absolute top-4 right-4 text-slate-600 group-hover:text-blue-400"><Users size={18} /></div><h4 className="text-lg font-bold text-white mb-2 pr-6 truncate">{tmpl.title}</h4><div className="space-y-1 mb-6"><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{tmpl.cargo}</p><p className="text-xs text-slate-500">{tmpl.stats}</p></div><button onClick={() => handleImportTemplate(tmpl)} disabled={importingId === tmpl.id} className="w-full bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">{importingId === tmpl.id ? <Loader2 className="animate-spin" size={14} /> : <DownloadCloud size={14} />}{importingId === tmpl.id ? 'Importando...' : 'Clonar Edital'}</button></div>))}</div>)}
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
         </div>
      )}

      {/* CONTEÚDO TAB: DIAGNÓSTICO */}
      {activeTab === 'diagnostics' && (
         <div className="glass rounded-2xl p-6 shadow-xl animate-in slide-in-from-right-2 space-y-6">
             <div className="flex justify-between items-start">
<<<<<<< HEAD
                 <div>
                    <h3 className="text-xl font-bold flex items-center gap-2"><Activity className="text-purple-400"/> Central de Diagnóstico</h3>
                    <p className="text-slate-400 text-sm mt-1">Use esta ferramenta se você estiver tendo problemas para salvar ou visualizar dados.</p>
                 </div>
                 <button onClick={runDiagnostics} disabled={diagLoading} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20 flex items-center gap-2">
                    {diagLoading ? <Loader2 className="animate-spin" size={16} /> : "Executar Teste Completo"}
                 </button>
             </div>

             <div className="bg-black/50 rounded-xl border border-white/10 p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto custom-scrollbar relative">
                 {diagLog.length === 0 ? (
                     <div className="absolute inset-0 flex items-center justify-center text-slate-600 italic pointer-events-none">
                        Clique em "Executar Teste Completo" para ver os logs.
                     </div>
                 ) : (
                     diagLog.map((log, i) => <div key={i} className="mb-1 border-b border-white/5 pb-1 last:border-0">{log}</div>)
                 )}
             </div>

             <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-4 items-start">
                 <AlertTriangle className="text-yellow-500 shrink-0 mt-1" />
                 <div>
                     <h4 className="font-bold text-yellow-200 text-sm">Problemas com Permissões?</h4>
                     <p className="text-xs text-yellow-200/70 mt-1 mb-3">Se o log mostrar erros "42501" ou "Permission denied", você precisa rodar o script de correção no Supabase.</p>
                     <button onClick={() => setShowSqlModal(true)} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-yellow-500/20">
                        Ver Script de Correção
                     </button>
                 </div>
             </div>
=======
                 <div><h3 className="text-xl font-bold flex items-center gap-2"><Activity className="text-purple-400"/> Central de Diagnóstico</h3><p className="text-slate-400 text-sm mt-1">Use esta ferramenta se você estiver tendo problemas para salvar ou visualizar dados.</p></div>
                 <button onClick={runDiagnostics} disabled={diagLoading} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20 flex items-center gap-2">{diagLoading ? <Loader2 className="animate-spin" size={16} /> : "Executar Teste Completo"}</button>
             </div>
             <div className="bg-black/50 rounded-xl border border-white/10 p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto custom-scrollbar relative">{diagLog.length === 0 ? (<div className="absolute inset-0 flex items-center justify-center text-slate-600 italic pointer-events-none">Clique em "Executar Teste Completo" para ver os logs.</div>) : (diagLog.map((log, i) => <div key={i} className="mb-1 border-b border-white/5 pb-1 last:border-0">{log}</div>))}</div>
             <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-4 items-start"><AlertTriangle className="text-yellow-500 shrink-0 mt-1" /><div><h4 className="font-bold text-yellow-200 text-sm">Problemas com Permissões?</h4><p className="text-xs text-yellow-200/70 mt-1 mb-3">Se o log mostrar erros "42501" ou "Permission denied", você precisa rodar o script de correção no Supabase.</p><button onClick={() => setShowSqlModal(true)} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-yellow-500/20">Ver Script de Correção</button></div></div>
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
         </div>
      )}

      {/* CONTEÚDO TAB: ADMIN */}
      {activeTab === 'admin' && isAdmin && (
        <div className="glass rounded-2xl p-6 border border-purple-500/30 relative overflow-hidden animate-in slide-in-from-right-2">
<<<<<<< HEAD
          {approvalMsg && (
             <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-xs font-bold text-center py-2 animate-in slide-in-from-top-4 z-50">
                {approvalMsg}
             </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-xl font-bold flex items-center gap-2"><Shield size={20} className="text-purple-400" /> Administração de Usuários</h3>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                    onClick={() => setShowSqlModal(true)} 
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-xl border border-cyan-500/20 flex items-center gap-2 transition-all"
                >
                    <Database size={14} /> Permissões (SQL)
                </button>
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input type="text" placeholder="Filtrar usuários..." className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {loadingUsers ? <Loader2 className="animate-spin mx-auto text-purple-400" /> : filteredUsers.map(u => (
              <div key={u.id} className="bg-slate-950/30 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-xs font-mono">{u.email} {u.email === currentUserEmail && '(Você)'}</span>
                <button onClick={() => toggleUserApproval(u.id, u.approved)} className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${u.approved ? 'bg-white/5 text-slate-500' : 'bg-green-600 text-white shadow-lg shadow-green-600/20'}`}>
                    {u.approved ? 'Bloquear' : <><CheckCircle2 size={12}/> Aprovar</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE SQL (GERAL) ou ERRO DE PERMISSÃO */}
=======
          {approvalMsg && (<div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-xs font-bold text-center py-2 animate-in slide-in-from-top-4 z-50">{approvalMsg}</div>)}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-xl font-bold flex items-center gap-2"><Shield size={20} className="text-purple-400" /> Administração de Usuários</h3>
            <div className="flex items-center gap-3 w-full md:w-auto"><button onClick={() => setShowSqlModal(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-xl border border-cyan-500/20 flex items-center gap-2 transition-all"><Database size={14} /> Permissões (SQL)</button><div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} /><input type="text" placeholder="Filtrar usuários..." className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs" value={userSearch} onChange={e => setUserSearch(e.target.value)} /></div></div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">{loadingUsers ? <Loader2 className="animate-spin mx-auto text-purple-400" /> : filteredUsers.map(u => (<div key={u.id} className="bg-slate-950/30 p-3 rounded-xl border border-white/5 flex items-center justify-between"><span className="text-xs font-mono">{u.email} {u.email === currentUserEmail && '(Você)'}</span><button onClick={() => toggleUserApproval(u.id, u.approved)} className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${u.approved ? 'bg-white/5 text-slate-500' : 'bg-green-600 text-white shadow-lg shadow-green-600/20'}`}>{u.approved ? 'Bloquear' : <><CheckCircle2 size={12}/> Aprovar</>}</button></div>))}</div>
        </div>
      )}

      {/* MODAIS (SQL & CRIAÇÃO) - Mantidos iguais */}
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
      {(permissionError || showSqlModal) && (
         <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
             <div className="bg-slate-950 border border-slate-700 w-full max-w-3xl rounded-2xl p-8 relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                 <button onClick={() => { setPermissionError(false); setShowSqlModal(false); }} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>
<<<<<<< HEAD
                 
                 <div className="flex items-center gap-3 mb-4 text-cyan-400">
                    {permissionError ? <AlertTriangle size={32} className="text-red-500"/> : <Database size={32} />}
                    <h3 className="text-xl font-bold">
                        {permissionError ? 'Bloqueio de Permissão Detectado' : 'Script de Correção do Banco'}
                    </h3>
                 </div>
                 
                 <p className="text-slate-300 text-sm mb-4">
                    Se você não consegue salvar seus editais, é porque o banco de dados tem uma "trava" (Constraint) antiga.
                    <br/><br/>
                    <strong className="text-white">COPIE O CÓDIGO ABAIXO E EXECUTE NO SUPABASE PARA CORRIGIR:</strong>
                 </p>

                 <div className="relative bg-slate-900 rounded-xl border border-white/10 flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1 text-slate-200 text-[11px] font-mono">
                       <pre className="whitespace-pre-wrap">{sqlScript}</pre>
                    </div>
                    <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end">
                       <button onClick={copyToClipboard} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2">
                           <Copy size={14} /> Copiar SQL
                       </button>
                    </div>
                 </div>
=======
                 <div className="flex items-center gap-3 mb-4 text-cyan-400">{permissionError ? <AlertTriangle size={32} className="text-red-500"/> : <Database size={32} />}<h3 className="text-xl font-bold">{permissionError ? 'Banco de Dados Desatualizado' : 'Script de Correção do Banco'}</h3></div>
                 <p className="text-slate-300 text-sm mb-4">Para que o sistema funcione corretamente, o banco precisa estar atualizado. O script abaixo cria a coluna de peso e corrige duplicatas.<br/><br/><strong className="text-white">COPIE O CÓDIGO ABAIXO E EXECUTE NO SUPABASE (SQL EDITOR):</strong></p>
                 <div className="relative bg-slate-900 rounded-xl border border-white/10 flex-1 overflow-hidden flex flex-col"><div className="p-4 overflow-y-auto custom-scrollbar flex-1 text-slate-200 text-[11px] font-mono"><pre className="whitespace-pre-wrap">{sqlScript}</pre></div><div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end"><button onClick={copyToClipboard} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"><Copy size={14} /> Copiar SQL</button></div></div>
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
             </div>
         </div>
      )}

<<<<<<< HEAD
      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
=======
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-4xl rounded-2xl p-8 relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/10">
            <button onClick={() => { setIsModalOpen(false); setLoadingMission(false); }} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={24} /></button>
<<<<<<< HEAD

            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <PlusCircle className="text-cyan-400" /> 
              {editingOldName ? `Editar Edital: ${editingOldName}` : 'Criar Novo Edital'}
            </h3>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveMission(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Terminal size={12}/> Concurso
                  </label>
                  <input type="text" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium" value={formConcurso} onChange={e => setFormConcurso(e.target.value)} placeholder="Ex: TJSP Escrevente" required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Briefcase size={12}/> Cargo
                  </label>
                  <input type="text" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium" value={formCargo} onChange={e => setFormCargo(e.target.value)} placeholder="Ex: Escrevente Técnico Judiciário" required />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Calendar size={12}/> Data da Prova (Opcional)
                </label>
                <input type="date" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium" value={formDataProva} onChange={e => setFormDataProva(e.target.value)} />
              </div>

              <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-lg font-bold flex items-center gap-2 text-white">
                  <BookOpen size={20}/> Matérias do Edital
                </h4>
                <div className="space-y-2">
                  {formSubjects.map((sub, index) => (
                    <div key={index} className="flex items-center gap-3 bg-slate-950/30 p-3 rounded-lg border border-white/5">
                      <span className="flex-1 text-sm font-medium text-slate-300">{sub.materia} <span className="text-slate-500 text-xs">({sub.topicos.length} tópicos)</span></span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleEditSubject(index)} className="p-2 text-slate-500 hover:text-cyan-400"><Edit size={16}/></button>
                        <button type="button" onClick={() => handleRemoveSubject(index)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nome da Matéria</label>
                    <input type="text" className="w-full bg-slate-950/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white font-medium" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Ex: Língua Portuguesa" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Tópicos (separar por ; ou quebra de linha)</label>
                    <textarea className="w-full bg-slate-950/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white font-medium h-24" value={newSubjectTopics} onChange={e => setNewSubjectTopics(e.target.value)} placeholder="Ex: Sintaxe; Crase; Pontuação; Interpretação de Texto"></textarea>
                  </div>
                  <button type="button" onClick={handleAddSubject} className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20">
                    {editingSubjectIndex !== null ? <><Save size={16}/> Salvar</> : <><PlusCircle size={16}/> Add</>}
                  </button>
                  {editingSubjectIndex !== null && (
                    <button type="button" onClick={handleCancelSubjectEdit} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl flex items-center gap-2">
                      <X size={16}/> Cancelar
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold py-4 rounded-xl transition-all border border-white/5">
                  CANCELAR
                </button>
                <button type="submit" disabled={loadingMission} className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                  {loadingMission ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Edital</>}
                </button>
              </div>
=======
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3"><PlusCircle className="text-cyan-400" /> {editingOldName ? `Editar Edital: ${editingOldName}` : 'Criar Novo Edital'}</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveMission(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Terminal size={12}/> Concurso</label><input type="text" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium" value={formConcurso} onChange={e => setFormConcurso(e.target.value)} placeholder="Ex: TJSP Escrevente" required /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Briefcase size={12}/> Cargo</label><input type="text" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium" value={formCargo} onChange={e => setFormCargo(e.target.value)} placeholder="Ex: Escrevente Técnico Judiciário" required /></div>
              </div>
              <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Calendar size={12}/> Data da Prova (Opcional)</label><input type="date" className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white font-medium" value={formDataProva} onChange={e => setFormDataProva(e.target.value)} /></div>
              <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-lg font-bold flex items-center gap-2 text-white"><BookOpen size={20}/> Matérias do Edital</h4>
                <div className="space-y-2">{formSubjects.map((sub, index) => (<div key={index} className="flex items-center gap-3 bg-slate-950/30 p-3 rounded-lg border border-white/5"><span className="flex-1 text-sm font-medium text-slate-300">{sub.materia} <span className="text-slate-500 text-xs ml-2">({sub.topicos.length} tópicos)</span><span className="text-xs font-bold bg-slate-800 text-yellow-400 px-2 py-0.5 rounded ml-2">Peso {sub.peso}</span></span><div className="flex gap-2"><button type="button" onClick={() => handleEditSubject(index)} className="p-2 text-slate-500 hover:text-cyan-400"><Edit size={16}/></button><button type="button" onClick={() => handleRemoveSubject(index)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16}/></button></div></div>))}</div>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4"><div className="flex-1 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nome da Matéria</label><input type="text" className="w-full bg-slate-950/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white font-medium" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Ex: Língua Portuguesa" /></div><div className="w-24 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Calculator size={10}/> Peso</label><input type="number" min="0.1" step="0.1" className="w-full bg-slate-950/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white font-medium text-center" value={newSubjectWeight} onChange={e => setNewSubjectWeight(Number(e.target.value))} /></div></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Tópicos (separar por ; ou quebra de linha)</label><textarea className="w-full bg-slate-950/30 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white font-medium h-24" value={newSubjectTopics} onChange={e => setNewSubjectTopics(e.target.value)} placeholder="Ex: Sintaxe; Crase; Pontuação; Interpretação de Texto"></textarea></div>
                  <div className="flex gap-2 justify-end">{editingSubjectIndex !== null && (<button type="button" onClick={handleCancelSubjectEdit} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl flex items-center gap-2"><X size={16}/> Cancelar</button>)}<button type="button" onClick={handleAddSubject} className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 px-6 font-bold">{editingSubjectIndex !== null ? <><Save size={16}/> Salvar Matéria</> : <><PlusCircle size={16}/> Adicionar Matéria</>}</button></div>
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t border-white/5"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold py-4 rounded-xl transition-all border border-white/5">CANCELAR</button><button type="submit" disabled={loadingMission} className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">{loadingMission ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Edital</>}</button></div>
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

<<<<<<< HEAD
export default Configurar;
=======
export default Configurar;
>>>>>>> a5cbf2e84d7d3f1a06c931c5a4a3cb9ad2767608
