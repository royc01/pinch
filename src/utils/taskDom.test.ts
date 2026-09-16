import { describe, expect, it } from 'vitest';
import {
  parseTaskCompletedFromElement,
  parseTaskMarkerFromElement,
  parseTaskStatusFromElement
} from './taskDom';

describe('native Siyuan task markers', () => {
  it('reads in-progress and abandoned markers from data-task', () => {
    const list = document.createElement('div');
    list.innerHTML = `
      <div data-type="NodeListItem" data-node-id="doing" data-task="/"></div>
      <div data-type="NodeListItem" data-node-id="abandoned" data-task="-"></div>
      <div data-type="NodeListItem" data-node-id="done" data-task="X"></div>
    `;

    const doing = list.querySelector('[data-node-id="doing"]');
    const abandoned = list.querySelector('[data-node-id="abandoned"]');
    const done = list.querySelector('[data-node-id="done"]');
    expect(parseTaskMarkerFromElement(doing)).toBe('/');
    expect(parseTaskStatusFromElement(doing)).toBe('in-progress');
    expect(parseTaskCompletedFromElement(doing)).toBe(false);
    expect(parseTaskStatusFromElement(abandoned)).toBe('cancelled');
    expect(parseTaskCompletedFromElement(abandoned)).toBe(false);
    expect(parseTaskStatusFromElement(done)).toBe('completed');
    expect(parseTaskCompletedFromElement(done)).toBe(true);
  });
});
