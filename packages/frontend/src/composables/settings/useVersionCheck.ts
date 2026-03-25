import { ref, computed } from 'vue';
import axios from 'axios';
import pkg from '../../../package.json'; // 调整路径以正确导入 package.json
import { useI18n } from 'vue-i18n';

const normalizeVersionLabel = (version: string) => {
  const cleanVersion = version.startsWith('v') ? version.slice(1) : version;
  return cleanVersion.replace(/^(\d+\.\d+)\.0$/, '$1');
};

export function useVersionCheck() {
  const { t } = useI18n();
  const appVersion = ref(normalizeVersionLabel(pkg.version));
  const latestVersion = ref<string | null>(null);
  const isCheckingVersion = ref(false);
  const versionCheckError = ref<string | null>(null);

  const isUpdateAvailable = computed(() => {
    if (!latestVersion.value) {
      return false;
    }

    return normalizeVersionLabel(latestVersion.value) !== appVersion.value;
  });

  const checkLatestVersion = async () => {
    isCheckingVersion.value = true;
    versionCheckError.value = null;
    latestVersion.value = null;
    try {
      const response = await axios.get('https://api.github.com/repos/Heavrnl/nexus-terminal/releases/latest');
      if (response.data && response.data.tag_name) {
        latestVersion.value = response.data.tag_name;
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error: any) {
      console.error('检查最新版本失败:', error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        versionCheckError.value = t('settings.about.error.noReleases');
      } else if (axios.isAxiosError(error) && error.response?.status === 403) {
         versionCheckError.value = t('settings.about.error.rateLimit');
      } else {
        versionCheckError.value = t('settings.about.error.checkFailed');
      }
    } finally {
      isCheckingVersion.value = false;
    }
  };

  return {
    appVersion,
    latestVersion,
    isCheckingVersion,
    versionCheckError,
    isUpdateAvailable,
    checkLatestVersion,
  };
}
