export function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `2026-11-10 18:00` in local time: the one date style of the admin site. Em dash when unset. */
export function formatUnix(secs: number | null | undefined): string {
  if (!secs) return '—';
  const d = new Date(secs * 1000);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** `18:04:09` in local time, 24 h. */
export function formatClock(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function formatAge(ms: number, now = Date.now()): string {
  return formatUptime(Math.max(0, Math.floor((now - ms) / 1000)));
}

/** "" -> undefined, otherwise the integer; NaN and negatives are rejected by `intOrNull`. */
export function intOrNull(s: string | number | null | undefined): number | null {
  if (s === null || s === undefined || String(s).trim() === '') return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : Number.NaN;
}
