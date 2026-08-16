<template>
  <section class="checkin-notes-overview">
    <div class="checkin-notes-overview-filters">
      <div class="checkin-notes-type-filters">
        <button
          v-for="option in typeOptions"
          :key="option.value"
          type="button"
          :class="{ active: selectedType === option.value }"
          @click="selectedType = option.value"
        >{{ option.label }}</button>
      </div>
      <button
        type="button"
        class="checkin-notes-search-btn ariaLabel"
        :class="{ active: searchVisible }"
        :aria-label="t('checkinNotes.searchButton')"
        @click="toggleSearch"
      >
        <Icon name="search" width="16" height="16" />
      </button>
      <div ref="moreMenuRef" class="checkin-notes-more-menu-wrap">
        <button type="button" class="checkin-notes-more-btn ariaLabel" :aria-label="t('taskManager.more')" :aria-expanded="moreMenuVisible" @click="moreMenuVisible = !moreMenuVisible">
          <Icon name="moreVertical" width="16" height="16" />
        </button>
        <section v-if="moreMenuVisible" class="checkin-notes-more-dialog" role="menu" :aria-label="t('taskManager.more')">
        <button
          v-if="mode === 'annotations'"
          type="button"
          :disabled="filteredItems.length === 0"
          @click="moreMenuVisible = false; openSyncDialog()"
        >
          {{ t('checkinNotes.syncToDocument') }}
        </button>
        <button type="button" :disabled="filteredItems.length === 0" @click="moreMenuVisible = false; exportMarkdown()">
          {{ t('checkinNotes.exportMarkdown') }}
        </button>
        <button type="button" @click="moreMenuVisible = false; openDataManager()">
          {{ t('checkinNotes.manageData') }}
        </button>
      </section>
    </div>
    </div>
    <div v-show="searchVisible" class="checkin-notes-search-panel">
      <div class="checkin-notes-search-wrap">
        <Icon name="search" width="15" height="15" />
        <input ref="searchInputRef" v-model="query" type="search" :placeholder="t('checkinNotes.searchPlaceholder')" />
      </div>
      <div class="checkin-notes-range-controls">
        <div class="checkin-notes-range-modes">
          <button type="button" :class="{ active: searchScope === 'month' }" @click="setSearchScope('month')">{{ t('checkinNotes.rangeCurrentMonth') }}</button>
          <button type="button" :class="{ active: searchScope === 'all' }" @click="setSearchScope('all')">{{ t('checkinNotes.rangeAll') }}</button>
          <button type="button" :class="{ active: searchScope === 'range' }" @click="setSearchScope('range')">{{ t('checkinNotes.rangeCustom') }}</button>
        </div>
        <div v-if="searchScope === 'range'" class="checkin-notes-date-range">
          <label>
            <span>{{ t('checkinNotes.rangeStart') }}</span>
            <input v-model="rangeStart" type="date" :max="rangeEnd || undefined" />
          </label>
          <span aria-hidden="true">-</span>
          <label>
            <span>{{ t('checkinNotes.rangeEnd') }}</span>
            <input v-model="rangeEnd" type="date" :min="rangeStart || undefined" />
          </label>
        </div>
      </div>
      <div v-if="rangeError" class="checkin-notes-range-error">{{ rangeError }}</div>
    </div>
    <header class="checkin-notes-overview-toolbar">
      <button type="button" class="period-button" :aria-label="t('date.previousMonth')" :disabled="searchScope !== 'month'" @click="emit('changePeriod', -1)">
        <Icon name="left" width="16" height="16" />
      </button>
      <div class="checkin-notes-overview-period">
        <span>{{ activePeriodLabel }}</span>
        <button type="button" class="checkin-notes-today-btn" :disabled="searchScope === 'month' && isCurrentMonth" @click="goToCurrentMonth">{{ t('taskManager.today') }}</button>
        <button
          v-if="searchScope === 'month'"
          type="button"
          class="checkin-notes-heatmap-btn ariaLabel"
          :class="{ active: heatmapVisible }"
          :aria-label="t('checkinNotes.heatmapButton')"
          @click="heatmapVisible = !heatmapVisible"
        >
          <Icon name="calendar" width="16" height="16" />
        </button>
      </div>
      <button type="button" class="period-button" :aria-label="t('date.nextMonth')" :disabled="searchScope !== 'month'" @click="emit('changePeriod', 1)">
        <Icon name="right" width="16" height="16" />
      </button>
    </header>
    <div v-if="syncDialogVisible" class="checkin-notes-sync-overlay" @click.self="closeSyncDialog">
      <section class="checkin-notes-sync-dialog" role="dialog" aria-modal="true" :aria-label="t('checkinNotes.syncToDocument')">
        <div class="checkin-notes-sync-header">
          <strong>{{ t('checkinNotes.syncToDocument') }}</strong>
          <button type="button" class="checkin-notes-sync-close" :aria-label="t('common.close')" @click="closeSyncDialog">×</button>
        </div>
        <input v-model="documentQuery" class="checkin-notes-sync-search" type="search" :placeholder="t('checkinNotes.searchDocument')" />
        <div class="checkin-notes-sync-list">
          <template v-for="group in syncDocumentTreeGroups" :key="group.key">
            <div v-for="row in group.rows" :key="row.key" class="checkin-notes-sync-tree-row" :class="`is-${row.type}`" :style="{ '--sync-document-depth': row.depth }">
              <template v-if="row.type === 'notebook'">
                <button type="button" class="checkin-notes-sync-tree-expand" :class="{ expanded: isSyncNotebookExpanded(row.notebookId) }" @click="toggleSyncNotebook(row.notebookId)">
                  <Icon name="chevronRight" width="14" height="14" />
                </button>
                <span class="checkin-notes-sync-notebook-name">{{ row.name }}</span>
              </template>
              <template v-else>
                <button v-if="row.hasChildren" type="button" class="checkin-notes-sync-tree-expand" :class="{ expanded: isSyncDocumentExpanded(row.document) }" @click="toggleSyncDocument(row.document)">
                  <Icon name="chevronRight" width="14" height="14" />
                </button>
                <span v-else class="checkin-notes-sync-tree-expand-placeholder"></span>
                <button type="button" class="checkin-notes-sync-document-item" :class="{ active: selectedSyncDocumentId === row.document.id }" @click="selectedSyncDocumentId = row.document.id">
                  {{ row.document.name }}
                </button>
              </template>
            </div>
          </template>
          <div v-if="!syncLoading && filteredSyncDocuments.length === 0" class="checkin-notes-sync-empty">{{ t('checkinNotes.noDocuments') }}</div>
          <div v-if="syncLoading" class="checkin-notes-sync-empty">{{ t('checkinNotes.loadingDocuments') }}</div>
        </div>
        <div class="checkin-notes-sync-actions">
          <button type="button" @click="closeSyncDialog">{{ t('common.cancel') }}</button>
          <button type="button" :disabled="!selectedSyncDocumentId || syncing" @click="syncToDocument">{{ syncing ? t('checkinNotes.syncing') : syncActionLabel }}</button>
        </div>
      </section>
    </div>

    <div v-if="dataManagerVisible" class="checkin-notes-data-overlay" @click.self="closeDataManager">
      <section class="checkin-notes-data-dialog" role="dialog" aria-modal="true" :aria-label="t('checkinNotes.manageData')">
        <header class="checkin-notes-data-header">
          <strong>{{ t('checkinNotes.manageData') }}</strong>
          <button type="button" :aria-label="t('common.close')" @click="closeDataManager"><Icon name="close" width="15" height="15" /></button>
        </header>
        <div class="checkin-notes-data-actions">
          <button type="button" :disabled="dataBusy" @click="exportBackup">
            <Icon name="arrowDown" width="15" height="15" />
            <span>{{ t('checkinNotes.exportBackup') }}</span>
          </button>
          <button type="button" :disabled="dataBusy" @click="backupFileInputRef?.click()">
            <Icon name="open" width="15" height="15" />
            <span>{{ t('checkinNotes.importBackup') }}</span>
          </button>
          <input ref="backupFileInputRef" class="checkin-notes-backup-input" type="file" accept="application/json,.json" @change="importBackup" />
        </div>
        <div class="checkin-notes-trash-header">
          <strong>{{ t('checkinNotes.trashTitle') }}</strong>
          <span>{{ t('checkinNotes.trashCount').replace('{count}', String(trashItems.length)) }}</span>
        </div>
        <div class="checkin-notes-trash-list">
          <div v-if="trashLoading" class="checkin-notes-trash-empty">{{ t('checkinNotes.loading') }}</div>
          <div v-else-if="trashItems.length === 0" class="checkin-notes-trash-empty">{{ t('checkinNotes.trashEmpty') }}</div>
          <template v-else>
            <article v-for="item in trashItems" :key="`${item.month}:${item.entry.eventKey}`" class="checkin-notes-trash-item">
              <div class="checkin-notes-trash-copy">
                <strong>{{ item.entry.context?.title || getTypeLabel(inferType(item.entry.eventKey)) }}</strong>
                <span>{{ item.month }} · {{ formatDeletedAt(item.entry.deletedAt) }}</span>
                <p>{{ item.entry.content }}</p>
              </div>
              <div class="checkin-notes-trash-actions">
                <button type="button" :disabled="dataBusy" :title="t('checkinNotes.restore')" :aria-label="t('checkinNotes.restore')" @click="restoreTrashItem(item)">
                  <Icon name="refresh" width="14" height="14" />
                </button>
                <template v-if="pendingPurgeKey === `${item.month}:${item.entry.eventKey}`">
                  <button type="button" :disabled="dataBusy" @click="pendingPurgeKey = ''">{{ t('common.cancel') }}</button>
                  <button type="button" class="is-danger" :disabled="dataBusy" @click="purgeTrashItem(item)">{{ t('common.delete') }}</button>
                </template>
                <button v-else type="button" :disabled="dataBusy" :title="t('checkinNotes.deletePermanently')" :aria-label="t('checkinNotes.deletePermanently')" @click="pendingPurgeKey = `${item.month}:${item.entry.eventKey}`">
                  <Icon name="trash" width="13" height="13" />
                </button>
              </div>
            </article>
          </template>
        </div>
        <footer v-if="trashItems.length > 0" class="checkin-notes-trash-footer">
          <template v-if="confirmEmptyTrash">
            <span>{{ t('checkinNotes.emptyTrashConfirm') }}</span>
            <button type="button" :disabled="dataBusy" @click="confirmEmptyTrash = false">{{ t('common.cancel') }}</button>
            <button type="button" class="is-danger" :disabled="dataBusy" @click="emptyTrash">{{ t('checkinNotes.emptyTrash') }}</button>
          </template>
          <button v-else type="button" :disabled="dataBusy" @click="confirmEmptyTrash = true">{{ t('checkinNotes.emptyTrash') }}</button>
        </footer>
      </section>
    </div>

    <div v-if="heatmapVisible && !loading && !loadError && heatmapHasRecords" class="checkin-notes-heatmap">
      <div class="checkin-notes-heatmap-weekdays" aria-hidden="true">
        <span v-for="weekday in heatmapWeekdays" :key="weekday">{{ weekday }}</span>
      </div>
      <div class="checkin-notes-heatmap-grid">
        <span
          v-for="cell in heatmapLeadingCells"
          :key="`empty-${cell}`"
          class="checkin-notes-heatmap-cell is-empty"
          aria-hidden="true"
        ></span>
        <button
          v-for="day in heatmapDays"
          :key="day.date"
          type="button"
          class="checkin-notes-heatmap-cell"
          :class="[`level-${day.level}`, { selected: selectedHeatmapDate === day.date }]"
          :disabled="day.count === 0"
          :aria-label="formatHeatmapDayLabel(day.date, day.count)"
          :title="formatHeatmapDayLabel(day.date, day.count)"
          @click="selectHeatmapDate(day.date)"
        >{{ day.day }}</button>
      </div>
    </div>

    <div v-if="undoDelete" class="checkin-notes-undo" role="status">
      <span>{{ t('checkinNotes.movedToTrash') }}</span>
      <button type="button" :disabled="undoingDelete" @click="undoLastDelete">{{ t('checkinNotes.undo') }}</button>
      <button type="button" :aria-label="t('common.close')" @click="clearUndoDelete"><Icon name="close" width="13" height="13" /></button>
    </div>
    <div v-if="loading" class="checkin-notes-state">{{ t('checkinNotes.loading') }}</div>
    <div v-else-if="loadError" class="checkin-notes-state is-error">
      <span>{{ loadError }}</span>
      <button type="button" @click="loadEntries">{{ t('checkinNotes.retry') }}</button>
    </div>
    <div v-else-if="timelineItems.length === 0" class="checkin-notes-state">
      {{ emptyStateText }}
    </div>
    <div v-else ref="timelineContainerRef" class="checkin-notes-timeline">
      <LifelogTimelinePanel
        variant="embedded"
        fill-height
        :show="true"
        title=""
        subtitle=""
        :items="timelineItems"
        :empty-text="t('checkinNotes.noNotes')"
        :close-label="t('common.close')"
        :delete-label="t('common.delete')"
        :cancel-label="t('common.cancel')"
        :delete-confirm-title="t('checkinNotes.deleteConfirm')"
        :delete-confirm-message="t('checkinNotes.deleteConfirmMessage')"
        :editor-placeholder="t('checkinNotes.searchPlaceholder')"
        :star-label="t('checkinNotes.star')"
        :unstar-label="t('checkinNotes.unstar')"
        :open-source-label="t('checkinNotes.openSource')"
        @update-item="updateTimelineRecord"
        @update-annotation="updateTimelineAnnotation"
        @toggle-star="toggleTimelineStar"
        @open-source="openTimelineSource"
        @delete-item="deleteTimelineItem"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import LifelogTimelinePanel, { type LifelogTimelinePanelItem } from './LifelogTimelinePanel.vue';
import {
  CHECKIN_NOTE_STORAGE_PREFIX,
  createCheckinNoteBackup,
  emptyCheckinNoteTrash,
  getCheckinNoteMonthsInRange,
  getCheckinNotesForMonths,
  purgeCheckinNote,
  restoreCheckinNoteBackup,
  type CheckinNoteContext,
  type CheckinNoteEntry,
  type CheckinNoteTrashEntry
} from '@/checkinNoteRepository';
import { appendBlock, getBlockByID, lsNotebooks, pushMsg, readDir, updateBlock } from '@/api';
import { getCheckinNoteSyncTarget, saveCheckinNoteSyncTarget, type CheckinNoteSyncFormat, type CheckinNoteSyncTarget } from '@/checkinNoteSyncRepository';
import { useCheckinNotes } from '@/composables/useCheckinNotes';
import { useI18n } from '@/composables/useI18n';
import { getRecordCheckinContext, type RecordViewItem } from '@/utils/recordViewItems';
import { loadFiletreeDocumentTree } from '@/utils/filetreeDocumentTree';
import type { FocusLifelogEvent } from '@/utils/lifelogEvents';

export type CheckinNoteOverviewType = 'habit' | 'task' | 'focus' | 'manual-note';

interface OverviewItem extends CheckinNoteEntry {
  type: CheckinNoteOverviewType;
  date: string;
  title: string;
  meta: string;
  sourceId?: string;
  isRecord?: boolean;
  recordDeletable?: boolean;
  storageMonth?: string;
}

interface SyncDocument {
  id: string;
  notebookId: string;
  notebookName: string;
  name: string;
  parentId?: string;
  storagePath?: string;
}

type SyncDocumentTreeRow =
  | { type: 'notebook'; key: string; depth: number; notebookId: string; name: string }
  | { type: 'document'; key: string; depth: number; document: SyncDocument; hasChildren: boolean };

interface SyncDocumentTreeGroup {
  key: string;
  rows: SyncDocumentTreeRow[];
}

interface TrashOverviewItem {
  month: string;
  entry: CheckinNoteTrashEntry;
}

const props = defineProps<{
  month: string;
  periodLabel: string;
  records: RecordViewItem[];
  mode: 'annotations' | 'favorites';
}>();
const emit = defineEmits<{
  changePeriod: [offset: number];
  openEvent: [context: CheckinNoteContext];
  updateRecord: [item: LifelogTimelinePanelItem, text: string];
  deleteRecord: [item: LifelogTimelinePanelItem];
}>();
const { t } = useI18n();
const { refreshMonths, updateNote } = useCheckinNotes();
const entries = ref<Record<string, CheckinNoteEntry>>({});
const entryMonths = ref<Record<string, string>>({});
const loading = ref(false);
const loadError = ref('');
const query = ref('');
const selectedType = ref<'all' | CheckinNoteOverviewType>('all');
const savingKey = ref('');
const itemErrorKey = ref('');
const selectedHeatmapDate = ref('');
const timelineContainerRef = ref<HTMLElement | null>(null);
const searchVisible = ref(false);
const searchScope = ref<'month' | 'all' | 'range'>('month');
const rangeStart = ref('');
const rangeEnd = ref('');
const heatmapVisible = ref(false);
const moreMenuVisible = ref(false);
const moreMenuRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const syncDialogVisible = ref(false);
const syncLoading = ref(false);
const syncing = ref(false);
const syncDocuments = ref<SyncDocument[]>([]);
const selectedSyncDocumentId = ref('');
const documentQuery = ref('');
const expandedSyncNotebookIds = ref(new Set<string>());
const expandedSyncDocumentKeys = ref(new Set<string>());
const syncTarget = ref<CheckinNoteSyncTarget | null>(null);
const dataManagerVisible = ref(false);
const dataBusy = ref(false);
const trashLoading = ref(false);
const trashItems = ref<TrashOverviewItem[]>([]);
const backupFileInputRef = ref<HTMLInputElement | null>(null);
const pendingPurgeKey = ref('');
const confirmEmptyTrash = ref(false);
const undoDelete = ref<{ month: string; entry: OverviewItem } | null>(null);
const undoingDelete = ref(false);
const DEFAULT_SYNC_FORMAT: CheckinNoteSyncFormat = 'superblock-row-v1';
let heatmapHighlightTimer: number | null = null;
let undoDeleteTimer: number | null = null;
let loadRequestId = 0;
const CHECKIN_NOTE_STORAGE_DIRECTORY = '/data/storage/petal/pinch';
const CHECKIN_NOTE_FILE_PATTERN = new RegExp(`^${CHECKIN_NOTE_STORAGE_PREFIX}(\\d{4}-\\d{2})\\.json$`);

async function toggleSearch(): Promise<void> {
  searchVisible.value = !searchVisible.value;
  if (searchVisible.value) {
    await nextTick();
    searchInputRef.value?.focus();
  }
}

const currentMonth = computed(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
});

const isCurrentMonth = computed(() => props.month === currentMonth.value);
const rangeError = computed(() => {
  if (searchScope.value !== 'range') return '';
  if (!rangeStart.value || !rangeEnd.value) return t('checkinNotes.rangeRequired');
  if (rangeStart.value > rangeEnd.value) return t('checkinNotes.rangeInvalid');
  return '';
});
const activePeriodLabel = computed(() => {
  if (searchScope.value === 'all') return t('checkinNotes.rangeAllRecords');
  if (searchScope.value === 'range' && rangeStart.value && rangeEnd.value) {
    return `${rangeStart.value} - ${rangeEnd.value}`;
  }
  return props.periodLabel;
});
const activeRangeKey = computed(() => {
  if (searchScope.value === 'all') return 'all';
  if (searchScope.value === 'range') return `${rangeStart.value || 'start'}_${rangeEnd.value || 'end'}`;
  return props.month;
});
const emptyStateText = computed(() => {
  if (query.value.trim() || selectedType.value !== 'all') return t('checkinNotes.noSearchResults');
  if (searchScope.value !== 'month') {
    return t(props.mode === 'favorites' ? 'checkinNotes.noFavoritesInRange' : 'checkinNotes.noNotesInRange');
  }
  return t(props.mode === 'favorites' ? 'checkinNotes.noFavorites' : 'checkinNotes.noNotes');
});
const syncScope = computed(() => `${activeRangeKey.value}:${props.mode}`);
const syncActionLabel = computed(() => (
  syncTarget.value?.documentId === selectedSyncDocumentId.value && isManagedSyncFormat(syncTarget.value.format)
    ? t('checkinNotes.updateSync')
    : isLegacySyncTarget.value
      ? t('checkinNotes.createUpdatableSync')
    : t('checkinNotes.sync')
));
const isLegacySyncTarget = computed(() => (
  syncTarget.value?.documentId === selectedSyncDocumentId.value
  && syncTarget.value.format !== 'blockquote-v1'
));

function goToCurrentMonth(): void {
  setSearchScope('month');
  const [year, month] = props.month.split('-').map(Number);
  const [currentYear, currentMonthNumber] = currentMonth.value.split('-').map(Number);
  if (!year || !month || !currentYear || !currentMonthNumber) return;
  const offset = (currentYear - year) * 12 + currentMonthNumber - month;
  if (offset) emit('changePeriod', offset);
}

function getMonthDateBounds(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return { start: '', end: '' };
  const dayCount = new Date(year, monthNumber, 0).getDate();
  return {
    start: `${year}-${String(monthNumber).padStart(2, '0')}-01`,
    end: `${year}-${String(monthNumber).padStart(2, '0')}-${String(dayCount).padStart(2, '0')}`
  };
}

function setSearchScope(scope: 'month' | 'all' | 'range'): void {
  if (scope === 'range' && (!rangeStart.value || !rangeEnd.value)) {
    const bounds = getMonthDateBounds(props.month);
    rangeStart.value = bounds.start;
    rangeEnd.value = bounds.end;
  }
  searchScope.value = scope;
  if (scope !== 'month') {
    clearHeatmapHighlight();
    heatmapVisible.value = false;
  }
}

function closeMoreMenuOnOutsideClick(event: MouseEvent): void {
  if (moreMenuRef.value?.contains(event.target as Node)) return;
  moreMenuVisible.value = false;
}

const typeOptions = computed(() => [
  { value: 'all' as const, label: t('checkinNotes.typeAll') },
  { value: 'habit' as const, label: t('checkinNotes.typeHabit') },
  { value: 'task' as const, label: t('checkinNotes.typeTask') },
  { value: 'focus' as const, label: t('checkinNotes.typeFocus') },
  { value: 'manual-note' as const, label: t('checkinNotes.typeRecord') }
]);

const filteredSyncDocuments = computed(() => {
  const normalizedQuery = documentQuery.value.trim().toLocaleLowerCase();
  if (!normalizedQuery) return syncDocuments.value;
  return syncDocuments.value.filter(document => [document.name, document.notebookName]
    .some(value => value.toLocaleLowerCase().includes(normalizedQuery)));
});

const syncDocumentTreeRows = computed<SyncDocumentTreeRow[]>(() => {
  const byNotebook = new Map<string, SyncDocument[]>();
  for (const document of filteredSyncDocuments.value) {
    const documents = byNotebook.get(document.notebookId) || [];
    documents.push(document);
    byNotebook.set(document.notebookId, documents);
  }
  const rows: SyncDocumentTreeRow[] = [];
  for (const [notebookId, documents] of [...byNotebook.entries()].sort(([, left], [, right]) =>
    (left[0]?.notebookName || '').localeCompare(right[0]?.notebookName || '', 'zh-CN')
  )) {
    rows.push({ type: 'notebook', key: `notebook:${notebookId}`, depth: 0, notebookId, name: documents[0]?.notebookName || notebookId });
    if (!isSyncNotebookExpanded(notebookId) && !documentQuery.value.trim()) continue;
    const documentsById = new Map(documents.map(document => [document.id, document]));
    const childrenByParentId = new Map<string | null, SyncDocument[]>();
    for (const document of documents) {
      const parentId = document.parentId && documentsById.has(document.parentId) ? document.parentId : null;
      const children = childrenByParentId.get(parentId) || [];
      children.push(document);
      childrenByParentId.set(parentId, children);
    }
    const appendDocuments = (parentId: string | null, depth: number): void => {
      for (const document of (childrenByParentId.get(parentId) || []).sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))) {
        const hasChildren = (childrenByParentId.get(document.id) || []).length > 0;
        rows.push({ type: 'document', key: `${document.notebookId}:${document.id}`, depth, document, hasChildren });
        if (hasChildren && (isSyncDocumentExpanded(document) || Boolean(documentQuery.value.trim()))) appendDocuments(document.id, depth + 1);
      }
    };
    appendDocuments(null, 1);
  }
  return rows;
});

const syncDocumentTreeGroups = computed<SyncDocumentTreeGroup[]>(() => {
  const groups: SyncDocumentTreeGroup[] = [];
  for (const row of syncDocumentTreeRows.value) {
    if (row.type === 'notebook') groups.push({ key: row.key, rows: [row] });
    else groups[groups.length - 1]?.rows.push(row);
  }
  return groups;
});

function isSyncNotebookExpanded(notebookId: string): boolean {
  return expandedSyncNotebookIds.value.has(notebookId);
}

function toggleSyncNotebook(notebookId: string): void {
  const next = new Set(expandedSyncNotebookIds.value);
  if (next.has(notebookId)) next.delete(notebookId);
  else next.add(notebookId);
  expandedSyncNotebookIds.value = next;
}

function isSyncDocumentExpanded(document: SyncDocument): boolean {
  return expandedSyncDocumentKeys.value.has(`${document.notebookId}:${document.id}`);
}

function toggleSyncDocument(document: SyncDocument): void {
  const key = `${document.notebookId}:${document.id}`;
  const next = new Set(expandedSyncDocumentKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedSyncDocumentKeys.value = next;
}

function inferType(eventKey: string): CheckinNoteOverviewType {
  if (eventKey.startsWith('task:')) return 'task';
  if (eventKey.startsWith('focus:')) return 'focus';
  return 'habit';
}

function inferDate(entry: CheckinNoteEntry, eventKey: string): string {
  const habitDate = eventKey.match(/^habit:[^:]+:(\d{4}-\d{2}-\d{2}):/i)?.[1];
  if (habitDate) return habitDate;
  const taskTimestamp = eventKey.startsWith('task:') ? eventKey.split(':').slice(2).join(':') : '';
  const timestamp = taskTimestamp || entry.createdAt || entry.updatedAt;
  const parsed = timestamp ? new Date(timestamp) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return props.month;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

const recordByEventKey = computed(() => {
  const result = new Map<string, RecordViewItem>();
  props.records.forEach(record => record.eventKeys.forEach(eventKey => result.set(eventKey, record)));
  return result;
});

const overviewItems = computed<OverviewItem[]>(() => Object.values(entries.value).map(entry => {
  const record = recordByEventKey.value.get(entry.eventKey);
  const context = entry.context || (record ? getRecordCheckinContext(record) : undefined);
  const recordType = record?.type === 'habit' || record?.type === 'task' || record?.type === 'focus'
    ? record.type
    : undefined;
  const type = context?.type || recordType || inferType(entry.eventKey);
  return {
    ...entry,
    context,
    storageMonth: entryMonths.value[entry.eventKey] || props.month,
    type,
    date: context?.occurredAt ? inferDate({ ...entry, createdAt: context.occurredAt }, entry.eventKey) : record?.date || inferDate(entry, entry.eventKey),
    title: context?.title || record?.title || getTypeLabel(type),
    meta: context?.meta || record?.meta || ''
  };
}).sort((left, right) => {
  const dateOrder = right.date.localeCompare(left.date);
  if (dateOrder !== 0) return dateOrder;
  return right.updatedAt.localeCompare(left.updatedAt);
}));

const manualRecordItems = computed<OverviewItem[]>(() => props.records
  .filter(record => record.type === 'manual-note' && isDateInActiveRange(record.date))
  .map(record => ({
    eventKey: `record:${record.id}`,
    content: record.content,
    createdAt: record.occurredAt,
    updatedAt: record.occurredAt,
    type: 'manual-note' as const,
    date: record.date,
    title: t('checkinNotes.typeRecord'),
    meta: record.meta,
    sourceId: record.sourceId,
    isRecord: true,
    recordDeletable: record.capabilities.deleteEvent
  })));

const displayItems = computed(() => props.mode === 'annotations'
  ? [...overviewItems.value, ...manualRecordItems.value].sort((left, right) => {
    const dateOrder = right.date.localeCompare(left.date);
    return dateOrder || right.updatedAt.localeCompare(left.updatedAt);
  })
  : overviewItems.value);

const filteredItems = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase();
  return displayItems.value.filter(item => {
    if (!isDateInActiveRange(item.date)) return false;
    if (selectedType.value !== 'all' && item.type !== selectedType.value) return false;
    if (props.mode === 'favorites' && item.starred !== true) return false;
    if (!normalizedQuery) return true;
    return [item.content, item.title, item.meta, item.date]
      .some(value => value.toLocaleLowerCase().includes(normalizedQuery));
  });
});

function isDateInActiveRange(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (searchScope.value === 'all') return true;
  if (searchScope.value === 'range') {
    return !rangeError.value && date >= rangeStart.value && date <= rangeEnd.value;
  }
  return date.startsWith(props.month);
}

const heatmapWeekdays = computed(() => [
  t('date.weekdayMonShort'),
  t('date.weekdayTueShort'),
  t('date.weekdayWedShort'),
  t('date.weekdayThuShort'),
  t('date.weekdayFriShort'),
  t('date.weekdaySatShort'),
  t('date.weekdaySunShort')
]);

const heatmapCounts = computed(() => {
  const counts = new Map<string, number>();
  filteredItems.value.forEach(item => counts.set(item.date, (counts.get(item.date) || 0) + 1));
  return counts;
});

const heatmapHasRecords = computed(() => heatmapCounts.value.size > 0);

const heatmapLeadingCells = computed(() => {
  const [year, month] = props.month.split('-').map(Number);
  if (!year || !month) return 0;
  const weekday = new Date(year, month - 1, 1).getDay();
  return (weekday + 6) % 7;
});

const heatmapDays = computed(() => {
  const [year, month] = props.month.split('-').map(Number);
  if (!year || !month) return [];
  const dayCount = new Date(year, month, 0).getDate();
  const maxCount = Math.max(1, ...heatmapCounts.value.values());
  return Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = heatmapCounts.value.get(date) || 0;
    return {
      day,
      date,
      count,
      level: count === 0 ? 0 : Math.max(1, Math.ceil((count / maxCount) * 4))
    };
  });
});

function formatHeatmapDayLabel(date: string, count: number): string {
  return t('checkinNotes.heatmapDayTemplate')
    .replace('{date}', date)
    .replace('{count}', String(count));
}

function clearHeatmapHighlight(): void {
  selectedHeatmapDate.value = '';
  if (heatmapHighlightTimer) {
    clearTimeout(heatmapHighlightTimer);
    heatmapHighlightTimer = null;
  }
}

function selectHeatmapDate(date: string): void {
  if (selectedHeatmapDate.value === date) {
    clearHeatmapHighlight();
    return;
  }
  selectedHeatmapDate.value = date;
  if (heatmapHighlightTimer) window.clearTimeout(heatmapHighlightTimer);
  void nextTick(() => {
    const escapedDate = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(date) : date;
    timelineContainerRef.value
      ?.querySelector<HTMLElement>(`.lifelog-timeline-group-header[data-date="${escapedDate}"], .lifelog-timeline-item[data-date="${escapedDate}"]`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  heatmapHighlightTimer = window.setTimeout(() => {
    selectedHeatmapDate.value = '';
    heatmapHighlightTimer = null;
  }, 2200);
}

function getTimelineType(type: CheckinNoteOverviewType): LifelogTimelinePanelItem['type'] {
  if (type === 'habit') return 'habit-checkin';
  if (type === 'task') return 'task-completed';
  if (type === 'manual-note') return 'manual-note';
  return 'focus';
}

function getTimelineIcon(type: CheckinNoteOverviewType): string {
  if (type === 'habit') return 'squareCheck';
  if (type === 'task') return 'taskCheckboxChecked';
  if (type === 'manual-note') return 'descriptionBubble';
  return 'timer';
}

function getTimelineTime(item: OverviewItem): string {
  const timestamp = item.context?.occurredAt || item.updatedAt || item.createdAt;
  const parsed = timestamp ? new Date(timestamp) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return item.date;
  const time = `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
  return time;
}

function formatGroupDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  const weekdayKeys = [
    'date.weekdaySunShort',
    'date.weekdayMonShort',
    'date.weekdayTueShort',
    'date.weekdayWedShort',
    'date.weekdayThuShort',
    'date.weekdayFriShort',
    'date.weekdaySatShort'
  ];
  const weekday = t(weekdayKeys[new Date(year, month - 1, day).getDay()]);
  return t('date.monthDayWeekdayTemplate')
    .replace('{month}', String(month))
    .replace('{day}', String(day))
    .replace('{weekday}', weekday);
}

function formatGroupCount(count: number): string {
  return t('checkinNotes.dayCountTemplate').replace('{count}', String(count));
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|>-]/g, '\\$&').replace(/\r?\n/g, ' ');
}

function formatSyncedItemTitle(item: OverviewItem, linkTaskSource: boolean): string {
  const sourceId = item.context?.sourceId?.trim() || '';
  if (linkTaskSource && item.type === 'task' && /^\d{14}-[a-z0-9]{7,}$/i.test(sourceId)) {
    const alias = item.title.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
    return `((${sourceId} "${alias || sourceId}"))`;
  }
  return escapeMarkdown(item.title);
}

function exportText(key: string, fallback: string): string {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function buildMarkdown(includeMetadata = true, dateHeadingLevel = 2, titleHeadingLevel = 1): string {
  if (filteredItems.value.length === 0) return;
  const modeLabel = props.mode === 'favorites'
    ? exportText('checkinNotes.favoriteRecords', '收藏')
    : exportText('checkinNotes.annotatedRecords', '备注记录');
  const lines = [
    `${'#'.repeat(titleHeadingLevel)} ${modeLabel} - ${activePeriodLabel.value}`,
    '',
    `${exportText('checkinNotes.exportCount', '备注数量')}: ${filteredItems.value.length}`,
    ''
  ];
  let previousDate = '';
  filteredItems.value.forEach(item => {
    if (item.date !== previousDate) {
      if (previousDate) lines.push('');
      lines.push(`${'#'.repeat(dateHeadingLevel)} ${formatGroupDate(item.date)}`);
      lines.push('');
      previousDate = item.date;
    }
    lines.push(`${'#'.repeat(dateHeadingLevel + 1)} ${escapeMarkdown(getTimelineTime(item))} ${formatSyncedItemTitle(item, !includeMetadata)}`);
    lines.push('');
    if (includeMetadata) {
      lines.push(`- ${exportText('checkinNotes.exportType', '类型')}: ${escapeMarkdown(getTypeLabel(item.type))}`);
      if (item.meta) lines.push(`- ${exportText('checkinNotes.exportMeta', '说明')}: ${escapeMarkdown(item.meta)}`);
      if (item.context) {
        lines.push(`- ${exportText('checkinNotes.exportSource', '原记录')}: ${escapeMarkdown(item.context.type)} / ${escapeMarkdown(item.context.sourceId)}`);
      }
      lines.push(`- ${exportText('checkinNotes.exportFavorite', '收藏')}: ${item.starred === true ? '是' : '否'}`);
      lines.push('');
    }
    lines.push(item.content.trim());
    lines.push('');
  });
  return lines.join('\n');
}

function exportMarkdown(): void {
  const markdown = buildMarkdown();
  if (!markdown) return;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Pinch-${props.mode === 'favorites' ? '收藏' : '备注记录'}-${props.month}.md`;
  link.download = `Pinch-${props.mode === 'favorites' ? 'favorites' : 'annotations'}-${activeRangeKey.value}.md`;
   link.click();
  URL.revokeObjectURL(url);
}

async function openSyncDialog(): Promise<void> {
  syncDialogVisible.value = true;
  documentQuery.value = '';
  try {
    syncTarget.value = await getCheckinNoteSyncTarget(syncScope.value);
    if (syncTarget.value) selectedSyncDocumentId.value = syncTarget.value.documentId;
  } catch (error) {
    console.error('[CheckinNotes] failed to load sync target:', error);
    syncTarget.value = null;
  }
  if (syncDocuments.value.length > 0) return;
  syncLoading.value = true;
  try {
    const notebookResult = await lsNotebooks();
    const notebooks = (notebookResult?.notebooks || []).filter(notebook => !notebook.closed);
    const trees = await Promise.all(notebooks.map(notebook => loadFiletreeDocumentTree(notebook.id)));
    syncDocuments.value = trees.flatMap((tree, index) => tree.map(document => ({
      ...document,
      notebookName: notebooks[index]?.name || document.notebookId
    })));
    expandedSyncNotebookIds.value = new Set(notebooks.map(notebook => notebook.id));
  } catch (error) {
    console.error('[CheckinNotes] failed to load documents for sync:', error);
    void pushMsg(t('checkinNotes.syncFailed'), 3000);
  } finally {
    syncLoading.value = false;
  }
}

function closeSyncDialog(): void {
  if (!syncing.value) syncDialogVisible.value = false;
}

async function syncToDocument(): Promise<void> {
  const document = syncDocuments.value.find(item => item.id === selectedSyncDocumentId.value);
  const markdown = buildMarkdown(false, 4, 3);
  if (!document || !markdown) return;
  const target = getManagedSyncTarget(document.id);
  const format = target?.format || DEFAULT_SYNC_FORMAT;
  const snapshotMarkdown = wrapSyncMarkdown(markdown, format);
  syncing.value = true;
  try {
    if (target) {
      const existingBlock = await getBlockByID(target.blockId);
      if (existingBlock?.id) {
        await updateBlock('markdown', snapshotMarkdown, target.blockId);
        await saveSyncTarget(document.id, target.blockId);
      } else {
        const result = await appendBlock('markdown', snapshotMarkdown, document.id);
        const blockId = getCreatedBlockId(result, document.id);
        if (!blockId) throw new Error('Could not identify the synchronized block');
        await saveSyncTarget(document.id, blockId);
      }
    } else {
      const result = await appendBlock('markdown', snapshotMarkdown, document.id);
      const blockId = getCreatedBlockId(result, document.id);
      if (!blockId) throw new Error('Could not identify the synchronized block');
      await saveSyncTarget(document.id, blockId);
    }
    void pushMsg(t('checkinNotes.syncSucceeded'), 3000);
    syncDialogVisible.value = false;
  } catch (error) {
    console.error('[CheckinNotes] failed to sync to document:', error);
    void pushMsg(t('checkinNotes.syncFailed'), 3000);
  } finally {
    syncing.value = false;
  }
}

function getManagedSyncTarget(documentId: string): CheckinNoteSyncTarget | null {
  const target = syncTarget.value;
  if (target?.documentId !== documentId || !isManagedSyncFormat(target.format) || !target.blockId) return null;
  return target;
}

function isManagedSyncFormat(value: unknown): value is CheckinNoteSyncFormat {
  return value === 'blockquote-v1' || value === 'superblock-row-v1';
}

function wrapSyncMarkdown(markdown: string, format: CheckinNoteSyncFormat): string {
  if (format === 'blockquote-v1') {
    return markdown.split(/\r?\n/).map(line => line ? `> ${line}` : '>').join('\n');
  }
  return `{{{row\n\n${markdown.trim()}\n\n}}}`;
}

function getCreatedBlockId(result: unknown, parentId: string): string {
  if (!Array.isArray(result)) return '';
  for (const item of result) {
    const operations = item && typeof item === 'object' && Array.isArray((item as { doOperations?: unknown }).doOperations)
      ? (item as { doOperations: Array<{ action?: unknown; id?: unknown; parentID?: unknown }> }).doOperations
      : [];
    const id = operations.find(operation => (
      operation.action === 'insert'
      && operation.parentID === parentId
      && typeof operation.id === 'string'
      && operation.id.trim()
    ))?.id;
    if (typeof id === 'string') return id.trim();
  }
  // Older kernels may omit parentID on the returned insert operation.
  for (const item of result) {
    const operations = item && typeof item === 'object' && Array.isArray((item as { doOperations?: unknown }).doOperations)
      ? (item as { doOperations: Array<{ action?: unknown; id?: unknown }> }).doOperations
      : [];
    const id = operations.find(operation => operation.action === 'insert' && typeof operation.id === 'string' && operation.id.trim())?.id;
    if (typeof id === 'string') return id.trim();
  }
  return '';
}

async function saveSyncTarget(documentId: string, blockId: string): Promise<void> {
  const target = { documentId, blockId, format: DEFAULT_SYNC_FORMAT, updatedAt: new Date().toISOString() };
  await saveCheckinNoteSyncTarget(syncScope.value, target);
  syncTarget.value = target;
}

const overviewItemByEventKey = computed(() => new Map(
  filteredItems.value.map(item => [item.eventKey, item] as const)
));

const timelineItems = computed<LifelogTimelinePanelItem[]>(() => {
  const counts = new Map<string, number>();
  filteredItems.value.forEach(item => counts.set(item.date, (counts.get(item.date) || 0) + 1));
  const seenDates = new Set<string>();
  return filteredItems.value.map((item, index) => {
    const isFirstOfDay = !seenDates.has(item.date);
    seenDates.add(item.date);
    return {
      id: item.eventKey,
      sourceId: item.isRecord ? item.sourceId : item.context?.sourceId,
      type: getTimelineType(item.type),
      date: item.date,
      timeLabel: getTimelineTime(item),
      sortMinutes: index,
      title: item.title,
      meta: item.meta,
      note: item.isRecord ? item.content : '',
      icon: getTimelineIcon(item.type),
      deletable: item.isRecord ? item.recordDeletable === true : true,
      editable: item.isRecord && Boolean(item.sourceId),
      annotationKey: item.isRecord ? undefined : item.eventKey,
      annotationDate: item.isRecord ? undefined : item.storageMonth,
      annotation: item.isRecord ? undefined : item.content,
      annotationEditable: !item.isRecord,
      starred: item.isRecord ? undefined : item.starred === true,
      favoritable: !item.isRecord,
      openable: Boolean(getOverviewOpenContext(item)),
      highlighted: selectedHeatmapDate.value === item.date,
      groupLabel: isFirstOfDay ? formatGroupDate(item.date) : undefined,
      groupCountText: isFirstOfDay ? formatGroupCount(counts.get(item.date) || 0) : undefined
    };
  });
});

async function toggleStar(item: OverviewItem): Promise<void> {
  if (savingKey.value) return;
  savingKey.value = item.eventKey;
  itemErrorKey.value = '';
  try {
    await updateNote(item.storageMonth || props.month, item.eventKey, item.content, item.context, item.starred !== true);
    await loadEntries();
  } catch (error) {
    console.error('[CheckinNotes] favorite update failed:', error);
    itemErrorKey.value = item.eventKey;
  } finally {
    savingKey.value = '';
  }
}

function getTypeLabel(type: CheckinNoteOverviewType): string {
  if (type === 'manual-note') return t('checkinNotes.typeRecord');
  return t(`checkinNotes.type${type[0].toUpperCase()}${type.slice(1)}`);
}

async function loadEntries(): Promise<void> {
  if (!props.month) return;
  const requestId = ++loadRequestId;
  loading.value = true;
  loadError.value = '';
  try {
    if (rangeError.value) {
      entries.value = {};
      entryMonths.value = {};
      return;
    }
    const months = await getMonthsToLoad();
    const storages = await getCheckinNotesForMonths(months);
    if (requestId !== loadRequestId) return;
    const nextEntries: Record<string, CheckinNoteEntry> = {};
    const nextEntryMonths: Record<string, string> = {};
    for (const storage of storages) {
      for (const [eventKey, entry] of Object.entries(storage.entries)) {
        nextEntries[eventKey] = entry;
        nextEntryMonths[eventKey] = storage.month;
      }
    }
    entries.value = nextEntries;
    entryMonths.value = nextEntryMonths;
  } catch (error) {
    console.error('[CheckinNotes] overview load failed:', error);
    if (requestId === loadRequestId) loadError.value = t('checkinNotes.loadFailed');
  } finally {
    if (requestId === loadRequestId) loading.value = false;
  }
}

async function getMonthsToLoad(): Promise<string[]> {
  if (searchScope.value === 'month') return [props.month];
  if (searchScope.value === 'range') {
    return getCheckinNoteMonthsInRange(rangeStart.value, rangeEnd.value);
  }

  return discoverStoredMonths();
}

async function discoverStoredMonths(): Promise<string[]> {
  const result = await readDir(CHECKIN_NOTE_STORAGE_DIRECTORY);
  const items = Array.isArray(result) ? result : [];
  const months = items.flatMap(item => {
    const name = item && typeof item === 'object' && 'name' in item ? String(item.name) : '';
    const month = name.match(CHECKIN_NOTE_FILE_PATTERN)?.[1];
    return month ? [month] : [];
  });
  return Array.from(new Set([...months, props.month])).sort();
}

async function openDataManager(): Promise<void> {
  dataManagerVisible.value = true;
  pendingPurgeKey.value = '';
  confirmEmptyTrash.value = false;
  await loadTrashItems();
}

function closeDataManager(): void {
  if (!dataBusy.value) dataManagerVisible.value = false;
}

async function loadTrashItems(): Promise<void> {
  trashLoading.value = true;
  try {
    const storages = await getCheckinNotesForMonths(await discoverStoredMonths());
    trashItems.value = storages.flatMap(storage => Object.values(storage.trash || {}).map(entry => ({
      month: storage.month,
      entry
    }))).sort((left, right) => right.entry.deletedAt.localeCompare(left.entry.deletedAt));
  } catch (error) {
    console.error('[CheckinNotes] trash load failed:', error);
    void pushMsg(t('checkinNotes.trashLoadFailed'), 3000);
  } finally {
    trashLoading.value = false;
  }
}

function formatDeletedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

async function exportBackup(): Promise<void> {
  dataBusy.value = true;
  try {
    const storages = await getCheckinNotesForMonths(await discoverStoredMonths());
    const backup = createCheckinNoteBackup(storages);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pinch-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    void pushMsg(t('checkinNotes.backupExported'), 3000);
  } catch (error) {
    console.error('[CheckinNotes] backup export failed:', error);
    void pushMsg(t('checkinNotes.backupExportFailed'), 3000);
  } finally {
    dataBusy.value = false;
  }
}

async function importBackup(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  dataBusy.value = true;
  try {
    const months = await restoreCheckinNoteBackup(await file.text());
    await refreshMonths(months);
    await loadEntries();
    await loadTrashItems();
    void pushMsg(t('checkinNotes.backupImported').replace('{count}', String(months.length)), 3000);
  } catch (error) {
    console.error('[CheckinNotes] backup import failed:', error);
    void pushMsg(t('checkinNotes.backupImportFailed'), 3000);
  } finally {
    dataBusy.value = false;
    input.value = '';
  }
}

async function restoreTrashItem(item: TrashOverviewItem): Promise<void> {
  dataBusy.value = true;
  try {
    await updateNote(item.month, item.entry.eventKey, item.entry.content, item.entry.context, item.entry.starred === true);
    await loadEntries();
    await loadTrashItems();
    void pushMsg(t('checkinNotes.restoreSucceeded'), 3000);
  } catch (error) {
    console.error('[CheckinNotes] trash restore failed:', error);
    void pushMsg(t('checkinNotes.restoreFailed'), 3000);
  } finally {
    dataBusy.value = false;
  }
}

async function purgeTrashItem(item: TrashOverviewItem): Promise<void> {
  dataBusy.value = true;
  try {
    await purgeCheckinNote(item.month, item.entry.eventKey);
    pendingPurgeKey.value = '';
    await loadTrashItems();
  } catch (error) {
    console.error('[CheckinNotes] trash purge failed:', error);
    void pushMsg(t('checkinNotes.purgeFailed'), 3000);
  } finally {
    dataBusy.value = false;
  }
}

async function emptyTrash(): Promise<void> {
  dataBusy.value = true;
  try {
    await emptyCheckinNoteTrash(await discoverStoredMonths());
    confirmEmptyTrash.value = false;
    await loadTrashItems();
  } catch (error) {
    console.error('[CheckinNotes] empty trash failed:', error);
    void pushMsg(t('checkinNotes.purgeFailed'), 3000);
  } finally {
    dataBusy.value = false;
  }
}

async function updateTimelineAnnotation(item: LifelogTimelinePanelItem, content: string): Promise<void> {
  const overviewItem = overviewItemByEventKey.value.get(item.id);
  if (!overviewItem || overviewItem.isRecord) return;
  itemErrorKey.value = '';
  try {
    await updateNote(overviewItem.storageMonth || props.month, overviewItem.eventKey, content, overviewItem.context, overviewItem.starred === true);
    await loadEntries();
  } catch (error) {
    console.error('[CheckinNotes] overview save failed:', error);
    itemErrorKey.value = overviewItem.eventKey;
  }
}

function updateTimelineRecord(item: LifelogTimelinePanelItem, content: string): void {
  if (item.type !== 'manual-note' || !item.sourceId) return;
  emit('updateRecord', item, content);
}

function toggleTimelineStar(item: LifelogTimelinePanelItem): void {
  const overviewItem = overviewItemByEventKey.value.get(item.id);
  if (overviewItem && !overviewItem.isRecord) void toggleStar(overviewItem);
}

function getOverviewOpenContext(overviewItem: OverviewItem): CheckinNoteContext | undefined {
  const sourceRecord = recordByEventKey.value.get(overviewItem.eventKey);
  const focusEvent = sourceRecord?.event.type === 'focus' ? sourceRecord.event as FocusLifelogEvent : undefined;
  return focusEvent?.targetType === 'habit' && focusEvent.targetId
    ? { type: 'habit' as const, sourceId: focusEvent.targetId, occurredAt: overviewItem.context?.occurredAt || sourceRecord!.occurredAt, title: focusEvent.title }
    : focusEvent?.targetType === 'task' && (focusEvent.targetBlockId || focusEvent.targetId)
      ? { type: 'task' as const, sourceId: focusEvent.targetBlockId || focusEvent.targetId!, occurredAt: overviewItem.context?.occurredAt || sourceRecord!.occurredAt, title: focusEvent.title }
      : focusEvent
        ? undefined
        : overviewItem.context;
}

function openTimelineSource(item: LifelogTimelinePanelItem): void {
  const overviewItem = overviewItemByEventKey.value.get(item.id);
  const context = overviewItem && getOverviewOpenContext(overviewItem);
  if (context) emit('openEvent', context);
}

async function deleteTimelineItem(item: LifelogTimelinePanelItem): Promise<void> {
  const overviewItem = overviewItemByEventKey.value.get(item.id);
  if (!overviewItem) return;
  if (overviewItem.isRecord) {
    emit('deleteRecord', item);
    return;
  }
  itemErrorKey.value = '';
  try {
    const month = overviewItem.storageMonth || props.month;
    await updateNote(month, overviewItem.eventKey, '');
    clearUndoDelete();
    undoDelete.value = { month, entry: { ...overviewItem } };
    undoDeleteTimer = window.setTimeout(clearUndoDelete, 8000);
    await loadEntries();
  } catch (error) {
    console.error('[CheckinNotes] overview delete failed:', error);
    itemErrorKey.value = overviewItem.eventKey;
  }
}

function clearUndoDelete(): void {
  undoDelete.value = null;
  if (undoDeleteTimer) {
    window.clearTimeout(undoDeleteTimer);
    undoDeleteTimer = null;
  }
}

async function undoLastDelete(): Promise<void> {
  const deleted = undoDelete.value;
  if (!deleted || undoingDelete.value) return;
  undoingDelete.value = true;
  try {
    await updateNote(
      deleted.month,
      deleted.entry.eventKey,
      deleted.entry.content,
      deleted.entry.context,
      deleted.entry.starred === true
    );
    clearUndoDelete();
    await loadEntries();
  } catch (error) {
    console.error('[CheckinNotes] delete undo failed:', error);
    void pushMsg(t('checkinNotes.restoreFailed'), 3000);
  } finally {
    undoingDelete.value = false;
  }
}

watch(() => props.month, () => {
  clearHeatmapHighlight();
  if (searchScope.value === 'month') void loadEntries();
}, { immediate: true });

watch(searchScope, () => void loadEntries());
watch([rangeStart, rangeEnd], () => {
  if (searchScope.value === 'range') void loadEntries();
});
watch([query, selectedType, () => props.mode, searchScope, rangeStart, rangeEnd], clearHeatmapHighlight);

onMounted(() => document.addEventListener('click', closeMoreMenuOnOutsideClick));
onUnmounted(() => {
  document.removeEventListener('click', closeMoreMenuOnOutsideClick);
  clearHeatmapHighlight();
  clearUndoDelete();
});
</script>

<style scoped>
.checkin-notes-overview { min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; border-radius: 12px; background: var(--b3-theme-background); }
.checkin-notes-overview-toolbar { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; }
.checkin-notes-overview-period { min-width: 0; flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--b3-theme-on-background); font-size: 14px; font-weight: 650; line-height: 28px; text-align: center; }
.checkin-notes-today-btn { height: 28px; border: 1px solid transparent; border-radius: 7px; padding: 0 10px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); font-size: 12px; white-space: nowrap; cursor: pointer; box-shadow: var(--pinch-shadow); }
.checkin-notes-today-btn:hover:not(:disabled) { background: var(--b3-list-hover); }
.checkin-notes-today-btn:disabled { opacity: .45; cursor: default; }
.period-button { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 6px; padding: 0; color: var(--b3-theme-on-surface); background: transparent; cursor: pointer; }
.period-button:hover { color: var(--b3-theme-on-background); background: var(--b3-list-hover); }
.period-button:disabled { opacity: .4; cursor: default; }
.checkin-notes-overview-filters { display: flex; align-items: center; gap: 4px; margin: 10px; }
.checkin-notes-search-panel { display: flex; flex-direction: column; gap: 8px; margin: -4px 0 12px; padding: 0 10px; }
.checkin-notes-search-wrap { display: flex; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--b3-border-color); border-radius: 8px; background: var(--b3-theme-surface); }
.checkin-notes-search-wrap input { flex: 1; min-width: 0; padding: 8px 0; border: 0; outline: none; color: inherit; background: transparent; }
.checkin-notes-range-controls { display: flex; align-items: center; gap: 8px; min-width: 0; }
.checkin-notes-range-modes { display: inline-flex; flex: 0 0 auto; gap: 2px; padding: 2px; border-radius: 7px; background: var(--b3-list-hover); }
.checkin-notes-range-modes button { height: 26px; border: 0; border-radius: 5px; padding: 0 9px; color: var(--b3-theme-on-surface); background: transparent; font-size: 12px; white-space: nowrap; cursor: pointer; }
.checkin-notes-range-modes button.active { color: var(--b3-theme-on-background); background: var(--b3-theme-background); box-shadow: var(--pinch-shadow); }
.checkin-notes-date-range { min-width: 0; display: flex; flex: 1; align-items: center; justify-content: flex-end; gap: 5px; }
.checkin-notes-date-range label { min-width: 0; display: flex; align-items: center; gap: 4px; color: var(--b3-theme-on-surface-light); font-size: 11px; }
.checkin-notes-date-range input { width: 128px; min-width: 0; height: 28px; border: 1px solid var(--b3-border-color); border-radius: 6px; padding: 0 6px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); font-size: 11px; }
.checkin-notes-range-error { color: var(--b3-card-error-color, #d23f31); font-size: 12px; }
.checkin-notes-type-filters { display: inline-flex; flex: 1; align-items: center; gap: 2px; min-width: 0; padding: 2px; border-radius: 9px; overflow-x: auto; overflow-y: hidden; background: var(--b3-list-hover); scrollbar-width: none; -ms-overflow-style: none; }
.checkin-notes-type-filters::-webkit-scrollbar { display: none; width: 0; height: 0; }
.checkin-notes-type-filters button { min-width: 0; height: 28px; flex: 1 1 0; border: 0; border-radius: 7px; padding: 0 6px; color: var(--b3-theme-on-surface); background: transparent; font-size: 13px; line-height: 1; white-space: nowrap; cursor: pointer; transition: background-color .15s ease, color .15s ease, box-shadow .15s ease; }
.checkin-notes-type-filters button:hover { color: var(--b3-theme-on-background); background: var(--b3-theme-background); }
.checkin-notes-type-filters button.active { color: var(--b3-theme-on-background); background: var(--b3-theme-background); box-shadow: var(--pinch-shadow); }
.checkin-notes-heatmap-btn, .checkin-notes-search-btn, .checkin-notes-more-btn { width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border: 0; border-radius: 6px; padding: 2px; color: var(--b3-theme-on-surface); background: transparent; cursor: pointer; transition: background-color .2s ease, color .2s ease; }
.checkin-notes-heatmap-btn:hover, .checkin-notes-heatmap-btn.active, .checkin-notes-search-btn:hover, .checkin-notes-search-btn.active, .checkin-notes-more-btn:hover { color: var(--b3-theme-on-background); background: var(--b3-list-hover); }
.checkin-notes-more-menu-wrap { position: relative; flex: 0 0 auto; }
.checkin-notes-more-dialog { position: absolute; z-index: 10; top: calc(100% + 4px); right: 0; width: 180px; display: flex; flex-direction: column; gap: 4px; padding: 8px; border-radius: 10px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); box-shadow: var(--pinch-menu-shadow); }
.checkin-notes-more-dialog button { min-height: 34px; display: flex; align-items: center; border: 0; border-radius: 7px; padding: 0 10px; color: inherit; background: transparent; text-align: left; cursor: pointer; }
.checkin-notes-more-dialog button:hover:not(:disabled) { background: var(--b3-list-hover); }
.checkin-notes-more-dialog button:disabled { opacity: .4; cursor: default; }
.checkin-notes-sync-overlay { position: fixed; z-index: 1001; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgb(0 0 0 / .35); }
.checkin-notes-sync-dialog { width: min(440px, 100%); max-height: min(560px, 100%); display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 10px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); box-shadow: var(--pinch-shadow); }
.checkin-notes-sync-header, .checkin-notes-sync-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.checkin-notes-sync-close, .checkin-notes-sync-actions button { border: 0; border-radius: 6px; padding: 5px 9px; color: inherit; background: var(--b3-list-hover); cursor: pointer; }
.checkin-notes-sync-actions button:last-child { color: var(--b3-theme-on-primary); background: var(--b3-theme-primary); }
.checkin-notes-sync-actions button:disabled { opacity: .45; cursor: default; }
.checkin-notes-sync-search { min-width: 0; padding: 8px 10px; border: 1px solid var(--b3-border-color); border-radius: 7px; color: inherit; background: transparent; }
.checkin-notes-sync-list { min-height: 130px; overflow: auto; border: 1px solid var(--b3-border-color); border-radius: 7px; }
.checkin-notes-sync-tree-row { min-height: 30px; display: flex; align-items: center; padding-left: calc(var(--sync-document-depth) * 18px); }
.checkin-notes-sync-tree-row.is-notebook { padding: 4px 8px; color: var(--b3-theme-on-surface-light); font-size: 12px; font-weight: 600; }
.checkin-notes-sync-tree-expand, .checkin-notes-sync-tree-expand-placeholder { width: 20px; height: 20px; flex: 0 0 20px; display: inline-flex; align-items: center; justify-content: center; }
.checkin-notes-sync-tree-expand { border: 0; padding: 0; color: inherit; background: transparent; cursor: pointer; }
.checkin-notes-sync-tree-expand svg { transition: transform .15s ease; }
.checkin-notes-sync-tree-expand.expanded svg { transform: rotate(90deg); }
.checkin-notes-sync-notebook-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.checkin-notes-sync-document-item { min-width: 0; flex: 1; border: 0; border-radius: 5px; padding: 6px 8px; color: inherit; background: transparent; overflow: hidden; text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.checkin-notes-sync-document-item:hover, .checkin-notes-sync-document-item.active { background: var(--b3-list-hover); }
.checkin-notes-sync-empty { color: var(--b3-theme-on-surface-light); }
.checkin-notes-sync-empty { padding: 14px; text-align: center; }
.checkin-notes-data-overlay { position: fixed; z-index: 1001; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgb(0 0 0 / .35); }
.checkin-notes-data-dialog { width: min(560px, 100%); max-height: min(640px, 100%); display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 8px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); box-shadow: var(--pinch-shadow); }
.checkin-notes-data-header, .checkin-notes-trash-header, .checkin-notes-trash-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.checkin-notes-data-header button, .checkin-notes-trash-actions button { min-width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 6px; padding: 0 7px; color: inherit; background: transparent; cursor: pointer; }
.checkin-notes-data-header button:hover, .checkin-notes-trash-actions button:hover { background: var(--b3-list-hover); }
.checkin-notes-data-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.checkin-notes-data-actions button { min-width: 0; height: 34px; display: flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--b3-border-color); border-radius: 7px; padding: 0 10px; color: inherit; background: var(--b3-theme-surface); cursor: pointer; }
.checkin-notes-data-actions button:hover:not(:disabled) { background: var(--b3-list-hover); }
.checkin-notes-data-actions button:disabled, .checkin-notes-trash-actions button:disabled, .checkin-notes-trash-footer button:disabled { opacity: .45; cursor: default; }
.checkin-notes-backup-input { display: none; }
.checkin-notes-trash-header { padding-top: 2px; }
.checkin-notes-trash-header span { color: var(--b3-theme-on-surface-light); font-size: 12px; }
.checkin-notes-trash-list { min-height: 120px; overflow: auto; border-block: 1px solid var(--b3-border-color); }
.checkin-notes-trash-empty { padding: 28px 12px; color: var(--b3-theme-on-surface-light); text-align: center; }
.checkin-notes-trash-item { display: flex; align-items: center; gap: 10px; padding: 10px 2px; border-bottom: 1px solid var(--b3-border-color); }
.checkin-notes-trash-item:last-child { border-bottom: 0; }
.checkin-notes-trash-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
.checkin-notes-trash-copy strong, .checkin-notes-trash-copy p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.checkin-notes-trash-copy span { color: var(--b3-theme-on-surface-light); font-size: 11px; }
.checkin-notes-trash-copy p { margin: 0; color: var(--b3-theme-on-surface); font-size: 12px; }
.checkin-notes-trash-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 3px; }
.checkin-notes-trash-actions button.is-danger, .checkin-notes-trash-footer button.is-danger { color: var(--b3-card-error-color, #d23f31); }
.checkin-notes-trash-footer { min-height: 30px; justify-content: flex-end; color: var(--b3-theme-on-surface); font-size: 12px; }
.checkin-notes-trash-footer button { min-height: 28px; border: 0; border-radius: 6px; padding: 4px 9px; color: inherit; background: var(--b3-list-hover); cursor: pointer; }
.checkin-notes-undo { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; margin: 0 10px 8px; padding: 7px 9px; border: 1px solid var(--b3-border-color); border-radius: 7px; color: var(--b3-theme-on-background); background: var(--b3-theme-surface); font-size: 12px; }
.checkin-notes-undo span { min-width: 0; flex: 1; }
.checkin-notes-undo button { border: 0; border-radius: 5px; padding: 3px 7px; color: var(--b3-theme-primary); background: transparent; cursor: pointer; }
.checkin-notes-undo button:last-child { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; padding: 0; color: var(--b3-theme-on-surface); }
.checkin-notes-heatmap { flex: 0 0 auto; margin: 0 0 12px; padding: 8px 10px; }
.checkin-notes-heatmap-weekdays, .checkin-notes-heatmap-grid { display: grid; grid-template-columns: repeat(7, minmax(24px, 1fr)); gap: 4px; }
.checkin-notes-heatmap-grid { grid-template-rows: repeat(6, 24px); }
.checkin-notes-heatmap-weekdays { margin-bottom: 4px; color: var(--b3-theme-on-surface-light); font-size: 10px; text-align: center; }
.checkin-notes-heatmap-cell { min-width: 0; height: 20px; border: 0; border-radius: 6px; padding: 0; color: var(--b3-theme-on-surface); background: var(--b3-list-hover); font-size: 10px; cursor: pointer; }
.checkin-notes-heatmap-cell.is-empty { background: transparent; }
.checkin-notes-heatmap-cell:disabled { opacity: .38; cursor: default; }
.checkin-notes-heatmap-cell.level-1 { background: color-mix(in srgb, var(--b3-theme-primary) 22%, var(--b3-theme-background)); }
.checkin-notes-heatmap-cell.level-2 { background: color-mix(in srgb, var(--b3-theme-primary) 40%, var(--b3-theme-background)); }
.checkin-notes-heatmap-cell.level-3 { color: var(--b3-theme-on-primary); background: color-mix(in srgb, var(--b3-theme-primary) 68%, var(--b3-theme-background)); }
.checkin-notes-heatmap-cell.level-4 { color: var(--b3-theme-on-primary); background: var(--b3-theme-primary); }
.checkin-notes-heatmap-cell.selected { outline: 2px solid var(--b3-theme-on-background); outline-offset: 1px; }
.checkin-notes-timeline { min-height: 0; flex: 1; overflow: hidden; }
.checkin-notes-state button { border: 0; border-radius: 6px; padding: 5px 8px; color: inherit; background: var(--b3-list-hover); cursor: pointer; }
.checkin-note-error, .checkin-notes-state.is-error { color: var(--b3-card-error-color, #d23f31); }
.checkin-note-error { margin-top: 6px; font-size: 12px; }
.checkin-notes-state { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--b3-theme-on-surface-light); }
@media (max-width: 720px) {
  .checkin-notes-overview-filters { align-items: center; gap: 7px; margin-bottom: 9px; }
  .checkin-notes-search-panel { margin: -2px 0 9px; padding: 0 7px; }
  .checkin-notes-range-controls { align-items: stretch; flex-direction: column; }
  .checkin-notes-range-modes { align-self: flex-start; }
  .checkin-notes-date-range { justify-content: stretch; }
  .checkin-notes-date-range label { flex: 1; }
  .checkin-notes-date-range input { width: auto; flex: 1; }
  .checkin-notes-data-dialog { padding: 12px; }
  .checkin-notes-data-actions { grid-template-columns: 1fr; }
  .checkin-notes-trash-item { align-items: flex-start; }
  .checkin-notes-type-filters { padding-bottom: 2px; }
  .checkin-notes-heatmap { margin-bottom: 9px; padding: 7px; }
  .checkin-notes-heatmap-weekdays, .checkin-notes-heatmap-grid { grid-template-columns: repeat(7, minmax(20px, 1fr)); gap: 3px; }
  .checkin-notes-heatmap-grid { grid-template-rows: repeat(6, 20px); }
}

@media (max-width: 380px) {
  .checkin-notes-overview-period { font-size: 12px; }
  .checkin-notes-heatmap-weekdays, .checkin-notes-heatmap-grid { grid-template-columns: repeat(7, minmax(18px, 1fr)); gap: 2px; }
}
</style>
