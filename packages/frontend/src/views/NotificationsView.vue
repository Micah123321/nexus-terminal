<script setup lang="ts">
import PageShell from '../components/PageShell.vue';
import NotificationSettings from '../components/NotificationSettings.vue';
</script>

<template>
  <PageShell
    :title="$t('nav.notifications')"
    :subtitle="$t('notifications.controlCenterSubtitle', '集中配置 webhook、邮件与 Telegram 通知渠道，统一管理触发事件。')"
  >
    <el-card shadow="never" class="control-panel">
      <NotificationSettings />
    </el-card>
  </PageShell>
</template>
