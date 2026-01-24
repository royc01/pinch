<template>
  <Transition name="fade">
    <div v-show="show" class="modal-overlay" @click.self="emit('close')">
      <Transition name="slide">
        <div class="modal-content" @click.stop v-show="show">
      <div class="modal-header">
        <h3>心情打卡 - {{ selectedDate }}</h3>
        <button @click="emit('close')" class="icon-button">
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>选择心情</label>
          <div class="emoji-selector">
            <div class="mood-emoji-grid">
              <span 
                v-for="emoji in moodEmojis" 
                :key="emoji.id"
                class="mood-emoji-option"
                @click="handleSelectMoodEmoji(emoji.emoji)"
                :class="{ selected: localMoodEntry.emoji === emoji.emoji }">
                <div v-html="getLargeMoodSvg(emoji.emoji)" class="mood-svg"></div>
              </span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>今日心情</label>
          <SyTextarea v-model="localMoodEntry.note" placeholder="记录今天的心情或事件..." class="mood-input" />
        </div>
      </div>
      <div class="modal-footer">
        <SyButton @click="handleDelete" class="danger-button" v-if="localMoodEntry.emoji || localMoodEntry.note">删除</SyButton>
        <SyButton @click="handleSave" class="confirm-button">保存</SyButton>
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
import SyTextarea from '@/components/SiyuanTheme/SyTextarea.vue';

interface MoodEmoji {
  id: string;
  emoji: string;
  largeSvg: string;
  smallSvg: string;
}

interface MoodEntry {
  emoji: string;
  note: string;
}

interface Props {
  show: boolean;
  selectedDate: string;
  moodEntry: MoodEntry;
  moodEmojis: MoodEmoji[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  save: [moodEntry: MoodEntry];
  delete: [];
}>();

const localMoodEntry = ref<MoodEntry>({ ...props.moodEntry });

watch(() => props.moodEntry, (newMoodEntry) => {
  localMoodEntry.value = { ...newMoodEntry };
}, { immediate: true, deep: true });

const getLargeMoodSvg = (emoji: string) => {
  const mood = props.moodEmojis.find(m => m.emoji === emoji);
  return mood ? mood.largeSvg : '';
};

const handleSelectMoodEmoji = (emoji: string) => {
  localMoodEntry.value.emoji = emoji;
};

const handleSave = () => {
  emit('save', { ...localMoodEntry.value });
  emit('close');
};

const handleDelete = () => {
  emit('delete');
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

.mood-emoji-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.mood-emoji-option {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.mood-emoji-option:hover {
  background-color: var(--b3-list-hover);
}

.mood-emoji-option.selected {
  background-color: var(--b3-list-hover);
  box-shadow: 0 0 0 2px var(--b3-theme-primary);
}

.mood-svg {
  width: 40px;
  height: 40px;
}

.mood-input {
  min-height: 80px;
  resize: vertical;
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

.danger-button {
  background-color: #e74c3c;
  color: var(--b3-theme-background);
  font-weight: bold;
  border: none;
  border-radius: 24px;
  padding: 6px 12px;
}

.danger-button:hover {
  background-color: #c0392b;
}
</style>
