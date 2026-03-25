import type { AuditLogActionType } from '../types/audit.types';

export interface DashboardTotals {
    connections: number;
    activeConnections7d: number;
    taggedConnections: number;
    auditLogs: number;
}

export interface DashboardSshOutcomes24h {
    success: number;
    failure: number;
}

export interface DashboardCountByType {
    label: string;
    count: number;
}

export interface DashboardActivityTrendPoint {
    date: string;
    count: number;
}

export interface DashboardTopConnection {
    connectionId: number;
    connectionName: string;
    host: string;
    count: number;
    lastSeenAt: number;
}

export interface DashboardActionBreakdownItem {
    actionType: AuditLogActionType | 'OTHER';
    count: number;
}

export interface DashboardCurrentUserLiveMetrics {
    activeSshSessions: number;
    suspendedSessions: number;
}

export interface DashboardSystemLiveMetrics {
    activeSshSessions: number;
    suspendedSessions: number;
    statusStreams: number;
}

export interface DashboardLiveMetrics {
    currentUser: DashboardCurrentUserLiveMetrics;
    system: DashboardSystemLiveMetrics;
}

export interface DashboardStaticSummary {
    totals: DashboardTotals;
    sshOutcomes24h: DashboardSshOutcomes24h;
    connectionTypes: DashboardCountByType[];
    actionBreakdown7d: DashboardActionBreakdownItem[];
    activityTrend7d: DashboardActivityTrendPoint[];
    topConnections: DashboardTopConnection[];
}

export interface DashboardSummary extends DashboardStaticSummary {
    liveMetrics: DashboardLiveMetrics;
}
