import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Search,
    Filter,
    Building2,
    MapPin,
    Trophy,
    Award,
    TrendingUp
} from 'lucide-react';
import rankingDataRaw from '../data/ranking_siconfi.json';

interface RankingItem {
    Posicao: string;
    Categoria: string;
    Nome: string;
    IBGE: string;
    Percentual: string;
    ICF: string;
    Pontos: string;
}

const rankingData = rankingDataRaw as unknown as RankingItem[];

const SiconfiRankingView: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('ESTADOS_DF');

    const categories = [
        { id: 'ESTADOS_DF', label: 'Estados / DF', icon: MapPin },
        { id: 'CAPITAIS', label: 'Capitais', icon: Trophy },
        { id: 'MUN_ACIMA_100K', label: 'Mun > 100k', icon: Building2 },
        { id: 'MUN_ATE_100K', label: 'Mun < 100k', icon: Building2 },
    ];

    const filteredData = useMemo(() => {
        return rankingData.filter(item => 
            item.Categoria === activeCategory &&
            item.Nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [activeCategory, searchTerm]);

    const getICFColor = (icf: string) => {
        switch (icf) {
            case 'A': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'B': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'C': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'D': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            default: return 'text-red-400 bg-red-400/10 border-red-400/20';
        }
    };

    return (
        <div className="min-h-screen bg-[hsl(var(--bg-main))] text-[hsl(var(--text-bright))] p-6 md:p-12 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate('/')}
                        className="p-4 bg-[hsl(var(--bg-user-block))] rounded-2xl text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))] transition-all border border-[hsl(var(--border))] active:scale-95"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent uppercase tracking-tighter">
                            Ranking Siconfi 2026
                        </h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                            Qualidade da Informação Contábil e Fiscal (Exercício 2025)
                        </p>
                    </div>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] group-focus-within:text-cyan-400 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar ente..."
                        className="w-full bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-[hsl(var(--text-bright))] focus:ring-2 focus:ring-cyan-400/30 transition-all outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </section>

            {/* Categories Selector */}
            <section className="flex flex-wrap gap-3">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                            activeCategory === cat.id
                                ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                                : 'bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] border-[hsl(var(--border))] hover:border-cyan-500/50'
                        }`}
                    >
                        <cat.icon size={16} />
                        {cat.label}
                    </button>
                ))}
            </section>

            {/* Content Table */}
            <section className="glass-premium rounded-[2.5rem] border border-[hsl(var(--border))] overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 w-24">Posição</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ente Federado</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Nota ICF</th>
                                <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Percentual</th>
                                <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hidden md:table-cell">Pontos</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode='wait'>
                                {filteredData.map((item, index) => (
                                    <motion.tr
                                        key={item.IBGE}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2, delay: index * 0.02 }}
                                        className="border-b border-white/[0.02] last:border-0 hover:bg-white/5 transition-colors group"
                                    >
                                        <td className="px-8 py-6">
                                            <span className={`text-xl font-black ${
                                                item.Posicao === '1' ? 'text-yellow-400' : 
                                                item.Posicao === '2' ? 'text-slate-300' : 
                                                item.Posicao === '3' ? 'text-orange-400' : 'text-slate-600'
                                            }`}>
                                                #{item.Posicao}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-[hsl(var(--text-bright))] uppercase tracking-tight">
                                                    {item.Nome}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-500 tracking-widest mt-0.5 uppercase">
                                                    IBGE: {item.IBGE}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`inline-block px-4 py-1 rounded-full text-xs font-black border ${getICFColor(item.ICF)}`}>
                                                {item.ICF}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className="text-sm font-black text-cyan-400">{item.Percentual}</span>
                                                <TrendingUp size={14} className="text-cyan-400/50" />
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right text-sm font-bold text-slate-400 hidden md:table-cell">
                                            {item.Pontos}
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest text-xs">
                                        Nenhum ente encontrado nesta categoria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Footer / Legend */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
                <div className="glass-premium p-6 rounded-3xl border border-white/5 space-y-2">
                    <h5 className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Critério Performance</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Avalia a precisão, integridade e consistência das informações enviadas ao Siconfi no exercício de 2025.
                    </p>
                </div>
                <div className="glass-premium p-6 rounded-3xl border border-white/5 space-y-2">
                    <h5 className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Indicador ICF</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        A: ≥ 95% | B: 85-95% | C: 75-85% | D: 65-75% | E: &lt; 65%
                    </p>
                </div>
                <div className="glass-premium p-6 rounded-3xl border border-white/5 space-y-2">
                    <h5 className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Selo de Qualidade</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Entes com ICF "A" ganham o direito ao uso do Selo de Qualidade da Informação Contábil e Fiscal.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default SiconfiRankingView;
