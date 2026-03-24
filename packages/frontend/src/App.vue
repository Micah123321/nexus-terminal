<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from './stores/auth.store';
import { useDeviceDetection } from './composables/useDeviceDetection';
import { useSettingsStore } from './stores/settings.store';
import { useAppearanceStore } from './stores/appearance.store';
import { useLayoutStore } from './stores/layout.store';
import { useFocusSwitcherStore } from './stores/focusSwitcher.store';
import { useSessionStore } from './stores/session.store';
import { useFavoritePathsStore } from './stores/favoritePaths.store';
import { storeToRefs } from 'pinia';
import UINotificationDisplay from './components/UINotificationDisplay.vue';
import FileEditorOverlay from './components/FileEditorOverlay.vue';
import StyleCustomizer from './components/StyleCustomizer.vue';
import FocusSwitcherConfigurator from './components/FocusSwitcherConfigurator.vue';
import RemoteDesktopModal from './components/RemoteDesktopModal.vue';
import VncModal from './components/VncModal.vue';
import ConfirmDialog from './components/common/ConfirmDialog.vue';
import { useDialogStore } from './stores/dialog.store';

const { t } = useI18n();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const appearanceStore = useAppearanceStore();
const layoutStore = useLayoutStore();
const focusSwitcherStore = useFocusSwitcherStore();
const sessionStore = useSessionStore();
const dialogStore = useDialogStore();
const { state: dialogState } = storeToRefs(dialogStore);
const favoritePathsStore = useFavoritePathsStore();
const { isAuthenticated } = storeToRefs(authStore);
const { showPopupFileEditorBoolean } = storeToRefs(settingsStore);
const { isStyleCustomizerVisible } = storeToRefs(appearanceStore);
const { isHeaderVisible } = storeToRefs(layoutStore);
const { isConfiguratorVisible: isFocusSwitcherVisible } = storeToRefs(focusSwitcherStore);
const { isRdpModalOpen, rdpConnectionInfo, isVncModalOpen, vncConnectionInfo } = storeToRefs(sessionStore);
const { isMobile } = useDeviceDetection();

const route = useRoute();
const navRef = ref<HTMLElement | null>(null);
const underlineRef = ref<HTMLElement | null>(null);

const lastFocusedIdBySwitcher = ref<string | null>(null);
const isAltPressed = ref(false);
const altShortcutKey = ref<string | null>(null);

const updateUnderline = async () => {
  await nextTick();
  if (navRef.value && underlineRef.value) {
    const activeLink = navRef.value.querySelector('.router-link-exact-active') as HTMLElement;
    if (activeLink) {
      underlineRef.value.style.left = `${activeLink.offsetLeft}px`;
      underlineRef.value.style.width = `${activeLink.offsetWidth}px`;
      underlineRef.value.style.opacity = '1';
    } else {
      underlineRef.value.style.opacity = '0';
    }
  }
};

onMounted(() => {
  setTimeout(updateUnderline, 100);

  window.addEventListener('keydown', handleAltKeyDown);
  window.addEventListener('keyup', handleGlobalKeyUp);

  window.addEventListener('beforeinstallprompt', () => {
    console.log('[App.vue] beforeinstallprompt event fired. Browser will handle install prompt.');
  });

  window.addEventListener('appinstalled', () => {
    console.log('[App.vue] PWA was installed');
  });

  layoutStore.loadHeaderVisibility();
});

watch(
  isAuthenticated,
  (loggedIn) => {
    if (loggedIn) {
      favoritePathsStore.initializeFavoritePaths(t);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  window.removeEventListener('keydown', handleAltKeyDown);
  window.removeEventListener('keyup', handleGlobalKeyUp);
});

const isWorkspaceRoute = computed(() => route.path === '/workspace');

watch(
  route,
  () => {
    updateUnderline();
  },
  { immediate: true }
);

const handleLogout = () => {
  authStore.logout();
};

const openStyleCustomizer = () => {
  appearanceStore.toggleStyleCustomizer(true);
};

const closeStyleCustomizer = () => {
  appearanceStore.toggleStyleCustomizer(false);
};

const handleAltKeyDown = async (event: KeyboardEvent) => {
  if (!isWorkspaceRoute.value) return;

  if (event.key === 'Alt' && !event.repeat) {
    isAltPressed.value = true;
    altShortcutKey.value = null;
  } else if (isAltPressed.value && !['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
    let key = event.key;
    if (key.length === 1) key = key.toUpperCase();

    if (/^[a-zA-Z0-9]$/.test(key)) {
      altShortcutKey.value = key;
      const shortcutString = `Alt+${key}`;
      const targetId = focusSwitcherStore.getFocusTargetIdByShortcut(shortcutString);

      if (targetId) {
        event.preventDefault();
        const success = await focusSwitcherStore.focusTarget(targetId);
        if (success) {
          lastFocusedIdBySwitcher.value = targetId;
        }
      }
    } else {
      isAltPressed.value = false;
      altShortcutKey.value = null;
    }
  } else if (isAltPressed.value && ['Control', 'Shift', 'Meta'].includes(event.key)) {
    isAltPressed.value = false;
    altShortcutKey.value = null;
  }
};

const handleGlobalKeyUp = async (event: KeyboardEvent) => {
  if (!isWorkspaceRoute.value) return;
  if (event.key !== 'Alt') return;

  const altWasPressed = isAltPressed.value;
  const triggeredShortcutKey = altShortcutKey.value;

  isAltPressed.value = false;
  altShortcutKey.value = null;

  if (altWasPressed && triggeredShortcutKey === null) {
    event.preventDefault();

    let currentFocusId: string | null = lastFocusedIdBySwitcher.value;

    if (!currentFocusId) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.hasAttribute('data-focus-id')) {
        currentFocusId = activeElement.getAttribute('data-focus-id');
      }
    }

    const order = focusSwitcherStore.sequenceOrder;
    if (order.length === 0) {
      return;
    }

    let focused = false;
    for (let i = 0; i < order.length; i += 1) {
      const nextFocusId = focusSwitcherStore.getNextFocusTargetId(currentFocusId);
      if (!nextFocusId) {
        break;
      }

      const success = await focusSwitcherStore.focusTarget(nextFocusId);
      if (success) {
        lastFocusedIdBySwitcher.value = nextFocusId;
        focused = true;
        break;
      }

      currentFocusId = nextFocusId;
    }

    if (!focused) {
      lastFocusedIdBySwitcher.value = null;
    }
  }
};
</script>

<template>
  <div id="app-container" class="app-shell">
    <div class="app-shell__backdrop"></div>

    <header v-if="!isWorkspaceRoute || isHeaderVisible" class="app-topbar">
      <nav ref="navRef" class="app-topbar__inner">
        <div class="app-topbar__left">
          <RouterLink to="/" class="app-brand">
            <img src="./assets/logo.png" alt="Project Logo" class="app-brand__logo">
            <div class="app-brand__copy">
              <span class="app-brand__title">{{ t('projectName') }}</span>
              <span class="app-brand__subtitle">Slate Control Center</span>
            </div>
          </RouterLink>

          <div class="app-nav">
            <RouterLink to="/" class="app-nav__link" active-class="is-active">{{ t('nav.dashboard') }}</RouterLink>
            <RouterLink to="/workspace" class="app-nav__link" active-class="is-active">{{ t('nav.terminal') }}</RouterLink>
            <RouterLink to="/connections" class="app-nav__link hidden md:inline-flex" active-class="is-active">{{ t('nav.connections') }}</RouterLink>
            <RouterLink to="/proxies" class="app-nav__link hidden md:inline-flex" active-class="is-active">{{ t('nav.proxies') }}</RouterLink>
            <RouterLink to="/notifications" class="app-nav__link hidden md:inline-flex" active-class="is-active">{{ t('nav.notifications') }}</RouterLink>
            <RouterLink to="/audit-logs" class="app-nav__link hidden md:inline-flex" active-class="is-active">{{ t('nav.auditLogs') }}</RouterLink>
            <RouterLink to="/settings" class="app-nav__link" active-class="is-active">{{ t('nav.settings') }}</RouterLink>
            <div ref="underlineRef" class="app-nav__underline"></div>
          </div>
        </div>

        <div class="app-topbar__right">
          <a
            v-if="!isMobile"
            href="https://github.com/Heavrnl/nexus-terminal"
            target="_blank"
            rel="noopener noreferrer"
            title="Heavrnl/nexus-terminal"
            class="app-icon-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
            </svg>
          </a>

          <a href="#" @click.prevent="openStyleCustomizer" :title="t('nav.customizeStyle')" class="app-icon-button">
            <i class="fas fa-paint-brush"></i>
          </a>

          <RouterLink v-if="!isAuthenticated" to="/login" class="app-auth-link">{{ t('nav.login') }}</RouterLink>
          <a v-else href="#" @click.prevent="handleLogout" class="app-auth-link app-auth-link--primary">{{ t('nav.logout') }}</a>
        </div>
      </nav>
    </header>

    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <KeepAlive :include="['WorkspaceView', 'ConnectionsView']">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>

    <UINotificationDisplay />
    <FileEditorOverlay v-if="showPopupFileEditorBoolean" :is-mobile="isMobile" />
    <StyleCustomizer v-if="isStyleCustomizerVisible" @close="closeStyleCustomizer" />

    <FocusSwitcherConfigurator
      v-show="isFocusSwitcherVisible"
      :isVisible="isFocusSwitcherVisible"
      @close="focusSwitcherStore.toggleConfigurator(false)"
    />

    <RemoteDesktopModal v-if="isRdpModalOpen" :connection="rdpConnectionInfo" @close="sessionStore.closeRdpModal()" />
    <VncModal v-if="isVncModalOpen" :connection="vncConnectionInfo" @close="sessionStore.closeVncModal()" />

    <ConfirmDialog
      :visible="dialogState.visible"
      :title="dialogState.title"
      :message="dialogState.message"
      :confirm-text="dialogState.confirmText"
      :cancel-text="dialogState.cancelText"
      :is-loading="dialogState.isLoading"
      @confirm="dialogStore.handleConfirm"
      @cancel="dialogStore.handleCancel"
      @update:visible="(val: boolean) => dialogStore.state.visible = val"
    />
  </div>
</template>

<style scoped>
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  font-family: var(--font-family-sans-serif);
}

.app-shell__backdrop {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at top right, rgba(60, 105, 231, 0.08), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 22%);
}

.app-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  padding: 1rem 1rem 0;
}

.app-topbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.1rem;
  border-radius: 24px;
  border: 1px solid rgba(103, 124, 155, 0.18);
  background: var(--header-bg-color);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(18px);
}

.app-topbar__left,
.app-topbar__right {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.app-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.85rem;
  padding-right: 0.35rem;
}

.app-brand__logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.app-brand__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-brand__title {
  font-family: var(--font-family-display);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-color);
}

.app-brand__subtitle {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-color-tertiary);
}

.app-nav {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem;
  border-radius: 18px;
  background: rgba(241, 245, 251, 0.9);
}

.app-nav__link {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.72rem 1rem;
  border-radius: 14px;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  transition: color 0.2s ease;
}

.app-nav__link.is-active {
  color: var(--primary-color);
}

.app-nav__underline {
  position: absolute;
  bottom: 0.35rem;
  height: calc(100% - 0.7rem);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(239, 244, 252, 0.94));
  box-shadow: 0 10px 24px rgba(34, 56, 93, 0.12);
  transition: all 0.3s ease-in-out;
  opacity: 0;
  transform: translateY(0);
  pointer-events: none;
}

.app-icon-button,
.app-auth-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 40px;
  padding: 0 0.9rem;
  border: 1px solid rgba(103, 124, 155, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.app-icon-button:hover,
.app-auth-link:hover {
  color: var(--text-color);
  border-color: rgba(60, 105, 231, 0.26);
  background: rgba(255, 255, 255, 0.94);
}

.app-icon-button {
  width: 40px;
  padding: 0;
}

.app-auth-link--primary {
  background: linear-gradient(135deg, rgba(60, 105, 231, 0.14), rgba(39, 70, 184, 0.08));
  color: var(--primary-color);
}

.app-main {
  flex-grow: 1;
  position: relative;
  padding-bottom: 1rem;
}

@media (max-width: 1100px) {
  .app-topbar__inner {
    flex-direction: column;
    align-items: stretch;
  }

  .app-topbar__left,
  .app-topbar__right {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .app-nav {
    flex-wrap: wrap;
  }
}

@media (max-width: 720px) {
  .app-topbar {
    padding: 0.75rem 0.75rem 0;
  }

  .app-topbar__inner {
    padding: 0.8rem;
    border-radius: 20px;
  }

  .app-brand__subtitle {
    display: none;
  }

  .app-nav__link {
    padding: 0.64rem 0.82rem;
    font-size: 0.84rem;
  }
}
</style>
