import React from 'react';
import { Search, Layers, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';

interface QuestionsFilterProps {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    showFilters: boolean;
    setShowFilters: (value: boolean) => void;
    isSyncing: boolean;
    syncPodcastCache: () => void;
    filterMateria: string;
    setFilterMateria: (value: string) => void;
    savedMaterias: string[];
    filterAssunto: string;
    setFilterAssunto: (value: string) => void;
    savedAssuntosGerais: string[];
    filterBanca: string;
    setFilterBanca: (value: string) => void;
    savedBancas: string[];
    filterOrgao: string;
    setFilterOrgao: (value: string) => void;
    savedOrgaos: string[];
    filterCargo: string;
    setFilterCargo: (value: string) => void;
    savedCargos: string[];
    filterAno: string;
    setFilterAno: (value: string) => void;
    savedAnos: (string | number)[];
    filterPodcast: string;
    setFilterPodcast: (value: string) => void;
}

export const QuestionsFilter: React.FC<QuestionsFilterProps> = ({
    searchTerm, setSearchTerm, showFilters, setShowFilters, isSyncing, syncPodcastCache,
    filterMateria, setFilterMateria, savedMaterias,
    filterAssunto, setFilterAssunto, savedAssuntosGerais,
    filterBanca, setFilterBanca, savedBancas,
    filterOrgao, setFilterOrgao, savedOrgaos,
    filterCargo, setFilterCargo, savedCargos,
    filterAno, setFilterAno, savedAnos,
    filterPodcast, setFilterPodcast
}) => {
    return (
        <div className="glass-premium p-1.5 rounded-lg border border-[hsl(var(--border))] flex flex-col gap-1.5">
            <div className="flex gap-1.5">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={9} />
                    <input
                        type="text"
                        placeholder="Pesquisar questões..."
                        className="w-full bg-white/5 border border-white/5 rounded-md pl-7 pr-2 py-1 text-[8px] font-bold text-[hsl(var(--text-bright))] focus:border-cyan-500/50 outline-none transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-2 rounded-md border flex items-center gap-1 transition-all ${showFilters ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                    <Layers size={9} />
                    {showFilters ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                </button>
                <button
                    onClick={syncPodcastCache}
                    disabled={isSyncing}
                    className="px-2 rounded-md border border-white/5 bg-white/5 text-slate-400 hover:text-white transition-all outline-none"
                    title="Sincronizar Áudios"
                >
                    <RefreshCw size={9} className={isSyncing ? 'animate-spin text-cyan-400' : ''} />
                </button>
            </div>

            {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 pb-1 animate-in slide-in-from-top-2 duration-300">
                    {[
                        { label: 'Matéria', val: filterMateria, set: setFilterMateria, list: savedMaterias },
                        { label: 'Assunto', val: filterAssunto, set: setFilterAssunto, list: savedAssuntosGerais },
                        { label: 'Banca', val: filterBanca, set: setFilterBanca, list: savedBancas },
                        { label: 'Orgão', val: filterOrgao, set: setFilterOrgao, list: savedOrgaos },
                        { label: 'Cargo', val: filterCargo, set: setFilterCargo, list: savedCargos },
                        { label: 'Ano', val: filterAno, set: setFilterAno, list: savedAnos },
                        { label: 'Podcast', val: filterPodcast, set: setFilterPodcast, list: ['Todos', 'Com Podcast', 'Sem Podcast'] }
                    ].map(f => (
                        <div key={f.label} className="space-y-1">
                            <label className="text-[6px] font-black text-slate-500 uppercase tracking-widest ml-1">{f.label}</label>
                            <input
                                type="text"
                                list={`list-${f.label}`}
                                className="w-full bg-black/20 border border-white/5 rounded px-2 py-1 text-[8px] font-bold text-slate-300"
                                value={f.val === 'Todas' || f.val === 'Todos' ? '' : f.val}
                                placeholder="Qualquer"
                                onChange={e => f.set(e.target.value || (f.label === 'Ano' ? 'Todos' : (f.label === 'Assunto' || f.label === 'Orgão' || f.label === 'Cargo' ? 'Todos' : 'Todas')))}
                            />
                            <datalist id={`list-${f.label}`}>
                                {f.list.map((item, i) => <option key={i} value={item.toString()} />)}
                            </datalist>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
