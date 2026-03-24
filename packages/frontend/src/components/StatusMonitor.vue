<script setup lang="ts">
import { ref, computed, watch, type PropType, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import StatusCharts from './StatusCharts.vue';
import { useSessionStore } from '../stores/session.store';
import { useSettingsStore } from '../stores/settings.store';
import { useConnectionsStore } from '../stores/connections.store';
import { useUiNotificationsStore } from '../stores/uiNotifications.store';
import type { ServerStatus } from '../types/server.types';

const { t } = useI18n();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const connectionsStore = useConnectionsStore();
const uiNotificationsStore = useUiNotificationsStore();

const { sessions } = storeToRefs(sessionStore);
const { statusMonitorShowIpBoolean } = storeToRefs(settingsStore);
const isSwitchingSession = ref(false);

const props = defineProps({
  activeSessionId: {
    type: String as PropType<string | null>,
    required: false,
    default: null,
  },
});

const formatPercentageText = (percentage: number): string => `${Math.round(percentage)}%`;

const currentSessionState = computed(() => {
  return props.activeSessionId ? sessions.value.get(props.activeSessionId) : null;
});

const currentServerStatus = computed<ServerStatus | null>(() => {
  return currentSessionState.value?.statusMonitorManager?.serverStatus?.value ?? null;
});

const displayCpuPercent = computed(() => currentServerStatus.value?.cpuPercent ?? 0);
const displayMemPercent = computed(() => currentServerStatus.value?.memPercent ?? 0);
const displaySwapPercent = computed(() => currentServerStatus.value?.swapPercent ?? 0);
const displayDiskPercent = computed(() => currentServerStatus.value?.diskPercent ?? 0);

const currentStatusError = computed<string | null>(() => {
  return currentSessionState.value?.statusMonitorManager?.statusError?.value ?? null;
});

const cachedCpuModel = ref<string | null>(null);
const cachedOsName = ref<string | null>(null);

watch(
  currentServerStatus,
  (newData) => {
    if (newData?.cpuModel) {
      cachedCpuModel.value = newData.cpuModel;
    }
    if (newData?.osName) {
      cachedOsName.value = newData.osName;
    }
  },
  { immediate: true }
);

watch(
  () => props.activeSessionId,
  async (newId, oldId) => {
    if (newId !== oldId) {
      isSwitchingSession.value = true;
      await nextTick();
      isSwitchingSession.value = false;
    }
  }
);

const displayCpuModel = computed(() => {
  return (currentServerStatus.value?.cpuModel ?? cachedCpuModel.value) || t('statusMonitor.notAvailable');
});

const displayOsName = computed(() => {
  return (currentServerStatus.value?.osName ?? cachedOsName.value) || t('statusMonitor.notAvailable');
});

const formatBytesPerSecond = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return t('statusMonitor.notAvailable');
  if (bytes < 1024) return `${bytes} ${t('statusMonitor.bytesPerSecond')}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('statusMonitor.kiloBytesPerSecond')}`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('statusMonitor.megaBytesPerSecond')}`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ${t('statusMonitor.gigaBytesPerSecond')}`;
};

const formatBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return t('statusMonitor.notAvailable');
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('statusMonitor.megaBytes')}`;
  if (bytes < 1024 * 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ${t('statusMonitor.gigaBytes')}`;
  }
  return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`;
};

const formatKbToGb = (kb?: number): string => {
  if (kb === undefined || kb === null) return t('statusMonitor.notAvailable');
  if (kb === 0) return `0.0 ${t('statusMonitor.gigaBytes')}`;
  const gb = kb / 1024 / 1024;
  return `${gb.toFixed(1)} ${t('statusMonitor.gigaBytes')}`;
};

const formatMemorySize = (mb?: number): string => {
  if (mb === undefined || mb === null || Number.isNaN(mb)) return t('statusMonitor.notAvailable');
  if (mb < 1024) {
    const value = Number.isInteger(mb) ? mb : mb.toFixed(1);
    return `${value} ${t('statusMonitor.megaBytes')}`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(1)} ${t('statusMonitor.gigaBytes')}`;
};

const memDisplay = computed(() => {
  const data = currentServerStatus.value;
  if (!data || data.memUsed === undefined || data.memTotal === undefined) return t('statusMonitor.notAvailable');
  return `${formatMemorySize(data.memUsed)} / ${formatMemorySize(data.memTotal)}`;
});

const diskDisplay = computed(() => {
  const data = currentServerStatus.value;
  if (!data || data.diskUsed === undefined || data.diskTotal === undefined) return t('statusMonitor.notAvailable');
  return `${formatKbToGb(data.diskUsed)} / ${formatKbToGb(data.diskTotal)}`;
});

const swapDisplay = computed(() => {
  const data = currentServerStatus.value;
  const used = data?.swapUsed ?? 0;
  const total = data?.swapTotal ?? 0;
  if (total === 0) return t('statusMonitor.swapNotAvailable');
  return `${formatMemorySize(used)} / ${formatMemorySize(total)}`;
});

const sessionIpAddress = computed(() => {
  const sessionState = currentSessionState.value;
  if (sessionState?.connectionId) {
    const connectionIdAsNumber = parseInt(sessionState.connectionId, 10);
    if (Number.isNaN(connectionIdAsNumber)) return null;
    const connectionInfo = connectionsStore.connections.find((conn) => conn.id === connectionIdAsNumber);
    return connectionInfo?.host || null;
  }
  return null;
});

const overviewStats = computed(() => {
  if (!currentServerStatus.value) return [];

  return [
    {
      label: t('statusMonitor.cpuLabel'),
      value: `${Math.round(displayCpuPercent.value)}%`,
      meta: displayCpuModel.value,
      color: '#3b82f6',
    },
    {
      label: t('statusMonitor.memoryLabel'),
      value: memDisplay.value,
      meta: `${Math.round(displayMemPercent.value)}%`,
      color: '#22c55e',
    },
    {
      label: t('statusMonitor.diskLabel'),
      value: diskDisplay.value,
      meta: `${Math.round(displayDiskPercent.value)}%`,
      color: '#a855f7',
    },
  ];
});

const copyIpToClipboard = async (ipAddress: string | null) => {
  if (!ipAddress) return;
  try {
    await navigator.clipboard.writeText(ipAddress);
    uiNotificationsStore.showSuccess(t('common.copied', '已复制'));
  } catch (err) {
    console.error('Failed to copy IP address: ', err);
    uiNotificationsStore.showError(t('statusMonitor.copyIpError', '复制 IP 失败'));
  }
};
</script>

<template>
  <section class="status-shell">
    <header class="status-shell__header">
      <div>
        <div class="status-shell__eyebrow">
          <el-tag round effect="light" type="success">
            {{ t('statusMonitor.title', '服务器状态') }}
          </el-tag>
          <span v-if="activeSessionId" class="status-shell__session">{{ activeSessionId }}</span>
        </div>
        <h3>{{ t('statusMonitor.title', '服务器状态') }}</h3>
        <p>{{ displayOsName }}</p>
      </div>
    </header>

    <div v-if="!activeSessionId" class="status-shell__empty">
      <el-empty :description="t('layout.noActiveSession.title', '没有活动的会话')">
        <template #image>
          <i class="fas fa-plug text-4xl text-text-secondary"></i>
        </template>
      </el-empty>
    </div>

    <el-alert
      v-else-if="currentStatusError"
      :title="`${t('statusMonitor.errorPrefix')} ${currentStatusError}`"
      type="error"
      :closable="false"
      show-icon
    />

    <div v-else-if="!currentServerStatus" class="status-shell__empty">
      <el-skeleton :rows="7" animated />
    </div>

    <div v-else class="status-shell__body">
      <div class="control-stat-grid">
        <div v-for="stat in overviewStats" :key="stat.label" class="control-stat-card">
          <span class="control-stat-card__label">{{ stat.label }}</span>
          <span class="control-stat-card__value">{{ stat.value }}</span>
          <span class="control-stat-card__meta">{{ stat.meta }}</span>
        </div>
      </div>

      <el-card shadow="never" class="status-section">
        <template #header>
          <div class="status-section__title">{{ t('statusMonitor.title', '服务器状态') }}</div>
        </template>

        <div class="status-row" v-if="statusMonitorShowIpBoolean && sessionIpAddress">
          <span>{{ t('statusMonitor.ipLabel', 'IP 地址') }}</span>
          <button class="status-link" @click="copyIpToClipboard(sessionIpAddress)">
            {{ sessionIpAddress }}
          </button>
        </div>

        <div class="status-row">
          <span>{{ t('statusMonitor.cpuModelLabel') }}</span>
          <strong>{{ displayCpuModel }}</strong>
        </div>

        <div class="status-row">
          <span>{{ t('statusMonitor.osLabel') }}</span>
          <strong>{{ displayOsName }}</strong>
        </div>

        <div class="status-metric">
          <div class="status-metric__head">
            <span>{{ t('statusMonitor.cpuLabel') }}</span>
            <strong>{{ Math.round(displayCpuPercent) }}%</strong>
          </div>
          <el-progress
            :percentage="displayCpuPercent"
            :stroke-width="14"
            color="#3b82f6"
            :show-text="false"
            class="themed-progress"
            :class="{ 'no-transition': isSwitchingSession }"
          />
        </div>

        <div class="status-metric">
          <div class="status-metric__head">
            <span>{{ t('statusMonitor.memoryLabel') }}</span>
            <strong>{{ memDisplay }}</strong>
          </div>
          <el-progress
            :percentage="displayMemPercent"
            :stroke-width="14"
            color="#22c55e"
            :show-text="false"
            class="themed-progress"
            :class="{ 'no-transition': isSwitchingSession }"
          />
        </div>

        <div class="status-metric">
          <div class="status-metric__head">
            <span>{{ t('statusMonitor.swapLabel') }}</span>
            <strong>{{ swapDisplay }}</strong>
          </div>
          <el-progress
            :percentage="displaySwapPercent"
            :stroke-width="14"
            :color="(currentServerStatus?.swapPercent ?? 0) > 0 ? '#eab308' : '#94a3b8'"
            :show-text="false"
            class="themed-progress"
            :class="{ 'no-transition': isSwitchingSession }"
          />
        </div>

        <div class="status-metric">
          <div class="status-metric__head">
            <span>{{ t('statusMonitor.diskLabel') }}</span>
            <strong>{{ diskDisplay }}</strong>
          </div>
          <el-progress
            :percentage="displayDiskPercent"
            :stroke-width="14"
            color="#a855f7"
            :show-text="false"
            class="themed-progress"
            :class="{ 'no-transition': isSwitchingSession }"
          />
        </div>
      </el-card>

      <el-card shadow="never" class="status-section">
        <template #header>
          <div class="status-section__title">{{ t('statusMonitor.networkLabel', '网络') }}</div>
        </template>

        <div class="network-grid">
          <div class="network-card">
            <span class="network-card__label">
              <i class="fas fa-arrow-down"></i>
              {{ t('statusMonitor.networkLabel') }} / RX
            </span>
            <strong>{{ formatBytesPerSecond(currentServerStatus?.netRxRate) }}</strong>
            <small>{{ currentServerStatus?.netInterface || '--' }}</small>
          </div>

          <div class="network-card">
            <span class="network-card__label">
              <i class="fas fa-arrow-up"></i>
              {{ t('statusMonitor.networkLabel') }} / TX
            </span>
            <strong>{{ formatBytesPerSecond(currentServerStatus?.netTxRate) }}</strong>
            <small>{{ currentServerStatus?.netInterface || '--' }}</small>
          </div>
        </div>

        <div class="traffic-summary">
          <div class="traffic-summary__title">{{ t('statusMonitor.totalTrafficLabel', '开机累计流量') }}</div>
          <div class="traffic-summary__items">
            <div class="traffic-chip">
              <span><i class="fas fa-arrow-down"></i>{{ t('statusMonitor.downloadLabel', '下行') }}</span>
              <strong>{{ formatBytes(currentServerStatus?.netRxTotalBytes) }}</strong>
            </div>
            <div class="traffic-chip traffic-chip--upload">
              <span><i class="fas fa-arrow-up"></i>{{ t('statusMonitor.uploadLabel', '上行') }}</span>
              <strong>{{ formatBytes(currentServerStatus?.netTxTotalBytes) }}</strong>
            </div>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="status-section status-section--chart">
        <template #header>
          <div class="status-section__title">{{ t('statusMonitor.cpuUsageTitle', 'CPU 使用率') }}</div>
        </template>
        <StatusCharts :server-status="currentServerStatus" :active-session-id="activeSessionId" />
      </el-card>
    </div>
  </section>
</template>

<style scoped>
.status-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
  border: 1px solid rgba(103, 124, 155, 0.18);
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(243, 247, 252, 0.82));
  box-shadow: var(--shadow-card);
}

.status-shell__header h3 {
  margin: 0.8rem 0 0;
  font-family: var(--font-family-display);
  font-size: 1.2rem;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--text-color);
}

.status-shell__header p {
  margin: 0.55rem 0 0;
  color: var(--text-color-secondary);
  font-size: 0.84rem;
}

.status-shell__eyebrow {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.status-shell__session {
  color: var(--text-color-tertiary);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status-shell__empty {
  padding: 1rem 0;
}

.status-shell__body {
  display: grid;
  gap: 1rem;
}

.status-section {
  border-radius: 22px;
}

.status-section__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-color);
}

.status-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(103, 124, 155, 0.12);
}

.status-row:last-child {
  border-bottom: 0;
}

.status-row span {
  color: var(--text-color-secondary);
  font-size: 0.82rem;
}

.status-row strong {
  color: var(--text-color);
  font-size: 0.86rem;
  text-align: right;
}

.status-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--primary-color);
  font-weight: 600;
}

.status-metric {
  margin-top: 1rem;
}

.status-metric__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.55rem;
}

.status-metric__head span {
  color: var(--text-color-secondary);
  font-size: 0.82rem;
}

.status-metric__head strong {
  color: var(--text-color);
  font-size: 0.82rem;
}

.network-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.network-card {
  padding: 1rem;
  border: 1px solid rgba(103, 124, 155, 0.14);
  border-radius: 18px;
  background: rgba(247, 250, 253, 0.9);
}

.network-card__label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-color-tertiary);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.network-card strong {
  display: block;
  margin-top: 0.55rem;
  color: var(--text-color);
  font-size: 1rem;
}

.network-card small {
  display: block;
  margin-top: 0.4rem;
  color: var(--text-color-secondary);
}

.traffic-summary {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(103, 124, 155, 0.12);
}

.traffic-summary__title {
  color: var(--text-color-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.traffic-summary__items {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.8rem;
}

.traffic-chip {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem 0.95rem;
  border-radius: 18px;
  background: rgba(24, 190, 120, 0.08);
  color: #15915e;
}

.traffic-chip--upload {
  background: rgba(249, 115, 22, 0.08);
  color: #d97706;
}

.traffic-chip span {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
}

.traffic-chip strong {
  color: var(--text-color);
}

.status-section--chart :deep(.el-card__body) {
  min-height: 240px;
}

::v-deep(.el-progress-bar__outer) {
  background-color: rgba(226, 233, 244, 0.86) !important;
}

::v-deep(.themed-progress .el-progress-bar__inner) {
  transition: width 0.3s ease-in-out;
}

::v-deep(.themed-progress.no-transition .el-progress-bar__inner) {
  transition: none !important;
}

@media (max-width: 960px) {
  .network-grid {
    grid-template-columns: 1fr;
  }
}
</style>
