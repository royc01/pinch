<template>
  <Transition name="fade">
    <div
      v-show="show"
      class="modal-overlay"
      :style="overlayStyle"
      @click.self="handleClose"
    >
      <Transition name="pop">
        <div class="modal-content" @click.stop v-show="show">
      <div class="modal-header">
        <h3>{{ t('moodTracker.titlePrefix') }} - {{ selectedDate }}</h3>
        <button
          @click="handleClose"
          class="icon-button ariaLabel"
         
          :aria-label="t('common.close')"
        >
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>{{ t('moodTracker.selectMood') }}</label>
          <div class="emoji-selector">
            <div class="mood-emoji-grid">
              <span 
                v-for="emoji in moodEmojis" 
                :key="emoji.id"
                class="mood-emoji-option"
                @click="handleSelectMoodEmoji(emoji.emoji)"
                :class="{ selected: localMoodEntry.emoji === emoji.emoji }">
                <div v-html="getLargeMoodSvg(emoji.emoji)" class="mood-svg"></div>
              </span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>{{ t('moodTracker.recordsLabel') }}</label>
          <div class="daily-record-list">
            <div
              v-for="entry in sortedEntries"
              :key="entry.id"
              class="daily-record-item ariaLabel"
              :class="{ editing: editingEntryId === entry.id }"
              role="button"
              tabindex="0"
             
              :aria-label="`${t('moodTracker.editRecord')}: ${entry.text}`"
              @click="activateRecordEdit(entry)"
              @keydown.enter.prevent="activateRecordEdit(entry)"
              @keydown.space.prevent="activateRecordEdit(entry)"
            >
              <span class="daily-record-time">{{ formatRecordTime(entry.createdAt) }}</span>
              <textarea
                v-if="editingEntryId === entry.id"
                v-model="editingRecordText"
                class="daily-record-editor"
                rows="2"
                :data-record-editor-id="entry.id"
                @click.stop
                @keydown.stop
                @blur="commitActiveRecordEdit"
              ></textarea>
              <span v-else class="daily-record-text">{{ entry.text }}</span>
              <button
                type="button"
                class="daily-record-delete ariaLabel"
               
                :aria-label="`${t('common.delete')}: ${entry.text}`"
                @click.stop="handleDeleteRecord(entry.id)"
              >
                <Icon name="close" width="14" height="14" class="icon" />
              </button>
            </div>
            <div v-if="sortedEntries.length === 0" class="daily-record-empty">
              {{ t('moodTracker.noRecords') }}
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>{{ t('moodTracker.addRecord') }}</label>
          <SyTextarea
            v-model="localMoodEntry.note"
            :placeholder="t('moodTracker.notePlaceholder')"
            class="mood-input"
          />
        </div>
      </div>
      <div class="modal-footer">
        <SyButton
          @click="handleClearAll"
          class="danger-button"
          :disabled="!hasAnyContent"
        >
          {{ t('moodTracker.clearAll') }}
        </SyButton>
        <SyButton @click="handleSave" class="confirm-button">{{ t('common.save') }}</SyButton>
      </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyTextarea from '@/components/SiyuanTheme/SyTextarea.vue';
import { useI18n } from '@/composables/useI18n';

interface MoodEmoji {
  id: string;
  emoji: string;
  largeSvg: string;
  smallSvg: string;
}

interface MoodEntry {
  emoji: string;
  note: string;
  entries?: DailyRecordEntry[];
}

interface DailyRecordEntry {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  show: boolean;
  selectedDate: string;
  moodEntry: MoodEntry;
  moodEmojis: MoodEmoji[];
  overlayStyle?: Record<string, string>;
}

const props = defineProps<Props>();
const { t } = useI18n();

const emit = defineEmits<{
  close: [];
  save: [moodEntry: MoodEntry];
  'clear-all': [];
}>();

const cloneMoodEntry = (entry: MoodEntry): MoodEntry => ({
  ...entry,
  entries: entry.entries ? entry.entries.map(record => ({ ...record })) : undefined
});

const localMoodEntry = ref<MoodEntry>(cloneMoodEntry(props.moodEntry));
const editingEntryId = ref<string | null>(null);
const editingRecordText = ref('');
const sortedEntries = computed(() => {
  return [...(localMoodEntry.value.entries || [])].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.id.localeCompare(right.id);
  });
});
const hasAnyContent = computed(() =>
  Boolean(localMoodEntry.value.emoji || localMoodEntry.value.note.trim() || sortedEntries.value.length > 0)
);

const setDefaultEmoji = () => {
  if (props.show && !localMoodEntry.value.emoji) {
    localMoodEntry.value.emoji = '🤩';
  }
};

watch(() => props.moodEntry, (newMoodEntry) => {
  localMoodEntry.value = cloneMoodEntry(newMoodEntry);
  editingEntryId.value = null;
  editingRecordText.value = '';
  setDefaultEmoji();
}, { immediate: true, deep: true });

watch(() => props.show, () => {
  setDefaultEmoji();
}, { immediate: true });

const getLargeMoodSvg = (emoji: string) => {
  const mood = props.moodEmojis.find(m => m.emoji === emoji);
  return mood ? mood.largeSvg : '';
};

const formatRecordTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const handleSelectMoodEmoji = (emoji: string) => {
  localMoodEntry.value.emoji = emoji;
};

const commitActiveRecordEdit = (persist = true) => {
  const editingId = editingEntryId.value;
  if (!editingId) return;

  const nextText = editingRecordText.value.trim();
  const currentEntry = localMoodEntry.value.entries?.find(entry => entry.id === editingId);
  const hasChanged = !!currentEntry && currentEntry.text !== nextText;

  if (hasChanged) {
    localMoodEntry.value = {
      ...localMoodEntry.value,
      entries: (localMoodEntry.value.entries || []).map(entry =>
        entry.id === editingId
          ? { ...entry, text: nextText, updatedAt: new Date().toISOString() }
          : entry
      )
    };
    if (persist) {
      emit('save', { ...localMoodEntry.value, note: '' });
    }
  }

  editingEntryId.value = null;
  editingRecordText.value = '';
};

const activateRecordEdit = async (entry: DailyRecordEntry) => {
  if (editingEntryId.value === entry.id) return;
  commitActiveRecordEdit();
  editingEntryId.value = entry.id;
  editingRecordText.value = entry.text;
  await nextTick();
  const editor = document.querySelector(`[data-record-editor-id="${entry.id}"]`) as HTMLTextAreaElement | null;
  if (editor) {
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }
};

const handleDeleteRecord = (entryId: string) => {
  const wasEditingDeletedEntry = editingEntryId.value === entryId;
  localMoodEntry.value = {
    ...localMoodEntry.value,
    entries: (localMoodEntry.value.entries || []).filter(entry => entry.id !== entryId)
  };
  if (wasEditingDeletedEntry) {
    editingEntryId.value = null;
    editingRecordText.value = '';
  }
  emit('save', { ...localMoodEntry.value, note: '' });
};

const handleSave = () => {
  commitActiveRecordEdit(false);
  emit('save', { ...localMoodEntry.value });
  emit('close');
};

const handleClearAll = () => {
  if (!confirm(t('moodTracker.confirmClearAll'))) {
    return;
  }
  localMoodEntry.value = {
    emoji: '',
    note: '',
    entries: undefined
  };
  editingEntryId.value = null;
  editingRecordText.value = '';
  emit('clear-all');
};

const handleClose = () => {
  commitActiveRecordEdit();
  emit('close');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  left: var(--modal-overlay-left, 0px);
  top: var(--modal-overlay-top, 0px);
  width: var(--modal-overlay-width, 100vw);
  height: var(--modal-overlay-height, 100dvh);
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  z-index: 8;
}

.modal-content {
  background: var(--b3-theme-background);
  border-radius: 16px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
  overflow-y: auto;
  width: min(560px, 100%);
  min-width: 0;
  max-height: calc(100% - 40px);
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: calc(16px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 80;
  }

  .modal-content {
    max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.24s ease, transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}

.pop-enter-to,
.pop-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--b3-theme-on-background);
}

.icon-button {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button .icon {
  width: 16px;
  height: 16px;
  color: var(--b3-theme-on-background);
  fill: var(--b3-theme-on-background);
}

.icon-button:hover {
  background-color: var(--b3-list-hover);
  border-radius: 4px;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: var(--b3-theme-on-background);
}

.emoji-selector {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.mood-emoji-grid {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(4px, 1vw, 4px);
}

.mood-emoji-option {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  min-width: 0;
  aspect-ratio: 1;
  padding: clamp(4px, 1vw, 4px);
  border-radius: 8px;
  transition: all 0.2s;
}

.mood-emoji-option:hover {
  background-color: var(--b3-list-hover);
}



.mood-emoji-option.selected .mood-svg {
  opacity: 1;
}

.mood-emoji-option:not(.selected) .mood-svg {
  opacity: 0.3;
}

.mood-svg {
  width: 100%;
  height: 100%;
  max-width: 40px;
  max-height: 40px;
  transition: opacity 0.2s;
}

.mood-svg :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.mood-input {
  min-height: 80px;
  resize: vertical;
}

.daily-record-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--b3-border-color);
  background: var(--b3-theme-surface);
}

.daily-record-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  background: var(--b3-theme-background);
  cursor: pointer;
  font-size: 13px;
  line-height: 1.4;
  transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.daily-record-item:hover,
.daily-record-item:focus-visible {
  border-color: var(--b3-theme-primary-lighter);
  background: var(--b3-list-hover);
}

.daily-record-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--b3-theme-primary-lightest, var(--b3-list-hover));
}

.daily-record-item.editing {
  border-color: var(--b3-theme-primary);
  background: var(--b3-theme-primary-lightest, var(--b3-list-hover));
  cursor: text;
}

.daily-record-time {
  flex-shrink: 0;
  color: var(--b3-theme-on-surface);
  font-variant-numeric: tabular-nums;
}

.daily-record-text {
  flex: 1;
  min-width: 0;
  color: var(--b3-theme-on-background);
  word-break: break-word;
}

.daily-record-editor {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--b3-theme-on-background);
  font: inherit;
  line-height: 1.4;
  resize: vertical;
  outline: none;
}

.daily-record-delete {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.daily-record-delete .icon {
  width: 14px;
  height: 14px;
  color: currentColor;
  fill: currentColor;
}

.daily-record-delete:hover,
.daily-record-delete:focus-visible {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.12);
  outline: none;
}

.daily-record-empty {
  color: var(--b3-theme-on-surface);
  font-size: 13px;
  opacity: 0.7;
}

.modal-footer {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.confirm-button {
  background-color: #f98f7a;
  color: var(--b3-theme-background);
  font-weight: bold;
  border: none;
  border-radius: 24px;
  padding: 6px 12px;
}

.confirm-button:hover {
  background-color: #e55a47;
}

.confirm-button:active {
  background-color: #dc4a33;
}

.danger-button {
  background-color: #e74c3c;
  color: var(--b3-theme-background);
  font-weight: bold;
  border: none;
  border-radius: 24px;
  padding: 6px 12px;
}

.danger-button:hover {
  background-color: #c0392b;
}
</style>
