import { describe, expect, it } from 'vitest';
import { moveTarget, roving, syncTabStops } from './roving';

function group(checked: number, n = 3): HTMLElement {
  const g = document.createElement('div');
  g.setAttribute('role', 'radiogroup');
  for (let i = 0; i < n; i++) {
    const b = document.createElement('button');
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(i === checked));
    b.textContent = String(i);
    g.appendChild(b);
  }
  document.body.appendChild(g);
  return g;
}

describe('roving', () => {
  it('leaves one tab stop, on the chosen item', () => {
    const g = group(1);
    syncTabStops(g);
    expect([...g.children].map((b) => (b as HTMLElement).tabIndex)).toEqual([-1, 0, -1]);
  });

  it('moves with arrows, wraps, and knows Home and End', () => {
    const items = [...group(0).children] as HTMLElement[];
    expect(moveTarget(items, items[0]!, 'ArrowRight')).toBe(items[1]);
    expect(moveTarget(items, items[0]!, 'ArrowLeft')).toBe(items[2]);
    expect(moveTarget(items, items[1]!, 'End')).toBe(items[2]);
    expect(moveTarget(items, items[2]!, 'Home')).toBe(items[0]);
    expect(moveTarget(items, items[0]!, 'a')).toBeNull();
  });

  it('skips disabled items', () => {
    const items = [...group(0).children] as HTMLButtonElement[];
    items[1]!.disabled = true;
    expect(moveTarget(items, items[0]!, 'ArrowRight')).toBe(items[2]);
  });

  it('clicks the next item on an arrow key', () => {
    const g = group(0);
    const items = [...g.children] as HTMLElement[];
    let clicked = -1;
    items.forEach((b, i) => b.addEventListener('click', () => (clicked = i)));
    const r = roving(g);
    items[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(clicked).toBe(1);
    expect(document.activeElement).toBe(items[1]);
    r.destroy();
  });
});
