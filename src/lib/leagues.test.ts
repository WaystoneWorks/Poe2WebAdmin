import { describe, expect, it } from 'vitest';
import {
  type AdminLeague,
  createdIds,
  datesError,
  endCharacterCount,
  endMapping,
  endTargets,
  families,
  inputToUnix,
  needsLeaguePopup,
  popupDismissed,
  unixToInput,
  variantId,
  variantTag,
} from './leagues';

function lg(id: string, family: string, hardcore: boolean, ssf: boolean, o: Partial<AdminLeague> = {}): AdminLeague {
  return {
    id, display_name: id, family, hardcore, ssf, permanent: false, is_default: false, state: 'active',
    characters: 0, mechanics: [], sort: 0, created_at: 0, art: {}, ...o,
  };
}
const dawn = [lg('Dawn', 'Dawn', false, false, { characters: 5 }), lg('HC Dawn', 'Dawn', true, false, { characters: 2 }), lg('SSF Dawn', 'Dawn', false, true, { characters: 1 }), lg('HC SSF Dawn', 'Dawn', true, true, { characters: 3 })];
const std = [lg('Standard', 'Standard', false, false, { permanent: true }), lg('Hardcore', 'Standard', true, false, { permanent: true }), lg('Solo Self-Found', 'Standard', false, true, { permanent: true })];

describe('variant ids', () => {
  it('follows the official pattern', () => {
    expect(variantId('Dawn', { hardcore: false, ssf: false })).toBe('Dawn');
    expect(variantId('Dawn', { hardcore: true, ssf: false })).toBe('HC Dawn');
    expect(variantId('Dawn', { hardcore: false, ssf: true })).toBe('SSF Dawn');
    expect(variantId('Dawn', { hardcore: true, ssf: true })).toBe('HC SSF Dawn');
  });
  it('lists what a new family creates', () => {
    expect(createdIds(' Dawn ', true, true)).toEqual(['Dawn', 'HC Dawn', 'SSF Dawn', 'HC SSF Dawn']);
    expect(createdIds('Dawn', false, true)).toEqual(['Dawn', 'SSF Dawn']);
    expect(createdIds('Dawn', true, false)).toEqual(['Dawn', 'HC Dawn']);
    expect(createdIds('', true, true)).toEqual([]);
  });
  it('tags variants', () => {
    expect(variantTag({ hardcore: true, ssf: true })).toBe('HC SSF');
    expect(variantTag({ hardcore: false, ssf: false })).toBeNull();
  });
  it('groups families with the base first', () => {
    const f = families([dawn[1]!, dawn[0]!, ...std]);
    expect(f.map((x) => x.base.id)).toEqual(['Dawn', 'Standard']);
    expect(f[0]!.rows[0]!.id).toBe('Dawn');
  });
});

describe('end mapping', () => {
  it('maps each variant to the matching one, falling back', () => {
    const m = endMapping([...dawn, ...std], 'Dawn', 'Standard');
    expect(m.map((x) => [x.from.id, x.to?.id])).toEqual([
      ['Dawn', 'Standard'],
      ['HC Dawn', 'Hardcore'],
      ['SSF Dawn', 'Solo Self-Found'],
      ['HC SSF Dawn', 'Hardcore'],
    ]);
    expect(endCharacterCount(m)).toBe(11);
  });
  it('falls back to the base without variants', () => {
    const m = endMapping([...dawn, lg('Plain', 'Plain', false, false, { permanent: true })], 'Dawn', 'Plain');
    expect(m.every((x) => x.to?.id === 'Plain')).toBe(true);
  });
  it('offers only permanent, not-ended base leagues', () => {
    const list = [...dawn, ...std, lg('Old', 'Old', false, false, { permanent: true, state: 'ended' })];
    expect(endTargets(list, 'Dawn').map((l) => l.id)).toEqual(['Standard']);
  });
});

describe('dates', () => {
  it('converts to unix seconds and back', () => {
    expect(inputToUnix('')).toBeNull();
    expect(inputToUnix('nonsense')).toBeNull();
    const n = inputToUnix('2026-11-10T18:00')!;
    expect(unixToInput(n)).toBe('2026-11-10T18:00');
    expect(unixToInput(null)).toBe('');
    expect(n).toBe(Math.floor(new Date(2026, 10, 10, 18, 0).getTime() / 1000));
  });
  it('rejects an end before the start', () => {
    expect(datesError(100, 50)).not.toBeNull();
    expect(datesError(100, 200)).toBeNull();
    expect(datesError(null, 5)).toBeNull();
  });
});

describe('needs-a-league popup', () => {
  it('shows only with a loaded list without an active league', () => {
    expect(needsLeaguePopup(undefined, false)).toBe(false);
    expect(needsLeaguePopup([], false)).toBe(true);
    expect(needsLeaguePopup([lg('A', 'A', false, false, { state: 'hidden' })], false)).toBe(true);
    expect(needsLeaguePopup(dawn, false)).toBe(false);
  });
  it('stays hidden after Later', () => {
    expect(needsLeaguePopup([], true)).toBe(false);
    expect(popupDismissed({ getItem: () => '1' })).toBe(true);
    expect(popupDismissed({ getItem: () => null })).toBe(false);
  });
});
