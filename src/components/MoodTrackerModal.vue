<template>
  <Transition name="fade">
    <div v-show="show" class="modal-overlay" @click.self="emit('close')">
      <Transition name="pop">
        <div class="modal-content" @click.stop v-show="show">
      <div class="modal-header">
        <h3>{{ t('moodCheckinWithDate', { date: selectedDate }) }}</h3>
        <button @click="emit('close')" class="icon-button" :title="t('close')" :aria-label="t('close')">
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>{{ t('selectMood') }}</label>
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
          <label>{{ t('todayMood') }}</label>
          <SyTextarea v-model="localMoodEntry.note" :placeholder="t('moodPlaceholder')" class="mood-input" />
        </div>
      </div>
      <div class="modal-footer">
        <SyButton @click="handleDelete" class="danger-button" v-if="localMoodEntry.emoji || localMoodEntry.note">{{ t('delete') }}</SyButton>
        <SyButton @click="handleSave" class="confirm-button">{{ t('save') }}</SyButton>
      </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { t } from '@/utils/i18n';
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

const setDefaultEmoji = () => {
  if (props.show && !localMoodEntry.value.emoji) {
    localMoodEntry.value.emoji = '🤩';
  }
};

watch(() => props.moodEntry, (newMoodEntry) => {
  localMoodEntry.value = { ...newMoodEntry };
  setDefaultEmoji();
}, { immediate: true, deep: true });

watch(() => props.show, () => {
  setDefaultEmoji();
}, { immediate: true });

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
  align-items: center;
  box-sizing: border-box;
  z-index: 8;
}

.modal-content {
  background: var(--b3-theme-background);
  border-radius: 16px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
  overflow-y: auto;
  width: min(560px, 100%);
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
  width: 100%;
  min-width: 0;
}

.mood-emoji-grid {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(4px, 1vw, 4px);
}

.mood-emoji-option {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  min-width: 0;
  aspect-ratio: 1;
  padding: clamp(4px, 1vw, 4px);
  border-radius: 8px;
  transition: all 0.2s;
}

.mood-emoji-option:hover {
  background-color: var(--b3-list-hover);
}



.mood-emoji-option.selected .mood-svg {
  opacity: 1;
}

.mood-emoji-option:not(.selected) .mood-svg {
  opacity: 0.3;
}

.mood-svg {
  width: 100%;
  height: 100%;
  max-width: 40px;
  max-height: 40px;
  transition: opacity 0.2s;
}

.mood-svg :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
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
