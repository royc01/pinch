import { computed, onScopeDispose, ref, watch } from 'vue';
import { cancelLayoutMeasurement, scheduleLayoutMeasurement } from '@/utils/layoutMeasurement';

export function useCalendarVirtualList<T>(source: () => T[], rowStep: number) {
  const viewport = ref<HTMLElement | null>(null);
  const scrollTop = ref(0);
  const height = ref(320);
  function measure(): (() => void) | void {
    if (!viewport.value) return;
    const nextHeight = viewport.value.clientHeight;
    return () => { if (nextHeight > 0) height.value = nextHeight; };
  }
  watch(viewport, (element, _, cleanup) => {
    scrollTop.value = element?.scrollTop || 0;
    if (!element) return;
    scheduleLayoutMeasurement(measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => scheduleLayoutMeasurement(measure));
    observer?.observe(element);
    cleanup(() => { observer?.disconnect(); cancelLayoutMeasurement(measure); });
  });
  watch(() => viewport.value ? source().length : 0, () => {
    if (!viewport.value) return;
    if (scrollTop.value > Math.max(0, source().length * rowStep - height.value)) {
      scrollTop.value = Math.max(0, source().length * rowStep - height.value);
      if (viewport.value) viewport.value.scrollTop = scrollTop.value;
    }
  });
  const window = computed(() => {
    const tasks = source();
    const top = Math.min(scrollTop.value, Math.max(0, tasks.length * rowStep - height.value));
    const first = Math.max(0, Math.floor(top / rowStep) - 8);
    const last = Math.min(tasks.length, Math.ceil((top + height.value) / rowStep) + 8);
    return { tasks: tasks.slice(first, last), top: first * rowStep, bottom: (tasks.length - last) * rowStep };
  });
  onScopeDispose(() => cancelLayoutMeasurement(measure));
  return { viewport, window, onScroll: (event: Event) => { scrollTop.value = (event.currentTarget as HTMLElement).scrollTop; } };
}
