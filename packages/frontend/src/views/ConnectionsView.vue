<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS, ja } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import AddConnectionForm from '../components/AddConnectionForm.vue';
import BatchEditConnectionForm from '../components/BatchEditConnectionForm.vue';
import PageShell from '../components/PageShell.vue';
import { useConnectionsStore, type ConnectionInfo } from '../stores/connections.store';
import { useSessionStore } from '../stores/session.store';
import { useTagsStore, type TagInfo } from '../stores/tags.store';
import type { SortField, SortOrder } from '../stores/settings.store';
import { useConfirmDialog } from '../composables/useConfirmDialog';
import { useAlertDialog } from '../composables/useAlertDialog';

const { t, locale } = useI18n();
const { showConfirmDialog } = useConfirmDialog();
const { showAlertDialog } = useAlertDialog();
const connectionsStore = useConnectionsStore();
const sessionStore = useSessionStore();
const tagsStore = useTagsStore();

const { connections, isLoading: isLoadingConnections } = storeToRefs(connectionsStore);
const { tags, isLoading: isLoadingTags } = storeToRefs(tagsStore);

const LS_SORT_BY_KEY = 'connections_view_sort_by';
const LS_SORT_ORDER_KEY = 'connections_view_sort_order';
const LS_FILTER_TAG_KEY = 'connections_view_filter_tag';

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

const isBatchEditMode = ref(false);
const selectedConnectionIdsForBatch = ref<Set<number>>(new Set());
const showBatchEditForm = ref(false);
const isDeletingSelectedConnections = ref(false);

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
        const notesMatch = conn.notes?.toLowerCase().includes(query);
        return nameMatch || usernameMatch || hostMatch || portMatch || notesMatch;
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
    const currentLocale = locale.value;
    const langPart = currentLocale.split('-')[0];
    const targetLocale = dateFnsLocales[currentLocale] || dateFnsLocales[langPart] || enUS;

    return formatDistanceToNow(date, { addSuffix: true, locale: targetLocale });
  } catch (error) {
    console.error('格式化日期失败:', error);
    return String(timestampInSeconds);
  }
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

const totalSshConnections = computed(() => connections.value.filter((conn) => conn.type === 'SSH').length);
const totalTaggedConnections = computed(() => connections.value.filter((conn) => (conn.tag_ids?.length ?? 0) > 0).length);
const filteredSshConnections = computed(() => filteredAndSortedConnections.value.filter((conn) => conn.type === 'SSH').length);
const selectedConnectionsCount = computed(() => selectedConnectionIdsForBatch.value.size);

const connectionStats = computed(() => [
  {
    label: t('dashboard.connectionList', '连接列表'),
    value: connections.value.length,
    meta: `${filteredAndSortedConnections.value.length} ${t('common.filter', '筛选结果')}`,
  },
  {
    label: t('workspaceConnectionList.sshConnections', 'SSH 连接'),
    value: totalSshConnections.value,
    meta: `${filteredSshConnections.value} 当前筛选可批量测试`,
  },
  {
    label: t('settings.workspace.showConnectionTagsTitle', '连接标签'),
    value: tags.value.length,
    meta: `${totalTaggedConnections.value} ${t('dashboard.filterTags.all', '已关联标签')}`,
  },
  {
    label: t('connections.batchEdit.toggleLabel', '批量修改'),
    value: selectedConnectionsCount.value,
    meta: isBatchEditMode.value
      ? '选择多个连接后可批量编辑或删除'
      : t('workspace.workbench.quickCommands', '快捷管理入口'),
  },
]);

onMounted(async () => {
  if (connections.value.length === 0) {
    try {
      await connectionsStore.fetchConnections();
    } catch (error) {
      console.error('加载连接列表失败:', error);
    }
  }

  try {
    await tagsStore.fetchTags();
  } catch (error) {
    console.error('加载标签列表失败:', error);
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
  localStorage.setItem(LS_FILTER_TAG_KEY, newValue == null ? 'null' : String(newValue));
});

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

const toggleBatchEditMode = () => {
  isBatchEditMode.value = !isBatchEditMode.value;
  if (!isBatchEditMode.value) {
    selectedConnectionIdsForBatch.value.clear();
  }
};

const handleConnectionClick = (connId: number) => {
  if (!isBatchEditMode.value) return;

  if (selectedConnectionIdsForBatch.value.has(connId)) {
    selectedConnectionIdsForBatch.value.delete(connId);
  } else {
    selectedConnectionIdsForBatch.value.add(connId);
  }
};

const isConnectionSelectedForBatch = (connId: number): boolean => selectedConnectionIdsForBatch.value.has(connId);

const selectAllConnections = () => {
  if (!isBatchEditMode.value) return;
  filteredAndSortedConnections.value.forEach((conn) => selectedConnectionIdsForBatch.value.add(conn.id));
};

const deselectAllConnections = () => {
  if (!isBatchEditMode.value) return;
  selectedConnectionIdsForBatch.value.clear();
};

const invertSelection = () => {
  if (!isBatchEditMode.value) return;
  const allVisibleIds = new Set(filteredAndSortedConnections.value.map((conn) => conn.id));
  allVisibleIds.forEach((id) => {
    if (selectedConnectionIdsForBatch.value.has(id)) {
      selectedConnectionIdsForBatch.value.delete(id);
    } else {
      selectedConnectionIdsForBatch.value.add(id);
    }
  });
};

const openBatchEditModal = () => {
  if (selectedConnectionIdsForBatch.value.size === 0) {
    showAlertDialog({
      title: t('common.alert', '提示'),
      message: t('connections.batchEdit.noSelectionForEdit', '请至少选择一个连接进行编辑。'),
    });
    return;
  }

  showBatchEditForm.value = true;
};

const handleBatchEditSaved = async () => {
  showBatchEditForm.value = false;
  selectedConnectionIdsForBatch.value.clear();
  await connectionsStore.fetchConnections();
};

const handleBatchEditFormClose = () => {
  showBatchEditForm.value = false;
};

const handleBatchDeleteConnections = async () => {
  if (selectedConnectionIdsForBatch.value.size === 0 || isDeletingSelectedConnections.value) {
    return;
  }

  const confirmMessage = t(
    'connections.batchEdit.confirmMessage',
    { count: selectedConnectionIdsForBatch.value.size },
    `您确定要删除选中的 ${selectedConnectionIdsForBatch.value.size} 个连接吗？此操作无法撤销。`,
  );

  const confirmed = await showConfirmDialog({ message: confirmMessage });
  if (!confirmed) {
    return;
  }

  isDeletingSelectedConnections.value = true;
  try {
    const idsToDelete = Array.from(selectedConnectionIdsForBatch.value);
    await connectionsStore.deleteBatchConnections(idsToDelete);
    showAlertDialog({
      title: t('common.success', '成功'),
      message: t('connections.batchEdit.successMessage', '选中的连接已成功删除。'),
    });
    selectedConnectionIdsForBatch.value.clear();
    await connectionsStore.fetchConnections();
  } catch (error: any) {
    console.error('Batch delete connections error:', error);
    showAlertDialog({
      title: t('common.error'),
      message: t('connections.batchEdit.errorMessage', `批量删除连接失败: ${error.message || '未知错误'}`),
    });
  } finally {
    isDeletingSelectedConnections.value = false;
  }
};

interface ConnectionTestState {
  status: 'idle' | 'testing' | 'success' | 'error';
  resultText: string;
  latency?: number;
  latencyColor?: string;
}

const connectionTestStates = ref<Map<number, ConnectionTestState>>(new Map());
const isTestingAll = ref(false);
const isConnectingAll = ref(false);

const getLatencyColorString = (latencyMs?: number): string => {
  if (latencyMs === undefined) return 'inherit';
  if (latencyMs < 100) return 'var(--color-success, #4CAF50)';
  if (latencyMs < 300) return 'var(--color-warning, #ff9800)';
  return 'var(--color-error, #F44336)';
};

const handleTestSingleConnection = async (conn: ConnectionInfo) => {
  if (!conn.id || conn.type !== 'SSH') return;

  connectionTestStates.value.set(conn.id, {
    status: 'testing',
    resultText: t('connections.test.testingInProgress', '测试中...'),
  });

  try {
    const result = await connectionsStore.testConnection(conn.id);

    if (result.success) {
      const latencyMs = result.latency;
      const displayText = latencyMs !== undefined ? `${latencyMs}ms` : '';
      const determinedColor = latencyMs !== undefined ? getLatencyColorString(latencyMs) : getLatencyColorString(0);

      connectionTestStates.value.set(conn.id, {
        status: 'success',
        resultText: displayText,
        latency: latencyMs,
        latencyColor: determinedColor,
      });
      return;
    }

    connectionTestStates.value.set(conn.id, {
      status: 'error',
      resultText: result.message || t('connections.test.unknownError', '未知错误'),
    });
  } catch (error: any) {
    connectionTestStates.value.set(conn.id, {
      status: 'error',
      resultText: error.message || t('connections.test.unknownError', '未知错误'),
    });
  }
};

const handleTestAllFilteredConnections = async () => {
  if (isTestingAll.value || isLoadingConnections.value) return;

  const sshConnectionsToTest = filteredAndSortedConnections.value.filter((conn) => conn.type === 'SSH' && conn.id != null);
  if (sshConnectionsToTest.length === 0) {
    return;
  }

  isTestingAll.value = true;
  const testPromises = sshConnectionsToTest.map((conn) =>
    handleTestSingleConnection(conn).catch((error) => {
      console.error(`Error testing connection ${conn.id}:`, error);
      connectionTestStates.value.set(conn.id!, {
        status: 'error',
        resultText: t('connections.test.unknownErrorDuringBatch', '批量测试中发生错误'),
      });
    }),
  );

  try {
    await Promise.all(testPromises);
  } catch (error) {
    console.error('Error during batch testing of connections (Promise.all):', error);
  } finally {
    isTestingAll.value = false;
  }
};

const handleConnectAllFilteredConnections = async () => {
  if (isConnectingAll.value || isLoadingConnections.value) return;

  const sshConnectionsToConnect = filteredAndSortedConnections.value.filter((conn) => conn.type === 'SSH');
  if (sshConnectionsToConnect.length === 0) {
    console.warn(t('connections.messages.noSshConnectionsToConnectAll', '没有可连接的 SSH 筛选结果。'));
    return;
  }

  isConnectingAll.value = true;
  try {
    for (const conn of sshConnectionsToConnect) {
      connectTo(conn);
    }
  } catch (error) {
    console.error('Error connecting to all filtered SSH connections:', error);
  } finally {
    isConnectingAll.value = false;
  }
};

const getSingleTestButtonInfo = (connId: number | undefined, connType: string | undefined) => {
  const state = connId ? connectionTestStates.value.get(connId) : undefined;

  if (connType !== 'SSH') {
    return {
      textKey: 'connections.actions.test',
      iconClass: 'fas fa-plug',
      disabled: true,
      loading: false,
      title: t('connections.test.onlySshSupportedTest', '仅SSH连接支持测试。'),
    };
  }

  if (!connId) {
    return {
      textKey: 'connections.actions.test',
      iconClass: 'fas fa-plug',
      disabled: true,
      loading: false,
      title: '',
    };
  }

  if (state?.status === 'testing') {
    return {
      textKey: 'connections.actions.testing',
      iconClass: 'fas fa-spinner fa-spin',
      disabled: true,
      loading: true,
      title: t('connections.actions.testing', '测试中'),
    };
  }

  return {
    textKey: 'connections.actions.test',
    iconClass: 'fas fa-plug',
    disabled: false,
    loading: false,
    title: t('connections.actions.test', '测试'),
  };
};

const getTruncatedNotes = (notes: string | null | undefined): string => {
  if (!notes || notes.trim() === '') return '';
  const maxLength = 100;
  if (notes.length <= maxLength) return notes;
  return `${notes.substring(0, maxLength)}...`;
};

const getConnectionIconClass = (type: string | undefined) => {
  if (type === 'VNC') return 'fas fa-plug';
  if (type === 'RDP') return 'fas fa-desktop';
  return 'fas fa-server';
};
</script>

<template>
  <PageShell
    :title="t('nav.connections', '连接管理')"
    :subtitle="t('dashboard.controlCenterSubtitle', '用卡片控制面板统一管理连接、批量操作、连通性测试和快速接入。')"
  >
    <template #actions>
      <el-button
        plain
        :disabled="isTestingAll || isLoadingConnections || filteredSshConnections === 0"
        @click="handleTestAllFilteredConnections"
      >
        <i :class="['fas', isTestingAll ? 'fa-spinner fa-spin' : 'fa-stethoscope', 'mr-2']"></i>
        {{ t('connections.actions.testAllFiltered', '测试全部筛选的SSH连接') }}
      </el-button>

      <el-button
        plain
        :disabled="isConnectingAll || isLoadingConnections || filteredSshConnections === 0"
        @click="handleConnectAllFilteredConnections"
      >
        <i :class="['fas', isConnectingAll ? 'fa-spinner fa-spin' : 'fa-network-wired', 'mr-2']"></i>
        {{ t('workspaceConnectionList.connectAllSshInGroupMenu', '连接全部') }}
      </el-button>

      <el-button type="primary" @click="openAddConnectionForm">
        <i class="fas fa-plus mr-2"></i>
        {{ t('connections.addConnection', '添加新连接') }}
      </el-button>
    </template>

    <template #stats>
      <div class="control-stat-grid">
        <div v-for="stat in connectionStats" :key="stat.label" class="control-stat-card">
          <span class="control-stat-card__label">{{ stat.label }}</span>
          <span class="control-stat-card__value">{{ stat.value }}</span>
          <span class="control-stat-card__meta">{{ stat.meta }}</span>
        </div>
      </div>
    </template>

    <el-card shadow="never" class="control-panel">
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div class="text-lg font-semibold text-foreground">
                {{ t('dashboard.connectionList', '连接列表') }}
              </div>
              <div class="text-sm text-text-secondary">
                {{ filteredAndSortedConnections.length }} / {{ connections.length }}
                · {{ filteredSshConnections }} SSH
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <span class="text-sm font-medium text-text-secondary">
                {{ t('connections.batchEdit.toggleLabel', '批量修改') }}
              </span>
              <el-switch :model-value="isBatchEditMode" @change="toggleBatchEditMode" />
            </div>
          </div>

          <div class="control-toolbar grid gap-3 p-3 xl:grid-cols-[minmax(240px,1.15fr)_180px_180px_auto]">
            <el-input
              v-model="searchQuery"
              :placeholder="t('dashboard.searchConnectionsPlaceholder', '搜索连接...')"
              clearable
            >
              <template #prefix>
                <i class="fas fa-search text-text-secondary"></i>
              </template>
            </el-input>

            <el-select v-model="selectedTagId" clearable :disabled="isLoadingTags">
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

            <div class="flex items-center gap-3">
              <el-button plain @click="toggleSortOrder">
                <i :class="['fas', isAscending ? 'fa-arrow-up-a-z' : 'fa-arrow-down-z-a']"></i>
              </el-button>

              <el-tag effect="plain" round size="large">
                {{ isBatchEditMode ? '批量模式' : t('common.filter', '筛选中') }}
              </el-tag>
            </div>
          </div>
        </div>
      </template>

      <div
        v-if="isBatchEditMode"
        class="control-toolbar mb-4 flex flex-wrap items-center justify-between gap-3 p-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <el-button plain @click="selectAllConnections">
            {{ t('connections.batchEdit.selectAll', '全选') }}
          </el-button>
          <el-button plain @click="deselectAllConnections">
            {{ t('connections.batchEdit.deselectAll', '取消全选') }}
          </el-button>
          <el-button plain @click="invertSelection">
            {{ t('connections.batchEdit.invertSelection', '反选') }}
          </el-button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <el-tag effect="dark" round size="large">
            {{ selectedConnectionsCount }} {{ t('connections.batchEdit.editSelected', '已选中') }}
          </el-tag>
          <el-button type="primary" :disabled="selectedConnectionsCount === 0" @click="openBatchEditModal">
            <i class="fas fa-pen-to-square mr-2"></i>
            {{ t('connections.batchEdit.editSelected', '编辑选中') }}
          </el-button>
          <el-button
            type="danger"
            plain
            :loading="isDeletingSelectedConnections"
            :disabled="selectedConnectionsCount === 0 || isDeletingSelectedConnections"
            @click="handleBatchDeleteConnections"
          >
            <i class="fas fa-trash mr-2"></i>
            {{ t('connections.batchEdit.deleteSelectedButton', '删除选中') }}
          </el-button>
        </div>
      </div>

      <div v-if="isLoadingConnections && filteredAndSortedConnections.length === 0" class="control-empty">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else-if="filteredAndSortedConnections.length > 0" class="grid gap-4 2xl:grid-cols-2">
        <article
          v-for="conn in filteredAndSortedConnections"
          :key="conn.id"
          :class="[
            'relative overflow-hidden rounded-[24px] border border-border/60 bg-white/78 p-5 shadow-[0_18px_36px_rgba(24,38,67,0.08)] transition duration-200',
            isBatchEditMode ? 'cursor-pointer hover:border-primary/45 hover:bg-white/90' : 'hover:border-border-strong hover:bg-white/88',
            isBatchEditMode && isConnectionSelectedForBatch(conn.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#ecf1f7]' : '',
          ]"
          @click="handleConnectionClick(conn.id)"
        >
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-sky-400/70 to-emerald-400/70"></div>

          <div class="flex flex-col gap-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary"
                  >
                    <i :class="[getConnectionIconClass(conn.type), 'text-base']"></i>
                  </span>
                  <div class="min-w-0">
                    <div class="truncate text-base font-semibold text-foreground">
                      {{ conn.name || conn.host || t('connections.unnamedFallback', '未命名连接') }}
                    </div>
                    <div class="text-sm text-text-secondary">
                      {{ conn.username }}@{{ conn.host }}:{{ conn.port }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-end gap-2">
                <el-tag effect="plain" round>{{ conn.type }}</el-tag>
                <el-tag v-if="isBatchEditMode && isConnectionSelectedForBatch(conn.id)" type="primary" round>
                  {{ t('connections.batchEdit.editSelected', '已选中') }}
                </el-tag>
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="rounded-2xl border border-border/50 bg-muted/45 px-4 py-3">
                <div class="text-xs uppercase tracking-[0.12em] text-text-alt">
                  {{ t('dashboard.lastConnected', '上次连接') }}
                </div>
                <div class="mt-2 text-sm font-medium text-foreground">
                  {{ formatRelativeTime(conn.last_connected_at) }}
                </div>
              </div>

              <div class="rounded-2xl border border-border/50 bg-muted/45 px-4 py-3">
                <div class="text-xs uppercase tracking-[0.12em] text-text-alt">
                  {{ t('connections.form.notes', '备注') }}
                </div>
                <div class="mt-2 text-sm text-text-secondary">
                  {{ getTruncatedNotes(conn.notes) || t('common.none', '暂无备注') }}
                </div>
              </div>
            </div>

            <div v-if="getTagNames(conn.tag_ids).length > 0" class="flex flex-wrap gap-2">
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

            <div
              v-if="conn.type === 'SSH' && connectionTestStates.get(conn.id) && connectionTestStates.get(conn.id)?.status !== 'idle'"
              class="rounded-2xl border border-border/50 px-4 py-3"
              :class="{
                'bg-white/70 text-text-secondary': connectionTestStates.get(conn.id)?.status === 'testing',
                'bg-emerald-50/90': connectionTestStates.get(conn.id)?.status === 'success',
                'bg-rose-50/90 text-error': connectionTestStates.get(conn.id)?.status === 'error',
              }"
            >
              <div
                v-if="connectionTestStates.get(conn.id)?.status === 'testing'"
                class="flex items-center text-sm"
              >
                <i class="fas fa-spinner fa-spin mr-2"></i>
                {{ t('connections.test.testingInProgress', '测试中...') }}
              </div>

              <div
                v-else-if="connectionTestStates.get(conn.id)?.status === 'success'"
                class="flex items-center text-sm font-semibold"
                :style="{ color: connectionTestStates.get(conn.id)?.latencyColor || 'inherit' }"
              >
                <i class="fas fa-circle-check mr-2"></i>
                {{ connectionTestStates.get(conn.id)?.resultText || t('common.success', '成功') }}
              </div>

              <div v-else class="flex items-center text-sm font-semibold">
                <i class="fas fa-circle-xmark mr-2"></i>
                {{ t('connections.test.errorPrefix', '错误:') }} {{ connectionTestStates.get(conn.id)?.resultText }}
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-1">
              <el-button
                v-if="conn.type === 'SSH'"
                plain
                :disabled="isBatchEditMode || getSingleTestButtonInfo(conn.id, conn.type).disabled"
                @click.stop="handleTestSingleConnection(conn)"
              >
                <i :class="[getSingleTestButtonInfo(conn.id, conn.type).iconClass, 'mr-2']"></i>
                {{
                  getSingleTestButtonInfo(conn.id, conn.type).textKey !== 'connections.actions.testing'
                    ? t(getSingleTestButtonInfo(conn.id, conn.type).textKey)
                    : t('connections.actions.testing', '测试中')
                }}
              </el-button>

              <el-button plain :disabled="isBatchEditMode" @click.stop="openEditConnectionForm(conn)">
                <i class="fas fa-pen mr-2"></i>
                {{ t('connections.actions.edit') }}
              </el-button>

              <el-button type="primary" :disabled="isBatchEditMode" @click.stop="connectTo(conn)">
                <i class="fas fa-terminal mr-2"></i>
                {{ t('connections.actions.connect') }}
              </el-button>
            </div>
          </div>
        </article>
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

    <AddConnectionForm
      v-if="showAddEditConnectionForm"
      :connectionToEdit="connectionToEdit"
      @close="handleFormClose"
      @connection-added="handleConnectionModified"
      @connection-updated="handleConnectionModified"
    />

    <BatchEditConnectionForm
      v-if="showBatchEditForm"
      :visible="showBatchEditForm"
      :connection-ids="Array.from(selectedConnectionIdsForBatch)"
      @update:visible="handleBatchEditFormClose"
      @saved="handleBatchEditSaved"
    />
  </PageShell>
</template>
