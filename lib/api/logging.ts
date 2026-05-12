import { supabase } from '../supabase';

export type LogLevel = 'info' | 'warn' | 'error' | 'critical';

export const logEvent = async (
    userId: string | null,
    level: LogLevel,
    event: string,
    metadata: any = {}
) => {
    try {
        const { error } = await supabase
            .from('system_logs')
            .insert({
                message: event,
                status: level,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('Failed to write to system_logs:', error);
        }
    } catch (e) {
        console.error('Logging utility failed:', e);
    }
};

export const logInfo = (userId: string | null, event: string, metadata?: any) => logEvent(userId, 'info', event, metadata);
export const logWarn = (userId: string | null, event: string, metadata?: any) => logEvent(userId, 'warn', event, metadata);
export const logError = (userId: string | null, event: string, metadata?: any) => logEvent(userId, 'error', event, metadata);
export const logCritical = (userId: string | null, event: string, metadata?: any) => logEvent(userId, 'critical', event, metadata);
