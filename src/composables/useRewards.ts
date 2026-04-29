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

interface BlockUpdateEventDetail {
  id?: string;
  completed?: boolean;
}

export const useRewards = () => {
  const rewardSnapshot = ref<RewardSnapshot>(createEmptyRewardSnapshot());
  const rewardLoading = ref(false);
  const blockRewardTimers = new Map<string, number>();

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

  let unsubscribeRewardUpdates: (() => void) | null = null;

  onMounted(() => {
    unsubscribeRewardUpdates = eventBus.on(Events.REWARDS_UPDATED, handleRewardUpdated);
    if (typeof window !== 'undefined') {
      window.addEventListener('siyuan-block-update', handleBlockUpdated as EventListener);
    }
    void loadRewards(true);
  });

  onUnmounted(() => {
    unsubscribeRewardUpdates?.();
    if (typeof window !== 'undefined') {
      window.removeEventListener('siyuan-block-update', handleBlockUpdated as EventListener);
      blockRewardTimers.forEach((timer) => clearTimeout(timer));
      blockRewardTimers.clear();
    }
  });

  return {
    rewardSnapshot,
    rewardLoading,
    loadRewards
  };
};
