<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '../stores/settings.store';
import { useVersionCheck } from '../composables/settings/useVersionCheck';
import PageShell from '../components/PageShell.vue';
import ChangePasswordForm from '../components/settings/ChangePasswordForm.vue';
import PasskeyManagement from '../components/settings/PasskeyManagement.vue';
import TwoFactorAuthSettings from '../components/settings/TwoFactorAuthSettings.vue';
import CaptchaSettingsForm from '../components/settings/CaptchaSettingsForm.vue';
import IpWhitelistSettings from '../components/settings/IpWhitelistSettings.vue';
import IpBlacklistSettings from '../components/settings/IpBlacklistSettings.vue';
import AboutSection from '../components/settings/AboutSection.vue';
import WorkspaceSettingsSection from '../components/settings/WorkspaceSettingsSection.vue';
import SystemSettingsSection from '../components/settings/SystemSettingsSection.vue';
import DataManagementSection from '../components/settings/DataManagementSection.vue';
import AppearanceSection from '../components/settings/AppearanceSection.vue';

const settingsStore = useSettingsStore();
const { t } = useI18n();
const { isUpdateAvailable, checkLatestVersion } = useVersionCheck();

const tabs = computed(() => [
  { key: 'workspace', label: t('settings.tabs.workspace', '工作区'), icon: 'fas fa-sliders' },
  { key: 'system', label: t('settings.tabs.system', '系统'), icon: 'fas fa-server' },
  { key: 'security', label: t('settings.tabs.security', '安全'), icon: 'fas fa-shield-halved' },
  { key: 'ipControl', label: t('settings.tabs.ipControl', 'IP 管控'), icon: 'fas fa-network-wired' },
  { key: 'dataManagement', label: t('settings.tabs.dataManagement', '数据管理'), icon: 'fas fa-database' },
  { key: 'appearance', label: t('settings.tabs.appearance', '外观'), icon: 'fas fa-palette' },
  { key: 'about', label: t('settings.tabs.about', '关于'), icon: 'fas fa-circle-info' },
]);

const activeTab = ref('workspace');

const {
  settings,
  isLoading: settingsLoading,
  error: settingsError,
} = storeToRefs(settingsStore);

const settingsStats = computed(() => [
  {
    label: t('settings.tabs.workspace', '工作区'),
    value: activeTab.value === 'workspace' ? 'Active' : 'Ready',
    meta: t('settings.workspace.title', '工作区与终端'),
  },
  {
    label: t('settings.tabs.security', '安全'),
    value: settings.value ? 'Live' : 'Pending',
    meta: t('settings.category.security', '安全设置'),
  },
  {
    label: t('settings.tabs.appearance', '外观'),
    value: isUpdateAvailable.value ? 'Update' : 'Stable',
    meta: isUpdateAvailable.value
      ? t('settings.about.updateAvailable', '发现新版本')
      : t('settings.about.latestVersion', '已是最新版本'),
  },
]);

onMounted(async () => {
  await settingsStore.loadCaptchaSettings();
  await checkLatestVersion();
});
</script>

<template>
  <PageShell
    :title="t('nav.settings')"
    :subtitle="t('settings.controlCenterSubtitle', '将系统、安全、外观与工作区配置统一收束到一个控制中心。')"
  >
    <template #badge>
      <el-tag v-if="isUpdateAvailable" type="warning" effect="light" round>
        {{ t('settings.about.updateAvailable', '发现新版本') }}
      </el-tag>
    </template>

    <template #stats>
      <div class="control-stat-grid">
        <div v-for="stat in settingsStats" :key="stat.label" class="control-stat-card">
          <span class="control-stat-card__label">{{ stat.label }}</span>
          <span class="control-stat-card__value">{{ stat.value }}</span>
          <span class="control-stat-card__meta">{{ stat.meta }}</span>
        </div>
      </div>
    </template>

    <el-alert
      v-if="settingsError"
      :title="settingsError"
      type="error"
      :closable="false"
      show-icon
    />

    <el-card v-else shadow="never" class="control-panel">
      <el-tabs v-model="activeTab" class="settings-tabs">
        <el-tab-pane v-for="tab in tabs" :key="tab.key" :name="tab.key">
          <template #label>
            <span class="inline-flex items-center gap-2">
              <i :class="tab.icon"></i>
              <span>{{ tab.label }}</span>
            </span>
          </template>

          <div v-if="settingsLoading && !settings" class="control-empty">
            <el-skeleton :rows="6" animated />
          </div>

          <template v-else>
            <div v-if="activeTab === 'security'" class="grid gap-4">
              <el-card shadow="never">
                <template #header>{{ t('settings.category.security') }}</template>
                <div class="grid gap-6">
                  <ChangePasswordForm />
                  <el-divider />
                  <PasskeyManagement />
                  <el-divider />
                  <TwoFactorAuthSettings />
                  <el-divider />
                  <CaptchaSettingsForm />
                </div>
              </el-card>
            </div>

            <div v-if="activeTab === 'ipControl'" class="grid gap-4">
              <el-card shadow="never">
                <template #header>{{ t('settings.ipWhitelist.title') }}</template>
                <IpWhitelistSettings />
              </el-card>
              <el-card shadow="never">
                <template #header>{{ t('settings.ipBlacklist.title', 'IP 黑名单') }}</template>
                <IpBlacklistSettings />
              </el-card>
            </div>

            <el-card v-if="activeTab === 'workspace'" shadow="never">
              <template #header>{{ t('settings.tabs.workspace', '工作区') }}</template>
              <WorkspaceSettingsSection />
            </el-card>

            <el-card v-if="activeTab === 'system'" shadow="never">
              <template #header>{{ t('settings.tabs.system', '系统') }}</template>
              <SystemSettingsSection />
            </el-card>

            <el-card v-if="activeTab === 'dataManagement'" shadow="never">
              <template #header>{{ t('settings.tabs.dataManagement', '数据管理') }}</template>
              <DataManagementSection />
            </el-card>

            <el-card v-if="activeTab === 'appearance'" shadow="never">
              <template #header>{{ t('settings.tabs.appearance', '外观') }}</template>
              <AppearanceSection />
            </el-card>

            <el-card v-if="activeTab === 'about'" shadow="never">
              <template #header>{{ t('settings.tabs.about', '关于') }}</template>
              <AboutSection />
            </el-card>
          </template>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </PageShell>
</template>

<style scoped>
.settings-tabs :deep(.el-tabs__header) {
  margin-bottom: 1.25rem;
}
</style>
