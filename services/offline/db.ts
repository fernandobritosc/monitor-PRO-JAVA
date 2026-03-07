import Dexie, { Table } from 'dexie';
import { StudyRecord, EditalMateria } from '../../types';

export interface OfflineAttempt extends Omit<Partial<StudyRecord>, 'id'> {
    id?: number;
    syncStatus: 'pending' | 'synced' | 'error';
    lastModified: number;
}

export class MonitorProDB extends Dexie {
    attempts!: Table<OfflineAttempt>;
    subjects!: Table<EditalMateria>;

    constructor() {
        super('MonitorProDB');
        this.version(2).stores({
            attempts: '++id, data_estudo, concurso, materia, syncStatus',
            subjects: '++id, concurso, materia',
            materials_cache: 'id, name, materia, assunto, storage_path'
        });
    }
}

export const db = new MonitorProDB();
