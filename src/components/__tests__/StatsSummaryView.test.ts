import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  lsNotebooks: vi.fn(),
  getIDsByHPath: vi.fn(),
  getPathByID: vi.fn(),
  getMoodData: vi.fn(),
  createDocWithMd: vi.fn(),
  removeDoc: vi.fn(),
  openBlockById: vi.fn(),
  Protyle: vi.fn(),
  destroy: vi.fn()
}));

vi.mock('@/api', () => mocks);
vi.mock('@/main', () => ({ usePlugin: () => ({ app: {}, loadData: vi.fn().mockResolvedValue(null) }) }));
vi.mock('siyuan', () => ({ Protyle: mocks.Protyle, showMessage: vi.fn() }));
import StatsSummaryView from '../StatsSummaryView.vue';

describe('StatsSummaryView period browser', () => {
  let wrapper: VueWrapper | undefined;
  let host: HTMLDivElement;
  let documents: Array<{ id: string; box: string; hpath: string }>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00'));
    vi.resetAllMocks();
    Object.defineProperty(window, 'siyuan', { configurable: true, value: { config: { appearance: { lang: 'zh_CN' } } } });
    documents = [
      { id: 'old-week', box: 'notebook-b', hpath: '/Pinch/summaries/week-2026-09-28' },
      { id: 'old-month', box: 'notebook-b', hpath: '/Pinch/月-2026-09-01' }
    ];
    mocks.sql.mockImplementation(async () => [...documents]);
    mocks.lsNotebooks.mockResolvedValue({ notebooks: [
      { id: 'notebook-a', name: 'A', closed: false },
      { id: 'notebook-b', name: 'B', closed: false }
    ] });
    mocks.getIDsByHPath.mockImplementation(async (box, hpath) => documents.filter(doc => doc.box === box && doc.hpath === hpath).map(doc => doc.id));
    mocks.Protyle.mockImplementation(function () { return { destroy: mocks.destroy }; });
    mocks.createDocWithMd.mockResolvedValue('new-summary');
    mocks.getMoodData.mockResolvedValue({});
    mocks.getPathByID.mockResolvedValue({ notebook: 'notebook-b', path: '/storage/old-week.sy' });
    mocks.removeDoc.mockResolvedValue(undefined);
  });

  afterEach(() => {
    wrapper?.unmount();
    host?.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function render() {
    host = document.createElement('div');
    document.body.appendChild(host);
    wrapper = mount(StatsSummaryView, { attachTo: host, props: { tasks: [], habits: [], focusRecords: [] }, global: { stubs: { Icon: true, TaskTitleRich: true } } });
    await flushPromises();
    return wrapper;
  }

  async function openBrowser() {
    await wrapper!.find('.panel-chip').trigger('click');
    await flushPromises();
  }

  async function closeBrowser() {
    await wrapper!.find('.summary-period-close').trigger('click');
  }

  function periodButton(date: string) {
    const button = wrapper!.findAll('.summary-period-item').find(item => item.attributes('aria-label')?.includes(date));
    expect(button).toBeDefined();
    return button!;
  }

  it('highlights saved weeks across notebooks and loads the selected legacy summary', async () => {
    await render();
    expect(wrapper!.find('.summary-period-browser').exists()).toBe(false);
    await openBrowser();
    expect(wrapper!.find('.summary-period-picker .summary-period-browser').exists()).toBe(true);
    expect(wrapper!.find('.summary-period-overlay').exists()).toBe(false);
    expect(wrapper!.find('.summary-period-browser').attributes('aria-modal')).toBeUndefined();
    expect(wrapper!.findAll('.summary-period-item')).toHaveLength(53);
    expect(periodButton('2026-09-28').classes()).toContain('has-summary');
    expect(periodButton('2026-10-12').attributes('disabled')).toBeDefined();
    await periodButton('2026-09-28').trigger('click');
    await flushPromises();
    expect(wrapper!.find('.summary-period-browser').exists()).toBe(false);
    expect(wrapper!.find('.panel-chip').attributes('aria-expanded')).toBe('false');
    await openBrowser();
    expect(periodButton('2026-09-28').attributes('aria-current')).toBe('date');
    expect(wrapper!.find('.summary-document-path').text()).toBe('/B/Pinch/summaries/week-2026-09-28');
    expect(mocks.Protyle).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ blockId: 'old-week' }));
    expect(mocks.sql).toHaveBeenCalledTimes(1);
  });

  it('lists all months, switches to a saved month and browses previous years', async () => {
    await render();
    await wrapper!.findAll('.summary-mode-chip')[1].trigger('click');
    await flushPromises();
    await openBrowser();
    const months = wrapper!.findAll('.summary-period-item');
    expect(months).toHaveLength(12);
    expect(months[8].classes()).toContain('has-summary');
    expect(months[10].attributes('disabled')).toBeDefined();
    await months[8].trigger('click');
    await flushPromises();
    expect(wrapper!.find('.panel-chip').text()).toBe('2026 年 9 月');
    expect(wrapper!.find('.summary-document-path').text()).toBe('/B/Pinch/月-2026-09-01');
    await openBrowser();
    await wrapper!.find('.summary-year-actions .summary-year-nav').trigger('click');
    expect(wrapper!.find('.summary-year-actions strong').text()).toBe('2025 年');
    await wrapper!.findAll('.summary-period-item')[0].trigger('click');
    await flushPromises();
    expect(wrapper!.find('.panel-chip').text()).toBe('2025 年 1 月');
  });

  it('marks a newly saved period and removes its marker after deletion', async () => {
    await render();
    await openBrowser();
    expect(periodButton('2026-10-05').classes()).not.toContain('has-summary');
    await closeBrowser();
    await wrapper!.find('.summary-save-button').trigger('click');
    await flushPromises();
    await openBrowser();
    expect(periodButton('2026-10-05').classes()).toContain('has-summary');
    await closeBrowser();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await wrapper!.find('.summary-delete-document').trigger('click');
    await flushPromises();
    await openBrowser();
    expect(periodButton('2026-10-05').classes()).not.toContain('has-summary');
    expect(periodButton('2026-09-28').classes()).toContain('has-summary');
  });

  it('shows a retry action when summary history fails and recovers its highlights', async () => {
    mocks.sql.mockRejectedValueOnce(new Error('unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await render();
    await openBrowser();
    await wrapper!.find('.summary-period-browser-head .panel-link-btn').trigger('click');
    await flushPromises();
    expect(periodButton('2026-09-28').classes()).toContain('has-summary');
    expect(wrapper!.find('.summary-history-legend').exists()).toBe(true);
  });

  it('reopens the selected period year after browsing and dismissing another year', async () => {
    await render();
    await openBrowser();
    await wrapper!.find('.summary-year-actions .summary-year-nav').trigger('click');
    expect(wrapper!.find('.summary-year-actions strong').text()).toBe('2025 年');
    await closeBrowser();
    await openBrowser();
    expect(wrapper!.find('.summary-year-actions strong').text()).toBe('2026 年');
    expect(periodButton('2026-10-05').attributes('aria-current')).toBe('date');
  });

  it('closes on Escape, outside clicks and the close button', async () => {
    await render();
    const chip = wrapper!.find('.panel-chip');
    await openBrowser();
    expect(document.activeElement).toBe(periodButton('2026-10-05').element);
    await wrapper!.find('.summary-period-browser').trigger('keydown', { key: 'Escape' });
    expect(wrapper!.find('.summary-period-browser').exists()).toBe(false);
    expect(document.activeElement).toBe(chip.element);
    await openBrowser();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await flushPromises();
    expect(wrapper!.find('.summary-period-browser').exists()).toBe(false);
    await openBrowser();
    await closeBrowser();
    expect(wrapper!.find('.summary-period-browser').exists()).toBe(false);
    expect(document.activeElement).toBe(chip.element);
  });

  it('allows focus to leave the popover without moving it back to the trigger', async () => {
    await render();
    await openBrowser();
    const buttons = wrapper!.find('.summary-period-browser').findAll('button').filter(button => button.attributes('disabled') === undefined);
    const last = buttons[buttons.length - 1];
    (last.element as HTMLButtonElement).focus();
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    last.element.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(false);
    const outside = wrapper!.find('.summary-current-period');
    (outside.element as HTMLButtonElement).disabled = false;
    (outside.element as HTMLButtonElement).focus();
    await flushPromises();
    expect(wrapper!.find('.summary-period-browser').exists()).toBe(false);
    expect(document.activeElement).toBe(outside.element);
  });

  it('toggles the popover when the period chip is clicked again', async () => {
    await render();
    await openBrowser();
    await wrapper!.find('.panel-chip').trigger('click');
    expect(wrapper!.find('.summary-period-browser').exists()).toBe(false);
    expect(wrapper!.find('.panel-chip').attributes('aria-expanded')).toBe('false');
  });

  it('aligns with the trigger and adjusts its width and height to the available space', async () => {
    await render();
    const chip = wrapper!.find('.panel-chip').element;
    const panel = wrapper!.find('.stats-summary-panel').element;
    vi.spyOn(chip, 'getBoundingClientRect').mockReturnValue({ left: 40, right: 200, top: 100, bottom: 132, width: 160, height: 32 } as DOMRect);
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({ left: 20, right: 720, top: 80, bottom: 900, width: 700, height: 820 } as DOMRect);
    await openBrowser();
    const popover = wrapper!.find('.summary-period-browser').element as HTMLElement;
    expect(popover.style.left).toBe('0px');
    expect(popover.style.width).toBe('560px');
    expect(popover.style.maxHeight).toBe(`${window.innerHeight - 146}px`);
    vi.mocked(panel.getBoundingClientRect).mockReturnValue({ left: 20, right: 300, top: 80, bottom: 900, width: 280, height: 820 } as DOMRect);
    window.dispatchEvent(new Event('resize'));
    await flushPromises();
    expect(popover.style.width).toBe('264px');
    expect(popover.style.left).toBe('-12px');
  });
});
