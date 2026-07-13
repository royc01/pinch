import type { LifelogTimelinePanelItem } from '@/components/LifelogTimelinePanel.vue';
import { eventBus, Events } from './eventBus';

export interface LifelogTimelineSnapshot {
  date: string;
  items: LifelogTimelinePanelItem[];
}

let snapshot: LifelogTimelineSnapshot | null = null;

function cloneItems(items: LifelogTimelinePanelItem[]): LifelogTimelinePanelItem[] {
  return items.map(item => ({
    ...item,
    badges: item.badges?.map(badge => ({
      ...badge,
      style: badge.style ? { ...badge.style } : undefined
    }))
  }));
}

export function getLifelogTimelineSnapshot(): LifelogTimelineSnapshot | null {
  if (!snapshot) {
    return null;
  }
  return {
    date: snapshot.date,
    items: cloneItems(snapshot.items)
  };
}

export function publishLifelogTimelineSnapshot(
  date: string,
  items: LifelogTimelinePanelItem[]
): void {
  if (!date) {
    return;
  }
  snapshot = { date, items: cloneItems(items) };
  eventBus.emit(Events.LIFELOG_TIMELINE_UPDATED, getLifelogTimelineSnapshot());
}
