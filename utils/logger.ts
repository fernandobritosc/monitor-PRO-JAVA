/**
 * Sistema de Logging Centralizado para MonitorPro
 * Rastreia todas as operações da aplicação com categorias granulares.
 * Em produção, logs são capturados em sessionStorage mas NÃO poluem o console.
 */

const IS_DEV = import.meta.env.DEV;

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
type LogCategory =
    | 'MISSAO' | 'AUTH' | 'CACHE' | 'MIGRATION' | 'LOGOUT'
    | 'AI' | 'DATA' | 'UI' | 'SYNC' | 'PDF' | 'STORAGE' | 'NAV';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    category: LogCategory;
    message: string;
    data?: any;
    userId?: string;
    stackTrace?: string;
}

class MonitorProLogger {
    private logs: LogEntry[] = [];
    private maxLogs = 200;
    private enabled = true;

    constructor() {
        this.loadLogs();
    }

    private loadLogs() {
        try {
            const stored = sessionStorage.getItem('monitorpro_logs');
            if (stored) {
                this.logs = JSON.parse(stored);
            }
        } catch (_) { /* silencioso em caso de erro */ }
    }

    private saveLogs() {
        try {
            const recentLogs = this.logs.slice(-this.maxLogs);
            sessionStorage.setItem('monitorpro_logs', JSON.stringify(recentLogs));
            this.logs = recentLogs;
        } catch (_) { /* silencioso em caso de erro */ }
    }

    private createEntry(
        level: LogLevel,
        category: LogCategory,
        message: string,
        data?: any,
        userId?: string
    ): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            data,
            userId,
            stackTrace: level === 'ERROR' ? new Error().stack : undefined
        };
    }

    private log(entry: LogEntry) {
        if (!this.enabled) return;

        this.logs.push(entry);
        this.saveLogs();

        // Em DEV, mostra no console com cores. Em PROD, silencioso.
        if (!IS_DEV) return;

        const emoji = {
            INFO: 'ℹ️', WARN: '⚠️', ERROR: '❌', DEBUG: '🔍'
        }[entry.level];

        const color = {
            INFO: 'color: #3b82f6',
            WARN: 'color: #f59e0b',
            ERROR: 'color: #ef4444',
            DEBUG: 'color: #8b5cf6'
        }[entry.level];

        // eslint-disable-next-line no-console
        console.log(
            `%c${emoji} [${entry.category}] ${entry.message}`,
            color,
            entry.data || ''
        );
    }

    // —— Métodos Públicos ——
    info(category: LogCategory, message: string, data?: any, userId?: string) {
        this.log(this.createEntry('INFO', category, message, data, userId));
    }

    warn(category: LogCategory, message: string, data?: any, userId?: string) {
        this.log(this.createEntry('WARN', category, message, data, userId));
    }

    error(category: LogCategory, message: string, data?: any, userId?: string) {
        this.log(this.createEntry('ERROR', category, message, data, userId));
    }

    debug(category: LogCategory, message: string, data?: any, userId?: string) {
        this.log(this.createEntry('DEBUG', category, message, data, userId));
    }

    // —— Métodos Específicos (Domínio) ——
    missaoChanged(oldMissao: string, newMissao: string, userId?: string, source?: string) {
        this.info('MISSAO', `Missão alterada: "${oldMissao}" → "${newMissao}"`, { source }, userId);
    }

    missaoLoaded(missao: string, source: 'cache' | 'state' | 'auto', userId?: string) {
        this.info('MISSAO', `Missão carregada de ${source}: "${missao}"`, { source }, userId);
    }

    missaoSaved(missao: string, key: string, userId?: string) {
        this.debug('CACHE', `Missão salva em localStorage`, { missao, key }, userId);
    }

    migrationExecuted(oldKey: string, newKey: string, missao: string) {
        this.info('MIGRATION', `Migração executada: ${oldKey} → ${newKey}`, { missao });
    }

    logoutExecuted(userId?: string) {
        this.info('LOGOUT', 'Logout executado', { userId });
    }

    cacheCleared(preserved: boolean, missao?: string) {
        this.info('CACHE', `Cache limpo (missão preservada: ${preserved})`, { missao });
    }

    // —— Métodos de Análise ——
    getAllLogs(): LogEntry[] {
        return [...this.logs];
    }

    getLogsByCategory(category: LogCategory): LogEntry[] {
        return this.logs.filter(log => log.category === category);
    }

    getLogsByUserId(userId: string): LogEntry[] {
        return this.logs.filter(log => log.userId === userId);
    }

    getRecentLogs(count: number = 20): LogEntry[] {
        return this.logs.slice(-count);
    }

    exportLogs(): string {
        return JSON.stringify(this.logs, null, 2);
    }

    downloadLogs() {
        const blob = new Blob([this.exportLogs()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monitorpro-logs-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    printSummary() {
        // eslint-disable-next-line no-console
        console.group('📊 MonitorPro - Resumo de Logs');
        // eslint-disable-next-line no-console
        console.log('Total de logs:', this.logs.length);

        const byCategory = this.logs.reduce((acc, log) => {
            acc[log.category] = (acc[log.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        // eslint-disable-next-line no-console
        console.log('Por categoria:', byCategory);

        const byLevel = this.logs.reduce((acc, log) => {
            acc[log.level] = (acc[log.level] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        // eslint-disable-next-line no-console
        console.log('Por nível:', byLevel);

        // eslint-disable-next-line no-console
        console.log('\n📝 Últimos 10 logs:');
        this.getRecentLogs(10).forEach(log => {
            // eslint-disable-next-line no-console
            console.log(`[${log.timestamp}] ${log.category}: ${log.message}`);
        });
        // eslint-disable-next-line no-console
        console.groupEnd();
    }

    clearLogs() {
        this.logs = [];
        sessionStorage.removeItem('monitorpro_logs');
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }
}

// Singleton
export const logger = new MonitorProLogger();

// Expor globalmente para debug (apenas em DEV no console, sempre em window)
if (typeof window !== 'undefined') {
    (window as any).monitorProLogger = logger;
    if (IS_DEV) {
        // eslint-disable-next-line no-console
        console.log('💡 Logger: window.monitorProLogger (.printSummary / .downloadLogs / .clearLogs)');
    }
}
