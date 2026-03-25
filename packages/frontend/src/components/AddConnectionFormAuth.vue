<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import SshKeySelector from './SshKeySelector.vue'; // Assuming SshKeySelector is used here
import LoginCredentialSelector from './LoginCredentialSelector.vue';

// Define Props. formData is expected to be a reactive object from the parent composable.
const props = defineProps<{
  formData: {
    type: 'SSH' | 'RDP' | 'VNC';
    credential_source: 'direct' | 'saved';
    login_credential_id: number | null;
    username: string;
    auth_method: 'password' | 'key'; // SSH specific
    password?: string; // Optional because it might not be set or sent
    selected_ssh_key_id: number | null; // SSH specific
    vncPassword?: string; // VNC specific, optional for the same reasons as password
  };
  isEditMode: boolean; // To determine if fields are required
}>();

const { t } = useI18n();
</script>

<template>
  <!-- Authentication Section -->
  <div class="space-y-4 p-4 border border-border rounded-md bg-header/30">
    <h4 class="text-base font-semibold mb-3 pb-2 border-b border-border/50">{{ t('connections.form.sectionAuth', '认证信息') }}</h4>
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.credentialSource', '认证来源') }}</label>
      <div class="flex rounded-md shadow-sm">
        <button type="button"
                @click="props.formData.credential_source = 'direct'"
                :class="['flex-1 px-3 py-2 border border-border text-sm font-medium focus:outline-none',
                         props.formData.credential_source === 'direct' ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-border',
                         'rounded-l-md']">
          {{ t('connections.form.credentialSourceDirect', '账号密码 / 密钥') }}
        </button>
        <button type="button"
                @click="props.formData.credential_source = 'saved'"
                :class="['flex-1 px-3 py-2 border border-border text-sm font-medium focus:outline-none -ml-px',
                         props.formData.credential_source === 'saved' ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-border',
                         'rounded-r-md']">
          {{ t('connections.form.credentialSourceSaved', '使用已保存凭证') }}
        </button>
      </div>
    </div>

    <div v-if="props.formData.credential_source === 'saved'" class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.savedLoginCredential', '登录凭证') }}</label>
        <LoginCredentialSelector v-model="props.formData.login_credential_id" :connection-type="props.formData.type" />
      </div>
      <p class="text-xs text-text-secondary">
        {{ t('connections.form.savedCredentialHint', '已保存凭证会在连接和测试时优先使用；切回直填后仍可继续手工输入。') }}
      </p>
    </div>

    <template v-else>
    <div>
      <label for="conn-username" class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.username') }}</label>
      <input type="text" id="conn-username" v-model="props.formData.username" required
             class="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
    </div>

    <!-- SSH Specific Auth -->
    <template v-if="props.formData.type === 'SSH'">
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.authMethod') }}</label>
        <div class="flex rounded-md shadow-sm">
          <button type="button"
                  @click="props.formData.auth_method = 'password'"
                  :class="['flex-1 px-3 py-2 border border-border text-sm font-medium focus:outline-none',
                           props.formData.auth_method === 'password' ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-border',
                           'rounded-l-md']">
            {{ t('connections.form.authMethodPassword') }}
          </button>
          <button type="button"
                  @click="props.formData.auth_method = 'key'"
                  :class="['flex-1 px-3 py-2 border-t border-b border-r border-border text-sm font-medium focus:outline-none -ml-px',
                           props.formData.auth_method === 'key' ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-border',
                           'rounded-r-md']">
            {{ t('connections.form.authMethodKey') }}
          </button>
        </div>
      </div>

      <div v-if="props.formData.auth_method === 'password'">
        <label for="conn-password" class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.password') }}</label>
        <input type="password" id="conn-password" v-model="props.formData.password" :required="props.formData.auth_method === 'password' && !isEditMode" autocomplete="new-password"
               class="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
      </div>

      <div v-if="props.formData.auth_method === 'key'" class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.sshKey') }}</label>
            <SshKeySelector v-model="props.formData.selected_ssh_key_id" />
        </div>
      </div>
    </template>

    <!-- RDP Specific Auth -->
    <template v-if="props.formData.type === 'RDP'">
       <div>
         <label for="conn-password-rdp" class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.password') }}</label>
         <input type="password" id="conn-password-rdp" v-model="props.formData.password" :required="!isEditMode" autocomplete="new-password"
                class="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
       </div>
     </template>

    <!-- VNC Specific Auth -->
    <template v-if="props.formData.type === 'VNC'">
      <div>
        <label for="conn-password-vnc" class="block text-sm font-medium text-text-secondary mb-1">{{ t('connections.form.vncPassword', 'VNC 密码') }}</label>
        <input type="password" id="conn-password-vnc" v-model="props.formData.vncPassword" :required="!isEditMode" autocomplete="new-password"
               class="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
      </div>
    </template>
    </template>
  </div>
</template>
