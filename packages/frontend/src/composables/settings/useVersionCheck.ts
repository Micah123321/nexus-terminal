import { ref, computed } from 'vue';
import axios from 'axios';
import pkg from '../../../package.json'; // 调整路径以正确导入 package.json
import { useI18n } from 'vue-i18n';

const GITHUB_REPO_PATH = 'Micah123321/nexus-terminal';

const normalizeVersionLabel = (version: string) => {
  const cleanVersion = version.startsWith('v') ? version.slice(1) : version;
  return cleanVersion.replace(/^(\d+\.\d+)\.0$/, '$1');
};

const parseVersion = (version: string) => {
  const cleanVersion = version.startsWith('v') ? version.slice(1) : version;
  const [major = '0', minor = '0', patch = '0'] = cleanVersion.split('.');

  return [
    Number.parseInt(major, 10) || 0,
    Number.parseInt(minor, 10) || 0,
    Number.parseInt(patch, 10) || 0,
  ] as const;
};

const compareVersions = (left: string, right: string) => {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] > rightParts[index]) {
      return 1;
    }

    if (leftParts[index] < rightParts[index]) {
      return -1;
    }
  }

  return 0;
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

    return compareVersions(latestVersion.value, appVersion.value) > 0;
  });

  const checkLatestVersion = async () => {
    isCheckingVersion.value = true;
    versionCheckError.value = null;
    latestVersion.value = null;
    try {
      const response = await axios.get(`https://api.github.com/repos/${GITHUB_REPO_PATH}/releases/latest`);
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
