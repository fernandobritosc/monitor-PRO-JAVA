import Dexie, { type Table } from 'dexie';
import { StudyRecord } from '../../types';

export interface StudyMaterial {
    id: string;
    name: string;
    materia: string;
    assunto: string;
    storage_path: string;
    file_size: number;
    podcast_path?: string;
    podcast_file_size?: number;
    created_at: string;
    content?: Blob; // Added for offline cache
}

export interface OfflineAttempt extends StudyRecord {
    syncStatus: 'pending' | 'synced' | 'error';
    lastModified: number;
}

export interface OfflineEdital {
    id: string;
    user_id: string;
    concurso: string;
    materia: string;
    topicos: string[];
    is_principal: boolean;
}

export class MonitorProDB extends Dexie {
    studyRecords!: Table<OfflineAttempt, string>;
    editais!: Table<OfflineEdital, string>;
    materials_cache!: Table<StudyMaterial, string>;

    constructor() {
        super('MonitorProDB');
        this.version(2).stores({
            studyRecords: 'id, user_id, materia, syncStatus',
            editais: 'id, user_id, materia',
            materials_cache: 'id, materia, assunto'
        });
    }

    // Alias para compatibilidade legada
    get attempts() {
        return this.studyRecords;
    }
}

export const db = new MonitorProDB();
