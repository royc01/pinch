<template>
  <div class="calendar-sync-settings">
    <div class="calendar-sync-tabs" role="tablist" :aria-label="t('calendarSync.title')">
      <button
        v-for="tab in tabs"
        :id="`${tabIdPrefix}-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        class="calendar-sync-tab"
        :class="{ 'is-active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`${tabIdPrefix}-panel-${tab.id}`"
        :tabindex="activeTab === tab.id ? 0 : -1"
        @click="activeTab = tab.id"
        @keydown="handleTabKeydown($event, tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-show="activeTab === 'cloud'"
      :id="`${tabIdPrefix}-panel-cloud`"
      class="calendar-sync-section"
      role="tabpanel"
      :aria-labelledby="`${tabIdPrefix}-tab-cloud`"
    >
      <CalendarCloudSettingsPanel
        v-model="cloud" :calendar-config="getNormalizedDraft()" :status="status" :disabled="busy"
        @busy-change="cloudBusy = $event"
      />
    </div>
    <div
      v-show="activeTab === 'caldav'"
      :id="`${tabIdPrefix}-panel-caldav`"
      class="calendar-sync-section"
      role="tabpanel"
      :aria-labelledby="`${tabIdPrefix}-tab-caldav`"
    >
      <div class="calendar-sync-row">
        <div class="calendar-sync-row-main">
          <span class="calendar-sync-label">{{ t('calendarSync.enabled') }}</span>
          <span class="calendar-sync-description">{{ t('calendarSync.enabledDescription') }}</span>
        </div>
        <SySwitch
          :model-value="draft.enabled"
          :aria-label="t('calendarSync.enabled')"
          @update:model-value="draft.enabled = $event"
        />
      </div>
      <label class="calendar-sync-field">
        <span>{{ t('calendarSync.provider') }}</span>
        <SySelect v-model="draft.provider" :options="providerOptions" :disabled="busy" />
      </label>
      <template v-if="(draft.provider || 'caldav') === 'caldav'">
      <label class="calendar-sync-field">
        <span>{{ t('calendarSync.calendarUrl') }}</span>
        <div class="calendar-sync-url-row">
          <SyInput v-model="draft.calendarUrl" type="url" autocomplete="url" placeholder="https://…/calendars/…/" />
          <SyButton class="calendar-sync-button secondary" :disabled="busy" @click="discoverCalendar">
            {{ discovering ? t('calendarSync.discovering') : t('calendarSync.discover') }}
          </SyButton>
        </div>
      </label>
      <label v-if="discoveredCalendars.length > 1" class="calendar-sync-field">
        <span>{{ t('calendarSync.selectCalendar') }}</span>
        <SySelect
          v-model="draft.calendarUrl"
          :options="discoveredCalendars.map(calendar => ({ value: calendar.url, text: calendar.displayName || calendar.url }))"
          :disabled="busy"
        />
      </label>
      <label class="calendar-sync-field">
        <span>{{ t('calendarSync.username') }}</span>
        <SyInput v-model="draft.username" autocomplete="username" />
      </label>
      <label class="calendar-sync-field">
        <span>{{ t('calendarSync.password') }}</span>
        <SyInput v-model="draft.password" type="password" autocomplete="current-password" />
      </label>
      <div class="calendar-sync-description">{{ t('calendarSync.localCredentialNotice') }}</div>
      <label class="calendar-sync-field">
        <span>{{ t('calendarSync.transport') }}</span>
        <SySelect v-model="draft.transport" :options="transportOptions" :disabled="busy" />
      </label>
      </template>
      <template v-else>
        <label class="calendar-sync-field">
          <span>{{ t('calendarSync.oauthClientId') }}</span>
          <SyInput v-model="draft.oauthClientId" autocomplete="off" :placeholder="t('calendarSync.oauthClientIdPlaceholder')" />
        </label>
        <label class="calendar-sync-field">
          <span>{{ t('calendarSync.providerCalendarId') }}</span>
          <SyInput v-model="draft.providerCalendarId" :placeholder="t('calendarSync.providerCalendarIdPlaceholder')" />
        </label>
        <div class="calendar-sync-actions">
          <SyButton class="calendar-sync-tab" :disabled="busy || !draft.oauthClientId" @click="authorizeProvider">
            {{ authorizing ? t('calendarSync.authorizing') : t('calendarSync.authorize') }}
          </SyButton>
        </div>
        <div class="calendar-sync-description">{{ t('calendarSync.oauthNotice') }}</div>
        <div class="calendar-sync-description">{{ t('calendarSync.oauthRedirectUri') }} {{ oauthRedirectUri }}</div>
        <label class="calendar-sync-field">
          <span>{{ t('calendarSync.transport') }}</span>
          <SySelect v-model="draft.transport" :options="transportOptions" :disabled="busy" />
        </label>
      </template>
      <div class="calendar-sync-actions">
        <SyButton class="calendar-sync-tab" :disabled="busy" @click="testConnection">
          {{ testing ? t('calendarSync.testing') : t('calendarSync.testConnection') }}
        </SyButton>
        <SyButton class="calendar-sync-tab" :disabled="busy || !(draft.enabled || cloud.enabled)" @click="syncNow">
          <Icon name="refresh" width="14" height="14" />
          {{ syncing ? t('calendarSync.syncing') : t('calendarSync.syncNow') }}
        </SyButton>
      </div>
    </div>

    <div
      v-show="activeTab === 'general'"
      :id="`${tabIdPrefix}-panel-general`"
      class="calendar-sync-section"
      role="tabpanel"
      :aria-labelledby="`${tabIdPrefix}-tab-general`"
    >
      <label class="calendar-sync-field">
        <span>{{ t('calendarSync.syncInterval') }}</span>
        <SySelect v-model="draft.syncInterval" :options="intervalOptions" :disabled="busy" />
      </label>
      <label v-if="draft.syncInterval === 'dailyAt'" class="calendar-sync-field">
        <span>{{ t('calendarSync.dailySyncTime') }}</span>
        <input v-model="draft.dailySyncTime" type="time" :disabled="busy" />
      </label>
      <div class="calendar-sync-row">
        <span>{{ t('calendarSync.syncOnChange') }}</span>
        <SySwitch v-model="draft.syncOnChange" :disabled="busy || draft.syncInterval === 'manual'" :aria-label="t('calendarSync.syncOnChange')" />
      </div>
      <label class="calendar-sync-number-field">
        <span>{{ t('calendarSync.futureDays') }}</span>
        <input v-model.number="draft.futureDays" type="number" min="7" max="730" />
      </label>
      <label class="calendar-sync-number-field">
        <span>{{ t('calendarSync.defaultDuration') }}</span>
        <input v-model.number="draft.defaultDurationMinutes" type="number" min="5" max="480" step="5" />
      </label>
      <div class="calendar-sync-description">{{ t('calendarSync.exportDescription') }}</div>
      <div class="calendar-sync-actions">
        <SyButton class="calendar-sync-tab" :disabled="busy" @click="exportIcs">
          <Icon name="calendar" width="14" height="14" />
          {{ t('calendarSync.exportIcs') }}
        </SyButton>
      </div>
    </div>

    <div
      class="calendar-sync-status"
      :class="localError ? 'is-error' : `is-${status.state}`"
      role="status"
    >
      <span>{{ statusText }}</span>
      <span v-if="status.lastSuccessAt" class="calendar-sync-status-time">
        {{ formatStatusTime(status.lastSuccessAt) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, reactive, ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyInput from '@/components/SiyuanTheme/SyInput.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import SySwitch from '@/components/SiyuanTheme/SySwitch.vue';
import CalendarCloudSettingsPanel from '@/components/CalendarCloudSettingsPanel.vue';
import type { CalendarSyncStatus } from '@/calendarSyncTypes';
import {
  exportCalendarIcs,
  syncCalendarNow,
  testCalendarSyncConnection
} from '@/calendarSync';
import { CalendarSelectionRequiredError, discoverCalendarCollections, type DiscoveredCalendar } from '@/calendarDavClient';
import { useI18n } from '@/composables/useI18n';
import {
  CALENDAR_SYNC_STATUS_CHANGED_EVENT,
  loadCalendarSyncConfig,
  loadCalendarSyncStatus,
  normalizeCalendarSyncConfig,
  normalizeCalendarCloudConfig,
  saveCalendarSyncConfig
} from '@/utils/calendarSyncSettings';
import { authorizeCalendarProvider } from '@/calendarOAuth';

const { t } = useI18n();
const draft = reactive(loadCalendarSyncConfig());
const cloud = ref(normalizeCalendarCloudConfig(draft.cloud));
type SettingsTab = 'caldav' | 'cloud' | 'general';
const tabIdPrefix = `calendar-sync-${getCurrentInstance()!.uid}`;
const activeTab = ref<SettingsTab>(draft.enabled ? 'caldav' : cloud.value.enabled ? 'cloud' : 'caldav');
const tabs = computed(() => [
  { id: 'caldav' as const, label: 'CalDAV' },
  { id: 'cloud' as const, label: t('calendarSync.tabCloud') },
  { id: 'general' as const, label: t('calendarSync.tabGeneral') }
]);
const status = ref(loadCalendarSyncStatus());
const testing = ref(false);
const syncing = ref(false);
const exporting = ref(false);
const discovering = ref(false);
const authorizing = ref(false);
const cloudBusy = ref(false);
const discoveredCalendars = ref<DiscoveredCalendar[]>([]);
const localMessage = ref('');
const localError = ref(false);
const busy = computed(() => testing.value || syncing.value || exporting.value || discovering.value || cloudBusy.value || authorizing.value);
const transportOptions = computed(() => ['auto', 'direct', 'proxy'].map(value => ({ value, text: t(`calendarSync.transport.${value}`) })));
const providerOptions = computed(() => [
  { value: 'caldav', text: 'CalDAV' },
  { value: 'google', text: 'Google Calendar' },
  { value: 'microsoft', text: 'Microsoft 365 / Outlook' }
]);
const oauthRedirectUri = `${window.location.origin}${window.location.pathname}`;
const intervalOptions = computed(() => ['manual', '15min', 'hourly', '4hour', '12hour', 'daily', 'dailyAt'].map(value => ({ value, text: t(`calendarSync.interval.${value}`) })));

const statusText = computed(() => {
  if (localMessage.value) return localMessage.value;
  if (status.value.state === 'syncing') return t('calendarSync.syncing');
  if (status.value.state === 'error') return status.value.message || t('calendarSync.syncFailed');
  if (status.value.state === 'success') {
    return t('calendarSync.syncSummary')
      .replace('{created}', String(status.value.created))
      .replace('{updated}', String(status.value.updated))
      .replace('{deleted}', String(status.value.deleted))
      .replace('{unchanged}', String(status.value.unchanged));
  }
  return t('calendarSync.notSynced');
});

function getNormalizedDraft() {
  return normalizeCalendarSyncConfig({ ...draft, cloud: { ...cloud.value } });
}

function handleTabKeydown(event: KeyboardEvent, current: SettingsTab): void {
  const index = tabs.value.findIndex(tab => tab.id === current);
  let next: number;
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.value.length;
  else if (event.key === 'ArrowLeft') next = (index + tabs.value.length - 1) % tabs.value.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = tabs.value.length - 1;
  else return;
  event.preventDefault();
  activeTab.value = tabs.value[next].id;
  document.getElementById(`${tabIdPrefix}-tab-${activeTab.value}`)?.focus();
}

async function authorizeProvider(): Promise<void> {
  if (draft.provider === 'caldav') return;
  authorizing.value = true;
  localMessage.value = '';
  try {
    const tokens = await authorizeCalendarProvider(draft.provider, draft.oauthClientId || '');
    Object.assign(draft, {
      oauthAccessToken: tokens.accessToken,
      oauthRefreshToken: tokens.refreshToken || draft.oauthRefreshToken,
      oauthTokenExpiresAt: tokens.expiresAt,
      enabled: true
    });
    saveCalendarSyncConfig(getNormalizedDraft());
    localError.value = false;
    localMessage.value = t('calendarSync.authorizationSucceeded');
  } catch (error) {
    localError.value = true;
    localMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    authorizing.value = false;
  }
}

function autoSave(): void {
  saveCalendarSyncConfig(getNormalizedDraft());
}

async function testConnection(): Promise<void> {
  testing.value = true;
  localMessage.value = '';
  try {
    const testedConfig = getNormalizedDraft();
    draft.calendarUrl = await testCalendarSyncConnection(testedConfig);
    localError.value = false;
    localMessage.value = t('calendarSync.connectionSucceeded');
  } catch (error) {
    if (error instanceof CalendarSelectionRequiredError) {
      discoveredCalendars.value = error.calendars;
      draft.calendarUrl = error.calendars[0].url;
    }
    localError.value = true;
    localMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    testing.value = false;
  }
}

async function discoverCalendar(): Promise<void> {
  discovering.value = true;
  localMessage.value = '';
  try {
    const calendars = await discoverCalendarCollections(getNormalizedDraft());
    discoveredCalendars.value = calendars;
    if (!calendars.some(calendar => calendar.url === draft.calendarUrl)) draft.calendarUrl = calendars[0].url;
    localError.value = false;
    localMessage.value = t('calendarSync.discovered').replace('{count}', String(calendars.length));
  } catch (error) {
    localError.value = true;
    localMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    discovering.value = false;
  }
}

async function syncNow(): Promise<void> {
  syncing.value = true;
  localMessage.value = '';
  try {
    const saved = saveCalendarSyncConfig(getNormalizedDraft());
    Object.assign(draft, saved);
    status.value = await syncCalendarNow();
    draft.calendarUrl = loadCalendarSyncConfig().calendarUrl;
    localError.value = status.value.state === 'error';
  } finally {
    syncing.value = false;
  }
}

async function exportIcs(): Promise<void> {
  exporting.value = true;
  localMessage.value = '';
  try {
    const count = await exportCalendarIcs(getNormalizedDraft());
    localError.value = false;
    localMessage.value = t('calendarSync.exported').replace('{count}', String(count));
  } catch (error) {
    localError.value = true;
    localMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    exporting.value = false;
  }
}

function formatStatusTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function handleStatusChanged(event: Event): void {
  const detail = (event as CustomEvent<CalendarSyncStatus>).detail;
  status.value = detail || loadCalendarSyncStatus();
  if (detail?.state !== 'syncing') localMessage.value = '';
}

window.addEventListener(CALENDAR_SYNC_STATUS_CHANGED_EVENT, handleStatusChanged);
// Persist in the input handler, before a close or page reload can interrupt it.
watch(draft, autoSave, { deep: true, flush: 'sync' });
watch(cloud, autoSave, { deep: true, flush: 'sync' });
onBeforeUnmount(() => {
  window.removeEventListener(CALENDAR_SYNC_STATUS_CHANGED_EVENT, handleStatusChanged);
});
</script>

<style scoped>
.calendar-sync-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.calendar-sync-tabs {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 3;
  box-sizing: border-box;
  min-height: 36px;
  align-items: center;
  gap: 6px;
  padding: 2px 0 4px;
  overflow-x: auto;
  background: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));
  /* Keep the active panel behind the tab strip while its parent scrolls. */
  isolation: isolate;
  box-shadow: 0 10px 0 color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));
  scrollbar-width: none;
}

.calendar-sync-tabs::-webkit-scrollbar {
  display: none;
}

.calendar-sync-tab {
  display: inline-flex;
  flex: 0 0 auto;
  min-height: 30px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  font-size: 12px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.calendar-sync-tab:hover {
  background: var(--b3-theme-background);
  border-color: var(--b3-border-color);
}

.calendar-sync-tab.is-active {
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
}

.calendar-sync-tab:focus-visible {
  outline: 2px solid var(--b3-theme-primary);
  outline-offset: -2px;
}

.calendar-sync-section {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  overflow: hidden;
  border: 0;
  border-radius: 16px;
  background: var(--b3-theme-background);
}

.calendar-sync-section > :not(.cloud-settings) {
  position: relative;
  flex: 0 0 auto;
  box-sizing: border-box;
  min-height: 52px;
  padding: 10px 18px;
}

.calendar-sync-section > :not(.cloud-settings) + :not(.cloud-settings)::before {
  position: absolute;
  top: 0;
  right: 18px;
  left: 18px;
  height: 1px;
  background: var(--b3-border-color);
  content: '';
}

.calendar-sync-row,
.calendar-sync-number-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.calendar-sync-row-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.calendar-sync-field {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.calendar-sync-field > span {
  flex: 0 0 132px;
}

.calendar-sync-field > :not(span) {
  min-width: 0;
  flex: 1;
}

.calendar-sync-field > .calendar-sync-description {
  flex: 1;
}

.calendar-sync-label,
.calendar-sync-field > span,
.calendar-sync-number-field > span {
  color: var(--b3-theme-on-background);
  font-size: 13px;
}

.calendar-sync-description,
.calendar-sync-status-time {
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  line-height: 1.45;
  opacity: 0.78;
}

.calendar-sync-number-field input {
  width: 92px;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.calendar-sync-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.calendar-sync-url-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-sync-url-row :deep(input) {
  min-width: 0;
  flex: 1;
}

.calendar-sync-button {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--b3-theme-primary);
  color: var(--b3-theme-on-primary);
}

.calendar-sync-button.secondary {
  border-color: var(--b3-border-color);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.calendar-sync-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.calendar-sync-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
  padding: 10px 18px;
  border-radius: 16px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  font-size: 13px;
}

.calendar-sync-status.is-success {
  color: var(--b3-card-success-color, #65a30d);
}

.calendar-sync-status.is-error {
  color: var(--b3-card-error-color, #dc2626);
}

@media (max-width: 520px) {
  .calendar-sync-field {
    align-items: stretch;
    flex-direction: column;
  }

  .calendar-sync-field > span,
  .calendar-sync-field > :not(span) {
    flex: none;
  }

  .calendar-sync-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .calendar-sync-button {
    justify-content: center;
  }

  .calendar-sync-url-row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
