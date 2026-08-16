import { ref } from 'vue';
import { getMoodData, removeMoodEntry, upsertMoodEntry, type MoodData } from '@/api';
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
  let openRequestId = 0;

  async function loadMoodData(): Promise<void> {
    moodData.value = await getMoodData();
  }

  async function openMoodTracker(date: string): Promise<void> {
    const requestedDate = date;
    const requestId = ++openRequestId;
    selectedDate.value = requestedDate;
    const allMoodData = await getMoodData();
    if (requestId !== openRequestId || selectedDate.value !== requestedDate) return;
    const dateEntry = allMoodData[requestedDate];
    moodEntry.value = dateEntry
      ? {
          emoji: dateEntry.emoji || '',
          note: '',
          entries: [
            ...(dateEntry.note
              ? [{
                  id: `mood-note-${requestedDate}`,
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
    const targetDate = selectedDate.value;
    if (!targetDate) return;
    try {
      const moodDataLocal = await getMoodData();
      const existingEntry = moodDataLocal[targetDate];
      const now = new Date().toISOString();
      const existingEntries = [
        ...(existingEntry?.note
          ? [{
                  id: `mood-note-${targetDate}`,
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
      const nextEntry = {
        emoji: entry.emoji,
        note: '',
        timestamp: now,
        ...(nextEntries.length ? { entries: nextEntries } : {})
      };
      const persisted = await upsertMoodEntry(targetDate, nextEntry);
      moodData.value = persisted;
      eventBus.emit(Events.MOOD_UPDATED, { moodData: persisted });
    } catch (error) {
      console.error('保存情绪数据失败:', error);
    }
  }

  async function handleDeleteMoodEntry(): Promise<void> {
    const targetDate = selectedDate.value;
    if (!targetDate) return;
    try {
      const moodDataLocal = await getMoodData();
      const existingEntry = moodDataLocal[targetDate];
      if (existingEntry?.entries?.length) {
        const persisted = await upsertMoodEntry(targetDate, {
          emoji: '',
          note: '',
          timestamp: new Date().toISOString(),
          entries: existingEntry.entries
        });
        moodData.value = persisted;
      } else {
        moodData.value = await removeMoodEntry(targetDate);
      }
      eventBus.emit(Events.MOOD_UPDATED, { moodData: moodData.value });
    } catch (error) {
      console.error('删除情绪数据失败:', error);
    }
  }

  async function handleClearMoodEntry(): Promise<void> {
    const targetDate = selectedDate.value;
    if (!targetDate) return;
    try {
      moodData.value = await removeMoodEntry(targetDate);
      moodEntry.value = { emoji: '', note: '' };
      eventBus.emit(Events.MOOD_UPDATED, { moodData: moodData.value });
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
