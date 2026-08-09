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
              <button
                type="button"
                class="mood-emoji-option no-mood-option"
                :class="{ selected: !localMoodEntry.emoji }"
                @click="handleSelectMoodEmoji('')"
              >
                <span aria-hidden="true">-</span>
              </button>
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
        <div class="lifelog-timeline-list">
          <div v-if="lifelogTimelineItems.length === 0" class="lifelog-timeline-empty">
            {{ t('moodTracker.noRecords') }}
          </div>
          <div
            v-for="item in lifelogTimelineItems"
            :key="item.id"
            class="lifelog-timeline-item"
            :class="`is-${item.type}`"
          >
            <div class="lifelog-timeline-line">
              <span class="lifelog-timeline-dot">
                <span v-if="item.moodSvg" class="lifelog-timeline-dot-emoji" v-html="item.moodSvg"></span>
                <span v-else-if="item.emoji" class="lifelog-timeline-dot-emoji">{{ item.emoji }}</span>
                <Icon v-else :name="item.icon" width="12" height="12" />
              </span>
            </div>
            <div class="lifelog-timeline-content">
              <div class="lifelog-timeline-time">{{ item.timeLabel }}</div>
              <div class="lifelog-timeline-card">
                <div class="lifelog-timeline-card-header">
                  <span class="lifelog-timeline-card-title">{{ item.title }}</span>
                  <button
                    v-if="item.type === 'manual-note'"
                    type="button"
                    class="lifelog-timeline-delete ariaLabel"
                    :aria-label="t('common.delete')"
                    @click="deleteManualRecord(item.sourceId || item.id)"
                  >
                    <Icon name="trash" width="11" height="11" />
                  </button>
                </div>
                <div v-if="item.meta" class="lifelog-timeline-meta">{{ item.meta }}</div>
                <div v-if="item.note" class="lifelog-timeline-note">{{ item.note }}</div>
                <template v-if="editingAnnotationId === item.id">
                  <textarea
                    v-model="editingAnnotationText"
                    class="lifelog-timeline-note-input"
                    rows="3"
                    autofocus
                    @keydown.ctrl.enter.prevent="saveAnnotation(item)"
                    @keydown.meta.enter.prevent="saveAnnotation(item)"
                    @keydown.esc.prevent="cancelAnnotation"
                    @blur="saveAnnotation(item)"
                  ></textarea>
                </template>
                <button
                  v-else-if="item.annotation"
                  type="button"
                  class="lifelog-timeline-annotation is-editable"
                  :aria-label="item.annotation"
                  @click="startAnnotation(item)"
                >{{ item.annotation }}</button>
                <button
                  v-else-if="item.annotationEditable"
                  type="button"
                  class="lifelog-timeline-annotation-add ariaLabel"
                  :aria-label="t('lifelogTimeline.addAnnotationLabel')"
                  :title="t('lifelogTimeline.addAnnotationLabel')"
                  @click="startAnnotation(item)"
                >
                  <Icon name="add" width="13" height="13" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="lifelog-timeline-editor">
          <textarea
            v-model="noteDraft"
            class="lifelog-timeline-editor-input"
            rows="3"
            :placeholder="t('monthView.lifelogManualPlaceholder')"
            @keydown.ctrl.enter.prevent="saveNote"
            @keydown.meta.enter.prevent="saveNote"
          ></textarea>
          <button
            type="button"
            class="lifelog-timeline-submit ariaLabel"
            :aria-label="t('common.save')"
            :disabled="!noteDraft.trim()"
            @click="saveNote"
          >
            <Icon name="up" width="20" height="20" />
          </button>
        </div>
      </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import { useI18n } from '@/composables/useI18n';
import type { LifelogTimelinePanelItem } from '@/components/LifelogTimelinePanel.vue';
import { getFocusTimerData, TaskRepository, type Habit, type Task } from '@/api';
import {
  focusRecordsToLifelogEvents,
  habitsToLifelogEvents,
  tasksToCompletedLifelogEvents
} from '@/utils/lifelogEvents';
import { useCheckinNotes } from '@/composables/useCheckinNotes';
import { getCheckinNoteEventKey } from '@/utils/checkinNoteEvents';

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
  habits: Habit[];
  overlayStyle?: Record<string, string>;
}

const props = defineProps<Props>();
const { t } = useI18n();
const {
  ensureDatesLoaded: ensureCheckinNoteDatesLoaded,
  hydrateTimelineTarget: hydrateCheckinNoteTimelineTarget,
  updateNote: updateCheckinNote
} = useCheckinNotes();

const emit = defineEmits<{
  close: [];
  save: [moodEntry: MoodEntry];
}>();

const cloneMoodEntry = (entry: MoodEntry): MoodEntry => ({
  ...entry,
  entries: entry.entries ? entry.entries.map(record => ({ ...record })) : undefined
});

const localMoodEntry = ref<MoodEntry>(cloneMoodEntry(props.moodEntry));
const noteDraft = ref('');
const editingAnnotationId = ref<string | null>(null);
const editingAnnotationText = ref('');
const lifelogTasks = ref<Task[]>([]);
const focusRecords = ref<Awaited<ReturnType<typeof getFocusTimerData>>['sessionRecords']>([]);
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
const lifelogTimelineItems = computed<LifelogTimelinePanelItem[]>(() => {
  const moodEntryItems = sortedEntries.value.map(entry => ({
    id: entry.id,
    sourceId: entry.id,
    type: 'manual-note' as const,
    timeLabel: formatRecordTime(entry.createdAt),
    sortMinutes: timeToSortMinutes(entry.createdAt, 21 * 60),
    title: t('monthView.lifelogManualNote'),
    meta: '',
    note: entry.text,
    icon: 'descriptionBubble'
  }));
  const focusItems = focusRecordsToLifelogEvents(focusRecords.value, t('focusTimer.title'))
    .filter(event => event.date === props.selectedDate)
    .map(event => hydrateCheckinNoteTimelineTarget({
      id: `focus-${event.id}`, sourceId: event.id, type: event.type, timeLabel: `${event.startTime} - ${event.endTime}`,
      sortMinutes: timeToSortMinutes(event.startTime, 8 * 60), title: event.title, meta: t('focusTimer.title'), note: event.note || '', icon: 'timer'
    }, event.date, getCheckinNoteEventKey(event)));
  const habitItems = habitsToLifelogEvents(props.habits)
    .filter(event => event.date === props.selectedDate)
    .map(event => {
      const checkinCount = event.checkinIndex || event.completedCount;
      const progress = event.targetCount > 1 ? `${checkinCount}/${event.targetCount}` : (event.completed ? '1/1' : '0/1');
      const sortMinutes = timeToSortMinutes(String(event.checkinTimestamp || event.metadata?.timestamp || ''), 7 * 60);
      return hydrateCheckinNoteTimelineTarget({
      id: `habit-${event.id}`, sourceId: event.id, type: event.type,
      timeLabel: formatSortMinutes(sortMinutes),
      sortMinutes,
      title: event.title,
      meta: `${t('habitTracker.checkedIn')} · ${progress}${t('habitTracker.timesSuffix')}`,
      note: event.note || '',
      icon: 'squareCheck'
    }, event.date, getCheckinNoteEventKey(event));
    });
  const taskItems = tasksToCompletedLifelogEvents(lifelogTasks.value)
    .filter(event => event.date === props.selectedDate)
    .map(event => hydrateCheckinNoteTimelineTarget({
      id: `task-${event.id}`, sourceId: event.taskId, type: event.type,
      timeLabel: formatRecordTime(event.completedAt), sortMinutes: timeToSortMinutes(event.completedAt, 20 * 60),
      title: event.title, meta: t('taskManager.statusCompleted'), note: event.note || '', icon: 'taskCheckboxChecked'
    }, event.date, getCheckinNoteEventKey(event)));
  return [...focusItems, ...habitItems, ...taskItems, ...moodEntryItems]
    .sort((left, right) => left.sortMinutes - right.sortMinutes);
});
watch(() => props.moodEntry, (newMoodEntry) => {
  localMoodEntry.value = cloneMoodEntry(newMoodEntry);
  noteDraft.value = '';
}, { immediate: true, deep: true });

watch(() => props.selectedDate, (date) => {
  if (date) {
    void ensureCheckinNoteDatesLoaded([date]);
  }
}, { immediate: true });

watch(() => props.show, async (show) => {
  if (!show) return;
  const [focusData, tasks] = await Promise.all([
    getFocusTimerData(),
    TaskRepository.getAllTasks(false, { includeArchived: true }, { useLiveDom: false, detailLevel: 'full', materializeRepeats: true })
  ]);
  focusRecords.value = focusData.sessionRecords;
  lifelogTasks.value = tasks;
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

const timeToSortMinutes = (value: string, fallbackMinutes: number): number => {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return Number(match[1]) * 60 + Number(match[2]);
  }
  const timestamp = Number(value);
  const date = Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? fallbackMinutes : date.getHours() * 60 + date.getMinutes();
};

const formatSortMinutes = (minutes: number): string => {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
};

const handleSelectMoodEmoji = (emoji: string) => {
  localMoodEntry.value.emoji = emoji;
  emit('save', { ...localMoodEntry.value, note: '' });
};

const saveNote = () => {
  const text = noteDraft.value.trim();
  if (!text) return;

  const now = new Date().toISOString();
  localMoodEntry.value = {
    ...localMoodEntry.value,
    entries: [
      ...(localMoodEntry.value.entries || []),
      {
        id: `mood-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        createdAt: now,
        updatedAt: now
      }
    ]
  };
  noteDraft.value = '';
  emit('save', { ...localMoodEntry.value, note: '' });
};

const deleteManualRecord = (recordId: string) => {
  localMoodEntry.value = {
    ...localMoodEntry.value,
    entries: (localMoodEntry.value.entries || []).filter(entry => entry.id !== recordId)
  };
  emit('save', { ...localMoodEntry.value, note: '' });
};

const startAnnotation = (item: LifelogTimelinePanelItem) => {
  if (!item.annotationEditable) {
    return;
  }
  editingAnnotationId.value = item.id;
  editingAnnotationText.value = item.annotation || '';
};

const cancelAnnotation = () => {
  editingAnnotationId.value = null;
  editingAnnotationText.value = '';
};

const saveAnnotation = async (item: LifelogTimelinePanelItem) => {
  if (editingAnnotationId.value !== item.id) {
    return;
  }
  if (!item.annotationKey) {
    cancelAnnotation();
    return;
  }
  const text = editingAnnotationText.value.trim();
  if (text === (item.annotation || '')) {
    cancelAnnotation();
    return;
  }
  try {
    await updateCheckinNote(item.annotationDate || props.selectedDate, item.annotationKey, text);
  } catch (error) {
    console.error('[MoodTrackerModal] Failed to update check-in note', error);
  } finally {
    cancelAnnotation();
  }
};

const handleClose = () => {
  cancelAnnotation();
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
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 128px 0 0;
  box-sizing: border-box;
  z-index: 8;
  pointer-events: none;
}

.modal-content {
  background: var(--b3-theme-background);
  border-radius: 16px;
  box-shadow: var(--pinch-menu-shadow);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  width: 100%;
  height: 100%;
  min-width: 0;
  max-height: none;
  box-sizing: border-box;
  pointer-events: auto;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 122px 0 0;
    z-index: 80;
  }

  .modal-content {
    width: 100%;
    height: 100%;
    margin-top: 0;
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
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 10px;
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
  grid-template-columns: repeat(6, minmax(0, 1fr));
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

.no-mood-option {
  border: 1px dashed var(--b3-border-color);
  color: var(--b3-theme-on-surface);
  font-size: 22px;
  background: transparent;
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

.lifelog-timeline-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px 14px;
}

.lifelog-timeline-empty {
  padding: 20px;
  border-radius: 8px;
  color: var(--b3-theme-on-surface);
  background: var(--b3-theme-surface);
  text-align: center;
}

.lifelog-timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 8px;
}

.lifelog-timeline-item + .lifelog-timeline-item {
  margin-top: 10px;
}

.lifelog-timeline-line {
  position: relative;
}

.lifelog-timeline-line::before {
  position: absolute;
  top: 36px;
  bottom: 0;
  left: 14px;
  width: 1px;
  content: '';
  background: repeating-linear-gradient(to bottom, var(--b3-border-color) 0 4px, transparent 4px 8px);
}

.lifelog-timeline-dot {
  position: absolute;
  top: 4px;
  left: 0;
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px dashed var(--pinch-color2);
  border-radius: 50%;
  color: var(--b3-theme-on-background);
  background: var(--pinch-background2);
}

.lifelog-timeline-item.is-habit-checkin .lifelog-timeline-dot {
  border-color: var(--pinch-color5);
  background: var(--pinch-background5);
}

.lifelog-timeline-item.is-task-completed .lifelog-timeline-dot {
  border-color: var(--pinch-color7);
  background: var(--pinch-background7);
}

.lifelog-timeline-item.is-manual-note .lifelog-timeline-dot {
  border-color: var(--pinch-color8);
  background: var(--pinch-background8);
}

.lifelog-timeline-dot-emoji,
.lifelog-timeline-dot-emoji :deep(svg) {
  width: 16px;
  height: 16px;
}

.lifelog-timeline-content {
  min-width: 0;
}

.lifelog-timeline-time {
  margin: 10px;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  white-space: nowrap;
}

.lifelog-timeline-card {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  box-shadow: var(--pinch-shadow);
  color: var(--b3-theme-on-background);
  background: var(--b3-theme-background);
}

.lifelog-timeline-card-header {
  display: flex;
  gap: 6px;
  min-width: 0;
}

.lifelog-timeline-card-title {
  overflow: hidden;
  flex: 1;
  min-width: 0;
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lifelog-timeline-delete {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 5px;
  color: var(--b3-theme-on-surface);
  background: transparent;
  cursor: pointer;
  opacity: 0.74;
}

.lifelog-timeline-delete:hover {
  color: var(--b3-theme-error);
  background: var(--b3-list-hover);
  opacity: 1;
}

.lifelog-timeline-meta,
.lifelog-timeline-note,
.lifelog-timeline-annotation {
  margin-top: 3px;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
  line-height: 1.4;
}

.lifelog-timeline-annotation.is-editable {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  color: var(--b3-theme-on-background);
  background: transparent;
  font: inherit;
  text-align: left;
  word-break: break-word;
  cursor: text;
}

.lifelog-timeline-annotation.is-editable:hover {
  color: var(--b3-theme-primary);
}

.lifelog-timeline-annotation-add {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  color: var(--b3-theme-on-surface);
  background: transparent;
  cursor: pointer;
}

.lifelog-timeline-annotation-add:hover {
  color: var(--b3-theme-primary);
  background: var(--b3-list-hover);
}

.lifelog-timeline-note-input {
  display: block;
  width: 100%;
  margin-top: 4px;
  box-sizing: border-box;
  border: 1px solid var(--b3-theme-primary-lightest, var(--b3-border-color));
  border-radius: 4px;
  color: var(--b3-theme-on-background);
  background: var(--b3-theme-background);
  font: inherit;
  font-size: 11px;
  line-height: 1.4;
  resize: vertical;
}

.lifelog-timeline-meta {
  opacity: 0.8;
}

.lifelog-timeline-editor {
  position: relative;
  flex: 0 0 auto;
  margin: 10px 0 66px 0;
  padding: 10px 36px 10px 10px;
  border-radius: 16px;
  box-shadow: var(--pinch-shadow);
}

.lifelog-timeline-editor-input {
  width: 100%;
  min-height: 112px;
  padding: 0;
  box-sizing: border-box;
  border: none;
  color: var(--b3-theme-on-background);
  background: transparent;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
}

.lifelog-timeline-editor-input:focus {
  outline: none;
}

.lifelog-timeline-submit {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--b3-theme-background);
  background: var(--b3-theme-on-background);
  cursor: pointer;
}

.lifelog-timeline-submit:disabled {
  cursor: default;
  opacity: 0.45;
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
