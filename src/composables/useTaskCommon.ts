import { ref } from 'vue';
import { lsNotebooks } from '@/api';
import { t } from '@/utils/i18n';

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'pending': t('statusPending'),
    'in-progress': t('statusInProgress'),
    'delayed': t('statusDelayed'),
    'completed': t('statusCompleted'),
    'cancelled': t('statusCancelled')
  };
  return labels[status] || status;
}

export function formatLocaleDate(dateStr: string, options?: { includeTime?: boolean }): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  if (options?.includeTime) {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  return t('dateFull', {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  });
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

export interface TaskCommonNotebook {
  id: string;
  name: string;
}

export function useNotebooks() {
  const notebooks = ref<TaskCommonNotebook[]>([]);
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





