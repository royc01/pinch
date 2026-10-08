<template>
  <section class="stats-panel stats-summary-panel">
    <div class="summary-header">
      <div class="panel-head-copy">
        <div class="panel-head-top">
          <h3>{{ t('personalStats.summaryTitle') }}</h3>
          <div class="summary-period-actions">
            <button type="button" class="summary-period-nav" :aria-label="t('personalStats.summaryPreviousPeriod')" :disabled="saving || deleting" @click="shiftPeriod(-1)">
              <Icon name="chevronLeft" :width="16" :height="16" aria-hidden="true" focusable="false" />
            </button>
            <div ref="periodPickerRef" class="summary-period-picker">
              <button ref="periodChipRef" type="button" class="panel-chip" :title="periodDateRange" :disabled="saving || deleting" aria-haspopup="dialog" :aria-expanded="periodBrowserOpen" @click="openPeriodBrowser">
                {{ periodLabel }}
                <Icon name="chevronDown" :width="12" :height="12" aria-hidden="true" />
              </button>
              <div v-if="periodBrowserOpen" ref="periodBrowserRef" class="summary-period-browser" :style="periodBrowserStyle" role="dialog" @keydown="handlePeriodBrowserKeydown" :aria-label="t('personalStats.summaryPeriodBrowser')" tabindex="-1">
                <div class="summary-period-dialog-head">
                  <h3>{{ t('personalStats.summaryPeriodBrowser') }}</h3>
                  <button type="button" class="summary-year-nav summary-period-close" :aria-label="t('common.close')" @click="closePeriodBrowser()">
                    <Icon name="close" :width="16" :height="16" aria-hidden="true" />
                  </button>
                </div>
                <div class="summary-period-browser-head">
                  <div class="summary-year-actions">
                    <button type="button" class="summary-year-nav" :disabled="saving || deleting" :aria-label="t('personalStats.summaryPreviousYear')" @click="browserYear--">
                      <Icon name="chevronLeft" :width="16" :height="16" aria-hidden="true" />
                    </button>
                    <strong>{{ formatTemplate('personalStats.summaryYearTemplate', { year: browserYear }) }}</strong>
                    <button type="button" class="summary-year-nav" :disabled="saving || deleting || browserYear >= currentPeriodYear" :aria-label="t('personalStats.summaryNextYear')" @click="browserYear++">
                      <Icon name="chevronRight" :width="16" :height="16" aria-hidden="true" />
                    </button>
                  </div>
                  <span v-if="summaryHistoryLoading" class="summary-history-status" role="status">{{ t('personalStats.summaryHistoryLoading') }}</span>
                  <button v-else-if="summaryHistoryError" type="button" class="panel-link-btn" @click="refreshSummaryHistory">{{ t('personalStats.summaryHistoryRetry') }}</button>
                  <span v-else class="summary-history-legend"><span class="summary-saved-dot" aria-hidden="true"></span>{{ t('personalStats.summaryHasDocument') }}</span>
                </div>
                <div ref="browserGridRef" class="summary-period-grid" :class="{ 'is-month': periodKind === 'month' }">
                  <button
                    v-for="entry in browserPeriods"
                    :key="entry.key"
                    type="button"
                    class="summary-period-item"
                    :class="{ 'has-summary': savedPeriodKeys.has(entry.key), selected: entry.offset === periodOffset }"
                    :disabled="saving || deleting || entry.future"
                    :aria-current="entry.offset === periodOffset ? 'date' : undefined"
                    :aria-label="`${browserPeriodLabel(entry)}${savedPeriodKeys.has(entry.key) ? ` · ${t('personalStats.summaryHasDocument')}` : ''}`"
                    @click="jumpToPeriod(entry)"
                  >
                    <span class="summary-period-item-label">{{ formatTemplate(periodKind === 'month' ? 'personalStats.summaryBrowserMonthTemplate' : 'personalStats.summaryBrowserWeekTemplate', { number: entry.number }) }}<span v-if="savedPeriodKeys.has(entry.key)" class="summary-saved-dot" aria-hidden="true"></span></span>
                    <small v-if="periodKind === 'week'">{{ browserPeriodRange(entry) }}</small>
                  </button>
                </div>
              </div>
            </div>
            <button type="button" class="panel-link-btn summary-current-period" :disabled="saving || deleting || (periodOffset === 0 && browserYear === currentPeriodYear)" @click="resetPeriod">
              {{ t('personalStats.summaryCurrentPeriod') }}
            </button>
            <button type="button" class="summary-period-nav" :aria-label="t('personalStats.summaryNextPeriod')" :disabled="saving || deleting || periodOffset >= 0" @click="shiftPeriod(1)">
              <Icon name="chevronRight" :width="16" :height="16" aria-hidden="true" focusable="false" />
            </button>
            <div class="summary-notebook-picker">
              <select v-model="selectedNotebookId" class="summary-notebook-select" :disabled="saving || notebooksLoading" :aria-label="t('personalStats.summaryNotebookSelectAria')">
                <option value="" disabled>{{ notebooksLoading ? t('personalStats.summaryLoadingNotebooks') : t('personalStats.summarySelectNotebook') }}</option>
                <option v-for="notebook in availableNotebooks" :key="notebook.id" :value="notebook.id">{{ notebook.name }}</option>
              </select>
              <Icon name="chevronDown" class="summary-notebook-arrow" :width="14" :height="14" aria-hidden="true" focusable="false" />
            </div>
            <button type="button" class="panel-link-btn summary-save-button" :disabled="saving || notebooksLoading || summaryDocumentLoading || !!savedSummaryDocumentId || !selectedNotebookId" @click="saveAsDocument">
              {{ saveButtonLabel }}
            </button>
          </div>
        </div>
        <p>{{ formatTemplate('personalStats.summaryScopeTemplate', { scope: scopeLabel }) }}</p>
        <p class="summary-save-hint">{{ t(savedSummaryDocumentId ? 'personalStats.summarySavedDocumentHint' : 'personalStats.summarySaveDocumentHint') }}</p>
      </div>
      <div class="summary-mode-switch" role="tablist" :aria-label="t('personalStats.summaryPeriodTypeAria')">
        <button
          v-for="option in periodOptions"
          :key="option.value"
          type="button"
          role="tab"
          class="summary-mode-chip"
          :class="{ active: periodKind === option.value }"
          :aria-selected="periodKind === option.value"
          :disabled="saving || deleting"
          @click="selectPeriodKind(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>



    <div v-if="isLoading" class="panel-empty">{{ t('personalStats.summaryLoading') }}</div>
    <template v-else>
      <div class="summary-comparison">
        <span>{{ t('personalStats.summaryComparisonLabel') }}</span>
        <span>{{ comparisonText }}</span>
      </div>

      <div class="mini-stat-grid summary-stat-grid">
        <article class="mini-stat-card">
          <span class="mini-stat-label">{{ t('personalStats.summaryCompletedTasks') }}</span>
          <strong class="mini-stat-value">{{ completedTasks.length }}</strong>
          <small>{{ formatTemplate('personalStats.summaryCreatedTasksTemplate', { count: createdTaskCount }) }}</small>
        </article>
        <article class="mini-stat-card">
          <span class="mini-stat-label">{{ t('personalStats.focusDuration') }}</span>
          <strong class="mini-stat-value">{{ formatMinutes(focusMinutes) }}</strong>
          <small>{{ formatTemplate('personalStats.summaryFocusSessionsTemplate', { count: focusSessions }) }}</small>
        </article>
        <article class="mini-stat-card">
          <span class="mini-stat-label">{{ t('personalStats.habitCheckins') }}</span>
          <strong class="mini-stat-value">{{ habitRate }}%</strong>
          <small>{{ formatTemplate('personalStats.summaryHabitProgressTemplate', { completed: habitCompletions, total: habitTarget }) }}</small>
        </article>
        <article class="mini-stat-card">
          <span class="mini-stat-label">{{ t('personalStats.summaryUnfinishedTasks') }}</span>
          <strong class="mini-stat-value">{{ unfinishedCreatedTasks.length }}</strong>
          <small>{{ t('personalStats.summaryCreatedInPeriod') }}</small>
        </article>
      </div>

      <details class="summary-task-details" open>
        <summary>{{ t('personalStats.summaryTaskDetails') }}</summary>
        <div class="summary-section-grid">
          <section class="summary-section">
            <div class="list-block-head">
              <span>{{ t('personalStats.summaryCompletedTitle') }}</span>
            </div>
            <div v-if="completedTasks.length" class="summary-task-list">
              <button v-for="task in completedTasks.slice(0, 5)" :key="task.id" type="button" class="summary-task-row" :disabled="!task.blockId" @click="emit('open-task', task)">
                <span class="summary-task-check">✓</span>
                <TaskTitleRich class="summary-task-title" :title="task.title" :fallback="t('personalStats.untitledTask')" />
                <small>{{ formatTaskDate(task.completedAt) }}</small>
              </button>
            </div>
            <div v-else class="inline-empty">{{ t('personalStats.summaryNoCompletedTasks') }}</div>
          </section>

          <section class="summary-section">
            <div class="list-block-head">
              <span>{{ t('personalStats.summaryUnfinishedTitle') }}</span>
            </div>
            <div v-if="unfinishedCreatedTasks.length" class="summary-task-list">
              <button v-for="task in unfinishedCreatedTasks.slice(0, 5)" :key="task.id" type="button" class="summary-task-row attention" :disabled="!task.blockId" @click="emit('open-task', task)">
                <span class="summary-task-dot" aria-hidden="true"></span>
                <TaskTitleRich class="summary-task-title" :title="task.title" :fallback="t('personalStats.untitledTask')" />
                <small>{{ task.dueDate || t('personalStats.summaryNoDueDate') }}</small>
              </button>
            </div>
            <div v-else class="inline-empty">{{ t('personalStats.summaryNoUnfinishedTasks') }}</div>
          </section>
        </div>
      </details>

      <section v-if="summaryRecordCount" class="summary-records">
        <div class="list-block-head summary-records-header">
          <span>{{ t('personalStats.summaryRecordsTitle') }}</span>
          <span class="list-block-subtle">{{ summaryRecordCount }}</span>
        </div>
        <div class="summary-record-grid">
          <section class="summary-record-section summary-focus-records">
            <div class="list-block-head"><span>{{ t('personalStats.summaryFocusRecordsTitle') }}</span></div>
            <div v-if="focusSummaryRecords.length" class="summary-record-list">
              <article v-for="record in focusSummaryRecords.slice(0, 8)" :key="record.id" class="summary-record-row">
                <time>{{ formatTaskDate(record.date) }}</time>
                <div>
                  <strong>{{ record.title }}</strong>
                  <p v-if="record.content">{{ record.content }}</p>
                </div>
              </article>
            </div>
            <div v-else class="inline-empty">{{ t('personalStats.summaryNoRecords') }}</div>
          </section>

          <section class="summary-record-section summary-habit-records">
            <div class="list-block-head"><span>{{ t('personalStats.summaryHabitRecordsTitle') }}</span></div>
            <div v-if="habitSummaryRecords.length" class="summary-record-list">
              <article v-for="record in habitSummaryRecords.slice(0, 8)" :key="record.id" class="summary-record-row">
                <time>{{ formatTaskDate(record.date) }}</time>
                <div>
                  <strong>{{ record.title }}</strong>
                  <p v-if="record.content">{{ record.content }}</p>
                </div>
              </article>
            </div>
            <div v-else class="inline-empty">{{ t('personalStats.summaryNoRecords') }}</div>
          </section>

          <section class="summary-record-section summary-task-records">
            <div class="list-block-head"><span>{{ t('personalStats.summaryTaskRecordsTitle') }}</span></div>
            <div v-if="taskSummaryRecords.length" class="summary-record-list">
              <article v-for="record in taskSummaryRecords.slice(0, 8)" :key="record.id" class="summary-record-row">
                <time>{{ formatTaskDate(record.date) }}</time>
                <div>
                  <strong>{{ record.title }}</strong>
                  <p v-if="record.content">{{ record.content }}</p>
                </div>
              </article>
            </div>
            <div v-else class="inline-empty">{{ t('personalStats.summaryNoRecords') }}</div>
          </section>

          <section class="summary-record-section summary-manual-records">
            <div class="list-block-head"><span>{{ t('personalStats.summaryManualRecordsTitle') }}</span></div>
            <div v-if="manualSummaryRecords.length" class="summary-record-list">
              <article v-for="record in manualSummaryRecords.slice(0, 8)" :key="record.id" class="summary-record-row">
                <time>{{ formatTaskDate(record.date) }}</time>
                <div>
                  <p>{{ record.content }}</p>
                </div>
              </article>
            </div>
            <div v-else class="inline-empty">{{ t('personalStats.summaryNoRecords') }}</div>
          </section>
        </div>
      </section>

    </template>

    <section v-if="summaryDocumentLoading" class="summary-document-editor">
      <div class="inline-empty">{{ t('personalStats.summaryDocumentLoading') }}</div>
    </section>

    <section v-if="savedSummaryDocumentId" class="summary-document-editor">
      <div class="list-block-head summary-document-header">
        <div class="summary-document-heading">
          <span>{{ t('personalStats.summaryDocumentTitle') }}</span>
          <span class="summary-document-path list-block-subtle" :title="savedSummaryDocumentPath">{{ savedSummaryDocumentPath }}</span>
        </div>
        <div class="summary-document-actions">
          <button type="button" class="panel-link-btn summary-export-receipt" :disabled="deleting || exportingReceipt" @click="exportSummaryReceipt">
            {{ t(exportingReceipt ? 'personalStats.summaryExportingReceipt' : 'personalStats.summaryExportReceipt') }}
          </button>
          <button type="button" class="panel-link-btn summary-open-document" :disabled="deleting" @click="openSummaryDocument">
            {{ t('personalStats.summaryOpenDocument') }}
          </button>
          <button type="button" class="panel-link-btn summary-delete-document" :disabled="deleting" @click="deleteSummaryDocument">
            {{ t('personalStats.summaryDeleteDocument') }}
          </button>
        </div>
      </div>
      <div ref="summaryEditorMountRef" class="summary-document-protyle"></div>
    </section>

    <Teleport to="body">
      <div v-if="receiptPreviewOpen" class="summary-receipt-overlay" role="presentation" @click.self="closeReceiptPreview">
        <section class="summary-receipt-dialog" role="dialog" aria-modal="true" :aria-label="t('personalStats.summaryReceiptPreviewTitle')">
          <header class="summary-receipt-dialog-head">
            <div>
              <h3>{{ t('personalStats.summaryReceiptPreviewTitle') }}</h3>
              <p>{{ t('personalStats.summaryReceiptPreviewHint') }}</p>
            </div>
            <button type="button" class="summary-receipt-close" :aria-label="t('common.close')" @click="closeReceiptPreview">×</button>
          </header>
          <div class="summary-receipt-preview-frame">
            <img v-if="receiptPreviewUrl" :src="receiptPreviewUrl" :alt="t('personalStats.summaryReceiptPreviewTitle')" />
          </div>
          <footer class="summary-receipt-dialog-actions">
            <button type="button" class="panel-link-btn" @click="closeReceiptPreview">{{ t('common.cancel') }}</button>
            <button type="button" class="panel-link-btn summary-receipt-confirm" @click="confirmReceiptExport">{{ t('personalStats.summaryConfirmExportReceipt') }}</button>
          </footer>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { createDocWithMd, getIDsByHPath, getMoodData, getPathByID, lsNotebooks, openBlockById, removeDoc, sql, type DailyFocusRecord, type FocusSessionRecord, type Habit, type Task } from '@/api';
import { getCheckinNoteMonthsInRange, getCheckinNotesForMonths, type CheckinNoteEntry } from '@/checkinNoteRepository';
import Icon from '@/components/Icon.vue';
import TaskTitleRich from '@/components/TaskTitleRich.vue';
import { formatTemplate, useI18n } from '@/composables/useI18n';
import { Protyle, showMessage } from 'siyuan';
import { usePlugin } from '@/main';
import { getTaskTitlePlainText } from '@/utils/taskHtml';
import {
  buildSummaryHabitStats,
  buildSummaryPeriod,
  buildSummaryPeriodList,
  buildSummaryTaskData,
  formatSummaryDateKey,
  isSummaryDateInPeriod,
  getSummaryPeriodKeyFromPath,
  getSummaryPeriodYear,
  summaryDateKey,
  type SummaryPeriodKind,
  type SummaryPeriodEntry
} from '@/utils/personalStatsSummary';
import {
  focusRecordsToLifelogEvents,
  habitsToLifelogEvents,
  moodManualEntriesToLifelogEvents,
  tasksToCompletedLifelogEvents
} from '@/utils/lifelogEvents';
import { getCheckinNoteEventKeys } from '@/utils/checkinNoteEvents';
import type { LifelogEvent } from '@/utils/lifelogEvents';

interface SummaryNotebook {
  id: string;
  name: string;
  closed: boolean;
}

interface SummaryDocument {
  id: string;
  notebookId: string;
  notebookName: string;
  path: string;
}

type SummaryRecordKind = 'focus' | 'habit' | 'task' | 'manual';

interface SummaryRecordItem {
  id: string;
  date: string;
  title: string;
  content?: string;
  kind: SummaryRecordKind;
}

interface SummaryManualRecord extends SummaryRecordItem {
  content: string;
}

const props = withDefaults(defineProps<{
  tasks: Task[];
  habits: Habit[];
  focusRecords: DailyFocusRecord[];
  focusSessionRecords?: FocusSessionRecord[];
  habitsLoading?: boolean;
  focusLoading?: boolean;
  sourceLabel?: string;
  documentLabel?: string;
  notebookId?: string;
}>(), {
  habitsLoading: false,
  focusLoading: false,
  focusSessionRecords: () => [],
  sourceLabel: '',
  documentLabel: '',
  notebookId: ''
});

const emit = defineEmits<{
  (event: 'open-task', task: Task): void;
}>();

const { t } = useI18n();
const saving = ref(false);
const notebooksLoading = ref(false);
const availableNotebooks = ref<SummaryNotebook[]>([]);
const selectedNotebookId = ref(props.notebookId || '');
const savedSummaryDocument = ref<SummaryDocument | null>(null);
const savedSummaryDocumentId = computed(() => savedSummaryDocument.value?.id || '');
const savedSummaryDocumentPath = computed(() => savedSummaryDocument.value
  ? `/${savedSummaryDocument.value.notebookName}${savedSummaryDocument.value.path}`
  : '');
const summaryDocumentLoading = ref(false);
const exportingReceipt = ref(false);
const receiptPreviewOpen = ref(false);
const receiptPreviewUrl = ref('');
const receiptPreviewBlob = ref<Blob | null>(null);
const receiptPreviewFileName = ref('');
const deleting = ref(false);
const summaryEditorMountRef = ref<HTMLElement | null>(null);
let summaryProtyle: Protyle | null = null;
let summaryDocumentRequestId = 0;
let isUnmounted = false;
const periodKind = ref<SummaryPeriodKind>('week');
const periodOffset = ref(0);
const browserYear = ref(getSummaryPeriodYear('week', buildSummaryPeriod('week').start));
const browserGridRef = ref<HTMLElement | null>(null);
const periodBrowserOpen = ref(false);
const periodChipRef = ref<HTMLButtonElement | null>(null);
const periodPickerRef = ref<HTMLElement | null>(null);
const periodBrowserRef = ref<HTMLElement | null>(null);
const periodBrowserStyle = ref<Record<string, string>>({});
const browserPeriods = computed(() => buildSummaryPeriodList(periodKind.value, browserYear.value));
const currentPeriodYear = computed(() => getSummaryPeriodYear(periodKind.value, buildSummaryPeriod(periodKind.value).start));
const summaryHistory = ref(new Map<string, string>());
const savedPeriodKeys = computed(() => new Set(summaryHistory.value.values()));
const summaryHistoryLoading = ref(false);
const summaryHistoryError = ref(false);
let summaryHistoryRequestId = 0;
const periodOptions = computed(() => [
  { value: 'week' as const, label: t('personalStats.summaryWeek') },
  { value: 'month' as const, label: t('personalStats.summaryMonth') }
]);

const period = computed(() => buildSummaryPeriod(periodKind.value, periodOffset.value));
const periodStart = computed(() => period.value.start);
const periodEnd = computed(() => period.value.end);
const previousPeriodStart = computed(() => period.value.previousStart);
const previousPeriodEnd = computed(() => period.value.previousEnd);
const periodEndDisplay = computed(() => new Date(periodEnd.value.getFullYear(), periodEnd.value.getMonth(), periodEnd.value.getDate() - 1));
const periodLabel = computed(() => periodKind.value === 'month'
  ? formatTemplate('personalStats.summaryMonthLabelTemplate', { year: periodStart.value.getFullYear(), month: periodStart.value.getMonth() + 1 })
  : formatTemplate('personalStats.summaryWeekLabelTemplate', { month: periodStart.value.getMonth() + 1, day: periodStart.value.getDate(), endMonth: periodEndDisplay.value.getMonth() + 1, endDay: periodEndDisplay.value.getDate() }));
const periodDateRange = computed(() => `${formatSummaryDateKey(periodStart.value)} – ${formatSummaryDateKey(periodEndDisplay.value)}`);
const scopeLabel = computed(() => props.documentLabel ? `${props.sourceLabel} / ${props.documentLabel}` : props.sourceLabel || t('personalStats.allScope'));
const isLoading = computed(() => props.habitsLoading || props.focusLoading);
const taskData = computed(() => buildSummaryTaskData(props.tasks, period.value));
const completedTasks = computed(() => taskData.value.completedTasks);
const createdTaskCount = computed(() => taskData.value.createdTaskCount);
const unfinishedCreatedTasks = computed(() => taskData.value.unfinishedCreatedTasks);
const inPeriod = (value: string | undefined, start: Date, end: Date): boolean => isSummaryDateInPeriod(value, start, end);
const focusMinutes = computed(() => props.focusRecords.reduce((sum, record) => sum + (inPeriod(record.date, periodStart.value, periodEnd.value) ? Math.max(0, record.minutes) : 0), 0));
const focusSessions = computed(() => props.focusRecords.reduce((sum, record) => sum + (inPeriod(record.date, periodStart.value, periodEnd.value) ? Math.max(0, record.sessions) : 0), 0));
const habitStats = computed(() => buildSummaryHabitStats(props.habits, period.value));
const habitCompletions = computed(() => habitStats.value.completed);
const habitTarget = computed(() => habitStats.value.target);
const habitRate = computed(() => habitTarget.value > 0 ? Math.min(100, Math.round((habitCompletions.value / habitTarget.value) * 100)) : 0);
const previousCompletedCount = computed(() => taskData.value.previousCompletedCount);
const previousFocusMinutes = computed(() => props.focusRecords.reduce((sum, record) => sum + (inPeriod(record.date, previousPeriodStart.value, previousPeriodEnd.value) ? Math.max(0, record.minutes) : 0), 0));
const taskDelta = computed(() => completedTasks.value.length - previousCompletedCount.value);
const focusDelta = computed(() => focusMinutes.value - previousFocusMinutes.value);
const comparisonText = computed(() => {
  const changes: string[] = [];
  if (taskDelta.value !== 0) {
    changes.push(formatTemplate('personalStats.summaryTaskDeltaTemplate', {
      delta: `${taskDelta.value > 0 ? '+' : '−'}${Math.abs(taskDelta.value)}`
    }));
  }
  if (focusDelta.value !== 0) {
    changes.push(formatTemplate('personalStats.summaryFocusDeltaTemplate', {
      delta: `${focusDelta.value > 0 ? '+' : '−'}${formatMinutes(Math.abs(focusDelta.value))}`
    }));
  }
  return changes.length ? changes.join(' · ') : t('personalStats.summaryComparisonUnchanged');
});
function getSummaryEventNote(event: LifelogEvent): string {
  for (const key of getCheckinNoteEventKeys(event)) {
    const note = summaryNotesByEventKey.value.get(key)?.trim();
    if (note) return note;
  }
  return typeof event.note === 'string' ? event.note.trim() : '';
}

const focusSummaryRecords = computed<SummaryRecordItem[]>(() => focusRecordsToLifelogEvents(props.focusSessionRecords, t('focusTimer.title'))
  .filter(event => inPeriod(event.date, periodStart.value, periodEnd.value))
  .map(event => ({ event, content: getSummaryEventNote(event) }))
  .filter(item => item.content)
  .sort((left, right) => right.event.date.localeCompare(left.event.date) || right.event.id.localeCompare(left.event.id))
  .map(({ event, content }) => ({
    id: event.id,
    date: event.date,
    title: event.title,
    content,
    kind: 'focus' as const
  })));
const habitSummaryRecords = computed<SummaryRecordItem[]>(() => habitsToLifelogEvents(props.habits)
  .filter(event => inPeriod(event.date, periodStart.value, periodEnd.value))
  .map(event => ({ event, content: getSummaryEventNote(event) }))
  .filter(item => item.content)
  .sort((left, right) => right.event.date.localeCompare(left.event.date) || right.event.id.localeCompare(left.event.id))
  .map(({ event, content }) => ({
    id: event.id,
    date: event.date,
    title: event.title,
    content,
    kind: 'habit' as const
  })));
const taskSummaryRecords = computed<SummaryRecordItem[]>(() => tasksToCompletedLifelogEvents(props.tasks)
  .filter(event => inPeriod(event.date, periodStart.value, periodEnd.value))
  .map(event => ({ event, content: getSummaryEventNote(event) }))
  .filter(item => item.content)
  .sort((left, right) => right.event.date.localeCompare(left.event.date) || right.event.id.localeCompare(left.event.id))
  .map(({ event, content }) => ({
    id: event.id,
    date: event.date,
    title: event.title,
    content,
    kind: 'task' as const
  })));
const manualSummaryRecords = ref<SummaryManualRecord[]>([]);
const summaryNotesByEventKey = ref(new Map<string, string>());
const summaryRecordsLoading = ref(false);
const summaryRecordCount = computed(() => focusSummaryRecords.value.length + habitSummaryRecords.value.length + taskSummaryRecords.value.length + manualSummaryRecords.value.length);
let summaryRecordsRequestId = 0;
const saveButtonLabel = computed(() => saving.value
  ? t('personalStats.summarySavingDocument')
  : savedSummaryDocumentId.value
    ? t('personalStats.summaryAlreadySaved')
    : t('personalStats.summarySaveDocument'));
const summaryDocumentPrefix = computed(() => periodKind.value === 'week'
  ? t('personalStats.summaryWeekDocumentPrefix')
  : t('personalStats.summaryMonthDocumentPrefix'));
const summaryDocumentFileName = computed(() => `${summaryDocumentPrefix.value}-${formatSummaryDateKey(periodStart.value)}`);
const summaryDocumentPath = computed(() => `/Pinch/${summaryDocumentFileName.value}`);
const summaryDocumentCompatibilityPaths = computed(() => {
  const dateKey = formatSummaryDateKey(periodStart.value);
  const kind = periodKind.value;
  const localizedPrefixes = kind === 'week' ? ['周', 'week'] : ['月', 'month'];
  const paths = [
    summaryDocumentPath.value,
    ...localizedPrefixes.map(prefix => `/Pinch/${prefix}-${dateKey}`),
    ...localizedPrefixes.map(prefix => `/Pinch/summaries/${prefix}-${dateKey}`)
  ];
  return [...new Set(paths)];
});

async function loadSummaryNotebooks(): Promise<void> {
  notebooksLoading.value = true;
  try {
    const result = await lsNotebooks();
    availableNotebooks.value = (result.notebooks || [])
      .filter(notebook => notebook.closed !== true)
      .map(notebook => ({ id: notebook.id, name: notebook.name, closed: notebook.closed }));
    if (!availableNotebooks.value.some(notebook => notebook.id === selectedNotebookId.value)) {
      selectedNotebookId.value = availableNotebooks.value[0]?.id || '';
    }
  } finally {
    notebooksLoading.value = false;
  }
}

async function findSummaryDocument(paths: string[]): Promise<SummaryDocument | null> {
  // Search every open notebook in a stable order, independent of the save target.
  const matches = await Promise.all(availableNotebooks.value.map(async notebook => {
    for (const path of paths) {
      const ids = await getIDsByHPath(notebook.id, path);
      if (ids[0]) {
        return { id: ids[0], notebookId: notebook.id, notebookName: notebook.name, path };
      }
    }
    return null;
  }));
  return matches.find((document): document is SummaryDocument => document !== null) || null;
}

function getSummaryRecordDate(entry: CheckinNoteEntry, month: string): string {
  const source = entry.context?.occurredAt || entry.createdAt || entry.updatedAt;
  const date = summaryDateKey(source);
  return date || `${month}-01`;
}

async function refreshSummaryRecords(): Promise<SummaryManualRecord[]> {
  const requestId = ++summaryRecordsRequestId;
  const previousManualRecords = manualSummaryRecords.value;
  summaryRecordsLoading.value = true;
  try {
    const months = getCheckinNoteMonthsInRange(periodStart.value, periodEndDisplay.value);
    const [storages, moodData] = await Promise.all([
      getCheckinNotesForMonths(months),
      typeof getMoodData === 'function' ? getMoodData() : Promise.resolve({})
    ]);
    if (requestId !== summaryRecordsRequestId || isUnmounted) return previousManualRecords;

    const notesByEventKey = new Map<string, string>();
    const noteRecords: SummaryManualRecord[] = [];
    for (const storage of storages) {
      for (const entry of Object.values(storage.entries || {})) {
        const content = entry.content.trim();
        if (!content) continue;
        if (entry.context) {
          notesByEventKey.set(entry.eventKey, content);
          continue;
        }
        const date = getSummaryRecordDate(entry, storage.month);
        if (!inPeriod(date, periodStart.value, periodEnd.value)) continue;
        noteRecords.push({
          id: `note:${storage.month}:${entry.eventKey}`,
          date,
          title: t('personalStats.summaryManualRecordTitle'),
          content,
          kind: 'manual'
        });
      }
    }

    const moodRecords: SummaryManualRecord[] = moodManualEntriesToLifelogEvents(moodData || {})
      .filter(event => inPeriod(event.date, periodStart.value, periodEnd.value))
      .map<SummaryManualRecord>(event => ({
        id: `mood:${event.id}`,
        date: event.date,
        title: event.title || t('personalStats.summaryManualRecordTitle'),
        content: event.text,
        kind: 'manual'
      }));

    summaryNotesByEventKey.value = notesByEventKey;
    manualSummaryRecords.value = [...noteRecords, ...moodRecords]
      .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id));
    return manualSummaryRecords.value;
  } catch (error) {
    if (requestId === summaryRecordsRequestId) {
      summaryNotesByEventKey.value = new Map();
      manualSummaryRecords.value = [];
      console.error('[PersonalStatsSummary] Failed to load period records:', error);
    }
    return previousManualRecords;
  } finally {
    if (requestId === summaryRecordsRequestId) summaryRecordsLoading.value = false;
  }
}

async function refreshSummaryHistory(): Promise<void> {
  const requestId = ++summaryHistoryRequestId;
  summaryHistoryLoading.value = true;
  summaryHistoryError.value = false;
  try {
    const notebookIds = availableNotebooks.value.map(notebook => `'${notebook.id.replace(/'/g, "''")}'`).join(',');
    const history = new Map<string, string>();
    if (notebookIds) {
      // Fetch documents in batches rather than making one request per week and notebook.
      for (let offset = 0; ; offset += 512) {
        const rows = await sql(`SELECT id, hpath FROM blocks WHERE type = 'd' AND box IN (${notebookIds}) AND hpath LIKE '/Pinch/%' ORDER BY id LIMIT 512 OFFSET ${offset}`);
        if (requestId !== summaryHistoryRequestId || isUnmounted) return;
        for (const row of rows) {
          const key = typeof row.hpath === 'string' ? getSummaryPeriodKeyFromPath(row.hpath) : null;
          if (key && typeof row.id === 'string') history.set(row.id, key);
        }
        if (rows.length < 512) break;
      }
    }
    if (requestId === summaryHistoryRequestId && !isUnmounted) {
      summaryHistory.value = history;
      if (savedSummaryDocument.value) rememberSummaryDocument(savedSummaryDocument.value);
    }
  } catch (error) {
    if (requestId === summaryHistoryRequestId && !isUnmounted) {
      summaryHistoryError.value = true;
      console.error('[PersonalStatsSummary] Failed to load summary history:', error);
    }
  } finally {
    if (requestId === summaryHistoryRequestId) summaryHistoryLoading.value = false;
  }
}

function rememberSummaryDocument(document: SummaryDocument): void {
  const key = getSummaryPeriodKeyFromPath(document.path);
  if (key) summaryHistory.value.set(document.id, key);
}

function browserPeriodRange(entry: SummaryPeriodEntry): string {
  const end = new Date(entry.end.getFullYear(), entry.end.getMonth(), entry.end.getDate() - 1);
  return `${entry.start.getMonth() + 1}/${entry.start.getDate()}–${end.getMonth() + 1}/${end.getDate()}`;
}

function browserPeriodLabel(entry: SummaryPeriodEntry): string {
  return periodKind.value === 'month'
    ? formatTemplate('personalStats.summaryMonthLabelTemplate', { year: browserYear.value, month: entry.number })
    : `${formatTemplate('personalStats.summaryBrowserWeekTemplate', { number: entry.number })} · ${formatSummaryDateKey(entry.start)} – ${formatSummaryDateKey(new Date(entry.end.getFullYear(), entry.end.getMonth(), entry.end.getDate() - 1))}`;
}

function jumpToPeriod(entry: SummaryPeriodEntry): void {
  if (saving.value || deleting.value || entry.future) return;
  if (periodOffset.value === entry.offset) void refreshSummaryDocument();
  else periodOffset.value = entry.offset;
  closePeriodBrowser();
}

async function openPeriodBrowser(): Promise<void> {
  if (saving.value || deleting.value) return;
  if (periodBrowserOpen.value) {
    closePeriodBrowser();
    return;
  }
  browserYear.value = getSummaryPeriodYear(periodKind.value, periodStart.value);
  periodBrowserOpen.value = true;
  await nextTick();
  if (!periodBrowserOpen.value || isUnmounted) return;
  updatePeriodBrowserPosition();
  revealSelectedBrowserPeriod();
  const dialog = periodBrowserRef.value;
  const initialFocus = dialog?.querySelector<HTMLButtonElement>('.summary-period-item.selected:not(:disabled)');
  (initialFocus || dialog)?.focus({ preventScroll: true });
}

function closePeriodBrowser(restoreFocus = true): void {
  periodBrowserOpen.value = false;
  if (restoreFocus) periodChipRef.value?.focus({ preventScroll: true });
}

function updatePeriodBrowserPosition(): void {
  if (!periodBrowserOpen.value || !periodChipRef.value) return;
  const trigger = periodChipRef.value.getBoundingClientRect();
  const panel = periodPickerRef.value?.closest('.stats-summary-panel')?.getBoundingClientRect();
  const right = Math.min(window.innerWidth - 8, panel?.width ? panel.right - 8 : window.innerWidth - 8);
  const left = Math.max(8, panel?.width ? panel.left + 8 : 8);
  const width = Math.max(0, Math.min(560, right - left));
  let bottom = window.innerHeight - 8;
  for (let ancestor = periodPickerRef.value?.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(ancestor).overflowY)) {
      const bounds = ancestor.getBoundingClientRect();
      if (bounds.height) bottom = Math.min(bottom, bounds.bottom - 8);
    }
  }
  periodBrowserStyle.value = {
    left: `${Math.max(left, Math.min(trigger.left, right - width)) - trigger.left}px`,
    width: `${width}px`,
    maxHeight: `${Math.max(0, bottom - trigger.bottom - 6)}px`
  };
}

function handlePeriodBrowserOutside(event: Event): void {
  if (periodBrowserOpen.value && event.target instanceof Node && !periodPickerRef.value?.contains(event.target)) {
    closePeriodBrowser(false);
  }
}

function handlePeriodBrowserKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closePeriodBrowser();
  }
}

function destroySummaryProtyle(): void {
  if (summaryProtyle) {
    try {
      summaryProtyle.destroy();
    } catch {
    }
  }
  summaryProtyle = null;
  summaryEditorMountRef.value?.replaceChildren();
}

async function mountSummaryProtyle(documentId: string): Promise<void> {
  await nextTick();
  const mount = summaryEditorMountRef.value;
  if (isUnmounted || !mount || savedSummaryDocumentId.value !== documentId) return;
  const plugin = usePlugin();
  if (!plugin?.app) return;

  destroySummaryProtyle();
  try {
    summaryProtyle = new Protyle(plugin.app, mount, {
      blockId: documentId,
      rootId: documentId,
      mode: 'wysiwyg',
      action: [],
      render: {
        title: false,
        breadcrumb: false,
        gutter: false,
        scroll: false
      }
    });
  } catch (error) {
    console.error('[PersonalStatsSummary] Failed to mount summary editor:', error);
  }
}

async function refreshSummaryDocument(): Promise<void> {
  const requestId = ++summaryDocumentRequestId;
  savedSummaryDocument.value = null;
  destroySummaryProtyle();

  summaryDocumentLoading.value = true;
  try {
    const document = await findSummaryDocument(summaryDocumentCompatibilityPaths.value);
    if (requestId !== summaryDocumentRequestId || isUnmounted) return;
    savedSummaryDocument.value = document;
    if (document) {
      rememberSummaryDocument(document);
      await mountSummaryProtyle(document.id);
    }
  } catch (error) {
    if (requestId === summaryDocumentRequestId) {
      console.error('[PersonalStatsSummary] Failed to load summary document:', error);
    }
  } finally {
    if (requestId === summaryDocumentRequestId) {
      summaryDocumentLoading.value = false;
    }
  }
}

async function openSummaryDocument(): Promise<void> {
  const documentId = savedSummaryDocumentId.value;
  if (documentId) {
    await openBlockById(documentId, { focus: true });
  }
}

/**
 * Render the current period's summary as a small, shareable receipt image.
 * Keeping the renderer local avoids adding a large screenshot dependency and
 * lets the exported card remain readable on both light and dark themes.
 */
async function exportSummaryReceipt(): Promise<void> {
  if (exportingReceipt.value || deleting.value) return;
  exportingReceipt.value = true;
  try {
    const width = 620;
    const contentWidth = 500;
    const side = (width - contentWidth) / 2;
    const fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    const canvas = document.createElement('canvas');
    const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const measure = document.createElement('canvas').getContext('2d');
    if (!measure) throw new Error('Canvas is unavailable');
    measure.font = `400 20px ${fontFamily}`;
    const wrap = (value: string, maxWidth = contentWidth): string[] => {
      const text = value.replace(/\s+/g, ' ').trim();
      if (!text) return [''];
      const lines: string[] = [];
      let line = '';
      for (const character of text) {
        const next = line + character;
        if (line && measure.measureText(next).width > maxWidth) {
          lines.push(line);
          line = character;
        } else {
          line = next;
        }
      }
      if (line) lines.push(line);
      return lines;
    };
    const sections: Array<{ title: string; items: string[] }> = [
      {
        title: t('personalStats.summaryCompletedTitle'),
        items: completedTasks.value.map((task, index) => `${index + 1}.  ${getTaskTitle(task)}  ✓`)
      },
      {
        title: t('personalStats.summaryUnfinishedTitle'),
        items: unfinishedCreatedTasks.value.map((task, index) => `${index + 1}.  ${getTaskTitle(task)}`)
      }
    ];
    const recordSections: Array<[string, SummaryRecordItem[]]> = [
      [t('personalStats.summaryFocusRecordsTitle'), focusSummaryRecords.value],
      [t('personalStats.summaryHabitRecordsTitle'), habitSummaryRecords.value],
      [t('personalStats.summaryTaskRecordsTitle'), taskSummaryRecords.value],
      [t('personalStats.summaryManualRecordsTitle'), manualSummaryRecords.value]
    ];
    for (const [title, records] of recordSections) {
      if (records.length) sections.push({
        title,
        items: records.map(record => `${record.date}  ·  ${record.kind === 'manual' ? record.content : `${record.title}${record.content ? ` · ${record.content}` : ''}`}`)
      });
    }
    const lineHeight = 30;
    let height = 180;
    const countLines = (value: string, maxWidth = contentWidth) => wrap(value, maxWidth).length;
    height += countLines(`${t('personalStats.summaryScopeTemplate', { scope: scopeLabel.value })}`) * lineHeight + 44;
    height += 4 * lineHeight + 72;
    height += countLines(`${t('personalStats.summaryComparisonLabel')}: ${comparisonText.value}`) * lineHeight + 34;
    for (const section of sections) {
      height += 54;
      for (const item of section.items.slice(0, 40)) height += countLines(item, contentWidth - 20) * lineHeight + 8;
      if (!section.items.length) height += lineHeight;
    }
    const topPadding = 28;
    height = Math.min(Math.max(height + 600 + topPadding, 1228), 9000);
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.scale(scale, scale);
    context.translate(0, topPadding);
    const roundedRect = (x: number, y: number, w: number, h: number, radius: number): void => {
      context.beginPath();
      context.moveTo(x + radius, y);
      context.arcTo(x + w, y, x + w, y + h, radius);
      context.arcTo(x + w, y + h, x, y + h, radius);
      context.arcTo(x, y + h, x, y, radius);
      context.arcTo(x, y, x + w, y, radius);
      context.closePath();
    };
    const drawText = (value: string, x: number, y: number, options: { font?: string; color?: string; align?: CanvasTextAlign; maxWidth?: number } = {}): number => {
      context.font = options.font || `400 20px ${fontFamily}`;
      context.fillStyle = options.color || '#262626';
      context.textAlign = options.align || 'left';
      const lines = wrap(value, options.maxWidth || contentWidth);
      lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
      return lines.length * lineHeight;
    };
    const contentOffset = 8;
    context.fillStyle = '#fff';
    context.fillRect(0, -topPadding, width, height);
    context.save();
    context.globalAlpha = 0.035;
    context.fillStyle = '#6d6258';
    let paperSeed = `${periodKind.value}:${formatSummaryDateKey(periodStart.value)}`.split('').reduce((hash, character) => ((hash * 33) + character.charCodeAt(0)) >>> 0, 5381);
    for (let index = 0; index < 900; index += 1) {
      paperSeed = (paperSeed * 1103515245 + 12345) >>> 0;
      const x = paperSeed % width;
      paperSeed = (paperSeed * 1103515245 + 12345) >>> 0;
      const y = (paperSeed % Math.max(1, height - topPadding)) - topPadding;
      context.fillRect(x, y, 1, 1);
    }
    context.restore();
    const drawRule = (y: number, dashed = false): void => {
      context.strokeStyle = '#6b6b6b';
      context.lineWidth = dashed ? 2 : 3;
      context.setLineDash(dashed ? [8, 8] : []);
      context.beginPath(); context.moveTo(side, y); context.lineTo(side + contentWidth, y); context.stroke();
      context.setLineDash([]);
    };
    drawRule(36);
    context.lineWidth = 1;
    context.beginPath(); context.moveTo(side, 44); context.lineTo(side + contentWidth, 44); context.stroke();
    context.fillStyle = '#1c1c1c';
    context.font = `700 34px ${fontFamily}`;
    context.textAlign = 'center';
    context.fillText('P I N C H', width / 2, 92);
    context.fillStyle = '#777';
    context.font = `400 20px ${fontFamily}`;
    context.fillText(t('personalStats.summaryReceiptSubtitle'), width / 2, 126);
    drawRule(154);
    context.lineWidth = 1;
    context.beginPath(); context.moveTo(side, 162); context.lineTo(side + contentWidth, 162); context.stroke();
    let y = 206;
    const generatedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const metadata = [
      [t('personalStats.summaryReceiptDate'), formatSummaryDateKey(periodStart.value)],
      [t('personalStats.summaryReceiptTime'), generatedTime],
      [t('personalStats.summaryReceiptPeriod'), periodLabel.value],
      [t('personalStats.summaryReceiptScope'), scopeLabel.value]
    ];
    metadata.forEach(([label, value]) => {
      context.font = `400 19px ${fontFamily}`;
      context.fillStyle = '#666';
      context.textAlign = 'left';
      context.fillText(label, side, y + contentOffset);
      context.font = `600 19px ${fontFamily}`;
      context.fillStyle = '#222';
      context.textAlign = 'right';
      const lines = wrap(value, 320);
      context.fillText(lines[0], side + contentWidth, y + contentOffset);
      y += lineHeight;
      for (const line of lines.slice(1)) {
        context.fillText(line, side + contentWidth, y + contentOffset);
        y += lineHeight;
      }
    });
    y += 10;
    drawRule(y, true);
    y += 38;
    const metrics = [
      [t('personalStats.summaryCompletedTasks'), String(completedTasks.value.length)],
      [t('personalStats.focusDuration'), formatMinutes(focusMinutes.value)],
      [t('personalStats.habitCheckins'), `${habitRate.value}%`],
      [t('personalStats.summaryUnfinishedTasks'), String(unfinishedCreatedTasks.value.length)]
    ];
    metrics.forEach(([label, value]) => {
      context.font = `400 19px ${fontFamily}`;
      context.fillStyle = '#505050';
      context.textAlign = 'left';
      context.fillText(label, side, y + contentOffset);
      context.font = `700 21px ${fontFamily}`;
      context.fillStyle = '#171717';
      context.textAlign = 'right';
      context.fillText(value, side + contentWidth, y + contentOffset);
      y += lineHeight;
    });
    y += 10;
    y += drawText(`${t('personalStats.summaryComparisonLabel')}: ${comparisonText.value}`, side, y + contentOffset, { color: '#555', maxWidth: contentWidth });
    y += 20;
    drawRule(y, true);
    y += 38;
    for (const section of sections) {
      context.font = `700 22px ${fontFamily}`;
      context.fillStyle = '#1f1f1f';
      context.textAlign = 'left';
      context.fillText(section.title, side, y + contentOffset);
      y += 34;
      const items = section.items.slice(0, 40);
      if (!items.length) {
        y += drawText(t('personalStats.summaryNoRecords'), side + 12, y + contentOffset, { color: '#888', maxWidth: contentWidth - 20 });
      } else {
        for (const item of items) {
          y += drawText(item, side + 12, y + contentOffset, { color: '#454545', maxWidth: contentWidth - 20 }) + 8;
        }
      }
      y += 12;
    }
    drawRule(y, true);
    y += 38;
    const trackedTaskCount = completedTasks.value.length + unfinishedCreatedTasks.value.length;
    const completionRate = trackedTaskCount > 0
      ? Math.min(100, Math.round((completedTasks.value.length / trackedTaskCount) * 100))
      : 0;
    const totals = [
      [t('personalStats.summaryReceiptSubtotal'), `${trackedTaskCount}`],
      [t('personalStats.summaryReceiptCompleted'), `${completedTasks.value.length}`],
      [t('personalStats.summaryReceiptEfficiency'), `${completionRate}%`]
    ];
    totals.forEach(([label, value], index) => {
      const rowY = y + contentOffset;
      context.font = `${index === 2 ? '700' : '400'} ${index === 2 ? 23 : 19}px ${fontFamily}`;
      context.fillStyle = index === 2 ? '#171717' : '#555';
      context.textAlign = 'left';
      context.fillText(label, side, rowY);
      context.textAlign = 'right';
      context.fillText(value, side + contentWidth, rowY);
      y += lineHeight + (index === 1 ? 12 : 0);
      if (index === 1) {
        drawRule(y - 8, true);
        y += 22;
      }
    });
    drawRule(y, true);
    y += 52;
    context.font = `400 21px ${fontFamily}`;
    context.fillStyle = '#333';
    context.textAlign = 'center';
    context.fillText(t('personalStats.summaryReceiptEncouragement'), width / 2, y);
    y += 32;
    context.fillText(t('personalStats.summaryReceiptKeepGoing'), width / 2, y);
    y += 48;
    drawRule(y, true);
    y += 34;
    context.strokeStyle = '#222';
    context.lineCap = 'butt';
    let barcodeSeed = `${periodKind.value}:${formatSummaryDateKey(periodStart.value)}`.split('').reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
    const nextBarcodeRandom = (): number => {
      barcodeSeed = (barcodeSeed * 1664525 + 1013904223) >>> 0;
      return barcodeSeed / 4294967296;
    };
    const barcodeBars: Array<{ width: number; gap: number }> = [];
    let barcodeTotal = 0;
    while (barcodeTotal < 190) {
      const barWidth = 2 + Math.floor(nextBarcodeRandom() * 4);
      const gap = 3 + Math.floor(nextBarcodeRandom() * 5);
      barcodeBars.push({ width: barWidth, gap });
      barcodeTotal += barWidth + gap;
    }
    let barcodeX = (width - barcodeTotal) / 2;
    for (const bar of barcodeBars) {
      context.lineWidth = bar.width;
      context.beginPath(); context.moveTo(barcodeX + bar.width / 2, y); context.lineTo(barcodeX + bar.width / 2, y + 34); context.stroke();
      barcodeX += bar.width + bar.gap;
    }
    y += 68;
    context.font = `400 18px ${fontFamily}`;
    context.fillStyle = '#7a7a7a';
    context.textAlign = 'center';
    context.fillText('T H A N K   Y O U', width / 2, y);
    y += 28;
    context.font = `400 16px ${fontFamily}`;
    context.fillText(t('personalStats.summaryReceiptFooter'), width / 2, y);
    const paperBottom = height - topPadding;
    const scallopEdge = paperBottom - 14;
    const scallopRadius = 9;
    const scallopPitch = 24;
    context.fillStyle = '#222';
    context.fillRect(0, scallopEdge, width, paperBottom - scallopEdge);
    for (let x = -scallopPitch; x < width + scallopPitch; x += scallopPitch) {
      context.beginPath();
      context.fillStyle = '#222';
      context.moveTo(x + scallopPitch / 2 - scallopRadius, scallopEdge);
      context.arc(x + scallopPitch / 2, scallopEdge, scallopRadius, Math.PI, Math.PI * 2);
      context.lineTo(x + scallopPitch / 2 - scallopRadius, scallopEdge);
      context.fill();
    }
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not create receipt image');
    if (receiptPreviewUrl.value) URL.revokeObjectURL(receiptPreviewUrl.value);
    receiptPreviewBlob.value = blob;
    receiptPreviewUrl.value = URL.createObjectURL(blob);
    receiptPreviewFileName.value = `Pinch-${periodKind.value}-${formatSummaryDateKey(periodStart.value)}.png`;
    receiptPreviewOpen.value = true;
  } catch (error) {
    console.error('[PersonalStatsSummary] Failed to export receipt:', error);
    showMessage(t('personalStats.summaryReceiptExportFailed'), 3000, 'error');
  } finally {
    exportingReceipt.value = false;
  }
}

function closeReceiptPreview(): void {
  receiptPreviewOpen.value = false;
  if (receiptPreviewUrl.value) URL.revokeObjectURL(receiptPreviewUrl.value);
  receiptPreviewUrl.value = '';
  receiptPreviewBlob.value = null;
  receiptPreviewFileName.value = '';
}

function confirmReceiptExport(): void {
  const blob = receiptPreviewBlob.value;
  if (!blob) return;
  const url = receiptPreviewUrl.value || URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = receiptPreviewFileName.value || `Pinch-${periodKind.value}-${formatSummaryDateKey(periodStart.value)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  showMessage(t('personalStats.summaryReceiptExported'), 3000, 'info');
  closeReceiptPreview();
}

async function deleteSummaryDocument(): Promise<void> {
  const document = savedSummaryDocument.value;
  if (!document || deleting.value) return;

  const confirmed = window.confirm(formatTemplate('personalStats.summaryDeleteDocumentConfirmTemplate', {
    path: savedSummaryDocumentPath.value
  }));
  if (!confirmed) return;

  deleting.value = true;
  try {
    // `document.path` is the human-readable HPath used to find and display
    // the summary. removeDoc expects the document's storage path, which can
    // be resolved reliably from its block ID.
    const storageLocation = await getPathByID(document.id);
    if (!storageLocation?.notebook || !storageLocation.path) {
      throw new Error(`Could not resolve storage path for summary document ${document.id}`);
    }
    await removeDoc(storageLocation.notebook, storageLocation.path);
    summaryHistoryRequestId += 1;
    summaryHistoryLoading.value = false;
    summaryHistory.value.delete(document.id);
    summaryDocumentRequestId += 1;
    destroySummaryProtyle();
    savedSummaryDocument.value = null;
    showMessage(t('personalStats.summaryDocumentDeleted'), 3000, 'info');
  } catch (error) {
    console.error('[PersonalStatsSummary] Failed to delete summary document:', error);
    showMessage(t('personalStats.summaryDeleteFailed'), 3000, 'error');
  } finally {
    deleting.value = false;
  }
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatTaskDate(value: string | undefined): string {
  return summaryDateKey(value) || t('personalStats.unknownDate');
}

function getTaskTitle(task: Task): string {
  return getTaskTitlePlainText(task.title) || t('personalStats.untitledTask');
}

function formatSummaryRecordMarkdown(record: SummaryRecordItem): string {
  const title = record.title.replace(/\s+/g, ' ').trim();
  const content = record.content?.replace(/\s+/g, ' ').trim();
  const body = record.kind === 'manual'
    ? content || title
    : `${title}${content ? `：${content}` : ''}`;
  return `- ${record.date} · ${body || title || content || t('personalStats.summaryNoRecords')}`;
}

function appendSummaryRecordSection(lines: string[], title: string, records: SummaryRecordItem[]): void {
  if (!records.length) return;
  lines.push('', `## ${title}`, ...records.map(formatSummaryRecordMarkdown));
}

function buildSummaryMarkdown(manualRecords = manualSummaryRecords.value): string {
  const lines = [
    `# ${periodLabel.value}`,
    '',
    `> ${formatTemplate('personalStats.summaryScopeTemplate', { scope: scopeLabel.value })}`,
    '',
    `- ${t('personalStats.summaryCompletedTasks')}: ${completedTasks.value.length}`,
    `- ${t('personalStats.focusDuration')}: ${formatMinutes(focusMinutes.value)}`,
    `- ${t('personalStats.habitCheckins')}: ${habitRate.value}% (${habitCompletions.value}/${habitTarget.value})`,
    `- ${t('personalStats.summaryUnfinishedTasks')}: ${unfinishedCreatedTasks.value.length}`,
    '',
    `${t('personalStats.summaryComparisonLabel')}: ${comparisonText.value}`,
    '',
    `## ${t('personalStats.summaryCompletedTitle')}`,
    ...(completedTasks.value.length ? completedTasks.value.map(task => `- ${getTaskTitle(task)}`) : [`- ${t('personalStats.summaryNoCompletedTasks')}`]),
    '',
    `## ${t('personalStats.summaryUnfinishedTitle')}`,
    ...(unfinishedCreatedTasks.value.length ? unfinishedCreatedTasks.value.map(task => `- ${getTaskTitle(task)}`) : [`- ${t('personalStats.summaryNoUnfinishedTasks')}`])
  ];
  appendSummaryRecordSection(lines, t('personalStats.summaryFocusRecordsTitle'), focusSummaryRecords.value);
  appendSummaryRecordSection(lines, t('personalStats.summaryHabitRecordsTitle'), habitSummaryRecords.value);
  appendSummaryRecordSection(lines, t('personalStats.summaryTaskRecordsTitle'), taskSummaryRecords.value);
  appendSummaryRecordSection(lines, t('personalStats.summaryManualRecordsTitle'), manualRecords);
  return lines.join('\n');
}

async function saveAsDocument(): Promise<void> {
  if (saving.value || notebooksLoading.value || summaryDocumentLoading.value || savedSummaryDocumentId.value) return;
  saving.value = true;
  try {
    const manualRecords = await refreshSummaryRecords();
    // Recheck just before creating, including documents saved since the panel loaded.
    await loadSummaryNotebooks();
    const notebookId = selectedNotebookId.value;
    if (!notebookId) {
      showMessage(t('personalStats.summaryNoNotebook'), 3000, 'error');
      return;
    }

    const documentPath = summaryDocumentPath.value;
    const existingDocument = await findSummaryDocument(summaryDocumentCompatibilityPaths.value);
    if (existingDocument) {
      if (!isUnmounted) {
        savedSummaryDocument.value = existingDocument;
        rememberSummaryDocument(existingDocument);
        await mountSummaryProtyle(existingDocument.id);
      }
      showMessage(t('personalStats.summaryDocumentExists'), 3000, 'info');
      return;
    }

    const documentId = await createDocWithMd(notebookId, documentPath, buildSummaryMarkdown(manualRecords));
    if (!isUnmounted) {
      savedSummaryDocument.value = {
        id: documentId,
        notebookId,
        notebookName: availableNotebooks.value.find(notebook => notebook.id === notebookId)?.name || notebookId,
        path: documentPath
      };
      rememberSummaryDocument(savedSummaryDocument.value);
      await mountSummaryProtyle(documentId);
    }
    showMessage(t('personalStats.summaryDocumentSaved'), 3000, 'info');
  } catch (error) {
    console.error('[PersonalStatsSummary] Failed to save summary document:', error);
    showMessage(t('personalStats.summarySaveFailed'), 3000, 'error');
  } finally {
    saving.value = false;
  }
}

function shiftPeriod(delta: -1 | 1): void {
  if (saving.value || deleting.value) return;
  periodOffset.value = Math.min(0, periodOffset.value + delta);
}

function resetPeriod(): void {
  if (saving.value || deleting.value) return;
  periodOffset.value = 0;
  browserYear.value = currentPeriodYear.value;
}

function selectPeriodKind(kind: SummaryPeriodKind): void {
  if (saving.value || deleting.value) return;
  periodKind.value = kind;
  periodOffset.value = 0;
  browserYear.value = currentPeriodYear.value;
}

function revealSelectedBrowserPeriod(): void {
  const grid = browserGridRef.value;
  if (!grid) return;
  const selected = grid.querySelector<HTMLElement>('.summary-period-item.selected');
  grid.scrollTop = selected ? Math.max(0, selected.offsetTop - (grid.clientHeight - selected.offsetHeight) / 2) : 0;
}

watch([browserPeriods, periodOffset], revealSelectedBrowserPeriod, { flush: 'post' });

watch([periodKind, periodOffset], () => {
  browserYear.value = getSummaryPeriodYear(periodKind.value, periodStart.value);
  closeReceiptPreview();
  void refreshSummaryDocument();
  void refreshSummaryRecords();
});

onMounted(async () => {
  document.addEventListener('pointerdown', handlePeriodBrowserOutside, true);
  document.addEventListener('focusin', handlePeriodBrowserOutside, true);
  window.addEventListener('resize', updatePeriodBrowserPosition);
  window.addEventListener('scroll', updatePeriodBrowserPosition, true);
  revealSelectedBrowserPeriod();
  try {
    await loadSummaryNotebooks();
    if (!isUnmounted) await Promise.all([refreshSummaryDocument(), refreshSummaryHistory(), refreshSummaryRecords()]);
  } catch (error) {
    console.error('[PersonalStatsSummary] Failed to load notebooks:', error);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePeriodBrowserOutside, true);
  document.removeEventListener('focusin', handlePeriodBrowserOutside, true);
  window.removeEventListener('resize', updatePeriodBrowserPosition);
  window.removeEventListener('scroll', updatePeriodBrowserPosition, true);
  isUnmounted = true;
  summaryDocumentRequestId += 1;
  summaryHistoryRequestId += 1;
  summaryRecordsRequestId += 1;
  closeReceiptPreview();
  destroySummaryProtyle();
});
</script>

<style scoped lang="scss">
.stats-panel.stats-summary-panel { display: grid; grid-column: 1 / -1; gap: 16px; min-width: 0; padding: 18px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); border-radius: 16px; container-type: inline-size; }
.summary-header, .summary-period-actions, .summary-mode-switch { display: flex; align-items: center; }
.summary-header { --summary-control-height: 32px; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.panel-head-copy { flex: 1 1 auto; min-width: 0; }
.panel-head-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.panel-head-top h3 { margin: 0; font-size: 18px; }
.panel-head-copy p { margin: 6px 0 0; font-size: 12px; line-height: 1.6; color: var(--b3-theme-on-surface-light); }
.panel-chip { gap: 6px; padding: 5px 8px; border: 1px solid transparent; border-radius: 7px; font-size: 12px; background: var(--b3-list-hover); color: inherit; cursor: pointer; }
.panel-chip:hover:not(:disabled) { border-color: var(--b3-border-color); }
.panel-chip:focus-visible { outline: 2px solid var(--b3-theme-primary); outline-offset: 2px; }
.panel-chip:disabled { opacity: .5; cursor: default; }
.panel-link-btn { padding: 6px 10px; border: 1px solid transparent; border-radius: 7px; font-size: 12px; cursor: pointer; color: inherit; background: var(--b3-list-hover); }
.panel-link-btn:hover:not(:disabled) { border-color: var(--b3-border-color); }
.panel-link-btn:disabled { opacity: .5; cursor: default; }
.summary-period-actions { gap: 8px; flex-wrap: wrap; }
.summary-period-actions > :is(button, .summary-notebook-picker, .panel-chip) { box-sizing: border-box; height: var(--summary-control-height); min-height: var(--summary-control-height); padding-block: 0; font-family: inherit; font-size: 12px; line-height: 1.2; }
.summary-period-actions > :is(button, .panel-chip) { display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; }
.summary-period-nav { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 var(--summary-control-height); width: var(--summary-control-height); padding: 0; border: 1px solid var(--b3-border-color); border-radius: 7px; background: var(--b3-theme-background); color: var(--b3-theme-on-surface); cursor: pointer; }
.summary-period-nav :deep(svg) { display: block; flex-shrink: 0; }
.summary-period-nav:disabled { opacity: .4; cursor: default; }
.summary-save-button { white-space: nowrap; }
.summary-notebook-picker { position: relative; min-width: 0; max-width: 180px; }
.summary-notebook-select { display: block; box-sizing: border-box; width: 100%; height: 100%; padding: 0 30px 0 8px; font: inherit; appearance: none; border: 1px solid var(--b3-border-color); border-radius: 7px; background: var(--b3-theme-background); color: var(--b3-theme-on-surface); }
.summary-notebook-arrow { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--b3-theme-on-surface); }
.summary-notebook-select:disabled + .summary-notebook-arrow { opacity: .5; }
.summary-mode-switch { box-sizing: border-box; height: var(--summary-control-height); gap: 2px; flex-shrink: 0; padding: 2px; border-radius: 9px; background: var(--b3-list-hover); }
.summary-mode-chip { box-sizing: border-box; min-width: 28px; height: calc(var(--summary-control-height) - 4px); border: none; border-radius: 7px; padding: 0 8px; background: transparent; color: var(--b3-theme-on-surface); font-size: 13px; line-height: 1; cursor: pointer; transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
.summary-mode-chip:hover:not(:disabled) { background: var(--b3-theme-background); color: var(--b3-theme-on-background); }
.summary-mode-chip.active { background: var(--b3-theme-background); color: var(--b3-theme-on-background); box-shadow: var(--pinch-shadow); }
.summary-mode-chip:disabled { opacity: .5; cursor: default; }
.summary-period-picker { position: relative; display: inline-flex; flex-shrink: 0; height: var(--summary-control-height); }
.summary-period-picker > .panel-chip { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; height: 100%; padding-block: 0; font-family: inherit; line-height: 1.2; white-space: nowrap; }
.summary-period-browser { position: absolute; top: calc(100% + 6px); z-index: 30; box-sizing: border-box; display: flex; flex-direction: column; min-width: 0; overflow: hidden; padding: 12px; border: 1px solid var(--b3-border-color); border-radius: 10px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); box-shadow: var(--pinch-menu-shadow); }
.summary-period-dialog-head, .summary-period-browser-head { flex-shrink: 0; }
.summary-period-dialog-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.summary-period-dialog-head h3 { margin: 0; font-size: 15px; }
.summary-period-browser-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.summary-year-actions, .summary-history-legend { display: flex; align-items: center; gap: 8px; }
.summary-year-actions strong { min-width: 64px; text-align: center; font-size: 13px; }
.summary-year-nav { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: none; border-radius: 7px; color: var(--b3-theme-on-surface); background: transparent; cursor: pointer; }
.summary-year-nav:hover:not(:disabled) { background: var(--b3-list-hover); }
.summary-year-nav:disabled { opacity: .4; cursor: default; }
.summary-history-status, .summary-history-legend { font-size: 12px; color: var(--b3-theme-on-surface-light); }
.summary-saved-dot { display: inline-block; flex: 0 0 auto; width: 6px; height: 6px; border-radius: 50%; background: var(--b3-theme-primary); }
.summary-period-grid { position: relative; display: grid; grid-template-columns: repeat(auto-fit, minmax(88px, 1fr)); gap: 6px; min-height: 0; max-height: 340px; overflow-y: auto; padding: 2px; }
.summary-period-grid.is-month { grid-template-columns: repeat(auto-fit, minmax(64px, 1fr)); }
.summary-period-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-width: 0; min-height: 46px; padding: 7px 4px; border: 1px solid transparent; border-radius: 7px; background: var(--b3-list-hover); color: var(--b3-theme-on-surface); font-family: inherit; font-size: 12px; cursor: pointer; }
.summary-period-item-label { display: flex; align-items: center; gap: 5px; }
.summary-period-item small { color: var(--b3-theme-on-surface-light); font-size: 10px; white-space: nowrap; }
.summary-period-item.has-summary { background: color-mix(in srgb, var(--b3-theme-primary) 12%, var(--b3-theme-background)); color: var(--b3-theme-primary); }
.summary-period-item.selected { border-color: var(--b3-theme-primary); box-shadow: 0 0 0 1px var(--b3-theme-primary); }
.summary-period-item:hover:not(:disabled) { border-color: var(--b3-theme-primary); }
.summary-period-item:focus-visible, .summary-year-nav:focus-visible { outline: 2px solid var(--b3-theme-primary); outline-offset: 2px; }
.summary-period-item:disabled { opacity: .35; cursor: default; }
.summary-comparison { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; font-size: 12px; line-height: 1.6; color: var(--b3-theme-on-surface-light); }
.summary-comparison span:first-child { flex-shrink: 0; }
.summary-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 0; }
.mini-stat-card { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: 14px; border-radius: 9px; background: var(--b3-list-hover); }
.mini-stat-label { font-size: 12px; color: var(--b3-theme-on-surface-light); }
.mini-stat-value { font-size: 24px; line-height: 1.2; font-variant-numeric: tabular-nums; }
.summary-stat-grid small { color: var(--b3-theme-on-surface-light); font-size: 11px; }
.summary-task-details { min-width: 0; }
.summary-task-details > summary { cursor: pointer; font-size: 13px; font-weight: 600; }
.summary-task-details[open] > summary { margin-bottom: 12px; }
.summary-section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.summary-section { min-width: 0; padding: 14px; border: 1px solid var(--b3-border-color); border-radius: 10px; background: var(--b3-theme-background); }
.summary-records { min-width: 0; }
.summary-records-header { margin-bottom: 10px; }
.summary-record-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.summary-record-section { min-width: 0; padding: 14px; border: 1px solid var(--b3-border-color); border-radius: 10px; background: var(--b3-theme-background); }
.summary-record-section .list-block-head { margin-bottom: 8px; }
.summary-record-list { display: grid; gap: 6px; }
.summary-record-row { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 9px; align-items: start; padding: 7px 0; border-bottom: 1px solid color-mix(in srgb, var(--b3-border-color) 60%, transparent); }
.summary-record-row:last-child { border-bottom: 0; }
.summary-record-row time { color: var(--b3-theme-on-surface-light); font-size: 11px; white-space: nowrap; }
.summary-record-row > div { min-width: 0; }
.summary-record-row strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 600; }
.summary-record-row small, .summary-record-row p { display: block; margin: 3px 0 0; color: var(--b3-theme-on-surface-light); font-size: 11px; line-height: 1.45; }
.summary-record-row p { overflow-wrap: anywhere; }
.list-block-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; font-size: 13px; font-weight: 600; }
.list-block-subtle { font-size: 12px; font-weight: 400; color: var(--b3-theme-on-surface-light); }
.inline-empty, .panel-empty { padding: 12px 0; font-size: 12px; line-height: 1.6; color: var(--b3-theme-on-surface-light); }
.summary-document-editor { min-width: 0; padding: 14px; border: 1px solid var(--b3-border-color); border-radius: 10px; background: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background)); }
.summary-document-header { flex-wrap: wrap; }
.summary-document-heading { display: flex; align-items: baseline; gap: 10px; flex: 1; min-width: 0; }
.summary-document-heading > span:first-child { flex-shrink: 0; }
.summary-document-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.summary-open-document { flex-shrink: 0; }
.summary-export-receipt { flex-shrink: 0; }
.summary-document-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.summary-delete-document { color: var(--b3-theme-error); }
.summary-document-protyle { min-height: 180px; margin-top: 10px; overflow: auto; border: 1px solid var(--b3-border-color); border-radius: 8px; }
.summary-receipt-overlay { position: fixed; z-index: 1000; inset: 0; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgb(0 0 0 / 68%); }
.summary-receipt-dialog { display: flex; flex-direction: column; width: min(720px, 100%); max-height: min(92vh, 980px); overflow: hidden; border: 1px solid var(--b3-border-color); border-radius: 14px; background: var(--b3-theme-background); box-shadow: 0 20px 60px rgb(0 0 0 / 30%); }
.summary-receipt-dialog-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 16px 18px 12px; border-bottom: 1px solid var(--b3-border-color); }
.summary-receipt-dialog-head h3 { margin: 0; font-size: 16px; }
.summary-receipt-dialog-head p { margin: 5px 0 0; color: var(--b3-theme-on-surface-light); font-size: 12px; }
.summary-receipt-close { width: 30px; height: 30px; flex: 0 0 auto; border: 0; border-radius: 7px; color: var(--b3-theme-on-surface); background: transparent; font-size: 24px; line-height: 1; cursor: pointer; }
.summary-receipt-close:hover { background: var(--b3-list-hover); }
.summary-receipt-preview-frame { min-height: 0; overflow: auto; padding: 20px; background: #202020; text-align: center; }
.summary-receipt-preview-frame img { display: block; width: min(620px, 100%); height: auto; margin: 0 auto; box-shadow: 0 6px 22px rgb(0 0 0 / 34%); }
.summary-receipt-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--b3-border-color); }
.summary-receipt-confirm { color: var(--b3-theme-on-primary); background: var(--b3-theme-primary); }
.summary-receipt-confirm:hover:not(:disabled) { border-color: transparent; filter: brightness(1.08); }
.summary-document-protyle :deep(.protyle-content) { min-height: 180px; overflow: auto; }
.summary-document-protyle :deep(.protyle-wysiwyg) { min-height: 160px; padding: 12px !important; }
.summary-task-list { display: grid; gap: 6px; }
.summary-task-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px; border: 0; border-radius: 7px; background: transparent; color: var(--b3-theme-on-surface); text-align: left; cursor: pointer; }
.summary-task-row:hover { background: var(--b3-list-hover); }
.summary-task-row:disabled { cursor: default; }
.summary-task-row small { margin-left: auto; color: var(--b3-theme-on-surface-light); font-size: 11px; white-space: nowrap; }
.summary-task-row { box-sizing: border-box; min-width: 0; font-size: 13px; line-height: 1.5; }
.summary-task-check { color: var(--b3-theme-success); font-weight: 700; }
.summary-task-dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: var(--b3-theme-error); }
.summary-task-title { display: block !important; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap !important; word-break: normal !important; overflow-wrap: normal !important; font: inherit; }
.summary-task-title :deep(*) { display: inline !important; white-space: nowrap !important; word-break: normal !important; overflow-wrap: normal !important; }
.summary-task-title :deep(br) { display: none !important; }
@container (max-width: 640px) {
  .summary-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .summary-section-grid { grid-template-columns: 1fr; }
  .summary-record-grid { grid-template-columns: 1fr; }
}
@container (max-width: 360px) {
  .summary-task-row { flex-wrap: wrap; }
  .summary-task-row small { width: 100%; margin-left: 15px; }
}
</style>
