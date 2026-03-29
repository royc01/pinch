import { ref } from 'vue';
import { lsNotebooks, type Notebook } from '@/api';

export const STATUS_LABELS: Record<string, string> = {
  'pending': '待办',
  'in-progress': '进行中',
  'delayed': '延迟',
  'completed': '已完成',
  'cancelled': '已取消'
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function formatLocaleDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

export function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const inlineMemoSupNodes = tmp.querySelectorAll('sup');
  inlineMemoSupNodes.forEach((sup) => {
    const text = (sup.textContent || '').trim();
    if (/^\([^()]+\)$/.test(text)) {
      sup.remove();
    }
  });
  return tmp.textContent || tmp.innerText || '';
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
      console.error('[useNotebooks] 蜉霓ｽ隨碑ｮｰ譛ｬ螟ｱ雍･:', error);
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





