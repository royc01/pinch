const DEFAULT_HABIT_LANG: Record<string, string> = {
  'habitTracker.title': 'Habit Tracker',
  'habitTracker.addHabit': 'Add Habit',
  'habitTracker.habitName': 'Habit Name',
  'habitTracker.habitNamePlaceholder': 'e.g., Morning Run, Reading, Drinking Water',
  'habitTracker.frequency': 'Target Frequency',
  'habitTracker.customFrequency': 'Weekly Days',
  'habitTracker.customFrequencyPlaceholder': 'Enter days per week',
  'habitTracker.timesPerDay': 'Daily Frequency',
  'habitTracker.timesPerDayPlaceholder': 'Enter times per day',
  'habitTracker.reminderTime': 'Reminder Time',
  'habitTracker.daily': 'Daily',
  'habitTracker.weekly': 'Weekly',
  'habitTracker.custom': 'Custom',
  'habitTracker.checkIn': 'Check In',
  'habitTracker.checkedIn': 'Checked In',
  'habitTracker.delete': 'Delete',
  'habitTracker.currentStreak': 'Current Streak',
  'habitTracker.totalCompletions': 'Monthly Completions',
  'habitTracker.completionRate': 'Monthly Rate',
  'habitTracker.days': 'days',
  'habitTracker.times': 'times',
  'habitTracker.noHabits': 'No habits yet, click the button above to add a new habit',
  'habitTracker.bindNoteDoc': 'Bind Note Document',
  'habitTracker.openNoteDoc': 'Open Note Document (Right-click to rebind)',
  'habitTracker.confirmDelete': 'Are you sure you want to delete this habit?',
  'habitTracker.habitNameRequired': 'Please enter habit name',
  'habitTracker.maxDailyFrequencyLimit': 'Daily frequency cannot exceed 20',
  'habitTracker.weekView': 'Week View',
  'habitTracker.monthView': 'Month View',
  Cancel: 'Cancel',
  OK: 'OK'
};

export const useHabitI18n = () => {
  const t = (key: string, vars?: Record<string, any>) => {
    const lang = window.siyuan?.languages || {};
    let text = lang[key] || DEFAULT_HABIT_LANG[key] || key;
    if (vars) {
      Object.keys(vars).forEach((v) => {
        text = text.replace(new RegExp(`\\{${v}\\}`, 'g'), vars[v]);
      });
    }
    return text;
  };

  return { t };
};
