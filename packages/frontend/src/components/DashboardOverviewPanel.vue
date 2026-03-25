<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'vue-chartjs';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS, ja, zhCN } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import DashboardLiveMetricsPanel from './DashboardLiveMetricsPanel.vue';
import type { ConnectionInfo } from '../stores/connections.store';
import type { DashboardSummary } from '../types/server.types';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

interface TopConnectionViewModel {
  connectionId: number;
  connectionName: string;
  host: string;
  count: number;
  lastSeenAt: number;
  connection: ConnectionInfo | null;
}

const props = defineProps<{
  summary: DashboardSummary | null;
  isLoading: boolean;
  error: string | null;
  topConnections: TopConnectionViewModel[];
}>();

const emit = defineEmits<{
  connect: [connection: ConnectionInfo]
}>();

const { t, locale } = useI18n();

const dateFnsLocales: Record<string, Locale> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'ja-JP': ja,
  en: enUS,
  zh: zhCN,
  ja,
};

const chartPalette = ['#38bdf8', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6'];

const summaryAvailable = computed(() => !!props.summary);

const summaryCards = computed(() => {
  if (!props.summary) {
    return [];
  }

  return [
    {
      key: 'connections',
      icon: 'fa-server',
      label: t('dashboard.summaryCards.connections'),
      value: formatNumber(props.summary.totals.connections),
      hint: t('dashboard.summaryHints.connections'),
      iconClass: 'text-sky-400',
    },
    {
      key: 'activeConnections7d',
      icon: 'fa-bolt',
      label: t('dashboard.summaryCards.activeConnections7d'),
      value: formatNumber(props.summary.totals.activeConnections7d),
      hint: t('dashboard.summaryHints.activeConnections7d'),
      iconClass: 'text-emerald-400',
    },
    {
      key: 'taggedConnections',
      icon: 'fa-tags',
      label: t('dashboard.summaryCards.taggedConnections'),
      value: formatNumber(props.summary.totals.taggedConnections),
      hint: t('dashboard.summaryHints.taggedConnections'),
      iconClass: 'text-amber-400',
    },
    {
      key: 'auditLogs',
      icon: 'fa-clipboard-list',
      label: t('dashboard.summaryCards.auditLogs'),
      value: formatNumber(props.summary.totals.auditLogs),
      hint: t('dashboard.summaryHints.auditLogs'),
      iconClass: 'text-violet-400',
    },
    {
      key: 'sshSuccess24h',
      icon: 'fa-circle-check',
      label: t('dashboard.summaryCards.sshSuccess24h'),
      value: formatNumber(props.summary.sshOutcomes24h.success),
      hint: t('dashboard.summaryHints.sshSuccess24h'),
      iconClass: 'text-green-400',
    },
    {
      key: 'sshFailure24h',
      icon: 'fa-triangle-exclamation',
      label: t('dashboard.summaryCards.sshFailure24h'),
      value: formatNumber(props.summary.sshOutcomes24h.failure),
      hint: t('dashboard.summaryHints.sshFailure24h'),
      iconClass: 'text-rose-400',
    },
  ];
});

const lineChartData = computed(() => {
  const points = props.summary?.activityTrend7d ?? [];
  return {
    labels: points.map((point) => formatTrendLabel(point.date)),
    datasets: [
      {
        label: t('dashboard.charts.activityTrend7d'),
        data: points.map((point) => point.count),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.18)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };
});

const doughnutChartData = computed(() => {
  const rows = props.summary?.connectionTypes ?? [];
  return {
    labels: rows.map((row) => row.label),
    datasets: [
      {
        data: rows.map((row) => row.count),
        backgroundColor: chartPalette.slice(0, rows.length),
        borderColor: '#111827',
        borderWidth: 1,
      },
    ],
  };
});

const barChartData = computed(() => {
  const rows = props.summary?.actionBreakdown7d ?? [];
  return {
    labels: rows.map((row) => getActionTranslation(row.actionType)),
    datasets: [
      {
        label: t('dashboard.charts.eventCount'),
        data: rows.map((row) => row.count),
        backgroundColor: rows.map((_, index) => chartPalette[index % chartPalette.length]),
        borderRadius: 6,
        maxBarThickness: 44,
      },
    ],
  };
});

const lineChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#cbd5e1',
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#94a3b8',
      },
      grid: {
        color: 'rgba(148, 163, 184, 0.12)',
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: '#94a3b8',
        precision: 0,
      },
      grid: {
        color: 'rgba(148, 163, 184, 0.12)',
      },
    },
  },
};

const doughnutChartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#cbd5e1',
        boxWidth: 12,
      },
    },
  },
};

const barChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#94a3b8',
      },
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: '#94a3b8',
        precision: 0,
      },
      grid: {
        color: 'rgba(148, 163, 184, 0.12)',
      },
    },
  },
};

function resolveDateFnsLocale(): Locale {
  return dateFnsLocales[locale.value] || dateFnsLocales[locale.value.split('-')[0]] || enUS;
}

function formatRelativeTime(timestampInSeconds: number): string {
  return formatDistanceToNow(new Date(timestampInSeconds * 1000), {
    addSuffix: true,
    locale: resolveDateFnsLocale(),
  });
}

function formatTrendLabel(date: string): string {
  return format(new Date(`${date}T00:00:00`), 'MM/dd', {
    locale: resolveDateFnsLocale(),
  });
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value);
}

function getActionTranslation(actionType: string): string {
  const key = `auditLog.actions.${actionType}`;
  const translated = t(key);
  return translated === key ? actionType : translated;
}

function hasChartData(rows: Array<{ count: number }>): boolean {
  return rows.some((row) => row.count > 0);
}

function handleConnect(connection: ConnectionInfo | null): void {
  if (connection) {
    emit('connect', connection);
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="card in summaryCards"
        :key="card.key"
        class="rounded-xl border border-border bg-card px-4 py-4 shadow-sm"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <p class="text-xs uppercase tracking-[0.14em] text-text-alt">{{ card.label }}</p>
            <p class="text-3xl font-semibold leading-none">{{ card.value }}</p>
            <p class="text-sm text-text-secondary">{{ card.hint }}</p>
          </div>
          <div class="flex h-11 w-11 items-center justify-center rounded-lg border border-border/70 bg-header/60">
            <i :class="['fas', card.icon, card.iconClass, 'text-lg']"></i>
          </div>
        </div>
      </article>
    </div>

    <div
      v-if="error"
      class="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
    >
      {{ t('dashboard.summaryLoadFailed') }}: {{ error }}
    </div>

    <DashboardLiveMetricsPanel :summary="summary" :is-loading="isLoading" />

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <section class="rounded-xl border border-border bg-card p-4 shadow-sm xl:col-span-2">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-medium">{{ t('dashboard.charts.activityTrend7d') }}</h2>
            <p class="text-sm text-text-secondary">{{ t('dashboard.charts.activityTrendHint') }}</p>
          </div>
          <span class="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300">7d</span>
        </div>
        <div class="h-72">
          <div
            v-if="isLoading && !summaryAvailable"
            class="flex h-full items-center justify-center text-text-secondary"
          >
            {{ t('common.loading') }}
          </div>
          <Line
            v-else-if="summary && hasChartData(summary.activityTrend7d)"
            :data="lineChartData"
            :options="lineChartOptions"
          />
          <div v-else class="flex h-full items-center justify-center text-text-secondary">
            {{ t('dashboard.emptyChart') }}
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div class="mb-4">
          <h2 class="text-lg font-medium">{{ t('dashboard.charts.connectionTypes') }}</h2>
          <p class="text-sm text-text-secondary">{{ t('dashboard.charts.connectionTypesHint') }}</p>
        </div>
        <div class="h-72">
          <div
            v-if="isLoading && !summaryAvailable"
            class="flex h-full items-center justify-center text-text-secondary"
          >
            {{ t('common.loading') }}
          </div>
          <Doughnut
            v-else-if="summary && hasChartData(summary.connectionTypes)"
            :data="doughnutChartData"
            :options="doughnutChartOptions"
          />
          <div v-else class="flex h-full items-center justify-center text-text-secondary">
            {{ t('dashboard.emptyChart') }}
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-border bg-card p-4 shadow-sm xl:col-span-3">
        <div class="mb-4">
          <h2 class="text-lg font-medium">{{ t('dashboard.charts.actionBreakdown7d') }}</h2>
          <p class="text-sm text-text-secondary">{{ t('dashboard.charts.actionBreakdownHint') }}</p>
        </div>
        <div class="h-72">
          <div
            v-if="isLoading && !summaryAvailable"
            class="flex h-full items-center justify-center text-text-secondary"
          >
            {{ t('common.loading') }}
          </div>
          <Bar
            v-else-if="summary && hasChartData(summary.actionBreakdown7d)"
            :data="barChartData"
            :options="barChartOptions"
          />
          <div v-else class="flex h-full items-center justify-center text-text-secondary">
            {{ t('dashboard.emptyChart') }}
          </div>
        </div>
      </section>
    </div>

    <section class="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div class="mb-4">
        <h2 class="text-lg font-medium">{{ t('dashboard.topConnections') }}</h2>
        <p class="text-sm text-text-secondary">{{ t('dashboard.topConnectionsHint') }}</p>
      </div>
      <div v-if="isLoading && !summaryAvailable" class="text-center text-text-secondary">
        {{ t('common.loading') }}
      </div>
      <ul v-else-if="topConnections.length > 0" class="space-y-3">
        <li
          v-for="connection in topConnections"
          :key="connection.connectionId"
          class="rounded-lg border border-border/70 bg-header/40 p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-medium">{{ connection.connectionName }}</p>
              <p class="truncate text-sm text-text-secondary">{{ connection.host }}</p>
              <p class="mt-1 text-xs text-text-alt">
                {{ t('dashboard.activityCount', { count: formatNumber(connection.count) }) }}
              </p>
              <p class="text-xs text-text-alt">
                {{ t('dashboard.lastSeen', { time: formatRelativeTime(connection.lastSeenAt) }) }}
              </p>
            </div>
            <button
              class="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!connection.connection"
              @click="handleConnect(connection.connection)"
            >
              {{ t('connections.actions.connect') }}
            </button>
          </div>
        </li>
      </ul>
      <div v-else class="text-center text-text-secondary">
        {{ t('dashboard.emptyChart') }}
      </div>
    </section>
  </div>
</template>
