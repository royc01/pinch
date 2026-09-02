<template>
  <div
    v-if="show"
    :class="presentation === 'sidebar'
      ? ['task-scope-page', { 'is-elevated': elevated }]
      : 'task-scope-overlay'"
    :style="pageStyle"
    @click="handleOverlayClick"
  >
    <div
      class="task-scope-dialog"
      :class="{
        'with-document-groups': hasWideLayout,
        'is-sidebar-presentation': isSidebarPresentation
      }"
      @click.stop
    >
      <div class="task-scope-header">
        <template v-if="isSidebarPresentation">
          <button
            v-if="activeTab !== 'home'"
            type="button"
            class="task-scope-back"
            @click="activeTab = 'home'"
          >
            <Icon name="left" width="16" height="16" />
            <span>{{ dialogTitle }}</span>
          </button>
          <div v-else class="task-scope-title">{{ dialogTitle }}</div>
          <button v-if="!lockClose" type="button" class="icon-button ariaLabel" :aria-label="t('common.close')" @click="handleClose">
            <Icon name="close" width="14" height="14" class="icon" />
          </button>
        </template>
        <template v-else>
          <div class="task-scope-header-side">
            <div class="task-scope-title">{{ dialogTitle }}</div>
          </div>
          <div class="task-scope-header-main">
            <button v-if="!lockClose" type="button" class="icon-button ariaLabel" :aria-label="t('common.close')" @click="handleClose">
              <Icon name="close" width="14" height="14" class="icon" />
            </button>
          </div>
        </template>
      </div>

      <div class="task-scope-body">
        <nav v-if="!isSidebarPresentation" class="task-scope-side-nav" :aria-label="dialogTitle">
          <button
            v-for="item in editorSettingsNavItems"
            :key="item.id"
            type="button"
            class="task-scope-side-nav-item"
            :class="{ active: activeTab === item.id }"
            @click="handleSettingsNavItemClick(item.id)"
          >
            <span class="task-scope-home-item-icon">
              <Icon v-if="item.icon" :name="item.icon" :width="item.iconSize" :height="item.iconSize" />
            </span>
            <span>{{ item.label }}</span>
          </button>
        </nav>

      <div v-if="isSidebarPresentation && activeTab === 'home'" class="task-scope-content task-scope-home">
        <div v-for="(group, groupIndex) in settingsNavGroups" :key="groupIndex" class="task-scope-home-group">
          <button
            v-for="item in group"
            :key="item.id"
            type="button"
            class="task-scope-home-item"
            @click="handleSettingsNavItemClick(item.id)"
          >
            <span class="task-scope-home-item-main">
              <span class="task-scope-home-item-icon">
                <Icon v-if="item.icon" :name="item.icon" :width="item.iconSize" :height="item.iconSize" />
              </span>
              <span>{{ item.label }}</span>
            </span>
            <Icon name="right" width="16" height="16" />
          </button>
        </div>
      </div>

      <div v-else class="task-scope-scroll">
        <div class="task-scope-hint">
          <Icon
            name="focusBackfillHint"
            width="14"
            height="14"
            class="task-scope-hint-icon"
          />
          <span>{{ activeHint }}</span>
        </div>

      <div v-if="activeTab === 'scope'" class="task-scope-content scope-tab-content">
        <div class="task-scope-summary-row">
          <div class="task-scope-summary">
            {{ t('taskScopeDialog.enabledPrefix') }} {{ notebooks.length - localExcludedNotebookIds.length }} / {{ notebooks.length }}
          </div>
          <SyButton class="task-scope-btn plain" @click="clearExcluded">
            {{ t('taskScopeDialog.enableAll') }}
          </SyButton>
        </div>
        <div v-if="showExtra" class="task-scope-extra">
          <span class="task-scope-extra-label">{{ t('taskScopeDialog.showCompletedTasks') }}</span>
          <SyCheckbox
            class="task-scope-toggle"
            :model-value="localShowCompletedTasks"
            @update:model-value="localShowCompletedTasks = $event"
          />
        </div>
        <div class="task-scope-list">
          <label
            v-for="notebook in notebooks"
            :key="notebook.id"
            class="task-scope-item"
          >
            <span class="task-scope-name">{{ notebook.name }}</span>
            <SyCheckbox
              class="task-scope-toggle"
              :model-value="isNotebookEnabled(notebook.id)"
              @update:model-value="toggleNotebookEnabled(notebook.id, $event)"
            />
          </label>

          <div v-if="notebooks.length === 0" class="task-scope-empty">
            {{ t('taskScopeDialog.noNotebooks') }}
          </div>
        </div>

      </div>

      <div v-else-if="activeTab === 'task-settings'" class="task-scope-content task-settings-tab-content">
        <div class="task-scope-auto-setting">
          <div class="task-scope-auto-item">
            <div class="task-scope-auto-main">
              <div class="task-scope-auto-title-row">
                <span class="task-scope-extra-label">{{ t('taskScopeDialog.autoRecognizeDate') }}</span>
                <SyButton
                  class="task-scope-inline-btn"
                  :disabled="globalDateRecognizing"
                  @click="handleGlobalRecognizeDate"
                >
                  {{ globalDateRecognizing ? t('taskScopeDialog.recognizing') : t('taskScopeDialog.recognizeGlobally') }}
                </SyButton>
              </div>
              <div class="task-scope-auto-desc">
                {{ t('taskScopeDialog.autoRecognizeDateDesc') }}
              </div>
            </div>
            <SyCheckbox
              class="task-scope-toggle"
              :model-value="localAutoRecognizeTaskDate"
              @update:model-value="localAutoRecognizeTaskDate = $event"
            />
          </div>
          <div class="task-scope-auto-item">
            <span class="task-scope-extra-label">{{ t('taskScopeDialog.taskCompletionSound') }}</span>
            <SyCheckbox
              class="task-scope-toggle"
              :model-value="localTaskCompletionSoundEnabled"
              @update:model-value="localTaskCompletionSoundEnabled = $event"
            />
          </div>
          <details class="task-scope-keyword-settings">
            <summary class="task-scope-keyword-summary">
              <span>{{ t('taskScopeDialog.dateRecognitionKeywords') }}</span>
              <Icon class="task-scope-keyword-arrow" name="right" width="16" height="16" />
            </summary>
            <div class="task-scope-keyword-desc">
              {{ t('taskScopeDialog.dateRecognitionKeywordsDesc') }}
            </div>
            <label class="task-scope-keyword-field">
              <span>{{ t('taskScopeDialog.startKeywords') }}</span>
              <textarea
                v-model="localStartKeywordsText"
                class="task-scope-keyword-textarea"
                :placeholder="t('taskScopeDialog.startKeywordsPlaceholder')"
                rows="2"
              />
            </label>
            <label class="task-scope-keyword-field">
              <span>{{ t('taskScopeDialog.dueKeywords') }}</span>
              <textarea
                v-model="localDueKeywordsText"
                class="task-scope-keyword-textarea"
                :placeholder="t('taskScopeDialog.dueKeywordsPlaceholder')"
                rows="2"
              />
            </label>
            <label class="task-scope-keyword-field">
              <span>{{ t('taskScopeDialog.rangeKeywords') }}</span>
              <textarea
                v-model="localRangeKeywordsText"
                class="task-scope-keyword-textarea"
                :placeholder="t('taskScopeDialog.rangeKeywordsPlaceholder')"
                rows="2"
              />
            </label>
            <label class="task-scope-keyword-field">
              <span>{{ t('taskScopeDialog.afternoonKeywords') }}</span>
              <textarea
                v-model="localAfternoonKeywordsText"
                class="task-scope-keyword-textarea"
                :placeholder="t('taskScopeDialog.afternoonKeywordsPlaceholder')"
                rows="2"
              />
            </label>
          </details>
        </div>

        <div class="task-scope-display-section">
          <div class="task-scope-display-title">{{ t('taskScopeDialog.taskCreateSettings') }}</div>
          <div class="task-scope-display-item">
            <span class="task-scope-name">{{ t('taskScopeDialog.defaultTaskCreateTarget') }}</span>
            <SySelect
              v-model="localDefaultTaskCreateTarget"
              class="task-scope-setting-select"
              :options="defaultTaskCreateTargetOptions"
            />
          </div>
          <div class="task-scope-display-item">
            <span class="task-scope-name">{{ t('taskScopeDialog.defaultTaskCreateNotebook') }}</span>
            <SySelect
              v-model="localDefaultTaskCreateNotebook"
              class="task-scope-setting-select"
              :options="defaultTaskCreateNotebookOptions"
            />
          </div>
          <div v-if="localDefaultTaskCreateTarget === 'specified-document'" class="task-scope-display-item">
            <span class="task-scope-name">{{ t('taskScopeDialog.defaultTaskCreateDocument') }}</span>
            <SySelect
              v-model="localDefaultTaskCreateDocument"
              class="task-scope-setting-select"
              :options="defaultTaskCreateDocumentOptions"
            />
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'pomodoro-settings'" class="task-scope-content pomodoro-settings-tab-content">
        <div class="task-scope-display-section">
          <div class="task-scope-display-title">{{ t('focusTimer.microBreak') }}</div>
          <div class="task-scope-auto-item">
            <div class="task-scope-auto-main">
              <span class="task-scope-extra-label">{{ t('focusTimer.microBreak') }}</span>
              <div class="task-scope-auto-desc">{{ t('focusTimer.microBreakDescription') }}</div>
            </div>
            <SyCheckbox class="task-scope-toggle" :model-value="localMicroBreakEnabled" @update:model-value="localMicroBreakEnabled = $event" />
          </div>
          <div v-if="localMicroBreakEnabled" class="micro-break-options">
            <label class="micro-break-option">
              <span>{{ t('focusTimer.microBreakPopup') }}</span>
              <SyCheckbox class="task-scope-toggle" :model-value="localMicroBreakPopup" @update:model-value="localMicroBreakPopup = $event" />
            </label>
            <label class="micro-break-option">
              <span>{{ t('focusTimer.microBreakSystemNotification') }}</span>
              <SyCheckbox class="task-scope-toggle" :model-value="localMicroBreakSystemNotification" @update:model-value="localMicroBreakSystemNotification = $event" />
            </label>
            <label class="micro-break-option">
              <span>{{ t('focusTimer.microBreakSound') }}</span>
              <SyCheckbox class="task-scope-toggle" :model-value="localMicroBreakSound" @update:model-value="localMicroBreakSound = $event" />
            </label>
            <label class="micro-break-number">
              <span>{{ t('focusTimer.microBreakDuration') }}</span>
              <input v-model.number="localMicroBreakDurationSeconds" type="number" min="1" max="300" />
            </label>
            <div class="micro-break-interval">
              <div class="micro-break-number">
                <span>{{ t('focusTimer.microBreakInterval') }}</span>
                <span>{{ localMicroBreakMinIntervalMinutes }}-{{ localMicroBreakMaxIntervalMinutes }}{{ t('focusTimer.minuteSuffix') }}</span>
              </div>
              <div class="micro-break-range">
                <div class="micro-break-range__track">
                  <span class="micro-break-range__fill" :style="microBreakRangeFillStyle"></span>
                </div>
                <input class="micro-break-range__input" type="range" min="0" :max="microBreakIntervalMarks.length - 1" :value="microBreakMinIntervalIndex" @input="updateMicroBreakInterval('min', $event)" />
                <input class="micro-break-range__input" type="range" min="0" :max="microBreakIntervalMarks.length - 1" :value="microBreakMaxIntervalIndex" @input="updateMicroBreakInterval('max', $event)" />
              </div>
              <div class="duration-marks micro-break-range__marks">
                <span
                  v-for="(mark, index) in microBreakIntervalMarks"
                  :key="mark"
                  class="duration-mark"
                  :style="{ left: `${(index / (microBreakIntervalMarks.length - 1)) * 100}%` }"
                >
                  {{ mark }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="task-scope-display-section custom-audio-settings">
          <div class="task-scope-display-title">{{ t('taskScopeDialog.customAudio') }}</div>
          <div class="task-scope-auto-item">
            <div class="task-scope-auto-main">
              <span class="task-scope-extra-label">{{ t('focusTimer.shortBreakPopup') }}</span>
              <div class="task-scope-auto-desc">{{ t('focusTimer.shortBreakPopupDescription') }}</div>
            </div>
            <SyCheckbox class="task-scope-toggle" :model-value="localShortBreakPopup" @update:model-value="localShortBreakPopup = $event" />
          </div>
          <div class="task-scope-auto-item">
            <div class="task-scope-auto-main">
              <span class="task-scope-extra-label">{{ t('focusTimer.focusCompletePopup') }}</span>
              <div class="task-scope-auto-desc">{{ t('focusTimer.focusCompletePopupDescription') }}</div>
            </div>
            <SyCheckbox class="task-scope-toggle" :model-value="localFocusCompletePopup" @update:model-value="localFocusCompletePopup = $event" />
          </div>
          <div class="custom-audio-setting">
            <span>{{ t('taskScopeDialog.customWhiteNoise') }}</span>
            <div class="custom-audio-setting__controls">
              <button type="button" class="custom-audio-option" :class="{ active: !localCustomWhiteNoiseFile }" @click="selectCustomAudio('whiteNoise', '')">{{ t('taskScopeDialog.useDefaultSound') }}</button>
              <div v-for="audioFile in customAudioFiles.whiteNoise" :key="audioFile.fileName" class="custom-audio-option" :class="{ active: localCustomWhiteNoiseFile === audioFile.fileName }" role="button" tabindex="0" @click="selectCustomAudio('whiteNoise', audioFile.fileName)" @keydown.enter="selectCustomAudio('whiteNoise', audioFile.fileName)">
                <span>{{ audioFile.label }}</span>
                <button type="button" class="custom-audio-option__delete" :aria-label="t('common.delete')" :title="t('common.delete')" @click.stop="deleteCustomAudio('whiteNoise', audioFile.fileName)">×</button>
              </div>
              <div class="custom-audio-actions">
                <label class="custom-audio-upload">{{ t('taskScopeDialog.uploadFile') }}<input type="file" accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac,.webm,.opus" @change="uploadCustomAudio('whiteNoise', $event)" /></label>
                <button type="button" class="custom-audio-preview" @click="toggleCustomAudioPreview('whiteNoise', localCustomWhiteNoiseFile)">{{ isPreviewingCustomAudio('whiteNoise', localCustomWhiteNoiseFile) ? t('focusTimer.stop') : t('taskScopeDialog.previewSound') }}</button>
              </div>
            </div>
            <div class="volume-control">
              <span class="volume-icon" :aria-label="t('taskScopeDialog.volume')">🔊</span>
              <input v-model.number="localCustomWhiteNoiseVolume" type="range" min="0" max="1" step="0.1" class="volume-slider" @input="updateCustomAudioPreviewVolume('whiteNoise')" />
              <span class="volume-value">{{ Math.round(localCustomWhiteNoiseVolume * 100) }}%</span>
            </div>
          </div>
          <div class="custom-audio-setting">
            <span>{{ t('taskScopeDialog.customCompletionSound') }}</span>
            <div class="custom-audio-setting__controls">
              <button type="button" class="custom-audio-option" :class="{ active: !localCustomCompletionSoundFile }" @click="selectCustomAudio('completion', '')">{{ t('taskScopeDialog.useDefaultSound') }}</button>
              <div v-for="audioFile in customAudioFiles.completion" :key="audioFile.fileName" class="custom-audio-option" :class="{ active: localCustomCompletionSoundFile === audioFile.fileName }" role="button" tabindex="0" @click="selectCustomAudio('completion', audioFile.fileName)" @keydown.enter="selectCustomAudio('completion', audioFile.fileName)">
                <span>{{ audioFile.label }}</span>
                <button type="button" class="custom-audio-option__delete" :aria-label="t('common.delete')" :title="t('common.delete')" @click.stop="deleteCustomAudio('completion', audioFile.fileName)">×</button>
              </div>
              <div class="custom-audio-actions">
                <label class="custom-audio-upload">{{ t('taskScopeDialog.uploadFile') }}<input type="file" accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac,.webm,.opus" @change="uploadCustomAudio('completion', $event)" /></label>
                <button type="button" class="custom-audio-preview" @click="toggleCustomAudioPreview('completion', localCustomCompletionSoundFile)">{{ isPreviewingCustomAudio('completion', localCustomCompletionSoundFile) ? t('focusTimer.stop') : t('taskScopeDialog.previewSound') }}</button>
              </div>
            </div>
            <div class="volume-control">
              <span class="volume-icon" :aria-label="t('taskScopeDialog.volume')">🔊</span>
              <input v-model.number="localCustomCompletionSoundVolume" type="range" min="0" max="1" step="0.1" class="volume-slider" @input="updateCustomAudioPreviewVolume('completion')" />
              <span class="volume-value">{{ Math.round(localCustomCompletionSoundVolume * 100) }}%</span>
            </div>
          </div>
          <div class="custom-audio-setting">
            <span>{{ t('taskScopeDialog.customMicroBreakSound') }}</span>
            <div class="custom-audio-setting__controls">
              <button type="button" class="custom-audio-option" :class="{ active: !localCustomMicroBreakSoundFile }" @click="selectCustomAudio('microBreak', '')">{{ t('taskScopeDialog.useDefaultSound') }}</button>
              <div v-for="audioFile in customAudioFiles.microBreak" :key="audioFile.fileName" class="custom-audio-option" :class="{ active: localCustomMicroBreakSoundFile === audioFile.fileName }" role="button" tabindex="0" @click="selectCustomAudio('microBreak', audioFile.fileName)" @keydown.enter="selectCustomAudio('microBreak', audioFile.fileName)">
                <span>{{ audioFile.label }}</span>
                <button type="button" class="custom-audio-option__delete" :aria-label="t('common.delete')" :title="t('common.delete')" @click.stop="deleteCustomAudio('microBreak', audioFile.fileName)">×</button>
              </div>
              <div class="custom-audio-actions">
                <label class="custom-audio-upload">{{ t('taskScopeDialog.uploadFile') }}<input type="file" accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac,.webm,.opus" @change="uploadCustomAudio('microBreak', $event)" /></label>
                <button type="button" class="custom-audio-preview" @click="toggleCustomAudioPreview('microBreak', localCustomMicroBreakSoundFile)">{{ isPreviewingCustomAudio('microBreak', localCustomMicroBreakSoundFile) ? t('focusTimer.stop') : t('taskScopeDialog.previewSound') }}</button>
              </div>
            </div>
            <div class="volume-control">
              <span class="volume-icon" :aria-label="t('taskScopeDialog.volume')">🔊</span>
              <input v-model.number="localCustomMicroBreakSoundVolume" type="range" min="0" max="1" step="0.1" class="volume-slider" @input="updateCustomAudioPreviewVolume('microBreak')" />
              <span class="volume-value">{{ Math.round(localCustomMicroBreakSoundVolume * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'document-groups'" class="task-scope-content document-groups-tab-content">
        <DocumentGroupManagerPanel
          :layout="isSidebarPresentation ? 'stacked' : 'split'"
          :groups="localDocumentGroups"
          :documents="documentGroupDocuments"
          :all-documents="allDocumentGroupDocuments"
          :documents-refreshing="documentsRefreshing"
          @update:groups="localDocumentGroups = $event"
          @refresh-documents="emit('refresh-documents')"
        />
      </div>
      <div v-else-if="activeTab === 'tags'" class="task-scope-content tags-tab-content">
        <TaskGroupDialog
          :show="true"
          embedded
          auto-save
          :groups="localTaskGroups"
          :include-none-option="true"
          :order-ids="taskGroupOrderIds"
          @save="handleTagSave"
        />
      </div>
      <div v-else-if="activeTab === 'goals'" class="task-scope-content goals-tab-content">
        <GoalManagerPanel
          :layout="isSidebarPresentation ? 'stacked' : 'split'"
          :goals="localGoals"
          :documents="goalDocuments"
          :all-documents="allDocumentGroupDocuments"
          :tasks="goalTasks"
          :documents-refreshing="documentsRefreshing"
          @update:goals="localGoals = $event"
          @refresh-documents="emit('refresh-documents')"
        />
      </div>
      <div v-else-if="activeTab === 'display'" class="task-scope-content display-tab-content">
        <div class="task-scope-display-section view-switcher-section">
          <div class="task-scope-display-title">{{ t('taskScopeDialog.viewSwitcherOptions') }}</div>
          <div class="task-scope-display-grid">
            <label
              v-for="option in taskViewOptions"
              :key="option.id"
              class="task-scope-display-item"
            >
              <span class="task-scope-name">{{ option.label }}</span>
              <SyCheckbox
                class="task-scope-toggle"
                :model-value="isTaskViewVisible(option.id)"
                @update:model-value="toggleTaskViewVisible(option.id, $event)"
              />
            </label>
          </div>
        </div>
        <div class="task-scope-display-section">
          <div class="task-scope-display-title">{{ t('taskScopeDialog.sidebarSections') }}</div>
          <div
            v-for="(section, index) in orderedSidebarSections"
            :key="section.id"
            class="task-scope-display-item sortable"
          >
            <span class="task-scope-name">{{ section.label }}</span>
            <div class="task-scope-display-controls">
              <button
                type="button"
                class="task-scope-order-btn up ariaLabel"
               
                :aria-label="t('taskScopeDialog.moveUp')"
                :disabled="index === 0"
                @click="moveSidebarSection(section.id, -1)"
              >
                <Icon name="arrowDown" width="14" height="14" class="icon" />
              </button>
              <button
                type="button"
                class="task-scope-order-btn ariaLabel"
               
                :aria-label="t('taskScopeDialog.moveDown')"
                :disabled="index === orderedSidebarSections.length - 1"
                @click="moveSidebarSection(section.id, 1)"
              >
                <Icon name="arrowDown" width="14" height="14" class="icon" />
              </button>
              <SyCheckbox
                class="task-scope-toggle"
                :model-value="isSidebarSectionVisible(section.id)"
                @update:model-value="toggleSidebarSectionVisible(section.id, $event)"
              />
            </div>
          </div>
        </div>
        <div class="task-scope-display-section">
          <div class="task-scope-display-title">{{ t('taskScopeDialog.completionDisplay') }}</div>
          <div class="task-scope-auto-item">
            <div class="task-scope-auto-main">
              <span class="task-scope-extra-label">{{ t('taskScopeDialog.checkinNotePrompt') }}</span>
              <div class="task-scope-auto-desc">{{ t('taskScopeDialog.checkinNotePromptDescription') }}</div>
            </div>
            <SyCheckbox class="task-scope-toggle" :model-value="localCheckinNotePrompt" @update:model-value="localCheckinNotePrompt = $event" />
          </div>
        </div>
      </div>
      </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyCheckbox from '@/components/SiyuanTheme/SyCheckbox.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import DocumentGroupManagerPanel from '@/components/DocumentGroupManagerPanel.vue';
import TaskGroupDialog from '@/components/TaskGroupDialog.vue';
import GoalManagerPanel from '@/components/GoalManagerPanel.vue';
import type { Task, TaskGroup } from '@/api';
import type { DocumentGroup } from '@/documentGroupRepository';
import type { Goal } from '@/goalRepository';
import type { GoalScopeDocument } from '@/utils/goalScopeDocuments';
import { normalizeNotebookIds } from '@/utils/taskViewShared';
import { useI18n } from '@/composables/useI18n';
import type { TaskDateKeywordConfig } from '@/utils/taskDateParser';
import type { UserSettings } from '@/utils/userSettings';
import { putFile, readDir, removeFile } from '@/api';
import { getCustomFocusAudioUrl } from '@/utils/completionSound';
import { loadFiletreeDocumentTree, type FiletreeDocumentTreeDocument } from '@/utils/filetreeDocumentTree';

interface NotebookItem {
  id: string;
  name: string;
}

interface DocumentGroupScopeDocument {
  id: string;
  name: string;
  notebookId: string;
  notebookName: string;
  path?: string;
  parentId?: string;
  storagePath?: string;
}

export interface TaskScopeDialogSavePayload {
  excludedNotebookIds: string[];
  showCompletedTasks: boolean;
  autoRecognizeTaskDate: boolean;
  taskCompletionSoundEnabled: boolean;
  dateRecognitionKeywords: TaskDateKeywordConfig;
  showDocumentGroupNotebookPath: boolean;
  documentGroups: DocumentGroup[];
  goals: Goal[];
  hiddenTaskViewIds: string[];
  hiddenSidebarSectionIds: string[];
  sidebarSectionOrder: string[];
  defaultTaskCreateTarget: string;
  defaultTaskCreateNotebook: string;
  defaultTaskCreateDocument: string;
  focusSettings: UserSettings['focus'];
}

export interface TaskScopeDisplayOption {
  id: string;
  label: string;
  /** IDs persisted when this display option is hidden. */
  hiddenIds?: readonly string[];
}

interface Props {
  show: boolean;
  notebooks: NotebookItem[];
  excludedNotebookIds: string[];
  showCompletedTasks?: boolean;
  autoRecognizeTaskDate?: boolean;
  dateRecognitionKeywords?: TaskDateKeywordConfig;
  globalDateRecognizing?: boolean;
  taskCompletionSoundEnabled?: boolean;
  lockClose?: boolean;
  showExtra?: boolean;
  title?: string;
  hint?: string;
  confirmText?: string;
  initialTab?: TaskScopeDialogTab;
  documentGroups?: DocumentGroup[];
  documentGroupDocuments?: DocumentGroupScopeDocument[];
  allDocumentGroupDocuments?: DocumentGroupScopeDocument[];
  documentsRefreshing?: boolean;
  showDocumentGroupNotebookPath?: boolean;
  showDocumentGroupNotebookPathToggle?: boolean;
  showScopeTab?: boolean;
  goals?: Goal[];
  goalDocuments?: GoalScopeDocument[];
  goalTasks?: Task[];
  taskViewOptions?: TaskScopeDisplayOption[];
  hiddenTaskViewIds?: string[];
  sidebarSectionOptions?: TaskScopeDisplayOption[];
  hiddenSidebarSectionIds?: string[];
  sidebarSectionOrder?: string[];
  defaultTaskCreateTarget?: string;
  defaultTaskCreateNotebook?: string;
  defaultTaskCreateDocument?: string;
  focusSettings?: UserSettings['focus'];
  presentation?: 'overlay' | 'sidebar';
  /** Raise only settings opened from an active task editor. */
  elevated?: boolean;
  pageStyle?: Record<string, string>;
  taskGroups?: TaskGroup[];
  taskGroupOrderIds?: string[];
}

const props = defineProps<Props>();
const { t } = useI18n();
type TaskScopeDialogTab = 'home' | 'scope' | 'task-settings' | 'pomodoro-settings' | 'document-groups' | 'tags' | 'goals' | 'display';
type SettingsTabId = Exclude<TaskScopeDialogTab, 'home'>;
type SettingsNavItemId = SettingsTabId | 'reward-shop';

const emit = defineEmits<{
  close: [];
  save: [payload: TaskScopeDialogSavePayload];
  'global-recognize-date': [];
  'refresh-documents': [];
  'save-tags': [payload: { groups: TaskGroup[]; orderIds: string[] }];
  'open-reward-shop': [];
}>();

const localExcludedNotebookIds = ref<string[]>([]);
const localShowCompletedTasks = ref(true);
const localAutoRecognizeTaskDate = ref(false);
const localTaskCompletionSoundEnabled = ref(true);
const localStartKeywordsText = ref('');
const localDueKeywordsText = ref('');
const localRangeKeywordsText = ref('');
const localAfternoonKeywordsText = ref('');
const localShowDocumentGroupNotebookPath = ref(true);
const localDocumentGroups = ref<DocumentGroup[]>([]);
const localTaskGroups = ref<TaskGroup[]>([]);
const localGoals = ref<Goal[]>([]);
const localHiddenTaskViewIds = ref<string[]>([]);
const localHiddenSidebarSectionIds = ref<string[]>([]);
const localSidebarSectionOrder = ref<string[]>([]);
const localDefaultTaskCreateTarget = ref('last');
const localDefaultTaskCreateNotebook = ref('');
const localDefaultTaskCreateDocument = ref('');
const defaultTaskCreateDocuments = ref<FiletreeDocumentTreeDocument[]>([]);
const localMicroBreakEnabled = ref(false);
const localMicroBreakPopup = ref(true);
const localMicroBreakSystemNotification = ref(false);
const localMicroBreakSound = ref(true);
const localMicroBreakMinIntervalMinutes = ref(3);
const localMicroBreakMaxIntervalMinutes = ref(5);
const localMicroBreakDurationSeconds = ref(10);
const localShortBreakPopup = ref(false);
const localFocusCompletePopup = ref(false);
const localCheckinNotePrompt = ref(false);
const microBreakIntervalMarks = [1, 3, 5, 7, 9, 11, 13, 15];
const localCustomWhiteNoiseFile = ref('');
const localCustomCompletionSoundFile = ref('');
const localCustomMicroBreakSoundFile = ref('');
const localCustomWhiteNoiseVolume = ref(0.3);
const localCustomCompletionSoundVolume = ref(0.3);
const localCustomMicroBreakSoundVolume = ref(0.3);
interface CustomAudioFile {
  fileName: string;
  label: string;
}
const customAudioFiles = ref<Record<CustomAudioKind, CustomAudioFile[]>>({
  whiteNoise: [],
  completion: [],
  microBreak: []
});
const previewAudio = ref<HTMLAudioElement | null>(null);
const previewingAudioFile = ref('');
const previewingAudioKind = ref<CustomAudioKind | null>(null);
const activeTab = ref<TaskScopeDialogTab>('home');
const autoSaveReady = ref(false);
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const lockClose = computed(() => props.lockClose === true);
const isSidebarPresentation = computed(() => props.presentation === 'sidebar');
const showExtra = computed(() => props.showExtra !== false);
const globalDateRecognizing = computed(() => props.globalDateRecognizing === true);
const documentsRefreshing = computed(() => props.documentsRefreshing === true);
const showScopeTab = computed(() => props.showScopeTab !== false);
const getMicroBreakIntervalIndex = (value: number) => {
  const exactIndex = microBreakIntervalMarks.indexOf(value);
  if (exactIndex >= 0) return exactIndex;
  return microBreakIntervalMarks.reduce((closestIndex, mark, index) => (
    Math.abs(mark - value) < Math.abs(microBreakIntervalMarks[closestIndex] - value) ? index : closestIndex
  ), 0);
};
const microBreakMinIntervalIndex = computed(() => getMicroBreakIntervalIndex(localMicroBreakMinIntervalMinutes.value));
const microBreakMaxIntervalIndex = computed(() => Math.max(
  microBreakMinIntervalIndex.value,
  getMicroBreakIntervalIndex(localMicroBreakMaxIntervalMinutes.value)
));
const microBreakRangeFillStyle = computed(() => {
  const lastIndex = microBreakIntervalMarks.length - 1;
  return {
    left: `${(microBreakMinIntervalIndex.value / lastIndex) * 100}%`,
    right: `${100 - (microBreakMaxIntervalIndex.value / lastIndex) * 100}%`
  };
});
const dialogTitle = computed(() => props.title || t('taskScopeDialog.settings'));
const dialogHint = computed(() => props.hint || t('taskManager.scopeHint'));
const hasDocumentGroupTab = computed(() =>
  Array.isArray(props.documentGroups) && Array.isArray(props.documentGroupDocuments)
);
const hasGoalTab = computed(() =>
  Array.isArray(props.goals) && Array.isArray(props.goalDocuments)
);
const hasTagTab = computed(() => Array.isArray(props.taskGroups));
const taskViewOptions = computed(() => props.taskViewOptions || []);
const taskViewOptionIds = computed(() =>
  Array.from(new Set(taskViewOptions.value.flatMap(option => option.hiddenIds?.length ? option.hiddenIds : [option.id])))
);
const sidebarSectionOptions = computed(() => props.sidebarSectionOptions || []);
const hasDisplayTab = computed(() =>
  taskViewOptions.value.length > 0 || sidebarSectionOptions.value.length > 0
);
const hasWideLayout = computed(() => hasDocumentGroupTab.value || hasGoalTab.value || hasTagTab.value || hasDisplayTab.value);
const availableTabs = computed<SettingsTabId[]>(() => {
  const tabs: SettingsTabId[] = [];
  if (hasDisplayTab.value) {
    tabs.push('display');
  }
  tabs.push('task-settings');
  tabs.push('pomodoro-settings');
  if (hasGoalTab.value) {
    tabs.push('goals');
  }
  if (hasDocumentGroupTab.value) {
    tabs.push('document-groups');
  }
  if (hasTagTab.value) {
    tabs.push('tags');
  }
  if (showScopeTab.value) {
    tabs.push('scope');
  }
  return tabs;
});
const settingsNavItems = computed(() => {
  const tabItems = availableTabs.value.map(id => ({
  id,
   iconSize: ['display', 'scope', 'task-settings'].includes(id) ? 18 : 22,
  icon: id === 'display'
    ? 'displayNav'
    : id === 'scope'
      ? 'scopeNav'
      : id === 'task-settings'
        ? 'taskSettingsNav'
      : id === 'pomodoro-settings'
      ? 'focusNav'
      : id === 'goals'
      ? 'goalNav'
      : id === 'document-groups'
        ? 'documentGroupNav'
        : id === 'tags'
          ? 'tagNav'
        : '',
  label: id === 'display'
    ? t('taskScopeDialog.displaySettings')
    : id === 'task-settings'
      ? t('taskScopeDialog.taskSettings')
      : id === 'pomodoro-settings'
        ? t('taskScopeDialog.pomodoroSettings')
        : id === 'goals'
          ? t('taskScopeDialog.goals')
          : id === 'document-groups'
            ? t('taskScopeDialog.documentGroups')
            : id === 'tags'
              ? t('taskScopeDialog.tagManagement')
              : t('taskScopeDialog.scopeSettings')
  }));
  const rewardShopItem = { id: 'reward-shop' as const, icon: 'rewardShopNav', iconSize: 22, label: t('taskScopeDialog.rewardShop') };
  const taskSettingsIndex = tabItems.findIndex(item => item.id === 'task-settings');
  return taskSettingsIndex < 0
    ? [...tabItems, rewardShopItem]
    : [...tabItems.slice(0, taskSettingsIndex), rewardShopItem, ...tabItems.slice(taskSettingsIndex)];
});
const settingsNavGroups = computed(() => {
  const primaryIds = new Set<SettingsNavItemId>(['display', 'scope']);
  const primary = settingsNavItems.value.filter(item => primaryIds.has(item.id));
  const secondary = settingsNavItems.value.filter(item => !primaryIds.has(item.id));
  return [primary, secondary].filter(group => group.length > 0);
});
const editorSettingsNavItems = computed(() =>
  settingsNavItems.value.filter(item => item.id !== 'reward-shop')
);

function handleSettingsNavItemClick(id: SettingsNavItemId): void {
  if (id === 'reward-shop') {
    emit('open-reward-shop');
    return;
  }
  activeTab.value = id;
}
const documentGroupDocuments = computed(() => props.documentGroupDocuments || []);
const allDocumentGroupDocuments = computed(() => props.allDocumentGroupDocuments || []);
const goalDocuments = computed(() => props.goalDocuments || []);
const goalTasks = computed(() => props.goalTasks || []);
const activeHint = computed(() =>
  activeTab.value === 'scope'
    ? dialogHint.value
    : activeTab.value === 'task-settings'
      ? t('taskScopeDialog.taskSettingsHint')
      : activeTab.value === 'pomodoro-settings'
        ? t('taskScopeDialog.pomodoroSettingsHint')
       : activeTab.value === 'document-groups'
         ? t('taskScopeDialog.documentGroupsHint')
         : activeTab.value === 'tags'
           ? t('taskGroupDialog.hint')
        : activeTab.value === 'goals'
          ? t('taskScopeDialog.goalsHint')
          : t('taskScopeDialog.displaySettingsHint')
);

function cloneDocumentGroups(groups: DocumentGroup[]): DocumentGroup[] {
  return (groups || []).map(group => ({
    ...group,
    members: Array.isArray(group.members) ? group.members.map(member => ({ ...member })) : []
  }));
}

function cloneGoals(goals: Goal[]): Goal[] {
  return (goals || []).map(goal => ({
    ...goal,
    members: Array.isArray(goal.members) ? goal.members.map(member => ({ ...member })) : [],
    excludedDocumentKeys: Array.isArray(goal.excludedDocumentKeys) ? [...goal.excludedDocumentKeys] : undefined,
    taskMembers: Array.isArray(goal.taskMembers) ? goal.taskMembers.map(member => ({ ...member })) : [],
    excludedTaskMembers: Array.isArray(goal.excludedTaskMembers) ? goal.excludedTaskMembers.map(member => ({ ...member })) : []
  }));
}

function handleTagSave(payload: { groups: TaskGroup[]; orderIds: string[] }): void {
  localTaskGroups.value = payload.groups.map(group => ({ ...group }));
  emit('save-tags', payload);
}

const orderedSidebarSections = computed(() => {
  const optionsById = new Map(sidebarSectionOptions.value.map(option => [option.id, option]));
  const orderedIds = normalizeOptionIds(localSidebarSectionOrder.value, sidebarSectionOptions.value);
  return orderedIds.map(id => optionsById.get(id)).filter((item): item is TaskScopeDisplayOption => Boolean(item));
});
const defaultTaskCreateTargetOptions = computed(() => [
  { value: 'last', text: t('taskScopeDialog.defaultTaskCreateTargetLast') },
  { value: 'inbox', text: t('taskScopeDialog.defaultTaskCreateTargetInbox') },
  { value: 'daily-note', text: t('taskScopeDialog.defaultTaskCreateTargetDailyNote') },
  { value: 'specified-document', text: t('taskScopeDialog.defaultTaskCreateTargetSpecifiedDocument') }
]);
const defaultTaskCreateNotebookOptions = computed(() => [
  { value: '', text: t('taskScopeDialog.defaultTaskCreateNotebookFollow') },
  ...props.notebooks
    .filter(notebook => !localExcludedNotebookIds.value.includes(notebook.id))
    .map(notebook => ({ value: notebook.id, text: notebook.name }))
]);
const defaultTaskCreateDocumentOptions = computed(() => [
  { value: '', text: t('taskScopeDialog.defaultTaskCreateDocumentSelect') },
  ...defaultTaskCreateDocuments.value.map(document => ({ value: document.id, text: document.name }))
]);

function resolveInitialTab(): TaskScopeDialogTab {
  const requestedTab = props.initialTab;
  if (requestedTab === 'home') {
    return isSidebarPresentation.value ? 'home' : (availableTabs.value[0] || 'task-settings');
  }
  if (requestedTab && availableTabs.value.includes(requestedTab)) {
    return requestedTab;
  }
  return isSidebarPresentation.value ? 'home' : (availableTabs.value[0] || 'task-settings');
}

function normalizeOptionIds(ids: string[] | undefined, options: TaskScopeDisplayOption[]): string[] {
  const optionIds = options.map(option => option.id);
  const optionIdSet = new Set(optionIds);
  const normalized = Array.from(new Set((ids || []).filter(id => optionIdSet.has(id))));
  return [
    ...normalized,
    ...optionIds.filter(id => !normalized.includes(id))
  ];
}

function formatKeywordText(values: readonly string[] | undefined): string {
  return Array.isArray(values) ? values.join(', ') : '';
}

function parseKeywordText(value: string, minLength: number): string[] {
  const seen = new Set<string>();
  return (value || '')
    .split(/[,，\n]/)
    .map(item => item.trim())
    .filter(item => item.length >= minLength)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function buildDateRecognitionKeywords(): TaskDateKeywordConfig {
  return {
    start: parseKeywordText(localStartKeywordsText.value, 2),
    due: parseKeywordText(localDueKeywordsText.value, 2),
    range: parseKeywordText(localRangeKeywordsText.value, 1),
    afternoon: parseKeywordText(localAfternoonKeywordsText.value, 2)
  };
}

function syncLocalSelection(resetActiveTab = false): void {
  autoSaveReady.value = false;
  const visibleNotebookIds = new Set(props.notebooks.map(notebook => notebook.id));
  localExcludedNotebookIds.value = normalizeNotebookIds(props.excludedNotebookIds).filter(id => visibleNotebookIds.has(id));
  localShowCompletedTasks.value = props.showCompletedTasks !== false;
  localAutoRecognizeTaskDate.value = props.autoRecognizeTaskDate === true;
  localTaskCompletionSoundEnabled.value = props.taskCompletionSoundEnabled !== false;
  localStartKeywordsText.value = formatKeywordText(props.dateRecognitionKeywords?.start);
  localDueKeywordsText.value = formatKeywordText(props.dateRecognitionKeywords?.due);
  localRangeKeywordsText.value = formatKeywordText(props.dateRecognitionKeywords?.range);
  localAfternoonKeywordsText.value = formatKeywordText(props.dateRecognitionKeywords?.afternoon);
  localShowDocumentGroupNotebookPath.value = props.showDocumentGroupNotebookPath !== false;
  localDocumentGroups.value = cloneDocumentGroups(props.documentGroups || []);
  localTaskGroups.value = (props.taskGroups || []).map(group => ({ ...group }));
  localGoals.value = cloneGoals(props.goals || []);
  localHiddenTaskViewIds.value = normalizeOptionIds(props.hiddenTaskViewIds || [], taskViewOptionIds.value.map(id => ({ id, label: id })))
    .filter(id => (props.hiddenTaskViewIds || []).includes(id));
  localHiddenSidebarSectionIds.value = normalizeOptionIds(props.hiddenSidebarSectionIds || [], sidebarSectionOptions.value)
    .filter(id => (props.hiddenSidebarSectionIds || []).includes(id));
  localSidebarSectionOrder.value = normalizeOptionIds(props.sidebarSectionOrder || [], sidebarSectionOptions.value);
  localDefaultTaskCreateTarget.value = normalizeDefaultTaskCreateTarget(props.defaultTaskCreateTarget);
  localDefaultTaskCreateNotebook.value = normalizeDefaultTaskCreateNotebook(props.defaultTaskCreateNotebook);
  localDefaultTaskCreateDocument.value = typeof props.defaultTaskCreateDocument === 'string'
    ? props.defaultTaskCreateDocument.trim()
    : '';
  localMicroBreakEnabled.value = props.focusSettings?.microBreakEnabled === true;
  localMicroBreakPopup.value = props.focusSettings?.microBreakPopup !== false;
  localMicroBreakSystemNotification.value = props.focusSettings?.microBreakSystemNotification === true;
  localMicroBreakSound.value = props.focusSettings?.microBreakSound !== false;
  localMicroBreakMinIntervalMinutes.value = normalizeMicroBreakInterval(props.focusSettings?.microBreakMinIntervalMinutes, 3);
  localMicroBreakMaxIntervalMinutes.value = normalizeMicroBreakInterval(props.focusSettings?.microBreakMaxIntervalMinutes, 5);
  localMicroBreakDurationSeconds.value = normalizeMicroBreakDuration(props.focusSettings?.microBreakDurationSeconds);
  localShortBreakPopup.value = props.focusSettings?.shortBreakPopup === true;
  localFocusCompletePopup.value = props.focusSettings?.focusCompletePopup === true;
  localCheckinNotePrompt.value = props.focusSettings?.checkinNotePrompt === true;
  localCustomWhiteNoiseFile.value = props.focusSettings?.customWhiteNoiseFile || '';
  localCustomCompletionSoundFile.value = props.focusSettings?.customCompletionSoundFile || '';
  localCustomMicroBreakSoundFile.value = props.focusSettings?.customMicroBreakSoundFile || '';
  localCustomWhiteNoiseVolume.value = normalizeCustomAudioVolume(props.focusSettings?.customWhiteNoiseVolume);
  localCustomCompletionSoundVolume.value = normalizeCustomAudioVolume(props.focusSettings?.customCompletionSoundVolume);
  localCustomMicroBreakSoundVolume.value = normalizeCustomAudioVolume(props.focusSettings?.customMicroBreakSoundVolume);
  normalizeMicroBreakIntervals();
  if (resetActiveTab) {
    activeTab.value = resolveInitialTab();
  }
  void nextTick(() => { autoSaveReady.value = true; });
}

function normalizeMicroBreakInterval(value: number | undefined, fallback: number): number {
  return Math.max(1, Math.min(15, Math.round(Number(value) || fallback)));
}

function normalizeMicroBreakDuration(value: number | undefined): number {
  return Math.max(1, Math.min(300, Math.floor(Number(value) || 10)));
}

function normalizeCustomAudioVolume(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(value!, 1)) : 0.3;
}

function normalizeMicroBreakIntervals(): void {
  localMicroBreakMinIntervalMinutes.value = normalizeMicroBreakInterval(localMicroBreakMinIntervalMinutes.value, 3);
  localMicroBreakMaxIntervalMinutes.value = Math.max(
    localMicroBreakMinIntervalMinutes.value,
    normalizeMicroBreakInterval(localMicroBreakMaxIntervalMinutes.value, 5)
  );
}

function updateMicroBreakInterval(boundary: 'min' | 'max', event: Event): void {
  const selectedIndex = Math.max(0, Math.min(
    microBreakIntervalMarks.length - 1,
    Math.floor(Number((event.target as HTMLInputElement).value) || 0)
  ));
  const nextMinIndex = boundary === 'min'
    ? Math.min(selectedIndex, microBreakMaxIntervalIndex.value)
    : microBreakMinIntervalIndex.value;
  const nextMaxIndex = boundary === 'max'
    ? Math.max(selectedIndex, microBreakMinIntervalIndex.value)
    : microBreakMaxIntervalIndex.value;
  localMicroBreakMinIntervalMinutes.value = microBreakIntervalMarks[nextMinIndex];
  localMicroBreakMaxIntervalMinutes.value = microBreakIntervalMarks[nextMaxIndex];
}

type CustomAudioKind = 'whiteNoise' | 'completion' | 'microBreak';
const CUSTOM_AUDIO_DIRECTORY = '/data/storage/petal/pinch/audio';
const CUSTOM_AUDIO_FILE_BASE_NAMES: Record<CustomAudioKind, string> = {
  whiteNoise: 'custom-white-noise',
  completion: 'custom-completion',
  microBreak: 'custom-micro-break'
};
const KNOWN_AUDIO_EXTENSIONS = new Set(['mp3', 'ogg', 'wav', 'm4a', 'aac', 'flac', 'webm', 'opus']);

function getCustomAudioFileName(kind: CustomAudioKind, file: File, extension: string): string {
  const rawBaseName = file.name.replace(/\.[^.]+$/, '').trim();
  const baseName = rawBaseName
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'audio';
  return `${CUSTOM_AUDIO_FILE_BASE_NAMES[kind]}-${baseName}.${extension}`;
}

function getSelectedCustomAudioFile(kind: CustomAudioKind): string {
  if (kind === 'whiteNoise') return localCustomWhiteNoiseFile.value;
  if (kind === 'completion') return localCustomCompletionSoundFile.value;
  return localCustomMicroBreakSoundFile.value;
}

function getCustomAudioVolume(kind: CustomAudioKind): number {
  if (kind === 'whiteNoise') return localCustomWhiteNoiseVolume.value;
  if (kind === 'completion') return localCustomCompletionSoundVolume.value;
  return localCustomMicroBreakSoundVolume.value;
}

function selectCustomAudio(kind: CustomAudioKind, fileName: string): void {
  if (kind === 'whiteNoise') localCustomWhiteNoiseFile.value = fileName;
  if (kind === 'completion') localCustomCompletionSoundFile.value = fileName;
  if (kind === 'microBreak') localCustomMicroBreakSoundFile.value = fileName;
}

async function loadCustomAudioFiles(): Promise<void> {
  try {
    const result = await readDir(CUSTOM_AUDIO_DIRECTORY);
    const entries = Array.isArray(result) ? result : [];
    const files = entries.map((entry: any) => String(entry.name || '')).filter(Boolean);
    const next = {} as Record<CustomAudioKind, CustomAudioFile[]>;
    (Object.keys(CUSTOM_AUDIO_FILE_BASE_NAMES) as CustomAudioKind[]).forEach((kind) => {
      const prefix = `${CUSTOM_AUDIO_FILE_BASE_NAMES[kind]}-`;
      next[kind] = files
        .filter(fileName => fileName.startsWith(prefix) && /\.[a-z0-9]{1,10}$/i.test(fileName))
        .map(fileName => ({
          fileName,
          label: fileName.slice(prefix.length).replace(/\.[^.]+$/, '')
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    });
    customAudioFiles.value = next;
  } catch (error) {
    console.error('[TaskScopeDialog] Failed to load custom audio files:', error);
  }
}

function getCustomAudioExtension(file: File): string | null {
  const matched = file.name.toLowerCase().match(/\.([a-z0-9]{1,10})$/);
  const extension = matched?.[1] || '';
  if (extension) {
    return extension;
  }
  const mimeSubtype = file.type.toLowerCase().match(/^audio\/([a-z0-9-]{1,10})$/)?.[1];
  if (mimeSubtype) {
    return mimeSubtype;
  }
  return null;
}

async function uploadCustomAudio(kind: CustomAudioKind, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const extension = getCustomAudioExtension(file);
  if (!file.type.startsWith('audio/') && !KNOWN_AUDIO_EXTENSIONS.has(extension || '')) return;

  if (!extension) return;
  const fileName = getCustomAudioFileName(kind, file, extension);
  await putFile(`${CUSTOM_AUDIO_DIRECTORY}/${fileName}`, false, file);
  selectCustomAudio(kind, fileName);
  await loadCustomAudioFiles();
}

async function deleteCustomAudio(kind: CustomAudioKind, fileName: string): Promise<void> {
  if (!window.confirm(`${t('common.delete')} “${fileName}”？`)) return;
  stopCustomAudioPreview();
  await removeFile(`${CUSTOM_AUDIO_DIRECTORY}/${fileName}`);
  if (getSelectedCustomAudioFile(kind) === fileName) selectCustomAudio(kind, '');
  await loadCustomAudioFiles();
}

function stopCustomAudioPreview(): void {
  if (previewAudio.value) {
    previewAudio.value.pause();
    previewAudio.value.currentTime = 0;
    previewAudio.value = null;
  }
  previewingAudioFile.value = '';
  previewingAudioKind.value = null;
}

function updateCustomAudioPreviewVolume(kind: CustomAudioKind): void {
  if (previewAudio.value && previewingAudioKind.value === kind) {
    previewAudio.value.volume = getCustomAudioVolume(kind);
  }
}

function isPreviewingCustomAudio(kind: CustomAudioKind, fileName: string): boolean {
  return previewingAudioKind.value === kind && previewingAudioFile.value === fileName;
}

async function getCustomAudioPreviewUrl(kind: CustomAudioKind, fileName: string): Promise<string | null> {
  if (fileName) return getCustomFocusAudioUrl(fileName);
  if (kind === 'whiteNoise') return '/plugins/pinch/audio/rain.ogg';
  return '/plugins/pinch/audio/correct.mp3';
}

async function toggleCustomAudioPreview(kind: CustomAudioKind, fileName: string): Promise<void> {
  if (isPreviewingCustomAudio(kind, fileName)) {
    stopCustomAudioPreview();
    return;
  }
  stopCustomAudioPreview();
  const url = await getCustomAudioPreviewUrl(kind, fileName);
  if (!url) return;
  const audio = new Audio(url);
  audio.volume = getCustomAudioVolume(kind);
  audio.addEventListener('ended', stopCustomAudioPreview, { once: true });
  previewAudio.value = audio;
  previewingAudioFile.value = fileName;
  previewingAudioKind.value = kind;
  void audio.play().catch(stopCustomAudioPreview);
}

function normalizeDefaultTaskCreateTarget(value: string | undefined): string {
  return value === 'inbox' || value === 'daily-note' || value === 'specified-document' ? value : 'last';
}

function normalizeDefaultTaskCreateNotebook(value: string | undefined): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return defaultTaskCreateNotebookOptions.value.some(option => option.value === normalized) ? normalized : '';
}

function normalizeDefaultTaskCreateDocument(value: string | undefined): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return defaultTaskCreateDocumentOptions.value.some(option => option.value === normalized) ? normalized : '';
}

async function loadDefaultTaskCreateDocuments(): Promise<void> {
  const notebookId = localDefaultTaskCreateNotebook.value;
  if (!notebookId || !props.show) {
    defaultTaskCreateDocuments.value = [];
    return;
  }
  try {
    defaultTaskCreateDocuments.value = await loadFiletreeDocumentTree(notebookId);
  } catch (error) {
    console.warn('[TaskScopeDialog] Failed to load default task create documents:', error);
    defaultTaskCreateDocuments.value = [];
  }
}

function isNotebookEnabled(notebookId: string): boolean {
  return !localExcludedNotebookIds.value.includes(notebookId);
}

function toggleNotebookEnabled(notebookId: string, enabled: boolean): void {
  const current = new Set(localExcludedNotebookIds.value);
  if (enabled) {
    current.delete(notebookId);
  } else {
    current.add(notebookId);
  }
  localExcludedNotebookIds.value = Array.from(current);
}

function clearExcluded(): void {
  localExcludedNotebookIds.value = [];
}

function getTaskViewHiddenIds(id: string): string[] {
  const option = taskViewOptions.value.find(item => item.id === id);
  return option?.hiddenIds?.length ? [...option.hiddenIds] : [id];
}

function isTaskViewVisible(id: string): boolean {
  return getTaskViewHiddenIds(id).some(hiddenId => !localHiddenTaskViewIds.value.includes(hiddenId));
}

function toggleTaskViewVisible(id: string, visible: boolean): void {
  const current = new Set(localHiddenTaskViewIds.value);
  const hiddenIds = getTaskViewHiddenIds(id);
  if (visible) {
    hiddenIds.forEach(hiddenId => current.delete(hiddenId));
  } else {
    const visibleCount = taskViewOptions.value.filter(option =>
      getTaskViewHiddenIds(option.id).some(hiddenId => !current.has(hiddenId))
    ).length;
    if (visibleCount <= 1) {
      return;
    }
    hiddenIds.forEach(hiddenId => current.add(hiddenId));
  }
  localHiddenTaskViewIds.value = Array.from(current);
}

function isSidebarSectionVisible(id: string): boolean {
  return !localHiddenSidebarSectionIds.value.includes(id);
}

function toggleSidebarSectionVisible(id: string, visible: boolean): void {
  const current = new Set(localHiddenSidebarSectionIds.value);
  if (visible) {
    current.delete(id);
  } else {
    current.add(id);
  }
  localHiddenSidebarSectionIds.value = Array.from(current);
}

function moveSidebarSection(id: string, direction: -1 | 1): void {
  const order = normalizeOptionIds(localSidebarSectionOrder.value, sidebarSectionOptions.value);
  const index = order.indexOf(id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= order.length) {
    return;
  }
  const next = [...order];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  localSidebarSectionOrder.value = next;
}

function handleGlobalRecognizeDate(): void {
  if (globalDateRecognizing.value) {
    return;
  }
  emit('global-recognize-date');
}

function handleClose(): void {
  if (lockClose.value) {
    return;
  }
  stopCustomAudioPreview();
  emit('close');
}

function handleOverlayClick(event: MouseEvent): void {
  if (!isSidebarPresentation.value && event.target === event.currentTarget) {
    handleClose();
  }
}

function save(): void {
  stopCustomAudioPreview();
  emit('save', {
    excludedNotebookIds: normalizeNotebookIds(localExcludedNotebookIds.value),
    showCompletedTasks: localShowCompletedTasks.value,
    autoRecognizeTaskDate: localAutoRecognizeTaskDate.value,
    taskCompletionSoundEnabled: localTaskCompletionSoundEnabled.value,
    dateRecognitionKeywords: buildDateRecognitionKeywords(),
    showDocumentGroupNotebookPath: localShowDocumentGroupNotebookPath.value,
    documentGroups: cloneDocumentGroups(localDocumentGroups.value),
    goals: cloneGoals(localGoals.value),
    hiddenTaskViewIds: normalizeOptionIds(localHiddenTaskViewIds.value, taskViewOptionIds.value.map(id => ({ id, label: id })))
      .filter(id => localHiddenTaskViewIds.value.includes(id)),
    hiddenSidebarSectionIds: normalizeOptionIds(localHiddenSidebarSectionIds.value, sidebarSectionOptions.value)
      .filter(id => localHiddenSidebarSectionIds.value.includes(id)),
    sidebarSectionOrder: normalizeOptionIds(localSidebarSectionOrder.value, sidebarSectionOptions.value),
    defaultTaskCreateTarget: normalizeDefaultTaskCreateTarget(localDefaultTaskCreateTarget.value),
    defaultTaskCreateNotebook: normalizeDefaultTaskCreateNotebook(localDefaultTaskCreateNotebook.value),
    defaultTaskCreateDocument: normalizeDefaultTaskCreateDocument(localDefaultTaskCreateDocument.value),
    focusSettings: {
      microBreakEnabled: localMicroBreakEnabled.value,
      microBreakPopup: localMicroBreakPopup.value,
      microBreakSystemNotification: localMicroBreakSystemNotification.value,
      microBreakSound: localMicroBreakSound.value,
      microBreakMinIntervalMinutes: normalizeMicroBreakInterval(localMicroBreakMinIntervalMinutes.value, 3),
      microBreakMaxIntervalMinutes: Math.max(localMicroBreakMinIntervalMinutes.value, normalizeMicroBreakInterval(localMicroBreakMaxIntervalMinutes.value, 5)),
      microBreakDurationSeconds: normalizeMicroBreakDuration(localMicroBreakDurationSeconds.value),
      shortBreakPopup: localShortBreakPopup.value,
      focusCompletePopup: localFocusCompletePopup.value,
      checkinNotePrompt: localCheckinNotePrompt.value,
      customWhiteNoiseFile: localCustomWhiteNoiseFile.value || undefined,
      customWhiteNoiseVolume: normalizeCustomAudioVolume(localCustomWhiteNoiseVolume.value),
      customCompletionSoundFile: localCustomCompletionSoundFile.value || undefined,
      customCompletionSoundVolume: normalizeCustomAudioVolume(localCustomCompletionSoundVolume.value),
      customMicroBreakSoundFile: localCustomMicroBreakSoundFile.value || undefined,
      customMicroBreakSoundVolume: normalizeCustomAudioVolume(localCustomMicroBreakSoundVolume.value)
    }
  });
}

function scheduleAutoSave(): void {
  if (!autoSaveReady.value) return;
  if (autoSaveTimer !== null) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    save();
  }, 400);
}

watch(
  [
    () => props.show,
    () => props.excludedNotebookIds,
    () => props.notebooks,
    () => props.showCompletedTasks,
    () => props.autoRecognizeTaskDate,
    () => props.dateRecognitionKeywords,
    () => props.taskCompletionSoundEnabled,
    () => props.showDocumentGroupNotebookPath,
    () => props.showScopeTab,
    () => props.initialTab,
    () => props.documentGroups,
    () => props.goals,
    () => props.taskGroups,
    () => props.taskViewOptions,
    () => props.hiddenTaskViewIds,
    () => props.sidebarSectionOptions,
    () => props.hiddenSidebarSectionIds,
    () => props.sidebarSectionOrder,
    () => props.defaultTaskCreateTarget,
    () => props.defaultTaskCreateNotebook,
    () => props.defaultTaskCreateDocument,
    () => props.focusSettings
  ],
  ([show, , , , , , , , , initialTab], previousValues) => {
    if (show) {
      const previousShow = previousValues?.[0];
      const previousInitialTab = previousValues?.[9];
      const shouldReset = show !== previousShow || initialTab !== previousInitialTab;
      if (shouldReset) {
        syncLocalSelection(true);
        void loadCustomAudioFiles();
      }
    }
  },
  { immediate: true, deep: true }
);

// Metadata is loaded in the background after the settings page can already be
// opened. Populate the initially empty local copies when that first result
// arrives, without overwriting edits already made in this dialog.
watch(
  [
    () => props.documentGroups,
    () => props.goals,
    () => props.taskGroups
  ],
  ([documentGroups, goals, taskGroups]) => {
    if (!props.show) return;
    if (localDocumentGroups.value.length === 0 && documentGroups?.length) {
      localDocumentGroups.value = cloneDocumentGroups(documentGroups);
    }
    if (localGoals.value.length === 0 && goals?.length) {
      localGoals.value = cloneGoals(goals);
    }
    if (localTaskGroups.value.length === 0 && taskGroups?.length) {
      localTaskGroups.value = taskGroups.map(group => ({ ...group }));
    }
  },
  { deep: true }
);

watch([() => props.show, localDefaultTaskCreateNotebook], () => {
  void loadDefaultTaskCreateDocuments();
}, { immediate: true });

watch([
  localExcludedNotebookIds, localShowCompletedTasks, localAutoRecognizeTaskDate,
  localTaskCompletionSoundEnabled, localStartKeywordsText, localDueKeywordsText,
  localRangeKeywordsText, localAfternoonKeywordsText, localShowDocumentGroupNotebookPath,
  localDocumentGroups, localGoals, localHiddenTaskViewIds, localHiddenSidebarSectionIds,
  localSidebarSectionOrder, localDefaultTaskCreateTarget, localDefaultTaskCreateNotebook,
  localDefaultTaskCreateDocument, localMicroBreakEnabled, localMicroBreakPopup,
  localMicroBreakSystemNotification, localMicroBreakSound, localMicroBreakMinIntervalMinutes,
  localMicroBreakMaxIntervalMinutes, localMicroBreakDurationSeconds, localShortBreakPopup,
  localFocusCompletePopup, localCheckinNotePrompt, localCustomWhiteNoiseFile,
  localCustomCompletionSoundFile, localCustomMicroBreakSoundFile, localCustomWhiteNoiseVolume,
  localCustomCompletionSoundVolume, localCustomMicroBreakSoundVolume
], scheduleAutoSave, { deep: true });
</script>

<style scoped>
.task-scope-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.task-scope-page {
  position: fixed;
  z-index: 4;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  box-sizing: border-box;
  background-color: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));
  border-radius: 12px;
  overflow: hidden;
}

.task-scope-page.is-elevated {
  z-index: 30;
}

.task-scope-page .task-scope-dialog,
.task-scope-page .task-scope-dialog.with-document-groups {
  width: 100%;
  height: 100%;
  max-height: none;
  border: 0;
  border-radius: inherit;
  box-shadow: none;
  background-color: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));
  overflow-y: auto;
}

.task-scope-dialog {
  width: min(460px, calc(100% - 24px));
  max-height: min(70vh, 520px);
  display: flex;
  flex-direction: column;
  background: var(--b3-theme-background);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--b3-border-color);
}

.task-scope-dialog.with-document-groups {
  width: min(640px, calc(100% - 24px));
  height: min(80vh, 600px);
  max-height: min(80vh, 600px);
  overflow: hidden;
}

/* The editor dialog keeps every settings category one click away. Sidebar
 * settings retain the original home-and-detail navigation. */
.task-scope-dialog:not(.is-sidebar-presentation) {
  width: min(900px, calc(100% - 24px));
  height: min(80vh, 640px);
  max-height: min(80vh, 640px);
  overflow: hidden;
}

.task-scope-dialog:not(.is-sidebar-presentation).with-document-groups {
  width: min(900px, calc(100% - 24px));
  height: min(80vh, 640px);
  max-height: min(80vh, 640px);
}

.task-scope-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
}

.task-scope-dialog:not(.is-sidebar-presentation) .task-scope-header {
  padding: 0;
}

.task-scope-header-side {
  display: flex;
  flex: 0 0 196px;
  box-sizing: border-box;
  align-items: center;
  min-width: 0;
  min-height: 50px;
  padding: 0 14px;
  background: var(--b3-theme-background);
}

.task-scope-header-main {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  min-height: 50px;
  padding: 0 14px;
  background: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));
}

.task-scope-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.task-scope-side-nav {
  display: flex;
  flex: 0 0 196px;
  box-sizing: border-box;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  overflow-y: auto;
  background: var(--b3-theme-background);
}

.task-scope-side-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--b3-theme-on-background);
  cursor: pointer;
  font-size: 14px;
  text-align: left;
}

.task-scope-side-nav-item:hover {
  background: var(--b3-list-hover);
}

.task-scope-side-nav-item.active {
  background: var(--b3-list-hover);
}

.task-scope-side-nav-item .task-scope-home-item-icon {
  opacity: 0.8;
}

.task-scope-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.task-scope-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 0;
  border: 0;
  background: transparent;
  color: var(--b3-theme-on-background);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}

.task-scope-home {
  flex: 0 0 auto;
  min-height: max-content;
  gap: 16px;
  padding: 16px 14px;
}

.task-scope-home-group {
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 16px;
  background: var(--b3-theme-background);
}

.task-scope-home-item {
  flex: 0 0 52px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 52px;
  padding: 0 18px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--b3-theme-on-background);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
}

.task-scope-home-item-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.task-scope-home-item-icon {
  display: inline-flex;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.task-scope-home-item-icon svg {
  display: block;
}

.task-scope-home-item + .task-scope-home-item::before {
  position: absolute;
  top: 0;
  right: 18px;
  left: 18px;
  height: 1px;
  background: var(--b3-border-color);
  content: '';
}

.task-scope-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 10px 14px 0;
  padding: 8px 10px;
  border-radius: 16px;
  background: var(--pinch-background4);
  box-shadow: inset 0 0 0 1px var(--pinch-color4);
  font-size: 12px;
  color: var(--pinch-group-color4);
  opacity: 0.5;
}

.task-scope-hint-icon {
  align-self: flex-start;
  flex: 0 0 auto;
  margin-top: 0;
  color: var(--pinch-group-color4);
  opacity: 0.5;
}

.task-scope-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.task-scope-dialog:not(.is-sidebar-presentation) .task-scope-scroll {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  background: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));
}

.task-scope-scroll .task-scope-content {
  flex: 0 0 auto;
  min-height: auto;
  overflow: visible;
}

/* In the editor dialog, ordinary settings pages occupy the remaining grid row
 * and scroll within it. Goal and document-group pages keep their panel-owned
 * split layouts below. */
.task-scope-dialog:not(.is-sidebar-presentation) .task-scope-scroll .task-scope-content:not(.goals-tab-content):not(.document-groups-tab-content) {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.task-scope-dialog:not(.is-sidebar-presentation) .goals-tab-content,
.task-scope-dialog:not(.is-sidebar-presentation) .document-groups-tab-content {
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.task-scope-dialog:not(.is-sidebar-presentation) .goals-tab-content > :deep(.goal-panel-root),
.task-scope-dialog:not(.is-sidebar-presentation) .document-groups-tab-content > :deep(.document-group-panel-root) {
  flex: 1 1 auto;
  min-height: 0;
}

.task-scope-dialog:not(.is-sidebar-presentation) .goals-tab-content > :deep(.goal-panel-root.is-split-layout),
.task-scope-dialog:not(.is-sidebar-presentation) .document-groups-tab-content > :deep(.document-group-panel-root.is-split-layout) {
  position: absolute;
  inset: 0;
}

.task-scope-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 10px 14px 4px 14px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  min-width: 0;
}

.task-scope-tabs::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.task-scope-tab {
  flex: 0 0 auto;
  border: 1px solid transparent;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.task-scope-tab:hover {
  background: var(--b3-theme-background);
  border-color: var(--b3-border-color);
}

.task-scope-tab.active {
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
}

.task-scope-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.scope-tab-content {
  gap: 12px;
  padding: 8px 14px 12px;
  overflow-y: auto;
}

.document-groups-tab-content {
  padding-top: 8px;
  min-width: 0;
  overflow-y: auto;
}

.goals-tab-content {
  padding-top: 8px;
  min-width: 0;
  overflow-y: auto;
}

.tags-tab-content {
  padding: 8px 14px 12px;
}

.display-tab-content {
  gap: 12px;
  padding: 8px 14px 12px;
  overflow-y: auto;
}

/* Keep display settings consistent with the grouped cards on the settings home. */
.display-tab-content .task-scope-display-section {
  flex: 0 0 auto;
  overflow: hidden;
  border: 0;
  border-radius: 16px;
  background: var(--b3-theme-background);
}

.display-tab-content .task-scope-display-title {
  padding: 12px 18px 6px;
  background: transparent;
}

.display-tab-content .task-scope-display-grid {
  display: block;
}

.display-tab-content .task-scope-display-item {
  flex: 0 0 52px;
  position: relative;
  min-height: 52px;
  padding: 0 18px;
}

.display-tab-content .task-scope-display-item + .task-scope-display-item,
.display-tab-content .task-scope-display-grid .task-scope-display-item + .task-scope-display-item,
.display-tab-content .task-scope-display-grid .task-scope-display-item:nth-child(n + 3) {
  border: 0;
}

.display-tab-content .task-scope-display-item + .task-scope-display-item::before {
  position: absolute;
  top: 0;
  right: 18px;
  left: 18px;
  height: 1px;
  background: var(--b3-border-color);
  content: '';
}

.display-tab-content .task-scope-display-grid .task-scope-display-item:nth-child(even) {
  border-left: 0;
}

.display-tab-content .task-scope-auto-item {
  flex: 0 0 auto;
  position: relative;
  padding: 12px 18px;
}

.display-tab-content .task-scope-auto-item + .task-scope-auto-item {
  border: 0;
}

.display-tab-content .task-scope-auto-item + .task-scope-auto-item::before {
  position: absolute;
  top: 0;
  right: 18px;
  left: 18px;
  height: 1px;
  background: var(--b3-border-color);
  content: '';
}

.task-settings-tab-content {
  gap: 12px;
  padding: 8px 14px 12px;
  overflow-y: auto;
}

/* Task settings use the same grouped-card language as the settings home. */
.task-settings-tab-content .task-scope-auto-setting,
.task-settings-tab-content .task-scope-display-section {
  flex: 0 0 auto;
  overflow: hidden;
  border: 0;
  border-radius: 16px;
  background: var(--b3-theme-background);
}

.task-settings-tab-content .task-scope-auto-setting {
  border-top: 0;
}

.task-settings-tab-content .task-scope-auto-item {
  position: relative;
  flex: 0 0 auto;
  min-height: 52px;
  padding: 10px 18px;
}

.task-settings-tab-content .task-scope-auto-item + .task-scope-auto-item,
.task-settings-tab-content .task-scope-auto-item + .task-scope-keyword-settings,
.task-settings-tab-content .task-scope-display-item + .task-scope-display-item {
  border: 0;
}

.task-settings-tab-content .task-scope-auto-item + .task-scope-auto-item::before,
.task-settings-tab-content .task-scope-auto-item + .task-scope-keyword-settings::before,
.task-settings-tab-content .task-scope-display-item + .task-scope-display-item::before {
  position: absolute;
  top: 0;
  right: 18px;
  left: 18px;
  height: 1px;
  background: var(--b3-border-color);
  content: '';
}

.task-settings-tab-content .task-scope-keyword-settings {
  position: relative;
  border-top: 0;
  padding: 0 18px 12px;
}

.task-settings-tab-content .task-scope-keyword-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  list-style: none;
}

.task-settings-tab-content .task-scope-keyword-summary::-webkit-details-marker {
  display: none;
}

.task-settings-tab-content .task-scope-keyword-arrow {
  transition: transform 0.18s ease;
}

.task-settings-tab-content .task-scope-keyword-settings[open] .task-scope-keyword-arrow {
  transform: rotate(90deg);
}

.task-settings-tab-content .task-scope-display-title {
  padding: 12px 18px 6px;
  background: transparent;
}

.task-settings-tab-content .task-scope-display-item {
  position: relative;
  flex: 0 0 52px;
  min-height: 52px;
  padding: 0 18px;
}

.pomodoro-settings-tab-content {
  gap: 12px;
  padding: 8px 14px 12px;
  overflow-y: auto;
}

/* Keep pomodoro controls in the same card layout as the rest of settings. */
.pomodoro-settings-tab-content .task-scope-display-section {
  flex: 0 0 auto;
  overflow: hidden;
  border: 0;
  border-radius: 16px;
  background: var(--b3-theme-background);
}

.pomodoro-settings-tab-content .task-scope-display-title {
  padding: 12px 18px 6px;
  background: transparent;
}

.pomodoro-settings-tab-content .task-scope-auto-item,
.pomodoro-settings-tab-content .custom-audio-setting,
.pomodoro-settings-tab-content .micro-break-options {
  position: relative;
  border-top: 0;
}

.pomodoro-settings-tab-content .task-scope-auto-item {
  flex: 0 0 auto;
  min-height: 52px;
  padding: 10px 18px;
}

.pomodoro-settings-tab-content .task-scope-auto-item + .task-scope-auto-item,
.pomodoro-settings-tab-content .task-scope-auto-item + .micro-break-options,
.pomodoro-settings-tab-content .task-scope-auto-item + .custom-audio-setting,
.pomodoro-settings-tab-content .custom-audio-setting + .custom-audio-setting {
  border-top: 0;
}

.pomodoro-settings-tab-content .task-scope-auto-item + .task-scope-auto-item::before,
.pomodoro-settings-tab-content .task-scope-auto-item + .micro-break-options::before,
.pomodoro-settings-tab-content .task-scope-auto-item + .custom-audio-setting::before,
.pomodoro-settings-tab-content .custom-audio-setting + .custom-audio-setting::before {
  position: absolute;
  top: 0;
  right: 18px;
  left: 18px;
  height: 1px;
  background: var(--b3-border-color);
  content: '';
}

.pomodoro-settings-tab-content .micro-break-options,
.pomodoro-settings-tab-content .custom-audio-setting {
  padding: 12px 18px;
}

.micro-break-options {
  display: grid;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid var(--b3-border-color);
}

.micro-break-option,
.micro-break-number {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: var(--b3-theme-on-background);
}

.micro-break-number input {
  width: 64px;
  box-sizing: border-box;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  padding: 4px 6px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.micro-break-interval {
  display: grid;
  gap: 8px;
}

.duration-slider-container {
  display: flex;
  flex-direction: column;
  position: relative;
}

.duration-slider {
  width: 100%;
  height: 3px;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 3px;
  background: var(--b3-list-hover);
  cursor: pointer;
}

.duration-slider::-webkit-slider-thumb {
  width: 20px;
  height: 20px;
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  border-radius: 50%;
  background: #ffcb4c;
  cursor: pointer;
}

.duration-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 50%;
  background: #ffcb4c;
  cursor: pointer;
}

.duration-marks {
  position: relative;
  width: calc(100% - 16px);
  height: 20px;
  margin: 0 auto;
}

.duration-mark {
  position: absolute;
  transform: translateX(-50%);
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  opacity: 0.6;
}

.micro-break-range {
  position: relative;
  height: 20px;
}

.micro-break-range__track,
.micro-break-range__fill {
  position: absolute;
  top: 50%;
  height: 4px;
  transform: translateY(-50%);
  border-radius: 999px;
}

.micro-break-range__track {
  right: 0;
  left: 0;
  background: var(--b3-list-hover);
}

.micro-break-range__fill {
  background: var(--b3-theme-on-background);
}

.micro-break-range__input {
  position: absolute;
  z-index: 1;
  width: 100%;
  height: 20px;
  margin: 0;
  pointer-events: none;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
}

.micro-break-range__input::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  pointer-events: auto;
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  border-radius: 50%;
  background: var(--b3-theme-on-background);
  cursor: pointer;
}

.micro-break-range__input::-moz-range-thumb {
  width: 20px;
  height: 20px;
  pointer-events: auto;
  border: 0;
  border-radius: 50%;
  background: var(--b3-theme-on-background);
  cursor: pointer;
}

.micro-break-range__marks {
  width: 100%;
}

.custom-audio-setting {
  display: grid;
  gap: 8px;
  padding: 10px;
  color: var(--b3-theme-on-background);
  font-size: 13px;
}

.custom-audio-setting + .custom-audio-setting {
  border-top: 1px solid var(--b3-border-color);
}

.custom-audio-setting__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  position: relative;
  min-height: 32px;
  padding-right: 126px;
}

.custom-audio-setting button {
  border: 1px solid var(--b3-border-color);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
}

.custom-audio-actions {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  gap: 6px;
}

.volume-control {
  display: flex;
  align-items: center;
  width: 260px;
  gap: 8px;
  margin-top: 0;
  padding: 0;
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
}

.volume-slider::-webkit-slider-thumb {
  width: 18px;
  height: 18px;
  -webkit-appearance: none;
  appearance: none;
  background: #f98f7a;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  background: #f87a6a;
}

.volume-value {
  min-width: 38px;
  text-align: right;
  font-size: 14px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
}

.custom-audio-upload {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  padding: 3px 7px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
}

.custom-audio-upload input {
  display: none;
}

.custom-audio-option {
  display: inline-flex;
  align-items: center;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 4px 12px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.custom-audio-option:hover {
  background: var(--b3-theme-background);
  border-color: var(--b3-border-color);
}

.custom-audio-option.active {
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
}

.custom-audio-option.active .custom-audio-option__delete {
  color: inherit;
}

.custom-audio-option__delete {
  display: inline;
  margin-left: 8px;
  padding: 0;
  border: 0 !important;
  background: transparent !important;
  color: var(--b3-theme-error);
  font-size: 16px;
  line-height: 12px;
}

.task-scope-display-section {
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
}

.task-scope-display-title {
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-on-surface);
  background: var(--b3-list-hover);
}

.task-scope-display-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.task-scope-display-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  font-size: 13px;
  color: var(--b3-theme-on-background);
}

.task-scope-display-item + .task-scope-display-item {
  border-top: 1px solid var(--b3-border-color);
}

.task-scope-display-grid .task-scope-display-item {
  min-width: 0;
}

.task-scope-display-grid .task-scope-display-item + .task-scope-display-item {
  border-top: none;
}

.task-scope-display-grid .task-scope-display-item:nth-child(n + 3) {
  border-top: 1px solid var(--b3-border-color);
}

.task-scope-display-grid .task-scope-display-item:nth-child(even) {
  border-left: 1px solid var(--b3-border-color);
}

.task-scope-setting-select {
  min-width: 160px;
  max-width: 220px;
}

.task-scope-display-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.task-scope-order-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.task-scope-order-btn.up .icon {
  transform: rotate(180deg);
}

.task-scope-order-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.task-scope-summary {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.75;
}

.task-scope-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.task-scope-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 10px 14px;
  border-bottom: 1px solid var(--b3-border-color);
}

.task-scope-auto-setting {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--b3-border-color);
}

.task-scope-auto-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
}

.task-scope-auto-item + .task-scope-auto-item {
  border-top: 1px solid var(--b3-border-color);
}

.task-scope-keyword-settings {
  border-top: 1px solid var(--b3-border-color);
  padding: 10px 14px 12px;
}

.task-scope-keyword-summary {
  cursor: pointer;
  font-size: 13px;
  color: var(--b3-theme-on-background);
  user-select: none;
}

.task-scope-keyword-desc {
  margin: 8px 0 10px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--b3-theme-on-surface);
  opacity: 0.78;
}

.task-scope-keyword-field {
  display: grid;
  gap: 5px;
  margin-top: 9px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.task-scope-keyword-textarea {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  resize: vertical;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  padding: 6px 8px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  font: inherit;
  line-height: 1.45;
}

.task-scope-auto-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.task-scope-auto-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.task-scope-extra-label {
  font-size: 13px;
  color: var(--b3-theme-on-background);
}

.task-scope-auto-desc {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  opacity: 0.78;
  line-height: 1.45;
}

.task-scope-inline-btn {
  font-size: 12px;
  line-height: 1;
  border: 1px solid var(--b3-border-color);
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  cursor: pointer;
  white-space: nowrap;
}

.task-scope-inline-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.task-scope-list {
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 16px;
  background: var(--b3-theme-background);
}

.task-scope-item {
  flex: 0 0 52px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--b3-theme-on-background);
  min-height: 52px;
  padding: 0 18px;
  cursor: pointer;
}

.task-scope-item + .task-scope-item::before {
  position: absolute;
  top: 0;
  right: 18px;
  left: 18px;
  height: 1px;
  background: var(--b3-border-color);
  content: '';
}

.task-scope-toggle {
  flex: 0 0 auto;
}

.task-scope-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-scope-empty {
  font-size: 13px;
  color: var(--b3-theme-on-surface);
  opacity: 0.8;
  padding: 8px 0;
}

.task-scope-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 14px;
}

.task-scope-action-setting {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  min-width: 0;
}

.task-scope-btn.plain {
  background: var(--b3-list-hover);
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
}

.task-scope-btn.confirm {
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
  color: var(--b3-theme-on-background);
  fill: var(--b3-theme-on-background);
}

.icon-button:hover {
  background-color: var(--b3-list-hover);
  border-radius: 4px;
}

@media (max-width: 900px) {
  .task-scope-dialog.with-document-groups {
    width: calc(100% - 20px);
    height: calc(100vh - 24px);
    max-height: calc(100vh - 24px);
  }
}
</style>
