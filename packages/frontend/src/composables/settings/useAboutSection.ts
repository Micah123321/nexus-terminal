import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import pkg from '../../../package.json'; // 路径相对于当前文件
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

export function useAboutSection() {
  const { t } = useI18n();
  const appVersion = ref(normalizeVersionLabel(pkg.version));

  // --- Version Check State ---
  const latestVersion = ref<string | null>(null);
  const isCheckingVersion = ref(false);
  const versionCheckError = ref<string | null>(null);

  const isUpdateAvailable = computed(() => {
    if (!latestVersion.value) return false;

    return compareVersions(latestVersion.value, appVersion.value) > 0;
  });


  const checkLatestVersion = async () => {
    isCheckingVersion.value = true;
    versionCheckError.value = null;
    latestVersion.value = null; // Reset before check
    try {
      const response = await axios.get(`https://api.github.com/repos/${GITHUB_REPO_PATH}/releases/latest`, {
        // 移除 headers 以尝试解决潜在的CORS或请求问题，GitHub API 通常不需要特定 headers 进行公共读取
      });
      if (response.data && response.data.tag_name) {
        latestVersion.value = response.data.tag_name;
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error: any) {
      console.error('检查最新版本失败:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          versionCheckError.value = t('settings.about.error.noReleases', '没有找到发布版本。');
        } else if (error.response?.status === 403) {
          versionCheckError.value = t('settings.about.error.rateLimit', 'API 访问频率受限，请稍后再试。');
        } else {
          versionCheckError.value = t('settings.about.error.checkFailed', '检查更新失败，请检查网络连接或稍后再试。');
        }
      } else {
        versionCheckError.value = t('settings.about.error.checkFailed', '检查更新失败，请检查网络连接或稍后再试。');
      }
    } finally {
      isCheckingVersion.value = false;
    }
  };

  onMounted(() => {
    checkLatestVersion();
  });

  return {
    appVersion,
    latestVersion,
    isCheckingVersion,
    versionCheckError,
    isUpdateAvailable,
    checkLatestVersion, // Expose if manual refresh is needed
  };
}
