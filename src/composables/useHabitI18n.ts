const DEFAULT_HABIT_LANG: Record<string, string> = {
  'habitTracker.title': '习惯打卡',
  'habitTracker.addHabit': '添加习惯',
  'habitTracker.habitName': '习惯名称',
  'habitTracker.habitNamePlaceholder': '例如：晨跑、读书、喝水',
  'habitTracker.frequency': '打卡周期',
  'habitTracker.customFrequency': '每周天数',
  'habitTracker.customFrequencyPlaceholder': '输入每周要打卡的天数',
  'habitTracker.timesPerDay': '每天频率',
  'habitTracker.timesPerDayPlaceholder': '输入每天要完成的次数',
  'habitTracker.reminderTime': '提醒时间',
  'habitTracker.daily': '每天',
  'habitTracker.weekly': '每周6天',
  'habitTracker.custom': '自定义',
  'habitTracker.checkIn': '打卡',
  'habitTracker.checkedIn': '已打卡',
  'habitTracker.delete': '删除',
  'habitTracker.currentStreak': '连续天数',
  'habitTracker.totalCompletions': '本月打卡',
  'habitTracker.completionRate': '本月完成率',
  'habitTracker.days': '天',
  'habitTracker.times': '次',
  'habitTracker.noHabits': '暂无习惯，点击上方按钮添加新习惯',
  'habitTracker.bindNoteDoc': '绑定备注文档',
  'habitTracker.openNoteDoc': '打开备注文档（右键重新绑定）',
  'habitTracker.confirmDelete': '确定要删除这个习惯吗？',
  'habitTracker.weekView': '周视图',
  'habitTracker.monthView': '月视图',
  Cancel: '取消',
  OK: '确定'
};

export const useHabitI18n = () => {
  const t = (key: string) => {
    const lang = window.siyuan?.languages || {};
    return lang[key] || DEFAULT_HABIT_LANG[key] || key;
  };

  return { t };
};
