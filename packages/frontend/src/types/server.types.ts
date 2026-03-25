// 类型定义：用于服务器状态监控数据 (从 useStatusMonitor 迁移)
export interface ServerStatus {
    cpuPercent?: number;
    memPercent?: number;
    memUsed?: number; // MB
    memTotal?: number; // MB
    memFree?: number; // MB
    memCached?: number; // MB
    diskPercent?: number;
    diskUsed?: number; // KB
    diskTotal?: number; // KB
    diskAvailable?: number; // KB
    diskMountPoint?: string;
    diskFsType?: string;
    diskDevice?: string;
    diskReadRate?: number; // Bytes/sec
    diskWriteRate?: number; // Bytes/sec
    cpuModel?: string;
    swapPercent?: number;
    swapUsed?: number; // MB
    swapTotal?: number; // MB
    netRxRate?: number; // Bytes/sec
    netTxRate?: number; // Bytes/sec
    netRxTotalBytes?: number; // Bytes since boot
    netTxTotalBytes?: number; // Bytes since boot
    netInterface?: string;
    osName?: string;
}

// 可以根据需要添加其他与服务器或连接状态相关的类型

// --- Notification Settings Types (Mirrors backend/src/types/notification.types.ts) ---

export type NotificationChannelType = 'webhook' | 'email' | 'telegram';

// Align NotificationEvent with AuditLogActionType as requested
export type NotificationEvent =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PASSWORD_CHANGED'
  | '2FA_ENABLED' | '2FA_DISABLED'
  // Passkey Events
  | 'PASSKEY_REGISTERED'
  | 'PASSKEY_AUTH_SUCCESS'
  | 'PASSKEY_AUTH_FAILURE'
  | 'PASSKEY_DELETED'
  | 'CONNECTION_CREATED' | 'CONNECTION_UPDATED' | 'CONNECTION_DELETED'
  | 'PROXY_CREATED' | 'PROXY_UPDATED' | 'PROXY_DELETED'
  | 'TAG_CREATED' | 'TAG_UPDATED' | 'TAG_DELETED'
  | 'SETTINGS_UPDATED' | 'IP_WHITELIST_UPDATED' | 'IP_BLOCKED'
  | 'NOTIFICATION_SETTING_CREATED' | 'NOTIFICATION_SETTING_UPDATED' | 'NOTIFICATION_SETTING_DELETED'
  | 'SSH_CONNECT_SUCCESS' | 'SSH_CONNECT_FAILURE' | 'SSH_SHELL_FAILURE'
  | 'DATABASE_MIGRATION' | 'ADMIN_SETUP_COMPLETE';

export interface WebhookConfig {
  url: string;
  method?: 'POST' | 'GET' | 'PUT';
  headers?: Record<string, string>;
  bodyTemplate?: string;
}

export interface EmailConfig {
  to: string;
  subjectTemplate?: string;
  // SMTP settings are global on the backend
}

export interface TelegramConfig {
  botToken: string; // Consider masking this in the UI
  chatId: string;
  messageTemplate?: string;
  customDomain?: string; // 允许用户自定义 Telegram API 域名
}

export type NotificationChannelConfig = WebhookConfig | EmailConfig | TelegramConfig;

export interface NotificationSetting {
  id?: number;
  channel_type: NotificationChannelType;
  name: string;
  enabled: boolean;
  config: NotificationChannelConfig;
  enabled_events: NotificationEvent[];
  created_at?: number | string; // Represented as string or number (timestamp)
  updated_at?: number | string;
}

// Helper type for creating/updating settings, omitting generated fields
export type NotificationSettingData = Omit<NotificationSetting, 'id' | 'created_at' | 'updated_at'>;

// --- Audit Log Types (Mirrors backend/src/types/audit.types.ts) ---

// Keep action types aligned with backend for potential filtering
export type AuditLogActionType =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PASSWORD_CHANGED'
  | '2FA_ENABLED' | '2FA_DISABLED'
  | 'PASSKEY_REGISTERED'
  | 'PASSKEY_AUTH_SUCCESS'
  | 'PASSKEY_AUTH_FAILURE'
  | 'PASSKEY_DELETED'
  | 'PASSKEY_DELETE_UNAUTHORIZED'
  | 'PASSKEY_NAME_UPDATED'
  | 'PASSKEY_NAME_UPDATE_UNAUTHORIZED'
  | 'CONNECTION_CREATED' | 'CONNECTION_UPDATED' | 'CONNECTION_DELETED'
  | 'PROXY_CREATED' | 'PROXY_UPDATED' | 'PROXY_DELETED'
  | 'TAG_CREATED' | 'TAG_UPDATED' | 'TAG_DELETED'
  | 'SETTINGS_UPDATED' | 'IP_WHITELIST_UPDATED' | 'CAPTCHA_SETTINGS_UPDATED'
  | 'NOTIFICATION_SETTING_CREATED' | 'NOTIFICATION_SETTING_UPDATED' | 'NOTIFICATION_SETTING_DELETED'
  // SSH Actions
  | 'SSH_CONNECT_SUCCESS' | 'SSH_CONNECT_FAILURE' | 'SSH_SHELL_FAILURE'
  // System/Error
  | 'DATABASE_MIGRATION' | 'ADMIN_SETUP_COMPLETE';
  // Settings (Specific)
  // | 'FOCUS_SWITCHER_SEQUENCE_UPDATED'; // Removed Focus Switcher type


// Structure for a single log entry received from the API
export interface AuditLogEntry {
    id: number;
    timestamp: number; // Unix timestamp (seconds)
    action_type: AuditLogActionType;
    details: Record<string, any> | { raw: string; parseError: boolean } | null; // Parsed JSON or raw string with error flag
}

// Structure for the API response when fetching logs
export interface AuditLogApiResponse {
    logs: AuditLogEntry[];
    total: number;
    limit: number;
    offset: number;
}

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

export interface DashboardSummary {
    totals: DashboardTotals;
    sshOutcomes24h: DashboardSshOutcomes24h;
    connectionTypes: DashboardCountByType[];
    actionBreakdown7d: DashboardActionBreakdownItem[];
    activityTrend7d: DashboardActivityTrendPoint[];
    topConnections: DashboardTopConnection[];
    liveMetrics: DashboardLiveMetrics;
}
