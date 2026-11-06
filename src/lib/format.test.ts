import { describe, expect, it } from 'vitest';
import { formatAge, formatClock, formatUnix, formatUptime, intOrNull } from './format';

describe('format', () => {
  it('formats uptime compactly', () => {
    expect(formatUptime(5)).toBe('5s');
    expect(formatUptime(125)).toBe('2m 5s');
    expect(formatUptime(3 * 3600 + 60)).toBe('3h 1m');
    expect(formatUptime(90_000)).toBe('1d 1h 0m');
  });
  it('formats an age from a timestamp', () => {
    expect(formatAge(1_000_000, 1_065_000)).toBe('1m 5s');
    expect(formatAge(2_000_000, 1_000_000)).toBe('0s');
  });
  it('parses optional integers', () => {
    expect(intOrNull('')).toBeNull();
    expect(intOrNull('  ')).toBeNull();
    expect(intOrNull('12')).toBe(12);
    expect(intOrNull('-1')).toBeNaN();
    expect(intOrNull('1.5')).toBeNaN();
    expect(intOrNull('x')).toBeNaN();
  });
});

describe('dates', () => {
  it('writes one 24 h style', () => {
    const secs = new Date(2026, 10, 5, 8, 4, 9).getTime() / 1000;
    expect(formatUnix(secs)).toBe('2026-11-05 08:04');
    expect(formatUnix(null)).toBe('—');
    expect(formatClock(new Date(2026, 10, 5, 20, 4, 9))).toBe('20:04:09');
  });
});
