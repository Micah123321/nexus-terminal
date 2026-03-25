<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLoginCredentialsStore } from '../stores/loginCredentials.store';
import LoginCredentialManagementModal from './LoginCredentialManagementModal.vue';

const props = defineProps<{
  modelValue: number | null;
  connectionType: 'SSH' | 'RDP' | 'VNC';
}>();

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const loginCredentialsStore = useLoginCredentialsStore();
const isManagementModalVisible = ref(false);
const selectedCredentialId = ref<number | null>(props.modelValue);

const credentials = computed(() =>
  loginCredentialsStore.loginCredentials.filter((credential) => credential.type === props.connectionType)
);

watch(() => props.modelValue, (newValue) => {
  selectedCredentialId.value = newValue;
});

watch(selectedCredentialId, (newValue) => {
  emit('update:modelValue', typeof newValue === 'number' ? newValue : null);
});

watch(() => props.connectionType, () => {
  if (!credentials.value.some((credential) => credential.id === selectedCredentialId.value)) {
    selectedCredentialId.value = null;
  }
});

const openManagementModal = () => {
  isManagementModalVisible.value = true;
  loginCredentialsStore.fetchLoginCredentials();
};

const closeManagementModal = () => {
  isManagementModalVisible.value = false;
  loginCredentialsStore.fetchLoginCredentials();
};

onMounted(() => {
  if (loginCredentialsStore.loginCredentials.length === 0) {
    loginCredentialsStore.fetchLoginCredentials();
  }
});
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center space-x-3">
      <select
        id="login-credential-select"
        v-model="selectedCredentialId"
        :disabled="loginCredentialsStore.isLoading"
        class="flex-grow px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none bg-no-repeat bg-right pr-8"
        style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3e%3cpath fill=\'none\' stroke=\'%236c757d\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M2 5l6 6 6-6\'/%3e%3c/svg%3e'); background-position: right 0.75rem center; background-size: 16px 12px;"
      >
        <option :value="null">{{ t('connections.form.selectLoginCredential', '请选择登录凭证') }}</option>
        <option v-for="credential in credentials" :key="credential.id" :value="credential.id">
          {{ credential.name }} · {{ credential.username }}
        </option>
      </select>
      <button
        type="button"
        @click="openManagementModal"
        :disabled="loginCredentialsStore.isLoading"
        class="px-3 py-2 border border-border rounded-md text-sm font-medium text-text-secondary bg-background hover:bg-border focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        :title="t('connections.form.manageLoginCredentials', '管理登录凭证')"
      >
        <i class="fas fa-cog"></i>
      </button>
    </div>
    <div v-if="loginCredentialsStore.isLoading" class="text-xs text-text-secondary">
      {{ t('common.loading', '加载中...') }}
    </div>
    <div v-if="loginCredentialsStore.error" class="text-xs text-error">
      {{ loginCredentialsStore.error }}
    </div>

    <LoginCredentialManagementModal
      v-if="isManagementModalVisible"
      :initial-type="connectionType"
      @close="closeManagementModal"
    />
  </div>
</template>
