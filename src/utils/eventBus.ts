type EventCallback = (data: any) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit(event: string, data?: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in event handler for "${event}":`, error);
        }
      });
    }
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus();

export interface HabitTrackerPanelOpenRequest {
  target: 'habit-total' | 'habit-detail' | 'reward' | 'goal';
  habitId?: string;
  goalId?: string;
  rewardEntryId?: string;
}

export interface FocusTimerPanelOpenRequest {
  target?: {
    type: 'habit' | 'task';
    id: string;
    name: string;
    emoji?: string;
    preferredDuration?: number;
    blockId?: string;
  } | null;
  showPanel?: boolean;
  openMiniSettings?: boolean;
}

export interface TaskViewSwitchRequest {
  view?: 'kanban' | 'table' | 'gantt' | 'day' | 'week' | 'three-day' | 'month' | 'archive-table' | 'stats';
  source?: string;
  documentId?: string;
}

export const Events = {
  TASK_CHANGED: 'task-changed',
  TASK_ADDED: 'task-added',
  TASK_DELETED: 'task-deleted',
  TASK_UPDATED: 'task-updated',
  HABITS_UPDATED: 'habits-updated',
  REWARDS_UPDATED: 'rewards-updated',
  GOALS_UPDATED: 'goals-updated',
  TASK_GROUPS_UPDATED: 'task-groups-updated',
  DOCUMENT_GROUPS_UPDATED: 'document-groups-updated',
  TASK_TOGGLED: 'task-toggled',
  TASK_EDITOR_OPEN_REQUEST: 'task-editor-open-request',
  KANBAN_VIEW_SWITCH_REQUEST: 'kanban-view-switch-request',
  MOBILE_KANBAN_DIALOG_CLOSE_REQUEST: 'mobile-kanban-dialog-close-request',
  HABIT_TRACKER_PANEL_OPEN_REQUEST: 'habit-tracker-panel-open-request',
  FOCUS_TIMER_PANEL_OPEN_REQUEST: 'focus-timer-panel-open-request',
};
