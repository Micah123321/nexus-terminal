<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ja, zhCN } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import AddConnectionForm from '../components/AddConnectionForm.vue';
import DashboardOverviewPanel from '../components/DashboardOverviewPanel.vue';
import { useAuditLogStore } from '../stores/audit.store';
import { useConnectionsStore, type ConnectionInfo } from '../stores/connections.store';
import { useDashboardStore } from '../stores/dashboard.store';
import { useSessionStore } from '../stores/session.store';
import { useTagsStore, type TagInfo } from '../stores/tags.store';
import type { AuditLogEntry } from '../types/server.types';
import type { SortField, SortOrder } from '../stores/settings.store';

const { t, locale } = useI18n();

const connectionsStore = useConnectionsStore();
const auditLogStore = useAuditLogStore();
const dashboardStore = useDashboardStore();
const sessionStore = useSessionStore();
const tagsStore = useTagsStore();

const { connections, isLoading: isLoadingConnections } = storeToRefs(connectionsStore);
const { logs: auditLogs, isLoading: isLoadingLogs } = storeToRefs(auditLogStore);
const { summary, isLoading: isLoadingSummary, error: dashboardError } = storeToRefs(dashboardStore);
const { tags, isLoading: isLoadingTags } = storeToRefs(tagsStore);

const LS_SORT_BY_KEY = 'dashboard_connections_sort_by';
const LS_SORT_ORDER_KEY = 'dashboard_connections_sort_order';
const LS_FILTER_TAG_KEY = 'dashboard_connections_filter_tag';
const MAX_RECENT_LOGS = 5;
const MAX_VISIBLE_CONNECTIONS = 8;

const localSortBy = ref<SortField>((localStorage.getItem(LS_SORT_BY_KEY) as SortField) || 'last_connected_at');
const localSortOrder = ref<SortOrder>((localStorage.getItem(LS_SORT_ORDER_KEY) as SortOrder) || 'desc');
const selectedTagId = ref<number | null>(getInitialSelectedTagId());
const searchQuery = ref('');
const showAddEditConnectionForm = ref(false);
const connectionToEdit = ref<ConnectionInfo | null>(null);

const dateFnsLocales: Record<string, Locale> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'ja-JP': ja,
  en: enUS,
  zh: zhCN,
  ja,
};

const sortOptions: { value: SortField; labelKey: string }[] = [
  { value: 'last_connected_at', labelKey: 'dashboard.sortOptions.lastConnected' },
  { value: 'name', labelKey: 'dashboard.sortOptions.name' },
  { value: 'type', labelKey: 'dashboard.sortOptions.type' },
  { value: 'updated_at', labelKey: 'dashboard.sortOptions.updated' },
  { value: 'created_at', labelKey: 'dashboard.sortOptions.created' },
];

function getInitialSelectedTagId(): number | null {
  const storedValue = localStorage.getItem(LS_FILTER_TAG_KEY);
  return storedValue && storedValue !== 'null' ? parseInt(storedValue, 10) : null;
}

const recentAuditLogs = computed(() => auditLogs.value.slice(0, MAX_RECENT_LOGS));

const filteredAndSortedConnections = computed(() => {
  const factor = localSortOrder.value === 'desc' ? -1 : 1;
  const query = searchQuery.value.toLowerCase().trim();
  const filterTagId = selectedTagId.value;

  let filtered = filterTagId === null
    ? [...connections.value]
    : connections.value.filter((connection) => connection.tag_ids?.includes(filterTagId));

  if (query) {
    filtered = filtered.filter((connection) => {
      const nameMatch = connection.name?.toLowerCase().includes(query);
      const usernameMatch = connection.username?.toLowerCase().includes(query);
      const hostMatch = connection.host?.toLowerCase().includes(query);
      const portMatch = connection.port?.toString().includes(query);
      return nameMatch || usernameMatch || hostMatch || portMatch;
    });
  }

  return filtered.sort((left, right) => {
    switch (localSortBy.value) {
      case 'name':
        return (left.name || '').localeCompare(right.name || '') * factor;
      case 'type':
        return (left.type || '').localeCompare(right.type || '') * factor;
      case 'created_at':
        return ((left.created_at ?? 0) - (right.created_at ?? 0)) * factor;
      case 'updated_at':
        return ((left.updated_at ?? 0) - (right.updated_at ?? 0)) * factor;
      case 'last_connected_at': {
        const leftValue = left.last_connected_at ?? (localSortOrder.value === 'desc' ? -Infinity : Infinity);
        const rightValue = right.last_connected_at ?? (localSortOrder.value === 'desc' ? -Infinity : Infinity);
        if (leftValue === rightValue) {
          return 0;
        }
        return leftValue < rightValue ? -1 * factor : 1 * factor;
      }
      default:
        return 0;
    }
  });
});

const visibleConnections = computed(() => filteredAndSortedConnections.value.slice(0, MAX_VISIBLE_CONNECTIONS));
const isAscending = computed(() => localSortOrder.value === 'asc');

const connectionsById = computed(() => {
  const map = new Map<number, ConnectionInfo>();
  for (const connection of connections.value) {
    map.set(connection.id, connection);
  }
  return map;
});

const topConnections = computed(() => {
  if (!summary.value) {
    return [] as Array<{ connectionId: number; connectionName: string; host: string; count: number; lastSeenAt: number; connection: ConnectionInfo | null }>;
  }

  return summary.value.topConnections.map((item) => ({
    ...item,
    connection: connectionsById.value.get(item.connectionId) ?? null,
  }));
});

function resolveDateFnsLocale(): Locale {
  return dateFnsLocales[locale.value] || dateFnsLocales[locale.value.split('-')[0]] || enUS;
}

function formatRelativeTime(timestampInSeconds: number | null | undefined): string {
  if (!timestampInSeconds) {
    return t('connections.status.never');
  }

  try {
    return formatDistanceToNow(new Date(timestampInSeconds * 1000), {
      addSuffix: true,
      locale: resolveDateFnsLocale(),
    });
  } catch (error) {
    console.error('[Dashboard] Failed to format relative time:', error);
    return String(timestampInSeconds);
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value);
}

function getActionTranslation(actionType: string): string {
  const key = `auditLog.actions.${actionType}`;
  const translated = t(key);
  return translated === key ? actionType : translated;
}

function isFailedAction(actionType: string): boolean {
  const lowerCaseAction = actionType.toLowerCase();
  return lowerCaseAction.includes('fail') || lowerCaseAction.includes('error') || lowerCaseAction.includes('denied');
}

function getTagNames(tagIds: number[] | undefined): string[] {
  if (!tagIds || tagIds.length === 0) {
    return [];
  }

  const allTags = tags.value as TagInfo[];
  return tagIds
    .map((id) => allTags.find((tag) => tag.id === id)?.name)
    .filter((name): name is string => !!name);
}

function formatAuditDetails(details: AuditLogEntry['details']): string {
  if (!details) {
    return '-';
  }

  if ('raw' in details) {
    return details.raw;
  }

  const formattedEntries = Object.entries(details)
    .filter(([key]) => !['userId', 'sessionId'].includes(key))
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${formatAuditDetailValue(value)}`);

  return formattedEntries.length > 0 ? formattedEntries.join(' | ') : JSON.stringify(details);
}

function formatAuditDetailValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function connectTo(connection: ConnectionInfo | null | undefined): void {
  if (connection) {
    sessionStore.handleConnectRequest(connection);
  }
}

function toggleSortOrder(): void {
  localSortOrder.value = localSortOrder.value === 'asc' ? 'desc' : 'asc';
}

function openAddConnectionForm(): void {
  connectionToEdit.value = null;
  showAddEditConnectionForm.value = true;
}

function openEditConnectionForm(connection: ConnectionInfo): void {
  connectionToEdit.value = connection;
  showAddEditConnectionForm.value = true;
}

function handleFormClose(): void {
  showAddEditConnectionForm.value = false;
  connectionToEdit.value = null;
}

async function handleConnectionModified(): Promise<void> {
  showAddEditConnectionForm.value = false;
  connectionToEdit.value = null;
  await connectionsStore.fetchConnections();
  await dashboardStore.fetchSummary();
}

watch(localSortBy, (newValue) => {
  localStorage.setItem(LS_SORT_BY_KEY, newValue);
});

watch(localSortOrder, (newValue) => {
  localStorage.setItem(LS_SORT_ORDER_KEY, newValue);
});

watch(selectedTagId, (newValue) => {
  localStorage.setItem(LS_FILTER_TAG_KEY, newValue === null ? 'null' : String(newValue));
});

onMounted(async () => {
  await Promise.allSettled([
    connectionsStore.fetchConnections(),
    auditLogStore.fetchLogs({
      page: 1,
      limit: MAX_RECENT_LOGS,
      sortOrder: 'desc',
      isDashboardRequest: true,
    }),
    tagsStore.fetchTags(),
    dashboardStore.fetchSummary(),
  ]);
});
</script>

<template>
  <div class="space-y-6 bg-background p-4 text-foreground md:p-6 lg:p-8">
    <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold">{{ t('nav.dashboard') }}</h1>
        <p class="text-sm text-text-secondary">{{ t('dashboard.summaryHints.connections') }}</p>
      </div>
      <span class="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-text-secondary">
        <i class="fas fa-chart-line text-sky-400"></i>
        {{ t('dashboard.charts.activityTrend7d') }}
      </span>
    </div>

    <DashboardOverviewPanel
      :summary="summary"
      :is-loading="isLoadingSummary"
      :error="dashboardError"
      :top-connections="topConnections"
      @connect="connectTo"
    />

    <section class="rounded-xl border border-border bg-card shadow-sm">
      <div class="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-lg font-medium">
            {{ t('dashboard.connectionList') }} ({{ formatNumber(filteredAndSortedConnections.length) }})
          </h2>
          <p class="text-sm text-text-secondary">
            {{ t('dashboard.listShowing', { count: Math.min(filteredAndSortedConnections.length, MAX_VISIBLE_CONNECTIONS) }) }}
          </p>
        </div>
        <div class="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('dashboard.searchConnectionsPlaceholder')"
            class="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-52"
          />
          <div class="flex items-center gap-2">
            <select
              v-model="selectedTagId"
              class="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              :disabled="isLoadingTags"
            >
              <option :value="null">{{ t('dashboard.filterTags.all') }}</option>
              <option v-if="isLoadingTags" disabled>{{ t('common.loading') }}</option>
              <option v-for="tag in (tags as TagInfo[])" :key="tag.id" :value="tag.id">
                {{ tag.name }}
              </option>
            </select>
            <select
              v-model="localSortBy"
              class="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ t(option.labelKey) }}
              </option>
            </select>
            <button
              class="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
              :aria-label="isAscending ? t('common.sortAscending') : t('common.sortDescending')"
              :title="isAscending ? t('common.sortAscending') : t('common.sortDescending')"
              @click="toggleSortOrder"
            >
              <i :class="['fas', isAscending ? 'fa-arrow-up-a-z' : 'fa-arrow-down-z-a']"></i>
            </button>
            <button
              class="flex h-9 w-9 items-center justify-center rounded-md bg-button text-button-text shadow-sm hover:bg-button-hover"
              title="Add Connection"
              @click="openAddConnectionForm"
            >
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="p-4">
        <div v-if="isLoadingConnections && visibleConnections.length === 0" class="text-center text-text-secondary">
          {{ t('common.loading') }}
        </div>
        <ul v-else-if="visibleConnections.length > 0" class="space-y-3">
          <li
            v-for="connection in visibleConnections"
            :key="connection.id"
            class="flex flex-col gap-3 rounded-lg border border-border/70 bg-header/40 p-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <i
                  :class="[
                    'fas',
                    connection.type === 'VNC' ? 'fa-plug' : connection.type === 'RDP' ? 'fa-desktop' : 'fa-server',
                    'w-4 text-text-secondary',
                  ]"
                ></i>
                <span class="truncate font-medium">
                  {{ connection.name || connection.host || t('connections.unnamedFallback') }}
                </span>
              </div>
              <p class="truncate text-sm text-text-secondary">
                {{ connection.username }}@{{ connection.host }}:{{ connection.port }}
              </p>
              <p class="text-xs text-text-alt">
                {{ t('dashboard.lastConnected') }} {{ formatRelativeTime(connection.last_connected_at) }}
              </p>
              <div v-if="getTagNames(connection.tag_ids).length > 0" class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="tagName in getTagNames(connection.tag_ids)"
                  :key="tagName"
                  class="rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                >
                  {{ tagName }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                @click="openEditConnectionForm(connection)"
              >
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button
                class="rounded-md bg-button px-4 py-2 text-sm font-medium text-button-text shadow-sm hover:bg-button-hover"
                @click="connectTo(connection)"
              >
                {{ t('connections.actions.connect') }}
              </button>
            </div>
          </li>
        </ul>
        <div v-else-if="!isLoadingConnections && searchQuery" class="text-center text-text-secondary">
          {{ t('dashboard.noConnectionsMatchSearch') }}
        </div>
        <div v-else-if="!isLoadingConnections && selectedTagId !== null" class="text-center text-text-secondary">
          {{ t('dashboard.noConnectionsWithTag') }}
        </div>
        <div v-else class="text-center text-text-secondary">
          {{ t('dashboard.noConnections') }}
        </div>
      </div>
      <div class="border-t border-border px-4 py-3 text-right">
        <RouterLink :to="{ name: 'Connections' }" class="text-sm text-link hover:text-link-hover hover:underline">
          {{ t('dashboard.viewAllConnections') }}
        </RouterLink>
      </div>
    </section>

    <section class="rounded-xl border border-border bg-card shadow-sm">
      <div class="border-b border-border px-4 py-3">
        <h2 class="text-lg font-medium">{{ t('dashboard.recentActivity') }}</h2>
      </div>
      <div class="p-4">
        <div v-if="isLoadingLogs && recentAuditLogs.length === 0" class="text-center text-text-secondary">
          {{ t('common.loading') }}
        </div>
        <ul v-else-if="recentAuditLogs.length > 0" class="space-y-3">
          <li
            v-for="log in recentAuditLogs"
            :key="log.id"
            class="rounded-lg border border-border/70 bg-header/40 p-3"
          >
            <div class="mb-1 flex items-start justify-between gap-2">
              <span class="text-sm font-medium" :class="{ 'text-error': isFailedAction(log.action_type) }">
                {{ getActionTranslation(log.action_type) }}
              </span>
              <span class="shrink-0 text-xs text-text-alt">
                {{ formatRelativeTime(log.timestamp) }}
              </span>
            </div>
            <p class="break-words text-sm text-text-secondary">
              {{ formatAuditDetails(log.details) }}
            </p>
          </li>
        </ul>
        <div v-else class="text-center text-text-secondary">
          {{ t('dashboard.noRecentActivity') }}
        </div>
      </div>
      <div class="border-t border-border px-4 py-3 text-right">
        <RouterLink :to="{ name: 'AuditLogs' }" class="text-sm text-link hover:text-link-hover hover:underline">
          {{ t('dashboard.viewFullAuditLog') }}
        </RouterLink>
      </div>
    </section>

    <AddConnectionForm
      v-if="showAddEditConnectionForm"
      :connectionToEdit="connectionToEdit"
      @close="handleFormClose"
      @connection-added="handleConnectionModified"
      @connection-updated="handleConnectionModified"
    />
  </div>
</template>
