import { allDb, getDb, getDbInstance } from '../database/connection';
import type {
    DashboardActionBreakdownItem,
    DashboardActivityTrendPoint,
    DashboardCountByType,
    DashboardSummary,
    DashboardTopConnection,
} from './dashboard.types';
import type { AuditLogActionType } from '../types/audit.types';

const DAY_IN_SECONDS = 24 * 60 * 60;
const DASHBOARD_WINDOW_DAYS = 7;
const SSH_SUCCESS_ACTION = 'SSH_CONNECT_SUCCESS';
const SSH_FAILURE_ACTIONS: AuditLogActionType[] = ['SSH_CONNECT_FAILURE', 'SSH_SHELL_FAILURE'];
const TOP_CONNECTION_ACTIONS: AuditLogActionType[] = [
    SSH_SUCCESS_ACTION,
    ...SSH_FAILURE_ACTIONS,
];
const ACTION_BREAKDOWN_LIMIT = 6;
const TOP_CONNECTION_LIMIT = 5;

interface CountRow {
    total: number;
}

interface CountByLabelRow {
    label: string;
    count: number;
}

interface TrendRow {
    date: string;
    count: number;
}

interface ConnectionLookupRow {
    id: number;
    name: string | null;
    host: string;
}

interface AuditDetailRow {
    timestamp: number;
    details: string | null;
}

interface ParsedAuditDetails {
    connectionId?: number;
    connectionName?: string;
}

const buildDateWindow = (days: number): string[] => {
    const result: string[] = [];
    const now = new Date();

    for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date(now);
        date.setUTCDate(date.getUTCDate() - index);
        result.push(date.toISOString().slice(0, 10));
    }

    return result;
};

const safeParseAuditDetails = (raw: string | null): ParsedAuditDetails | null => {
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as ParsedAuditDetails;
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
        return null;
    }
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
    const db = await getDbInstance();
    const now = Math.floor(Date.now() / 1000);
    const since7d = now - (DASHBOARD_WINDOW_DAYS - 1) * DAY_IN_SECONDS;
    const since24h = now - DAY_IN_SECONDS;

    const [
        totalConnectionsRow,
        activeConnectionsRow,
        taggedConnectionsRow,
        auditLogsRow,
        sshOutcomeRows,
        connectionTypeRows,
        actionBreakdownRows,
        trendRows,
        topConnectionLogRows,
        connectionLookupRows,
    ] = await Promise.all([
        getDb<CountRow>(db, 'SELECT COUNT(*) as total FROM connections'),
        getDb<CountRow>(db, 'SELECT COUNT(*) as total FROM connections WHERE last_connected_at >= ?', [since7d]),
        getDb<CountRow>(db, 'SELECT COUNT(DISTINCT connection_id) as total FROM connection_tags'),
        getDb<CountRow>(db, 'SELECT COUNT(*) as total FROM audit_logs'),
        allDb<CountByLabelRow>(
            db,
            `
            SELECT action_type as label, COUNT(*) as count
            FROM audit_logs
            WHERE timestamp >= ?
              AND action_type IN (?, ?, ?)
            GROUP BY action_type
            `,
            [since24h, SSH_SUCCESS_ACTION, ...SSH_FAILURE_ACTIONS],
        ),
        allDb<CountByLabelRow>(
            db,
            `
            SELECT type as label, COUNT(*) as count
            FROM connections
            GROUP BY type
            ORDER BY count DESC, type ASC
            `,
        ),
        allDb<CountByLabelRow>(
            db,
            `
            SELECT action_type as label, COUNT(*) as count
            FROM audit_logs
            WHERE timestamp >= ?
            GROUP BY action_type
            ORDER BY count DESC, action_type ASC
            LIMIT ?
            `,
            [since7d, ACTION_BREAKDOWN_LIMIT],
        ),
        allDb<TrendRow>(
            db,
            `
            SELECT strftime('%Y-%m-%d', timestamp, 'unixepoch') as date, COUNT(*) as count
            FROM audit_logs
            WHERE timestamp >= ?
            GROUP BY strftime('%Y-%m-%d', timestamp, 'unixepoch')
            ORDER BY date ASC
            `,
            [since7d],
        ),
        allDb<AuditDetailRow>(
            db,
            `
            SELECT timestamp, details
            FROM audit_logs
            WHERE timestamp >= ?
              AND action_type IN (?, ?, ?)
              AND details IS NOT NULL
            ORDER BY timestamp DESC
            `,
            [since7d, ...TOP_CONNECTION_ACTIONS],
        ),
        allDb<ConnectionLookupRow>(
            db,
            'SELECT id, name, host FROM connections',
        ),
    ]);

    const sshOutcomesMap = new Map<string, number>(
        sshOutcomeRows.map((row) => [row.label, row.count]),
    );

    const connectionTypeMap = new Map<string, number>(
        connectionTypeRows.map((row) => [row.label, row.count]),
    );
    const connectionTypes: DashboardCountByType[] = ['SSH', 'RDP', 'VNC'].map((type) => ({
        label: type,
        count: connectionTypeMap.get(type) ?? 0,
    }));

    const actionBreakdown7d: DashboardActionBreakdownItem[] = actionBreakdownRows.map((row) => ({
        actionType: (row.label as AuditLogActionType) ?? 'OTHER',
        count: row.count,
    }));

    const trendMap = new Map<string, number>(
        trendRows.map((row) => [row.date, row.count]),
    );
    const activityTrend7d: DashboardActivityTrendPoint[] = buildDateWindow(DASHBOARD_WINDOW_DAYS).map((date) => ({
        date,
        count: trendMap.get(date) ?? 0,
    }));

    const connectionLookup = new Map<number, ConnectionLookupRow>(
        connectionLookupRows.map((row) => [row.id, row]),
    );
    const topConnectionCounts = new Map<number, DashboardTopConnection>();

    for (const row of topConnectionLogRows) {
        const details = safeParseAuditDetails(row.details);
        const connectionId = details?.connectionId;
        if (typeof connectionId !== 'number' || Number.isNaN(connectionId)) {
            continue;
        }

        const lookup = connectionLookup.get(connectionId);
        const connectionName = details?.connectionName || lookup?.name || `#${connectionId}`;
        const host = lookup?.host || '-';
        const existing = topConnectionCounts.get(connectionId);

        if (existing) {
            existing.count += 1;
            existing.lastSeenAt = Math.max(existing.lastSeenAt, row.timestamp);
            continue;
        }

        topConnectionCounts.set(connectionId, {
            connectionId,
            connectionName,
            host,
            count: 1,
            lastSeenAt: row.timestamp,
        });
    }

    const topConnections = Array.from(topConnectionCounts.values())
        .sort((left, right) => {
            if (right.count !== left.count) {
                return right.count - left.count;
            }

            return right.lastSeenAt - left.lastSeenAt;
        })
        .slice(0, TOP_CONNECTION_LIMIT);

    return {
        totals: {
            connections: totalConnectionsRow?.total ?? 0,
            activeConnections7d: activeConnectionsRow?.total ?? 0,
            taggedConnections: taggedConnectionsRow?.total ?? 0,
            auditLogs: auditLogsRow?.total ?? 0,
        },
        sshOutcomes24h: {
            success: sshOutcomesMap.get(SSH_SUCCESS_ACTION) ?? 0,
            failure: SSH_FAILURE_ACTIONS.reduce(
                (total, actionType) => total + (sshOutcomesMap.get(actionType) ?? 0),
                0,
            ),
        },
        connectionTypes,
        actionBreakdown7d,
        activityTrend7d,
        topConnections,
    };
};
