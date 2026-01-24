<template>
  <Transition name="fade">
    <div v-show="show" class="modal-overlay" @click.self="emit('close')">
      <Transition name="slide">
        <div class="modal-content" @click.stop v-show="show">
      <div class="modal-header">
        <h3>{{ t('habitTracker.addHabit') }}</h3>
        <button @click="emit('close')" class="icon-button">
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>选择图标</label>
          <div class="emoji-selector">
            <SyInput v-model="localHabit.emoji" placeholder="选择或输入emoji" />
            <SyButton
              @click="showEmojiPicker = !showEmojiPicker"
              type="default"
              size="small"
              class="emoji-picker-btn">
              📝
            </SyButton>
            <div class="emoji-picker" v-show="showEmojiPicker">
              <div class="emoji-categories">
                <div
                  v-for="(emojis, category) in emojiCategories"
                  :key="category"
                  class="emoji-category"
                  :id="getEmojiCategoryId(category)">
                  <h4>{{ category }}</h4>
                  <div class="emoji-options-grid">
                    <div class="emoji-option" v-for="emoji in emojis" :key="emoji" @click="selectEmoji(emoji)">
                      {{ emoji }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="emoji-nav">
                <div
                  v-for="(_, category) in emojiCategories"
                  :key="category"
                  class="emoji-nav-item"
                  @click="scrollToCategory(getEmojiCategoryId(category))">
                  {{ getFixedEmojiForCategory(category) }}
                </div>
              </div>
            </div>
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
          <SySelect v-model="localHabit.timesPerDay" :options="timesPerDayOptions" />
        </div>
        
        <div class="form-group">
          <label>
            <input 
              type="checkbox" 
              v-model="localHabit.usePomodoro" 
              class="pomodoro-checkbox"
            >
            启用番茄钟功能
          </label>
        </div>
        
        <div class="form-group" v-if="localHabit.usePomodoro">
          <label>番茄钟时长</label>
          <SySelect 
            :modelValue="localHabit.pomodoroDuration" 
            @update:modelValue="(value) => localHabit.pomodoroDuration = value"
            :options="pomodoroDurationOptions" 
          />
        </div>
      </div>
      <div class="modal-footer">
        <SyButton @click="handleAdd" class="confirm-button">{{ t('OK') }}</SyButton>
      </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Icon from '@/components/Icon.vue';
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import SyInput from '@/components/SiyuanTheme/SyInput.vue';
import SySelect from '@/components/SiyuanTheme/SySelect.vue';

interface NewHabit {
  name: string;
  emoji: string;
  frequency: string;
  timesPerDay: string;
  usePomodoro: boolean;
  pomodoroDuration: string;
}

interface Option {
  value: string;
  text: string;
}

interface Props {
  show: boolean;
  habit: NewHabit;
  emojiCategories: Record<string, string[]>;
  emojisLoading: boolean;
  frequencyOptions: Option[];
  timesPerDayOptions: Option[];
  pomodoroDurationOptions: Option[];
  t: (key: string) => string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  add: [habit: NewHabit];
}>();

const showEmojiPicker = ref(false);
const localHabit = ref<NewHabit>({ ...props.habit });
watch(() => props.habit, (newHabit) => {
  localHabit.value = { ...newHabit };
}, { immediate: true, deep: true });

const selectEmoji = (emoji: string) => {
  localHabit.value.emoji = emoji;
  showEmojiPicker.value = false;
};

const getEmojiCategoryId = (category: string): string => {
  const emojiCategoryIds: Record<string, string> = {};
  Object.keys(props.emojiCategories).forEach((category, index) => {
    emojiCategoryIds[category] = `emoji-category-${index}`;
  });
  return emojiCategoryIds[category] || '';
};

const scrollToCategory = (categoryId: string) => {
  const element = document.getElementById(categoryId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const getFixedEmojiForCategory = (category: string): string => {
  const emojiMap: Record<string, string> = {
    '笑脸和人类': '😀',
    '动物和自然': '🐷',
    '食物和饮料': '🍎',
    '活动': '⚽',
    '旅行和地点': '✈️',
    '物品': '🎁',
    '符号': '❤️',
    '旗帜': '🚩',
  };
  return emojiMap[category] || '😀';
};

const handleAdd = () => {
  emit('add', { ...localHabit.value });
  emit('close');
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
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  background: var(--b3-theme-background);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  min-height: 85vh;
  overflow-y: auto;
  min-width: 100%;
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

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(35%);
}

.slide-enter-to,
.slide-leave-from {
  transform: translateY(0);
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
}

.emoji-picker-btn {
  margin-left: 8px;
  border: none;
  border-radius: 6px;
  height: 28px;
  width: 30px;
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
  padding: 16px 20px;
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

.pomodoro-checkbox {
  margin-right: 8px;
}
</style>
