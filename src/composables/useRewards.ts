import { onMounted, onUnmounted, ref } from 'vue';
import { TaskRepository } from '@/api';
import {
  awardTaskCompletion,
  createEmptyRewardSnapshot,
  getRewardSnapshot,
  type RewardSnapshot,
  type RewardUpdatePayload
} from '@/rewardRepository';
import { eventBus, Events } from '@/utils/eventBus';

const BLOCK_REWARD_SYNC_DELAY_MS = 80;
const TASK_CHANGE_REWARD_DELAY_MS = 150;

interface BlockUpdateEventDetail {
  id?: string;
  completed?: boolean;
}

export const useRewards = () => {
  const rewardSnapshot = ref<RewardSnapshot>(createEmptyRewardSnapshot());
  const rewardLoading = ref(false);
  const blockRewardTimers = new Map<string, number>();
  const taskChangeRewardTimers = new Map<string, number>();
  const recentlyAwardedTasks = new Set<string>();

  const loadRewards = async (forceRefresh: boolean = false) => {
    rewardLoading.value = true;
    try {
      rewardSnapshot.value = await getRewardSnapshot(forceRefresh);
    } finally {
      rewardLoading.value = false;
    }
  };

  const scheduleTaskRewardSync = (blockId: string) => {
    const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
    if (!normalizedBlockId || typeof window === 'undefined') {
      return;
    }

    const existingTimer = blockRewardTimers.get(normalizedBlockId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      blockRewardTimers.delete(normalizedBlockId);
      void TaskRepository.getTaskByBlockId(normalizedBlockId, false)
        .then((task) => {
          if (!task || task.status !== 'completed') {
            return;
          }
          return awardTaskCompletion(task);
        })
        .catch((error) => {
          console.error('[Rewards] 同步任务奖励失败:', error);
        });
    }, BLOCK_REWARD_SYNC_DELAY_MS);

    blockRewardTimers.set(normalizedBlockId, timer);
  };

  const scheduleTaskChangeReward = (blockId: string) => {
    const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
    if (!normalizedBlockId || typeof window === 'undefined') {
      return;
    }

    if (recentlyAwardedTasks.has(normalizedBlockId)) {
      return;
    }

    const existingTimer = taskChangeRewardTimers.get(normalizedBlockId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      taskChangeRewardTimers.delete(normalizedBlockId);
      void TaskRepository.getTaskByBlockId(normalizedBlockId, false)
        .then((task) => {
          if (!task || task.status !== 'completed') {
            return;
          }
          recentlyAwardedTasks.add(normalizedBlockId);
          setTimeout(() => recentlyAwardedTasks.delete(normalizedBlockId), 2000);
          return awardTaskCompletion(task);
        })
        .catch((error) => {
          console.error('[Rewards] 任务变更奖励同步失败:', error);
        });
    }, TASK_CHANGE_REWARD_DELAY_MS);

    taskChangeRewardTimers.set(normalizedBlockId, timer);
  };

  const handleRewardUpdated = (payload?: RewardUpdatePayload) => {
    if (payload?.snapshot) {
      rewardSnapshot.value = payload.snapshot;
      return;
    }
    void loadRewards(true);
  };

  const handleBlockUpdated = (event: Event) => {
    const customEvent = event as CustomEvent<BlockUpdateEventDetail>;
    if (!customEvent.detail?.completed) {
      return;
    }

    const blockId = typeof customEvent.detail.id === 'string' ? customEvent.detail.id.trim() : '';
    if (!blockId) {
      return;
    }

    scheduleTaskRewardSync(blockId);
  };

  const handleTaskChanged = (data?: { blockIds?: string[] }) => {
    if (!data?.blockIds?.length) {
      return;
    }
    for (const blockId of data.blockIds) {
      if (typeof blockId === 'string' && blockId.trim()) {
        scheduleTaskChangeReward(blockId.trim());
      }
    }
  };

  let unsubscribeRewardUpdates: (() => void) | null = null;
  let unsubscribeTaskChanged: (() => void) | null = null;

  onMounted(() => {
    unsubscribeRewardUpdates = eventBus.on(Events.REWARDS_UPDATED, handleRewardUpdated);
    unsubscribeTaskChanged = eventBus.on(Events.TASK_CHANGED, handleTaskChanged);
    if (typeof window !== 'undefined') {
      window.addEventListener('siyuan-block-update', handleBlockUpdated as EventListener);
    }
    void loadRewards(true);
  });

  onUnmounted(() => {
    unsubscribeRewardUpdates?.();
    unsubscribeTaskChanged?.();
    if (typeof window !== 'undefined') {
      window.removeEventListener('siyuan-block-update', handleBlockUpdated as EventListener);
      blockRewardTimers.forEach((timer) => clearTimeout(timer));
      blockRewardTimers.clear();
      taskChangeRewardTimers.forEach((timer) => clearTimeout(timer));
      taskChangeRewardTimers.clear();
    }
  });

  return {
    rewardSnapshot,
    rewardLoading,
    loadRewards
  };
};
