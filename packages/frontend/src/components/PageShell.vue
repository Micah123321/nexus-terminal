<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  eyebrow: {
    type: String,
    default: 'Slate Control Center',
  },
});
</script>

<template>
  <section class="page-shell">
    <header class="page-shell__hero">
      <div class="page-shell__copy">
        <div class="page-shell__eyebrow">
          <el-tag effect="plain" round size="small">{{ eyebrow }}</el-tag>
          <slot name="badge" />
        </div>
        <h1 class="page-shell__title">{{ title }}</h1>
        <p v-if="subtitle" class="page-shell__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="page-shell__actions">
        <slot name="actions" />
      </div>
    </header>

    <div v-if="$slots.stats" class="page-shell__stats">
      <slot name="stats" />
    </div>

    <div class="page-shell__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.page-shell {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: min(1360px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.4rem 0 2rem;
}

.page-shell__hero {
  display: flex;
  justify-content: space-between;
  gap: 1.25rem;
  align-items: flex-end;
  padding: 1.5rem 1.6rem;
  border-radius: 28px;
  border: 1px solid rgba(103, 124, 155, 0.16);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(242, 247, 253, 0.78)),
    linear-gradient(180deg, rgba(60, 105, 231, 0.08), transparent);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(18px);
}

.page-shell__copy {
  min-width: 0;
}

.page-shell__eyebrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}

.page-shell__title {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: clamp(2rem, 3vw, 2.8rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
  color: var(--text-color);
}

.page-shell__subtitle {
  margin: 0.75rem 0 0;
  max-width: 62ch;
  color: var(--text-color-secondary);
  font-size: 0.98rem;
}

.page-shell__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.page-shell__stats,
.page-shell__body {
  min-width: 0;
}

@media (max-width: 960px) {
  .page-shell {
    width: min(100%, calc(100% - 1.25rem));
    padding-top: 1rem;
  }

  .page-shell__hero {
    padding: 1.2rem;
    flex-direction: column;
    align-items: flex-start;
  }

  .page-shell__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
