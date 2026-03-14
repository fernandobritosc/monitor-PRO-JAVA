import React from 'react';
import { ExternalLink } from 'lucide-react';

export const getLocalToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const extractTecId = (tecField: string | undefined): { id: string, url: string } | null => {
    if (!tecField) return null;
    const numericRegex = /^\d+$/;
    const urlRegex = /https?:\/\/www\.tecconcursos\.com\.br\/questoes\/(\d+)/;

    if (numericRegex.test(tecField)) {
        return {
            id: tecField,
            url: `https://www.tecconcursos.com.br/questoes/${tecField}`
        };
    }

    const match = tecField.match(urlRegex);
    if (match) {
        return {
            id: match[1],
            url: tecField
        };
    }

    if (tecField.startsWith('http')) {
        return { id: 'Ver Link', url: tecField };
    }

    return { id: tecField, url: `https://www.tecconcursos.com.br/questoes/${tecField}` };
};

export const formatTextWithLinks = (text: string | undefined) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 hover:decoration-cyan-300 transition-colors inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part} <ExternalLink size={10} />
                </a>
            );
        }
        return part;
    });
};
