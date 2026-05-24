import { ref, type Ref } from 'vue';
import { openBlockById, type Habit } from '@/api';
import { translate } from '@/composables/useI18n';

const DOC_ID_PATTERN = /^\d{14}-[a-z0-9]{7}$/i;

interface UseHabitDocBindingOptions {
  saveHabitsNow: (habitsToSave: Habit[]) => Promise<void>;
  alertFn?: (message: string) => void;
  openDocById?: (docId: string) => void;
}

function defaultAlert(message: string): void {
  window.alert(message);
}

function defaultOpenDocById(docId: string): void {
  void openBlockById(docId);
}

export function normalizeDocId(raw: string): string {
  const value = raw.trim();
  const match = value.match(/\d{14}-[a-z0-9]{7}/i);
  return match ? match[0] : value;
}

export function useHabitDocBinding(habits: Ref<Habit[]>, options: UseHabitDocBindingOptions) {
  const showBindDocModal = ref(false);
  const bindDocInput = ref('');
  const bindDocHabitId = ref('');

  const showAlert = options.alertFn ?? defaultAlert;
  const openDocById = options.openDocById ?? defaultOpenDocById;

  function getBindDocHabit(): Habit | undefined {
    return habits.value.find(habit => habit.id === bindDocHabitId.value);
  }

  function openBindDocModal(habit: Habit): void {
    bindDocHabitId.value = habit.id;
    bindDocInput.value = habit.noteDocId || '';
    showBindDocModal.value = true;
  }

  function closeBindDocModal(): void {
    showBindDocModal.value = false;
    bindDocHabitId.value = '';
    bindDocInput.value = '';
  }

  async function confirmBindDoc(): Promise<void> {
    const habit = getBindDocHabit();
    if (!habit) return;

    const docId = normalizeDocId(bindDocInput.value);
    if (!docId) {
      showAlert(translate('habitDocBind.enterDocId'));
      return;
    }
    if (!DOC_ID_PATTERN.test(docId)) {
      showAlert(translate('habitDocBind.invalidDocId'));
      return;
    }

    habit.noteDocId = docId;
    habits.value = [...habits.value];
    await options.saveHabitsNow(habits.value);
    closeBindDocModal();
  }

  async function clearBindDoc(): Promise<void> {
    const habit = getBindDocHabit();
    if (!habit) return;

    habit.noteDocId = '';
    habits.value = [...habits.value];
    await options.saveHabitsNow(habits.value);
    closeBindDocModal();
  }

  function handleHabitDocButton(habit: Habit): void {
    if (!habit.noteDocId) {
      openBindDocModal(habit);
      return;
    }
    openDocById(habit.noteDocId);
  }

  return {
    showBindDocModal,
    bindDocInput,
    openBindDocModal,
    closeBindDocModal,
    confirmBindDoc,
    clearBindDoc,
    handleHabitDocButton
  };
}
