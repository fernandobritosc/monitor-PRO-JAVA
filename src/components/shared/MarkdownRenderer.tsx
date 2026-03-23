import React, { useMemo } from 'react';

export const MarkdownRenderer: React.FC<{ content: string; visualMode?: boolean }> = ({ content, visualMode = false }) => {
    const parts = useMemo(() => {
        if (!content) return [];

        const lines = content.split(/\r?\n/);
        const result: any[] = [];
        let currentTable: string[] = [];
        let currentText: string[] = [];

        const flushText = () => {
            if (currentText.length > 0) {
                result.push({ type: 'text', content: currentText.join('\n') });
                currentText = [];
            }
        };

        const flushTable = () => {
            if (currentTable.length > 0) {
                result.push({ type: 'table', content: currentTable.join('\n') });
                currentTable = [];
            }
        };

        lines.forEach(line => {
            if (line.trim().startsWith('|')) {
                flushText();
                currentTable.push(line);
            } else {
                if (currentTable.length > 0) {
                    if (line.trim() === '') {
                        currentTable.push(line);
                    } else {
                        flushTable();
                        currentText.push(line);
                    }
                } else {
                    currentText.push(line);
                }
            }
        });
        flushText();
        flushTable();

        return result.flatMap((item, index) => {
            if (item.type === 'table') {
                const rows = item.content.trim().split('\n').filter((row: string) => row.includes('|'));
                if (rows.length < 2) return [];

                const headerRow = rows[0];
                const hasSeparator = rows[1]?.includes('---');
                const header = headerRow.split('|').map((h: string) => h.trim()).filter(Boolean);
                const dataRows = (hasSeparator ? rows.slice(2) : rows.slice(1))
                    .map((r: string) => r.split('|').map((c: string) => c.trim()).filter(Boolean));

                if (visualMode && dataRows.length > 0) {
                    return (
                        <div key={`table-grid-${index}`} className="grid gap-6 my-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {dataRows.map((row: string[], i: number) => (
                                <div key={i} className="group relative overflow-hidden bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-[2rem] p-6 hover:border-[hsl(var(--accent)/0.3)] transition-all duration-500 shadow-xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--accent))] group-hover:scale-125 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--accent))]">{row[0] || 'Critério'}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-2 p-4 bg-[hsl(var(--bg-main))] rounded-2xl border border-[hsl(var(--border))] transition-colors">
                                            <span className="text-[9px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-wider">{header[1] || 'Conceito'}</span>
                                            <span className="text-sm font-semibold text-[hsl(var(--text-bright))] leading-relaxed">{row[1]}</span>
                                        </div>
                                        <div className="flex flex-col gap-2 p-4 bg-[hsl(var(--accent-glow))] rounded-2xl border border-[hsl(var(--border))] transition-colors">
                                            <span className="text-[9px] font-bold text-[hsl(var(--accent-secondary))] uppercase tracking-wider">{header[2] || 'Comparativo'}</span>
                                            <span className="text-sm font-semibold text-[hsl(var(--text-main))] leading-relaxed">{row[2]}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }

                return (
                    <div key={`table-${index}`} className="overflow-x-auto my-6 bg-[hsl(var(--bg-main))] rounded-2xl border border-[hsl(var(--border))]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[hsl(var(--bg-user-block))] border-b border-[hsl(var(--border))]">
                                    {header.map((h: string, i: number) => (
                                        <th key={i} className="p-4 text-[10px] font-black uppercase text-[hsl(var(--accent))] tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {dataRows.map((row: string[], i: number) => (
                                    <tr key={i} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--bg-user-block))] transition-colors">
                                        {row.map((cell: string, j: number) => (
                                            <td key={j} className="p-4 text-xs text-[hsl(var(--text-main))] font-medium">{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            } else {
                const part = item.content;
                return part.split('\n').map((line: string, lineIndex: number) => {
                    const cleanLine = line.replace(/\*\*/g, '');
                    const trimmedLine = cleanLine.trim();
                    if (!trimmedLine) return <div key={`${index}-${lineIndex}`} className="h-4" />;

                    const flowMatch = trimmedLine.match(/^(\d+)\.\s*\[(.*?)\]\s*(.*)$/);
                    if (flowMatch) {
                        const [, num, tag, text] = flowMatch;
                        const tagColors: Record<string, string> = {
                            'INÍCIO': 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
                            'AÇÃO': 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40',
                            'DECISÃO': 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/40',
                            'RESULTADO': 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/40',
                            'FIM': 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40',
                        };
                        const colorClass = tagColors[tag.toUpperCase()] || 'bg-[hsl(var(--bg-user-block))] text-[hsl(var(--text-muted))] border-[hsl(var(--border))]';

                        return (
                            <div key={`${index}-${lineIndex}`} className="relative flex flex-col items-center group">
                                {num !== '1' && (
                                    <div className="w-0.5 h-8 bg-gradient-to-b from-[hsl(var(--border))] to-[hsl(var(--accent-secondary)/0.5)] mb-2" />
                                )}
                                <div className="flex items-center gap-4 w-full p-5 bg-[hsl(var(--bg-user-block))] border border-[hsl(var(--border))] rounded-3xl hover:border-[hsl(var(--accent)/0.5)] hover:bg-[hsl(var(--bg-card))] transition-all duration-300">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-[hsl(var(--accent-glow))] border border-[hsl(var(--accent)/0.2)] flex items-center justify-center text-xs font-black text-[hsl(var(--accent))]">
                                        {num}
                                    </div>
                                    <div className="flex flex-col gap-1.5 flex-grow">
                                        <span className={`w-fit px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-widest border ${colorClass}`}>
                                            {tag}
                                        </span>
                                        <span className="text-sm font-semibold text-[hsl(var(--text-bright))] leading-relaxed">{text}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    if (trimmedLine.startsWith('#')) {
                        const level = (trimmedLine.match(/^#+/)?.[0].length || 1);
                        const text = trimmedLine.replace(/^#+\s/, '');
                        if (level === 1) return <h1 key={`${index}-${lineIndex}`} className="text-2xl font-black uppercase tracking-tighter mt-10 mb-6 text-[hsl(var(--accent))] border-b border-[hsl(var(--border))] pb-4">{text}</h1>;
                        if (level === 2) return <h2 key={`${index}-${lineIndex}`} className="text-lg font-black uppercase tracking-widest mt-8 mb-4 text-[hsl(var(--accent-secondary))] flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[hsl(var(--accent-secondary))]" />{text}</h2>;
                        if (level === 3) return <h3 key={`${index}-${lineIndex}`} className="text-sm font-black uppercase tracking-wider mt-6 mb-3 text-[hsl(var(--accent))] border-l-4 border-[hsl(var(--accent)/0.3)] pl-4">{text}</h3>;
                        return <h4 key={`${index}-${lineIndex}`} className="text-xs font-bold uppercase tracking-widest mt-4 mb-2 text-[hsl(var(--text-muted))] pl-8">{text}</h4>;
                    }

                    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                        return (
                            <div key={`${index}-${lineIndex}`} className="flex items-start gap-3 my-2 group pl-8">
                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-[hsl(var(--text-muted))] group-hover:bg-[hsl(var(--accent))] transition-colors" />
                                <span className="text-sm text-[hsl(var(--text-main))] font-medium leading-relaxed">{cleanLine.replace(/[-*]\s/, '')}</span>
                            </div>
                        );
                    }

                    return <p key={`${index}-${lineIndex}`} className="my-3 text-sm text-[hsl(var(--text-main))] font-medium leading-loose pl-1">{cleanLine}</p>;
                });
            }
        });
    }, [content, visualMode]);

    return <div className={`space-y-1 ${visualMode ? 'animate-in fade-in duration-1000' : ''}`}>{parts}</div>;
};