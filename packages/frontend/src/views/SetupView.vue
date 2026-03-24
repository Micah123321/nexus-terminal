<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AuthPanelLayout from '../components/AuthPanelLayout.vue';
import apiClient from '../utils/apiClient';
import { useAuthStore } from '../stores/auth.store';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const handleSetup = async () => {
  error.value = null;
  successMessage.value = null;

  if (password.value !== confirmPassword.value) {
    error.value = t('setup.error.passwordsDoNotMatch');
    return;
  }

  if (!username.value || !password.value) {
    error.value = t('setup.error.fieldsRequired');
    return;
  }

  isLoading.value = true;

  try {
    await apiClient.post('/auth/setup', {
      username: username.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    });

    successMessage.value = t('setup.success');
    authStore.needsSetup = false;
    authStore.isAuthenticated = false;
    authStore.user = null;
    router.push('/login');
  } catch (err: any) {
    console.error('Setup failed:', err);
    if (err.response?.data?.message) {
      error.value = err.response.data.message;
    } else if (err.message) {
      error.value = err.message;
    } else {
      error.value = t('setup.error.generic');
    }
    isLoading.value = false;
  }
};
</script>

<template>
  <AuthPanelLayout
    :title="t('setup.title')"
    :subtitle="t('setup.description')"
    accent-label="Slate Bootstrap"
  >
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mb-5"
      :title="t('setup.bootstrapHint', '创建首个管理员账号后即可进入完整控制中心。')"
    />

    <el-form label-position="top" @submit.prevent="handleSetup">
      <div class="grid gap-5">
        <el-form-item :label="t('setup.username')">
          <el-input
            v-model="username"
            :disabled="isLoading"
            :placeholder="t('setup.usernamePlaceholder')"
            size="large"
            clearable
          >
            <template #prefix>
              <i class="fas fa-user text-text-secondary"></i>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="t('setup.password')">
          <el-input
            v-model="password"
            :disabled="isLoading"
            :placeholder="t('setup.passwordPlaceholder')"
            type="password"
            show-password
            size="large"
          >
            <template #prefix>
              <i class="fas fa-lock text-text-secondary"></i>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="t('setup.confirmPassword')">
          <el-input
            v-model="confirmPassword"
            :disabled="isLoading"
            :placeholder="t('setup.confirmPasswordPlaceholder')"
            type="password"
            show-password
            size="large"
          >
            <template #prefix>
              <i class="fas fa-check text-text-secondary"></i>
            </template>
          </el-input>
        </el-form-item>

        <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
        <el-alert v-if="successMessage" :title="successMessage" type="success" :closable="false" show-icon />

        <el-button native-type="submit" type="primary" size="large" class="w-full" :loading="isLoading">
          {{ t('setup.submitButton') }}
        </el-button>
      </div>
    </el-form>
  </AuthPanelLayout>
</template>
