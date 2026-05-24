<template>
  <Teleport to="body" :disabled="!floating">
    <div
      v-if="visible"
      :class="floating ? 'time-popover-overlay' : 'time-popover-inline-wrapper'"
      @mousedown="handleOverlayMouseDown"
    >
      <div
        ref="popoverRef"
        :class="['time-popover', { 'time-popover-inline': !floating }]"
        :style="floating ? popoverStyle : undefined"
        @mousedown.stop
        @click.stop
      >
        <div class="time-popover-header">
          <div class="time-popover-title">{{ t('taskManager.pickTime') }}</div>
          <div class="time-popover-value">{{ previewValue }}</div>
        </div>

        <div class="time-popover-wheel">
          <div class="time-popover-picker">
            <div class="time-popover-selection"></div>
            <div
              ref="hourScrollerRef"
              class="time-popover-scroller"
              @scroll.passive="handleHourScroll"
            >
              <button
                v-for="hour in hourOptions"
                :key="hour"
                type="button"
                class="time-popover-item"
                :class="{ 'is-selected': localHour === hour }"
                @click="scrollToHour(hour)"
              >
                {{ hour }}
              </button>
            </div>
          </div>

          <div class="time-popover-separator">:</div>

          <div class="time-popover-picker">
            <div class="time-popover-selection"></div>
            <div
              ref="minuteScrollerRef"
              class="time-popover-scroller"
              @scroll.passive="handleMinuteScroll"
            >
              <button
                v-for="minute in minuteOptions"
                :key="minute"
                type="button"
                class="time-popover-item"
                :class="{ 'is-selected': localMinute === minute }"
                @click="scrollToMinute(minute)"
              >
                {{ minute }}
              </button>
            </div>
          </div>
        </div>

        <div class="time-popover-footer">
          <button type="button" class="time-popover-footer-btn subtle" @click="clearSelection">{{ t('taskManager.clear') }}</button>
          <button type="button" class="time-popover-footer-btn primary" @click="applySelection">{{ t('taskManager.apply') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';

const ITEM_HEIGHT = 36;

const props = withDefaults(defineProps<{
  modelValue: string;
  visible: boolean;
  floating?: boolean;
  anchorEl?: HTMLElement | null;
  autoClose?: boolean;
}>(), {
  floating: true,
  autoClose: false
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  close: [];
}>();

const popoverRef = ref<HTMLElement | null>(null);
const hourScrollerRef = ref<HTMLElement | null>(null);
const minuteScrollerRef = ref<HTMLElement | null>(null);
const popoverStyle = ref<Record<string, string>>({});
const localHour = ref('09');
const localMinute = ref('00');
const { t } = useI18n();

const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

const previewValue = computed(() => `${localHour.value}:${localMinute.value}`);

function parseTimeValue(value: string): { hour: string; minute: string } {
  const matched = /^(\d{2}):(\d{2})$/.exec((value || '').trim());
  if (matched) {
    const hour = Number(matched[1]);
    const minute = Number(matched[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return {
        hour: String(hour).padStart(2, '0'),
        minute: String(minute).padStart(2, '0')
      };
    }
  }

  const now = new Date();
  return {
    hour: String(now.getHours()).padStart(2, '0'),
    minute: String(now.getMinutes()).padStart(2, '0')
  };
}

function updatePopoverPosition(): void {
  if (!props.floating) return;
  const anchor = props.anchorEl;
  const popover = popoverRef.value;
  if (!anchor || !popover) return;
  const anchorRect = anchor.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const margin = 12;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  let left = anchorRect.left;
  let top = anchorRect.bottom + 8;

  if (left + popoverRect.width > viewportWidth - margin) {
    left = viewportWidth - margin - popoverRect.width;
  }
  if (left < margin) left = margin;

  if (top + popoverRect.height > viewportHeight - margin) {
    top = anchorRect.top - popoverRect.height - 8;
  }
  if (top < margin) top = margin;

  popoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`
  };
}

function emitSelection(value: string): void {
  emit('update:modelValue', value);
  if (props.autoClose) {
    emit('close');
  }
}

function applySelection(): void {
  emitSelection(`${localHour.value}:${localMinute.value}`);
  emit('close');
}

function clearSelection(): void {
  emitSelection('');
  emit('close');
}

function handleOverlayMouseDown(): void {
  if (props.floating) {
    emit('close');
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.visible || !props.floating) {
    return;
  }
  if (event.key === 'Escape') {
    emit('close');
  }
}

function handleResize(): void {
  if (props.visible && props.floating) {
    updatePopoverPosition();
  }
}

function getValueIndex(options: string[], value: string): number {
  const index = options.indexOf(value);
  return index === -1 ? 0 : index;
}

function scrollColumnToIndex(
  scroller: HTMLElement | null,
  index: number,
  behavior: ScrollBehavior = 'auto'
): void {
  if (!scroller) {
    return;
  }
  scroller.scrollTo({
    top: Math.max(0, index) * ITEM_HEIGHT,
    behavior
  });
}

function syncSelectionFromScroll(
  scroller: HTMLElement | null,
  options: string[],
  assign: (value: string) => void
): void {
  if (!scroller) {
    return;
  }
  const index = Math.max(0, Math.min(options.length - 1, Math.round(scroller.scrollTop / ITEM_HEIGHT)));
  assign(options[index]);
}

function scrollToHour(hour: string): void {
  localHour.value = hour;
  scrollColumnToIndex(hourScrollerRef.value, getValueIndex(hourOptions, hour), 'smooth');
}

function scrollToMinute(minute: string): void {
  localMinute.value = minute;
  scrollColumnToIndex(minuteScrollerRef.value, getValueIndex(minuteOptions, minute), 'smooth');
}

function handleHourScroll(): void {
  syncSelectionFromScroll(hourScrollerRef.value, hourOptions, (value) => {
    localHour.value = value;
  });
}

function handleMinuteScroll(): void {
  syncSelectionFromScroll(minuteScrollerRef.value, minuteOptions, (value) => {
    localMinute.value = value;
  });
}

function syncScrollFromModel(): void {
  scrollColumnToIndex(hourScrollerRef.value, getValueIndex(hourOptions, localHour.value));
  scrollColumnToIndex(minuteScrollerRef.value, getValueIndex(minuteOptions, localMinute.value));
}

watch(
  () => [props.visible, props.modelValue, props.floating, props.anchorEl],
  ([visible]) => {
    if (!visible) return;
    const parsed = parseTimeValue(props.modelValue);
    localHour.value = parsed.hour;
    localMinute.value = parsed.minute;
    void nextTick(() => {
      syncScrollFromModel();
      if (props.floating) {
        updatePopoverPosition();
      }
    });
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.time-popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: transparent;
}

.time-popover-inline-wrapper {
  position: relative;
}

.time-popover {
  position: fixed;
  width: 248px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--b3-theme-border);
  background: var(--b3-theme-background);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
}

.time-popover-inline {
  position: relative;
  width: 100%;
  max-width: 248px;
  box-shadow: none;
}

.time-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.time-popover-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.time-popover-value {
  border-radius: 999px;
  padding: 5px 10px;
  background: var(--pinch-background3);
  color: var(--pinch-font-color3);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.time-popover-wheel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 8px;
  align-items: stretch;
}

.time-popover-picker {
  position: relative;
  min-width: 0;
}

.time-popover-selection {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 36px;
  transform: translateY(-50%);
  border-radius: 10px;
  background: var(--b3-list-hover);
  box-shadow: inset 0 0 0 1px rgba(249, 143, 122, 0.22);
  pointer-events: none;
}

.time-popover-scroller {
  height: 180px;
  overflow-y: auto;
  padding: 72px 0;
  box-sizing: border-box;
  scroll-snap-type: y mandatory;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.time-popover-scroller::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.time-popover-item {
  width: 100%;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--b3-theme-on-surface);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: color 0.15s ease, transform 0.15s ease;
  scroll-snap-align: center;
}

.time-popover-item.is-selected {
  color: var(--b3-theme-on-background);
  font-weight: 700;
  transform: scale(1.04);
}

.time-popover-separator {
  align-self: center;
  font-size: 24px;
  line-height: 1;
  font-weight: 700;
  color: var(--b3-theme-on-surface);
  opacity: 0.58;
}

.time-popover-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.time-popover-footer-btn {
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.time-popover-footer-btn.subtle {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
}

.time-popover-footer-btn.primary {
  background: #f98f7a;
  color: var(--b3-theme-background);
}
</style>
