
import React, { useState } from 'react';
import { BookOpen, Shield, Scale, Briefcase, GraduationCap, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

interface OnboardingProps {
  onSelectTemplate: (template: any[]) => Promise<void>;
  userEmail: string;
}

// --- BIBLIOTECA DE EDITAIS (TEMPLATES) ---
// Você pode adicionar ou editar os concursos aqui para que apareçam para todos.
const AVAILABLE_TEMPLATES = [
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
    id: 'oab',
    title: 'Exame de Ordem (OAB)',
    icon: <BookOpen size={32} className="text-purple-400" />,
    description: 'Preparação completa para a 1ª fase da OAB.',
    color: 'from-purple-600 to-pink-600',
    materias: [
      { materia: 'Ética Profissional', topicos: ['Estatuto', 'Código de Ética'] },
      { materia: 'Direito Constitucional', topicos: ['Controle de Constitucionalidade'] },
      { materia: 'Direito Civil', topicos: ['Pessoas', 'Bens', 'Obrigações', 'Contratos'] },
      { materia: 'Processo Civil', topicos: ['Petições', 'Recursos', 'Execução'] },
      { materia: 'Direito Penal', topicos: ['Parte Geral', 'Parte Especial'] },
      { materia: 'Direito do Trabalho', topicos: ['Contrato', 'Salário', 'Rescisão'] }
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

  const handleSelect = async (templateId: string, materias: any[]) => {
    setLoadingId(templateId);
    
    // Prepara o payload com o nome do concurso baseado no título do template
    const template = AVAILABLE_TEMPLATES.find(t => t.id === templateId);
    const concursoName = template ? template.title.split(' (')[0] : 'Concurso Base';

    const payload = materias.map(m => ({
        concurso: concursoName,
        cargo: 'Geral',
        materia: m.materia,
        topicos: m.topicos,
        is_principal: true
    }));

    await onSelectTemplate(payload);
    // Loading permanece true até o App desmontar este componente
  };

  return (
    <div className="min-h-screen bg-[#0E1117] flex flex-col items-center justify-center p-6 relative overflow-y-auto">
       <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500 animate-gradient-x" />
       
       <div className="text-center max-w-2xl mb-12 mt-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
             Bem-vindo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">{userEmail.split('@')[0]}</span>!
          </h1>
          <p className="text-slate-400 text-lg">
             Para começarmos sua jornada rumo à aprovação, escolha qual é o seu <strong className="text-white">foco principal</strong> hoje.
             Nós configuraremos seu painel automaticamente.
          </p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full pb-20">
          {AVAILABLE_TEMPLATES.map((t) => (
             <button
               key={t.id}
               onClick={() => handleSelect(t.id, t.materias)}
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
                      {loadingId === t.id && (
                         <span className="text-cyan-400 font-bold text-xs bg-cyan-900/20 px-2 py-1 rounded-lg border border-cyan-500/20 animate-pulse">
                            Configurando...
                         </span>
                      )}
                   </div>
                   
                   <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                      {t.title}
                   </h3>
                   <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
                      {t.description}
                   </p>

                   <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Disciplinas Inclusas</div>
                      <div className="flex flex-wrap gap-1.5">
                         {t.materias.slice(0, 3).map((m, i) => (
                            <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded border border-white/5">
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
                      Selecionar Missão <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                   </div>
                </div>
             </button>
          ))}
       </div>
    </div>
  );
};

export default Onboarding;
