import { computed, inject, toRaw, type ComputedRef, type InjectionKey } from 'vue';
import type { Task } from '@/api';
import { getCalendarTaskRenderDateValues } from './calendarTaskDates';

/** Date parsing depends only on scheduling fields, not title or completion. */
export function createCalendarTaskDateCache() {
  const cache = new WeakMap<Task, ComputedRef<{ start: Date; end: Date } | null>>();
  const parsedDates = new Map<string, { start: Date; end: Date } | null>();
  return (task: Task) => {
    let entry = cache.get(task);
    if (!entry) {
      entry = computed(() => {
        const values = getCalendarTaskRenderDateValues(task);
        if (!values) return null;
        const key = `${values.startDate}|${values.dueDate}`;
        if (parsedDates.has(key)) return parsedDates.get(key)!;
        const start = new Date(values.startDate);
        const end = new Date(values.dueDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        const result = Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) ? { start, end } : null;
        parsedDates.set(key, result);
        if (parsedDates.size > 10000) parsedDates.delete(parsedDates.keys().next().value!);
        return result;
      });
      cache.set(task, entry);
    }
    return entry.value;
  };
}

export const calendarTaskDateCacheKey: InjectionKey<ReturnType<typeof createCalendarTaskDateCache>> = Symbol('calendar-task-dates');
export function useCalendarTaskDateCache() {
  return inject(calendarTaskDateCacheKey, null) || createCalendarTaskDateCache();
}

/** An unchanged task keeps its normalized range when a different task moves. */
export function createCalendarTaskProjection<T>(project: (task: Task) => T) {
  const cache = new WeakMap<Task, ComputedRef<T>>();
  return (task: Task): T => {
    let entry = cache.get(task);
    if (!entry) {
      entry = computed(() => project(task));
      cache.set(task, entry);
    }
    return entry.value;
  };
}

/** Reuse live layout records in unchanged weeks; bound navigation history per task. */
export function createCalendarTaskLayoutCache<T extends object>() {
  const cache = new WeakMap<Task, Map<string, { fields: T; record: Task & T }>>();
  return (task: Task, slot: string, fields: T): Task & T => {
    let slots = cache.get(task);
    if (!slots) { slots = new Map(); cache.set(task, slots); }
    const previous = slots.get(slot);
    const keys = Object.keys(fields) as Array<keyof T>;
    if (previous && keys.length === Object.keys(previous.fields).length && keys.every(key => {
      const left = fields[key], right = previous.fields[key];
      return left === right || (left instanceof Date && right instanceof Date && left.getTime() === right.getTime());
    })) return previous.record;
    const record = withCalendarTaskLayout(task, fields);
    slots.set(slot, { fields, record });
    if (slots.size > 6) slots.delete(slots.keys().next().value!);
    return record;
  };
}

/** Keep layout records linked to their live task without tracking all its fields. */
export function withCalendarTaskLayout<T extends object>(task: Task, layout: T): Task & T {
  return new Proxy({ ...layout } as Task & T, {
    get(target, key, receiver) {
      // Vue's internal identity markers belong to this layout, not its task.
      if (Reflect.has(target, key) || (typeof key === 'string' && key.startsWith('__v_'))) {
        return Reflect.get(target, key, receiver);
      }
      return Reflect.get(task, key);
    },
    set(target, key, value, receiver) {
      return Reflect.has(target, key) ? Reflect.set(target, key, value, receiver) : Reflect.set(task, key, value);
    },
    ownKeys(target) { return [...new Set([...Reflect.ownKeys(toRaw(task)), ...Reflect.ownKeys(target)])]; },
    getOwnPropertyDescriptor(target, key) {
      return Reflect.getOwnPropertyDescriptor(target, key) || (Reflect.has(task, key)
        ? { enumerable: true, configurable: true, get: () => Reflect.get(task, key) } : undefined);
    }
  });
}
