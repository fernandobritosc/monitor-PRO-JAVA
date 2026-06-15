import { Search, Loader2, DownloadCloud, Users } from 'lucide-react';

interface TemplateItem {
  id: string;
  title: string;
  cargo: string;
  stats: string;
  materias: unknown[];
}

interface ImportPanelProps {
  filteredTemplates: TemplateItem[];
  loadingTemplates: boolean;
  importSearch: string;
  importingId: string | null;
  onSearchChange: (v: string) => void;
  onImportTemplate: (template: TemplateItem) => void;
}

const ImportPanel = ({
  filteredTemplates, loadingTemplates, importSearch, importingId,
  onSearchChange, onImportTemplate,
}: ImportPanelProps) => {
  return (
    <div className="glass rounded-2xl p-6 shadow-xl animate-in slide-in-from-right-2 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2"><DownloadCloud className="text-blue-400" /> Banco Comunitário de Editais</h3>
          <p className="text-slate-400 text-sm mt-1">Navegue e clone editais criados por outros usuários. Compartilhamento livre.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input type="text" placeholder="Buscar concurso..." className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs" value={importSearch} onChange={e => onSearchChange(e.target.value)} />
        </div>
      </div>
      {loadingTemplates ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-blue-400" size={40} /><p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Carregando banco de dados...</p></div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-16 text-slate-500 italic">Nenhum edital encontrado. Tente outro termo de busca.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(tmpl => (
            <div key={tmpl.id} className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 hover:border-blue-500/50 transition-all group hover:bg-slate-900/50 relative">
              <div className="absolute top-4 right-4 text-slate-600 group-hover:text-blue-400"><Users size={18} /></div>
              <h4 className="text-lg font-bold text-white mb-2 pr-6 truncate">{tmpl.title}</h4>
              <div className="space-y-1 mb-6">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{tmpl.cargo}</p>
                <p className="text-xs text-slate-500">{tmpl.stats}</p>
              </div>
              <button
                onClick={() => onImportTemplate(tmpl)}
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
    </div>
  );
};

export default ImportPanel;
