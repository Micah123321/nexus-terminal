<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS, ja } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import AddConnectionForm from '../components/AddConnectionForm.vue';
import PageShell from '../components/PageShell.vue';
import { useConnectionsStore } from '../stores/connections.store';
import { useAuditLogStore } from '../stores/audit.store';
import { useSessionStore } from '../stores/session.store';
import { useTagsStore } from '../stores/tags.store';
import type { TagInfo } from '../stores/tags.store';
import type { ConnectionInfo } from '../stores/connections.store';
import type { SortField, SortOrder } from '../stores/settings.store';

const { t, locale } = useI18n();
const router = useRouter();
const connectionsStore = useConnectionsStore();
const auditLogStore = useAuditLogStore();
const sessionStore = useSessionStore();
const tagsStore = useTagsStore();

const { connections, isLoading: isLoadingConnections } = storeToRefs(connectionsStore);
const { logs: auditLogs, isLoading: isLoadingLogs, totalLogs } = storeToRefs(auditLogStore);
const { tags, isLoading: isLoadingTags } = storeToRefs(tagsStore);

const LS_SORT_BY_KEY = 'dashboard_connections_sort_by';
const LS_SORT_ORDER_KEY = 'dashboard_connections_sort_order';
const LS_FILTER_TAG_KEY = 'dashboard_connections_filter_tag';

const localSortBy = ref<SortField>((localStorage.getItem(LS_SORT_BY_KEY) as SortField) || 'last_connected_at');
const localSortOrder = ref<SortOrder>((localStorage.getItem(LS_SORT_ORDER_KEY) as SortOrder) || 'desc');

const getInitialSelectedTagId = (): number | null => {
  const storedValue = localStorage.getItem(LS_FILTER_TAG_KEY);
  return storedValue && storedValue !== 'null' ? parseInt(storedValue, 10) : null;
};

const selectedTagId = ref<number | null>(getInitialSelectedTagId());
const searchQuery = ref('');
const showAddEditConnectionForm = ref(false);
const connectionToEdit = ref<ConnectionInfo | null>(null);

const maxRecentLogs = 5;

const sortOptions: { value: SortField; labelKey: string }[] = [
  { value: 'last_connected_at', labelKey: 'dashboard.sortOptions.lastConnected' },
  { value: 'name', labelKey: 'dashboard.sortOptions.name' },
  { value: 'type', labelKey: 'dashboard.sortOptions.type' },
  { value: 'updated_at', labelKey: 'dashboard.sortOptions.updated' },
  { value: 'created_at', labelKey: 'dashboard.sortOptions.created' },
];

const filteredAndSortedConnections = computed(() => {
  const sortBy = localSortBy.value;
  const sortOrderVal = localSortOrder.value;
  const factor = sortOrderVal === 'desc' ? -1 : 1;
  const filterTagId = selectedTagId.value;
  const query = searchQuery.value.toLowerCase().trim();

  const filteredByTag =
    filterTagId === null
      ? [...connections.value]
      : connections.value.filter((conn) => conn.tag_ids?.includes(filterTagId));

  const searchedConnections = query
    ? filteredByTag.filter((conn) => {
        const nameMatch = conn.name?.toLowerCase().includes(query);
        const usernameMatch = conn.username?.toLowerCase().includes(query);
        const hostMatch = conn.host?.toLowerCase().includes(query);
        const portMatch = conn.port?.toString().includes(query);
        return nameMatch || usernameMatch || hostMatch || portMatch;
      })
    : filteredByTag;

  return searchedConnections.sort((a, b) => {
    let valA: string | number;
    let valB: string | number;

    switch (sortBy) {
      case 'name':
        valA = a.name || '';
        valB = b.name || '';
        return String(valA).localeCompare(String(valB)) * factor;
      case 'type':
        valA = a.type || '';
        valB = b.type || '';
        return String(valA).localeCompare(String(valB)) * factor;
      case 'created_at':
        valA = a.created_at ?? 0;
        valB = b.created_at ?? 0;
        return (Number(valA) - Number(valB)) * factor;
      case 'updated_at':
        valA = a.updated_at ?? 0;
        valB = b.updated_at ?? 0;
        return (Number(valA) - Number(valB)) * factor;
      case 'last_connected_at':
        valA = a.last_connected_at ?? (sortOrderVal === 'desc' ? -Infinity : Infinity);
        valB = b.last_connected_at ?? (sortOrderVal === 'desc' ? -Infinity : Infinity);
        if (valA === valB) return 0;
        return Number(valA) < Number(valB) ? -1 * factor : 1 * factor;
      default:
        return 0;
    }
  });
});

const recentAuditLogs = computed(() => auditLogs.value.slice(0, maxRecentLogs));

const dashboardStats = computed(() => {
  const taggedConnections = connections.value.filter((conn) => (conn.tag_ids?.length ?? 0) > 0).length;
  const sshConnections = connections.value.filter((conn) => conn.type === 'SSH').length;

  return [
    {
      label: t('dashboard.connectionList', '连接列表'),
      value: connections.value.length,
      meta: `${filteredAndSortedConnections.value.length} ${t('common.filter', '筛选')} / ${sshConnections} SSH`,
    },
    {
      label: t('settings.workspace.showConnectionTagsTitle', '连接标签'),
      value: tags.value.length,
      meta: `${taggedConnections} ${t('dashboard.filterTags.all', '已关联标签')}`,
    },
    {
      label: t('dashboard.recentActivity', '最近活动'),
      value: recentAuditLogs.value.length,
      meta: `${totalLogs.value} ${t('auditLog.title', '审计日志')}`,
    },
    {
      label: t('nav.terminal', '终端会话'),
      value: sessionStore.sessions.size,
      meta: t('workspace.workbench.label', '工作台已接入'),
    },
  ];
});

onMounted(async () => {
  if (connections.value.length === 0) {
    try {
      await connectionsStore.fetchConnections();
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  }

  try {
    await auditLogStore.fetchLogs({
      page: 1,
      limit: maxRecentLogs,
      sortOrder: 'desc',
      isDashboardRequest: true,
    });
  } catch (error) {
    console.error('Failed to load audit logs:', error);
  }

  try {
    await tagsStore.fetchTags();
  } catch (error) {
    console.error('Failed to load tags:', error);
  }
});

const connectTo = (connection: ConnectionInfo) => {
  sessionStore.handleConnectRequest(connection);
};

const toggleSortOrder = () => {
  localSortOrder.value = localSortOrder.value === 'asc' ? 'desc' : 'asc';
};

const isAscending = computed(() => localSortOrder.value === 'asc');

watch(localSortBy, (newValue) => {
  localStorage.setItem(LS_SORT_BY_KEY, newValue);
});

watch(localSortOrder, (newValue) => {
  localStorage.setItem(LS_SORT_ORDER_KEY, newValue);
});

watch(selectedTagId, (newValue) => {
  localStorage.setItem(LS_FILTER_TAG_KEY, newValue === null ? 'null' : String(newValue));
});

const dateFnsLocales: Record<string, Locale> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'ja-JP': ja,
  en: enUS,
  zh: zhCN,
  ja,
};

const formatRelativeTime = (timestampInSeconds: number | null | undefined): string => {
  if (!timestampInSeconds) return t('connections.status.never');

  try {
    const timestampInMs = timestampInSeconds * 1000;
    if (Number.isNaN(timestampInMs)) {
      return String(timestampInSeconds);
    }

    const date = new Date(timestampInMs);
    const currentI18nLocale = locale.value;
    const langPart = currentI18nLocale.split('-')[0];
    const targetLocale = dateFnsLocales[currentI18nLocale] || dateFnsLocales[langPart] || enUS;

    return formatDistanceToNow(date, { addSuffix: true, locale: targetLocale });
  } catch (error) {
    console.error('Failed to format date:', error);
    return String(timestampInSeconds);
  }
};

const getActionTranslation = (actionType: string): string => {
  const key = `auditLog.actions.${actionType}`;
  const translated = t(key);
  return translated === key ? actionType : translated;
};

const isFailedAction = (actionType: string): boolean => {
  const lowerCaseAction = actionType.toLowerCase();
  return lowerCaseAction.includes('fail') || lowerCaseAction.includes('error') || lowerCaseAction.includes('denied');
};

const getTagNames = (tagIds: number[] | undefined): string[] => {
  if (!tagIds || tagIds.length === 0) {
    return [];
  }

  const allTags = tags.value as TagInfo[];
  return tagIds
    .map((id) => allTags.find((tag) => tag.id === id)?.name)
    .filter((name): name is string => Boolean(name));
};

const openAddConnectionForm = () => {
  connectionToEdit.value = null;
  showAddEditConnectionForm.value = true;
};

const openEditConnectionForm = (conn: ConnectionInfo) => {
  connectionToEdit.value = conn;
  showAddEditConnectionForm.value = true;
};

const handleFormClose = () => {
  showAddEditConnectionForm.value = false;
  connectionToEdit.value = null;
};

const handleConnectionModified = async () => {
  showAddEditConnectionForm.value = false;
  connectionToEdit.value = null;
  await connectionsStore.fetchConnections();
};

const openConnectionsView = () => {
  router.push('/connections');
};

const openAuditLogsView = () => {
  router.push('/audit-logs');
};
</script>

<template>
  <PageShell
    :title="t('nav.dashboard')"
    :subtitle="t('dashboard.controlCenterSubtitle', '在一个控制中心里查看连接、审计和常用入口，快速进入工作区。')"
  >
    <template #actions>
      <el-button plain @click="openAuditLogsView">
        <i class="fas fa-shield-halved mr-2"></i>
        {{ t('dashboard.viewFullAuditLog', '查看完整审计日志') }}
      </el-button>
      <el-button type="primary" @click="openAddConnectionForm">
        <i class="fas fa-plus mr-2"></i>
        {{ t('connections.addConnection', '添加新连接') }}
      </el-button>
    </template>

    <template #stats>
      <div class="control-stat-grid">
        <div v-for="stat in dashboardStats" :key="stat.label" class="control-stat-card">
          <span class="control-stat-card__label">{{ stat.label }}</span>
          <span class="control-stat-card__value">{{ stat.value }}</span>
          <span class="control-stat-card__meta">{{ stat.meta }}</span>
        </div>
      </div>
    </template>

    <div class="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <el-card shadow="never" class="control-panel">
        <template #header>
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div class="text-lg font-semibold text-foreground">
                {{ t('dashboard.connectionList', '连接列表') }}
              </div>
              <div class="text-sm text-text-secondary">
                {{ filteredAndSortedConnections.length }} / {{ connections.length }}
              </div>
            </div>

            <div class="grid gap-2 md:grid-cols-[minmax(200px,1fr)_150px_160px_auto_auto]">
              <el-input
                v-model="searchQuery"
                :placeholder="t('dashboard.searchConnectionsPlaceholder', '搜索连接...')"
                clearable
              >
                <template #prefix>
                  <i class="fas fa-search text-text-secondary"></i>
                </template>
              </el-input>

              <el-select v-model="selectedTagId" :disabled="isLoadingTags" clearable>
                <el-option :label="t('dashboard.filterTags.all', '所有标签')" :value="null" />
                <el-option
                  v-for="tag in (tags as TagInfo[])"
                  :key="tag.id"
                  :label="tag.name"
                  :value="tag.id"
                />
              </el-select>

              <el-select v-model="localSortBy">
                <el-option
                  v-for="option in sortOptions"
                  :key="option.value"
                  :label="t(option.labelKey, option.value)"
                  :value="option.value"
                />
              </el-select>

              <el-button plain @click="toggleSortOrder">
                <i :class="['fas', isAscending ? 'fa-arrow-up-a-z' : 'fa-arrow-down-z-a']"></i>
              </el-button>

              <el-button plain @click="openConnectionsView">
                <i class="fas fa-layer-group mr-2"></i>
                {{ t('nav.connections') }}
              </el-button>
            </div>
          </div>
        </template>

        <div v-if="isLoadingConnections && filteredAndSortedConnections.length === 0" class="control-empty">
          <el-skeleton :rows="4" animated />
        </div>

        <div v-else-if="filteredAndSortedConnections.length > 0" class="grid gap-3">
          <el-card
            v-for="conn in filteredAndSortedConnections"
            :key="conn.id"
            shadow="hover"
            class="border border-border/50"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div class="min-w-0">
                <div class="flex items-center gap-2 text-base font-semibold text-foreground">
                  <i
                    :class="[
                      'fas',
                      conn.type === 'VNC' ? 'fa-plug' : conn.type === 'RDP' ? 'fa-desktop' : 'fa-server',
                      'text-primary',
                    ]"
                  ></i>
                  <span class="truncate">{{ conn.name || conn.host || t('connections.unnamedFallback', '未命名连接') }}</span>
                  <el-tag size="small" effect="plain">{{ conn.type }}</el-tag>
                </div>
                <div class="mt-2 text-sm text-text-secondary">
                  {{ conn.username }}@{{ conn.host }}:{{ conn.port }}
                </div>
                <div class="mt-2 text-xs text-text-secondary">
                  {{ t('dashboard.lastConnected', '上次连接:') }} {{ formatRelativeTime(conn.last_connected_at) }}
                </div>
                <div v-if="getTagNames(conn.tag_ids).length > 0" class="mt-3 flex flex-wrap gap-2">
                  <el-tag
                    v-for="tagName in getTagNames(conn.tag_ids)"
                    :key="tagName"
                    effect="plain"
                    round
                    size="small"
                  >
                    {{ tagName }}
                  </el-tag>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <el-button plain @click="openEditConnectionForm(conn)">
                  <i class="fas fa-pen mr-2"></i>
                  {{ t('connections.actions.edit') }}
                </el-button>
                <el-button type="primary" @click="connectTo(conn)">
                  <i class="fas fa-terminal mr-2"></i>
                  {{ t('connections.actions.connect') }}
                </el-button>
              </div>
            </div>
          </el-card>
        </div>

        <div v-else class="control-empty">
          <el-empty
            :description="
              searchQuery
                ? t('dashboard.noConnectionsMatchSearch', '没有连接匹配搜索条件')
                : selectedTagId !== null
                  ? t('dashboard.noConnectionsWithTag', '该标签下没有连接记录')
                  : t('dashboard.noConnections', '没有连接记录')
            "
          />
        </div>
      </el-card>

      <el-card shadow="never" class="control-panel">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-lg font-semibold text-foreground">
                {{ t('dashboard.recentActivity', '最近活动') }}
              </div>
              <div class="text-sm text-text-secondary">
                {{ t('auditLog.paginationInfo', { currentPage: 1, totalPages: 1, totalLogs }) }}
              </div>
            </div>
            <el-button plain @click="openAuditLogsView">
              {{ t('auditLog.title', '审计日志') }}
            </el-button>
          </div>
        </template>

        <div v-if="isLoadingLogs && recentAuditLogs.length === 0" class="control-empty">
          <el-skeleton :rows="5" animated />
        </div>

        <div v-else-if="recentAuditLogs.length > 0" class="grid gap-3">
          <el-card
            v-for="log in recentAuditLogs"
            :key="log.id"
            shadow="never"
            class="border border-border/50 bg-white/70"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div
                  class="text-sm font-semibold"
                  :class="isFailedAction(log.action_type) ? 'text-error' : 'text-foreground'"
                >
                  {{ getActionTranslation(log.action_type) }}
                </div>
                <div class="mt-2 text-sm leading-6 text-text-secondary break-words">
                  {{ log.details }}
                </div>
              </div>
              <el-tag size="small" effect="plain">
                {{ formatRelativeTime(log.timestamp) }}
              </el-tag>
            </div>
          </el-card>
        </div>

        <div v-else class="control-empty">
          <el-empty :description="t('dashboard.noRecentActivity', '没有最近活动记录')" />
        </div>
      </el-card>
    </div>

    <AddConnectionForm
      v-if="showAddEditConnectionForm"
      :connectionToEdit="connectionToEdit"
      @close="handleFormClose"
      @connection-added="handleConnectionModified"
      @connection-updated="handleConnectionModified"
    />
  </PageShell>
</template>
