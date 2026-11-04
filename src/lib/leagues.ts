/** League helpers: variant ids, the end mapping, date inputs and the "needs a league" rule. */
import type { Schemas } from './api/client';

export type AdminLeague = Schemas['AdminLeague'];

export interface VariantFlags {
  hardcore: boolean;
  ssf: boolean;
}

/** The official id pattern: `Dawn`, `HC Dawn`, `SSF Dawn`, `HC SSF Dawn`. */
export function variantId(name: string, v: VariantFlags): string {
  return [v.hardcore ? 'HC' : '', v.ssf ? 'SSF' : '', name].filter(Boolean).join(' ');
}

/** The ids a new family creates, in list order. */
export function createdIds(name: string, hardcore: boolean, ssf: boolean): string[] {
  const n = name.trim();
  if (!n) return [];
  const ids = [n];
  if (hardcore) ids.push(variantId(n, { hardcore: true, ssf: false }));
  if (ssf) ids.push(variantId(n, { hardcore: false, ssf: true }));
  if (hardcore && ssf) ids.push(variantId(n, { hardcore: true, ssf: true }));
  return ids;
}

/** Variant tag shown on a row. */
export function variantTag(v: VariantFlags): string | null {
  if (v.hardcore && v.ssf) return 'HC SSF';
  if (v.hardcore) return 'HC';
  if (v.ssf) return 'SSF';
  return null;
}

/** Groups the flat list into families (the base first), keeping the server's order. */
export function families(list: AdminLeague[]): { base: AdminLeague; rows: AdminLeague[] }[] {
  const order: string[] = [];
  const by = new Map<string, AdminLeague[]>();
  for (const l of list) {
    if (!by.has(l.family)) {
      by.set(l.family, []);
      order.push(l.family);
    }
    by.get(l.family)!.push(l);
  }
  const out: { base: AdminLeague; rows: AdminLeague[] }[] = [];
  for (const f of order) {
    const rows = by.get(f)!;
    rows.sort((a, b) => Number(a.hardcore || a.ssf) - Number(b.hardcore || b.ssf) || a.sort - b.sort);
    const base = rows.find((r) => r.id === f && !r.hardcore && !r.ssf) ?? rows.find((r) => !r.hardcore && !r.ssf) ?? rows[0]!;
    out.push({ base, rows });
  }
  return out;
}

/** The target row a variant moves to: same flags, HC SSF falls back to HC, everything falls back to the base. */
export function mapTarget(from: VariantFlags, rows: AdminLeague[]): AdminLeague | null {
  const find = (hardcore: boolean, ssf: boolean) => rows.find((r) => r.hardcore === hardcore && r.ssf === ssf);
  const base = find(false, false) ?? null;
  if (from.hardcore && from.ssf) return find(true, true) ?? find(true, false) ?? base;
  if (from.hardcore) return find(true, false) ?? base;
  if (from.ssf) return find(false, true) ?? base;
  return base;
}

export interface EndMove {
  from: AdminLeague;
  to: AdminLeague | null;
}

/** What ending `family` into `targetId`'s family does, per variant. */
export function endMapping(list: AdminLeague[], family: string, targetFamily: string): EndMove[] {
  const src = list.filter((l) => l.family === family);
  const dst = list.filter((l) => l.family === targetFamily);
  return src.map((from) => ({ from, to: mapTarget(from, dst) }));
}

export function endCharacterCount(moves: EndMove[]): number {
  return moves.reduce((n, m) => n + m.from.characters, 0);
}

/** Permanent, not-ended base leagues: the valid "ends into" targets (the family itself excluded). */
export function endTargets(list: AdminLeague[], family?: string): AdminLeague[] {
  return list.filter((l) => !l.hardcore && !l.ssf && l.permanent && l.state !== 'ended' && l.family !== family);
}

// --- dates: datetime-local inputs <-> unix seconds
const pad = (n: number) => String(n).padStart(2, '0');

/** `2026-11-10T18:00` (local time) to unix seconds; empty or invalid: null. */
export function inputToUnix(s: string): number | null {
  if (!s.trim()) return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

/** Unix seconds to a `datetime-local` value (local time); null: empty. */
export function unixToInput(n: number | null | undefined): string {
  if (n == null) return '';
  const d = new Date(n * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `2026-11-10 18:00` in local time. */
export function formatDate(n: number): string {
  return unixToInput(n).replace('T', ' ');
}

/** Ends must come after starts (either may be empty). */
export function datesError(starts: number | null, ends: number | null): string | null {
  return starts != null && ends != null && ends <= starts ? 'The end must be after the start.' : null;
}

// --- the "needs a league" popup
export const POPUP_KEY = 'poe2admin.league-popup-later';

/** Shown while the list is loaded, no league is active, and the admin did not say "Later" this session. */
export function needsLeaguePopup(list: AdminLeague[] | undefined, dismissed: boolean): boolean {
  return list !== undefined && !dismissed && !list.some((l) => l.state === 'active');
}

export function popupDismissed(storage: Pick<Storage, 'getItem'> | undefined = safeSession()): boolean {
  try {
    return storage?.getItem(POPUP_KEY) === '1';
  } catch {
    return false;
  }
}

function safeSession(): Storage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}
