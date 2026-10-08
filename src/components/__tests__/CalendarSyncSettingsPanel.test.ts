import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { CalendarSyncStatus } from '@/calendarSyncTypes';

const mocks = vi.hoisted(() => ({ discover: vi.fn(), testConnection: vi.fn(), sync: vi.fn(), exportIcs: vi.fn(), publishCloud: vi.fn(), cloudConnection: vi.fn() }));
vi.mock('@/calendarCloudSync', () => ({ testCalendarCloudConnection: mocks.cloudConnection }));
vi.mock('@/calendarDavClient', async importOriginal => ({
  ...await importOriginal<typeof import('@/calendarDavClient')>(), discoverCalendarCollections: mocks.discover
}));
vi.mock('@/calendarSync', () => ({
  exportCalendarIcs: mocks.exportIcs,
  syncCalendarNow: mocks.sync, testCalendarSyncConnection: mocks.testConnection,
  publishCalendarCloudNow: mocks.publishCloud
}));
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key }), translate: (key: string) => key
}));

import CalendarSyncSettingsPanel from '../CalendarSyncSettingsPanel.vue';
import { loadCalendarSyncConfig, saveCalendarSyncConfig } from '@/utils/calendarSyncSettings';

describe('calendar sync settings target selection', () => {
  let wrapper: ReturnType<typeof mount> | undefined;
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); }
    });
    saveCalendarSyncConfig({ enabled: true, calendarUrl: 'https://calendar.example.test/',
      username: 'synthetic-user', password: 'synthetic-password', futureDays: 180, defaultDurationMinutes: 30 });
  });
  afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  async function click(key: string) {
    const button = wrapper!.findAll('button').find(button => button.text() === key && button.isVisible())!;
    expect(button, `Visible button: ${key}`).toBeDefined();
    await button.trigger('click');
    await flushPromises();
  }

  it('offers file export with all sync channels disabled', async () => {
    saveCalendarSyncConfig({ ...loadCalendarSyncConfig(), enabled: false });
    mocks.exportIcs.mockResolvedValue(35);
    wrapper = mount(CalendarSyncSettingsPanel, { attachTo: document.body });
    await click('calendarSync.tabGeneral');
    const panel = wrapper.find('[id$="-panel-general"]');
    expect(panel.isVisible()).toBe(true);
    expect(panel.findAll('button').map(button => button.text())).toEqual(['calendarSync.exportIcs']);
    await click('calendarSync.exportIcs');
    expect(mocks.exportIcs).toHaveBeenCalledWith(expect.objectContaining({ enabled: false, cloud: expect.objectContaining({ enabled: false }) }));
    expect(wrapper.find('[role="status"]').text()).toContain('calendarSync.exported');
    expect(mocks.sync).not.toHaveBeenCalled();
    expect(mocks.publishCloud).not.toHaveBeenCalled();
  });

  it('keeps the last CalDAV edit when the panel closes in the same input event', () => {
    wrapper = mount(CalendarSyncSettingsPanel, { attachTo: document.body });
    const input = wrapper.find('input[autocomplete="username"]').element as HTMLInputElement;
    input.value = 'edited-user';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    wrapper.unmount();
    wrapper = mount(CalendarSyncSettingsPanel, { attachTo: document.body });
    expect((wrapper.find('input[autocomplete="username"]').element as HTMLInputElement).value).toBe('edited-user');
    expect(loadCalendarSyncConfig().username).toBe('edited-user');
  });

  it('restores cloud and schedule settings without waiting for an autosave timer', async () => {
    wrapper = mount(CalendarSyncSettingsPanel, { attachTo: document.body });
    await click('calendarSync.tabCloud');
    const cloud = wrapper.find('.cloud-settings');
    await cloud.find('input[aria-label="calendarSync.cloudEnabled"]').setValue(true);
    await cloud.find('select').setValue('webdav');
    await cloud.find('input[type="url"]').setValue('https://dav.example.test/calendar/');
    await cloud.find('input[autocomplete="username"]').setValue('cloud-user');
    await click('calendarSync.tabGeneral');
    await wrapper.find('[id$="-panel-general"] select').setValue('dailyAt');
    await wrapper.find('input[type="time"]').setValue('10:15');
    await click('calendarSync.tabCloud');
    const password = wrapper.find('.cloud-settings input[type="password"]').element as HTMLInputElement;
    password.value = 'last-cloud-secret';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    wrapper.unmount();
    wrapper = mount(CalendarSyncSettingsPanel, { attachTo: document.body });
    expect(loadCalendarSyncConfig()).toMatchObject({
      syncInterval: 'dailyAt', dailySyncTime: '10:15',
      cloud: { enabled: true, method: 'webdav', webdavUsername: 'cloud-user', webdavPassword: 'last-cloud-secret' }
    });
    expect((wrapper.find('.cloud-settings input[type="password"]').element as HTMLInputElement).value).toBe('last-cloud-secret');
    expect(mocks.sync).not.toHaveBeenCalled();
    expect(mocks.publishCloud).not.toHaveBeenCalled();
  });

  it('lets the user choose a calendar and auto-saves the selection', async () => {
    mocks.discover.mockResolvedValue([
      { url: 'https://calendar.example.test/work/', displayName: 'Work' },
      { url: 'https://calendar.example.test/personal/', displayName: 'Personal' }
    ]);
    wrapper = mount(CalendarSyncSettingsPanel, { attachTo: document.body });
    expect(wrapper.findAll('[role="tab"]').map(tab => tab.text())).toEqual([
      'CalDAV', 'calendarSync.tabCloud', 'calendarSync.tabGeneral'
    ]);
    expect(wrapper.findAll('[role="tabpanel"]').filter(panel => panel.isVisible())).toHaveLength(1);
    await click('calendarSync.discover');
    const calendars = wrapper.findAll('select').find(select => select.findAll('option').some(option => option.text() === 'Work'))!;
    expect(calendars.findAll('option').map(option => option.text())).toEqual(['Work', 'Personal']);
    await calendars.setValue('https://calendar.example.test/personal/');
    await wrapper.find('[role="tab"][aria-selected="true"]').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('calendarSync.tabCloud');
    expect(wrapper.find('[id$="-panel-caldav"]').isVisible()).toBe(false);
    await click('CalDAV');
    expect((calendars.element as HTMLSelectElement).value).toBe('https://calendar.example.test/personal/');
    await new Promise(resolve => setTimeout(resolve, 550));
    expect(loadCalendarSyncConfig().calendarUrl).toBe('https://calendar.example.test/personal/');
    expect(wrapper.findAll('button').some(button => button.text() === 'common.save')).toBe(false);
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it('reflects the persisted resolved address after an immediate sync', async () => {
    mocks.sync.mockImplementation(async () => {
      saveCalendarSyncConfig({ ...loadCalendarSyncConfig(), calendarUrl: 'https://calendar.example.test/work/' });
      return { state: 'success', created: 1, updated: 0, deleted: 0, unchanged: 0 } satisfies CalendarSyncStatus;
    });
    wrapper = mount(CalendarSyncSettingsPanel, { attachTo: document.body });
    await click('calendarSync.syncNow');
    const calendarPanel = wrapper.find('[role="tabpanel"][id$="-panel-caldav"]');
    expect((calendarPanel.find('input[type="url"]').element as HTMLInputElement).value).toBe('https://calendar.example.test/work/');
  });

  it('saves WebDAV credentials and schedule preferences before publishing the cloud calendar', async () => {
    mocks.publishCloud.mockResolvedValue(1);
    wrapper = mount(CalendarSyncSettingsPanel, { attachTo: document.body });
    await click('calendarSync.tabCloud');
    const cloud = wrapper.find('.cloud-settings');
    await cloud.find('input[aria-label="calendarSync.cloudEnabled"]').setValue(true);
    await cloud.find('select').setValue('webdav');
    await cloud.find('input[type="url"]').setValue('https://dav.example.test/calendar/');
    await cloud.find('input[autocomplete="username"]').setValue('synthetic-user');
    await cloud.find('input[type="password"]').setValue('synthetic-secret');
    await click('calendarSync.tabGeneral');
    expect(cloud.isVisible()).toBe(false);
    const schedule = wrapper.findAll('select').find(select => select.find('option[value="dailyAt"]').exists())!;
    await schedule.setValue('dailyAt');
    await wrapper.find('input[type="time"]').setValue('09:30');
    await click('calendarSync.tabCloud');
    await click('calendarSync.publishCloud');
    expect(loadCalendarSyncConfig()).toMatchObject({ syncInterval: 'dailyAt', dailySyncTime: '09:30', cloud: {
      enabled: true, method: 'webdav', webdavUrl: 'https://dav.example.test/calendar/', webdavUsername: 'synthetic-user', webdavPassword: 'synthetic-secret'
    } });
    expect(mocks.publishCloud).toHaveBeenCalledWith(expect.objectContaining({ cloud: expect.objectContaining({ method: 'webdav' }) }));
    expect(cloud.text()).toContain('calendarSync.published');
  });

  it('blocks cloud actions during upload and restores them after failure', async () => {
    let reject!: (error: Error) => void;
    mocks.publishCloud.mockImplementation(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    wrapper = mount(CalendarSyncSettingsPanel, { attachTo: document.body });
    await click('calendarSync.tabCloud');
    await wrapper.find('input[aria-label="calendarSync.cloudEnabled"]').setValue(true);
    const publish = wrapper.findAll('button').find(button => button.text() === 'calendarSync.publishCloud')!;
    await publish.trigger('click');
    await flushPromises();
    expect(publish.attributes('disabled')).toBeDefined();
    reject(new Error('synthetic upload rejection'));
    await flushPromises();
    expect(publish.attributes('disabled')).toBeUndefined();
    expect(wrapper.find('.cloud-settings').text()).toContain('synthetic upload rejection');
  });
});
