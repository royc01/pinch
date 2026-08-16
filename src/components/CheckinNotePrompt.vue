<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="promptRef"
      class="checkin-note-prompt"
      role="dialog"
      :aria-label="t('checkinNotes.addRecord')"
      :style="promptStyle"
    >
    <div class="checkin-note-prompt-header">
      <div class="checkin-note-prompt-title">{{ t('checkinNotes.addRecord') }}</div>
      <span v-if="queue.length" class="checkin-note-prompt-queue">
        {{ formatTemplate('checkinNotes.pendingCount', { count: queue.length }) }}
      </span>
    </div>
    <textarea
      ref="inputRef"
      v-model="content"
      class="checkin-note-prompt-input"
      rows="2"
      :placeholder="t('checkinNotes.promptPlaceholder')"
      :disabled="saving"
      @input="handleInput"
      @keydown.esc.prevent="skip"
      @keydown.ctrl.enter.prevent="save"
    />
    <div v-if="errorMessage" class="checkin-note-prompt-error" role="alert">
      {{ errorMessage }}
    </div>
    <div class="checkin-note-prompt-actions">
      <button type="button" class="checkin-note-prompt-skip" :disabled="saving" @click="skip">
        {{ t('checkinNotes.skip') }}
      </button>
      <button
        type="button"
        class="checkin-note-prompt-save"
        :disabled="!content.trim() || saving"
        @click="save"
      >
        {{ saving ? t('checkinNotes.saving') : t('common.save') }}
      </button>
    </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useCheckinNotes } from '@/composables/useCheckinNotes';
import { formatTemplate, useI18n } from '@/composables/useI18n';
import { useUserSettings } from '@/composables/useUserSettings';
import { CHECKIN_NOTE_PROMPT_EVENT, type CheckinNotePromptDetail } from '@/utils/checkinNotePrompt';

const AUTO_CLOSE_MS = 10_000;
const { updateNote } = useCheckinNotes();
const { t } = useI18n();
const { data: userSettings } = useUserSettings();
const visible = ref(false);
const content = ref('');
const saving = ref(false);
const errorMessage = ref('');
const inputRef = ref<HTMLTextAreaElement | null>(null);
const promptRef = ref<HTMLElement | null>(null);
const promptStyle = ref<Record<string, string>>({});
const queue = ref<CheckinNotePromptDetail[]>([]);
let target: CheckinNotePromptDetail | null = null;
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

function clearAutoCloseTimer(): void {
  if (autoCloseTimer !== null) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
}

function scheduleAutoClose(): void {
  clearAutoCloseTimer();
  autoCloseTimer = setTimeout(() => {
    if (!content.value.trim() && !saving.value) skip();
  }, AUTO_CLOSE_MS);
}

function showTarget(detail: CheckinNotePromptDetail): void {
  target = detail;
  content.value = '';
  errorMessage.value = '';
  visible.value = true;
  scheduleAutoClose();
  void nextTick(() => {
    positionPrompt(detail);
    inputRef.value?.focus();
  });
}

function positionPrompt(detail: CheckinNotePromptDetail): void {
  const anchor = detail.anchor;
  if (!anchor) {
    promptStyle.value = {};
    return;
  }

  const margin = 16;
  const offset = 8;
  const bounds = anchor.bounds ?? {
    left: 0,
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight
  };
  const width = Math.min(340, Math.max(0, bounds.right - bounds.left - margin * 2));
  const height = promptRef.value?.getBoundingClientRect().height || 180;
  const minLeft = bounds.left + margin;
  const maxLeft = Math.max(minLeft, bounds.right - width - margin);
  const left = Math.max(minLeft, Math.min(anchor.left, maxLeft));
  const minTop = bounds.top + margin;
  const maxTop = Math.max(minTop, bounds.bottom - height - margin);
  const top = anchor.bottom + offset + height <= bounds.bottom - margin
    ? anchor.bottom + offset
    : Math.max(minTop, Math.min(anchor.top - height - offset, maxTop));

  promptStyle.value = {
    right: 'auto',
    bottom: 'auto',
    width: `${width}px`,
    left: `${left}px`,
    top: `${top}px`
  };
}

function showNextOrClose(): void {
  clearAutoCloseTimer();
  const next = queue.value.shift();
  if (next) {
    showTarget(next);
    return;
  }
  visible.value = false;
  content.value = '';
  errorMessage.value = '';
  target = null;
}

function open(event: Event): void {
  const detail = (event as CustomEvent<CheckinNotePromptDetail>).detail;
  if (userSettings.focus.checkinNotePrompt !== true || !detail?.date || !detail.eventKey) return;
  if (target?.eventKey === detail.eventKey || queue.value.some(item => item.eventKey === detail.eventKey)) return;
  if (visible.value) {
    queue.value.push(detail);
  } else {
    showTarget(detail);
  }
}

function skip(): void {
  if (saving.value) return;
  showNextOrClose();
}

function handleInput(): void {
  errorMessage.value = '';
  clearAutoCloseTimer();
}

async function save(): Promise<void> {
  if (!target || !content.value.trim() || saving.value) return;
  clearAutoCloseTimer();
  saving.value = true;
  errorMessage.value = '';
  try {
    if (target.context) {
      await updateNote(target.date, target.eventKey, content.value, target.context);
    } else {
      await updateNote(target.date, target.eventKey, content.value);
    }
    saving.value = false;
    showNextOrClose();
  } catch (error) {
    console.error('[CheckinNotes] prompt save failed:', error);
    errorMessage.value = t('checkinNotes.saveFailed');
    void nextTick(() => inputRef.value?.focus());
  } finally {
    saving.value = false;
  }
}

function handleDocumentPointerDown(event: PointerEvent): void {
  if (!visible.value || saving.value) return;
  const node = event.target;
  if (node instanceof Node && !promptRef.value?.contains(node)) skip();
}

onMounted(() => {
  window.addEventListener(CHECKIN_NOTE_PROMPT_EVENT, open);
  document.addEventListener('pointerdown', handleDocumentPointerDown);
});
onBeforeUnmount(() => {
  clearAutoCloseTimer();
  window.removeEventListener(CHECKIN_NOTE_PROMPT_EVENT, open);
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
});
</script>

<style scoped>
.checkin-note-prompt { position: fixed; z-index: 10001; right: 20px; bottom: 20px; width: min(340px, calc(100vw - 32px)); padding: 14px; border: 1px solid var(--b3-border-color); border-radius: 12px; background: var(--b3-theme-background); box-shadow: 0 10px 30px rgba(0, 0, 0, .22); }
.checkin-note-prompt-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.checkin-note-prompt-title { font-size: 14px; font-weight: 600; }
.checkin-note-prompt-queue { color: var(--b3-theme-on-surface-light); font-size: 12px; }
.checkin-note-prompt-input { box-sizing: border-box; width: 100%; resize: vertical; padding: 8px; border: 1px solid var(--b3-border-color); border-radius: 7px; color: inherit; background: var(--b3-theme-surface); font: inherit; }
.checkin-note-prompt-input:focus { border-color: var(--b3-theme-primary); outline: none; }
.checkin-note-prompt-error { margin-top: 7px; color: var(--b3-card-error-color, #d23f31); font-size: 12px; }
.checkin-note-prompt-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.checkin-note-prompt-actions button { border: 0; border-radius: 6px; padding: 6px 11px; cursor: pointer; font: inherit; }
.checkin-note-prompt-skip { color: var(--b3-theme-on-surface); background: transparent; }
.checkin-note-prompt-save { color: var(--b3-theme-on-primary); background: var(--b3-theme-primary); }
.checkin-note-prompt-actions button:disabled { opacity: .5; cursor: default; }
</style>
