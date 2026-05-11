<template>
  <div v-if="show" class="checkin-note-overlay" @click.self="handleCancel">
    <div class="checkin-note-dialog" @click.stop>
      <div class="checkin-note-header">
        <div class="checkin-note-title">
          <span v-if="habitEmoji" class="habit-emoji-display">{{ habitEmoji }}</span>
          <span>{{ habitName }} - {{ isEdit ? t('modifyNote') : t('checkinNote') }}</span>
        </div>
        <button type="button" class="icon-button" :title="t('close')" :aria-label="t('close')" @click="handleCancel">
          <Icon name="close" width="14" height="14" class="icon" />
        </button>
      </div>
      <div class="checkin-note-body">
        <div class="checkin-note-label">{{ t('notesWillBeWritten') }}</div>
        <textarea
          v-model="noteInput"
          class="checkin-note-textarea"
          :placeholder="t('checkinNotePlaceholder')"
          rows="3"
          @keydown.enter.ctrl="handleConfirm"
        />
        <div class="checkin-note-hint">{{ t('pressCtrlEnterToSave') }}</div>
      </div>
      <div class="checkin-note-actions">
        <SyButton class="checkin-note-btn plain" @click="handleCancel">{{ t('cancel') }}</SyButton>
        <SyButton class="checkin-note-btn confirm" @click="handleConfirm">{{ isEdit ? t('saveChanges') : t('saveAndCheckin') }}</SyButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '@/utils/i18n';
import { ref, watch } from 'vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import Icon from '@/components/Icon.vue';

interface Props {
  show: boolean;
  habitName: string;
  habitEmoji?: string;
  isEdit?: boolean;
  initialNote?: string;
}

const props = withDefaults(defineProps<Props>(), {
  habitEmoji: '',
  isEdit: false,
  initialNote: ''
});

const emit = defineEmits<{
  close: [];
  confirm: [note: string];
}>();

const noteInput = ref('');

watch(() => props.show, (newVal) => {
  if (newVal) {
    noteInput.value = props.initialNote || '';
  }
});

function handleCancel(): void {
  emit('close');
}

function handleConfirm(): void {
  emit('confirm', noteInput.value.trim());
}
</script>

<style scoped>
.checkin-note-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.checkin-note-dialog {
  width: min(480px, calc(100% - 24px));
  background: var(--b3-theme-background);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.checkin-note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
}

.checkin-note-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
  display: flex;
  align-items: center;
  gap: 6px;
}

.habit-emoji-display {
  font-size: 18px;
}

.checkin-note-body {
  padding: 14px;
}

.checkin-note-label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  margin-bottom: 8px;
}

.checkin-note-textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid var(--b3-border-color);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  border-radius: 6px;
  padding: 8px 10px;
  box-sizing: border-box;
  outline: none;
  resize: vertical;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
}

.checkin-note-textarea:focus {
  border-color: var(--b3-theme-primary);
}

.checkin-note-hint {
  font-size: 11px;
  color: var(--b3-theme-on-surface);
  opacity: 0.6;
  margin-top: 6px;
}

.checkin-note-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 14px;
}

.checkin-note-btn.plain {
  background: var(--b3-list-hover);
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
}

.checkin-note-btn.confirm {
  background: #f98f7a;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
}

.icon-button {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button .icon {
  width: 16px;
  height: 16px;
  color: var(--b3-theme-background);
  fill: var(--b3-theme-background);
}

.icon-button:hover {
  background-color: var(--b3-list-hover);
  border-radius: 4px;
}
</style>
