import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { listDocsByPath } from '@/api'
import {
  invalidateFiletreeDocumentTree,
  loadFiletreeDocumentTree,
} from './filetreeDocumentTree'

vi.mock('@/api', () => ({
  listDocsByPath: vi.fn(),
}))

describe('filetree document-tree cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateFiletreeDocumentTree()
  })

  it('coalesces concurrent traversals and returns independent snapshots', async () => {
    vi.mocked(listDocsByPath)
      .mockResolvedValueOnce({
        files: [{
          id: 'parent',
          name: 'Parent',
          path: '/parent.sy',
          subFileCount: 1,
        }],
      })
      .mockResolvedValueOnce({
        files: [{
          id: 'child',
          name: 'Child',
          path: '/parent/child.sy',
          subFileCount: 0,
        }],
      })

    const [first, second] = await Promise.all([
      loadFiletreeDocumentTree('notebook-1'),
      loadFiletreeDocumentTree('notebook-1'),
    ])

    expect(listDocsByPath).toHaveBeenCalledTimes(2)
    expect(first).toEqual(second)
    first[0].name = 'Changed locally'

    const cached = await loadFiletreeDocumentTree('notebook-1')
    expect(cached).toHaveLength(2)
    expect(cached[0].name).toBe('Parent')
    expect(listDocsByPath).toHaveBeenCalledTimes(2)
  })

  it('refreshes a notebook after explicit invalidation', async () => {
    vi.mocked(listDocsByPath)
      .mockResolvedValueOnce({ files: [] })
      .mockResolvedValueOnce({ files: [] })

    await loadFiletreeDocumentTree('notebook-1')
    await loadFiletreeDocumentTree('notebook-1')
    expect(listDocsByPath).toHaveBeenCalledTimes(1)

    invalidateFiletreeDocumentTree(['notebook-1'])
    await loadFiletreeDocumentTree('notebook-1', { force: true })
    expect(listDocsByPath).toHaveBeenCalledTimes(2)
  })
})
