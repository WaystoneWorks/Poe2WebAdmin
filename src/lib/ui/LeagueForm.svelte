<script lang="ts">
  import { roving } from '../roving';
  import { api, unwrap, type LeagueFlagView, type MechanicView } from '../api/client';
  import { run } from '../notify.svelte';
  import {
    type AdminLeague,
    createdIds,
    datesError,
    endTargets,
    inputToUnix,
    unixToInput,
    variantTag,
  } from '../leagues';
  import Modal from './Modal.svelte';
  import Icon from './Icon.svelte';

  // New league (family === null) and edit (the family's rows, base first).
  let {
    open = $bindable(false),
    family = null,
    all,
    flags,
    mechanics,
    done,
  }: {
    open?: boolean;
    family?: AdminLeague[] | null;
    all: AdminLeague[];
    flags: LeagueFlagView[];
    mechanics: MechanicView[];
    done: () => void;
  } = $props();

  const bannerOf = (f: LeagueFlagView) => f.art.creation_url ?? f.art.banner_url ?? f.art.icon_url ?? f.art.logo_url ?? null;
  const baseFlags = $derived(flags.filter((f) => !f.hardcore && !f.ssf));

  let name = $state('');
  let names = $state<Record<string, string>>({});
  let flag = $state<string | null>(null);
  // Banners whose image did not load show their id instead of an empty tile.
  let broken = $state<Record<string, true>>({});
  let loaded = $state<Record<string, true>>({});
  let hardcore = $state(true);
  let ssf = $state(true);
  let permanent = $state(false);
  let isDefault = $state(false);
  let starts = $state('');
  let ends = $state('');
  let migrate = $state('');
  let hcDeath = $state('softcore');
  let picked = $state<string[]>([]);
  let busy = $state(false);

  // Fill the form each time the dialog opens.
  $effect(() => {
    if (!open) return;
    const base = family?.[0];
    name = '';
    names = Object.fromEntries((family ?? []).map((r) => [r.id, r.display_name]));
    flag = base?.flag ?? null;
    hardcore = true;
    ssf = true;
    permanent = base?.permanent ?? false;
    isDefault = base?.is_default ?? false;
    starts = unixToInput(base?.starts_at);
    ends = unixToInput(base?.ends_at);
    migrate = base?.migrate_to ?? '';
    hcDeath = base?.hc_death ?? 'softcore';
    picked = [...(base?.mechanics ?? [])];
  });

  const targets = $derived(endTargets(all, family?.[0]?.family));
  const startUnix = $derived(inputToUnix(starts));
  const endUnix = $derived(inputToUnix(ends));
  const dateProblem = $derived(datesError(startUnix, endUnix));
  const creates = $derived(createdIds(name, hardcore, ssf));
  const bad = $derived((family ? false : name.trim() === '') || dateProblem !== null);

  function toggle(id: string) {
    picked = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (bad) return;
    busy = true;
    const ok = await run(
      async () => {
        if (!family) {
          await unwrap(
            api.POST('/api/v1/admin/leagues', {
              body: {
                name: name.trim(),
                hardcore,
                ssf,
                permanent,
                default: isDefault,
                flag,
                mechanics: picked,
                starts_at: startUnix,
                ends_at: endUnix,
                migrate_to: migrate || null,
                hc_death: hcDeath,
              },
            }),
          );
          return;
        }
        const base = family[0]!;
        await unwrap(
          api.POST('/api/v1/admin/leagues/{id}', {
            params: { path: { id: base.id } },
            body: {
              display_name: names[base.id]?.trim() || base.display_name,
              flag,
              mechanics: picked,
              permanent,
              default: isDefault,
              starts_at: startUnix,
              ends_at: endUnix,
              migrate_to: migrate || null,
              hc_death: hcDeath,
            },
          }),
        );
        for (const r of family.slice(1)) {
          const n = names[r.id]?.trim();
          if (n && n !== r.display_name) {
            await unwrap(api.POST('/api/v1/admin/leagues/{id}', { params: { path: { id: r.id } }, body: { display_name: n } }));
          }
        }
      },
      family ? 'League saved' : 'League created',
    );
    busy = false;
    if (ok) {
      open = false;
      done();
    }
  }
</script>

<Modal bind:open wide title={family ? `Edit ${family[0]?.id ?? ''}` : 'New league'} icon="trophy">
  <form onsubmit={submit} class="league-form">
    {#if family}
      {#each family as r (r.id)}
        <label class="field">
          <span>Display name{variantTag(r) ? ` (${variantTag(r)})` : ''}</span>
          <input bind:value={names[r.id]} maxlength="64" required />
        </label>
      {/each}
    {:else}
      <label class="field">
        <span>Name</span>
        <input bind:value={name} maxlength="64" placeholder="Dawn" required />
      </label>
    {/if}

    <div class="field">
      <span id="banner-lbl">Banner</span>
      {#if baseFlags.length === 0}
        <p class="hint">No league art found: the server has no game data loaded.</p>
      {:else}
        <div class="banners" role="radiogroup" use:roving aria-labelledby="banner-lbl">
          {#each baseFlags as f (f.id)}
            {@const url = bannerOf(f)}
            <button type="button" role="radio" aria-checked={flag === f.id} class="banner" class:on={flag === f.id} title={f.id} onclick={() => (flag = f.id)}>
              {#if url && !broken[f.id]}
                <img src={url} alt={f.id} loading="lazy" class:ready={loaded[f.id]} onload={() => (loaded[f.id] = true)} onerror={() => (broken[f.id] = true)} />
                {#if !loaded[f.id]}<span class="muted banner-name loading-name">{f.id}</span>{/if}
              {:else}<span class="muted banner-name">{f.id}</span>{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    {#if !family}
      <div class="checks">
        <label class="check"><input type="checkbox" bind:checked={hardcore} /> <span>Hardcore variant</span></label>
        <label class="check"><input type="checkbox" bind:checked={ssf} /> <span>SSF variants</span></label>
      </div>
    {/if}
    <div class="checks">
      <label class="check"><input type="checkbox" bind:checked={permanent} /> <span>Permanent</span></label>
      <label class="check"><input type="checkbox" bind:checked={isDefault} /> <span>Default</span></label>
    </div>

    <div class="grid2">
      <label class="field">
        <span>Starts (empty = now)</span>
        <input type="datetime-local" bind:value={starts} />
      </label>
      <label class="field">
        <span>Ends (empty = never)</span>
        <input type="datetime-local" bind:value={ends} aria-invalid={dateProblem !== null} />
      </label>
    </div>
    {#if dateProblem}<p class="err" role="alert">{dateProblem}</p>{/if}

    <label class="field">
      <span>Ends into (where characters move when it ends)</span>
      <select bind:value={migrate}>
        <option value="">Choose when ending</option>
        {#each targets as t (t.id)}<option value={t.id}>{t.display_name}</option>{/each}
      </select>
    </label>

    {#if family ? family.some((r) => r.hardcore) : hardcore}
      <label class="field">
        <span>When a hardcore character dies <span class="tag-soon">stored, used once death exists</span></span>
        <select bind:value={hcDeath}>
          <option value="softcore">Move to the softcore league</option>
          <option value="stay">Stay in the hardcore league</option>
        </select>
      </label>
    {/if}

    <div class="field">
      <span id="mech-lbl">Mechanics <span class="tag-soon">stored, not implemented yet</span></span>
      <div class="mechs" role="group" aria-labelledby="mech-lbl">
        {#each mechanics as m (m.id)}
          <label class="check"><input type="checkbox" checked={picked.includes(m.id)} onchange={() => toggle(m.id)} /> <span>{m.name}</span></label>
        {/each}
        {#if mechanics.length === 0}<span class="muted">No mechanics in the game data.</span>{/if}
      </div>
    </div>

    {#if !family}
      <p class="hint" aria-live="polite">Creates: <b>{creates.length ? creates.join(', ') : '—'}</b></p>
    {/if}

    <div class="actions">
      <button type="button" class="btn" onclick={() => (open = false)}>Cancel</button>
      <button type="submit" class="btn primary" disabled={busy || bad}><Icon name="save" size={15} /> {family ? 'Save league' : 'Create league'}</button>
    </div>
  </form>
</Modal>

<style>
  .league-form { min-width: 0; }
  .banner-name { font-size: 11px; overflow-wrap: anywhere; padding: 4px; }
  .banner img:not(.ready) { position: absolute; opacity: 0; }
  .loading-name { opacity: 0.6; }
  .banners { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(96px, 100%), 1fr)); gap: 8px; max-height: 190px; overflow-y: auto; padding: 2px; }
  .banner { position: relative; cursor: pointer; display: grid; place-items: center; min-height: 52px; padding: 4px; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius); }
  .banner:hover { border-color: var(--faint); }
  .banner.on { border-color: var(--gold); background: var(--selected-bg); }
  .banner img { max-width: 100%; max-height: 64px; object-fit: contain; }
  .checks { display: flex; flex-wrap: wrap; gap: 8px 22px; margin-bottom: 14px; }
  .mechs { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(150px, 100%), 1fr)); gap: 6px 14px; max-height: 150px; overflow-y: auto; }
  .tag-soon { margin-left: 6px; font-size: 11px; color: var(--warn); font-weight: 600; }
  .err { color: var(--danger); font-size: 12.5px; margin: 0 0 10px; }
</style>
