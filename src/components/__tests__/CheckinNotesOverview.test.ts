import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import CheckinNotesOverview from '../CheckinNotesOverview.vue';

const { createCheckinNoteBackup, emptyCheckinNoteTrash, getCheckinNotes, getCheckinNotesForMonths, purgeCheckinNote, restoreCheckinNoteBackup, refreshMonths, updateNote, getSyncTarget, saveSyncTarget, appendBlock, updateBlock, getBlockByID, lsNotebooks, readDir, loadFiletreeDocumentTree, storedEntries } = vi.hoisted(() => ({
  createCheckinNoteBackup: vi.fn(),
  emptyCheckinNoteTrash: vi.fn(),
  getCheckinNotes: vi.fn(),
  getCheckinNotesForMonths: vi.fn(),
  purgeCheckinNote: vi.fn(),
  restoreCheckinNoteBackup: vi.fn(),
  refreshMonths: vi.fn(),
  updateNote: vi.fn(),
  getSyncTarget: vi.fn(),
  saveSyncTarget: vi.fn(),
  appendBlock: vi.fn(),
  updateBlock: vi.fn(),
  getBlockByID: vi.fn(),
  lsNotebooks: vi.fn(),
  readDir: vi.fn(),
  loadFiletreeDocumentTree: vi.fn(),
  storedEntries: {
    value: {
      'habit:water:1000': {
        eventKey: 'habit:water:1000', content: 'Drank water', createdAt: '', updatedAt: ''
      },
      'task:ship:2026-08-09T09:00:00.000Z': {
        eventKey: 'task:ship:2026-08-09T09:00:00.000Z', content: 'Shipped cleanly', createdAt: '', updatedAt: ''
      }
    } as Record<string, { eventKey: string; content: string; createdAt: string; updatedAt: string }>
  }
}));

vi.mock('@/checkinNoteRepository', () => ({
  CHECKIN_NOTE_STORAGE_PREFIX: 'Pinch-checkin-notes-',
  createCheckinNoteBackup,
  emptyCheckinNoteTrash,
  getCheckinNotes,
  getCheckinNotesForMonths,
  purgeCheckinNote,
  restoreCheckinNoteBackup,
  getCheckinNoteMonthsInRange: (start: string, end: string) => {
    if (!start || !end || start > end) return [];
    const startDate = new Date(`${start.slice(0, 7)}-01T00:00:00`);
    const endMonth = end.slice(0, 7);
    const months: string[] = [];
    while (`${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}` <= endMonth) {
      months.push(`${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`);
      startDate.setMonth(startDate.getMonth() + 1);
    }
    return months;
  }
}));
vi.mock('@/composables/useCheckinNotes', () => ({
  useCheckinNotes: () => ({ refreshMonths, updateNote })
}));
vi.mock('@/checkinNoteSyncRepository', () => ({
  getCheckinNoteSyncTarget: getSyncTarget,
  saveCheckinNoteSyncTarget: saveSyncTarget
}));
vi.mock('@/api', () => ({
  appendBlock,
  getBlockByID,
  lsNotebooks,
  pushMsg: vi.fn(),
  readDir,
  updateBlock
}));
vi.mock('@/utils/filetreeDocumentTree', () => ({ loadFiletreeDocumentTree }));
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

const capabilities = { editEvent: false, deleteEvent: false, editAnnotation: true, openSource: true, favorite: true };
const records = [
  {
    id: 'habit-checkin:water-1000', eventKeys: ['habit:water:1000'], type: 'habit' as const,
    sourceId: 'water', occurredAt: '2026-08-08T08:00:00.000Z', date: '2026-08-08', title: 'Drink water', meta: '', content: '', capabilities,
    event: { id: 'water-1000', type: 'habit-checkin' as const, date: '2026-08-08', title: 'Drink water', completed: true, completedCount: 1, targetCount: 1, habitId: 'water' }
  },
  {
    id: 'task-completed:ship', eventKeys: ['task:ship:2026-08-09T09:00:00.000Z'], type: 'task' as const,
    sourceId: 'block-ship', occurredAt: '2026-08-09T09:00:00.000Z', date: '2026-08-09', title: 'Ship release', meta: '', content: '', capabilities,
    event: { id: 'ship', type: 'task-completed' as const, date: '2026-08-09', title: 'Ship release', completedAt: '2026-08-09T09:00:00.000Z', taskId: 'ship', priority: 'none' as const, tags: [], blockId: 'block-ship' }
  }
];

describe('CheckinNotesOverview', () => {
  beforeEach(() => {
    getCheckinNotes.mockReset();
    getCheckinNotesForMonths.mockReset();
    createCheckinNoteBackup.mockReset();
    emptyCheckinNoteTrash.mockReset();
    purgeCheckinNote.mockReset();
    restoreCheckinNoteBackup.mockReset();
    refreshMonths.mockReset();
    updateNote.mockReset();
    getSyncTarget.mockReset();
    saveSyncTarget.mockReset();
    appendBlock.mockReset();
    updateBlock.mockReset();
    getBlockByID.mockReset();
    lsNotebooks.mockReset();
    readDir.mockReset();
    loadFiletreeDocumentTree.mockReset();
    getCheckinNotes.mockImplementation(async () => ({ entries: { ...storedEntries.value } }));
    getCheckinNotesForMonths.mockImplementation(async (months: string[]) => months.map(month => ({
      month,
      entries: month === '2026-08' ? { ...storedEntries.value } : {}
    })));
    updateNote.mockResolvedValue(undefined);
    emptyCheckinNoteTrash.mockResolvedValue(0);
    purgeCheckinNote.mockResolvedValue(true);
    restoreCheckinNoteBackup.mockResolvedValue([]);
    refreshMonths.mockResolvedValue(undefined);
    getSyncTarget.mockResolvedValue(null);
    saveSyncTarget.mockResolvedValue(undefined);
    lsNotebooks.mockResolvedValue({ notebooks: [{ id: 'notebook', name: 'Notebook', closed: false }] });
    readDir.mockResolvedValue([{ name: 'Pinch-checkin-notes-2026-08.json' }]);
    loadFiletreeDocumentTree.mockResolvedValue([{ id: 'doc-1', notebookId: 'notebook', name: 'Journal' }]);
  });

  it('shows monthly annotation density and jumps to the selected date without filtering', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();

    await wrapper.find('.checkin-notes-heatmap-btn').trigger('click');
    const activeDays = wrapper.findAll('button.checkin-notes-heatmap-cell:not(:disabled)');
    expect(activeDays).toHaveLength(2);
    expect(wrapper.findAll('.lifelog-timeline-group-header')).toHaveLength(2);
    expect(wrapper.findAll('.lifelog-timeline-group-count').map(item => item.text())).toEqual([
      'checkinNotes.dayCountTemplate',
      'checkinNotes.dayCountTemplate'
    ]);
    expect(wrapper.findAll('.lifelog-timeline-card')).toHaveLength(2);

    await activeDays[0].trigger('click');
    await flushPromises();
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(wrapper.findAll('.lifelog-timeline-item.is-highlighted')).toHaveLength(1);
    expect(wrapper.findAll('.lifelog-timeline-card')).toHaveLength(2);
  });

  it('exports the filtered month as Markdown', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', { value: click });
      }
      return element;
    });
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();

    await wrapper.find('.checkin-notes-more-btn').trigger('click');
    await wrapper.findAll('.checkin-notes-more-dialog button')[1].trigger('click');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    const anchor = createElement.mock.results.find(result => result.value?.tagName === 'A')?.value as HTMLAnchorElement;
    expect(anchor.download).toBe('Pinch-annotations-2026-08.md');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');

    createElement.mockRestore();
  });

  it('combines type filtering with keyword search', async () => {
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();
    expect(wrapper.findAll('.lifelog-timeline-card')).toHaveLength(2);

    const taskFilter = wrapper.findAll('.checkin-notes-type-filters button')[2];
    await taskFilter.trigger('click');
    await wrapper.find('input[type="search"]').setValue('cleanly');
    expect(wrapper.findAll('.lifelog-timeline-card')).toHaveLength(1);
    expect(wrapper.find('.lifelog-timeline-card-title').text()).toBe('Ship release');
  });

  it('searches all stored months and writes edits back to the source month', async () => {
    getCheckinNotesForMonths.mockImplementation(async (months: string[]) => months.map(month => ({
      month,
      entries: month === '2026-07'
        ? {
            'task:plan:2026-07-12T09:00:00.000Z': {
              eventKey: 'task:plan:2026-07-12T09:00:00.000Z',
              content: 'Previous month reflection',
              createdAt: '2026-07-12T09:00:00.000Z',
              updatedAt: '2026-07-12T09:00:00.000Z',
              context: {
                type: 'task', sourceId: 'block-plan', occurredAt: '2026-07-12T09:00:00.000Z', title: 'Plan release'
              }
            }
          }
        : { ...storedEntries.value }
    })));
    readDir.mockResolvedValue([
      { name: 'Pinch-checkin-notes-2026-07.json' },
      { name: 'Pinch-checkin-notes-2026-08.json' },
      { name: 'unrelated.json' }
    ]);
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();

    await wrapper.find('.checkin-notes-search-btn').trigger('click');
    await wrapper.findAll('.checkin-notes-range-modes button')[1].trigger('click');
    await flushPromises();

    expect(getCheckinNotesForMonths).toHaveBeenLastCalledWith(['2026-07', '2026-08']);
    expect(wrapper.findAll('.lifelog-timeline-card')).toHaveLength(3);
    const previousMonthCard = wrapper.findAll('.lifelog-timeline-item')
      .find(card => card.find('.lifelog-timeline-card-title').text() === 'Plan release');
    await previousMonthCard!.find('.lifelog-timeline-annotation.is-editable').trigger('click');
    await wrapper.find('textarea').setValue('Updated previous month');
    await wrapper.find('textarea').trigger('keydown', { ctrlKey: true, key: 'Enter' });
    await flushPromises();

    expect(updateNote).toHaveBeenCalledWith(
      '2026-07',
      'task:plan:2026-07-12T09:00:00.000Z',
      'Updated previous month',
      expect.objectContaining({ sourceId: 'block-plan' }),
      false
    );
  });

  it('filters a custom range at day precision', async () => {
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();

    await wrapper.find('.checkin-notes-search-btn').trigger('click');
    await wrapper.findAll('.checkin-notes-range-modes button')[2].trigger('click');
    const dateInputs = wrapper.findAll('.checkin-notes-date-range input');
    await dateInputs[0].setValue('2026-08-09');
    await dateInputs[1].setValue('2026-08-09');
    await flushPromises();

    expect(wrapper.findAll('.lifelog-timeline-card')).toHaveLength(1);
    expect(wrapper.find('.lifelog-timeline-card-title').text()).toBe('Ship release');
  });

  it('edits a note through the shared note composable', async () => {
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();
    const taskCard = wrapper.findAll('.lifelog-timeline-item')
      .find(card => card.find('.lifelog-timeline-card-title').text() === 'Ship release');
    await taskCard!.find('.lifelog-timeline-annotation.is-editable').trigger('click');
    await wrapper.find('textarea').setValue('Updated reflection');
    await wrapper.find('textarea').trigger('keydown', { ctrlKey: true, key: 'Enter' });
    await flushPromises();

    expect(updateNote).toHaveBeenCalledWith(
      '2026-08',
      'task:ship:2026-08-09T09:00:00.000Z',
      'Updated reflection',
      expect.objectContaining({ sourceId: 'block-ship' }),
      false
    );
  });

  it('moves a deleted note to trash and offers immediate undo', async () => {
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();
    const taskCard = wrapper.findAll('.lifelog-timeline-item')
      .find(card => card.find('.lifelog-timeline-card-title').text() === 'Ship release');

    await taskCard!.find('.lifelog-timeline-action.is-delete').trigger('click');
    await wrapper.find('.lifelog-timeline-confirm-btn.is-danger').trigger('click');
    await flushPromises();

    expect(updateNote).toHaveBeenCalledWith('2026-08', 'task:ship:2026-08-09T09:00:00.000Z', '');
    expect(wrapper.find('.checkin-notes-undo').exists()).toBe(true);
    await wrapper.find('.checkin-notes-undo button').trigger('click');
    await flushPromises();

    expect(updateNote).toHaveBeenLastCalledWith(
      '2026-08',
      'task:ship:2026-08-09T09:00:00.000Z',
      'Shipped cleanly',
      expect.objectContaining({ sourceId: 'block-ship' }),
      false
    );
    expect(wrapper.find('.checkin-notes-undo').exists()).toBe(false);
  });

  it('loads the cross-month trash manager and restores a selected note', async () => {
    getCheckinNotesForMonths.mockImplementation(async (months: string[]) => months.map(month => ({
      month,
      entries: month === '2026-08' ? { ...storedEntries.value } : {},
      trash: month === '2026-07'
        ? {
            'focus:deleted': {
              eventKey: 'focus:deleted', content: 'Recover this thought', starred: true,
              createdAt: '2026-07-03T09:00:00.000Z', updatedAt: '2026-07-03T09:00:00.000Z',
              deletedAt: '2026-08-01T09:00:00.000Z',
              context: {
                type: 'focus', sourceId: 'focus-session', occurredAt: '2026-07-03T09:00:00.000Z', title: 'Deep work'
              }
            }
          }
        : {}
    })));
    readDir.mockResolvedValue([
      { name: 'Pinch-checkin-notes-2026-07.json' },
      { name: 'Pinch-checkin-notes-2026-08.json' }
    ]);
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();

    await wrapper.find('.checkin-notes-more-btn').trigger('click');
    await wrapper.findAll('.checkin-notes-more-dialog button')[2].trigger('click');
    await flushPromises();
    expect(wrapper.find('.checkin-notes-data-dialog').exists()).toBe(true);
    expect(wrapper.find('.checkin-notes-trash-item').text()).toContain('Recover this thought');

    await wrapper.find('.checkin-notes-trash-actions button[aria-label="checkinNotes.restore"]').trigger('click');
    await flushPromises();
    expect(updateNote).toHaveBeenCalledWith(
      '2026-07',
      'focus:deleted',
      'Recover this thought',
      expect.objectContaining({ sourceId: 'focus-session' }),
      true
    );
  });

  it('favorites a note and filters to favorites', async () => {
    updateNote.mockImplementation(async (_month, eventKey, content, context, starred) => {
      storedEntries.value[eventKey] = {
        ...storedEntries.value[eventKey],
        content,
        context,
        ...(starred ? { starred: true } : {})
      } as any;
    });
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();

    await wrapper.find('.lifelog-timeline-action[aria-label="checkinNotes.star"]').trigger('click');
    await flushPromises();
    expect(updateNote).toHaveBeenCalledWith(
      '2026-08',
      'task:ship:2026-08-09T09:00:00.000Z',
      'Shipped cleanly',
      expect.objectContaining({ sourceId: 'block-ship' }),
      true
    );

    await wrapper.setProps({ mode: 'favorites' });
    expect(wrapper.findAll('.lifelog-timeline-card')).toHaveLength(1);
  });

  it('offers source navigation for legacy notes matched to current events', async () => {
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();

    const openButtons = wrapper.findAll('.lifelog-timeline-action[aria-label="checkinNotes.openSource"]');
    expect(openButtons).toHaveLength(2);
    await openButtons[0].trigger('click');
    expect(wrapper.emitted('openEvent')?.[0]?.[0]).toMatchObject({
      type: 'task',
      sourceId: 'block-ship',
      title: 'Ship release'
    });
  });

  it('edits a manual record directly from the annotations overview', async () => {
    const manualRecords = [...records, {
      id: 'manual-note:manual-1', eventKeys: [], type: 'manual-note' as const,
      sourceId: 'manual-1', occurredAt: '2026-08-10T12:00:00.000Z', date: '2026-08-10', title: 'Manual record', meta: '', content: 'Original record',
      capabilities: { editEvent: true, deleteEvent: true, editAnnotation: false, openSource: false, favorite: false },
      event: { id: 'manual-1', type: 'manual-note' as const, date: '2026-08-10', title: 'Manual record', text: 'Original record' }
    }];
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records: manualRecords, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();

    const recordCard = wrapper.findAll('.lifelog-timeline-item')
      .find(card => card.find('.lifelog-timeline-card-title').text() === 'checkinNotes.typeRecord');
    await recordCard!.find('.lifelog-timeline-note.is-editable').trigger('click');
    await wrapper.find('textarea').setValue('Updated record');
    await wrapper.find('textarea').trigger('keydown', { ctrlKey: true, key: 'Enter' });
    await flushPromises();

    expect(wrapper.emitted('updateRecord')?.[0]).toEqual([
      expect.objectContaining({ type: 'manual-note', sourceId: 'manual-1' }),
      'Updated record'
    ]);

    await recordCard!.find('.lifelog-timeline-action.is-delete').trigger('click');
    await wrapper.find('.lifelog-timeline-confirm-btn.is-danger').trigger('click');
    expect(wrapper.emitted('deleteRecord')?.[0]).toEqual([
      expect.objectContaining({ type: 'manual-note', sourceId: 'manual-1' })
    ]);
  });

  it('updates the previously synchronized block instead of appending another copy', async () => {
    getSyncTarget.mockResolvedValue({ documentId: 'doc-1', blockId: 'block-1', format: 'blockquote-v1', updatedAt: '' });
    getBlockByID.mockResolvedValue({ id: 'block-1' });
    updateBlock.mockResolvedValue([]);
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();

    await wrapper.find('.checkin-notes-more-btn').trigger('click');
    await wrapper.findAll('.checkin-notes-more-dialog button')[0].trigger('click');
    await flushPromises();
    await wrapper.find('.checkin-notes-sync-actions button:last-child').trigger('click');
    await flushPromises();

    expect(updateBlock).toHaveBeenCalledWith('markdown', expect.stringMatching(/^> /), 'block-1');
    expect(appendBlock).not.toHaveBeenCalled();
  });

  it('stores the document-level inserted super block for future updates', async () => {
    appendBlock.mockResolvedValue([{
      doOperations: [
        { action: 'insert', id: 'nested-block', parentID: 'container-block' },
        { action: 'insert', id: 'container-block', parentID: 'doc-1' }
      ]
    }]);
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();

    await wrapper.find('.checkin-notes-more-btn').trigger('click');
    await wrapper.findAll('.checkin-notes-more-dialog button')[0].trigger('click');
    await flushPromises();
    await wrapper.find('.checkin-notes-sync-document-item').trigger('click');
    await wrapper.find('.checkin-notes-sync-actions button:last-child').trigger('click');
    await flushPromises();

    expect(saveSyncTarget).toHaveBeenCalledWith('2026-08:annotations', expect.objectContaining({
      documentId: 'doc-1', blockId: 'container-block', format: 'superblock-row-v1'
    }));
    expect(appendBlock).toHaveBeenCalledWith('markdown', expect.stringMatching(/^\{\{\{row\n/), 'doc-1');
    expect(updateBlock).not.toHaveBeenCalled();
  });

  it('recreates an old multi-block sync as a managed super block instead of partially updating it', async () => {
    getSyncTarget.mockResolvedValue({ documentId: 'doc-1', blockId: 'old-heading', updatedAt: '' });
    appendBlock.mockResolvedValue([{ doOperations: [{ action: 'insert', id: 'new-container', parentID: 'doc-1' }] }]);
    const wrapper = mount(CheckinNotesOverview, {
      props: { month: '2026-08', periodLabel: 'August 2026', records, mode: 'annotations' },
      global: { stubs: { Icon: true } }
    });
    await flushPromises();

    await wrapper.find('.checkin-notes-more-btn').trigger('click');
    await wrapper.findAll('.checkin-notes-more-dialog button')[0].trigger('click');
    await flushPromises();
    await wrapper.find('.checkin-notes-sync-actions button:last-child').trigger('click');
    await flushPromises();

    expect(updateBlock).not.toHaveBeenCalled();
    expect(saveSyncTarget).toHaveBeenCalledWith('2026-08:annotations', expect.objectContaining({
      blockId: 'new-container', format: 'superblock-row-v1'
    }));
  });
});
