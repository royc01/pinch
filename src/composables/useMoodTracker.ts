import { ref } from 'vue';
import { getMoodData, saveMoodData, type MoodData } from '@/api';

type MoodEntryInput = {
  emoji: string;
  note: string;
};

export function useMoodTracker() {
  const moodData = ref<MoodData>({});
  const showMoodCalendar = ref(false);
  const moodCalendarCurrentMonth = ref(0);

  const showMoodTracker = ref(false);
  const selectedDate = ref('');
  const moodEntry = ref<MoodEntryInput>({
    emoji: '',
    note: ''
  });

  async function loadMoodData(): Promise<void> {
    moodData.value = await getMoodData();
  }

  async function openMoodTracker(date: string): Promise<void> {
    selectedDate.value = date;
    const allMoodData = await getMoodData();
    const dateEntry = allMoodData[date];
    moodEntry.value = dateEntry
      ? {
          emoji: dateEntry.emoji || '',
          note: dateEntry.note || ''
        }
      : { emoji: '', note: '' };
    showMoodTracker.value = true;
  }

  async function handleSaveMoodEntry(entry: MoodEntryInput): Promise<void> {
    try {
      const moodDataLocal = await getMoodData();
      moodDataLocal[selectedDate.value] = {
        emoji: entry.emoji,
        note: entry.note,
        timestamp: new Date().toISOString()
      };
      await saveMoodData(moodDataLocal);
      moodData.value = moodDataLocal;
    } catch (error) {
      console.error('保存情绪数据失败:', error);
    }
  }

  async function handleDeleteMoodEntry(): Promise<void> {
    if (!selectedDate.value) return;
    try {
      const moodDataLocal = await getMoodData();
      delete moodDataLocal[selectedDate.value];
      await saveMoodData(moodDataLocal);
      moodData.value = moodDataLocal;
    } catch (error) {
      console.error('删除情绪数据失败:', error);
    }
  }

  function closeMoodTracker(): void {
    showMoodTracker.value = false;
    moodEntry.value = { emoji: '', note: '' };
  }

  function changeMoodCalendarMonth(offset: number): void {
    moodCalendarCurrentMonth.value += offset;
  }

  return {
    moodData,
    showMoodCalendar,
    moodCalendarCurrentMonth,
    showMoodTracker,
    selectedDate,
    moodEntry,
    loadMoodData,
    openMoodTracker,
    handleSaveMoodEntry,
    handleDeleteMoodEntry,
    closeMoodTracker,
    changeMoodCalendarMonth
  };
}
