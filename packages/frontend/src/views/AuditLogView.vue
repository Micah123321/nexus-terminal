<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuditLogStore } from '../stores/audit.store';
import type { AuditLogEntry, AuditLogActionType } from '../types/server.types';
import PageShell from '../components/PageShell.vue';

const store = useAuditLogStore();
const { t } = useI18n();

const searchTerm = ref('');
const selectedActionType = ref<AuditLogActionType | ''>('');

const allActionTypes: AuditLogActionType[] = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  'PASSWORD_CHANGED',
  '2FA_ENABLED',
  '2FA_DISABLED',
  'CONNECTION_CREATED',
  'CONNECTION_UPDATED',
  'CONNECTION_DELETED',
  'PROXY_CREATED',
  'PROXY_UPDATED',
  'PROXY_DELETED',
  'TAG_CREATED',
  'TAG_UPDATED',
  'TAG_DELETED',
  'SETTINGS_UPDATED',
  'IP_WHITELIST_UPDATED',
  'NOTIFICATION_SETTING_CREATED',
  'NOTIFICATION_SETTING_UPDATED',
  'NOTIFICATION_SETTING_DELETED',
  'SSH_CONNECT_SUCCESS',
  'SSH_CONNECT_FAILURE',
  'SSH_SHELL_FAILURE',
  'DATABASE_MIGRATION',
  'ADMIN_SETUP_COMPLETE',
];

const logs = computed(() => store.logs);
const totalLogs = computed(() => store.totalLogs);
const currentPage = computed(() => store.currentPage);
const logsPerPage = computed(() => store.logsPerPage);
const totalPages = computed(() => Math.max(1, Math.ceil(totalLogs.value / logsPerPage.value)));

const auditStats = computed(() => [
  {
    label: t('auditLog.title'),
    value: totalLogs.value,
    meta: `${t('common.search', '搜索')}: ${searchTerm.value || t('common.all', '全部')}`,
  },
  {
    label: t('auditLog.table.actionType'),
    value: selectedActionType.value || t('common.all', '全部'),
    meta: `${currentPage.value} / ${totalPages.value}`,
  },
]);

const applyFilters = () => {
  store.fetchLogs({
    page: 1,
    searchTerm: searchTerm.value || undefined,
    actionType: selectedActionType.value || undefined,
  });
};

onMounted(() => {
  store.fetchLogs();
});

const formatTimestamp = (timestamp: number): string => new Date(timestamp * 1000).toLocaleString();

const translateActionType = (actionType: AuditLogActionType): string => {
  const key = `auditLog.actions.${actionType}`;
  const translated = t(key);
  return translated === key ? actionType : translated;
};

const formatDetails = (details: AuditLogEntry['details']): string => {
  if (!details) return '-';
  if (typeof details === 'object') {
    if ('raw' in details && details.parseError) {
      return `[Parse Error] Raw: ${details.raw}`;
    }
    return JSON.stringify(details, null, 2);
  }
  return String(details);
};

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    store.fetchLogs({
      page,
      searchTerm: searchTerm.value || undefined,
      actionType: selectedActionType.value || undefined,
    });
  }
};
</script>

<template>
  <PageShell
    :title="$t('auditLog.title')"
    :subtitle="$t('auditLog.controlCenterSubtitle', '通过统一的筛选、时间线与明细面板追踪所有关键系统操作。')"
  >
    <template #actions>
      <el-button plain @click="applyFilters">
        <i class="fas fa-rotate-right mr-2"></i>
        {{ $t('common.filter') }}
      </el-button>
    </template>

    <template #stats>
      <div class="control-stat-grid">
        <div v-for="stat in auditStats" :key="stat.label" class="control-stat-card">
          <span class="control-stat-card__label">{{ stat.label }}</span>
          <span class="control-stat-card__value">{{ stat.value }}</span>
          <span class="control-stat-card__meta">{{ stat.meta }}</span>
        </div>
      </div>
    </template>

    <el-card shadow="never" class="control-panel">
      <div class="grid gap-3 md:grid-cols-[minmax(240px,1fr)_220px_auto]">
        <el-input v-model="searchTerm" :placeholder="$t('auditLog.searchPlaceholder')" clearable>
          <template #prefix>
            <i class="fas fa-search text-text-secondary"></i>
          </template>
        </el-input>

        <el-select v-model="selectedActionType" clearable :placeholder="$t('auditLog.table.actionType')">
          <el-option :label="$t('common.all')" value="" />
          <el-option
            v-for="type in allActionTypes"
            :key="type"
            :label="translateActionType(type)"
            :value="type"
          />
        </el-select>

        <el-button type="primary" @click="applyFilters">
          {{ $t('common.filter') }}
        </el-button>
      </div>

      <el-alert
        v-if="store.error"
        class="mt-4"
        :title="store.error"
        type="error"
        :closable="false"
        show-icon
      />

      <div v-else-if="store.isLoading && logs.length === 0" class="control-empty mt-4">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else-if="!store.isLoading && logs.length === 0" class="control-empty mt-4">
        <el-empty :description="$t('auditLog.noLogs')" />
      </div>

      <template v-else>
        <el-table :data="logs" class="mt-5" stripe>
          <el-table-column prop="timestamp" :label="$t('auditLog.table.timestamp')" min-width="180">
            <template #default="{ row }">
              {{ formatTimestamp(row.timestamp) }}
            </template>
          </el-table-column>

          <el-table-column prop="action_type" :label="$t('auditLog.table.actionType')" min-width="190">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ translateActionType(row.action_type) }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="details" :label="$t('auditLog.table.details')" min-width="420">
            <template #default="{ row }">
              <pre class="m-0 whitespace-pre-wrap break-all rounded-2xl bg-muted p-3 text-xs text-foreground">{{ formatDetails(row.details) }}</pre>
            </template>
          </el-table-column>
        </el-table>

        <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="text-sm text-text-secondary">
            {{ $t('auditLog.paginationInfo', { currentPage, totalPages, totalLogs }) }}
          </div>

          <el-pagination
            background
            layout="prev, pager, next"
            :current-page="currentPage"
            :page-size="logsPerPage"
            :total="totalLogs"
            @current-change="changePage"
          />
        </div>
      </template>
    </el-card>
  </PageShell>
</template>
