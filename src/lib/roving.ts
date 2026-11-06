/**
 * Keyboard use of a radio group or tab list (`role="radiogroup"` / `role="tablist"`): one Tab stop
 * (the chosen item), the arrow keys, Home and End move to the next item and choose it (a click),
 * as WAI-ARIA describes for radios and automatic tabs. Use it as `<div role="radiogroup" use:roving>`.
 */
const ITEM = '[role="radio"], [role="tab"]';

function chosen(el: Element): boolean {
  return el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true';
}

/** Gives the chosen item (else the first) tabindex 0 and the others -1. */
export function syncTabStops(group: HTMLElement): void {
  const items = [...group.querySelectorAll<HTMLElement>(ITEM)];
  const current = items.find(chosen) ?? items[0];
  for (const it of items) it.tabIndex = it === current ? 0 : -1;
}

/** The item a key moves to from `from`, or null when the key is not a move key. */
export function moveTarget(items: readonly HTMLElement[], from: HTMLElement, key: string): HTMLElement | null {
  const usable = items.filter((it) => !(it as HTMLButtonElement).disabled);
  const i = usable.indexOf(from);
  if (usable.length === 0 || i < 0) return null;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return usable[(i + 1) % usable.length]!;
    case 'ArrowLeft':
    case 'ArrowUp':
      return usable[(i - 1 + usable.length) % usable.length]!;
    case 'Home':
      return usable[0]!;
    case 'End':
      return usable[usable.length - 1]!;
    default:
      return null;
  }
}

export function roving(group: HTMLElement) {
  const onKey = (e: KeyboardEvent) => {
    const from = (e.target as HTMLElement).closest<HTMLElement>(ITEM);
    if (!from || !group.contains(from)) return;
    const next = moveTarget([...group.querySelectorAll<HTMLElement>(ITEM)], from, e.key);
    if (!next) return;
    e.preventDefault();
    next.focus();
    next.click();
  };
  group.addEventListener('keydown', onKey);
  syncTabStops(group);
  const watch = new MutationObserver(() => syncTabStops(group));
  watch.observe(group, { subtree: true, childList: true, attributeFilter: ['aria-checked', 'aria-selected'] });
  return {
    destroy() {
      group.removeEventListener('keydown', onKey);
      watch.disconnect();
    },
  };
}
