import { ref, type Ref } from 'vue';
import type { Task } from '@/api';
import { lsNotebooks, type Notebook } from '@/api';

export const PRIORITY_LABELS: Record<string, string> = {
  'none': '无',
  'high': '高',
  'medium': '中',
  'low': '低'
};

export const STATUS_LABELS: Record<string, string> = {
  'pending': '待处理',
  'in-progress': '进行中',
  'completed': '已完成',
  'cancelled': '已取消'
};

export const STATUS_OPTIONS = [
  { status: 'all', title: '全部' },
  { status: 'pending', title: '待处理' },
  { status: 'in-progress', title: '进行中' },
  { status: 'completed', title: '已完成' },
  { status: 'cancelled', title: '已取消' }
];

export function getPriorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority] || priority;
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

export function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export interface UseNotebooksResult {
  notebooks: Ref<Notebook[]>;
  loading: Ref<boolean>;
  loadNotebooks: () => Promise<void>;
}

export function useNotebooks() {
  const notebooks = ref<Notebook[]>([]);
  const loading = ref(false);

  async function loadNotebooks() {
    loading.value = true;
    try {
      const result = await lsNotebooks();
      if (result && result.notebooks) {
        notebooks.value = result.notebooks
          .filter((nb) => !nb.closed)
          .map((nb) => ({
            id: nb.id,
            name: nb.name
          }));
      }
    } catch (error) {
      console.error('[useNotebooks] 加载笔记本失败:', error);
    } finally {
      loading.value = false;
    }
  }

  return {
    notebooks,
    loading,
    loadNotebooks
  };
}
