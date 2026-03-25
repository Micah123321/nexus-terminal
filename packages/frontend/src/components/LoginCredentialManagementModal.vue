<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  useLoginCredentialsStore,
  type LoginCredentialBasicInfo,
  type LoginCredentialInput,
} from '../stores/loginCredentials.store';
import { useUiNotificationsStore } from '../stores/uiNotifications.store';
import { useConfirmDialog } from '../composables/useConfirmDialog';
import SshKeySelector from './SshKeySelector.vue';

const props = defineProps<{
  initialType?: 'SSH' | 'RDP' | 'VNC';
}>();

const emit = defineEmits(['close']);

const { t } = useI18n();
const loginCredentialsStore = useLoginCredentialsStore();
const uiNotificationsStore = useUiNotificationsStore();
const { showConfirmDialog } = useConfirmDialog();

const credentials = computed(() => loginCredentialsStore.loginCredentials);
const isLoading = computed(() => loginCredentialsStore.isLoading);

const isAddEditFormVisible = ref(false);
const credentialToEdit = ref<LoginCredentialBasicInfo | null>(null);

const initialFormData: LoginCredentialInput = {
  name: '',
  type: props.initialType || 'SSH',
  username: '',
  auth_method: 'password',
  password: '',
  ssh_key_id: null,
  notes: '',
};

const formData = reactive({ ...initialFormData });
const formError = ref<string | null>(null);

watch(() => props.initialType, (newValue) => {
  if (!credentialToEdit.value && newValue) {
    formData.type = newValue;
  }
});

watch(() => formData.type, (newType) => {
  if (newType !== 'SSH') {
    formData.auth_method = 'password';
    formData.ssh_key_id = null;
  }
});

onMounted(() => {
  loginCredentialsStore.fetchLoginCredentials();
});

const resetForm = () => {
  Object.assign(formData, initialFormData, { type: props.initialType || 'SSH' });
  formError.value = null;
};

const showAddForm = () => {
  credentialToEdit.value = null;
  resetForm();
  isAddEditFormVisible.value = true;
};

const showEditForm = async (credential: LoginCredentialBasicInfo) => {
  formError.value = null;
  credentialToEdit.value = credential;

  const details = await loginCredentialsStore.fetchLoginCredentialDetails(credential.id);
  if (!details) {
    uiNotificationsStore.addNotification({ message: loginCredentialsStore.error || t('connections.form.errorCredentialDetails', '获取登录凭证详情失败。'), type: 'error' });
    credentialToEdit.value = null;
    return;
  }

  formData.name = details.name;
  formData.type = details.type;
  formData.username = details.username;
  formData.auth_method = details.auth_method;
  formData.password = details.password || '';
  formData.ssh_key_id = details.ssh_key_id ?? null;
  formData.notes = details.notes || '';
  isAddEditFormVisible.value = true;
};

const validateForm = (): boolean => {
  if (!formData.name || !formData.username) {
    formError.value = t('connections.form.errorCredentialRequiredFields', '名称和用户名为必填项。');
    return false;
  }

  if (formData.type === 'SSH') {
    if (formData.auth_method === 'password' && !formData.password) {
      formError.value = t('connections.form.errorPasswordRequired', '密码为必填项。');
      return false;
    }
    if (formData.auth_method === 'key' && !formData.ssh_key_id) {
      formError.value = t('connections.form.errorSshKeyRequired', '必须选择 SSH 密钥。');
      return false;
    }
  } else if (!formData.password) {
    formError.value = t('connections.form.errorPasswordRequired', '密码为必填项。');
    return false;
  }

  return true;
};

const buildPayload = (): LoginCredentialInput => {
  const payload: LoginCredentialInput = {
    name: formData.name,
    type: formData.type,
    username: formData.username,
    auth_method: formData.type === 'SSH' ? formData.auth_method : 'password',
    notes: formData.notes || '',
  };

  if (formData.type === 'SSH') {
    if (formData.auth_method === 'password') {
      payload.password = formData.password;
      payload.ssh_key_id = null;
    } else {
      payload.ssh_key_id = formData.ssh_key_id;
      payload.password = undefined;
    }
  } else {
    payload.password = formData.password;
    payload.ssh_key_id = null;
  }

  return payload;
};

const handleSubmit = async () => {
  formError.value = null;
  if (!validateForm()) {
    return;
  }

  const payload = buildPayload();
  const success = credentialToEdit.value
    ? await loginCredentialsStore.updateLoginCredential(credentialToEdit.value.id, payload)
    : await loginCredentialsStore.addLoginCredential(payload);

  if (!success) {
    formError.value = loginCredentialsStore.error;
    return;
  }

  isAddEditFormVisible.value = false;
  credentialToEdit.value = null;
  resetForm();
};

const handleDelete = async (credential: LoginCredentialBasicInfo) => {
  const confirmed = await showConfirmDialog({
    message: t('connections.form.confirmDeleteCredential', { name: credential.name }, `确认删除登录凭证 ${credential.name}？`)
  });
  if (!confirmed) {
    return;
  }

  const success = await loginCredentialsStore.deleteLoginCredential(credential.id);
  if (!success) {
    uiNotificationsStore.addNotification({ message: loginCredentialsStore.error || t('connections.form.errorDeleteCredential', '删除登录凭证失败。'), type: 'error' });
    return;
  }

  if (credentialToEdit.value?.id === credential.id) {
    isAddEditFormVisible.value = false;
    credentialToEdit.value = null;
    resetForm();
  }
};

const cancelForm = () => {
  isAddEditFormVisible.value = false;
  credentialToEdit.value = null;
  resetForm();
};
</script>

<template>
  <div class="fixed inset-0 bg-overlay flex justify-center items-center z-50 p-4">
    <div class="bg-background text-foreground p-6 rounded-lg shadow-xl border border-border w-full max-w-4xl max-h-[85vh] flex flex-col">
      <div v-if="!isAddEditFormVisible" class="flex flex-col h-full">
        <h3 class="text-xl font-semibold text-center mb-4 flex-shrink-0">
          {{ t('connections.form.loginCredentialManager', '登录凭证管理') }}
        </h3>

        <div class="mb-4 flex justify-end flex-shrink-0">
          <button
            @click="showAddForm"
            class="px-4 py-2 bg-button text-button-text rounded-md shadow-sm hover:bg-button-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            :disabled="isLoading"
          >
            <i class="fas fa-plus mr-2" style="color: white;"></i>{{ t('connections.form.addLoginCredential', '新增登录凭证') }}
          </button>
        </div>

        <div class="flex-grow overflow-y-auto border border-border rounded-md" style="max-height: 55vh;">
          <table class="min-w-full divide-y divide-border">
            <thead class="bg-header sticky top-0">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {{ t('connections.form.name', '名称') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {{ t('connections.form.connectionType', '连接类型') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {{ t('connections.form.username', '用户名') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {{ t('connections.form.authMethod', '认证方式') }}
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {{ t('connections.table.actions', '操作') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-background divide-y divide-border">
              <tr v-if="isLoading">
                <td colspan="5" class="px-6 py-4 text-sm text-text-secondary text-center">{{ t('common.loading', '加载中...') }}</td>
              </tr>
              <tr v-else-if="credentials.length === 0">
                <td colspan="5" class="px-6 py-4 text-sm text-text-secondary text-center">{{ t('connections.form.noLoginCredentials', '暂无登录凭证') }}</td>
              </tr>
              <tr v-for="credential in credentials" :key="credential.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{{ credential.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{{ credential.type }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{{ credential.username }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{{ credential.auth_method }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button @click="showEditForm(credential)" class="text-primary hover:text-primary-hover disabled:opacity-50" :disabled="isLoading" :title="t('connections.actions.edit', '编辑')">
                    <i class="fas fa-pencil-alt"></i>
                  </button>
                  <button @click="handleDelete(credential)" class="text-error hover:text-error-hover disabled:opacity-50" :disabled="isLoading" :title="t('connections.actions.delete', '删除')">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-6 text-right flex-shrink-0">
          <button
            @click="emit('close')"
            class="px-4 py-2 bg-transparent text-text-secondary border border-border rounded-md shadow-sm hover:bg-border hover:text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            :disabled="isLoading"
          >
            {{ t('common.close', '关闭') }}
          </button>
        </div>
      </div>

      <div v-else class="flex flex-col h-full">
        <h3 class="text-xl font-semibold text-center mb-6 flex-shrink-0">
          {{ credentialToEdit ? t('connections.form.editLoginCredential', '编辑登录凭证') : t('connections.form.addLoginCredential', '新增登录凭证') }}
        </h3>
        <form @submit.prevent="handleSubmit" class="flex-grow overflow-y-auto pr-2 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="credential-name" class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.name', '名称') }}</label>
              <input id="credential-name" v-model="formData.name" type="text" required class="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.connectionType', '连接类型') }}</label>
              <div class="flex rounded-md shadow-sm">
                <button type="button" @click="formData.type = 'SSH'" :class="['flex-1 px-3 py-2 border border-border text-sm font-medium focus:outline-none', formData.type === 'SSH' ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-border', 'rounded-l-md']">SSH</button>
                <button type="button" @click="formData.type = 'RDP'" :class="['flex-1 px-3 py-2 border-t border-b border-r border-border text-sm font-medium focus:outline-none -ml-px', formData.type === 'RDP' ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-border']">RDP</button>
                <button type="button" @click="formData.type = 'VNC'" :class="['flex-1 px-3 py-2 border border-border text-sm font-medium focus:outline-none -ml-px', formData.type === 'VNC' ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-border', 'rounded-r-md']">VNC</button>
              </div>
            </div>
          </div>

          <div>
            <label for="credential-username" class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.username', '用户名') }}</label>
            <input id="credential-username" v-model="formData.username" type="text" required class="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
          </div>

          <template v-if="formData.type === 'SSH'">
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.authMethod', '认证方式') }}</label>
              <div class="flex rounded-md shadow-sm">
                <button type="button" @click="formData.auth_method = 'password'" :class="['flex-1 px-3 py-2 border border-border text-sm font-medium focus:outline-none', formData.auth_method === 'password' ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-border', 'rounded-l-md']">
                  {{ t('connections.form.authMethodPassword', '密码') }}
                </button>
                <button type="button" @click="formData.auth_method = 'key'" :class="['flex-1 px-3 py-2 border-t border-b border-r border-border text-sm font-medium focus:outline-none -ml-px', formData.auth_method === 'key' ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-border', 'rounded-r-md']">
                  {{ t('connections.form.authMethodKey', 'SSH 密钥') }}
                </button>
              </div>
            </div>
            <div v-if="formData.auth_method === 'password'">
              <label for="credential-password" class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.password', '密码') }}</label>
              <input id="credential-password" v-model="formData.password" type="password" autocomplete="new-password" class="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
            </div>
            <div v-else>
              <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.sshKey', 'SSH 密钥') }}</label>
              <SshKeySelector v-model="formData.ssh_key_id" />
            </div>
          </template>

          <div v-else>
            <label for="credential-password-generic" class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.password', '密码') }}</label>
            <input id="credential-password-generic" v-model="formData.password" type="password" autocomplete="new-password" class="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
          </div>

          <div>
            <label for="credential-notes" class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.notes', '备注') }}</label>
            <textarea id="credential-notes" v-model="formData.notes" rows="3" class="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"></textarea>
          </div>

          <div v-if="formError" class="text-error bg-error/10 border border-error/30 rounded-md p-3 text-sm text-center font-medium">
            {{ formError }}
          </div>
        </form>

        <div class="flex justify-end space-x-3 pt-5 mt-4 flex-shrink-0">
          <button type="button" @click="cancelForm" :disabled="isLoading" class="px-4 py-2 bg-transparent text-text-secondary border border-border rounded-md shadow-sm hover:bg-border hover:text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
            {{ t('common.cancel', '取消') }}
          </button>
          <button type="submit" @click="handleSubmit" :disabled="isLoading" class="px-4 py-2 bg-button text-button-text rounded-md shadow-sm hover:bg-button-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
            {{ credentialToEdit ? t('common.save', '保存') : t('connections.form.addLoginCredential', '新增登录凭证') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
