import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toasts } from './notify.svelte';

describe('toasts', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('go after their time, and a hold keeps the time left', () => {
    toasts.show('ok', 'saved');
    vi.advanceTimersByTime(3000);
    toasts.hold(true);
    vi.advanceTimersByTime(10_000);
    expect(toasts.items.map((t) => t.text)).toEqual(['saved']);
    toasts.hold(false);
    vi.advanceTimersByTime(900);
    expect(toasts.items).toHaveLength(1);
    vi.advanceTimersByTime(200);
    expect(toasts.items).toHaveLength(0);
  });
});
