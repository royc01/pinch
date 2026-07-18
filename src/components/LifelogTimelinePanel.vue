<template>
  <div
    v-if="show"
    class="lifelog-timeline-backdrop"
    :class="[`is-${variant}`, { 'is-fill-height': fillHeight }]"
    @mousedown.self="handleBackdropMouseDown"
    @wheel.stop
  >
    <aside class="lifelog-timeline-panel" @mousedown.stop @click.stop>
      <div class="lifelog-timeline-header">
        <div class="lifelog-timeline-title-wrap">
          <div v-if="dateStripDays.length > 0" class="lifelog-timeline-calendar-header">
            <div class="lifelog-timeline-calendar-controls">
              <button
                type="button"
                class="lifelog-timeline-calendar-nav ariaLabel"
                :aria-label="previousPeriodLabel"
                @mousedown.stop
                @click.stop="changePeriod(-1)"
              >
                <Icon name="left" width="16" height="16" />
              </button>
              <span class="lifelog-timeline-calendar-period">{{ currentPeriod }}</span>
              <button
                type="button"
                class="lifelog-timeline-calendar-nav ariaLabel"
                :aria-label="nextPeriodLabel"
                @mousedown.stop
                @click.stop="changePeriod(1)"
              >
                <Icon name="right" width="16" height="16" />
              </button>
              <button
                v-if="variant === 'drawer'"
                type="button"
                class="lifelog-timeline-close ariaLabel"
                :aria-label="closeLabel"
                @mousedown.stop
                @click.stop="emit('close')"
              >
                <Icon name="close" width="12" height="12" />
              </button>
            </div>
            <div class="lifelog-timeline-date-strip" ref="dateStripRef">
              <button
                v-for="day in dateStripDays"
                :key="day.date"
                type="button"
                :class="['lifelog-timeline-date-strip-day', {
                  'has-record': day.hasRecord,
                  'today': day.today,
                  'selected': day.selected
                }]"
                :aria-label="day.ariaLabel"
                @click.stop="emit('select-date', day.date)"
              >
                <span class="lifelog-timeline-date-weekday">{{ day.weekdayLabel }}</span>
                <span class="lifelog-timeline-date-number">{{ day.dayNumber }}</span>
                <span
                  v-if="day.moodSvg"
                  class="lifelog-timeline-date-mood"
                  v-html="day.moodSvg"
                ></span>
                <span v-else class="lifelog-timeline-date-mood empty"></span>
              </button>
            </div>
          </div>
          <slot v-else name="header" :title="title" :subtitle="subtitle">
            <div class="lifelog-timeline-title">{{ title }}</div>
            <div class="lifelog-timeline-subtitle">{{ subtitle }}</div>
          </slot>
        </div>
        <button
          v-if="variant === 'drawer' && dateStripDays.length === 0"
          type="button"
          class="lifelog-timeline-close ariaLabel"
          :aria-label="closeLabel"
          @mousedown.stop
          @click.stop="emit('close')"
        >
          <Icon name="close" width="12" height="12" />
        </button>
      </div>
      <div class="lifelog-timeline-list">
        <div v-if="items.length === 0" class="lifelog-timeline-empty">
          {{ emptyText }}
        </div>
        <div
          v-for="item in items"
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
                  v-if="item.deletable"
                  type="button"
                  class="lifelog-timeline-delete ariaLabel"
                 
                  :aria-label="deleteLabel"
                  @click.stop="requestDeleteItem(item)"
                >
                  <Icon name="trash" width="11" height="11" />
                </button>
              </div>
              <div
                v-if="item.type !== 'manual-note'"
                class="lifelog-timeline-meta"
              >
                <span v-if="item.meta" class="lifelog-timeline-meta-text">{{ item.meta }}</span>
                <span
                  v-for="badge in item.badges || []"
                  :key="`${badge.type}-${badge.label}`"
                  :class="getBadgeClass(badge)"
                  :style="badge.style"
                  :aria-label="badge.label"
                  :title="badge.label"
                >
                  <Icon
                    v-if="badge.type === 'tag'"
                    name="group"
                    width="12"
                    height="12"
                    aria-hidden="true"
                  />
                  <EmojiIcon
                    v-else-if="badge.emoji"
                    class="task-goal-badge-emoji"
                    :value="badge.emoji"
                  />
                  <span class="lifelog-timeline-badge-label">{{ badge.label }}</span>
                </span>
              </div>
              <template v-if="item.note">
                <textarea
                  v-if="editingItemId === item.id"
                  v-model="editingText"
                  class="lifelog-timeline-note-input"
                  rows="3"
                  autofocus
                  @keydown.ctrl.enter.prevent="saveItemEdit(item)"
                  @keydown.esc.prevent="cancelItemEdit"
                  @blur="saveItemEdit(item)"
                  @mousedown.stop
                  @click.stop
                />
                <button
                  v-else-if="item.editable"
                  type="button"
                  class="lifelog-timeline-note is-editable"
                  :aria-label="item.note"
                  @click.stop="startItemEdit(item)"
                >{{ item.note }}</button>
                <div v-else class="lifelog-timeline-note">{{ item.note }}</div>
              </template>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showEditor" class="lifelog-timeline-editor">
        <textarea
          class="lifelog-timeline-editor-input"
          :value="draft"
          :placeholder="editorPlaceholder"
          rows="4"
          @input="handleDraftInput"
          @keydown.ctrl.enter.prevent="emit('save-draft')"
          @mousedown.stop
          @click.stop
        />
        <button
          type="button"
          class="lifelog-timeline-submit ariaLabel"
          :aria-label="saveLabel"
          :disabled="isDraftEmpty"
          @click.stop="emit('save-draft')"
        >
          <span aria-hidden="true">↑</span>
        </button>
      </div>
      <div
        v-if="pendingDeleteItem"
        class="lifelog-timeline-confirm-overlay"
        @click.self="cancelDeleteItem"
      >
        <div
          class="lifelog-timeline-confirm"
          role="dialog"
          aria-modal="true"
          :aria-label="deleteConfirmTitle"
        >
          <div class="lifelog-timeline-confirm-title">{{ deleteConfirmTitle }}</div>
          <div class="lifelog-timeline-confirm-message">{{ deleteConfirmMessage }}</div>
          <div class="lifelog-timeline-confirm-actions">
            <button
              type="button"
              class="lifelog-timeline-confirm-btn"
              @click="cancelDeleteItem"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="lifelog-timeline-confirm-btn is-danger"
              @click="confirmDeleteItem"
            >
              {{ deleteLabel }}
            </button>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { LifelogEventType } from '@/utils/lifelogEvents';
import EmojiIcon from './EmojiIcon.vue';
import Icon from './Icon.vue';

export interface LifelogTimelinePanelItem {
  id: string;
  sourceId?: string;
  type: LifelogEventType;
  date?: string;
  timeLabel: string;
  sortMinutes: number;
  title: string;
  meta: string;
  note: string;
  icon: string;
  emoji?: string;
  moodSvg?: string;
  deletable?: boolean;
  editable?: boolean;
  badges?: LifelogTimelinePanelBadge[];
}

export interface LifelogTimelinePanelBadge {
  type: 'tag' | 'goal';
  label: string;
  style?: Record<string, string>;
  emoji?: string;
}

export interface LifelogTimelineDateStripDay {
  date: string;
  weekdayLabel: string;
  dayNumber: string | number;
  ariaLabel: string;
  selected?: boolean;
  today?: boolean;
  hasRecord?: boolean;
  moodSvg?: string;
}

const props = withDefaults(defineProps<{
  show: boolean;
  title: string;
  subtitle: string;
  items: LifelogTimelinePanelItem[];
  emptyText: string;
  closeLabel: string;
  deleteLabel: string;
  showEditor?: boolean;
  draft?: string;
  editorPlaceholder?: string;
  saveLabel?: string;
  cancelLabel?: string;
  deleteConfirmTitle?: string;
  deleteConfirmMessage?: string;
  variant?: 'drawer' | 'embedded';
  fillHeight?: boolean;
  dateStripDays?: LifelogTimelineDateStripDay[];
  currentPeriod?: string;
  previousPeriodLabel?: string;
  nextPeriodLabel?: string;
}>(), {
  showEditor: false,
  draft: '',
  editorPlaceholder: '',
  saveLabel: 'Save',
  cancelLabel: 'Cancel',
  deleteConfirmTitle: 'Delete this record?',
  deleteConfirmMessage: 'This action cannot be undone.',
  variant: 'drawer',
  fillHeight: false,
  dateStripDays: () => [],
  currentPeriod: '',
  previousPeriodLabel: '',
  nextPeriodLabel: ''
});

const emit = defineEmits<{
  close: [];
  'change-period': [offset: number];
  'select-date': [date: string];
  'update:draft': [value: string];
  'save-draft': [];
  'clear-draft': [];
  'delete-item': [item: LifelogTimelinePanelItem];
  'update-item': [item: LifelogTimelinePanelItem, text: string];
}>();

const isDraftEmpty = computed(() => !props.draft.trim());
const dateStripRef = ref<HTMLElement | null>(null);
const selectedDateStripKey = computed(() => props.dateStripDays.find(day => day.selected)?.date || '');
const pendingDeleteItem = ref<LifelogTimelinePanelItem | null>(null);
const editingItemId = ref<string | null>(null);
const editingText = ref('');

function getBadgeClass(badge: LifelogTimelinePanelBadge): string[] {
  if (badge.type === 'goal') {
    return [
      'lifelog-timeline-badge',
      'task-editor-property-pill',
      'is-goal',
      'task-group-badge',
      'task-goal-badge',
      'ariaLabel'
    ];
  }
  return [
    'lifelog-timeline-badge',
    'task-group-badge',
    'ariaLabel'
  ];
}

function scrollSelectedDateIntoView(): void {
  void nextTick(() => {
    const selectedDay = dateStripRef.value?.querySelector('.lifelog-timeline-date-strip-day.selected');
    selectedDay?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  });
}

watch(
  [() => props.show, selectedDateStripKey],
  ([show]) => {
    if (show) {
      scrollSelectedDateIntoView();
    } else {
      pendingDeleteItem.value = null;
      cancelItemEdit();
    }
  },
  { immediate: true }
);

watch(
  () => props.items,
  (items) => {
    const pendingItem = pendingDeleteItem.value;
    if (pendingItem && !items.some(item => item.id === pendingItem.id)) {
      pendingDeleteItem.value = null;
    }
  }
);

function handleDraftInput(event: Event): void {
  const target = event.target instanceof HTMLTextAreaElement ? event.target : null;
  emit('update:draft', target?.value || '');
}

function changePeriod(offset: number): void {
  emit('change-period', offset);
}

function requestDeleteItem(item: LifelogTimelinePanelItem): void {
  pendingDeleteItem.value = item;
}

function cancelDeleteItem(): void {
  pendingDeleteItem.value = null;
}

function confirmDeleteItem(): void {
  const item = pendingDeleteItem.value;
  if (!item) {
    return;
  }
  pendingDeleteItem.value = null;
  emit('delete-item', item);
}

function startItemEdit(item: LifelogTimelinePanelItem): void {
  if (!item.editable) {
    return;
  }
  editingItemId.value = item.id;
  editingText.value = item.note;
}

function cancelItemEdit(): void {
  editingItemId.value = null;
  editingText.value = '';
}

function saveItemEdit(item: LifelogTimelinePanelItem): void {
  const text = editingText.value.trim();
  if (!text || text === item.note) {
    cancelItemEdit();
    return;
  }
  emit('update-item', item, text);
  cancelItemEdit();
}

function handleBackdropMouseDown(): void {
  if (props.variant === 'drawer') {
    emit('close');
  }
}
</script>

<style scoped>
.lifelog-timeline-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.18);
}

.lifelog-timeline-backdrop.is-embedded {
  position: static;
  inset: auto;
  z-index: auto;
  display: block;
  height: auto;
  min-height: 0;
  background: transparent;
}
.lifelog-timeline-backdrop.is-drawer .lifelog-timeline-panel{
  margin: 42px 0;
  height: calc( 100% - 84px );
  border-radius: 20px;
}
.lifelog-timeline-panel {
  position: relative;
  width: min(420px, 92vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--b3-theme-background);
  box-shadow: -12px 0 28px rgba(0, 0, 0, 0.16);
}

.lifelog-timeline-backdrop.is-embedded .lifelog-timeline-panel {
  width: 100%;
  height: auto;
  min-height: 0;
  border-radius: 20px;
  box-shadow: none;
  overflow: hidden;
}

.lifelog-timeline-backdrop.is-embedded .lifelog-timeline-header {
  padding: 10px 12px;
}

.lifelog-timeline-backdrop.is-embedded .lifelog-timeline-list {
  padding: 10px 12px 14px;
}

.lifelog-timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
}

.lifelog-timeline-title-wrap {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.lifelog-timeline-title {
  color: var(--b3-theme-on-background);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
}

.lifelog-timeline-subtitle {
  margin-top: 2px;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
  opacity: 0.78;
}

.lifelog-timeline-calendar-header {
  width: 100%;
}

.lifelog-timeline-calendar-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.lifelog-timeline-calendar-nav {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.lifelog-timeline-calendar-nav:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.lifelog-timeline-calendar-period {
  flex: 1;
  min-width: 0;
  color: var(--b3-theme-on-background);
  font-size: 14px;
  font-weight: 650;
  line-height: 28px;
  text-align: center;
}

.lifelog-timeline-date-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 2px 2px 0;
  scrollbar-width: none;
}

.lifelog-timeline-date-strip::-webkit-scrollbar {
  display: none;
}

.lifelog-timeline-date-strip-day {
  width: 34px;
  min-width: 34px;
  height: 54px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px 0;
  transition: background-color 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s;
}

.lifelog-timeline-date-strip-day:hover {
  background: var(--b3-list-hover);
}

.lifelog-timeline-date-strip-day.today:not(.selected) {
  color: #f98f7a;
  box-shadow: inset 0 0 0 1px #f98f7a;
}

.lifelog-timeline-date-strip-day.selected {
  background: #f98f7a;
  color: #fff;
  transform: translateY(-1px);
}

.lifelog-timeline-date-strip-day.has-record:not(.selected) .lifelog-timeline-date-number {
  color: #f98f7a;
  font-weight: 700;
}

.lifelog-timeline-date-weekday {
  font-size: 10px;
  line-height: 1;
  opacity: 0.58;
}

.lifelog-timeline-date-number {
  font-size: 13px;
  line-height: 18px;
  font-weight: 650;
}

.lifelog-timeline-date-mood {
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lifelog-timeline-date-mood.empty {
  height: 3px;
}

.lifelog-timeline-date-mood svg {
  width: 100%;
  height: 100%;
}

.lifelog-timeline-date-strip-day.selected .lifelog-timeline-date-weekday,
.lifelog-timeline-date-strip-day.selected .lifelog-timeline-date-mood {
  opacity: 0.9;
}

.lifelog-timeline-close {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
}

.lifelog-timeline-close:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
}

.lifelog-timeline-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px 14px;
}

.lifelog-timeline-empty {
  padding: 24px 8px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  text-align: center;
}

.lifelog-timeline-item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 8px;
  position: relative;
}

.lifelog-timeline-item + .lifelog-timeline-item {
  margin-top: 10px;
}

.lifelog-timeline-time {
  margin: 10px;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
  line-height: 1.2;
  text-align: left;
  white-space: nowrap;
}

.lifelog-timeline-line {
  position: relative;
}

.lifelog-timeline-line::before {
  content: "";
  position: absolute;
  top: 36px;
  bottom: 0px;
  left: 14px;
  width: 1px;
  background: repeating-linear-gradient(
    to bottom,
    var(--b3-border-color) 0 4px,
    transparent 4px 8px
  );
}

.lifelog-timeline-dot {
  position: absolute;
  top: 4px;
  left: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--pinch-background2);
  color: var(--b3-theme-on-background);
  border: 2px dashed var(--pinch-color2);
  overflow: hidden;
}

.lifelog-timeline-dot :deep(svg) {
  display: block;
  width: 12px;
  height: 12px;
}

.lifelog-timeline-dot-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  line-height: 1;
}

.lifelog-timeline-dot-emoji :deep(svg) {
  width: 16px;
  height: 16px;
}

.lifelog-timeline-content {
  min-width: 0;
}

.lifelog-timeline-item.is-habit-checkin .lifelog-timeline-dot {
  background: var(--pinch-background5);
  border-color: var(--pinch-color5);
}

.lifelog-timeline-item.is-task-completed .lifelog-timeline-dot {
  background: var(--pinch-background7);
  border-color: var(--pinch-color7);
}

.lifelog-timeline-item.is-manual-note .lifelog-timeline-dot {
  background: var(--pinch-background8);
  border-color: var(--pinch-color8);
}

.lifelog-timeline-card {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  box-shadow: var(--pinch-shadow);
  background: var(--b3-theme-background);
}


.lifelog-timeline-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.lifelog-timeline-card-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-weight: 600;
}

.lifelog-timeline-delete {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  opacity: 0.74;
}

.lifelog-timeline-delete:hover {
  background: var(--b3-list-hover);
  color: var(--b3-theme-error);
  opacity: 1;
}

.lifelog-timeline-meta {
  margin-top: 3px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
  opacity: 0.8;
}

.lifelog-timeline-backdrop.is-embedded.is-fill-height {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.lifelog-timeline-backdrop.is-embedded.is-fill-height .lifelog-timeline-panel {
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}

.lifelog-timeline-backdrop.is-embedded.is-fill-height .lifelog-timeline-list {
  flex: 1 1 0;
}

.lifelog-timeline-meta-text {
  margin-right: 1px;
}

.lifelog-timeline-badge {
  min-width: 0;
}

.lifelog-timeline-badge.task-group-badge {
  display: flex;
  align-items: center;
  max-width: 120px;
  gap: 2px;
  padding: 2px 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.25;
}

.lifelog-timeline-badge.task-group-badge svg {
  flex: 0 0 auto;
}

.lifelog-timeline-badge.task-goal-badge {
  background: var(--pinch-background6);
  color: var(--b3-theme-on-background);
}

.lifelog-timeline-badge.task-editor-property-pill.is-goal.task-goal-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lifelog-timeline-badge .task-goal-badge-emoji {
  flex: 0 0 auto;
  font-size: 11px;
  line-height: 1;
}

.lifelog-timeline-badge-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lifelog-timeline-note {
  margin-top: 6px;
  color: var(--b3-theme-on-background);
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.lifelog-timeline-note.is-editable {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: text;
}

.lifelog-timeline-note.is-editable:hover {
  color: var(--b3-theme-primary);
}

.lifelog-timeline-note-input {
  box-sizing: border-box;
  width: 100%;
  margin-top: 6px;
  padding: 5px 6px;
  border: 1px solid var(--b3-theme-primary);
  border-radius: 5px;
  outline: none;
  resize: vertical;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font: inherit;
  line-height: 1.45;
}

.lifelog-timeline-editor {
  position: relative;
  margin: 10px;
  padding: 10px 36px 10px 10px;
  border-radius: 16px;
  box-shadow: var(--pinch-shadow);
}

.lifelog-timeline-editor-input {
  width: 100%;
  min-height: 112px;
  resize: none;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--b3-theme-on-background);
  font-size: 13px;
  line-height: 1.5;
  box-sizing: border-box;
}

.lifelog-timeline-editor-input:focus {
  outline: none;
}

.lifelog-timeline-submit {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.lifelog-timeline-submit span {
  display: block;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  transform: translateY(-1px);
}

.lifelog-timeline-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.28);
}

.lifelog-timeline-submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.lifelog-timeline-confirm-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.22);
  box-sizing: border-box;
}

.lifelog-timeline-confirm {
  width: min(320px, 100%);
  padding: 16px;
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  box-shadow: var(--b3-dialog-shadow);
  box-sizing: border-box;
}

.lifelog-timeline-confirm-title {
  color: var(--b3-theme-on-background);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.lifelog-timeline-confirm-message {
  margin-top: 8px;
  color: var(--b3-theme-on-surface);
  font-size: 13px;
  line-height: 1.55;
}

.lifelog-timeline-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.lifelog-timeline-confirm-btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  background: var(--b3-theme-surface);
  color: var(--b3-theme-on-background);
  font-size: 13px;
  cursor: pointer;
}

.lifelog-timeline-confirm-btn:hover {
  background: var(--b3-list-hover);
}

.lifelog-timeline-confirm-btn.is-danger {
  color: var(--b3-theme-error);
  border-color: color-mix(in srgb, var(--b3-theme-error) 35%, var(--b3-border-color));
}
</style>
