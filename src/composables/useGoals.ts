import { onMounted, onUnmounted, ref } from 'vue';
import { TaskRepository } from '@/api';
import { loadGoals, saveGoals, type Goal } from '@/goalRepository';
import { buildGoalProgressSummaries, type GoalProgressStatus } from '@/utils/goalProgress';
import { loadGoalScopeDocuments, type GoalScopeDocument } from '@/utils/goalScopeDocuments';
import { eventBus, Events } from '@/utils/eventBus';
import { translate } from '@/composables/useI18n';

export interface GoalListItem extends Goal {
  missingGroup?: boolean;
  documentGroupName?: string;
  documentCount: number;
  documentSummary: string;
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  progressPercent: number;
  status: GoalProgressStatus;
}

export const useGoals = () => {
  const goalDefinitions = ref<Goal[]>([]);
  const goalDocuments = ref<GoalScopeDocument[]>([]);
  const goalItems = ref<GoalListItem[]>([]);
  const goalsLoading = ref(false);
  const goalsError = ref('');

  let refreshTimer: number | null = null;
  let settleRefreshTimer: number | null = null;
  let refreshTaskUseCache = true;
  let latestLoadId = 0;
  const unsubscribers: Array<() => void> = [];

  const loadGoalsData = async (options: { taskUseCache?: boolean } = {}) => {
    const { taskUseCache = true } = options;
    const loadId = ++latestLoadId;
    goalsLoading.value = true;
    goalsError.value = '';

    try {
      const [nextGoals, nextGoalDocuments, tasks] = await Promise.all([
        loadGoals(),
        loadGoalScopeDocuments(),
        TaskRepository.getBlockTasks(taskUseCache, undefined, { useLiveDom: false })
      ]);

      if (loadId !== latestLoadId) {
        return;
      }

      goalDefinitions.value = nextGoals;
      goalDocuments.value = nextGoalDocuments;
      goalItems.value = buildGoalProgressSummaries(nextGoals, tasks).map((summary) => ({
        ...summary.goal,
        documentCount: summary.documentCount,
        documentSummary: summary.documentCount > 0
          ? `${summary.documentCount} ${translate('goalPanel.documentCountSuffix')}`
          : translate('goalPanel.noDocumentSelected'),
        totalTasks: summary.totalTasks,
        completedTasks: summary.completedTasks,
        remainingTasks: Math.max(0, summary.totalTasks - summary.completedTasks),
        progressPercent: summary.progressPercent,
        status: summary.status
      }));
    } catch (error) {
      if (loadId !== latestLoadId) {
        return;
      }
      goalsError.value = error instanceof Error ? error.message : translate('goalPanel.loadFailed');
    } finally {
      if (loadId === latestLoadId) {
        goalsLoading.value = false;
      }
    }
  };

  const scheduleRefresh = (taskUseCache: boolean, delay = 120) => {
    if (typeof window === 'undefined') {
      void loadGoalsData({ taskUseCache });
      return;
    }

    refreshTaskUseCache = refreshTaskUseCache && taskUseCache;
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
    }

    refreshTimer = window.setTimeout(() => {
      const nextTaskUseCache = refreshTaskUseCache;
      refreshTimer = null;
      refreshTaskUseCache = true;
      void loadGoalsData({ taskUseCache: nextTaskUseCache });
    }, delay);
  };

  const scheduleSettledRefresh = (delay = 520) => {
    if (typeof window === 'undefined') {
      void loadGoalsData({ taskUseCache: false });
      return;
    }

    if (settleRefreshTimer !== null) {
      clearTimeout(settleRefreshTimer);
    }

    settleRefreshTimer = window.setTimeout(() => {
      settleRefreshTimer = null;
      void loadGoalsData({ taskUseCache: false });
    }, delay);
  };

  const saveGoalDefinitions = async (goals: Goal[]) => {
    await saveGoals(goals);
    await loadGoalsData({ taskUseCache: true });
  };

  onMounted(() => {
    unsubscribers.push(
      eventBus.on(Events.GOALS_UPDATED, () => {
        scheduleRefresh(true);
      }),
      eventBus.on(Events.TASK_CHANGED, () => {
        scheduleRefresh(false);
      }),
      eventBus.on(Events.TASK_ADDED, () => {
        scheduleRefresh(false);
        scheduleSettledRefresh();
      }),
      eventBus.on(Events.TASK_DELETED, () => {
        scheduleRefresh(false);
        scheduleSettledRefresh(260);
      }),
      eventBus.on(Events.TASK_UPDATED, () => {
        scheduleRefresh(false);
      })
    );

    void loadGoalsData({ taskUseCache: true });
  });

  onUnmounted(() => {
    unsubscribers.splice(0).forEach(unsubscribe => unsubscribe());
    if (refreshTimer !== null && typeof window !== 'undefined') {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    if (settleRefreshTimer !== null && typeof window !== 'undefined') {
      clearTimeout(settleRefreshTimer);
      settleRefreshTimer = null;
    }
  });

  return {
    goalDefinitions,
    goalDocuments,
    goalItems,
    goalsLoading,
    goalsError,
    loadGoalsData,
    saveGoalDefinitions
  };
};
