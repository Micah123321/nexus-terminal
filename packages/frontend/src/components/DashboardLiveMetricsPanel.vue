<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DashboardSummary } from '../types/server.types';

const props = defineProps<{
  summary: DashboardSummary | null;
  isLoading: boolean;
}>();

const { t, locale } = useI18n();

const summaryAvailable = computed(() => !!props.summary);

const liveMetricGroups = computed(() => {
  if (!props.summary) {
    return [];
  }

  return [
    {
      key: 'currentUser',
      title: t('dashboard.liveMetrics.currentUser.title'),
      description: t('dashboard.liveMetrics.currentUser.description'),
      items: [
        {
          key: 'activeSshSessions',
          label: t('dashboard.liveMetrics.labels.activeSshSessions'),
          value: formatNumber(props.summary.liveMetrics.currentUser.activeSshSessions),
          icon: 'fa-terminal',
          iconClass: 'text-emerald-400',
        },
        {
          key: 'suspendedSessions',
          label: t('dashboard.liveMetrics.labels.suspendedSessions'),
          value: formatNumber(props.summary.liveMetrics.currentUser.suspendedSessions),
          icon: 'fa-pause-circle',
          iconClass: 'text-amber-400',
        },
      ],
    },
    {
      key: 'system',
      title: t('dashboard.liveMetrics.system.title'),
      description: t('dashboard.liveMetrics.system.description'),
      items: [
        {
          key: 'activeSshSessions',
          label: t('dashboard.liveMetrics.labels.activeSshSessions'),
          value: formatNumber(props.summary.liveMetrics.system.activeSshSessions),
          icon: 'fa-network-wired',
          iconClass: 'text-sky-400',
        },
        {
          key: 'suspendedSessions',
          label: t('dashboard.liveMetrics.labels.suspendedSessions'),
          value: formatNumber(props.summary.liveMetrics.system.suspendedSessions),
          icon: 'fa-layer-group',
          iconClass: 'text-violet-400',
        },
        {
          key: 'statusStreams',
          label: t('dashboard.liveMetrics.labels.statusStreams'),
          value: formatNumber(props.summary.liveMetrics.system.statusStreams),
          icon: 'fa-heart-pulse',
          iconClass: 'text-rose-400',
        },
      ],
    },
  ];
});

function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value);
}
</script>

<template>
  <section class="rounded-xl border border-border bg-card p-4 shadow-sm">
    <div class="mb-4">
      <h2 class="text-lg font-medium">{{ t('dashboard.liveMetrics.title') }}</h2>
      <p class="text-sm text-text-secondary">{{ t('dashboard.liveMetrics.description') }}</p>
    </div>

    <div v-if="isLoading && !summaryAvailable" class="text-center text-text-secondary">
      {{ t('common.loading') }}
    </div>

    <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section
        v-for="group in liveMetricGroups"
        :key="group.key"
        class="rounded-xl border border-border/70 bg-header/30 p-4"
      >
        <div class="mb-3">
          <h3 class="text-base font-medium">{{ group.title }}</h3>
          <p class="text-sm text-text-secondary">{{ group.description }}</p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article
            v-for="item in group.items"
            :key="item.key"
            class="rounded-lg border border-border/70 bg-card/80 px-3 py-3"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="text-sm text-text-secondary">{{ item.label }}</span>
              <i :class="['fas', item.icon, item.iconClass]"></i>
            </div>
            <p class="text-2xl font-semibold leading-none">{{ item.value }}</p>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
