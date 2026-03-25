<template>
  <div class="status-monitor p-4 bg-background text-foreground h-full overflow-y-auto text-sm" :class="{ 'bg-header': !activeSessionId }">
    <h4 v-if="activeSessionId" class="mt-0 mb-4 border-b border-border pb-2 text-base font-medium">
      {{ t('statusMonitor.title') }}
    </h4>

    <div v-if="!activeSessionId" class="no-session-status flex flex-col items-center justify-center text-center text-text-secondary mt-4 h-full">
      <i class="fas fa-plug text-4xl mb-3 text-text-secondary"></i>
      <span class="text-lg font-medium mb-2">{{ t('layout.noActiveSession.title') }}</span>
    </div>

    <div v-else-if="currentStatusError" class="status-error flex flex-col items-center justify-center text-center text-red-500 mt-4 h-full">
      <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
      <span>{{ t('statusMonitor.errorPrefix') }} {{ currentStatusError }}</span>
    </div>

    <div v-else-if="!currentServerStatus" class="loading-status flex flex-col items-center justify-center text-center text-text-secondary mt-4 h-full">
      <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
      <span>{{ t('statusMonitor.loading') }}</span>
    </div>

    <template v-else>
      <div class="status-grid grid gap-3">
        <div v-if="statusMonitorShowIpBoolean && activeSessionId && sessionIpAddress" class="status-item grid grid-cols-[auto_1fr] items-center gap-3">
          <label class="font-semibold text-text-secondary text-left whitespace-nowrap">IP:</label>
          <div class="flex items-center">
            <span
              class="ip-address-value truncate text-left cursor-pointer hover:text-primary transition-colors"
              :title="sessionIpAddress"
              @click="copyIpToClipboard(sessionIpAddress)"
            >
              {{ sessionIpAddress }}
            </span>
          </div>
        </div>

        <div class="status-item grid grid-cols-[auto_1fr] items-center gap-3">
          <label class="font-semibold text-text-secondary text-left whitespace-nowrap">{{ t('statusMonitor.cpuModelLabel') }}</label>
          <span class="cpu-model-value truncate text-left" :title="displayCpuModel">{{ displayCpuModel }}</span>
        </div>

        <div class="status-item grid grid-cols-[auto_1fr] items-center gap-3">
          <label class="font-semibold text-text-secondary text-left whitespace-nowrap">{{ t('statusMonitor.osLabel') }}</label>
          <span class="os-name-value truncate text-left" :title="displayOsName">{{ displayOsName }}</span>
        </div>

        <div class="resource-monitor-group grid gap-3">
          <div class="status-item grid grid-cols-[40px_1fr] items-center gap-3">
            <label class="font-semibold text-text-secondary text-left whitespace-nowrap">{{ t('statusMonitor.cpuLabel') }}</label>
            <div class="value-wrapper flex items-center gap-2">
              <el-progress
                :percentage="displayCpuPercent"
                :stroke-width="16"
                color="#3b82f6"
                :show-text="true"
                :text-inside="true"
                :format="formatPercentageText"
                class="themed-progress flex-grow"
                :class="{ 'no-transition': isSwitchingSession }"
              />
            </div>
          </div>

          <div class="status-item grid grid-cols-[40px_1fr] items-center gap-3">
            <label class="font-semibold text-text-secondary text-left whitespace-nowrap">{{ t('statusMonitor.swapLabel') }}</label>
            <div class="value-wrapper flex items-center gap-2">
              <el-progress
                :percentage="displaySwapPercent"
                :stroke-width="16"
                :color="(currentServerStatus?.swapPercent ?? 0) > 0 ? '#eab308' : '#6b7280'"
                :show-text="true"
                :text-inside="true"
                :format="formatPercentageText"
                class="themed-progress flex-grow"
                :class="{ 'no-transition': isSwitchingSession }"
              />
              <span class="font-mono text-xs whitespace-nowrap text-left text-text-secondary">{{ swapDisplay }}</span>
            </div>
          </div>
        </div>

        <div class="status-cards grid gap-3">
          <section class="status-card">
            <div class="status-card__header">
              <div class="status-card__title-group">
                <span class="status-card__icon status-card__icon--memory">
                  <i class="fas fa-memory"></i>
                </span>
                <h5 class="status-card__title">{{ t('statusMonitor.memoryCardTitle') }}</h5>
              </div>
              <span class="status-card__badge">{{ memoryTotalDisplay }}</span>
            </div>

            <div class="memory-card__content">
              <div class="memory-ring" :style="memoryRingStyle">
                <div class="memory-ring__center">{{ memoryPercentDisplay }}</div>
              </div>

              <div class="memory-stats-grid">
                <div
                  v-for="item in memoryStatItems"
                  :key="item.key"
                  class="memory-stat"
                >
                  <div class="memory-stat__label">
                    <span class="memory-stat__dot" :class="`memory-stat__dot--${item.key}`"></span>
                    <span>{{ item.label }}</span>
                  </div>
                  <div class="memory-stat__value">{{ item.value }}</div>
                </div>
              </div>
            </div>
          </section>

          <section class="status-card">
            <div class="status-card__header">
              <div class="status-card__title-group">
                <span class="status-card__icon status-card__icon--disk">
                  <i class="fas fa-hdd"></i>
                </span>
                <h5 class="status-card__title">{{ t('statusMonitor.diskCardTitle') }}</h5>
              </div>
              <span class="status-card__badge">{{ diskUsageDisplay }}</span>
            </div>

            <div class="disk-meta-row">
              <span class="disk-device">
                <span class="memory-stat__dot memory-stat__dot--free"></span>
                <span>{{ diskDeviceDisplay }}</span>
              </span>
              <span class="disk-type">
                <span class="disk-type__label">{{ t('statusMonitor.diskTypeLabel') }}</span>
                <span class="disk-type__value">{{ diskFsTypeDisplay }}</span>
              </span>
            </div>

            <div class="disk-card__body">
              <div class="disk-usage-tube">
                <div class="disk-usage-tube__inner">
                  <div class="disk-usage-tube__fill" :style="diskUsageFillStyle"></div>
                </div>
              </div>

              <div class="disk-rate-grid">
                <div class="disk-rate-card">
                  <span class="disk-rate-card__label">{{ t('statusMonitor.diskReadRateLabel') }}</span>
                  <span class="disk-rate-card__value">{{ diskReadRateDisplay }}</span>
                </div>
                <div class="disk-rate-card">
                  <span class="disk-rate-card__label">{{ t('statusMonitor.diskWriteRateLabel') }}</span>
                  <span class="disk-rate-card__value">{{ diskWriteRateDisplay }}</span>
                </div>
              </div>
            </div>

            <div class="disk-table">
              <div class="disk-table__header">
                <span>{{ t('statusMonitor.diskMountLabel') }}</span>
                <span>{{ t('statusMonitor.diskSizeLabel') }}</span>
                <span>{{ t('statusMonitor.diskAvailableLabel') }}</span>
                <span>{{ t('statusMonitor.diskUsedPercentLabel') }}</span>
              </div>
              <div class="disk-table__row">
                <span class="disk-mount-pill">{{ diskMountPointDisplay }}</span>
                <span>{{ diskSizeDisplay }}</span>
                <span>{{ diskAvailableDisplay }}</span>
                <span class="disk-percent-pill">{{ diskPercentDisplay }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div v-if="activeSessionId && currentServerStatus" class="status-item grid grid-cols-[auto_1fr] items-center gap-3 mt-3">
        <label class="font-semibold text-text-secondary text-left whitespace-nowrap">{{ t('statusMonitor.networkLabel') }} ({{ currentServerStatus?.netInterface || '...' }}):</label>
        <div class="network-values flex items-center justify-start gap-4">
          <span class="rate down inline-flex items-center gap-1 text-green-500 text-xs whitespace-nowrap">
            <i class="fas fa-arrow-down w-3 text-center"></i>
            <span class="font-mono">{{ formatBytesPerSecond(currentServerStatus?.netRxRate) }}</span>
          </span>
          <span class="rate up inline-flex items-center gap-1 text-orange-500 text-xs whitespace-nowrap">
            <i class="fas fa-arrow-up w-3 text-center"></i>
            <span class="font-mono">{{ formatBytesPerSecond(currentServerStatus?.netTxRate) }}</span>
          </span>
        </div>
      </div>

      <div v-if="activeSessionId && currentServerStatus" class="status-item grid grid-cols-[auto_1fr] items-start gap-3 mt-2">
        <label class="font-semibold text-text-secondary text-left whitespace-nowrap">{{ t('statusMonitor.totalTrafficLabel') }}:</label>
        <div class="flex flex-col gap-1.5 text-xs">
          <span class="inline-flex items-center gap-2 whitespace-nowrap text-green-500">
            <i class="fas fa-arrow-down w-3 text-center"></i>
            <span>{{ t('statusMonitor.downloadLabel') }}</span>
            <span class="font-mono text-foreground">{{ formatBytes(currentServerStatus?.netRxTotalBytes) }}</span>
          </span>
          <span class="inline-flex items-center gap-2 whitespace-nowrap text-orange-500">
            <i class="fas fa-arrow-up w-3 text-center"></i>
            <span>{{ t('statusMonitor.uploadLabel') }}</span>
            <span class="font-mono text-foreground">{{ formatBytes(currentServerStatus?.netTxTotalBytes) }}</span>
          </span>
        </div>
      </div>

      <StatusCharts v-if="activeSessionId && currentServerStatus" :server-status="currentServerStatus" :active-session-id="activeSessionId" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type CSSProperties, type PropType, nextTick } from 'vue';
import { ElProgress } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
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

const formatPercentageText = (percentage: number): string => `${Math.round(percentage)}%`;

const props = defineProps({
  activeSessionId: {
    type: String as PropType<string | null>,
    required: false,
    default: null,
  },
});

const currentSessionState = computed(() => (props.activeSessionId ? sessions.value.get(props.activeSessionId) : null));
const currentServerStatus = computed<ServerStatus | null>(() => currentSessionState.value?.statusMonitorManager?.serverStatus?.value ?? null);

const displayCpuPercent = computed(() => currentServerStatus.value?.cpuPercent ?? 0);
const displaySwapPercent = computed(() => currentServerStatus.value?.swapPercent ?? 0);
const currentStatusError = computed<string | null>(() => currentSessionState.value?.statusMonitorManager?.statusError?.value ?? null);

const cachedCpuModel = ref<string | null>(null);
const cachedOsName = ref<string | null>(null);

watch(currentServerStatus, newData => {
  if (!newData) return;
  if (newData.cpuModel) {
    cachedCpuModel.value = newData.cpuModel;
  }
  if (newData.osName) {
    cachedOsName.value = newData.osName;
  }
}, { immediate: true });

watch(() => props.activeSessionId, async (newId, oldId) => {
  if (newId !== oldId) {
    isSwitchingSession.value = true;
    await nextTick();
    isSwitchingSession.value = false;
  }
});

const displayCpuModel = computed(() => (currentServerStatus.value?.cpuModel ?? cachedCpuModel.value) || t('statusMonitor.notAvailable'));
const displayOsName = computed(() => (currentServerStatus.value?.osName ?? cachedOsName.value) || t('statusMonitor.notAvailable'));

const formatBytesPerSecond = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return t('statusMonitor.notAvailable');
  if (bytes < 1024) return `${bytes} ${t('statusMonitor.bytesPerSecond')}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('statusMonitor.kiloBytesPerSecond')}`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('statusMonitor.megaBytesPerSecond')}`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ${t('statusMonitor.gigaBytesPerSecond')}`;
};

const formatBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return t('statusMonitor.notAvailable');
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('statusMonitor.megaBytes')}`;
  if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ${t('statusMonitor.gigaBytes')}`;
  return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`;
};

const formatCompactBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return t('statusMonitor.notAvailable');
  if (bytes < 1024) return `${bytes.toFixed(1)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatStorageSizeFromKb = (kb?: number, compact = false): string => {
  if (kb === undefined || kb === null || isNaN(kb)) return t('statusMonitor.notAvailable');
  const units = compact ? ['KB', 'M', 'G', 'T'] : ['KB', t('statusMonitor.megaBytes'), t('statusMonitor.gigaBytes'), 'TB'];
  let value = kb;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
};

const formatMemorySize = (mb?: number): string => {
  if (mb === undefined || mb === null || isNaN(mb)) return t('statusMonitor.notAvailable');
  if (mb < 1024) {
    return `${mb.toFixed(1)} ${t('statusMonitor.megaBytes')}`;
  }
  return `${(mb / 1024).toFixed(1)} ${t('statusMonitor.gigaBytes')}`;
};

const swapDisplay = computed(() => {
  const total = currentServerStatus.value?.swapTotal ?? 0;
  const used = currentServerStatus.value?.swapUsed ?? 0;
  if (total === 0) {
    return t('statusMonitor.swapNotAvailable');
  }
  return `${formatMemorySize(used)} / ${formatMemorySize(total)}`;
});

const memoryTotalValue = computed(() => currentServerStatus.value?.memTotal ?? 0);
const memoryUsedValue = computed(() => currentServerStatus.value?.memUsed ?? 0);
const memoryCachedValue = computed(() => currentServerStatus.value?.memCached ?? 0);
const memoryFreeValue = computed(() => {
  const data = currentServerStatus.value;
  if (data?.memFree !== undefined) {
    return data.memFree;
  }
  if (data?.memTotal !== undefined && data?.memUsed !== undefined) {
    return Math.max(data.memTotal - data.memUsed - (data.memCached ?? 0), 0);
  }
  return 0;
});

const memoryTotalDisplay = computed(() => formatMemorySize(currentServerStatus.value?.memTotal));
const memoryPercentDisplay = computed(() => `${Math.round(currentServerStatus.value?.memPercent ?? 0)}%`);

const memoryRingStyle = computed<CSSProperties>(() => {
  const total = memoryTotalValue.value;
  if (total <= 0) {
    return { background: 'conic-gradient(#2d3748 0% 100%)' };
  }

  const usedPercent = Math.min(100, (memoryUsedValue.value / total) * 100);
  const cachedPercent = Math.min(100 - usedPercent, (memoryCachedValue.value / total) * 100);
  const usedEnd = usedPercent;
  const cacheEnd = usedPercent + cachedPercent;

  return {
    background: `conic-gradient(#df5a5a 0 ${usedEnd}%, #8f96a3 ${usedEnd}% ${cacheEnd}%, #35b36f ${cacheEnd}% 100%)`,
  };
});

const memoryStatItems = computed(() => [
  { key: 'used', label: t('statusMonitor.memoryUsedStat'), value: formatMemorySize(memoryUsedValue.value) },
  { key: 'cached', label: t('statusMonitor.memoryCachedStat'), value: formatMemorySize(memoryCachedValue.value) },
  { key: 'free', label: t('statusMonitor.memoryFreeStat'), value: formatMemorySize(memoryFreeValue.value) },
]);

const diskUsageDisplay = computed(() => {
  const data = currentServerStatus.value;
  if (!data || data.diskUsed === undefined || data.diskTotal === undefined) {
    return t('statusMonitor.notAvailable');
  }
  return `${formatStorageSizeFromKb(data.diskUsed, true)} / ${formatStorageSizeFromKb(data.diskTotal, true)}`;
});

const diskUsageFillStyle = computed<CSSProperties>(() => ({
  height: `${Math.max(6, Math.min(100, currentServerStatus.value?.diskPercent ?? 0))}%`,
}));

const diskDeviceDisplay = computed(() => currentServerStatus.value?.diskDevice || t('statusMonitor.notAvailable'));
const diskFsTypeDisplay = computed(() => currentServerStatus.value?.diskFsType || t('statusMonitor.notAvailable'));
const diskReadRateDisplay = computed(() => formatCompactBytes(currentServerStatus.value?.diskReadRate));
const diskWriteRateDisplay = computed(() => formatCompactBytes(currentServerStatus.value?.diskWriteRate));
const diskMountPointDisplay = computed(() => currentServerStatus.value?.diskMountPoint || t('statusMonitor.notAvailable'));
const diskSizeDisplay = computed(() => formatStorageSizeFromKb(currentServerStatus.value?.diskTotal, true));
const diskAvailableDisplay = computed(() => formatStorageSizeFromKb(currentServerStatus.value?.diskAvailable, true));
const diskPercentDisplay = computed(() => `${Math.round(currentServerStatus.value?.diskPercent ?? 0)}%`);

const sessionIpAddress = computed(() => {
  const sessionState = currentSessionState.value;
  if (!sessionState?.connectionId) {
    return null;
  }

  const connectionIdAsNumber = parseInt(sessionState.connectionId, 10);
  if (isNaN(connectionIdAsNumber)) {
    return null;
  }

  const connectionInfo = connectionsStore.connections.find(conn => conn.id === connectionIdAsNumber);
  return connectionInfo?.host || null;
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

<style scoped>
::v-deep(.el-progress-bar__outer) {
  background-color: var(--header-bg-color) !important;
}

::v-deep(.themed-progress .el-progress-bar__inner) {
  transition: width 0.3s ease-in-out;
}

::v-deep(.themed-progress.no-transition .el-progress-bar__inner) {
  transition: none !important;
}

::v-deep(.el-progress-bar__innerText) {
  font-size: 10px;
  position: relative;
  top: -0.5px;
}

.status-card {
  background: linear-gradient(180deg, rgba(36, 39, 43, 0.96), rgba(28, 30, 34, 0.96));
  border: 1px solid rgba(103, 232, 149, 0.12);
  border-radius: 14px;
  padding: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.status-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.status-card__title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.status-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.status-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.08);
}

.status-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(74, 222, 128, 0.28);
  background: rgba(24, 70, 46, 0.35);
  color: #d1fae5;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.memory-card__content {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.memory-ring {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  padding: 2px;
}

.memory-ring::after {
  content: '';
  position: absolute;
  inset: 12px;
  border-radius: 999px;
  background: #16181c;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.memory-ring__center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  font-size: 12px;
  font-weight: 700;
  color: #f5f7fa;
}

.memory-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.memory-stat,
.disk-rate-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 8px 10px;
}

.memory-stat__label,
.disk-rate-card__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary-color, #9ca3af);
}

.memory-stat__value,
.disk-rate-card__value {
  display: block;
  margin-top: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 20px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.15;
}

.memory-stat__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.memory-stat__dot--used {
  background: #df5a5a;
}

.memory-stat__dot--cached {
  background: #8f96a3;
}

.memory-stat__dot--free {
  background: #35b36f;
}

.disk-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: var(--text-secondary-color, #9ca3af);
  font-size: 13px;
}

.disk-device {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #e5e7eb;
  font-weight: 600;
}

.disk-type {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.disk-type__value {
  color: #f59e0b;
  font-weight: 700;
}

.disk-card__body {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
  margin-bottom: 12px;
}

.disk-usage-tube {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 8px 0;
}

.disk-usage-tube__inner {
  position: relative;
  width: 20px;
  height: 68px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(210, 214, 219, 0.95));
  overflow: hidden;
}

.disk-usage-tube__fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(120, 187, 117, 0.88), rgba(98, 161, 95, 0.98));
}

.disk-rate-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.disk-table {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 10px;
}

.disk-table__header,
.disk-table__row {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1fr 0.9fr;
  gap: 8px;
  align-items: center;
}

.disk-table__header {
  color: var(--text-secondary-color, #9ca3af);
  font-size: 12px;
  margin-bottom: 8px;
}

.disk-table__row {
  color: #f8fafc;
  font-size: 13px;
}

.disk-mount-pill,
.disk-percent-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 8px;
  width: fit-content;
}

.disk-mount-pill {
  background: rgba(74, 222, 128, 0.08);
  color: #d1fae5;
  border: 1px solid rgba(74, 222, 128, 0.16);
}

.disk-percent-pill {
  background: rgba(34, 197, 94, 0.08);
  color: #dcfce7;
  border: 1px solid rgba(34, 197, 94, 0.18);
}

@media (max-width: 640px) {
  .memory-card__content,
  .disk-card__body {
    grid-template-columns: 1fr;
  }

  .memory-ring,
  .disk-usage-tube {
    justify-self: center;
  }

  .memory-stats-grid,
  .disk-rate-grid {
    grid-template-columns: 1fr;
  }

  .disk-meta-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .disk-table__header,
  .disk-table__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
