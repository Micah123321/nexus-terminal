<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  accentLabel: {
    type: String,
    default: 'Slate Control Center',
  },
});

const { t } = useI18n();
</script>

<template>
  <div class="auth-layout">
    <div class="auth-layout__panel auth-layout__panel--brand">
      <div class="auth-layout__brand-card">
        <span class="auth-layout__eyebrow">{{ accentLabel }}</span>
        <img src="../assets/logo.png" alt="Project Logo" class="auth-layout__logo" />
        <div>
          <h1 class="auth-layout__brand-title">{{ t('projectName') }}</h1>
          <p class="auth-layout__brand-copy">{{ t('slogan') }}</p>
        </div>
        <div class="auth-layout__brand-meter">
          <span>{{ subtitle }}</span>
        </div>
      </div>
    </div>

    <div class="auth-layout__panel auth-layout__panel--content">
      <div class="auth-layout__content-card">
        <div class="auth-layout__content-head">
          <el-tag effect="plain" round size="small">{{ accentLabel }}</el-tag>
          <h2>{{ title }}</h2>
          <p>{{ subtitle }}</p>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(280px, 440px) minmax(360px, 560px);
  justify-content: center;
  gap: 1.5rem;
  padding: 1.75rem;
}

.auth-layout__panel {
  min-width: 0;
}

.auth-layout__brand-card,
.auth-layout__content-card {
  height: 100%;
  border-radius: 32px;
  border: 1px solid rgba(103, 124, 155, 0.18);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(22px);
}

.auth-layout__brand-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 2rem;
  color: #f8fbff;
  background:
    linear-gradient(160deg, rgba(17, 31, 53, 0.94), rgba(32, 58, 102, 0.92)),
    radial-gradient(circle at 20% 20%, rgba(73, 119, 255, 0.34), transparent 35%);
}

.auth-layout__eyebrow {
  display: inline-flex;
  width: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.78);
}

.auth-layout__logo {
  width: 84px;
  height: auto;
  margin: 2rem 0 1.25rem;
}

.auth-layout__brand-title {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: clamp(2.4rem, 4vw, 3.6rem);
  line-height: 0.95;
  letter-spacing: -0.05em;
}

.auth-layout__brand-copy {
  margin: 0.85rem 0 0;
  color: rgba(240, 245, 255, 0.8);
  max-width: 24rem;
}

.auth-layout__brand-meter {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
  margin-top: 2rem;
  padding: 0.65rem 0.9rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(245, 248, 255, 0.78);
  font-size: 0.9rem;
}

.auth-layout__content-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(244, 248, 253, 0.86));
  padding: 2rem;
}

.auth-layout__content-head {
  margin-bottom: 1.4rem;
}

.auth-layout__content-head h2 {
  margin: 0.95rem 0 0;
  font-family: var(--font-family-display);
  font-size: clamp(1.9rem, 3vw, 2.5rem);
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--text-color);
}

.auth-layout__content-head p {
  margin: 0.75rem 0 0;
  color: var(--text-color-secondary);
}

@media (max-width: 1080px) {
  .auth-layout {
    grid-template-columns: 1fr;
    max-width: 680px;
    margin: 0 auto;
  }

  .auth-layout__brand-card {
    min-height: 260px;
  }
}

@media (max-width: 640px) {
  .auth-layout {
    padding: 1rem;
  }

  .auth-layout__brand-card,
  .auth-layout__content-card {
    border-radius: 24px;
    padding: 1.35rem;
  }

  .auth-layout__logo {
    width: 66px;
    margin-top: 1.25rem;
  }
}
</style>
