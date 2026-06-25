import { ref } from 'vue';
import { getMoodData, saveMoodData, type MoodData } from '@/api';
import { eventBus, Events } from '@/utils/eventBus';

type MoodEntryInput = {
  emoji: string;
  note: string;
  entries?: Array<{
    id: string;
    text: string;
    createdAt: string;
    updatedAt: string;
  }>;
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
          note: '',
          entries: [
            ...(dateEntry.note
              ? [{
                  id: `mood-note-${date}`,
                  text: dateEntry.note,
                  createdAt: dateEntry.timestamp,
                  updatedAt: dateEntry.timestamp
                }]
              : []),
            ...(dateEntry.entries || [])
          ]
        }
      : { emoji: '', note: '' };
    showMoodTracker.value = true;
  }

  async function handleSaveMoodEntry(entry: MoodEntryInput): Promise<void> {
    try {
      const moodDataLocal = await getMoodData();
      const existingEntry = moodDataLocal[selectedDate.value];
      const now = new Date().toISOString();
      const existingEntries = [
        ...(existingEntry?.note
          ? [{
              id: `mood-note-${selectedDate.value}`,
              text: existingEntry.note,
              createdAt: existingEntry.timestamp,
              updatedAt: existingEntry.timestamp
            }]
          : []),
        ...(existingEntry?.entries || [])
      ];
      const submittedEntries = entry.entries
        ? entry.entries.map(record => ({ ...record }))
        : existingEntries;
      const nextEntries = entry.note.trim()
        ? [
            ...submittedEntries,
            {
              id: `mood-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              text: entry.note.trim(),
              createdAt: now,
              updatedAt: now
            }
          ]
        : submittedEntries;
      moodDataLocal[selectedDate.value] = {
        emoji: entry.emoji,
        note: '',
        timestamp: now,
        ...(nextEntries.length ? { entries: nextEntries } : {})
      };
      await saveMoodData(moodDataLocal);
      moodData.value = moodDataLocal;
      eventBus.emit(Events.MOOD_UPDATED, { moodData: moodDataLocal });
    } catch (error) {
      console.error('保存情绪数据失败:', error);
    }
  }

  async function handleDeleteMoodEntry(): Promise<void> {
    if (!selectedDate.value) return;
    try {
      const moodDataLocal = await getMoodData();
      const existingEntry = moodDataLocal[selectedDate.value];
      if (existingEntry?.entries?.length) {
        moodDataLocal[selectedDate.value] = {
          emoji: '',
          note: '',
          timestamp: new Date().toISOString(),
          entries: existingEntry.entries
        };
      } else {
        delete moodDataLocal[selectedDate.value];
      }
      await saveMoodData(moodDataLocal);
      moodData.value = moodDataLocal;
      eventBus.emit(Events.MOOD_UPDATED, { moodData: moodDataLocal });
    } catch (error) {
      console.error('删除情绪数据失败:', error);
    }
  }

  async function handleClearMoodEntry(): Promise<void> {
    if (!selectedDate.value) return;
    try {
      const moodDataLocal = await getMoodData();
      delete moodDataLocal[selectedDate.value];
      await saveMoodData(moodDataLocal);
      moodData.value = moodDataLocal;
      moodEntry.value = { emoji: '', note: '' };
      eventBus.emit(Events.MOOD_UPDATED, { moodData: moodDataLocal });
    } catch (error) {
      console.error('清除每日记录失败:', error);
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
    handleClearMoodEntry,
    closeMoodTracker,
    changeMoodCalendarMonth
  };
}
