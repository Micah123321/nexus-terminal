<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AddConnectionForm from '../components/AddConnectionForm.vue';
import BatchEditConnectionForm from '../components/BatchEditConnectionForm.vue';
import { useConnectionsStore } from '../stores/connections.store';
import { useSessionStore } from '../stores/session.store';
import { useTagsStore } from '../stores/tags.store';
import type { TagInfo } from '../stores/tags.store';
import type { SortField, SortOrder } from '../stores/settings.store';
import { useI18n } from 'vue-i18n';
import type { ConnectionInfo } from '../stores/connections.store';
import { useConfirmDialog } from '../composables/useConfirmDialog';
import { useAlertDialog } from '../composables/useAlertDialog';
import { storeToRefs } from 'pinia';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS, ja } from 'date-fns/locale';
import type { Locale } from 'date-fns';

type ConnectionTypeFilter = 'ALL' | 'SSH' | 'RDP' | 'VNC';
type ScopeId = 'all' | 'untagged' | `tag:${number}` | `group:${string}`;
type ConnectionSortField = SortField | 'host';

interface ScopeNode {
  id: ScopeId;
  label: string;
  count: number;
}

interface TagTreeNode extends ScopeNode {
  fullLabel: string;
  level: number;
  expandable: boolean;
  children: TagTreeNode[];
}

interface ConnectionTestState {
  status: 'idle' | 'testing' | 'success' | 'error';
  resultText: string;
  latency?: number;
  latencyColor?: string;
}

const { t, locale } = useI18n();
const { showConfirmDialog } = useConfirmDialog();
const { showAlertDialog } = useAlertDialog();
const connectionsStore = useConnectionsStore();
const sessionStore = useSessionStore();
const tagsStore = useTagsStore();

const { connections, isLoading: isLoadingConnections } = storeToRefs(connectionsStore);
const { tags } = storeToRefs(tagsStore);

const LS_SORT_BY_KEY = 'connections_view_sort_by';
const LS_SORT_ORDER_KEY = 'connections_view_sort_order';
const LS_FILTER_TAG_KEY = 'connections_view_filter_tag';
const LS_FILTER_SCOPE_KEY = 'connections_view_filter_scope';
const LS_TYPE_FILTER_KEY = 'connections_view_type_filter';

const localSortBy = ref<ConnectionSortField>((localStorage.getItem(LS_SORT_BY_KEY) as ConnectionSortField) || 'last_connected_at');
const localSortOrder = ref<SortOrder>(localStorage.getItem(LS_SORT_ORDER_KEY) as SortOrder || 'desc');

const getInitialSelectedScope = (): ScopeId => {
  const storedScope = localStorage.getItem(LS_FILTER_SCOPE_KEY);
  if (
    storedScope === 'all' ||
    storedScope === 'untagged' ||
    storedScope?.startsWith('tag:') ||
    storedScope?.startsWith('group:')
  ) {
    return storedScope as ScopeId;
  }

  const legacyTagValue = localStorage.getItem(LS_FILTER_TAG_KEY);
  if (legacyTagValue && legacyTagValue !== 'null') {
    const parsedTagId = parseInt(legacyTagValue, 10);
    if (!Number.isNaN(parsedTagId)) {
      return `tag:${parsedTagId}`;
    }
  }

  return 'all';
};

const selectedScope = ref<ScopeId>(getInitialSelectedScope());
const activeTypeFilter = ref<ConnectionTypeFilter>((localStorage.getItem(LS_TYPE_FILTER_KEY) as ConnectionTypeFilter) || 'ALL');
const searchQuery = ref('');
const treeSearchQuery = ref('');
const tagsSectionExpanded = ref(true);

const showAddEditConnectionForm = ref(false);
const connectionToEdit = ref<ConnectionInfo | null>(null);

const isBatchEditMode = ref(false);
const selectedConnectionIdsForBatch = ref<Set<number>>(new Set());
const showBatchEditForm = ref(false);
const isDeletingSelectedConnections = ref(false);
const expandedTreeNodes = ref<Record<string, boolean>>({});
const hoveredTreeNodeId = ref<ScopeId | null>(null);
const draggingTreeNodeId = ref<ScopeId | null>(null);
const dropTargetTreeNodeId = ref<ScopeId | null>(null);
const treeDragNoticeVisible = ref(false);

const connectionTestStates = ref<Map<number, ConnectionTestState>>(new Map());
const isTestingAll = ref(false);
const isConnectingAll = ref(false);
const moreMenuOpenForId = ref<number | null>(null);

const sortOptions: { value: ConnectionSortField; labelKey: string }[] = [
  { value: 'last_connected_at', labelKey: 'dashboard.sortOptions.lastConnected' },
  { value: 'name', labelKey: 'dashboard.sortOptions.name' },
  { value: 'host', labelKey: 'connections.table.host' },
  { value: 'type', labelKey: 'dashboard.sortOptions.type' },
  { value: 'updated_at', labelKey: 'dashboard.sortOptions.updated' },
  { value: 'created_at', labelKey: 'dashboard.sortOptions.created' },
];

const TREE_EXPANDED_STORAGE_KEY = 'connections_view_tree_expanded';
const tagPathSeparatorRegex = /\s*(?:\/|>|\\)\s*/;

const normalizedSearchQuery = computed(() => searchQuery.value.toLowerCase().trim());
const normalizedTreeSearchQuery = computed(() => treeSearchQuery.value.toLowerCase().trim());

const loadInitialExpandedTreeState = (): Record<string, boolean> => {
  try {
    const rawValue = localStorage.getItem(TREE_EXPANDED_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    console.error('读取连接管理树展开状态失败:', error);
    localStorage.removeItem(TREE_EXPANDED_STORAGE_KEY);
    return {};
  }
};

expandedTreeNodes.value = loadInitialExpandedTreeState();

const tagLookup = computed(() => {
  const map = new Map<number, TagInfo>();
  (tags.value as TagInfo[]).forEach((tag) => {
    map.set(tag.id, tag);
  });
  return map;
});

const getConnectionTagNames = (conn: ConnectionInfo): string[] => {
  if (!conn.tag_ids?.length) {
    return [];
  }

  return conn.tag_ids
    .map((tagId) => tagLookup.value.get(tagId)?.name)
    .filter((tagName): tagName is string => Boolean(tagName));
};

const getTagPathSegments = (tagName: string): string[] => {
  return tagName
    .split(tagPathSeparatorRegex)
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const encodeGroupScopeId = (pathKey: string): ScopeId => {
  return `group:${encodeURIComponent(pathKey)}`;
};

const decodeGroupScopeId = (scopeId: ScopeId): string => {
  return decodeURIComponent(scopeId.replace('group:', ''));
};

const matchesSearchQuery = (conn: ConnectionInfo, query: string): boolean => {
  if (!query) {
    return true;
  }

  const haystacks = [
    conn.name,
    conn.host,
    conn.username,
    conn.notes,
    conn.type,
    conn.port?.toString(),
    ...getConnectionTagNames(conn),
  ];

  return haystacks.some((value) => value?.toLowerCase().includes(query));
};

const matchesScope = (conn: ConnectionInfo, scope: ScopeId): boolean => {
  if (scope === 'all') {
    return true;
  }

  if (scope === 'untagged') {
    return !conn.tag_ids?.length;
  }

  const tagId = parseInt(scope.replace('tag:', ''), 10);
  if (!Number.isNaN(tagId) && conn.tag_ids?.includes(tagId)) {
    return true;
  }

  if (scope.startsWith('group:')) {
    const pathPrefix = decodeGroupScopeId(scope);
    return getConnectionTagNames(conn).some((tagName) => {
      const pathKey = getTagPathSegments(tagName).join('/');
      return pathKey === pathPrefix || pathKey.startsWith(`${pathPrefix}/`);
    });
  }

  return false;
};

const matchedConnections = computed(() => {
  return connections.value.filter((conn) => {
    const typeMatched = activeTypeFilter.value === 'ALL' || conn.type === activeTypeFilter.value;
    return typeMatched && matchesSearchQuery(conn, normalizedSearchQuery.value);
  });
});

const tagTreeNodes = computed<TagTreeNode[]>(() => {
  type DraftTreeNode = {
    id: ScopeId;
    label: string;
    fullLabel: string;
    children: Map<string, DraftTreeNode>;
    tagId: number | null;
  };

  const rootChildren = new Map<string, DraftTreeNode>();

  (tags.value as TagInfo[]).forEach((tag) => {
    const segments = getTagPathSegments(tag.name);
    if (!segments.length) {
      return;
    }

    let currentChildren = rootChildren;
    const currentPathSegments: string[] = [];

    segments.forEach((segment, index) => {
      currentPathSegments.push(segment);
      const pathKey = currentPathSegments.join('/');
      const isLeaf = index === segments.length - 1;
      const nodeKey = (isLeaf ? `tag:${tag.id}` : encodeGroupScopeId(pathKey)) as ScopeId;

      if (!currentChildren.has(nodeKey)) {
        currentChildren.set(nodeKey, {
          id: nodeKey,
          label: segment,
          fullLabel: currentPathSegments.join(' / '),
          children: new Map<string, DraftTreeNode>(),
          tagId: isLeaf ? tag.id : null,
        });
      }

      const currentNode = currentChildren.get(nodeKey)!;
      if (isLeaf) {
        currentNode.fullLabel = tag.name;
        currentNode.tagId = tag.id;
      }
      currentChildren = currentNode.children;
    });
  });

  const buildNodes = (source: Map<string, DraftTreeNode>, level: number): TagTreeNode[] => {
    return Array.from(source.values())
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((node) => {
        const children = buildNodes(node.children, level + 1);
        const count =
          node.tagId !== null
            ? matchedConnections.value.filter((conn) => conn.tag_ids?.includes(node.tagId!)).length
            : matchedConnections.value.filter((conn) => matchesScope(conn, node.id)).length;

        return {
          id: node.id,
          label: node.label,
          fullLabel: node.fullLabel,
          count,
          level,
          expandable: children.length > 0,
          children,
        };
      });
  };

  return buildNodes(rootChildren, 0);
});

const filteredTagTreeNodes = computed<TagTreeNode[]>(() => {
  const query = normalizedTreeSearchQuery.value;
  if (!query) {
    return tagTreeNodes.value;
  }

  const filterNodes = (nodes: TagTreeNode[]): TagTreeNode[] => {
    return nodes.flatMap((node) => {
      const filteredChildren = filterNodes(node.children);
      const selfMatches = node.label.toLowerCase().includes(query) || node.fullLabel.toLowerCase().includes(query);

      if (!selfMatches && filteredChildren.length === 0) {
        return [];
      }

      return [{
        ...node,
        children: filteredChildren,
      }];
    });
  };

  return filterNodes(tagTreeNodes.value);
});

const matchingTreeNodeIds = computed<Set<ScopeId>>(() => {
  const matches = new Set<ScopeId>();
  const query = normalizedTreeSearchQuery.value;

  if (!query) {
    return matches;
  }

  const walkNodes = (nodes: TagTreeNode[]) => {
    nodes.forEach((node) => {
      if (node.label.toLowerCase().includes(query) || node.fullLabel.toLowerCase().includes(query)) {
        matches.add(node.id);
      }

      if (node.children.length > 0) {
        walkNodes(node.children);
      }
    });
  };

  walkNodes(tagTreeNodes.value);
  return matches;
});

const visibleTagTreeNodes = computed<TagTreeNode[]>(() => {
  const rows: TagTreeNode[] = [];
  const isSearchMode = Boolean(normalizedTreeSearchQuery.value);

  const appendVisibleNodes = (nodes: TagTreeNode[]) => {
    nodes.forEach((node) => {
      rows.push(node);
      if (node.expandable && (isSearchMode || (expandedTreeNodes.value[node.id] ?? true))) {
        appendVisibleNodes(node.children);
      }
    });
  };

  appendVisibleNodes(filteredTagTreeNodes.value);
  return rows;
});

const expandableTreeNodeIds = computed<ScopeId[]>(() => {
  const ids: ScopeId[] = [];

  const collectNodeIds = (nodes: TagTreeNode[]) => {
    nodes.forEach((node) => {
      if (node.expandable) {
        ids.push(node.id);
        collectNodeIds(node.children);
      }
    });
  };

  collectNodeIds(tagTreeNodes.value);
  return ids;
});

const hasExpandableTreeNodes = computed(() => expandableTreeNodeIds.value.length > 0);
const hasTreeSearchResults = computed(() => visibleTagTreeNodes.value.length > 0);

const primaryScopeNodes = computed<ScopeNode[]>(() => {
  return [
    {
      id: 'all',
      label: t('dashboard.filterTags.all', '全部'),
      count: matchedConnections.value.length,
    },
    {
      id: 'untagged',
      label: t('connections.untaggedGroup', '未标记'),
      count: matchedConnections.value.filter((conn) => !conn.tag_ids?.length).length,
    },
  ];
});

const filteredAndSortedConnections = computed(() => {
  const sortBy = localSortBy.value;
  const sortOrderFactor = localSortOrder.value === 'desc' ? -1 : 1;

  return matchedConnections.value
    .filter((conn) => matchesScope(conn, selectedScope.value))
    .slice()
    .sort((left, right) => {
      let leftValue: string | number | null = null;
      let rightValue: string | number | null = null;

      switch (sortBy) {
        case 'name':
          leftValue = left.name || left.host;
          rightValue = right.name || right.host;
          return String(leftValue).localeCompare(String(rightValue)) * sortOrderFactor;
        case 'host':
          leftValue = left.host || '';
          rightValue = right.host || '';
          return String(leftValue).localeCompare(String(rightValue)) * sortOrderFactor;
        case 'type':
          leftValue = left.type || '';
          rightValue = right.type || '';
          return String(leftValue).localeCompare(String(rightValue)) * sortOrderFactor;
        case 'created_at':
          leftValue = left.created_at ?? 0;
          rightValue = right.created_at ?? 0;
          return (Number(leftValue) - Number(rightValue)) * sortOrderFactor;
        case 'updated_at':
          leftValue = left.updated_at ?? 0;
          rightValue = right.updated_at ?? 0;
          return (Number(leftValue) - Number(rightValue)) * sortOrderFactor;
        case 'last_connected_at':
        default:
          leftValue = left.last_connected_at ?? (localSortOrder.value === 'desc' ? -Infinity : Infinity);
          rightValue = right.last_connected_at ?? (localSortOrder.value === 'desc' ? -Infinity : Infinity);
          if (leftValue === rightValue) {
            return 0;
          }
          return Number(leftValue) < Number(rightValue) ? -1 * sortOrderFactor : 1 * sortOrderFactor;
      }
    });
});

const selectedScopeTitle = computed(() => {
  if (selectedScope.value === 'all') {
    return t('dashboard.filterTags.all', '全部');
  }

  if (selectedScope.value === 'untagged') {
    return t('connections.untaggedGroup', '未标记');
  }

  if (selectedScope.value.startsWith('group:')) {
    return decodeGroupScopeId(selectedScope.value).replaceAll('/', ' / ');
  }

  const selectedTagId = parseInt(selectedScope.value.replace('tag:', ''), 10);
  return tagLookup.value.get(selectedTagId)?.name || t('connections.table.tags', '标签');
});

const currentRangeHint = computed(() => {
  if (selectedScope.value === 'all') {
    return t('connections.searchHint', '搜索名称、地址、用户、备注和标签');
  }

  if (selectedScope.value === 'untagged') {
    return t('connections.untaggedHint', '当前仅显示未绑定标签的连接');
  }

  return t('connections.tagScopeHint', '当前仅显示所选标签下的连接');
});

const typeCounts = computed(() => {
  const counts: Record<ConnectionTypeFilter, number> = {
    ALL: connections.value.length,
    SSH: connections.value.filter((conn) => conn.type === 'SSH').length,
    RDP: connections.value.filter((conn) => conn.type === 'RDP').length,
    VNC: connections.value.filter((conn) => conn.type === 'VNC').length,
  };

  return [
    { value: 'ALL' as const, label: t('common.all', '全部'), count: counts.ALL },
    { value: 'SSH' as const, label: 'SSH', count: counts.SSH },
    { value: 'RDP' as const, label: 'RDP', count: counts.RDP },
    { value: 'VNC' as const, label: 'VNC', count: counts.VNC },
  ];
});

const selectedResultCount = computed(() => selectedConnectionIdsForBatch.value.size);
const isAscending = computed(() => localSortOrder.value === 'asc');

const dateFnsLocales: Record<string, Locale> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'ja-JP': ja,
  en: enUS,
  zh: zhCN,
  ja,
};

const formatRelativeTime = (timestampInSeconds: number | null | undefined): string => {
  if (!timestampInSeconds) {
    return t('connections.status.never', '从未');
  }

  try {
    const timestampInMs = timestampInSeconds * 1000;
    const currentLocale = locale.value;
    const languagePart = currentLocale.split('-')[0];
    const targetLocale = dateFnsLocales[currentLocale] || dateFnsLocales[languagePart] || enUS;
    return formatDistanceToNow(new Date(timestampInMs), { addSuffix: true, locale: targetLocale });
  } catch (error) {
    console.error('格式化连接时间失败:', error);
    return String(timestampInSeconds);
  }
};

const getLatencyColorString = (latencyMs?: number): string => {
  if (latencyMs === undefined) {
    return 'inherit';
  }
  if (latencyMs < 100) {
    return 'var(--color-success, #4CAF50)';
  }
  if (latencyMs < 300) {
    return 'var(--color-warning, #ff9800)';
  }
  return 'var(--color-error, #F44336)';
};

const getTypePillClass = (type: ConnectionTypeFilter) => {
  if (activeTypeFilter.value === type) {
    return 'bg-button text-button-text border-button shadow-sm';
  }
  return 'bg-background text-text-secondary border-border hover:bg-border hover:text-foreground';
};

const getScopeNodeClass = (nodeId: ScopeId) => {
  if (selectedScope.value === nodeId) {
    return 'bg-primary/15 text-foreground border-primary/30 shadow-sm';
  }
  return 'text-text-secondary border-transparent hover:bg-header hover:text-foreground';
};

const getTreeNodeRowClass = (node: TagTreeNode) => {
  if (selectedScope.value === node.id) {
    return 'bg-primary/15 text-foreground border-primary/30 shadow-sm';
  }

  if (dropTargetTreeNodeId.value === node.id) {
    return 'border-amber-400/35 bg-amber-500/10 text-foreground shadow-sm';
  }

  if (matchingTreeNodeIds.value.has(node.id)) {
    return 'border-emerald-400/30 bg-emerald-500/8 text-emerald-100 shadow-sm';
  }

  return 'text-text-secondary border-transparent hover:bg-header hover:text-foreground';
};

const getTreeCountClass = (node: ScopeNode) => {
  if (selectedScope.value === node.id) {
    return 'border-primary/30 bg-primary/20 text-foreground';
  }

  if (matchingTreeNodeIds.value.has(node.id)) {
    return 'border-emerald-400/25 bg-emerald-500/18 text-emerald-100';
  }

  if (node.count > 0) {
    return 'border-emerald-500/15 bg-emerald-500/10 text-emerald-200';
  }

  return 'border-current/15 bg-black/10 text-text-secondary';
};

const getTypeBadgeClass = (type: ConnectionInfo['type']) => {
  if (type === 'SSH') {
    return 'bg-emerald-500/12 text-emerald-300 border-emerald-400/25';
  }
  if (type === 'RDP') {
    return 'bg-sky-500/12 text-sky-300 border-sky-400/25';
  }
  return 'bg-amber-500/12 text-amber-300 border-amber-400/25';
};

const getSingleTestButtonInfo = (connId: number | undefined, connType: string | undefined) => {
  const state = connId ? connectionTestStates.value.get(connId) : undefined;

  if (connType !== 'SSH') {
    return {
      text: t('connections.actions.test', '测试'),
      iconClass: 'fas fa-flask',
      disabled: true,
      title: t('connections.test.onlySshSupportedTest', '仅 SSH 连接支持测试。'),
    };
  }

  if (!connId) {
    return {
      text: t('connections.actions.test', '测试'),
      iconClass: 'fas fa-flask',
      disabled: true,
      title: '',
    };
  }

  if (state?.status === 'testing') {
    return {
      text: t('connections.actions.testing', '测试中'),
      iconClass: 'fas fa-spinner fa-spin',
      disabled: true,
      title: t('connections.actions.testing', '测试中'),
    };
  }

  return {
    text: t('connections.actions.test', '测试'),
    iconClass: 'fas fa-flask',
    disabled: false,
    title: t('connections.actions.test', '测试'),
  };
};

const getTruncatedNotes = (notes: string | null | undefined): string => {
  if (!notes?.trim()) {
    return '';
  }

  const maxLength = 80;
  return notes.length <= maxLength ? notes : `${notes.slice(0, maxLength)}...`;
};

const ensureDataLoaded = async () => {
  if (connections.value.length === 0) {
    await connectionsStore.fetchConnections();
  } else {
    connectionsStore.fetchConnections();
  }

  await tagsStore.fetchTags();
};

onMounted(async () => {
  try {
    await ensureDataLoaded();
  } catch (error) {
    console.error('加载连接管理数据失败:', error);
  }
});

watch(localSortBy, (newValue) => {
  localStorage.setItem(LS_SORT_BY_KEY, newValue);
});

watch(localSortOrder, (newValue) => {
  localStorage.setItem(LS_SORT_ORDER_KEY, newValue);
});

watch(selectedScope, (newValue) => {
  localStorage.setItem(LS_FILTER_SCOPE_KEY, newValue);
});

watch(activeTypeFilter, (newValue) => {
  localStorage.setItem(LS_TYPE_FILTER_KEY, newValue);
});

watch(
  expandedTreeNodes,
  (newValue) => {
    localStorage.setItem(TREE_EXPANDED_STORAGE_KEY, JSON.stringify(newValue));
  },
  { deep: true },
);

watch([selectedScope, activeTypeFilter, searchQuery], () => {
  if (isBatchEditMode.value) {
    const visibleIds = new Set(filteredAndSortedConnections.value.map((conn) => conn.id));
    selectedConnectionIdsForBatch.value.forEach((id) => {
      if (!visibleIds.has(id)) {
        selectedConnectionIdsForBatch.value.delete(id);
      }
    });
  }
});

const selectScope = (scopeId: ScopeId) => {
  selectedScope.value = scopeId;
};

const toggleTreeNode = (nodeId: ScopeId) => {
  expandedTreeNodes.value[nodeId] = !(expandedTreeNodes.value[nodeId] ?? true);
};

const handleTreeNodeSelect = (node: TagTreeNode) => {
  selectScope(node.id);
  if (node.expandable) {
    toggleTreeNode(node.id);
  }
};

const expandAllTreeNodes = () => {
  if (!hasExpandableTreeNodes.value) {
    return;
  }

  tagsSectionExpanded.value = true;
  expandedTreeNodes.value = Object.fromEntries(expandableTreeNodeIds.value.map((nodeId) => [nodeId, true]));
};

const collapseAllTreeNodes = () => {
  if (!hasExpandableTreeNodes.value) {
    return;
  }

  expandedTreeNodes.value = Object.fromEntries(expandableTreeNodeIds.value.map((nodeId) => [nodeId, false]));
};

const resetScopeSelection = () => {
  selectScope('all');
};

const clearTreeSearch = () => {
  treeSearchQuery.value = '';
};

const setHoveredTreeNode = (nodeId: ScopeId | null) => {
  hoveredTreeNodeId.value = nodeId;
};

const toggleTreeNodeFromAction = (node: TagTreeNode) => {
  if (!node.expandable) {
    return;
  }

  toggleTreeNode(node.id);
};

const startTreeDrag = (node: TagTreeNode) => {
  draggingTreeNodeId.value = node.id;
  dropTargetTreeNodeId.value = node.id;
  treeDragNoticeVisible.value = true;
};

const updateTreeDropTarget = (node: TagTreeNode) => {
  if (!draggingTreeNodeId.value || draggingTreeNodeId.value === node.id) {
    return;
  }

  dropTargetTreeNodeId.value = node.id;
};

const finishTreeDrag = () => {
  draggingTreeNodeId.value = null;
  dropTargetTreeNodeId.value = null;
  treeDragNoticeVisible.value = false;
};

const connectTo = (connection: ConnectionInfo) => {
  sessionStore.handleConnectRequest(connection);
};

const toggleSortOrder = () => {
  localSortOrder.value = localSortOrder.value === 'asc' ? 'desc' : 'asc';
};

const openAddConnectionForm = () => {
  connectionToEdit.value = null;
  showAddEditConnectionForm.value = true;
};

const openEditConnectionForm = (connection: ConnectionInfo) => {
  connectionToEdit.value = connection;
  showAddEditConnectionForm.value = true;
};

const handleSortByColumn = (field: ConnectionSortField) => {
  if (localSortBy.value === field) {
    toggleSortOrder();
    return;
  }

  localSortBy.value = field;
  localSortOrder.value = field === 'last_connected_at' ? 'desc' : 'asc';
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
  if (!isBatchEditMode.value) {
    return;
  }

  if (selectedConnectionIdsForBatch.value.has(connId)) {
    selectedConnectionIdsForBatch.value.delete(connId);
  } else {
    selectedConnectionIdsForBatch.value.add(connId);
  }
};

const isConnectionSelectedForBatch = (connId: number) => {
  return selectedConnectionIdsForBatch.value.has(connId);
};

const selectAllConnections = () => {
  if (!isBatchEditMode.value) {
    return;
  }

  filteredAndSortedConnections.value.forEach((conn) => selectedConnectionIdsForBatch.value.add(conn.id));
};

const deselectAllConnections = () => {
  if (!isBatchEditMode.value) {
    return;
  }
  selectedConnectionIdsForBatch.value.clear();
};

const invertSelection = () => {
  if (!isBatchEditMode.value) {
    return;
  }

  const visibleIds = new Set(filteredAndSortedConnections.value.map((conn) => conn.id));
  visibleIds.forEach((id) => {
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

  const confirmed = await showConfirmDialog({
    message: t(
      'connections.batchEdit.confirmMessage',
      { count: selectedConnectionIdsForBatch.value.size },
      `您确定要删除选中的 ${selectedConnectionIdsForBatch.value.size} 个连接吗？此操作无法撤销。`,
    ),
  });

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
      title: t('common.error', '错误'),
      message: t('connections.batchEdit.errorMessage', `批量删除连接失败: ${error.message || '未知错误'}`),
    });
  } finally {
    isDeletingSelectedConnections.value = false;
  }
};

const handleCloneConnection = async (connection: ConnectionInfo) => {
  const allConnections = connectionsStore.connections;
  const baseName = connection.name || connection.host;
  let counter = 1;
  let newName = `${baseName} (${counter})`;

  while (allConnections.some((item) => item.name === newName)) {
    counter += 1;
    newName = `${baseName} (${counter})`;
  }

  await connectionsStore.cloneConnection(connection.id, newName);
  await connectionsStore.fetchConnections();
};

const handleDeleteSingleConnection = async (connection: ConnectionInfo) => {
  const confirmed = await showConfirmDialog({
    message: t('connections.prompts.confirmDelete', { name: connection.name || connection.host }),
  });

  if (!confirmed) {
    return;
  }

  await connectionsStore.deleteConnection(connection.id);
  await connectionsStore.fetchConnections();
};

const handleTestSingleConnection = async (connection: ConnectionInfo) => {
  if (!connection.id || connection.type !== 'SSH') {
    return;
  }

  connectionTestStates.value.set(connection.id, {
    status: 'testing',
    resultText: t('connections.test.testingInProgress', '测试中...'),
  });

  try {
    const result = await connectionsStore.testConnection(connection.id);
    if (result.success) {
      const latencyMs = result.latency;
      connectionTestStates.value.set(connection.id, {
        status: 'success',
        resultText: latencyMs !== undefined ? `${latencyMs}ms` : t('connections.test.success', '已连接'),
        latency: latencyMs,
        latencyColor: getLatencyColorString(latencyMs ?? 0),
      });
    } else {
      connectionTestStates.value.set(connection.id, {
        status: 'error',
        resultText: result.message || t('connections.test.unknownError', '未知错误'),
      });
    }
  } catch (error: any) {
    connectionTestStates.value.set(connection.id, {
      status: 'error',
      resultText: error.message || t('connections.test.unknownError', '未知错误'),
    });
  }
};

const handleTestAllFilteredConnections = async () => {
  if (isTestingAll.value || isLoadingConnections.value) {
    return;
  }

  const sshConnections = filteredAndSortedConnections.value.filter((conn) => conn.type === 'SSH' && conn.id != null);
  if (!sshConnections.length) {
    return;
  }

  isTestingAll.value = true;
  try {
    await Promise.all(
      sshConnections.map(async (conn) => {
        await handleTestSingleConnection(conn);
      }),
    );
  } finally {
    isTestingAll.value = false;
  }
};

const handleConnectAllFilteredConnections = async () => {
  if (isConnectingAll.value || isLoadingConnections.value) {
    return;
  }

  const sshConnections = filteredAndSortedConnections.value.filter((conn) => conn.type === 'SSH');
  if (!sshConnections.length) {
    return;
  }

  isConnectingAll.value = true;
  try {
    sshConnections.forEach((conn) => connectTo(conn));
  } catch (error) {
    console.error('Error connecting to all filtered SSH connections:', error);
  } finally {
    isConnectingAll.value = false;
  }
};

const toggleMoreMenu = (connectionId: number) => {
  moreMenuOpenForId.value = moreMenuOpenForId.value === connectionId ? null : connectionId;
};

const closeMoreMenu = () => {
  moreMenuOpenForId.value = null;
};

const handleGlobalClick = () => {
  closeMoreMenu();
};

onMounted(() => {
  document.addEventListener('click', handleGlobalClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleGlobalClick);
});
</script>

<template>
  <div class="p-4 md:p-6 lg:p-8 bg-background text-foreground">
    <div class="max-w-[1500px] mx-auto">
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-semibold">{{ t('nav.connections', '连接管理') }}</h1>
          <p class="mt-1 text-sm text-text-secondary">
            {{ currentRangeHint }}
          </p>
        </div>
        <div class="hidden lg:flex items-center gap-2 text-sm text-text-secondary">
          <span class="px-3 py-1 rounded-full border border-border bg-header/60">
            {{ selectedScopeTitle }}
          </span>
          <span class="px-3 py-1 rounded-full border border-border bg-header/60">
            {{ filteredAndSortedConnections.length }} {{ t('connections.resultUnit', '条结果') }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4">
        <aside class="bg-card text-card-foreground border border-border rounded-2xl overflow-hidden min-h-[720px]">
          <div class="px-4 pt-4 pb-3 border-b border-border/60 bg-gradient-to-b from-header/70 via-header/35 to-background/70">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200 inline-flex items-center justify-center">
                    <i class="fas fa-folder-tree text-sm"></i>
                  </div>
                  <div class="min-w-0">
                    <h2 class="text-sm font-semibold tracking-[0.18em] uppercase text-foreground">{{ t('connections.scopeTitle', '浏览范围') }}</h2>
                    <p class="mt-0.5 text-xs text-text-secondary truncate">{{ t('connections.scopeDesc', '按标签和分组快速切换连接范围') }}</p>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span class="px-2.5 py-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 text-[11px] font-medium text-emerald-100">
                  {{ visibleTagTreeNodes.length }} {{ t('connections.table.tags', '标签') }}
                </span>
                <button
                  @click="tagsSectionExpanded = !tagsSectionExpanded"
                  class="w-8 h-8 rounded-lg border border-border/60 bg-background text-text-secondary hover:bg-border hover:text-foreground transition-colors"
                  :title="tagsSectionExpanded ? t('common.collapse', '收起') : t('common.expand', '展开')"
                >
                  <i :class="['fas', tagsSectionExpanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
                </button>
              </div>
            </div>

            <div class="mt-3 flex items-center gap-2">
              <div class="relative flex-1 min-w-0">
                <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs"></i>
                <input
                  v-model="treeSearchQuery"
                  type="text"
                  :placeholder="t('connections.scopeTreeSearch', '搜索标签树...')"
                  class="w-full h-9 pl-9 pr-9 rounded-xl border border-border/60 bg-background/95 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
                <button
                  v-if="treeSearchQuery"
                  @click="clearTreeSearch"
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md text-text-secondary hover:bg-border hover:text-foreground transition-colors inline-flex items-center justify-center"
                  :title="t('common.clear', '清空')"
                >
                  <i class="fas fa-xmark text-xs"></i>
                </button>
              </div>
              <button
                @click="resetScopeSelection"
                :disabled="selectedScope === 'all'"
                class="h-9 px-3 rounded-xl border border-border/60 bg-background text-text-secondary hover:bg-border hover:text-foreground transition-colors inline-flex items-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i class="fas fa-crosshairs"></i>
                <span>{{ t('common.reset', '重置') }}</span>
              </button>
            </div>
          </div>

          <div class="p-3 space-y-5">
            <section>
              <div class="px-2 mb-2 flex items-center gap-3">
                <span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary/80 whitespace-nowrap">
                  {{ t('connections.scopePrimary', '视图') }}
                </span>
                <span class="h-px flex-1 bg-gradient-to-r from-border/80 to-transparent"></span>
                <span class="text-[10px] text-text-secondary/70">{{ primaryScopeNodes.length }}</span>
              </div>
              <div class="space-y-1">
                <button
                  v-for="node in primaryScopeNodes"
                  :key="node.id"
                  @click="selectScope(node.id)"
                  :class="[
                    'w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150',
                    getScopeNodeClass(node.id)
                  ]"
                >
                  <span class="flex items-center gap-2 min-w-0">
                    <i :class="['fas', node.id === 'all' ? 'fa-layer-group' : 'fa-tag', 'w-4 text-center']"></i>
                    <span class="truncate">{{ node.label }}</span>
                  </span>
                  <span
                    :class="[
                      'px-2 py-0.5 rounded-full text-xs border transition-colors',
                      getTreeCountClass(node)
                    ]"
                  >
                    {{ node.count }}
                  </span>
                </button>
              </div>
            </section>

            <section>
              <div class="px-2 mb-2 flex items-center gap-3">
                <span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary/80 whitespace-nowrap">
                  {{ t('connections.scopeExplorerTitle', '标签资源管理器') }}
                </span>
                <span class="h-px flex-1 bg-gradient-to-r from-border/80 to-transparent"></span>
                <span class="text-[10px] text-text-secondary/70">{{ visibleTagTreeNodes.length }}</span>
              </div>

              <div v-show="tagsSectionExpanded" class="space-y-2">
                <div
                  v-if="treeDragNoticeVisible"
                  class="mx-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100 flex items-center gap-2"
                >
                  <i class="fas fa-grip-lines"></i>
                  <span>{{ t('connections.scopeDragPlaceholder', '拖拽排序预留中，当前仅展示目标占位反馈') }}</span>
                </div>

                <div class="flex flex-wrap items-center gap-2 px-2">
                  <button
                    @click="expandAllTreeNodes"
                    :disabled="!hasExpandableTreeNodes"
                    class="h-8 px-2.5 rounded-lg border border-border/60 bg-background text-foreground hover:bg-border transition-colors inline-flex items-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i class="fas fa-square-plus"></i>
                    <span>{{ t('common.expandAll', '展开全部') }}</span>
                  </button>
                  <button
                    @click="collapseAllTreeNodes"
                    :disabled="!hasExpandableTreeNodes"
                    class="h-8 px-2.5 rounded-lg border border-border/60 bg-background text-foreground hover:bg-border transition-colors inline-flex items-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i class="fas fa-square-minus"></i>
                    <span>{{ t('common.collapseAll', '收起全部') }}</span>
                  </button>
                </div>

                <div class="px-2 flex items-center justify-between gap-3 text-[11px] text-text-secondary">
                  <span>{{ t('connections.scopeHintCompact', '树节点按标签路径自动分层') }}</span>
                  <span class="truncate text-right">{{ normalizedTreeSearchQuery ? t('connections.scopeSearchMode', '命中路径已自动展开') : selectedScopeTitle }}</span>
                </div>

                <div v-if="normalizedTreeSearchQuery && !hasTreeSearchResults" class="mx-2 rounded-xl border border-dashed border-border/70 bg-background/70 px-3 py-4 text-xs text-text-secondary text-center">
                  {{ t('connections.scopeTreeNoMatch', '没有匹配的树节点') }}
                </div>

                <div v-else class="space-y-1 max-h-[520px] overflow-y-auto pr-1">
                  <div
                    v-for="node in visibleTagTreeNodes"
                    :key="node.id"
                    :class="[
                      'group w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150',
                      getTreeNodeRowClass(node),
                      node.count === 0 ? 'opacity-55' : ''
                    ]"
                    :style="{ paddingLeft: `${0.75 + node.level * 1.05}rem` }"
                    draggable="true"
                    @mouseenter="setHoveredTreeNode(node.id)"
                    @mouseleave="setHoveredTreeNode(null)"
                    @dragstart="startTreeDrag(node)"
                    @dragenter.prevent="updateTreeDropTarget(node)"
                    @dragover.prevent
                    @dragend="finishTreeDrag"
                    @drop.prevent="finishTreeDrag"
                  >
                    <button
                      class="flex items-center gap-2 min-w-0 flex-1"
                      @click="handleTreeNodeSelect(node)"
                    >
                      <i
                        v-if="node.expandable"
                        :class="[
                          'fas w-4 text-center transition-transform duration-150',
                          (normalizedTreeSearchQuery || (expandedTreeNodes[node.id] ?? true)) ? 'fa-chevron-down' : 'fa-chevron-right'
                        ]"
                      ></i>
                      <i v-else class="fas fa-circle text-[8px] w-4 text-center opacity-60"></i>
                      <span class="truncate" :title="node.fullLabel">{{ node.label }}</span>
                    </button>
                    <span
                      :class="[
                        'px-2 py-0.5 rounded-full text-xs border flex-shrink-0 transition-colors',
                        getTreeCountClass(node)
                      ]"
                    >
                      {{ node.count }}
                    </span>

                    <div
                      :class="[
                        'flex items-center gap-1 flex-shrink-0 transition-opacity duration-150',
                        hoveredTreeNodeId === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                    >
                      <button
                        v-if="node.expandable"
                        @click.stop="toggleTreeNodeFromAction(node)"
                        class="w-7 h-7 rounded-lg border border-border/60 bg-background text-text-secondary hover:bg-border hover:text-foreground transition-colors inline-flex items-center justify-center"
                        :title="(expandedTreeNodes[node.id] ?? true) ? t('common.collapse', '收起') : t('common.expand', '展开')"
                      >
                        <i :class="['fas text-[11px]', (expandedTreeNodes[node.id] ?? true) ? 'fa-compress-alt' : 'fa-expand-alt']"></i>
                      </button>
                      <button
                        @click.stop="selectScope(node.id)"
                        class="w-7 h-7 rounded-lg border border-border/60 bg-background text-text-secondary hover:bg-border hover:text-foreground transition-colors inline-flex items-center justify-center"
                        :title="t('connections.scopePinAction', '定位到此范围')"
                      >
                        <i class="fas fa-crosshairs text-[11px]"></i>
                      </button>
                      <button
                        @mousedown.stop
                        class="w-7 h-7 rounded-lg border border-border/60 bg-background text-text-secondary hover:bg-border hover:text-foreground transition-colors inline-flex items-center justify-center cursor-grab active:cursor-grabbing"
                        :title="t('connections.scopeDragAction', '拖拽重排（预留）')"
                      >
                        <i class="fas fa-grip-lines text-[11px]"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </aside>

        <section class="bg-card text-card-foreground border border-border rounded-2xl overflow-hidden min-h-[720px] flex flex-col">
          <div class="px-4 py-4 border-b border-border/60 bg-header/30">
            <div class="flex flex-col gap-3">
              <div class="flex flex-col lg:flex-row lg:items-center gap-3">
                <div class="relative flex-1 min-w-0">
                  <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm"></i>
                  <input
                    v-model="searchQuery"
                    type="text"
                    :placeholder="t('dashboard.searchConnectionsPlaceholder', '搜索连接...')"
                    class="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    @click="openAddConnectionForm"
                    class="h-11 px-4 rounded-xl bg-button text-button-text border border-button shadow-sm hover:bg-button-hover transition-colors inline-flex items-center gap-2"
                    :title="t('connections.addConnection', '新增连接')"
                  >
                    <i class="fas fa-plus"></i>
                    <span>{{ t('connections.addConnection', '新增连接') }}</span>
                  </button>
                  <button
                    @click="handleTestAllFilteredConnections"
                    :disabled="isTestingAll || isLoadingConnections || !filteredAndSortedConnections.some(c => c.type === 'SSH')"
                    class="h-11 px-4 rounded-xl border border-border bg-background text-foreground hover:bg-border transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i :class="['fas', isTestingAll ? 'fa-spinner fa-spin' : 'fa-check-double']"></i>
                    <span>{{ t('connections.actions.testAllFiltered', '测试全部') }}</span>
                  </button>
                  <button
                    @click="handleConnectAllFilteredConnections"
                    :disabled="isConnectingAll || isLoadingConnections || !filteredAndSortedConnections.some(c => c.type === 'SSH')"
                    class="h-11 px-4 rounded-xl border border-border bg-background text-foreground hover:bg-border transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i :class="['fas', isConnectingAll ? 'fa-spinner fa-spin' : 'fa-network-wired']"></i>
                    <span>{{ t('workspaceConnectionList.connectAllSshInGroupMenu', '连接全部') }}</span>
                  </button>
                </div>
              </div>

              <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    v-for="filterItem in typeCounts"
                    :key="filterItem.value"
                    @click="activeTypeFilter = filterItem.value"
                    :class="[
                      'h-9 px-3 rounded-xl border text-sm inline-flex items-center gap-2 transition-colors',
                      getTypePillClass(filterItem.value)
                    ]"
                  >
                    <span>{{ filterItem.label }}</span>
                    <span class="px-2 py-0.5 rounded-full text-xs bg-black/10 border border-current/15">
                      {{ filterItem.count }}
                    </span>
                  </button>
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                  <div class="flex items-center mr-2">
                    <label for="batch-edit-toggle" class="mr-2 text-sm font-medium text-text-secondary">
                      {{ t('connections.batchEdit.toggleLabel', '批量修改') }}
                    </label>
                    <button
                      id="batch-edit-toggle"
                      @click="toggleBatchEditMode"
                      :class="[
                        'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                        isBatchEditMode ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                      ]"
                      role="switch"
                      :aria-checked="isBatchEditMode"
                    >
                      <span
                        aria-hidden="true"
                        :class="[
                          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200',
                          isBatchEditMode ? 'translate-x-5' : 'translate-x-0'
                        ]"
                      ></span>
                    </button>
                  </div>

                  <select
                    v-model="localSortBy"
                    class="h-9 px-3 py-1 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                      {{ t(option.labelKey, option.value.replace('_', ' ')) }}
                    </option>
                  </select>

                  <button
                    @click="toggleSortOrder"
                    class="h-9 w-9 border border-border rounded-xl hover:bg-border focus:outline-none focus:ring-1 focus:ring-primary inline-flex items-center justify-center"
                    :aria-label="isAscending ? t('common.sortAscending', '升序') : t('common.sortDescending', '降序')"
                    :title="isAscending ? t('common.sortAscending', '升序') : t('common.sortDescending', '降序')"
                  >
                    <i :class="['fas', isAscending ? 'fa-arrow-up-a-z' : 'fa-arrow-down-z-a']"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isBatchEditMode" class="px-4 py-3 border-b border-border/50 bg-background/70 flex flex-wrap items-center gap-2">
            <button
              @click="selectAllConnections"
              class="px-3 py-1.5 text-sm bg-transparent text-text-secondary border border-border rounded-lg hover:bg-border hover:text-foreground transition-colors"
            >
              {{ t('connections.batchEdit.selectAll', '全选') }} ({{ selectedResultCount }})
            </button>
            <button
              @click="deselectAllConnections"
              class="px-3 py-1.5 text-sm bg-transparent text-text-secondary border border-border rounded-lg hover:bg-border hover:text-foreground transition-colors"
            >
              {{ t('connections.batchEdit.deselectAll', '取消全选') }}
            </button>
            <button
              @click="invertSelection"
              class="px-3 py-1.5 text-sm bg-transparent text-text-secondary border border-border rounded-lg hover:bg-border hover:text-foreground transition-colors"
            >
              {{ t('connections.batchEdit.invertSelection', '反选') }}
            </button>
            <button
              @click="openBatchEditModal"
              :disabled="selectedResultCount === 0"
              class="px-4 py-1.5 text-sm bg-button text-button-text rounded-lg hover:bg-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i class="fas fa-edit mr-1"></i>{{ t('connections.batchEdit.editSelected', '编辑选中') }}
            </button>
            <button
              @click="handleBatchDeleteConnections"
              :disabled="selectedResultCount === 0 || isDeletingSelectedConnections"
              class="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i :class="['fas', isDeletingSelectedConnections ? 'fa-spinner fa-spin' : 'fa-trash-alt', 'mr-1']"></i>
              {{ t('connections.batchEdit.deleteSelectedButton', '删除选中') }}
            </button>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto">
            <div v-if="isLoadingConnections && filteredAndSortedConnections.length === 0" class="flex items-center justify-center h-full text-text-secondary">
              <i class="fas fa-spinner fa-spin mr-2"></i>{{ t('common.loading', '加载中') }}
            </div>

            <div v-else-if="filteredAndSortedConnections.length === 0" class="flex flex-col items-center justify-center h-full px-6 text-center text-text-secondary">
              <i class="fas fa-search text-2xl mb-3"></i>
              <p class="text-base font-medium text-foreground">
                {{ t('dashboard.noConnectionsMatchSearch', '没有连接匹配搜索条件') }}
              </p>
              <p class="mt-2 text-sm">
                {{ currentRangeHint }}
              </p>
            </div>

            <div v-else class="min-w-0">
              <div class="hidden xl:grid grid-cols-[minmax(0,2.25fr)_minmax(0,1.45fr)_minmax(0,1.25fr)_160px_170px] gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary border-b border-border/50 bg-background/40 sticky top-0 z-10">
                <button class="flex items-center gap-2 text-left hover:text-foreground transition-colors" @click="handleSortByColumn('name')">
                  <span>{{ t('connections.table.name', '名称') }}</span>
                  <i v-if="localSortBy === 'name'" :class="['fas', isAscending ? 'fa-arrow-up-short-wide' : 'fa-arrow-down-wide-short']"></i>
                </button>
                <button class="flex items-center gap-2 text-left hover:text-foreground transition-colors" @click="handleSortByColumn('host')">
                  <span>{{ t('connections.table.host', '地址') }}</span>
                  <i v-if="localSortBy === 'host'" :class="['fas', isAscending ? 'fa-arrow-up-short-wide' : 'fa-arrow-down-wide-short']"></i>
                </button>
                <div>{{ t('connections.table.tags', '标签 / 备注') }}</div>
                <button class="flex items-center gap-2 text-left hover:text-foreground transition-colors" @click="handleSortByColumn('last_connected_at')">
                  <span>{{ t('dashboard.lastConnected', '上次连接') }}</span>
                  <i v-if="localSortBy === 'last_connected_at'" :class="['fas', isAscending ? 'fa-arrow-up-short-wide' : 'fa-arrow-down-wide-short']"></i>
                </button>
                <div>{{ t('connections.table.actions', '操作') }}</div>
              </div>

              <ul class="divide-y divide-border/50">
                <li
                  v-for="conn in filteredAndSortedConnections"
                  :key="conn.id"
                  @click="handleConnectionClick(conn.id)"
                  :class="[
                    'px-4 py-4 transition-colors duration-150',
                    isBatchEditMode ? 'cursor-pointer hover:bg-border/30' : 'hover:bg-header/25',
                    isBatchEditMode && isConnectionSelectedForBatch(conn.id) ? 'bg-primary/10' : ''
                  ]"
                >
                  <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,2.25fr)_minmax(0,1.45fr)_minmax(0,1.25fr)_160px_170px] gap-4 items-start">
                    <div class="min-w-0 flex items-start gap-3">
                      <input
                        v-if="isBatchEditMode"
                        type="checkbox"
                        class="mt-1 h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                        :checked="isConnectionSelectedForBatch(conn.id)"
                        @click.stop="handleConnectionClick(conn.id)"
                        @change.stop
                      />

                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium', getTypeBadgeClass(conn.type)]">
                            <i :class="['fas', conn.type === 'SSH' ? 'fa-server' : conn.type === 'RDP' ? 'fa-desktop' : 'fa-plug']"></i>
                            {{ conn.type }}
                          </span>
                          <h3 class="text-base font-semibold text-foreground truncate" :title="conn.name || conn.host">
                            {{ conn.name || conn.host || t('connections.unnamedFallback', '未命名连接') }}
                          </h3>
                        </div>
                        <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                          <span>{{ conn.username }}</span>
                          <span>{{ conn.auth_method }}</span>
                          <span>{{ conn.port }}</span>
                          <span>{{ t('connections.createdAt', '创建于') }} {{ formatRelativeTime(conn.created_at) }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="min-w-0">
                      <div class="text-sm font-medium text-foreground truncate" :title="conn.host">
                        {{ conn.host }}
                      </div>
                      <div class="mt-2 text-sm text-text-secondary truncate" :title="`${conn.username}@${conn.host}:${conn.port}`">
                        {{ conn.username }}@{{ conn.host }}:{{ conn.port }}
                      </div>
                      <div class="mt-2 text-xs text-text-secondary">
                        {{ conn.proxy_type ? `${t('connections.proxyType', '代理')}: ${conn.proxy_type}` : t('connections.noProxy', '未使用代理') }}
                      </div>
                    </div>

                    <div class="min-w-0">
                      <div class="flex flex-wrap gap-1.5">
                        <span
                          v-for="tagName in getConnectionTagNames(conn)"
                          :key="tagName"
                          class="px-2 py-0.5 text-xs rounded-full bg-header border border-border text-text-secondary"
                        >
                          {{ tagName }}
                        </span>
                        <span
                          v-if="getConnectionTagNames(conn).length === 0"
                          class="px-2 py-0.5 text-xs rounded-full bg-background border border-dashed border-border text-text-secondary"
                        >
                          {{ t('connections.untaggedGroup', '未标记') }}
                        </span>
                      </div>
                      <div v-if="conn.notes && conn.notes.trim() !== ''" class="mt-2 text-sm text-text-secondary leading-relaxed" :title="conn.notes">
                        {{ getTruncatedNotes(conn.notes) }}
                      </div>
                    </div>

                    <div class="min-w-0">
                      <div class="text-sm font-medium text-foreground">
                        {{ formatRelativeTime(conn.last_connected_at) }}
                      </div>
                      <div
                        v-if="conn.type === 'SSH' && connectionTestStates.get(conn.id) && connectionTestStates.get(conn.id)?.status !== 'idle'"
                        class="mt-2 text-sm font-medium"
                        :class="connectionTestStates.get(conn.id)?.status === 'error' ? 'text-error' : ''"
                        :style="connectionTestStates.get(conn.id)?.status === 'success' ? { color: connectionTestStates.get(conn.id)?.latencyColor || 'inherit' } : {}"
                      >
                        <i
                          :class="[
                            'fas mr-1.5 text-xs',
                            connectionTestStates.get(conn.id)?.status === 'testing'
                              ? 'fa-spinner fa-spin'
                              : connectionTestStates.get(conn.id)?.status === 'success'
                                ? 'fa-check-circle'
                                : 'fa-times-circle'
                          ]"
                        ></i>
                        {{ connectionTestStates.get(conn.id)?.resultText }}
                      </div>
                    </div>

                    <div class="flex flex-wrap justify-start xl:justify-end gap-2 relative">
                      <button
                        @click.stop="connectTo(conn)"
                        :disabled="isBatchEditMode"
                        class="px-4 py-2 rounded-lg bg-button text-button-text border border-button hover:bg-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 text-sm font-medium"
                      >
                        <i class="fas fa-arrow-right-to-bracket"></i>
                        <span>{{ t('connections.actions.connect', '连接') }}</span>
                      </button>

                      <div class="relative">
                        <button
                          @click.stop="toggleMoreMenu(conn.id)"
                          :disabled="isBatchEditMode"
                          class="px-3 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-border transition-colors inline-flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <i class="fas fa-ellipsis"></i>
                          <span>{{ t('common.more', '更多') }}</span>
                        </button>

                        <div
                          v-if="moreMenuOpenForId === conn.id"
                          class="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-background shadow-xl z-20 overflow-hidden"
                          @click.stop
                        >
                          <button
                            class="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-header transition-colors flex items-center gap-2"
                            @click.stop="openEditConnectionForm(conn); closeMoreMenu()"
                          >
                            <i class="fas fa-pen w-4 text-center"></i>
                            <span>{{ t('connections.actions.edit', '编辑') }}</span>
                          </button>
                          <button
                            v-if="conn.type === 'SSH'"
                            :disabled="getSingleTestButtonInfo(conn.id, conn.type).disabled"
                            :title="getSingleTestButtonInfo(conn.id, conn.type).title"
                            class="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-header transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            @click.stop="handleTestSingleConnection(conn); closeMoreMenu()"
                          >
                            <i :class="[getSingleTestButtonInfo(conn.id, conn.type).iconClass, 'w-4 text-center']"></i>
                            <span>{{ getSingleTestButtonInfo(conn.id, conn.type).text }}</span>
                          </button>
                          <button
                            class="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-header transition-colors flex items-center gap-2"
                            @click.stop="handleCloneConnection(conn); closeMoreMenu()"
                          >
                            <i class="fas fa-clone w-4 text-center"></i>
                            <span>{{ t('connections.actions.clone', '克隆') }}</span>
                          </button>
                          <button
                            class="w-full px-3 py-2 text-left text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-2"
                            @click.stop="handleDeleteSingleConnection(conn); closeMoreMenu()"
                          >
                            <i class="fas fa-trash-alt w-4 text-center"></i>
                            <span>{{ t('connections.actions.delete', '删除') }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>

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
    </div>
  </div>
</template>
