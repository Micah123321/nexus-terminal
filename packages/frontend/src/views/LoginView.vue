<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { startAuthentication } from '@simplewebauthn/browser';
import VueHcaptcha from '@hcaptcha/vue3-hcaptcha';
import VueRecaptcha from 'vue3-recaptcha2';
import AuthPanelLayout from '../components/AuthPanelLayout.vue';
import { useAuthStore } from '../stores/auth.store';

const { t } = useI18n();
const authStore = useAuthStore();
const { isLoading, error, loginRequires2FA, publicCaptchaConfig, hasPasskeysAvailable } = storeToRefs(authStore);

const credentials = reactive({
  username: '',
  password: '',
});

const twoFactorToken = ref('');
const rememberMe = ref(false);
const captchaToken = ref<string | null>(null);
const captchaError = ref<string | null>(null);
const hcaptchaWidget = ref<InstanceType<typeof VueHcaptcha> | null>(null);
const recaptchaWidget = ref<InstanceType<typeof VueRecaptcha> | null>(null);

const handleCaptchaVerified = (token: string) => {
  captchaToken.value = token;
  captchaError.value = null;
};

const handleCaptchaExpired = () => {
  captchaToken.value = null;
};

const handleCaptchaError = (errorDetails: unknown) => {
  console.error('CAPTCHA error:', errorDetails);
  captchaToken.value = null;
  captchaError.value = t('login.error.captchaLoadFailed');
};

const resetCaptchaWidget = () => {
  captchaToken.value = null;
  hcaptchaWidget.value?.reset();
  recaptchaWidget.value?.reset();
};

const handleSubmit = async () => {
  captchaError.value = null;

  if (publicCaptchaConfig.value?.enabled && !loginRequires2FA.value && !captchaToken.value) {
    captchaError.value = t('login.error.captchaRequired');
    return;
  }

  try {
    if (loginRequires2FA.value) {
      await authStore.verifyLogin2FA(twoFactorToken.value);
    } else {
      await authStore.login({
        ...credentials,
        rememberMe: rememberMe.value,
        captchaToken: captchaToken.value ?? undefined,
      });
    }
  } finally {
    if (publicCaptchaConfig.value?.enabled) {
      resetCaptchaWidget();
    }
  }
};

onMounted(async () => {
  authStore.fetchCaptchaConfig();
  await authStore.checkHasPasskeysConfigured();
});

const handlePasskeyLogin = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    const authOptionsBody = credentials.username ? { username: credentials.username } : {};
    const optionsResponse = await fetch('/api/v1/auth/passkey/authentication-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authOptionsBody),
    });

    if (!optionsResponse.ok) {
      const errData = await optionsResponse.json();
      throw new Error(errData.message || t('login.error.passkeyAuthOptionsFailed'));
    }

    const authOptions = await optionsResponse.json();
    const authenticationResult = await startAuthentication(authOptions);
    await authStore.loginWithPasskey(credentials.username || '', authenticationResult);
  } catch (err: any) {
    console.error('Passkey login error:', err);
    error.value = err.message || t('login.error.passkeyAuthFailed');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <AuthPanelLayout
    :title="t('login.title')"
    :subtitle="t('login.controlCenterSubtitle', '使用密码、双重验证或 Passkey 安全接入你的控制中心。')"
  >
    <el-form label-position="top" @submit.prevent="handleSubmit">
      <div class="grid gap-5">
        <template v-if="!loginRequires2FA">
          <el-form-item :label="t('login.username')">
            <el-input v-model="credentials.username" :disabled="isLoading" size="large" clearable>
              <template #prefix>
                <i class="fas fa-user text-text-secondary"></i>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item :label="t('login.password')">
            <el-input
              v-model="credentials.password"
              :disabled="isLoading"
              type="password"
              show-password
              size="large"
            >
              <template #prefix>
                <i class="fas fa-lock text-text-secondary"></i>
              </template>
            </el-input>
          </el-form-item>

          <div class="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/60 px-4 py-3">
            <div>
              <div class="text-sm font-medium text-foreground">{{ t('login.rememberMe', '记住我') }}</div>
              <div class="text-xs text-text-secondary">
                {{ t('login.sessionHint', '在受信任设备上保留登录状态。') }}
              </div>
            </div>
            <el-checkbox v-model="rememberMe" :disabled="isLoading" />
          </div>
        </template>

        <el-form-item v-else :label="t('login.twoFactorPrompt')">
          <el-input
            v-model="twoFactorToken"
            :disabled="isLoading"
            maxlength="6"
            inputmode="numeric"
            size="large"
          >
            <template #prefix>
              <i class="fas fa-shield-halved text-text-secondary"></i>
            </template>
          </el-input>
        </el-form-item>

        <el-card
          v-if="publicCaptchaConfig && publicCaptchaConfig.enabled && !loginRequires2FA"
          shadow="never"
          class="border border-border/70 bg-white/65"
        >
          <div class="mb-3 text-sm font-medium text-foreground">
            {{ t('login.captchaPrompt') }}
          </div>

          <div v-if="publicCaptchaConfig?.provider === 'hcaptcha' && publicCaptchaConfig.hcaptchaSiteKey">
            <VueHcaptcha
              ref="hcaptchaWidget"
              :sitekey="publicCaptchaConfig.hcaptchaSiteKey"
              @verify="handleCaptchaVerified"
              @expired="handleCaptchaExpired"
              @error="handleCaptchaError"
              theme="light"
            />
          </div>

          <div v-else-if="publicCaptchaConfig?.provider === 'recaptcha' && publicCaptchaConfig.recaptchaSiteKey">
            <VueRecaptcha
              ref="recaptchaWidget"
              :sitekey="publicCaptchaConfig.recaptchaSiteKey"
              @verify="handleCaptchaVerified"
              @expire="handleCaptchaExpired"
              @fail="handleCaptchaError"
              theme="light"
            />
          </div>

          <el-alert
            v-if="captchaError"
            class="mt-4"
            :title="captchaError"
            type="error"
            :closable="false"
            show-icon
          />
        </el-card>

        <el-alert
          v-if="error"
          :title="error"
          type="error"
          :closable="false"
          show-icon
        />

        <el-button native-type="submit" type="primary" size="large" :loading="isLoading" class="w-full">
          {{ loginRequires2FA ? t('login.verifyButton') : t('login.loginButton') }}
        </el-button>

        <template v-if="hasPasskeysAvailable && !loginRequires2FA">
          <el-divider>{{ t('login.passkeyDivider', '或使用安全密钥') }}</el-divider>

          <el-button plain size="large" class="w-full" :loading="isLoading" @click="handlePasskeyLogin">
            <i class="fas fa-key mr-2"></i>
            {{ t('login.loginWithPasskey') }}
          </el-button>
        </template>
      </div>
    </el-form>
  </AuthPanelLayout>
</template>
