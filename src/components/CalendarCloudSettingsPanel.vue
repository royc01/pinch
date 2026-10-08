<template>
  <div class="cloud-settings">
    <div class="cloud-row">
      <div><span>{{ t('calendarSync.cloudEnabled') }}</span><p>{{ t('calendarSync.cloudDescription') }}</p></div>
      <SySwitch v-model="draft.enabled" :disabled="busy" :aria-label="t('calendarSync.cloudEnabled')" />
    </div>
    <label><span>{{ t('calendarSync.cloudMethod') }}</span><SySelect v-model="draft.method" :options="methods" :disabled="busy" /></label>
    <label><span>{{ t('calendarSync.fileName') }}</span><SyInput v-model="draft.fileName" :disabled="busy" /></label>

    <template v-if="draft.method === 'webdav'">
      <label><span>{{ t('calendarSync.webdavUrl') }}</span><SyInput v-model="draft.webdavUrl" type="url" placeholder="https://dav.jianguoyun.com/dav/" :disabled="busy" /></label>
      <label><span>{{ t('calendarSync.username') }}</span><SyInput v-model="draft.webdavUsername" autocomplete="username" :disabled="busy" /></label>
      <label><span>{{ t('calendarSync.password') }}</span><SyInput v-model="draft.webdavPassword" type="password" autocomplete="current-password" :disabled="busy" /></label>
    </template>
    <template v-if="draft.method === 's3'">
      <div class="cloud-row"><span>{{ t('calendarSync.s3UseSiyuan') }}</span><SySwitch v-model="draft.s3UseSiyuanConfig" :disabled="busy" :aria-label="t('calendarSync.s3UseSiyuan')" /></div>
      <label><span>Bucket</span><SyInput v-model="draft.s3Bucket" :disabled="busy" /></label>
      <template v-if="!draft.s3UseSiyuanConfig">
        <label><span>Endpoint</span><SyInput v-model="draft.s3Endpoint" placeholder="https://s3.example.com" :disabled="busy" /></label>
        <label><span>Region</span><SyInput v-model="draft.s3Region" placeholder="auto" :disabled="busy" /></label>
        <label><span>Access Key ID</span><SyInput v-model="draft.s3AccessKeyId" autocomplete="off" :disabled="busy" /></label>
        <label><span>Secret Access Key</span><SyInput v-model="draft.s3AccessKeySecret" type="password" autocomplete="off" :disabled="busy" /></label>
        <div class="cloud-row"><span>{{ t('calendarSync.s3PathStyle') }}</span><SySwitch v-model="draft.s3ForcePathStyle" :disabled="busy" :aria-label="t('calendarSync.s3PathStyle')" /></div>
      </template>
      <label><span>{{ t('calendarSync.storagePath') }}</span><SyInput v-model="draft.s3StoragePath" placeholder="calendar/" :disabled="busy" /></label>
      <label><span>{{ t('calendarSync.customDomain') }}</span><SyInput v-model="draft.s3CustomDomain" placeholder="https://calendar.example.com" :disabled="busy" /></label>
      <label><span>{{ t('calendarSync.s3UrlMode') }}</span><SySelect v-model="draft.s3UrlMode" :options="urlModes" :disabled="busy" /></label>
      <p>{{ draft.s3UrlMode === 'signed' ? t('calendarSync.signedUrlHint') : t('calendarSync.publicUrlHint') }}</p>
    </template>
    <template v-if="draft.method !== 'siyuan'">
      <label><span>{{ t('calendarSync.transport') }}</span><SySelect v-model="draft.transport" :options="transportOptions" :disabled="busy" /></label>
    </template>
    <p v-else>{{ t('calendarSync.siyuanCloudHint') }}</p>
    <p>{{ t('calendarSync.localCredentialNotice') }}</p>
    <div class="cloud-actions">
      <SyButton class="calendar-sync-tab" :disabled="busy" @click="testConnection">{{ testing ? t('calendarSync.testing') : t('calendarSync.testConnection') }}</SyButton>
      <SyButton class="calendar-sync-tab" :disabled="busy || !draft.enabled" @click="publish">{{ publishing ? t('calendarSync.publishing') : t('calendarSync.publishCloud') }}</SyButton>
      <SyButton v-if="status.cloudUrl" class="calendar-sync-tab" :disabled="busy" @click="copyUrl">{{ t('calendarSync.copyUrl') }}</SyButton>
    </div>
    <div v-if="status.cloudUrl" class="cloud-result">
      <SyInput :model-value="status.cloudUrl" readonly :aria-label="t('calendarSync.cloudUrl')" />
    </div>
    <p v-if="status.cloudPublishedAt">{{ t('calendarSync.cloudLastPublished') }} {{ new Date(status.cloudPublishedAt).toLocaleString() }}</p>
    <p v-if="status.cloudUrlExpiresAt">{{ t('calendarSync.cloudUrlExpires') }} {{ new Date(status.cloudUrlExpiresAt).toLocaleString() }}</p>
    <p v-if="message || status.cloudError" role="status" :class="{ error: failed || status.cloudError }">{{ message || status.cloudError }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyInput from '@/components/SiyuanTheme/SyInput.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import SySwitch from '@/components/SiyuanTheme/SySwitch.vue';
import { useI18n } from '@/composables/useI18n';
import type { CalendarCloudConfig, CalendarSyncConfig, CalendarSyncStatus } from '@/calendarSyncTypes';
import { testCalendarCloudConnection } from '@/calendarCloudSync';
import { publishCalendarCloudNow } from '@/calendarSync';
import { saveCalendarSyncConfig } from '@/utils/calendarSyncSettings';

const props = defineProps<{ modelValue: CalendarCloudConfig; calendarConfig: CalendarSyncConfig; status: CalendarSyncStatus; disabled: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: CalendarCloudConfig]; 'busy-change': [value: boolean] }>();
const { t } = useI18n();
const draft = reactive({ ...props.modelValue });
let applyingModel = false;
watch(() => props.modelValue, value => {
  applyingModel = true;
  try { Object.assign(draft, value); } finally { applyingModel = false; }
}, { deep: true });
watch(draft, () => {
  if (!applyingModel) emit('update:modelValue', { ...draft });
}, { deep: true, flush: 'sync' });
const testing = ref(false);
const publishing = ref(false);
watch(() => testing.value || publishing.value, value => emit('busy-change', value));
const failed = ref(false);
const message = ref('');
const busy = computed(() => props.disabled || testing.value || publishing.value);
const methods = computed(() => [
  { value: 's3', text: 'S3 / MinIO / R2' }, { value: 'webdav', text: 'WebDAV' }, { value: 'siyuan', text: t('calendarSync.siyuanCloud') }
]);
const urlModes = computed(() => [
  { value: 'public', text: t('calendarSync.publicUrl') }, { value: 'signed', text: t('calendarSync.signedUrl') }
]);
const transportOptions = computed(() => ['auto', 'direct', 'proxy'].map(value => ({ value, text: t(`calendarSync.transport.${value}`) })));

async function run(action: () => Promise<void>) {
  message.value = '';
  failed.value = false;
  try { await action(); } catch (error) { failed.value = true; message.value = error instanceof Error ? error.message : String(error); }
}
async function testConnection() {
  testing.value = true;
  await run(async () => {
    await testCalendarCloudConnection({ ...draft });
    message.value = t(draft.method === 'siyuan' ? 'calendarSync.cloudAccountReady' : 'calendarSync.connectionSucceeded');
  });
  testing.value = false;
}
async function publish() {
  publishing.value = true;
  await run(async () => {
    const config = saveCalendarSyncConfig({ ...props.calendarConfig, cloud: { ...draft } });
    const count = await publishCalendarCloudNow(config);
    message.value = t('calendarSync.published').replace('{count}', String(count));
  });
  publishing.value = false;
}
async function copyUrl() {
  await run(async () => { await navigator.clipboard.writeText(props.status.cloudUrl || ''); message.value = t('calendarSync.urlCopied'); });
}
</script>

<style scoped>
.cloud-settings { display: flex; min-width: 0; flex-direction: column; }
.cloud-settings > * { position: relative; box-sizing: border-box; padding: 10px 18px; }
.cloud-settings > * + *::before {
  position: absolute; top: 0; right: 18px; left: 18px;
  height: 1px; background: var(--b3-border-color); content: '';
}
.cloud-settings > label { display: flex; min-height: 52px; align-items: center; flex-direction: row; gap: 12px; }
.cloud-settings > label > span { min-width: 132px; color: var(--b3-theme-on-background); font-size: 13px; }
.cloud-settings > label > :not(span) { min-width: 0; flex: 1; }
.cloud-row { color: var(--b3-theme-on-background); font-size: 13px; }
.cloud-row, .cloud-actions { display: flex; min-height: 52px; align-items: center; justify-content: space-between; gap: 10px; }
.cloud-row > div { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.cloud-row :deep(.sy-switch) { flex-shrink: 0; }
.cloud-actions { justify-content: flex-start; flex-wrap: wrap; gap: 8px; }
p { margin: 0; font-size: 12px; line-height: 1.45; color: var(--b3-theme-on-surface); opacity: 0.78; overflow-wrap: anywhere; }
.error { color: var(--b3-card-error-color, #dc2626); }
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
.calendar-sync-tab:focus-visible {
  outline: 2px solid var(--b3-theme-primary);
  outline-offset: -2px;
}
.calendar-sync-tab:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
@media (max-width: 520px) {
  .cloud-settings > label { align-items: stretch; flex-direction: column; }
  .cloud-settings > label > span { min-width: 0; }
  .cloud-settings > label > :not(span) { flex: none; }
}
</style>
