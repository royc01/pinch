<template>
  <div v-if="show" ref="focusTimerPanelRef" class="focus-timer-panel">
    <div class="timer-header">
      <div class="stats-header-content">
        <div class="stats-title">{{ t('focusTimer.title') }}</div>
        <div class="stats-header-actions">
          <div class="mini-focus-toggle">
            <span class="mini-focus-label">{{ t('focusTimer.enableMini') }}</span>
           <SyCheckbox
              :model-value="miniEnabled"
              @update:model-value="emit('update:miniEnabled', $event)"
            />
          </div>
          <button
            type="button"
            class="icon-button ariaLabel"
            :aria-label="t('focusTimer.settings')"
            @click="emit('open-settings')"
          >
            <Icon name="taskScope" width="18" height="18" class="icon" />
          </button>
          <button @click="handleClose" class="icon-button ariaLabel" :aria-label="t('focusTimer.closeTimer')">
            <Icon name="close" width="16" height="16" class="icon" />
          </button>
        </div>
      </div>
    </div>
    
      <div class="timer-content">
        <div class="linked-habit-banner">
          <div class="linked-habit-banner__row">
            <div class="linked-habit-banner__header">
              <span class="linked-habit-banner__label">{{ t('focusTimer.linkedTarget') }}</span>
            </div>
            <div v-if="linkedTarget" class="linked-habit-banner__chip-row">
              <button
                type="button"
                class="linked-habit-banner__chip ariaLabel"
                :disabled="!canOpenLinkedTarget"
               
                :aria-label="linkedTargetDisplayLabel"
                @click="openLinkedTarget"
              >
                <FocusTargetIcon class="linked-habit-banner__emoji" :icon="linkedTargetDisplayEmoji" />
                <span class="linked-habit-banner__name">{{ linkedTargetDisplayLabel }}</span>
                <Icon v-if="canOpenLinkedTarget" name="open" width="12" height="12" class="icon" />
              </button>
              <button
                type="button"
                class="linked-habit-banner__clear ariaLabel"
                :disabled="isLinkedTargetLocked"
               
                :aria-label="t('focusTimer.clearLinkedTarget')"
                @click="clearLinkedTarget"
              >
                <Icon name="close" width="12" height="12" class="icon" />
              </button>
            </div>
            <div v-else class="linked-habit-banner__empty">
              <div class="linked-habit-banner__actions">
                <button
                  type="button"
                  class="linked-habit-banner__action"
                  :disabled="isLinkedTargetLocked"
                  @click="openTargetPicker('habit')"
                >
                  {{ t('focusTimer.selectHabit') }}
                </button>
                <button
                  type="button"
                  class="linked-habit-banner__action"
                  :disabled="isLinkedTargetLocked"
                  @click="openTargetPicker('task')"
                >
                  {{ t('focusTimer.selectTask') }}
                </button>
              </div>
            </div>
          </div>
          <div v-if="targetPickerMode" class="linked-habit-banner__picker">
            <div class="linked-habit-banner__picker-header">
              <span>{{ targetPickerTitle }}</span>
              <button
                type="button"
                class="linked-habit-banner__picker-close ariaLabel"
               
                :aria-label="t('common.close')"
                @click="closeTargetPicker"
              >
                <Icon name="close" width="12" height="12" class="icon" />
              </button>
            </div>
            <input
              v-model.trim="targetSearch"
              class="linked-habit-banner__search"
              type="text"
              :placeholder="targetPickerPlaceholder"
            />
            <div v-if="isLoadingTargetOptions" class="linked-habit-banner__picker-state">
              {{ t('taskManager.loading') }}
            </div>
            <div v-else-if="targetOptionsError" class="linked-habit-banner__picker-state is-error">
              {{ targetOptionsError }}
            </div>
            <div v-else-if="filteredTargetOptions.length === 0" class="linked-habit-banner__picker-state">
              {{ targetPickerEmptyText }}
            </div>
            <div v-else class="linked-habit-banner__picker-list">
              <button
                v-for="target in filteredTargetOptions"
                :key="`${target.type}-${target.id}`"
                type="button"
                class="linked-habit-banner__picker-item"
                @click="selectLinkedTarget(target)"
              >
                <span class="linked-habit-banner__picker-item-main">
                  <FocusTargetIcon class="linked-habit-banner__emoji" :icon="getTargetEmoji(target)" />
                  <span class="linked-habit-banner__picker-item-name">{{ target.name }}</span>
                </span>
                <span v-if="target.type === 'habit' && target.preferredDuration" class="linked-habit-banner__picker-item-meta">
                  {{ target.preferredDuration }}m
                </span>
              </button>
            </div>
          </div>
        </div>

        <div class="timer-display">
          <div class="timer-circle">
          <svg class="timer-svg" viewBox="0 0 200 200">
            <circle class="timer-bg" cx="100" cy="100" r="90" />
            <circle class="timer-progress" cx="100" cy="100" r="90"
                    :stroke-dasharray="circumference"
                    :stroke-dashoffset="strokeDashoffset"
                    :style="{ stroke: isBreakMode ? 'rgb(46 170 220)' : '#f98f7a' }" />
          </svg>
          <div class="timer-text">
            <div class="time">{{ formattedTime }}</div>
            <div class="mode-label">{{ currentModeLabel }}</div>
          </div>
        </div>
      </div>

       <div class="timer-controls">
        <button
          v-if="!isRunning"
          @click="isPaused ? resumeTimer() : startTimer()"
          class="control-btn start-btn ariaLabel"
          :disabled="isStartBlockedByOther && !isPaused"
          :aria-label="isStartBlockedByOther && !isPaused ? t('focusTimer.floatingFocusRunning') : undefined"
        >
          <Icon name="play" width="20" height="20" />
          <span>{{ isPaused ? t('focusTimer.continueFocus') : t('taskManager.startFocus') }}</span>
        </button>
        <button v-else @click="pauseTimer" class="control-btn pause-btn">
          <Icon name="pause" width="20" height="20" />
          <span>{{ t('focusTimer.pause') }}</span>
        </button>
        <button v-if="isRunning || isPaused" @click="stopTimer(true)" class="control-btn stop-btn">
          <Icon name="stop" width="20" height="20" />
          <span>{{ t('focusTimer.stop') }}</span>
         </button>
       </div>

       <div class="timer-settings">
        <div class="setting-section">
          <div class="setting-label">
            <span>{{ t('focusTimer.focusDuration') }}</span>
            <span class="duration-value">{{ focusDurationValueText }}</span>
          </div>
          <div class="duration-slider-container">
            <input type="range" v-model.number="durationIndex" @input="updateDurationByIndex"
                   min="0" :max="durationOptions.length - 1" step="1" class="duration-slider"
                   :disabled="isTimerActive"
                   style="accent-color: var(--b3-theme-on-background)" />
            <div class="duration-marks">
              <span v-for="(mark, index) in durationOptions" :key="`${mark}-${index}`"
                    class="duration-mark"
                    :style="{ left: `${(index / (durationOptions.length - 1)) * 100}%` }">
                {{ mark === 'unlimited' ? t('focusTimer.unlimited') : mark }}
              </span>
            </div>
          </div>
        </div>

        <div class="setting-section">
          <div class="setting-label">
            <span>{{ t('focusTimer.shortBreakDuration') }}</span>
            <span class="duration-value">{{ shortBreakDuration }}{{ t('focusTimer.minuteSuffix') }}</span>
          </div>
          <div class="duration-slider-container">
            <input type="range" v-model="shortBreakDurationIndex" @input="updateShortBreakDuration"
                   min="0" max="4" step="1" class="duration-slider"
                   :disabled="isPomodoroSettingsLocked"
                   style="accent-color: var(--b3-theme-on-background)" />
            <div class="duration-marks">
              <span v-for="(mark, index) in shortBreakMarks" :key="mark"
                    class="duration-mark"
                    :style="{ left: `${(index / (shortBreakMarks.length - 1)) * 100}%` }">
                {{ mark }}
              </span>
            </div>
          </div>
        </div>

        <div class="setting-section">
          <div class="setting-label">
            <span>{{ t('focusTimer.focusSets') }}</span>
            <span class="duration-value">{{ pomodoroSets }}{{ t('focusTimer.setSuffix') }}</span>
          </div>
          <div class="duration-slider-container">
            <input type="range" v-model="pomodoroSets" @input="updatePomodoroSets"
                   min="1" max="8" step="1" class="duration-slider"
                   :disabled="isPomodoroSettingsLocked"
                   style="accent-color: var(--b3-theme-on-background)" />
            <div class="duration-marks">
              <span v-for="(mark, index) in pomodoroSetMarks" :key="mark"
                    class="duration-mark"
                    :style="{ left: `${(index / (pomodoroSetMarks.length - 1)) * 100}%` }">
                {{ mark }}
              </span>
            </div>
          </div>
        </div>

        <div class="setting-section">
          <div class="setting-label">
            <span>{{ t('focusTimer.whiteNoise') }}</span>
            <div class="switch-container">
              <label class="switch">
                <input type="checkbox" :checked="enableAudio" @change="handleAudioToggle" />
                <span class="slider round"></span>
              </label>
            </div>
          </div>
          <div class="sound-selector" :class="{ disabled: isDownloading || !enableAudio }">
            <button class="ariaLabel" v-for="sound in soundOptions" :key="sound.id"
                    @click="selectSound(sound)"
                    :disabled="isDownloading || !enableAudio"
                    :class="['sound-btn', { active: selectedSound.id === sound.id }]"
                   
                    :aria-label="`${t('focusTimer.pickSoundPrefix')}${sound.name}`">
              <Icon :name="sound.icon" width="80%" height="80%" />
            </button>
            <button
              v-if="userSettings.focus.customWhiteNoiseFile"
              type="button"
              class="sound-btn ariaLabel"
              :class="{ active: selectedSound.id === 'custom' }"
              :disabled="isDownloading || !enableAudio"
              :aria-label="t('taskScopeDialog.customWhiteNoise')"
              @click="selectSound({ id: 'custom', name: t('taskScopeDialog.customWhiteNoise'), emoji: '🎵', icon: 'soundOff' })"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21.65,2.24a1,1,0,0,0-.8-.23l-13,2A1,1,0,0,0,7,5V15.35A3.45,3.45,0,0,0,5.5,15,3.5,3.5,0,1,0,9,18.5V10.86L20,9.17v4.18A3.45,3.45,0,0,0,18.5,13,3.5,3.5,0,1,0,22,16.5V3A1,1,0,0,0,21.65,2.24ZM5.5,20A1.5,1.5,0,1,1,7,18.5,1.5,1.5,0,0,1,5.5,20Zm13-2A1.5,1.5,0,1,1,20,16.5,1.5,1.5,0,0,1,18.5,18ZM20,7.14,9,8.83v-3L20,4.17Z" />
              </svg>
            </button>
          </div>
          <div class="volume-control" v-if="selectedSound.id !== 'none' && enableAudio">
            <span class="volume-icon">🔊</span>
            <input type="range" v-model="volume" @input="updateVolume" min="0" max="1" step="0.1" class="volume-slider"
                   style="accent-color: var(--b3-theme-on-background)" />
            <span class="volume-value">{{ Math.round(volume * 100) }}%</span>
          </div>
          <div class="download-progress" v-if="isDownloading">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${downloadProgress}%` }"></div>
            </div>
            <span class="progress-text">{{ downloadProgress }}%</span>
          </div>
        </div>
      </div>

      <div class="timer-stats" v-if="stats.totalSessions > 0">
        <div class="stat-item">
          <div class="stat-value">{{ stats.totalSessions }}</div>
          <div class="stat-label">{{ t('focusTimer.totalSessions') }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" v-html="formatTotalTime(stats.totalMinutes)"></div>
          <div class="stat-label">{{ t('focusTimer.totalDuration') }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.todaySessions }}</div>
          <div class="stat-label">{{ t('focusTimer.todayFocus') }}</div>
        </div>
      </div>

      <div class="timer-history">
        <div class="calendar-controls">
          <div class="calendar-navigation">
            <button @click="changeMonth(-1)" class="nav-btn ariaLabel" :aria-label="t('date.previousMonth')">
              <Icon name="left" width="16" height="16" class="icon" />
            </button>
            <span class="current-period">
              <span>{{ currentMonth.monthName }}</span>
              <Icon
                name="focusBackfillHint"
                width="14"
                height="14"
                class="timer-history-hint ariaLabel"
                :aria-label="t('focusTimer.backfillDateHint')"
              />
            </span>
            <button @click="changeMonth(1)" class="nav-btn ariaLabel" :aria-label="t('date.nextMonth')">
              <Icon name="right" width="16" height="16" class="icon" />
            </button>
          </div>
        </div>
        <div class="calendar-view">
          <div class="month-view">
            <div class="weekdays-header">
              <div v-for="day in weekDayLabels" :key="day" class="weekday">{{ day }}</div>
            </div>
            <div class="month-grid">
              <button v-for="(day, index) in calendarDays" :key="index"
                   type="button"
                   :class="['day', { 
                     'hasdata': day.record && day.record.minutes > 0,
                     'today': day.isToday,
                     'not-current-month': !day.date
                   }]"
                   :disabled="!day.dateString"
                   :aria-label="day.dateString ? `${t('focusTimer.backfillTitle', '补录专注')} ${day.dateString}` : undefined"
                   @click="openBackfillDialog(day)">
                <span class="day-number">{{ day.date ? day.date : '' }}</span>
                <div class="day-duration">
                  {{ day.record && day.record.minutes > 0 ? formatTimeShort(day.record.minutes) : '--' }}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showBackfillDialog"
      class="focus-backfill-overlay"
      :style="backfillOverlayStyle"
      @click.self="closeBackfillDialog"
    >
      <div class="focus-backfill-dialog" role="dialog" aria-modal="true" :aria-label="t('focusTimer.backfillTitle', '补录专注')">
        <div class="focus-backfill-header">
          <div>
            <div class="focus-backfill-title">{{ t('focusTimer.backfillTitle', '补录专注') }}</div>
            <div class="focus-backfill-date">{{ backfillDate }}</div>
          </div>
          <button
            type="button"
            class="focus-backfill-close ariaLabel"
            :aria-label="t('common.close')"
            @click="closeBackfillDialog"
          >
            <Icon name="close" width="14" height="14" />
          </button>
        </div>

        <div v-if="backfillFocusTimelineItems.length > 0" class="focus-backfill-records">
          <div class="focus-backfill-records__title">
            {{ t('focusTimer.backfillExistingRecords', '已有专注记录') }}
          </div>
          <div class="focus-backfill-records__list">
            <div
              v-for="item in backfillFocusTimelineItems"
              :key="item.id"
              class="lifelog-timeline-item is-focus"
            >
              <div class="lifelog-timeline-content">
                <div class="lifelog-timeline-card">
                  <div class="lifelog-timeline-card-header">
                    <span class="lifelog-timeline-card-title">{{ item.timeLabel }}</span>
                    <button
                      type="button"
                      class="lifelog-timeline-delete ariaLabel"
                      :aria-label="`${t('common.delete')} ${item.timeLabel}`"
                      :disabled="deletingBackfillSessionId === item.sourceId"
                      @click.stop="deleteBackfillFocusSession(item.sourceId)"
                    >
                      <Icon name="trash" width="11" height="11" />
                    </button>
                  </div>
                  <div class="lifelog-timeline-meta">{{ item.meta }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="focus-backfill-field">
          <label>{{ t('focusTimer.focusDuration') }}</label>
          <div class="focus-backfill-duration-row">
            <button
              v-for="minutes in backfillDurationOptions"
              :key="minutes"
              type="button"
              class="focus-backfill-duration-chip"
              :class="{ active: backfillDuration === minutes }"
              @click="backfillDuration = minutes"
            >
              {{ minutes }}m
            </button>
          </div>
          <input
            v-model.number="backfillDuration"
            class="focus-backfill-input"
            type="number"
            min="1"
            max="720"
            step="1"
          />
        </div>

        <div class="focus-backfill-field">
          <label>{{ t('focusTimer.backfillEndTime', '结束时间') }}</label>
          <input
            v-model="backfillEndTime"
            class="focus-backfill-input"
            type="time"
          />
        </div>

        <div class="focus-backfill-target">
          <div class="focus-backfill-target__row">
            <span>{{ t('focusTimer.linkedTarget') }}</span>
            <div v-if="backfillTarget" class="focus-backfill-target__chip-row">
              <button
                type="button"
                class="focus-backfill-target__chip"
                @click="openBackfillTargetPicker(backfillTarget.type)"
              >
                <FocusTargetIcon class="focus-backfill-target__emoji" :icon="getTargetEmoji(backfillTarget)" />
                <span class="focus-backfill-target__name">{{ backfillTargetLabel }}</span>
              </button>
              <button
                type="button"
                class="focus-backfill-target__clear ariaLabel"
                :aria-label="t('focusTimer.clearLinkedTarget')"
                @click="clearBackfillTarget"
              >
                <Icon name="close" width="12" height="12" />
              </button>
            </div>
            <div v-else class="focus-backfill-target__actions">
              <button
                type="button"
                class="focus-backfill-target__action"
                @click="openBackfillTargetPicker('habit')"
              >
                {{ t('focusTimer.selectHabit') }}
              </button>
              <button
                type="button"
                class="focus-backfill-target__action"
                @click="openBackfillTargetPicker('task')"
              >
                {{ t('focusTimer.selectTask') }}
              </button>
            </div>
          </div>
          <div v-if="backfillTargetPickerMode" class="focus-backfill-picker">
            <div class="focus-backfill-picker__header">
              <span>{{ backfillTargetPickerTitle }}</span>
              <button
                type="button"
                class="focus-backfill-picker__close ariaLabel"
                :aria-label="t('common.close')"
                @click="closeBackfillTargetPicker"
              >
                <Icon name="close" width="12" height="12" />
              </button>
            </div>
            <input
              v-model.trim="backfillTargetSearch"
              class="focus-backfill-input"
              type="text"
              :placeholder="backfillTargetPickerPlaceholder"
            />
            <div v-if="isBackfillLoadingTargetOptions" class="focus-backfill-picker__state">
              {{ t('taskManager.loading') }}
            </div>
            <div v-else-if="backfillTargetOptionsError" class="focus-backfill-picker__state is-error">
              {{ backfillTargetOptionsError }}
            </div>
            <div v-else-if="filteredBackfillTargetOptions.length === 0" class="focus-backfill-picker__state">
              {{ backfillTargetPickerEmptyText }}
            </div>
            <div v-else class="focus-backfill-picker__list">
              <button
                v-for="target in filteredBackfillTargetOptions"
                :key="`${target.type}-${target.id}`"
                type="button"
                class="focus-backfill-picker__item"
                @click="selectBackfillTarget(target)"
              >
                <span class="focus-backfill-picker__item-main">
                  <FocusTargetIcon :icon="getTargetEmoji(target)" />
                  <span class="focus-backfill-picker__item-name">{{ target.name }}</span>
                </span>
                <span v-if="target.type === 'habit' && target.preferredDuration" class="focus-backfill-picker__item-meta">
                  {{ target.preferredDuration }}m
                </span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="backfillError" class="focus-backfill-error">{{ backfillError }}</div>

        <div class="focus-backfill-actions">
          <button type="button" class="focus-backfill-btn" @click="closeBackfillDialog">
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="focus-backfill-btn is-primary"
            :disabled="isBackfillSaving"
            @click="saveBackfillSession"
          >
            {{ isBackfillSaving ? t('taskManager.saving', '保存中') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showExitConfirmPanel"
      class="focus-exit-overlay"
      @click.self="cancelExitConfirm"
    >
      <div class="focus-exit-dialog ariaLabel" role="dialog" aria-modal="true" :aria-label="t('focusTimer.closeTimer')">
        <div class="focus-exit-dialog__title">{{ t('focusTimer.closeTimer') }}</div>
        <div class="focus-exit-dialog__message">{{ t('focusTimer.exitConfirm') }}</div>
        <div class="focus-exit-dialog__actions">
          <button type="button" class="focus-exit-dialog__btn" @click="cancelExitConfirm">
            {{ t('common.cancel') }}
          </button>
          <button type="button" class="focus-exit-dialog__btn is-danger" @click="confirmStopAndClose">
            {{ t('focusTimer.stopAndExit') }}
          </button>
          <button type="button" class="focus-exit-dialog__btn is-primary" @click="openMiniAndContinue">
            {{ t('focusTimer.openMiniFocus') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, toRefs, watch } from 'vue';
import Icon from './Icon.vue';
import SyCheckbox from '@/components/SiyuanTheme/SyCheckbox.vue';
import {
  addFocusSession,
  deleteFocusSessionRecord,
  getFocusStatsSummary,
  getFocusTimerData,
  getHabits,
  getMonthlyRecords,
  putFile,
  readDir,
  TaskRepository,
  upsertFocusSessionRecord,
  type DailyFocusRecord,
  type FocusSessionRecord,
  type FocusStatsSummary
} from '@/api';
import { useFocusSessionLock } from '@/composables/useFocusSessionLock';
import { useFocusCountupCheckpoint } from '@/composables/useFocusCountupCheckpoint';
import { useI18n } from '@/composables/useI18n';
import { useMicroBreakReminder } from '@/composables/useMicroBreakReminder';
import { useUserSettings } from '@/composables/useUserSettings';
import { getStoredFocusAudioUrl, playCustomFocusAudio, playTaskCompletionSound, prepareCustomFocusAudio, prepareTaskCompletionSound } from '@/utils/completionSound';
import { awardFocusSession } from '@/rewardRepository';
import { getLocalCheckinNoteDate, requestCheckinNote } from '@/utils/checkinNotePrompt';
import FocusTargetIcon from '@/components/FocusTargetIcon.vue';
import {
  createHabitFocusTarget,
  createTaskFocusTarget,
  toFocusSessionTargetInput,
  type FocusTimerLinkedTarget
} from '@/utils/focusTimerTarget';
import type { FocusTimerHandoffState } from '@/utils/focusTimerHandoff';
import {
  focusRecordToLifelogEvent,
  type FocusLifelogEvent
} from '@/utils/lifelogEvents';
import { filterFocusTargetOptions } from '@/utils/focusTimerTargetPicker';
import {
  hideDetachedMicroBreakWindow,
  showDetachedMicroBreakWindow,
  subscribeDetachedMicroBreakCancel
} from '@/utils/detachedFocusWindow';

interface Props {
  show: boolean;
  miniEnabled?: boolean;
  linkedTarget?: FocusTimerLinkedTarget | null;
}

const props = withDefaults(defineProps<Props>(), {
  miniEnabled: false,
  linkedTarget: null
});
const { miniEnabled, linkedTarget } = toRefs(props);
const emit = defineEmits<{
  close: [];
  handoffToMini: [state: FocusTimerHandoffState];
  'update:miniEnabled': [value: boolean];
  'complete-linked-target': [target: FocusTimerLinkedTarget];
  'update-linked-target': [target: FocusTimerLinkedTarget | null];
  'clear-linked-target': [];
  'open-linked-target': [target: FocusTimerLinkedTarget];
  'open-settings': [];
}>();

const { t } = useI18n();
const { data: userSettings, loadSettings, updateSettings } = useUserSettings();

interface Sound {
  id: string;
  name: string;
  emoji: string;
  icon: string;
}
type TimerMode = 'countdown' | 'countup';
type DurationOption = number | 'unlimited';
interface FocusCalendarDay {
  date: number | null;
  dateString: string;
  record: DailyFocusRecord | null;
  isToday: boolean;
}
interface FocusBackfillTimelineItem {
  id: string;
  sourceId: string;
  timeLabel: string;
  sortMinutes: number;
  title: string;
  meta: string;
}

const durationMarks = [5, 10, 15, 25, 30, 45, 60];
const durationOptions: DurationOption[] = [...durationMarks, 'unlimited'];
const shortBreakMarks = [1, 3, 5, 10, 15];
const pomodoroSetMarks = [1, 2, 3, 4, 5, 6, 7, 8];
const backfillDurationOptions = [15, 25, 45, 60];
const FOCUS_SESSION_EVENT = 'pinch-focus-session';

const soundOptions: Sound[] = [
  { id: 'none', name: t('focusTimer.soundNone'), emoji: '🔇', icon: 'soundOff' },
  { id: 'rain', name: t('focusTimer.soundRain'), emoji: '🌧️', icon: 'rain' },
  { id: 'jungle', name: t('focusTimer.soundForest'), emoji: '🌲', icon: 'jungle' },
  { id: 'waves', name: t('focusTimer.soundWaves'), emoji: '🌊', icon: 'waves' },
  { id: 'campfire', name: t('focusTimer.soundCampfire'), emoji: '🔥', icon: 'campfire' },
  { id: 'river', name: t('focusTimer.soundRiver'), emoji: '🏞️', icon: 'river' }
];

const audioFiles: Record<string, string> = {
  rain: 'rain.ogg',
  jungle: 'jungle.ogg',
  waves: 'waves.ogg',
  campfire: 'campfire.ogg',
  river: 'river.ogg'
};

const githubAudioFiles: Record<string, string> = {
  rain: 'https://gitee.com/royc01/pinch/raw/main/ogg/rain.ogg',
  jungle: 'https://gitee.com/royc01/pinch/raw/main/ogg/jungle.ogg',
  waves: 'https://gitee.com/royc01/pinch/raw/main/ogg/waves.ogg',
  campfire: 'https://gitee.com/royc01/pinch/raw/main/ogg/campfire.ogg',
  river: 'https://gitee.com/royc01/pinch/raw/main/ogg/river.ogg'
};

const selectedDuration = ref<number>(25);
const durationIndex = ref<number>(3);
const shortBreakDurationIndex = ref<number>(2);
const shortBreakDuration = ref<number>(5);
const pomodoroSets = ref<number>(1);
const timerMode = ref<TimerMode>('countdown');
const FOCUS_COUNTUP_AUTOSAVE_INTERVAL_MS = 60_000;
const selectedSound = ref<Sound>(soundOptions[0]);
const phaseElapsedSeconds = ref<number>(0);
const isRunning = ref<boolean>(false);
const isPaused = ref<boolean>(false);
const timerInterval = ref<number | null>(null);
const timerDeadline = ref<number>(0);
const timerStartedAt = ref<number>(0);
const audio = ref<HTMLAudioElement | null>(null);
const volume = ref<number>(0.3);
const currentSet = ref<number>(1);
const isBreakMode = ref<boolean>(false);
let audioContext: AudioContext | null = null;
const isDownloading = ref<boolean>(false);
const enableAudio = ref<boolean>(false);
const downloadProgress = ref<number>(0);
const targetPickerMode = ref<'habit' | 'task' | null>(null);
const targetSearch = ref('');
const isLoadingTargetOptions = ref(false);
const targetOptionsError = ref('');
const habitTargetOptions = ref<FocusTimerLinkedTarget[]>([]);
const taskTargetOptions = ref<FocusTimerLinkedTarget[]>([]);
const showExitConfirmPanel = ref(false);
const showBackfillDialog = ref(false);
const focusTimerPanelRef = ref<HTMLElement | null>(null);
const backfillOverlayStyle = ref<Record<string, string>>({});
const backfillDate = ref('');
const backfillDuration = ref(25);
const backfillEndTime = ref('');
const backfillError = ref('');
const isBackfillSaving = ref(false);
const deletingBackfillSessionId = ref('');
const backfillTarget = ref<FocusTimerLinkedTarget | null>(null);
const backfillTargetPickerMode = ref<'habit' | 'task' | null>(null);
const backfillTargetSearch = ref('');
const isBackfillLoadingTargetOptions = ref(false);
const backfillTargetOptionsError = ref('');

const stats = ref<FocusStatsSummary>({
  totalSessions: 0,
  totalMinutes: 0,
  todaySessions: 0,
  todayMinutes: 0,
  recentDays: []
});

const currentMonthOffset = ref<number>(0);
const monthlyRecords = ref<DailyFocusRecord[]>([]);
const focusSessionRecords = ref<FocusSessionRecord[]>([]);
const {
  isLockedByOther: isStartBlockedByOther,
  claimFocusSession,
  releaseFocusSession
} = useFocusSessionLock('panel');

const weekDayLabels = [
  t('taskRepeat.weekdayMonShort'),
  t('taskRepeat.weekdayTueShort'),
  t('taskRepeat.weekdayWedShort'),
  t('taskRepeat.weekdayThuShort'),
  t('taskRepeat.weekdayFriShort'),
  t('taskRepeat.weekdaySatShort'),
  t('taskRepeat.weekdaySunShort')
];

const currentMonth = computed(() => {
  const now = new Date();
  now.setMonth(now.getMonth() + currentMonthOffset.value);
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    monthName: `${now.getFullYear()}${t('date.yearMonthSeparator')}${now.getMonth() + 1}${t('date.monthSuffix')}`
  };
});

const daysInMonth = computed(() => {
  const { year, month } = currentMonth.value;
  return new Date(year, month + 1, 0).getDate();
});

const firstDayOfMonth = computed(() => {
  const { year, month } = currentMonth.value;
  return new Date(year, month, 1).getDay();
});

const calendarDays = computed<FocusCalendarDay[]>(() => {
  const days: FocusCalendarDay[] = [];
  const { year, month } = currentMonth.value;

  let firstDay = firstDayOfMonth.value;
  const totalDays = daysInMonth.value;

  const firstDayOfWeek = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ date: null, dateString: '', record: null, isToday: false });
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = monthlyRecords.value.find(r => r.date === dateStr);

    const today = new Date();
    const isToday = day === today.getDate() &&
                   month === today.getMonth() &&
                   year === today.getFullYear();

    days.push({
      date: day,
      dateString: dateStr,
      record: record || null,
      isToday
    });
  }

  return days;
});

const radius = 90;
const circumference = computed(() => 2 * Math.PI * radius);
const phaseDurationSeconds = computed(() =>
  (isBreakMode.value ? shortBreakDuration.value : selectedDuration.value) * 60
);
const timerModeLabel = computed(() => (timerMode.value === 'countdown' ? t('focusTimer.countdown') : t('focusTimer.countup')));
const focusDurationValueText = computed(() =>
  timerMode.value === 'countup' ? t('focusTimer.countup') : `${selectedDuration.value}${t('focusTimer.minuteSuffix')}`
);
const isTimerActive = computed(() =>
  isRunning.value || isPaused.value
);
const isPomodoroSettingsLocked = computed(() =>
  isTimerActive.value || timerMode.value === 'countup'
);
const backfillTargetLabel = computed(() => {
  if (!backfillTarget.value) {
    return t('focusTimer.backfillNoTarget', '无关联');
  }
  const targetType = backfillTarget.value.type === 'task' ? t('focusTimer.task') : t('focusTimer.habit');
  const targetName = backfillTarget.value.name;
  return `${targetType}${t('focusTimer.typeSeparator')}${targetName}`;
});
const isLinkedTargetLocked = computed(() => isRunning.value || isPaused.value);
const canOpenLinkedTarget = computed(() =>
  !!linkedTarget.value && (linkedTarget.value.type === 'habit' || !!linkedTarget.value.blockId)
);
const linkedTargetDisplayEmoji = computed(() => {
  if (linkedTarget.value?.emoji) {
    return linkedTarget.value.emoji;
  }
  return linkedTarget.value?.type === 'task' ? '✅' : '📝';
});
const linkedTargetDisplayLabel = computed(() => {
  if (!linkedTarget.value) {
    return '';
  }
  return `${linkedTarget.value.type === 'task' ? t('focusTimer.task') : t('focusTimer.habit')}：${linkedTarget.value.name}`;
});
const targetPickerTitle = computed(() =>
  targetPickerMode.value === 'habit' ? t('focusTimer.selectHabit') : t('focusTimer.selectTask')
);
const targetPickerPlaceholder = computed(() =>
  targetPickerMode.value === 'habit' ? t('focusTimer.searchHabit') : t('focusTimer.searchTask')
);
const targetPickerEmptyText = computed(() =>
  `${t('focusTimer.noLinkablePrefix')}${targetPickerMode.value === 'habit' ? t('focusTimer.habit') : t('focusTimer.task')}`
);
const filteredTargetOptions = computed(() => {
  const source = targetPickerMode.value === 'habit'
    ? habitTargetOptions.value
    : taskTargetOptions.value;
  return filterFocusTargetOptions(source, targetSearch.value);
});
const backfillTargetPickerTitle = computed(() =>
  backfillTargetPickerMode.value === 'habit' ? t('focusTimer.selectHabit') : t('focusTimer.selectTask')
);
const backfillTargetPickerPlaceholder = computed(() =>
  backfillTargetPickerMode.value === 'habit' ? t('focusTimer.searchHabit') : t('focusTimer.searchTask')
);
const backfillTargetPickerEmptyText = computed(() =>
  `${t('focusTimer.noLinkablePrefix')}${backfillTargetPickerMode.value === 'habit' ? t('focusTimer.habit') : t('focusTimer.task')}`
);
const filteredBackfillTargetOptions = computed(() => {
  const source = backfillTargetPickerMode.value === 'habit'
    ? habitTargetOptions.value
    : taskTargetOptions.value;
  return filterFocusTargetOptions(source, backfillTargetSearch.value);
});
const backfillFocusTimelineItems = computed<FocusBackfillTimelineItem[]>(() => {
  const selectedDate = backfillDate.value;
  if (!selectedDate) {
    return [];
  }

  return focusSessionRecords.value
    .filter(record => record.date === selectedDate)
    .map(record => focusRecordToLifelogEvent(record, t('focusTimer.title')))
    .filter((event): event is FocusLifelogEvent => Boolean(event))
    .map(focusEventToBackfillTimelineItem)
    .sort((left, right) => {
      if (left.sortMinutes !== right.sortMinutes) {
        return left.sortMinutes - right.sortMinutes;
      }
      return left.title.localeCompare(right.title, 'zh-Hans-CN');
    });
});

const strokeDashoffset = computed(() => {
  const totalTime = phaseDurationSeconds.value;
  if (!totalTime) {
    return circumference.value;
  }
  const elapsed = Math.min(Math.max(phaseElapsedSeconds.value, 0), totalTime);
  const progress = elapsed / totalTime;
  return circumference.value * (1 - progress);
});

const formattedTime = computed(() => {
  const totalSeconds = timerMode.value === 'countdown'
    ? Math.max(phaseDurationSeconds.value - phaseElapsedSeconds.value, 0)
    : Math.max(phaseElapsedSeconds.value, 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

const currentModeLabel = computed(() => {
  if (timerMode.value === 'countup' && !isBreakMode.value) {
    if (isPaused.value) {
      return t('focusTimer.countupPaused');
    }
    if (isRunning.value) {
      return t('focusTimer.countupRunningManualStop');
    }
    return t('focusTimer.ready');
  }

  if (isPaused.value) {
    return isBreakMode.value
      ? `${timerModeLabel.value}${t('focusTimer.shortBreakPausedSuffix')}`
      : `${timerModeLabel.value}${t('focusTimer.pausedSuffix')}`;
  }
  if (isRunning.value) {
    if (isBreakMode.value) {
      return `${timerModeLabel.value}${t('focusTimer.shortBreakRunningSuffix')}`;
    }
    return `${timerModeLabel.value}${t('focusTimer.focusSetPrefix')} (${currentSet.value}/${pomodoroSets.value})`;
  }
  return t('focusTimer.ready');
});

const clearTimer = () => {
  if (timerInterval.value !== null) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
  timerDeadline.value = 0;
  timerStartedAt.value = 0;
};

const resetPhaseProgress = () => {
  phaseElapsedSeconds.value = 0;
  timerStartedAt.value = 0;
};

const closeTargetPicker = () => {
  targetPickerMode.value = null;
  targetSearch.value = '';
  targetOptionsError.value = '';
};

function closeBackfillTargetPicker(): void {
  backfillTargetPickerMode.value = null;
  backfillTargetSearch.value = '';
  backfillTargetOptionsError.value = '';
}

const loadHabitTargetOptions = async () => {
  const habits = await getHabits();
  habitTargetOptions.value = habits
    .filter(habit => !habit.isPaused)
    .map(habit => createHabitFocusTarget(habit));
};

const loadTaskTargetOptions = async () => {
  let tasks = await TaskRepository.getCachedTasksOnly();

  if (tasks.length === 0) {
    tasks = await TaskRepository.getAllTasks(false, undefined, { useLiveDom: false });
  }

  taskTargetOptions.value = tasks
    .filter(task => task.archived !== true && task.status !== 'completed' && task.status !== 'cancelled' && !!task.blockId)
    .sort((left, right) => {
      const leftPinned = left.pinned === true ? 1 : 0;
      const rightPinned = right.pinned === true ? 1 : 0;
      if (leftPinned !== rightPinned) {
        return rightPinned - leftPinned;
      }
      return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
    })
    .map(task => createTaskFocusTarget(task));
};

const openTargetPicker = async (mode: 'habit' | 'task') => {
  if (isLinkedTargetLocked.value) {
    return;
  }

  targetPickerMode.value = mode;
  targetSearch.value = '';
  targetOptionsError.value = '';
  isLoadingTargetOptions.value = true;

  try {
    if (mode === 'habit') {
      await loadHabitTargetOptions();
    } else {
      await loadTaskTargetOptions();
    }
  } catch (error) {
    targetOptionsError.value = `${t('focusTimer.loadTargetFailedPrefix')}${mode === 'habit' ? t('focusTimer.habit') : t('focusTimer.task')}${t('focusTimer.loadTargetFailedSuffix')}`;
  } finally {
    isLoadingTargetOptions.value = false;
  }
};

async function openBackfillTargetPicker(mode: 'habit' | 'task'): Promise<void> {
  backfillTargetPickerMode.value = mode;
  backfillTargetSearch.value = '';
  backfillTargetOptionsError.value = '';
  isBackfillLoadingTargetOptions.value = true;

  try {
    if (mode === 'habit') {
      await loadHabitTargetOptions();
    } else {
      await loadTaskTargetOptions();
    }
  } catch (error) {
    backfillTargetOptionsError.value = `${t('focusTimer.loadTargetFailedPrefix')}${mode === 'habit' ? t('focusTimer.habit') : t('focusTimer.task')}${t('focusTimer.loadTargetFailedSuffix')}`;
  } finally {
    isBackfillLoadingTargetOptions.value = false;
  }
}

const selectLinkedTarget = (target: FocusTimerLinkedTarget) => {
  if (isLinkedTargetLocked.value) {
    return;
  }
  emit('update-linked-target', target);
  closeTargetPicker();
};

function selectBackfillTarget(target: FocusTimerLinkedTarget): void {
  backfillTarget.value = target;
  closeBackfillTargetPicker();
}

function clearBackfillTarget(): void {
  backfillTarget.value = null;
  closeBackfillTargetPicker();
}

const clearLinkedTarget = () => {
  if (isLinkedTargetLocked.value) {
    return;
  }
  emit('update-linked-target', null);
  emit('clear-linked-target');
  closeTargetPicker();
};

const openLinkedTarget = () => {
  if (!linkedTarget.value || !canOpenLinkedTarget.value) {
    return;
  }
  emit('open-linked-target', linkedTarget.value);
};

const getTargetEmoji = (target: FocusTimerLinkedTarget) => {
  if (target.emoji) {
    return target.emoji;
  }
  return target.type === 'task' ? '✅' : '📝';
};

const updateDurationByIndex = () => {
  if (isTimerActive.value) return;
  const option = durationOptions[durationIndex.value];
  if (option === 'unlimited') {
    timerMode.value = 'countup';
  } else {
    timerMode.value = 'countdown';
    selectedDuration.value = option;
  }
  resetPhaseProgress();
};

const updateShortBreakDuration = () => {
  if (isPomodoroSettingsLocked.value) return;
  shortBreakDuration.value = shortBreakMarks[shortBreakDurationIndex.value];
};

const updatePomodoroSets = () => {
  if (isPomodoroSettingsLocked.value) return;
  pomodoroSets.value = Math.max(
    1,
    Math.min(Math.round(pomodoroSets.value), pomodoroSetMarks[pomodoroSetMarks.length - 1])
  );
};

const handleAudioToggle = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const checked = target.checked;
  
  if (checked && !isDownloading.value) {
    enableAudio.value = true;
    void persistWhiteNoiseSettings();
    await downloadAudioFiles();
  } else if (!checked) {
    enableAudio.value = false;
    void persistWhiteNoiseSettings();
  }
};

const selectSound = (sound: Sound) => {
  selectedSound.value = sound;
  void persistWhiteNoiseSettings();
  
  if (sound.id === 'none') {
    stopAudio();
  } else if (isRunning.value) {
    playAudio();
  }
};

const playAudio = async () => {
  if (selectedSound.value.id === 'none') return;

  if (audio.value && !audio.value.paused) {
    stopAudio();
  }

  const fileName = selectedSound.value.id === 'custom'
    ? userSettings.focus.customWhiteNoiseFile
    : audioFiles[selectedSound.value.id];
  const source = await getStoredFocusAudioUrl(fileName);
  if (!source) return;
  audio.value = new Audio(source);
  audio.value.loop = true;
  audio.value.volume = selectedSound.value.id === 'custom'
    ? (userSettings.focus.customWhiteNoiseVolume ?? 0.3)
    : volume.value;

  audio.value.play().catch(() => {});
};

const updateVolume = () => {
  if (audio.value) {
    audio.value.volume = volume.value;
  }
  void persistWhiteNoiseSettings();
};

const persistWhiteNoiseSettings = async () => {
  const settings = {
    whiteNoiseEnabled: enableAudio.value,
    selectedWhiteNoiseId: selectedSound.value.id,
    whiteNoiseVolume: volume.value
  };
  await updateSettings('focus', settings);
  window.dispatchEvent(new CustomEvent('pinch-focus-settings-updated', { detail: settings }));
};

const downloadAudioFiles = async () => {
  if (isDownloading.value) return;
  isDownloading.value = true;
  downloadProgress.value = 0;

  try {
    const soundIds = ['rain', 'jungle', 'waves', 'campfire', 'river'];
    const total = soundIds.length;
    let downloadedCount = 0;

    const dirResult = await readDir('/data/storage/petal/pinch/audio');
    const existingFiles = Array.isArray(dirResult) ? dirResult.map((f: any) => f.name) : [];

    for (let i = 0; i < total; i++) {
      const soundId = soundIds[i];
      const fileName = `${soundId}.ogg`;
      const localPath = `/data/storage/petal/pinch/audio/${fileName}`;

      if (existingFiles.includes(fileName)) {
        downloadedCount++;
        downloadProgress.value = Math.round((downloadedCount / total) * 100);
        continue;
      }

      const githubUrl = githubAudioFiles[soundId];

      const response = await fetch(githubUrl);
      if (!response.ok) continue;

      const blob = await response.blob();

      const file = new File([blob], fileName, { type: 'audio/ogg' });

      await putFile(localPath, false, file);

      downloadedCount++;
      downloadProgress.value = Math.round((downloadedCount / total) * 100);
    }
  } catch (err) {
    console.error('[FocusTimer] Audio download failed:', err);
  } finally {
    isDownloading.value = false;
  }
};

const stopAudio = () => {
  if (audio.value) {
    audio.value.pause();
    audio.value.currentTime = 0;
    audio.value = null;
  }
};

const initAudioContext = async () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
};

const showNotification = (title: string, body: string, icon: string) => {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  }
};

const {
  isMicroBreakVisible,
  remainingMicroBreakSeconds,
  startMicroBreakReminder,
  stopMicroBreakReminder,
  cancelMicroBreak
} = useMicroBreakReminder({
  settings: computed(() => userSettings.focus),
  notify: (title, body) => showNotification(title, body, '☕'),
  playSound: () => {
    void playCustomFocusAudio(userSettings.focus.customMicroBreakSoundFile, userSettings.focus.customMicroBreakSoundVolume ?? 0.3)
      .then(played => { if (!played) playTaskCompletionSound(0.3); });
  },
  getText: (key) => ({
    startTitle: t('focusTimer.microBreakStartTitle'),
    startBody: t('focusTimer.microBreakStartBody'),
    endTitle: t('focusTimer.microBreakEndTitle'),
    endBody: t('focusTimer.microBreakEndBody')
  })[key]
});

let panelOwnsDetachedMicroBreakWindow = false;
let unsubscribeDetachedMicroBreakCancel: (() => void) | null = null;

watch(isMicroBreakVisible, (visible) => {
  if (!visible) {
    if (panelOwnsDetachedMicroBreakWindow) {
      hideDetachedMicroBreakWindow();
      panelOwnsDetachedMicroBreakWindow = false;
    }
    return;
  }

  void nextTick(async () => {
    if (!isMicroBreakVisible.value) {
      return;
    }

    const opened = await showDetachedMicroBreakWindow(remainingMicroBreakSeconds.value);
    if (!opened) {
      return;
    }

    if (!isMicroBreakVisible.value) {
      hideDetachedMicroBreakWindow();
      return;
    }

    panelOwnsDetachedMicroBreakWindow = true;
  });
});

function showShortBreakPopup(): void {
  if (userSettings.focus.shortBreakPopup !== true) {
    return;
  }

  void nextTick(() => {
    void showDetachedMicroBreakWindow(Math.max(1, Math.round(shortBreakDuration.value * 60)), {
      title: t('focusTimer.shortBreakActiveTitle'),
      body: t('focusTimer.shortBreakActiveBody'),
      variant: 'short-break'
    });
  });
}

function showFocusCompletePopup(): void {
  if (userSettings.focus.focusCompletePopup !== true) {
    return;
  }

  void nextTick(() => {
    void showDetachedMicroBreakWindow(10, {
      title: t('focusTimer.focusCompletePopupTitle'),
      body: t('focusTimer.focusCompletePopupBody'),
      variant: 'focus-complete'
    });
  });
}

function timeToSortMinutes(time: string, fallback: number): number {
  const match = typeof time === 'string' ? time.match(/^(\d{2}):(\d{2})$/) : null;
  if (!match) {
    return fallback;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return fallback;
  }
  return hour * 60 + minute;
}

function formatBackfillFocusTarget(event: FocusLifelogEvent): string {
  if (event.targetType === 'habit') {
    return t('focusTimer.habit');
  }
  if (event.targetType === 'task') {
    return t('focusTimer.task');
  }
  return t('focusTimer.backfillNoTarget', '无关联');
}

function focusEventToBackfillTimelineItem(event: FocusLifelogEvent): FocusBackfillTimelineItem {
  return {
    id: `focus-${event.id}`,
    sourceId: event.id,
    timeLabel: `${event.startTime} - ${event.endTime}`,
    sortMinutes: timeToSortMinutes(event.startTime, 8 * 60),
    title: event.title,
    meta: `${t('focusTimer.title')} · ${formatTimeShort(event.minutes)} · ${formatBackfillFocusTarget(event)}`
  };
}

function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getDefaultBackfillEndTime(dateString: string): string {
  const now = new Date();
  if (dateString === getLocalDateKey(now)) {
    return getTimeInputValue(now);
  }
  return '20:00';
}

function parseBackfillTimestamp(dateString: string, timeString: string): number {
  const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeString.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) {
    return Number.NaN;
  }
  const [, year, month, day] = dateMatch;
  const [, hour, minute] = timeMatch;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
  return date.getTime();
}

function syncBackfillOverlayBounds(): void {
  const panel = focusTimerPanelRef.value;
  if (!panel) {
    backfillOverlayStyle.value = {};
    return;
  }

  const rect = panel.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || rect.width;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || rect.height;
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(viewportWidth, rect.right);
  const bottom = Math.min(viewportHeight, rect.bottom);

  backfillOverlayStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${Math.max(0, right - left)}px`,
    height: `${Math.max(0, bottom - top)}px`
  };
}

function handleBackfillViewportResize(): void {
  if (showBackfillDialog.value) {
    syncBackfillOverlayBounds();
  }
}

function openBackfillDialog(day: FocusCalendarDay): void {
  if (!day.dateString) {
    return;
  }
  syncBackfillOverlayBounds();
  backfillDate.value = day.dateString;
  backfillDuration.value = typeof selectedDuration.value === 'number' && Number.isFinite(selectedDuration.value)
    ? selectedDuration.value
    : 25;
  backfillEndTime.value = getDefaultBackfillEndTime(day.dateString);
  backfillError.value = '';
  backfillTarget.value = linkedTarget.value ? { ...linkedTarget.value } : null;
  closeBackfillTargetPicker();
  showBackfillDialog.value = true;
  void loadFocusSessionRecords();
  void nextTick(syncBackfillOverlayBounds);
}

function closeBackfillDialog(): void {
  if (isBackfillSaving.value) {
    return;
  }
  showBackfillDialog.value = false;
  backfillOverlayStyle.value = {};
  backfillError.value = '';
  closeBackfillTargetPicker();
}

async function deleteBackfillFocusSession(sessionId: string): Promise<void> {
  const normalizedSessionId = typeof sessionId === 'string' ? sessionId.trim() : '';
  if (!normalizedSessionId || deletingBackfillSessionId.value) {
    return;
  }

  deletingBackfillSessionId.value = normalizedSessionId;
  backfillError.value = '';

  try {
    const deleted = await deleteFocusSessionRecord(normalizedSessionId);
    if (!deleted) {
      return;
    }
    focusSessionRecords.value = focusSessionRecords.value.filter(record => record.id !== normalizedSessionId);
    await loadStats();
    await loadMonthlyRecords();
    window.dispatchEvent(new CustomEvent(FOCUS_SESSION_EVENT, {
      detail: { sessionId: normalizedSessionId, date: backfillDate.value, deleted: true }
    }));
  } catch (error) {
    backfillError.value = t('focusTimer.backfillDeleteFailed', '删除失败，请稍后重试');
  } finally {
    deletingBackfillSessionId.value = '';
  }
}

async function saveBackfillSession(): Promise<void> {
  const minutes = Math.max(0, Math.floor(Number(backfillDuration.value) || 0));
  if (!backfillDate.value || minutes <= 0) {
    backfillError.value = t('focusTimer.backfillInvalidDuration', '请输入有效的专注时长');
    return;
  }

  const timestamp = parseBackfillTimestamp(backfillDate.value, backfillEndTime.value);
  if (!Number.isFinite(timestamp)) {
    backfillError.value = t('focusTimer.backfillInvalidTime', '请选择有效的结束时间');
    return;
  }

  const sessionId = `focus-backfill-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
  isBackfillSaving.value = true;
  backfillError.value = '';
  try {
    const targetInput = toFocusSessionTargetInput(backfillTarget.value);
    await addFocusSession(minutes, targetInput, {
      date: backfillDate.value,
      timestamp,
      sessionId
    });
    await awardFocusSession({
      minutes,
      sessionId,
      source: 'panel'
    }).catch(() => {});
    await loadStats();
    await loadMonthlyRecords();
    await loadFocusSessionRecords();
    window.dispatchEvent(new CustomEvent(FOCUS_SESSION_EVENT, {
      detail: { minutes, sessionId, date: backfillDate.value, backfilled: true }
    }));
    showBackfillDialog.value = false;
    backfillOverlayStyle.value = {};
  } catch (error) {
    backfillError.value = t('focusTimer.backfillSaveFailed', '补录失败，请稍后重试');
  } finally {
    isBackfillSaving.value = false;
  }
}

const persistFocusSession = async (minutes: number) => {
  const sessionId = `focus-panel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await addFocusSession(
    minutes,
    toFocusSessionTargetInput(linkedTarget.value),
    { sessionId }
  );
  await awardFocusSession({
    minutes,
    sessionId,
    source: 'panel'
  }).catch(() => {});
  window.dispatchEvent(new CustomEvent(FOCUS_SESSION_EVENT, {
    detail: { minutes, sessionId }
  }));
  requestCheckinNote({
    date: getLocalCheckinNoteDate(),
    eventKey: `focus:${sessionId}`,
    context: {
      type: 'focus',
      sourceId: sessionId,
      occurredAt: new Date().toISOString(),
      title: linkedTargetDisplayLabel.value || t('focusTimer.title'),
      meta: `${Math.max(0, Math.round(minutes))}${t('focusTimer.minuteSuffix')}`
    }
  });
};

function getFocusSessionTargetInput() {
  return toFocusSessionTargetInput(linkedTarget.value);
}

const {
  sessionId: countupSessionId,
  savedMinutes: savedCountupMinutes,
  getElapsedFocusMinutes,
  reset: resetCountupCheckpointState,
  save: saveCountupCheckpoint
} = useFocusCountupCheckpoint({
  isEnabled: () => timerMode.value === 'countup' && !isBreakMode.value,
  getElapsedSeconds: () => phaseElapsedSeconds.value,
  getTarget: getFocusSessionTargetInput,
  createSessionId: () => `focus-panel-countup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  upsertSession: upsertFocusSessionRecord,
  onSaved: (detail) => {
    window.dispatchEvent(new CustomEvent(FOCUS_SESSION_EVENT, { detail }));
    if (!detail.checkpoint) {
      requestCheckinNote({
        date: getLocalCheckinNoteDate(),
        eventKey: `focus:${detail.sessionId}`,
        context: {
          type: 'focus',
          sourceId: detail.sessionId,
          occurredAt: new Date().toISOString(),
          title: linkedTargetDisplayLabel.value || t('focusTimer.title'),
          meta: `${Math.max(0, Math.round(detail.minutes || 0))}${t('focusTimer.minuteSuffix')}`
        }
      });
    }
  }
});

const startPhaseTimer = () => {
  if (timerMode.value === 'countup' && !isBreakMode.value) {
    const startedAt = Date.now() - phaseElapsedSeconds.value * 1000;
    timerStartedAt.value = startedAt;
    let lastAutosavedMinute = savedCountupMinutes.value;
    let lastAutosaveCheckAt = Date.now();

    timerInterval.value = window.setInterval(() => {
      if (!isRunning.value || timerStartedAt.value !== startedAt) {
        return;
      }
      phaseElapsedSeconds.value = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000)
      );
      const elapsedMinutes = getElapsedFocusMinutes();
      const now = Date.now();
      if (
        now - lastAutosaveCheckAt >= FOCUS_COUNTUP_AUTOSAVE_INTERVAL_MS
        && elapsedMinutes > lastAutosavedMinute
        && elapsedMinutes > savedCountupMinutes.value
      ) {
        lastAutosaveCheckAt = now;
        lastAutosavedMinute = elapsedMinutes;
        void saveCountupCheckpoint(false);
      }
    }, 100);
    return;
  }

  const totalSeconds = phaseDurationSeconds.value;
  const remainingSeconds = Math.max(totalSeconds - phaseElapsedSeconds.value, 0);

  if (remainingSeconds <= 0) {
    phaseElapsedSeconds.value = totalSeconds;
    void completeTimer();
    return;
  }

  const deadline = Date.now() + remainingSeconds * 1000;
  timerDeadline.value = deadline;

  timerInterval.value = window.setInterval(() => {
    if (!isRunning.value || timerDeadline.value !== deadline) {
      return;
    }
    const now = Date.now();
    const timeLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
    const elapsed = totalSeconds - timeLeft;

    if (timeLeft <= 0) {
      phaseElapsedSeconds.value = totalSeconds;
      clearTimer();
      void completeTimer();
    } else {
      phaseElapsedSeconds.value = Math.min(elapsed, totalSeconds);
    }
  }, 100);
};

const playCompleteSound = async () => {
  if (await playCustomFocusAudio(userSettings.focus.customCompletionSoundFile, userSettings.focus.customCompletionSoundVolume ?? 0.3)) return;
  try {
    await initAudioContext();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = audioContext!.createOscillator();
      const gainNode = audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext!.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;
    playTone(523.25, now, 0.2);
    playTone(659.25, now + 0.15, 0.2);
    playTone(783.99, now + 0.3, 0.3);
  } catch {
    // Ignore unavailable Web Audio environments.
  }
};

const startTimer = () => {
  if (!claimFocusSession()) {
    return;
  }

  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }

  currentSet.value = 1;
  isBreakMode.value = false;
  resetPhaseProgress();
  resetCountupCheckpointState();
  isRunning.value = true;
  isPaused.value = false;

  if (!audio.value || audio.value.paused) {
    playAudio();
  }

  initAudioContext().catch(() => {});
  prepareTaskCompletionSound();
  void prepareCustomFocusAudio(userSettings.focus.customCompletionSoundFile);
  void prepareCustomFocusAudio(userSettings.focus.customMicroBreakSoundFile);

  startMicroBreakReminder();
  startPhaseTimer();
};

const pauseTimer = () => {
  isRunning.value = false;
  isPaused.value = true;
  void saveCountupCheckpoint(false);
  clearTimer();
  stopMicroBreakReminder();
};

const resumeTimer = () => {
  if (!isPaused.value) return;

  isRunning.value = true;
  isPaused.value = false;
  prepareTaskCompletionSound();
  void prepareCustomFocusAudio(userSettings.focus.customCompletionSoundFile);
  void prepareCustomFocusAudio(userSettings.focus.customMicroBreakSoundFile);

  startMicroBreakReminder();
  startPhaseTimer();
};

const stopTimer = async (recordCurrentSession: boolean = false) => {
  const elapsedMinutes = recordCurrentSession ? getElapsedFocusMinutes() : 0;
  const countupSessionIdToAward = countupSessionId.value;

  isRunning.value = false;
  isPaused.value = false;
  isBreakMode.value = false;
  currentSet.value = 1;
  resetPhaseProgress();
  releaseFocusSession();
  
  stopAudio();
  clearTimer();
  stopMicroBreakReminder();

  if (elapsedMinutes > 0) {
    if (timerMode.value === 'countup') {
      await saveCountupCheckpoint(true, elapsedMinutes);
      if (countupSessionIdToAward || countupSessionId.value) {
        await awardFocusSession({
          minutes: elapsedMinutes,
          sessionId: countupSessionIdToAward || countupSessionId.value,
          source: 'panel'
        }).catch(() => {});
      }
      resetCountupCheckpointState();
    } else {
      await persistFocusSession(elapsedMinutes);
    }
  } else {
    resetCountupCheckpointState();
  }
};

const completeTimer = async () => {
  stopMicroBreakReminder();
  if (!isBreakMode.value) {
    await persistFocusSession(selectedDuration.value);
    if (linkedTarget.value) {
      emit('complete-linked-target', linkedTarget.value);
    }

    stats.value.totalSessions++;
    stats.value.totalMinutes += selectedDuration.value;
    stats.value.todaySessions++;
    stats.value.todayMinutes += selectedDuration.value;

    showNotification(t('focusTimer.focusCompleteTitle'), `${selectedDuration.value}${t('focusTimer.focusCompleteBodySuffix')}`, '🎉');
    playCompleteSound();

    await loadMonthlyRecords();

    if (currentSet.value < pomodoroSets.value && pomodoroSets.value >= 2) {
      clearTimer();
      isBreakMode.value = true;
      resetPhaseProgress();
      currentSet.value++;
      showShortBreakPopup();
      startPhaseTimer();
      return;
    }
  } else {
    playCompleteSound();
    showNotification(t('focusTimer.breakFinishedTitle'), `${t('focusTimer.breakFinishedBodyPrefix')} ${currentSet.value} ${t('focusTimer.breakFinishedBodySuffix')}`, '☕');

    clearTimer();
    isBreakMode.value = false;
    resetPhaseProgress();
    startMicroBreakReminder();
    startPhaseTimer();
    return;
  }

  await stopTimer();
  showFocusCompletePopup();
};

const formatTotalTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}<span class="time-unit">m</span>`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}<span class="time-unit">h</span>${mins}<span class="time-unit">m</span>` : `${hours}<span class="time-unit">h</span>`;
};

const formatTimeShort = (minutes: number): string => {
  if (minutes === 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

const loadStats = async () => {
  try {
    const summary = await getFocusStatsSummary();
    stats.value = summary;
  } catch (error) {
  }
};

const loadMonthlyRecords = async () => {
  try {
    const { year, month } = currentMonth.value;
    const records = await getMonthlyRecords(year, month);
    monthlyRecords.value = records;
  } catch (error) {
  }
};

const loadFocusSessionRecords = async () => {
  try {
    const data = await getFocusTimerData();
    focusSessionRecords.value = data.sessionRecords;
  } catch (error) {
  }
};

const handleExternalFocusSession = () => {
  void loadStats();
  void loadMonthlyRecords();
  void loadFocusSessionRecords();
};

const changeMonth = (offset: number) => {
  currentMonthOffset.value += offset;
  loadMonthlyRecords();
};

const buildHandoffState = (): FocusTimerHandoffState => ({
  timerMode: timerMode.value,
  selectedDuration: selectedDuration.value,
  durationIndex: durationIndex.value,
  shortBreakDuration: shortBreakDuration.value,
  shortBreakDurationIndex: shortBreakDurationIndex.value,
  pomodoroSets: pomodoroSets.value,
  phaseElapsedSeconds: phaseElapsedSeconds.value,
  isRunning: isRunning.value,
  isPaused: isPaused.value,
  isBreakMode: isBreakMode.value,
  currentSet: currentSet.value,
  countupSessionId: countupSessionId.value,
  savedCountupMinutes: savedCountupMinutes.value,
  whiteNoiseEnabled: enableAudio.value,
  selectedWhiteNoiseId: selectedSound.value.id,
  whiteNoiseVolume: volume.value,
  microBreakSettings: { ...userSettings.focus },
  linkedTarget: linkedTarget.value ?? null
});

const resetPanelTimerAfterHandoff = () => {
  isRunning.value = false;
  isPaused.value = false;
  isBreakMode.value = false;
  currentSet.value = 1;
  resetPhaseProgress();
  resetCountupCheckpointState();
};

const handoffToMiniAndClose = () => {
  const handoffState = buildHandoffState();
  clearTimer();
  stopMicroBreakReminder();
  stopAudio();
  releaseFocusSession();
  emit('update:miniEnabled', true);
  emit('handoffToMini', handoffState);
  resetPanelTimerAfterHandoff();
  showExitConfirmPanel.value = false;
  emit('close');
};

const cancelExitConfirm = () => {
  showExitConfirmPanel.value = false;
};

const confirmStopAndClose = async () => {
  showExitConfirmPanel.value = false;
  await stopTimer(true);
  emit('close');
};

const openMiniAndContinue = () => {
  handoffToMiniAndClose();
};

const handleClose = async () => {
  if (isRunning.value || isPaused.value) {
    if (miniEnabled.value) {
      handoffToMiniAndClose();
      return;
    }

    showExitConfirmPanel.value = true;
  } else {
    emit('close');
  }
};

onUnmounted(() => {
  if (panelOwnsDetachedMicroBreakWindow) {
    hideDetachedMicroBreakWindow();
    panelOwnsDetachedMicroBreakWindow = false;
  }
  unsubscribeDetachedMicroBreakCancel?.();
  unsubscribeDetachedMicroBreakCancel = null;
  clearTimer();
  stopAudio();
  releaseFocusSession();
  void saveCountupCheckpoint(false);
  window.removeEventListener(FOCUS_SESSION_EVENT, handleExternalFocusSession);
  window.removeEventListener('resize', handleBackfillViewportResize);
});

onMounted(async () => {
  unsubscribeDetachedMicroBreakCancel = subscribeDetachedMicroBreakCancel(() => {
    cancelMicroBreak();
  });

  try {
    await loadSettings();
    enableAudio.value = userSettings.focus.whiteNoiseEnabled === true;
    const storedSound = userSettings.focus.selectedWhiteNoiseId;
    if (typeof storedSound === 'string') {
      selectedSound.value = soundOptions.find(sound => sound.id === storedSound)
        ?? (storedSound === 'custom' ? { id: 'custom', name: t('taskScopeDialog.customWhiteNoise'), emoji: '🎵', icon: 'soundOff' } : soundOptions[0]);
    }
    if (Number.isFinite(userSettings.focus.whiteNoiseVolume)) {
      volume.value = Math.max(0, Math.min(userSettings.focus.whiteNoiseVolume!, 1));
    }
    window.addEventListener(FOCUS_SESSION_EVENT, handleExternalFocusSession);
    window.addEventListener('resize', handleBackfillViewportResize);
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
      }
    }

    await loadStats();
    await loadMonthlyRecords();
    await loadFocusSessionRecords();

    const dirResult = await readDir('/data/storage/petal/pinch/audio');
    const existingFiles = Array.isArray(dirResult) ? dirResult.map((f: any) => f.name) : [];

    const soundIds = ['rain', 'jungle', 'waves', 'campfire', 'river'];
    const allFilesExist = soundIds.every(id => existingFiles.includes(`${id}.ogg`));

    if (allFilesExist) {
      enableAudio.value = true;
    }
  } catch (e) {
  }
});

watch(linkedTarget, (nextTarget) => {
  if (!nextTarget || isRunning.value || isPaused.value) {
    return;
  }

  isBreakMode.value = false;
  currentSet.value = 1;
  resetPhaseProgress();

  if (typeof nextTarget.preferredDuration === 'number' && Number.isFinite(nextTarget.preferredDuration)) {
    const duration = nextTarget.preferredDuration;
    const nextIndex = durationMarks.indexOf(duration);
    timerMode.value = 'countdown';
    selectedDuration.value = duration;
    durationIndex.value = nextIndex >= 0 ? nextIndex : 3;
  }
}, { immediate: true });

watch(
  () => [
    userSettings.focus.whiteNoiseEnabled,
    userSettings.focus.selectedWhiteNoiseId,
    userSettings.focus.whiteNoiseVolume
  ] as const,
  ([enabled, soundId, savedVolume]) => {
    enableAudio.value = enabled === true;
    if (typeof soundId === 'string') {
      selectedSound.value = soundOptions.find(sound => sound.id === soundId)
        ?? (soundId === 'custom' ? { id: 'custom', name: t('taskScopeDialog.customWhiteNoise'), emoji: '🎵', icon: 'soundOff' } : soundOptions[0]);
    }
    if (Number.isFinite(savedVolume)) {
      volume.value = Math.max(0, Math.min(savedVolume!, 1));
      if (audio.value) audio.value.volume = volume.value;
    }
  }
);

watch(() => props.show, (visible) => {
  if (!visible) {
    closeTargetPicker();
    showBackfillDialog.value = false;
    backfillOverlayStyle.value = {};
  }
});

watch(isLinkedTargetLocked, (locked) => {
  if (locked) {
    closeTargetPicker();
  }
});
</script>

<style scoped>
.focus-timer-panel {
  position: absolute;
  inset: 0;
  z-index: 2;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  padding: 10px;
  flex-direction: column;
  background-color: var(--b3-theme-background);
  
  -ms-overflow-style: none;
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
}

.timer-header {
  display: flex;
  flex-direction: column;
  padding-bottom: 10px;
}

.stats-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.stats-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mini-focus-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.mini-focus-label {
  white-space: nowrap;
}

.stats-title {
  display: flex;
  align-items: center;
  min-width: 0;
}

.timer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin: 0 auto;
}

.focus-exit-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.32);
  box-sizing: border-box;
}

.focus-exit-dialog {
  width: min(360px, 100%);
  padding: 16px;
  border-radius: 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  box-shadow: var(--b3-dialog-shadow);
  border: 1px solid var(--b3-border-color);
  box-sizing: border-box;
}

.focus-exit-dialog__title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
}

.focus-exit-dialog__message {
  white-space: pre-line;
  line-height: 1.6;
  font-size: 13px;
  color: var(--b3-theme-on-surface);
}

.focus-exit-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.focus-exit-dialog__btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  background: var(--b3-theme-surface);
  color: var(--b3-theme-on-background);
  font-size: 13px;
  cursor: pointer;
}

.focus-exit-dialog__btn:hover {
  background: var(--b3-list-hover);
}

.focus-exit-dialog__btn.is-danger {
  color: var(--b3-theme-error);
  border-color: color-mix(in srgb, var(--b3-theme-error) 35%, var(--b3-border-color));
}

.focus-exit-dialog__btn.is-primary {
  border-color: var(--b3-theme-primary);
  background: var(--b3-theme-primary);
  color: var(--b3-theme-on-primary);
}

.linked-habit-banner {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
  max-width: 420px;
  padding: 8px;
  border-radius: 14px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  box-sizing: border-box;
  box-shadow: var(--b3-border-color) 0 0 0 .5px;
}

.linked-habit-banner__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.linked-habit-banner__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  align-self: center;
}

.linked-habit-banner__label {
  flex: 0 0 auto;
  font-size: 14px;
  font-weight: 600;
  color: var(--b3-theme-on-surface);
  margin-left: 8px;
}

.linked-habit-banner__chip-row,
.linked-habit-banner__empty {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
}

.linked-habit-banner__chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
}

.linked-habit-banner__chip:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.85);
  transform: translateY(-1px);
}

.linked-habit-banner__chip:disabled {
  cursor: default;
  opacity: 0.85;
}

.linked-habit-banner__emoji {
  flex: 0 0 auto;
  font-size: 14px;
}

.linked-habit-banner__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
}

.linked-habit-banner__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.linked-habit-banner__action,
.linked-habit-banner__picker-item,
.linked-habit-banner__picker-close {
  border: none;
  font: inherit;
}

.linked-habit-banner__action {
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
}

.linked-habit-banner__action:hover:not(:disabled) {
  transform: translateY(-1px);
}

.linked-habit-banner__action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.linked-habit-banner__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
}

.linked-habit-banner__clear:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.8);
}

.linked-habit-banner__clear:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.linked-habit-banner__picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px;
  border-radius: 12px;
  background: var(--b3-list-hover);
}

.linked-habit-banner__picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.linked-habit-banner__picker-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
}

.linked-habit-banner__picker-close:hover {
  background: rgba(255, 255, 255, 0.88);
}

.linked-habit-banner__search {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--b3-theme-on-background);
  box-sizing: border-box;
}

.linked-habit-banner__search:focus {
  outline: none;
  border-color: rgba(249, 143, 122, 0.9);
  box-shadow: 0 0 0 3px rgba(249, 143, 122, 0.18);
}

.linked-habit-banner__picker-state {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  line-height: 1.5;
  color: var(--b3-theme-on-surface);
}

.linked-habit-banner__picker-state.is-error {
  color: #d04a36;
}

.linked-habit-banner__picker-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 216px;
  overflow-y: auto;
}

.linked-habit-banner__picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.linked-habit-banner__picker-item:hover {
  background: var(--b3-theme-background);
  transform: translateY(-1px);
}

.linked-habit-banner__picker-item-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.linked-habit-banner__picker-item-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
}

.linked-habit-banner__picker-item-meta {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.timer-display {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0;
}

.timer-circle {
  position: relative;
  width: 200px;
  height: 200px;
}

.timer-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.timer-bg {
  fill: none;
  stroke: var(--b3-list-hover);
  stroke-width: 14;
}

.timer-progress {
  fill: none;
  stroke: #ffcb4c;
  stroke-width: 14;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}

.timer-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.time {
  font-size: 48px;
  font-weight: bold;
  color: var(--b3-theme-on-background);
}

.mode-label {
  font-size: 14px;
  color: var(--b3-theme-on-surface);
}

.timer-controls {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;
  justify-content: center;
  color: var(--b3-theme-background);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    transform: none;
    box-shadow: none;
  }
}

.start-btn {
  background: #f98f7a;
}

.pause-btn {
  background: var(--b3-theme-on-background);
}

.stop-btn {
  background: var(--b3-theme-on-background);
}

.timer-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--b3-list-hover);
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  box-shadow: var(--b3-border-color) 0px 0px 0px 0.5px;
}

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-description {
  color: var(--b3-theme-on-surface-light);
  font-size: 12px;
  line-height: 1.5;
}

.micro-break-overlay {
  position: fixed;
  z-index: 10001;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.micro-break-dialog {
  width: min(320px, calc(100vw - 32px));
  padding: 24px;
  border: 1px solid var(--b3-border-color);
  border-radius: 12px;
  background: var(--b3-theme-surface);
  box-shadow: var(--b3-dialog-shadow);
  text-align: center;
}

.micro-break-dialog__title {
  color: var(--b3-theme-primary);
  font-size: 18px;
  font-weight: 600;
}

.micro-break-dialog__message {
  margin-top: 8px;
  color: var(--b3-theme-on-surface);
}

.micro-break-dialog__countdown {
  margin-top: 16px;
  color: var(--b3-theme-primary);
  font-size: 28px;
  font-variant-numeric: tabular-nums;
}

.timer-mode-toggle {
  display: inline-flex;
  gap: 8px;
  padding: 4px;
  border-radius: 999px;
  background: var(--b3-theme-background);
}

.timer-mode-toggle--header {
  background: var(--b3-list-hover);
}

.timer-mode-option {
  border: none;
  background: transparent;
  color: var(--b3-theme-on-surface);
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
}

.timer-mode-option.active {
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
}

.timer-mode-option:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.duration-value {
  font-weight: bold;
  color: var(--b3-theme-on-background);
}

.sound-selector {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
}

.duration-slider-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}

.duration-slider {
  width: 100%;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--b3-list-hover);
  border-radius: 3px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: #ffcb4c!;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.2);
      background: #f9d77a;
    }
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;

    &::-webkit-slider-thumb {
      background: var(--b3-border-color);
    }
  }
}

.duration-marks {
  position: relative;
  width: calc(100% - 16px);
  height: 20px;
  margin: 0 auto;
}

.duration-mark {
  position: absolute;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.6;
  transition: all 0.2s;
  transform: translateX(-50%);
}

.sound-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  border: none;
  background: var(--b3-list-hover);
  border-radius: 30%;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--b3-theme-on-background);
  flex: 1;
  aspect-ratio: 1;

  svg {
    width: 80%;
    height: 80%;
    fill: currentColor;
  }

  &.active {
    background: var(--b3-theme-on-background);
    color: var(--b3-theme-background);
  }
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  background: var(--b3-list-background);
  border-radius: 12px;
}

.volume-icon {
  font-size: 18px;
  min-width: 20px;
}

.volume-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--b3-border-color);
  border-radius: 3px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: #f98f7a;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.1);
      background: #f87a6a;
    }
  }
}

.volume-value {
  min-width: 45px;
  text-align: right;
  font-size: 14px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
}

.switch-container {
  display: flex;
  align-items: center;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--b3-border-color);
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #f98f7a;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round:before {
  border-radius: 50%;
}

.sound-selector.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.download-progress {
  margin-top: 12px;
  padding: 12px;
  background: var(--b3-list-background);
  border-radius: 12px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--b3-border-color);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #f98f7a;
  transition: width 0.3s ease;
}

.progress-text {
  display: block;
  text-align: center;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  margin-top: 8px;
}

.timer-stats {
  display: flex;
  justify-content: space-around;
  background: var(--b3-list-hover);
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  box-shadow: var(--b3-border-color) 0px 0px 0px 0.5px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--b3-theme-on-background);
}
.time-unit{
  font-size: 0.6em;
  opacity: 0.7;
  margin-left: 2px;
}
.stat-label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.timer-history {
  background-color: var(--b3-list-hover);
  padding: 16px 16px 8px 16px;
  border-radius: 24px;
  box-shadow: var(--b3-border-color) 0px 0px 0px 0.5px;
  width: 100%;
  box-sizing: border-box;
}

.calendar-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}

.calendar-navigation {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;

  .nav-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--b3-list-hover);
    }

    &:active {
      background-color: var(--b3-list-hover);
    }

    .icon {
      width: 16px;
      height: 16px;
      color: var(--b3-theme-on-surface);
    }
  }

  .current-period {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    text-align: center;
    font-size: 14px;
    flex: 1;
    font-weight: 600;
  }

  .timer-history-hint {
    color: var(--b3-theme-on-surface-light);
    flex: 0 0 auto;
  }
}

.calendar-view {
  flex: 1;
  margin-bottom: 20px;

  .weekdays-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    font-weight: bold;
    margin-bottom: 8px;
    color: var(--b3-theme-on-surface);
    gap: 4px;
    font-size: 12px;
  }

  .month-view {
    .month-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }
  }

  .day {
    position: relative;
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 30%;
    border: none;
    background: var(--b3-list-hover);
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    transition: background-color 0.2s;
    padding: 2px;
    color: var(--b3-theme-on-surface);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--b3-theme-on-background) 12%, var(--b3-list-hover));
    }

    &:focus-visible {
      outline: 2px solid #f98f7a;
      outline-offset: 2px;
    }

    &.hasdata {
      background: var(--b3-theme-on-background);
      color: var(--b3-theme-background);
    }

    &.hasdata:hover:not(:disabled) {
      background: color-mix(in srgb, var(--b3-theme-on-background) 86%, #f98f7a);
    }

    &.today:not(.hasdata) {
      color: #f98f7a;
    }

    &.not-current-month {
      opacity: 0;
      cursor: default;
    }

    .day-number {
      font-size: 14px;
      flex-shrink: 0;
    }

    .day-duration {
      font-size: 10px;
      font-weight: 600;
      flex-shrink: 0;
    }
  }
  
}

.focus-backfill-overlay {
  position: fixed;
  inset: auto;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.32);
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
}

@media (max-width: 768px) {
  .focus-backfill-overlay {
    padding: calc(16px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px));
  }
}

.focus-backfill-dialog {
  width: min(360px, 100%);
  max-height: 100%;
  margin: auto 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
  border-radius: 12px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  box-shadow: var(--b3-dialog-shadow);
  border: 1px solid var(--b3-border-color);
  box-sizing: border-box;
}

.focus-backfill-records {
  margin: 0 0 14px;
  padding: 6px;
  border-radius: 12px;
  background: var(--b3-list-hover);
}

.focus-backfill-records__title {
  margin-bottom: 8px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  font-weight: 700;
}

.focus-backfill-records__list {
  max-height: 178px;
  overflow-y: auto;
  padding-right: 2px;
}

.lifelog-timeline-item {
  display: block;
  position: relative;
}

.lifelog-timeline-item + .lifelog-timeline-item {
  margin-top: 8px;
}

.lifelog-timeline-content {
  min-width: 0;
}

.lifelog-timeline-card {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
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
  font-weight: 700;
}

.lifelog-timeline-meta {
  margin-top: 4px;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
  line-height: 1.35;
}

.lifelog-timeline-delete {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
}

.lifelog-timeline-delete:hover:not(:disabled) {
  background: color-mix(in srgb, var(--b3-theme-background) 82%, #f98f7a);
  color: var(--b3-theme-error);
}

.lifelog-timeline-delete:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.focus-backfill-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.focus-backfill-title {
  font-size: 15px;
  font-weight: 700;
}

.focus-backfill-date {
  margin-top: 4px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.focus-backfill-close {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--b3-theme-on-background);
  cursor: pointer;
}

.focus-backfill-close:hover {
  background: var(--b3-list-hover);
}

.focus-backfill-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.focus-backfill-field label {
  font-size: 13px;
  font-weight: 600;
  color: var(--b3-theme-on-surface);
}

.focus-backfill-duration-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.focus-backfill-duration-chip {
  height: 30px;
  border: none;
  border-radius: 8px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.focus-backfill-duration-chip:hover,
.focus-backfill-duration-chip.active {
  background: #f98f7a;
  color: var(--b3-theme-background);
}

.focus-backfill-input {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  box-sizing: border-box;
}

.focus-backfill-input:focus {
  outline: none;
  border-color: #f98f7a;
  box-shadow: 0 0 0 3px rgb(249 143 122 / 0.18);
}

.focus-backfill-target {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 4px 0 14px;
  padding: 8px;
  border-radius: 12px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
  font-size: 12px;
}

.focus-backfill-target__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.focus-backfill-target__chip-row,
.focus-backfill-target__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
}

.focus-backfill-target__chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 220px;
  padding: 7px 10px;
  border: none;
  border-radius: 999px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
}

.focus-backfill-target__chip:hover,
.focus-backfill-target__action:hover,
.focus-backfill-target__clear:hover,
.focus-backfill-picker__close:hover {
  background: color-mix(in srgb, var(--b3-theme-background) 82%, #f98f7a);
}

.focus-backfill-target__emoji {
  flex: 0 0 auto;
  font-size: 13px;
}

.focus-backfill-target__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
}

.focus-backfill-target__action,
.focus-backfill-target__clear,
.focus-backfill-picker__close {
  border: none;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
}

.focus-backfill-target__action {
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.focus-backfill-target__clear,
.focus-backfill-picker__close {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0;
}

.focus-backfill-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 2px;
}

.focus-backfill-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--b3-theme-on-background);
  font-size: 12px;
  font-weight: 700;
}

.focus-backfill-picker__state {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  font-size: 12px;
}

.focus-backfill-picker__state.is-error {
  color: var(--b3-theme-error);
}

.focus-backfill-picker__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
}

.focus-backfill-picker__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  text-align: left;
}

.focus-backfill-picker__item:hover {
  background: color-mix(in srgb, var(--b3-theme-background) 84%, #f98f7a);
}

.focus-backfill-picker__item-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.focus-backfill-picker__item-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.focus-backfill-picker__item-meta {
  flex-shrink: 0;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
}

.focus-backfill-error {
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--b3-theme-error);
}

.focus-backfill-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.focus-backfill-btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  background: var(--b3-theme-surface);
  color: var(--b3-theme-on-background);
  font-size: 13px;
  cursor: pointer;
}

.focus-backfill-btn:hover:not(:disabled) {
  background: var(--b3-list-hover);
}

.focus-backfill-btn.is-primary {
  border-color: #f98f7a;
  background: #f98f7a;
  color: var(--b3-theme-background);
  font-weight: 700;
}

.focus-backfill-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  .icon {
    color: var(--b3-theme-on-background);
  }
}
</style>

<style>
.time-unit {
  font-size: 0.6em;
  opacity: 0.7;
  margin:0 2px;
  vertical-align: baseline;
}
</style>
