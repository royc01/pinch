<template>
  <Transition name="fade">
    <div v-show="show" class="modal-overlay" @click.self="emit('close')">
      <Transition name="pop">
        <div class="modal-content" @click.stop v-show="show">
      <div class="modal-header">
        <h3>{{ titleText }}</h3>
        <button @click="emit('close')" class="icon-button" title="关闭" aria-label="关闭">
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
      <div class="modal-body" v-if="localHabit">
        <div class="form-group">
          <div class="emoji-selector">
            <SyInput v-model="localHabit.emoji" placeholder="选择或输入 Emoji" class="emoji-input-hidden" />
            <SyButton
              @click.stop="openEmojiPicker"
              type="default"
              size="small"
              class="emoji-picker-btn">
              <span v-if="localHabit.emoji" class="emoji-display">{{ localHabit.emoji }}</span>
              <span v-else>选择图标</span>
            </SyButton>
          </div>
        </div>
        <div class="form-group">
          <label>{{ t('habitTracker.habitName') }}</label>
          <SyInput v-model="localHabit.name" :placeholder="t('habitTracker.habitNamePlaceholder')" />
        </div>
        <div class="form-group">
          <label>{{ t('habitTracker.frequency') }}</label>
          <SySelect v-model="localHabit.frequency" :options="frequencyOptions" />
        </div>
        <div class="form-group">
          <label>{{ t('habitTracker.timesPerDay') }}</label>
          <SySelect 
            :modelValue="localHabit.timesPerDay?.toString()" 
            @update:modelValue="onTimesPerDayChange" 
            :options="timesPerDayOptions" 
          />
        </div>
        
        <div class="form-group">
          <label>
            <SyCheckbox 
              v-model="localHabit.usePomodoro"
              class="pomodoro-checkbox"
            />
            启用番茄钟
          </label>
        </div>
        
        <div class="form-group" v-if="localHabit.usePomodoro">
          <label>番茄钟时长</label>
          <SySelect 
            :modelValue="localHabit.pomodoroDuration?.toString()" 
            @update:modelValue="onPomodoroDurationChange"
            :options="pomodoroDurationOptions" 
          />
        </div>
      </div>
      <div class="modal-footer">
        <SyButton @click="handleSubmit" class="confirm-button">{{ buttonText }}</SyButton>
      </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { openEmoji } from 'siyuan';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyInput from '@/components/SiyuanTheme/SyInput.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';
import SyCheckbox from '@/components/SiyuanTheme/SyCheckbox.vue';
import type { Habit as ApiHabit } from '@/api';

interface Habit extends ApiHabit {
  weeklyGoal?: number;
}

interface NewHabit {
  name: string;
  emoji: string;
  frequency: string;
  timesPerDay: string | number;
  usePomodoro: boolean;
  pomodoroDuration: string | number;
}

interface Option {
  value: string;
  text: string;
}

interface Props {
  show: boolean;
  mode: 'add' | 'edit';
  habit: Habit | NewHabit | null;
  frequencyOptions: Option[];
  timesPerDayOptions: Option[];
  pomodoroDurationOptions: Option[];
  t: (key: string) => string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  submit: [habit: Habit | NewHabit];
}>();

const titleText = computed(() => {
  return props.mode === 'add' ? props.t('habitTracker.addHabit') : '编辑习惯';
});

const buttonText = computed(() => {
  return props.mode === 'add' ? props.t('OK') : '保存';
});

const localHabit = ref<Habit | NewHabit | null>(null);

watch(() => props.habit, (newHabit) => {
  if (newHabit) {
    localHabit.value = JSON.parse(JSON.stringify(newHabit));
  }
}, { immediate: true });

const openEmojiPicker = (event: MouseEvent) => {
  if (!localHabit.value) {
    return;
  }
  const target = event.currentTarget as HTMLElement | null;
  const rect = target ? target.getBoundingClientRect() : null;
  const position = rect
    ? { x: Math.round(rect.left), y: Math.round(rect.bottom) }
    : { x: event.clientX, y: event.clientY };
  openEmoji({
    position,
    selectedCB: (emoji: string) => {
      if (localHabit.value) {
        localHabit.value.emoji = normalizeEmojiValue(emoji);
      }
    },
    hideDynamicIcon: true,
    hideCustomIcon: true
  });
};

const normalizeEmojiValue = (value: string): string => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) {
    return '';
  }
  if (raw.includes('.') || raw.includes('/')) {
    return raw;
  }
  const hexPattern = /^[0-9a-fA-F]+(-[0-9a-fA-F]+)*$/;
  if (hexPattern.test(raw)) {
    const codePoints = raw.split('-').map(part => parseInt(part, 16));
    if (codePoints.every(point => Number.isFinite(point))) {
      try {
        return String.fromCodePoint(...codePoints);
      } catch {
        return raw;
      }
    }
  }
  return raw;
};

const onTimesPerDayChange = (value: string | number) => {
  if (localHabit.value) {
    localHabit.value.timesPerDay = typeof value === 'string' ? parseInt(value) || 1 : value;
  }
};

const onPomodoroDurationChange = (value: string | number) => {
  if (localHabit.value) {
    localHabit.value.pomodoroDuration = typeof value === 'string' ? parseInt(value) || 25 : value;
  }
};

const handleSubmit = () => {
  if (localHabit.value) {
    emit('submit', localHabit.value);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  z-index: 2;
}

.modal-content {
  background: var(--b3-theme-background);
  border-radius: 16px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
  overflow-y: auto;
  width: min(520px, 100%);
  min-width: 0;
  max-height: calc(100% - 40px);
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .modal-overlay {
    position: fixed;
    inset: 0;
    width: auto;
    height: auto;
    padding: calc(16px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 80;
  }

  .modal-content {
    max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.24s ease, transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}

.pop-enter-to,
.pop-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--b3-theme-on-background);
}

.icon-button {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button .icon {
  width: 16px;
  height: 16px;
  color: var(--b3-theme-on-background);
  fill: var(--b3-theme-on-background);
}

.icon-button:hover {
  background-color: var(--b3-list-hover);
  border-radius: 4px;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: var(--b3-theme-on-background);
}

.emoji-selector {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-picker-btn {
  border: none;
  border-radius: 20px;
  height: 80px;
  width: 80px;
  font-size: 14px;
  color: var(--b3-theme-on-surface);
  background-color: var(--b3-list-hover);
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-picker-btn .emoji-display {
  font-size: 50px;
  color: inherit;
}

.emoji-picker {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  margin-top: 4px;
  max-height: 50vh;
  overflow-y: auto;
}

.emoji-categories {
}

.emoji-category {
  padding: 8px;
  border-bottom: 1px solid var(--b3-border-color);
}

.emoji-category h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  opacity: 0.7;
}

.emoji-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20px, 1fr));
  gap: 4px;
  overflow: hidden;
}

.emoji-option {
  display: inline-block;
  font-size: 20px;
  cursor: pointer;
  border-radius: 4px;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.emoji-option:hover {
  background-color: var(--b3-list-hover);
}

.emoji-nav {
  position: sticky;
  bottom: 0;
  background: var(--b3-theme-background);
  padding: 4px 0;
  border-top: 1px solid var(--b3-border-color);
  display: flex;
  justify-content: space-around;
}

.emoji-nav-item {
  cursor: pointer;
  padding: 4px 8px;
  font-size: 18px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.emoji-nav-item:hover {
  background-color: var(--b3-list-hover);
}

.modal-footer {
  padding: 0px 20px 16px; 
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.confirm-button {
  background-color: #f98f7a;
  color: var(--b3-theme-background);
  font-weight: bold;
  border: none;
  border-radius: 24px;
  padding: 6px 12px;
}

.confirm-button:hover {
  background-color: #e55a47;
}

.confirm-button:active {
  background-color: #dc4a33;
}

.emoji-input-hidden {
  display: none;
}
</style>


