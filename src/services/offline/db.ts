import Dexie, { type Table } from 'dexie';
import { StudyRecord, EditalMateria } from '../../types';

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
    retryCount?: number;
    lastError?: string;
}

export interface OfflineEdital extends EditalMateria {
    syncStatus: 'pending' | 'synced' | 'error';
    lastModified: number;
    retryCount?: number;
}

export class MonitorProDB extends Dexie {
    studyRecords!: Table<OfflineAttempt, string>;
    editais!: Table<OfflineEdital, string>;
    materials_cache!: Table<StudyMaterial, string>;

    constructor() {
        super('MonitorProDB');

        this.version(5).stores({
            studyRecords: 'id, user_id, materia, syncStatus, lastModified',
            editais: 'id, user_id, materia, syncStatus, lastModified',
            materials_cache: 'id, materia, name'
        }).upgrade(_tx => {
            // v5: Added lastModified index, added materials_cache table
        });

        this.version(4).stores({
            studyRecords: 'id, user_id, materia, syncStatus',
            editais: 'id, user_id, materia, syncStatus'
        }).upgrade(_tx => {
            // v4: Added editais table
        });

        this.version(3).stores({
            studyRecords: 'id, user_id, materia, syncStatus'
        }).upgrade(_tx => {
            // v3: Added syncStatus index
        });

        this.version(2).stores({
            studyRecords: 'id, user_id, materia'
        }).upgrade(_tx => {
            // v2: Added materia index
        });
    }

    // Alias para compatibilidade legada
    get attempts() {
        return this.studyRecords;
    }
}

export const db = new MonitorProDB();
