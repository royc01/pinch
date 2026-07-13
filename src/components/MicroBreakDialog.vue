<template>
  <div v-if="visible" class="micro-break-overlay" role="status" aria-live="assertive">
    <div class="micro-break-dialog">
      <div class="micro-break-dialog__title">{{ t('focusTimer.microBreakActiveTitle') }}</div>
      <div class="micro-break-dialog__message">{{ t('focusTimer.microBreakActiveBody') }}</div>
      <div class="micro-break-dialog__countdown">{{ remainingSeconds }}{{ t('focusTimer.secondSuffix') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

defineProps<{ visible: boolean; remainingSeconds: number }>();
const { t } = useI18n();
</script>

<style scoped>
.micro-break-overlay { position: fixed; z-index: 10001; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.micro-break-dialog { width: min(320px, calc(100vw - 32px)); padding: 24px; border: 1px solid var(--b3-border-color); border-radius: 12px; background: var(--b3-theme-surface); box-shadow: var(--b3-dialog-shadow); text-align: center; }
.micro-break-dialog__title { color: var(--b3-theme-primary); font-size: 18px; font-weight: 600; }
.micro-break-dialog__message { margin-top: 8px; color: var(--b3-theme-on-surface); }
.micro-break-dialog__countdown { margin-top: 16px; color: var(--b3-theme-primary); font-size: 28px; font-variant-numeric: tabular-nums; }
</style>
