<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ConnectionInfo } from '../stores/connections.store';
import { searchConnections } from '../utils/connectionSearch';

const props = defineProps<{
  connections: ConnectionInfo[];
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', connection: ConnectionInfo): void;
}>();

const { t } = useI18n();
const inputRef = ref<HTMLInputElement | null>(null);
const query = ref('');
const selectedIndex = ref(0);

const results = computed(() => searchConnections(props.connections, query.value, 8));

watch(results, async (nextResults) => {
  if (nextResults.length === 0) {
    selectedIndex.value = -1;
    return;
  }

  if (selectedIndex.value < 0 || selectedIndex.value >= nextResults.length) {
    selectedIndex.value = 0;
  }

  await nextTick();
});

onMounted(async () => {
  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
});

const close = () => emit('close');

const selectResult = (index: number) => {
  const target = results.value[index];
  if (!target) {
    return;
  }

  emit('select', target.connection);
};

const moveSelection = (direction: 1 | -1) => {
  if (results.value.length === 0) {
    return;
  }

  if (selectedIndex.value === -1) {
    selectedIndex.value = 0;
    return;
  }

  selectedIndex.value = (selectedIndex.value + direction + results.value.length) % results.value.length;
};

const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      moveSelection(1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      moveSelection(-1);
      break;
    case 'Enter':
      event.preventDefault();
      if (selectedIndex.value >= 0) {
        selectResult(selectedIndex.value);
      }
      break;
    case 'Escape':
      event.preventDefault();
      close();
      break;
    default:
      break;
  }
};

const getConnectionLabel = (connection: ConnectionInfo): string => connection.name || connection.host;
</script>

<template>
  <div
    class="fixed inset-0 z-[10001] flex items-start justify-center px-4 pt-[12vh]"
    :style="{ backgroundColor: 'var(--overlay-bg-color)' }"
    @click.self="close"
  >
    <div class="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
      <div class="border-b border-border/70 px-5 py-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
              {{ t('globalConnectionSearch.shortcut') }}
            </p>
            <h2 class="mt-1 text-xl font-semibold text-foreground">
              {{ t('globalConnectionSearch.title') }}
            </h2>
          </div>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-sm text-text-secondary transition-colors duration-150 hover:bg-border hover:text-foreground"
            @click="close"
          >
            Esc
          </button>
        </div>
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          class="mt-4 w-full rounded-xl border border-border/70 bg-input px-4 py-3 text-base text-foreground shadow-sm outline-none transition duration-150 ease-in-out placeholder:text-text-secondary focus:border-primary focus:ring-2 focus:ring-primary/40"
          :placeholder="t('globalConnectionSearch.placeholder')"
          @keydown="handleKeyDown"
        >
      </div>

      <div class="max-h-[60vh] overflow-y-auto px-3 py-3">
        <div v-if="isLoading && connections.length === 0" class="px-3 py-8 text-center text-sm text-text-secondary">
          <i class="fas fa-spinner fa-spin mr-2"></i>{{ t('globalConnectionSearch.loading') }}
        </div>

        <div v-else-if="results.length === 0" class="px-3 py-8 text-center text-sm text-text-secondary">
          <i class="fas fa-search mb-3 block text-xl"></i>
          <p v-if="query">{{ t('globalConnectionSearch.noResults', { query }) }}</p>
          <p v-else>{{ t('globalConnectionSearch.emptyHint') }}</p>
        </div>

        <button
          v-for="(item, index) in results"
          :key="item.connection.id"
          type="button"
          class="mb-2 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 last:mb-0"
          :class="index === selectedIndex
            ? 'border-primary/60 bg-primary/10 shadow-[0_0_0_1px_rgba(34,197,94,0.12)]'
            : 'border-border/60 bg-header/40 hover:border-primary/30 hover:bg-primary/5'"
          @mouseenter="selectedIndex = index"
          @click="selectResult(index)"
        >
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <i :class="['fas', item.connection.type === 'RDP' ? 'fa-desktop' : (item.connection.type === 'VNC' ? 'fa-plug' : 'fa-server')]"></i>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-semibold text-foreground">
                {{ getConnectionLabel(item.connection) }}
              </span>
              <span class="rounded-full bg-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                {{ item.connection.type }}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
              <span>{{ item.connection.host }}:{{ item.connection.port }}</span>
              <span>{{ item.connection.username }}</span>
            </div>
          </div>
        </button>
      </div>

      <div class="flex items-center justify-between border-t border-border/70 px-5 py-3 text-xs text-text-secondary">
        <span>{{ t('globalConnectionSearch.footerHint') }}</span>
        <span>{{ t('globalConnectionSearch.footerActions') }}</span>
      </div>
    </div>
  </div>
</template>
