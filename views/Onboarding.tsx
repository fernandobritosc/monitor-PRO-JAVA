
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { BookOpen, Shield, Scale, Briefcase, GraduationCap, ArrowRight, Loader2, Database, DownloadCloud, Users, Search } from 'lucide-react';

interface OnboardingProps {
  onSelectTemplate: (template: any[]) => Promise<void>;
  userEmail: string;
}

// TEMPLATES PADRÃO (FALLBACK)
const STATIC_TEMPLATES = [
  {
    id: 'tribunais',
    title: 'Tribunais (TJ/TRT)',
    icon: <Scale size={32} className="text-blue-400" />,
    description: 'Foco em TJ-SP, TRTs e Analistas. Base jurídica e processual.',
    color: 'from-blue-600 to-cyan-600',
    materias: [
      { materia: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática', 'Sintaxe'] },
      { materia: 'Raciocínio Lógico', topicos: ['Lógica Proposicional', 'Matemática Básica'] },
      { materia: 'Informática', topicos: ['Windows', 'Word/Excel', 'Segurança'] },
      { materia: 'Direito Constitucional', topicos: ['Art. 5º', 'Organização do Estado', 'Poder Judiciário'] },
      { materia: 'Direito Administrativo', topicos: ['Atos', 'Poderes', 'Improbidade', 'Licitações'] },
      { materia: 'Processo Civil', topicos: ['Prazos', 'Recursos', 'Audiências'] },
      { materia: 'Processo Penal', topicos: ['Inquérito', 'Ação Penal', 'Provas'] }
    ]
  },
  {
    id: 'policiais',
    title: 'Carreiras Policiais (PF/PRF)',
    icon: <Shield size={32} className="text-red-400" />,
    description: 'Para Agente, Escrivão e PRF. Ênfase em Penal e Contabilidade/TI.',
    color: 'from-red-600 to-orange-600',
    materias: [
      { materia: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática'] },
      { materia: 'Raciocínio Lógico-Mat', topicos: ['Lógica', 'Estatística'] },
      { materia: 'Informática Avançada', topicos: ['Redes', 'Banco de Dados', 'Python', 'Segurança'] },
      { materia: 'Direito Constitucional', topicos: ['Direitos Fundamentais', 'Segurança Pública'] },
      { materia: 'Direito Penal', topicos: ['Teoria do Crime', 'Crimes em Espécie'] },
      { materia: 'Processo Penal', topicos: ['Prisão', 'Inquérito'] },
      { materia: 'Legislação Especial', topicos: ['Drogas', 'Desarmamento', 'Trânsito (CTB)'] },
      { materia: 'Contabilidade', topicos: ['Balanço Patrimonial', 'Atos e Fatos'] }
    ]
  },
  {
    id: 'adm',
    title: 'Administrativo / CNU',
    icon: <Briefcase size={32} className="text-green-400" />,
    description: 'Para INSS, Assistente Administrativo e Bloco 8 do CNU.',
    color: 'from-green-600 to-emerald-600',
    materias: [
      { materia: 'Língua Portuguesa', topicos: ['Compreensão de Texto', 'Redação Oficial'] },
      { materia: 'Direito Constitucional', topicos: ['Direitos Sociais', 'Nacionalidade'] },
      { materia: 'Direito Administrativo', topicos: ['Ética no Serviço Público', 'Regime Jurídico Único'] },
      { materia: 'Realidade Brasileira', topicos: ['Cultura', 'Economia', 'Sociedade'] },
      { materia: 'Matemática', topicos: ['Porcentagem', 'Regra de Três', 'Conjuntos'] },
      { materia: 'Gestão Pública', topicos: ['PDCA', 'Gestão de Pessoas', 'Qualidade'] }
    ]
  },
  {
    id: 'base',
    title: 'Edital Base (Genérico)',
    icon: <GraduationCap size={32} className="text-slate-400" />,
    description: 'Matérias comuns a 90% dos concursos públicos.',
    color: 'from-slate-600 to-slate-500',
    materias: [
      { materia: 'Língua Portuguesa', topicos: ['Gramática', 'Texto'] },
      { materia: 'Raciocínio Lógico', topicos: ['Lógica Sentencial'] },
      { materia: 'Informática', topicos: ['Conceitos Básicos'] },
      { materia: 'Direito Constitucional', topicos: ['Art. 5º'] },
      { materia: 'Direito Administrativo', topicos: ['Princípios'] }
    ]
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onSelectTemplate, userEmail }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'padrao' | 'comunidade'>('padrao');
  
  const [staticTemplates] = useState<any[]>(STATIC_TEMPLATES);
  const [dynamicTemplates, setDynamicTemplates] = useState<any[]>([]);
  
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Busca templates do banco (Criados por outros usuários)
  useEffect(() => {
    const fetchDynamicTemplates = async () => {
       setLoadingTemplates(true);
       try {
          // Busca editais existentes no banco para clonagem
          const { data, error } = await supabase.from('editais_materias').select('*').limit(1000);
          
          if (!error && data && data.length > 0) {
             // Agrupa por concurso
             const grouped: Record<string, any[]> = {};
             data.forEach((row: any) => {
                // Normaliza chave para evitar duplicações por case sensitive
                const key = row.concurso;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(row);
             });

             const dynamicList = Object.keys(grouped).map((concursoName, idx) => {
                const rows = grouped[concursoName];
                const mainCargo = rows[0].cargo || 'Geral';
                const totalMaterias = rows.length;
                const totalTopicos = rows.reduce((acc, r) => acc + (r.topicos?.length || 0), 0);

                // Evita mostrar os próprios editais se já estiver logado (opcional, mas bom pra UX)
                // Aqui mostramos tudo para facilitar teste

                return {
                   id: `dynamic-${idx}`,
                   title: concursoName,
                   icon: <Users size={32} className="text-cyan-400" />,
                   description: `Cargo: ${mainCargo}. ${totalMaterias} matérias e ${totalTopicos} tópicos cadastrados.`,
                   color: 'from-slate-700 to-slate-800',
                   isDynamic: true,
                   materias: rows.map(r => ({ materia: r.materia, topicos: r.topicos || [] }))
                };
             }).sort((a, b) => b.title.localeCompare(a.title)); // Ordem alfabética inversa (mais recentes geralmente)

             setDynamicTemplates(dynamicList);
          }
       } catch (e) {
          console.error("Erro ao buscar templates dinâmicos:", e);
       } finally {
          setLoadingTemplates(false);
       }
    };

    if (activeTab === 'comunidade') {
        fetchDynamicTemplates();
    }
  }, [activeTab]);

  const handleSelect = async (template: any) => {
    setLoadingId(template.id);
    
    // Extrai nome limpo
    const concursoName = template.title;

    const payload = template.materias.map((m: any) => ({
        concurso: concursoName,
        cargo: 'Cargo Importado', 
        materia: m.materia,
        topicos: m.topicos,
        is_principal: true
    }));

    await onSelectTemplate(payload);
  };

  const displayedTemplates = activeTab === 'padrao' 
    ? staticTemplates 
    : dynamicTemplates.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0E1117] flex flex-col items-center justify-start p-6 relative overflow-y-auto">
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500 animate-gradient-x" />
       
       <div className="text-center max-w-2xl mb-8 mt-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/5">
             <GraduationCap size={32} className="text-cyan-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">
             Bem-vindo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">{userEmail.split('@')[0]}</span>!
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
             Vamos configurar sua primeira missão. Você pode escolher um modelo pronto ou importar um edital criado por um amigo (Compartilhamento).
          </p>
       </div>

       {/* Tabs */}
       <div className="flex p-1 bg-slate-900/80 rounded-xl mb-8 border border-white/10 shadow-lg">
          <button 
            onClick={() => setActiveTab('padrao')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'padrao' ? 'bg-white/10 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Modelos Padrão
          </button>
          <button 
            onClick={() => setActiveTab('comunidade')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'comunidade' ? 'bg-cyan-500/20 text-cyan-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <DownloadCloud size={14} /> Importar / Comunidade
          </button>
       </div>

       {/* Search (Only for Community) */}
       {activeTab === 'comunidade' && (
          <div className="w-full max-w-md mb-8 relative animate-in fade-in">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
             <input 
                type="text" 
                placeholder="Busque pelo nome do concurso do seu amigo..." 
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
       )}

       {loadingTemplates && activeTab === 'comunidade' && (
          <div className="flex flex-col items-center gap-3 text-slate-500 mb-8 animate-pulse">
             <Loader2 className="animate-spin text-cyan-400" size={24} /> 
             <span className="text-xs uppercase font-bold tracking-widest">Buscando editais compartilhados...</span>
          </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full pb-20">
          {displayedTemplates.length === 0 && !loadingTemplates ? (
             <div className="col-span-full text-center py-10 text-slate-500">
                <p>Nenhum edital encontrado. Tente buscar pelo nome exato do concurso.</p>
             </div>
          ) : (
            displayedTemplates.map((t) => (
                <button
                key={t.id}
                onClick={() => handleSelect(t)}
                disabled={loadingId !== null}
                className={`group relative glass p-6 rounded-3xl text-left transition-all duration-300 border border-white/5 hover:border-white/20 hover:-translate-y-2
                    ${loadingId === t.id ? 'ring-2 ring-cyan-500 scale-[1.02]' : 'hover:shadow-2xl hover:shadow-purple-500/10'}
                    ${loadingId !== null && loadingId !== t.id ? 'opacity-50 grayscale' : ''}
                `}
                >
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${t.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    
                    <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-slate-900/50 rounded-2xl border border-white/5 group-hover:scale-110 transition-transform duration-300">
                            {loadingId === t.id ? <Loader2 className="animate-spin text-white" size={32} /> : t.icon}
                        </div>
                        {t.isDynamic && (
                            <span className="text-[10px] bg-cyan-900/40 text-cyan-400 px-2 py-1 rounded border border-cyan-500/20 flex items-center gap-1 font-bold">
                                <Database size={10} /> Compartilhado
                            </span>
                        )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors truncate pr-2">
                        {t.title}
                    </h3>
                    <p className="text-sm text-slate-400 mb-6 min-h-[40px] line-clamp-2">
                        {t.description}
                    </p>

                    <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Disciplinas Inclusas</div>
                        <div className="flex flex-wrap gap-1.5">
                            {t.materias.slice(0, 3).map((m: any, i: number) => (
                                <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded border border-white/5 truncate max-w-[100px]">
                                {m.materia}
                                </span>
                            ))}
                            {t.materias.length > 3 && (
                                <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded border border-white/5">
                                +{t.materias.length - 3}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-sm font-bold text-slate-300 group-hover:text-white transition-colors">
                        {t.isDynamic ? 'Clonar Edital' : 'Selecionar Modelo'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                    </div>
                </button>
            ))
          )}
       </div>
    </div>
  );
};

export default Onboarding;
