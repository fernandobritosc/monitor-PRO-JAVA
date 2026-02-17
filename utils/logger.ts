/**
 * Sistema de Logging Centralizado para MonitorPro
 * Rastreia todas as operações relacionadas à missão ativa e localStorage
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
type LogCategory = 'MISSAO' | 'AUTH' | 'CACHE' | 'MIGRATION' | 'LOGOUT';

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
    private maxLogs = 100;
    private enabled = true;

    constructor() {
        // Carrega logs anteriores do sessionStorage
        this.loadLogs();
    }

    private loadLogs() {
        try {
            const stored = sessionStorage.getItem('monitorpro_logs');
            if (stored) {
                this.logs = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Erro ao carregar logs:', e);
        }
    }

    private saveLogs() {
        try {
            // Mantém apenas os últimos maxLogs
            const recentLogs = this.logs.slice(-this.maxLogs);
            sessionStorage.setItem('monitorpro_logs', JSON.stringify(recentLogs));
            this.logs = recentLogs;
        } catch (e) {
            console.error('Erro ao salvar logs:', e);
        }
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

        // Console output com cores
        const emoji = {
            INFO: 'ℹ️',
            WARN: '⚠️',
            ERROR: '❌',
            DEBUG: '🔍'
        }[entry.level];

        const color = {
            INFO: 'color: #3b82f6',
            WARN: 'color: #f59e0b',
            ERROR: 'color: #ef4444',
            DEBUG: 'color: #8b5cf6'
        }[entry.level];

        console.log(
            `%c${emoji} [${entry.category}] ${entry.message}`,
            color,
            entry.data || ''
        );
    }

    // Métodos públicos
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

    // Métodos específicos para missão
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

    // Métodos de análise
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

    // Exportar logs
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

    // Exibir resumo no console
    printSummary() {
        console.group('📊 MonitorPro - Resumo de Logs');
        console.log('Total de logs:', this.logs.length);

        const byCategory = this.logs.reduce((acc, log) => {
            acc[log.category] = (acc[log.category] || 0) + 1;
            return acc;
        }, {} as Record<LogCategory, number>);

        console.log('Por categoria:', byCategory);

        const byLevel = this.logs.reduce((acc, log) => {
            acc[log.level] = (acc[log.level] || 0) + 1;
            return acc;
        }, {} as Record<LogLevel, number>);

        console.log('Por nível:', byLevel);

        console.log('\n📝 Últimos 10 logs:');
        this.getRecentLogs(10).forEach(log => {
            console.log(`[${log.timestamp}] ${log.category}: ${log.message}`);
        });

        console.groupEnd();
    }

    // Limpar logs
    clearLogs() {
        this.logs = [];
        sessionStorage.removeItem('monitorpro_logs');
        console.log('🗑️ Logs limpos');
    }

    // Habilitar/desabilitar logging
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        console.log(`📝 Logging ${enabled ? 'habilitado' : 'desabilitado'}`);
    }
}

// Singleton
export const logger = new MonitorProLogger();

// Expor globalmente para debug no console
if (typeof window !== 'undefined') {
    (window as any).monitorProLogger = logger;
    console.log('💡 Logger disponível globalmente: window.monitorProLogger');
    console.log('   - monitorProLogger.printSummary() - Ver resumo');
    console.log('   - monitorProLogger.downloadLogs() - Baixar logs');
    console.log('   - monitorProLogger.clearLogs() - Limpar logs');
}
