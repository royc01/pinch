import {
  flushPromises,
  mount,
} from '@vue/test-utils'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { listDocsByPath } from '@/api'
import { invalidateFiletreeDocumentTree } from '@/utils/filetreeDocumentTree'
import DocumentGroupManagerPanel from '../DocumentGroupManagerPanel.vue'
import GoalManagerPanel from '../GoalManagerPanel.vue'

vi.mock('@/api', () => ({
  listDocsByPath: vi.fn().mockResolvedValue({ files: [] }),
}))

const document = {
  id: 'document-1',
  name: 'Instant document',
  notebookId: 'notebook-1',
  notebookName: 'Notebook',
  path: '/Instant document',
  storagePath: '/document-1.sy',
}

const documentGroup = {
  id: 'group-1',
  name: 'Group',
  members: [],
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const goal = {
  id: 'goal-1',
  name: 'Goal',
  members: [],
  taskMembers: [],
  excludedTaskMembers: [],
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const panelStubs = {
  EmojiIcon: true,
  Icon: true,
  SyButton: { template: '<button type="button"><slot /></button>' },
  SyInput: { template: '<input />' },
  TaskDatePopover: true,
}

describe('document scope management panels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateFiletreeDocumentTree()
    vi.mocked(listDocsByPath).mockResolvedValue({ files: [] })
  })

  it('renders document-group cards from the SQL snapshot without repeating the tree scan', async () => {
    const wrapper = mount(DocumentGroupManagerPanel, {
      props: {
        groups: [documentGroup],
        documents: [document],
        allDocuments: [document],
      },
      global: { stubs: panelStubs },
    })

    await flushPromises()
    await wrapper.find('.document-group-panel-toggle').trigger('click')

    expect(wrapper.find('.document-checkbox-list').exists()).toBe(true)
    expect(wrapper.find('.document-checkbox-name').text()).toBe('Instant document')
    expect(listDocsByPath).toHaveBeenCalledTimes(1)

    await wrapper.setProps({
      allDocuments: [
        document,
        {
          ...document,
          id: 'document-2',
          name: 'Fresh document',
          path: '/Fresh document',
        },
      ],
      documents: [
        document,
        {
          ...document,
          id: 'document-2',
          name: 'Fresh document',
          path: '/Fresh document',
        },
      ],
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Fresh document')
    expect(listDocsByPath).toHaveBeenCalledTimes(1)
  })

  it('renders goal cards from the SQL snapshot without repeating the tree scan', async () => {
    const task = {
      id: 'task-1',
      type: 'block',
      title: 'Task',
      notebookId: document.notebookId,
      rootId: document.id,
      hPath: document.path,
      status: 'pending',
    } as any
    const wrapper = mount(GoalManagerPanel, {
      props: {
        goals: [goal],
        documents: [document],
        allDocuments: [document],
        tasks: [task],
      },
      global: { stubs: panelStubs },
    })

    await flushPromises()
    await wrapper.find('.goal-panel-toggle').trigger('click')

    expect(wrapper.find('.goal-checkbox-list').exists()).toBe(true)
    expect(wrapper.find('.goal-checkbox-name').text()).toBe('Instant document')
    expect(listDocsByPath).toHaveBeenCalledTimes(1)

    await wrapper.setProps({
      tasks: [{
        ...task,
        title: 'Updated task',
      }],
    })
    await flushPromises()

    expect(listDocsByPath).toHaveBeenCalledTimes(1)
  })
})
