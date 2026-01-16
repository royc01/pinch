import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import HabitTracker from '../HabitTracker.vue';
import { getHabits, saveHabits } from '@/api';

// 模拟API函数
vi.mock('@/api', () => ({
  getHabits: vi.fn(),
  saveHabits: vi.fn(),
}));

describe('HabitTracker', () => {
  beforeEach(() => {
    // 清除所有模拟调用
    vi.clearAllMocks();
  });

  it('should render correctly', async () => {
    // 模拟返回空的习惯列表
    (getHabits as vi.Mock).mockResolvedValue([]);

    const wrapper = await mount(HabitTracker);
    
    // 检查标题是否显示
    expect(wrapper.text()).toContain('习惯打卡');
    
    // 检查添加习惯按钮是否存在
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('should show empty state when no habits exist', async () => {
    (getHabits as vi.Mock).mockResolvedValue([]);

    const wrapper = await mount(HabitTracker);
    
    // 等待异步数据加载
    await wrapper.vm.$nextTick();
    
    expect(wrapper.text()).toContain('暂无习惯，点击上方按钮添加新习惯');
  });

  it('should display habits when they exist', async () => {
    const mockHabits = [
      {
        id: '1',
        name: '晨跑',
        frequency: 'daily',
        reminderTime: '07:00',
        completedToday: false,
        currentStreak: 3,
        totalCompletions: 5,
        calendar: [],
        createdAt: new Date().toISOString(),
      }
    ];
    
    (getHabits as vi.Mock).mockResolvedValue(mockHabits);

    const wrapper = await mount(HabitTracker);
    
    // 等待异步数据加载
    await wrapper.vm.$nextTick();
    
    // 检查习惯是否显示
    expect(wrapper.text()).toContain('晨跑');
    expect(wrapper.text()).toContain('连续打卡:3天');
    expect(wrapper.text()).toContain('总打卡:5次');
  });

  it('should add a new habit', async () => {
    (getHabits as vi.Mock).mockResolvedValue([]);
    (saveHabits as vi.Mock).mockResolvedValue(undefined);

    const wrapper = await mount(HabitTracker);
    
    // 等待组件加载
    await wrapper.vm.$nextTick();
    
    // 点击添加习惯按钮
    const addHabitButton = wrapper.find('button');
    await addHabitButton.trigger('click');
    
    // 检查模态框是否显示
    expect(wrapper.find('.modal-overlay').exists()).toBe(true);
    
    // 输入习惯名称
    const input = wrapper.find('input[type="text"]');
    await input.setValue('读书');
    
    // 点击添加按钮
    const modalButtons = wrapper.findAll('button');
    const addButton = modalButtons[modalButtons.length - 1]; // 最后一个按钮是添加按钮
    await addButton.trigger('click');
    
    // 等待异步操作完成
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    
    // 检查是否调用了saveHabits
    expect(saveHabits).toHaveBeenCalled();
  });

  it('should toggle habit completion', async () => {
    const mockHabits = [
      {
        id: '1',
        name: '喝水',
        frequency: 'daily',
        reminderTime: '08:00',
        completedToday: false,
        currentStreak: 0,
        totalCompletions: 0,
        calendar: [],
        createdAt: new Date().toISOString(),
      }
    ];
    
    (getHabits as vi.Mock).mockResolvedValue(mockHabits);
    (saveHabits as vi.Mock).mockResolvedValue(undefined);

    const wrapper = await mount(HabitTracker);
    
    // 等待异步数据加载
    await wrapper.vm.$nextTick();
    
    // 点击打卡按钮
    const checkInButton = wrapper.find('button');
    await checkInButton.trigger('click');
    
    // 检查是否调用了saveHabits
    expect(saveHabits).toHaveBeenCalled();
  });
});