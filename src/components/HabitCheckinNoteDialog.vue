<template>
  <div v-if="show" class="checkin-note-overlay" @click.self="handleCancel">
    <div class="checkin-note-dialog" @click.stop>
      <div class="checkin-note-header">
        <div class="checkin-note-title">
          <EmojiIcon v-if="habitEmoji" class="habit-emoji-display" :value="habitEmoji" />
          <span>{{ habitName }} - {{ isEdit ? t('habitCheckinNote.editTitleSuffix') : t('habitCheckinNote.createTitleSuffix') }}</span>
        </div>
        <button
          type="button"
          class="icon-button ariaLabel"
         
          :aria-label="t('common.close')"
          @click="handleCancel"
        >
          <Icon name="close" width="14" height="14" class="icon" />
        </button>
      </div>
      <div v-if="hasNoteDoc" class="checkin-note-body">
        <div class="checkin-note-label">{{ t('habitCheckinNote.writeToDoc') }}</div>
        <div v-if="focusNoteInputs.length > 0" class="checkin-focus-note-list">
          <label
            v-for="item in focusNoteInputs"
            :key="item.sessionId"
            class="checkin-focus-note-item"
          >
            <span class="checkin-focus-note-label">{{ item.label }}</span>
            <textarea
              v-model="item.note"
              class="checkin-note-textarea"
              :placeholder="t('habitCheckinNote.placeholder')"
              rows="2"
              @keydown.enter.ctrl="handleConfirm"
            />
          </label>
        </div>
        <textarea
          v-else
          v-model="noteInput"
          class="checkin-note-textarea"
          :placeholder="t('habitCheckinNote.placeholder')"
          rows="3"
          @keydown.enter.ctrl="handleConfirm"
        />
        <div class="checkin-note-hint">{{ t('habitCheckinNote.ctrlEnterHint') }}</div>
      </div>
      <div class="checkin-note-actions">
        <SyButton
          v-if="canUndoOnce"
          class="checkin-note-btn danger"
          @click="handleUndoOnce"
        >
          {{ t('habitCheckinNote.undoOnce') }}
        </SyButton>
        <SyButton
          v-if="canClearToday"
          class="checkin-note-btn danger"
          @click="handleClearToday"
        >
          {{ t('habitCheckinNote.clearToday') }}
        </SyButton>
        <SyButton
          v-if="!hasNoteDoc"
          class="checkin-note-btn plain"
          @click="handleBindDoc"
        >
          {{ t('habitTracker.bindNoteDoc') }}
        </SyButton>
        <span class="checkin-note-actions-spacer"></span>
        <SyButton class="checkin-note-btn plain" @click="handleCancel">{{ t('common.cancel') }}</SyButton>
        <SyButton v-if="hasNoteDoc" class="checkin-note-btn confirm" @click="handleConfirm">
          {{ isEdit ? t('habitCheckinNote.saveEdit') : t('habitCheckinNote.saveAndCheckin') }}
        </SyButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import EmojiIcon from '@/components/EmojiIcon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import Icon from '@/components/Icon.vue';
import { useI18n } from '@/composables/useI18n';

interface FocusNoteInput {
  sessionId: string;
  label: string;
  minutes: number;
  note: string;
}

interface Props {
  show: boolean;
  habitName: string;
  habitEmoji?: string;
  isEdit?: boolean;
  initialNote?: string;
  focusNotes?: FocusNoteInput[];
  hasNoteDoc?: boolean;
  canUndoOnce?: boolean;
  canClearToday?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  habitEmoji: '',
  isEdit: false,
  initialNote: '',
  focusNotes: () => [],
  hasNoteDoc: false,
  canUndoOnce: false,
  canClearToday: false
});

const { t } = useI18n();

const emit = defineEmits<{
  close: [];
  confirm: [note: string, focusNotes: FocusNoteInput[]];
  undoOnce: [];
  clearToday: [];
  bindDoc: [];
}>();

const noteInput = ref('');
const focusNoteInputs = ref<FocusNoteInput[]>([]);

watch(
  () => [props.show, props.hasNoteDoc, props.initialNote, props.habitName, props.focusNotes] as const,
  ([show, hasNoteDoc, initialNote, habitName, focusNotes]) => {
    if (!show || !hasNoteDoc) {
      noteInput.value = '';
      focusNoteInputs.value = [];
      return;
    }
    noteInput.value = initialNote || '';
    focusNoteInputs.value = focusNotes.map(item => ({ ...item }));
  },
  { immediate: true }
);

function handleCancel(): void {
  emit('close');
}

function handleConfirm(): void {
  const focusNotes = focusNoteInputs.value.map(item => ({
    ...item,
    note: item.note.trim()
  }));
  emit('confirm', noteInput.value.trim(), focusNotes);
}

function handleUndoOnce(): void {
  emit('undoOnce');
}

function handleClearToday(): void {
  emit('clearToday');
}

function handleBindDoc(): void {
  emit('bindDoc');
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

.checkin-focus-note-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkin-focus-note-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkin-focus-note-label {
  font-size: 12px;
  color: var(--b3-theme-on-background);
  font-weight: 600;
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
  align-items: center;
  padding: 12px 14px;
}

.checkin-note-actions-spacer {
  flex: 1;
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

.checkin-note-btn.danger {
  background: var(--b3-list-hover);
  color: var(--b3-theme-error);
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
