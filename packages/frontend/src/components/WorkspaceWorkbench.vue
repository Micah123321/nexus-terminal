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
    shortLabel: t('workspace.workbench.tabs.quickCommands', '快捷指令'),
    icon: 'fas fa-bolt',
    hint: t('workspace.workbench.quickCommandsHint', '默认面板，用于常用命令与预置脚本。'),
  },
  {
    id: 'files' as const,
    label: t('workspace.workbench.tabs.files', '文件'),
    shortLabel: t('workspace.workbench.tabs.files', '文件'),
    icon: 'fas fa-folder-tree',
    hint: t('workspace.workbench.filesHint', '浏览远程目录、拖放文件与操作资源。'),
  },
  {
    id: 'history' as const,
    label: t('workspace.workbench.tabs.history', '历史命令'),
    shortLabel: t('workspace.workbench.tabs.history', '历史命令'),
    icon: 'fas fa-clock-rotate-left',
    hint: t('workspace.workbench.historyHint', '回放最近命令并快速重发到当前会话。'),
  },
  {
    id: 'editor' as const,
    label: t('workspace.workbench.tabs.editor', '编辑器'),
    shortLabel: t('workspace.workbench.tabs.editor', '编辑器'),
    icon: 'fas fa-pen-ruler',
    hint: t('workspace.workbench.editorHint', '在工作台里直接查看并编辑当前打开的文件。'),
  },
]);

const activeSessionName = computed(() => {
  if (!props.sessionId) return null;
  return sessions.value.get(props.sessionId)?.connectionName ?? props.sessionId;
});

const activeWorkbenchMeta = computed(() => {
  return workbenchTabs.value.find((tab) => tab.id === activeWorkbenchTab.value) ?? workbenchTabs.value[0];
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
  <section class="workbench-shell">
    <header class="workbench-shell__header">
      <div class="workbench-shell__copy">
        <div class="workbench-shell__eyebrow">
          <el-tag round effect="light" type="primary">
            {{ t('workspace.workbench.label', '工作台') }}
          </el-tag>
          <span class="workbench-shell__session">
            {{ activeSessionName || t('workspace.workbench.noSession', '未激活会话') }}
          </span>
        </div>
        <h3>{{ t('workspace.workbench.title', 'Workbench') }}</h3>
        <p>{{ activeWorkbenchMeta.hint }}</p>
      </div>

      <div class="workbench-shell__chips">
        <div class="workbench-chip">
          <span>{{ t('workspace.workbench.tabs.quickCommands', '快捷指令') }}</span>
          <strong>Default</strong>
        </div>
        <div class="workbench-chip">
          <span>{{ t('workspace.workbench.tabs.editor', '编辑器') }}</span>
          <strong>{{ tabs.length }}</strong>
        </div>
      </div>
    </header>

    <el-tabs v-model="activeWorkbenchTab" class="workbench-tabs" stretch>
      <el-tab-pane v-for="tab in workbenchTabs" :key="tab.id" :name="tab.id">
        <template #label>
          <span class="workbench-tab-label">
            <i :class="tab.icon"></i>
            <span>{{ tab.shortLabel }}</span>
          </span>
        </template>

        <div class="workbench-shell__panel">
          <div v-show="activeWorkbenchTab === 'quickCommands'" class="workbench-panel workbench-panel--quick">
            <QuickCommandsView />
          </div>

          <div v-show="activeWorkbenchTab === 'files'" class="workbench-panel">
            <FileManager
              v-if="hasFileManagerContext"
              :session-id="fileManagerSessionId"
              :instance-id="fileManagerInstanceId"
              :db-connection-id="fileManagerConnectionId"
              :ws-deps="fileManagerWsDeps"
              class="h-full"
            />
            <div v-else class="workbench-empty">
              <el-empty :description="t('layout.noActiveSession.title', '没有活动的会话')">
                <template #image>
                  <i class="fas fa-folder-tree text-4xl text-text-secondary"></i>
                </template>
                <template #description>
                  <div class="text-sm text-text-secondary">
                    {{ t('workspace.workbench.fileManagerHint', '激活一个 SSH 会话后即可浏览远程文件。') }}
                  </div>
                </template>
              </el-empty>
            </div>
          </div>

          <div v-show="activeWorkbenchTab === 'history'" class="workbench-panel">
            <CommandHistoryView />
          </div>

          <div v-show="activeWorkbenchTab === 'editor'" class="workbench-panel">
            <FileEditorContainer :tabs="tabs" :active-tab-id="activeTabId" :session-id="sessionId" />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<style scoped>
.workbench-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(103, 124, 155, 0.18);
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(243, 247, 252, 0.82));
  box-shadow: var(--shadow-card);
}

.workbench-shell__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.1rem 0.8rem;
}

.workbench-shell__copy h3 {
  margin: 0.8rem 0 0;
  font-family: var(--font-family-display);
  font-size: 1.2rem;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--text-color);
}

.workbench-shell__copy p {
  margin: 0.65rem 0 0;
  color: var(--text-color-secondary);
  font-size: 0.84rem;
  line-height: 1.5;
}

.workbench-shell__eyebrow {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.workbench-shell__session {
  color: var(--text-color-tertiary);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.workbench-shell__chips {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.workbench-chip {
  min-width: 92px;
  padding: 0.7rem 0.85rem;
  border: 1px solid rgba(103, 124, 155, 0.14);
  border-radius: 18px;
  background: rgba(247, 250, 253, 0.9);
}

.workbench-chip span {
  display: block;
  color: var(--text-color-tertiary);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.workbench-chip strong {
  display: block;
  margin-top: 0.35rem;
  color: var(--text-color);
  font-size: 0.98rem;
}

.workbench-tabs {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 0.85rem 0.85rem;
}

.workbench-tabs :deep(.el-tabs__header) {
  margin-bottom: 0.75rem;
}

.workbench-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0.35rem;
  border-radius: 18px;
  background: rgba(236, 242, 249, 0.78);
}

.workbench-tabs :deep(.el-tabs__content),
.workbench-tabs :deep(.el-tab-pane) {
  min-height: 0;
  height: 100%;
}

.workbench-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.84rem;
}

.workbench-shell__panel {
  position: relative;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.workbench-panel {
  position: absolute;
  inset: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(103, 124, 155, 0.14);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
}

.workbench-panel--quick {
  background:
    radial-gradient(circle at top left, rgba(60, 105, 231, 0.14), transparent 24%),
    linear-gradient(180deg, rgba(248, 250, 255, 0.96), rgba(239, 245, 252, 0.92));
}

.workbench-empty {
  display: grid;
  place-items: center;
  height: 100%;
}

.workbench-panel--quick :deep(> div),
.workbench-panel--quick :deep(> div > div) {
  background: transparent;
}

@media (max-width: 1200px) {
  .workbench-shell__header {
    flex-direction: column;
  }

  .workbench-shell__chips {
    justify-content: flex-start;
  }
}
</style>
