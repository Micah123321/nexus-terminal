<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import CommandHistoryView from '../views/CommandHistoryView.vue';
import QuickCommandsView from '../views/QuickCommandsView.vue';
import FileManager from './FileManager.vue';
import FileEditorContainer from './FileEditorContainer.vue';
import { useSessionStore } from '../stores/session.store';
import type { FileTab } from '../stores/fileEditor.store';
import type { WebSocketDependencies } from '../composables/useSftpActions';

type WorkbenchTab = 'quickCommands' | 'files' | 'history' | 'editor';

const props = defineProps({
  tabs: {
    type: Array as PropType<FileTab[]>,
    default: () => [],
  },
  activeTabId: {
    type: String as PropType<string | null>,
    default: null,
  },
  sessionId: {
    type: String as PropType<string | null>,
    default: null,
  },
  instanceId: {
    type: String as PropType<string | null>,
    default: null,
  },
  dbConnectionId: {
    type: String as PropType<string | null>,
    default: null,
  },
  wsDeps: {
    type: Object as PropType<WebSocketDependencies | null>,
    default: null,
  },
});

const { t } = useI18n();
const sessionStore = useSessionStore();
const { sessions } = storeToRefs(sessionStore);

const activeWorkbenchTab = ref<WorkbenchTab>('quickCommands');

const workbenchTabs = computed(() => [
  {
    id: 'quickCommands' as const,
    label: t('workspace.workbench.tabs.quickCommands', '快捷指令'),
    icon: 'fas fa-bolt',
  },
  {
    id: 'files' as const,
    label: t('workspace.workbench.tabs.files', '文件'),
    icon: 'fas fa-folder-open',
  },
  {
    id: 'history' as const,
    label: t('workspace.workbench.tabs.history', '历史命令'),
    icon: 'fas fa-history',
  },
  {
    id: 'editor' as const,
    label: t('workspace.workbench.tabs.editor', '编辑器'),
    icon: 'fas fa-pen-to-square',
  },
]);

const activeSessionName = computed(() => {
  if (!props.sessionId) {
    return null;
  }

  return sessions.value.get(props.sessionId)?.connectionName ?? props.sessionId;
});

const hasFileManagerContext = computed(() => {
  return Boolean(props.sessionId && props.instanceId && props.dbConnectionId && props.wsDeps);
});

const fileManagerSessionId = computed(() => props.sessionId ?? '');
const fileManagerInstanceId = computed(() => props.instanceId ?? '');
const fileManagerConnectionId = computed(() => props.dbConnectionId ?? '');
const fileManagerWsDeps = computed(() => props.wsDeps as WebSocketDependencies);

watch(
  () => props.activeTabId,
  (newActiveTabId) => {
    if (newActiveTabId) {
      activeWorkbenchTab.value = 'editor';
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden bg-background">
    <div class="workbench-rail flex flex-shrink-0 items-center gap-2 overflow-x-auto border-b border-border px-3 py-2">
      <button
        v-for="tab in workbenchTabs"
        :key="tab.id"
        type="button"
        :title="tab.label"
        :aria-label="tab.label"
        @click="activeWorkbenchTab = tab.id"
        :class="[
          'inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm transition-colors',
          activeWorkbenchTab === tab.id
            ? 'border-primary bg-primary text-white shadow-sm'
            : 'border-transparent bg-transparent text-text-secondary hover:border-primary/20 hover:bg-background hover:text-foreground'
        ]"
      >
        <i :class="tab.icon"></i>
      </button>
    </div>

    <div class="border-b border-border bg-header px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-foreground">
            {{ t('workspace.workbench.title', 'Workbench') }}
          </h3>
          <p class="mt-1 truncate text-xs text-text-secondary">
            {{ activeSessionName || t('workspace.workbench.noSession', '未激活会话') }}
          </p>
        </div>
        <span class="rounded-full border border-border bg-background px-2 py-1 text-[11px] font-medium text-text-secondary">
          {{ t('workspace.workbench.label', '工作台') }}
        </span>
      </div>
    </div>

    <div class="relative flex-1 min-h-0 overflow-hidden bg-background">
      <div v-show="activeWorkbenchTab === 'quickCommands'" class="absolute inset-0 min-h-0 workbench-quick-commands">
        <QuickCommandsView />
      </div>

      <div v-show="activeWorkbenchTab === 'files'" class="absolute inset-0 min-h-0">
        <FileManager
          v-if="hasFileManagerContext"
          :session-id="fileManagerSessionId"
          :instance-id="fileManagerInstanceId"
          :db-connection-id="fileManagerConnectionId"
          :ws-deps="fileManagerWsDeps"
          class="h-full"
        />
        <div
          v-else
          class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-text-secondary"
        >
          <i class="fas fa-plug text-3xl"></i>
          <div class="text-sm font-medium">
            {{ t('layout.noActiveSession.title', '没有活动的会话') }}
          </div>
          <div class="text-xs">
            {{ t('workspace.workbench.fileManagerHint', '激活一个 SSH 会话后即可浏览远程文件。') }}
          </div>
        </div>
      </div>

      <div v-show="activeWorkbenchTab === 'history'" class="absolute inset-0 min-h-0">
        <CommandHistoryView />
      </div>

      <div v-show="activeWorkbenchTab === 'editor'" class="absolute inset-0 min-h-0">
        <FileEditorContainer
          :tabs="tabs"
          :active-tab-id="activeTabId"
          :session-id="sessionId"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.workbench-rail {
  background:
    linear-gradient(90deg, rgba(30, 41, 59, 0.94) 0%, rgba(17, 24, 39, 0.98) 100%);
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.04);
}

.workbench-quick-commands {
  background:
    linear-gradient(180deg, rgba(15, 17, 22, 0.98) 0%, rgba(12, 14, 18, 1) 100%);
}

.workbench-quick-commands :deep(> div),
.workbench-quick-commands :deep(> div > div) {
  background: transparent;
}

.workbench-quick-commands :deep(input) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  color: #f5f7fa;
  box-shadow: none;
}

.workbench-quick-commands :deep(input::placeholder) {
  color: rgba(226, 232, 240, 0.55);
}

.workbench-quick-commands :deep(button) {
  box-shadow: none;
}

.workbench-quick-commands :deep([data-command-id]) {
  position: relative;
  border-radius: 10px;
  color: #f8fafc;
}

.workbench-quick-commands :deep([data-command-id]::before) {
  content: '';
  position: absolute;
  left: 0.2rem;
  top: 0.2rem;
  bottom: 0.2rem;
  width: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.workbench-quick-commands :deep([data-command-id]:hover) {
  background: rgba(139, 92, 246, 0.14);
}

.workbench-quick-commands :deep([data-command-id].bg-primary\/20) {
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.18));
}

.workbench-quick-commands :deep(.font-semibold.flex.items-center) {
  color: #f8fafc;
}
</style>
