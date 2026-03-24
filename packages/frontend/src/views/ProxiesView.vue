<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useProxiesStore, ProxyInfo } from '../stores/proxies.store';
import PageShell from '../components/PageShell.vue';
import ProxyList from '../components/ProxyList.vue';
import AddProxyForm from '../components/AddProxyForm.vue';

const { t } = useI18n();
const proxiesStore = useProxiesStore();

const showForm = ref(false);
const editingProxy = ref<ProxyInfo | null>(null);

onMounted(() => {
  proxiesStore.fetchProxies();
});

const handleProxyAdded = () => {
  showForm.value = false;
};

const handleProxyUpdated = () => {
  editingProxy.value = null;
  showForm.value = false;
};

const handleEditRequest = (proxy: ProxyInfo) => {
  editingProxy.value = proxy;
  showForm.value = true;
};

const openAddForm = () => {
  editingProxy.value = null;
  showForm.value = true;
};

const closeForm = () => {
  editingProxy.value = null;
  showForm.value = false;
};
</script>

<template>
  <PageShell
    :title="t('proxies.title')"
    :subtitle="t('proxies.controlCenterSubtitle', '在统一的控制中心里管理代理入口、账号和转发策略。')"
  >
    <template #actions>
      <el-button type="primary" @click="openAddForm">
        <i class="fas fa-plus mr-2"></i>
        {{ t('proxies.addProxy') }}
      </el-button>
    </template>

    <el-card shadow="never" class="control-panel">
      <AddProxyForm
        v-if="showForm"
        :proxy-to-edit="editingProxy"
        @close="closeForm"
        @proxy-added="handleProxyAdded"
        @proxy-updated="handleProxyUpdated"
      />

      <ProxyList @edit-proxy="handleEditRequest" />
    </el-card>
  </PageShell>
</template>
