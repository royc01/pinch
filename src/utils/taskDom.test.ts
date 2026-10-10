import { describe, expect, it } from 'vitest';
import {
  getLiveTaskElement,
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

  it('limits live task lookup to the preferred editor root', () => {
    const staleRoot = document.createElement('div');
    staleRoot.className = 'protyle';
    staleRoot.innerHTML = '<div data-node-id="task-1">Old title</div>';
    document.body.appendChild(staleRoot);

    const editorRoot = document.createElement('div');
    editorRoot.innerHTML = '<div class="protyle"><div data-node-id="task-1">New title</div></div>';

    expect(getLiveTaskElement('task-1', editorRoot)?.textContent).toBe('New title');
    staleRoot.remove();
  });

  it('finds native paragraph checkboxes without inheriting a nested task marker', () => {
    const root = document.createElement('div');
    root.innerHTML = `<div data-type="NodeListItem" data-node-id="parent">
      <div data-type="NodeParagraph" data-node-id="paragraph"><div class="protyle-action--task"><svg><use href="#iconUncheck"></use></svg></div></div>
      <div data-type="NodeListItem" data-node-id="child"><div class="protyle-action--task"><svg><use href="#iconCheck"></use></svg></div></div>
    </div>`;
    const parent = root.firstElementChild!;
    expect(parseTaskCompletedFromElement(parent, 'parent')).toBe(false);
    expect(parseTaskCompletedFromElement(root.querySelector('[data-node-id="child"]'), 'child')).toBe(true);
    parent.querySelector('[data-node-id="paragraph"]')!.remove();
    expect(parseTaskCompletedFromElement(parent, 'parent')).toBeNull();
  });
});
