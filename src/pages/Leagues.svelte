<script lang="ts">
  import { api, unwrap, type LeagueFlagView, type MechanicView } from '../lib/api/client';
  import { Resource } from '../lib/resource.svelte';
  import { run } from '../lib/notify.svelte';
  import { router } from '../lib/router.svelte';
  import { leagueStore } from '../lib/leagueStore.svelte';
  import { type AdminLeague, endCharacterCount, endMapping, endTargets, families, formatDate, variantTag } from '../lib/leagues';
  import PageHead from '../lib/ui/PageHead.svelte';
  import Status from '../lib/ui/Status.svelte';
  import Modal from '../lib/ui/Modal.svelte';
  import Icon from '../lib/ui/Icon.svelte';
  import Chip from '../lib/ui/Chip.svelte';
  import Empty from '../lib/ui/Empty.svelte';
  import Spinner from '../lib/ui/Spinner.svelte';
  import LeagueForm from '../lib/ui/LeagueForm.svelte';

  const res = new Resource(async () => {
    const list = await unwrap(api.GET('/api/v1/admin/leagues'));
    leagueStore.list = list;
    return list;
  });
  $effect(() => res.start(15000));

  // Game data for the pickers; without game data they are empty and the dialogs say so.
  let flags = $state<LeagueFlagView[]>([]);
  let mechanics = $state<MechanicView[]>([]);
  $effect(() => {
    void unwrap(api.GET('/api/v1/admin/data/league-flags')).then((v) => (flags = v)).catch(() => {});
    void unwrap(api.GET('/api/v1/admin/data/league-mechanics')).then((v) => (mechanics = v)).catch(() => {});
  });

  const list = $derived(res.data ?? []);
  const fams = $derived(families(list));
  const mechName = (id: string) => mechanics.find((m) => m.id === id)?.name ?? id;

  // --- new and edit
  let formOpen = $state(false);
  let editing = $state<AdminLeague[] | null>(null);
  function openNew() {
    editing = null;
    formOpen = true;
  }
  function openEdit(rows: AdminLeague[]) {
    editing = rows;
    formOpen = true;
  }
  // `#/leagues?new=1` (the "needs a league" popup) opens the New league dialog.
  $effect(() => {
    if (router.route.query.get('new')) {
      openNew();
      history.replaceState(null, '', '#/leagues');
      router.sync();
    }
  });
  function changed() {
    void res.load();
  }

  async function toggleHidden(l: AdminLeague) {
    const next = l.state === 'hidden' ? 'active' : 'hidden';
    if (await run(() => unwrap(api.POST('/api/v1/admin/leagues/{id}', { params: { path: { id: l.id } }, body: { state: next } })), next === 'hidden' ? `${l.display_name} hidden` : `${l.display_name} shown`)) {
      changed();
    }
  }

  // --- end
  let endOpen = $state(false);
  let endFam = $state<AdminLeague | null>(null);
  let endTarget = $state('');
  let endTyped = $state('');
  let busy = $state(false);
  const endOptions = $derived(endFam ? endTargets(list, endFam.family) : []);
  const moves = $derived(endFam && endTarget ? endMapping(list, endFam.family, endTarget) : []);
  const moveCount = $derived(endCharacterCount(moves));
  function openEnd(base: AdminLeague) {
    endFam = base;
    endTarget = base.migrate_to && endTargets(list, base.family).some((t) => t.family === base.migrate_to) ? base.migrate_to : (endTargets(list, base.family)[0]?.family ?? '');
    endTyped = '';
    endOpen = true;
  }
  async function submitEnd(e: SubmitEvent) {
    e.preventDefault();
    if (!endFam || !endTarget || endTyped !== endFam.display_name) return;
    busy = true;
    const f = endFam;
    const ok = await run(() => unwrap(api.POST('/api/v1/admin/leagues/{id}/end', { params: { path: { id: f.id } }, body: { target: endTarget } })), (r) => `${f.display_name} ended, ${r.count} character${r.count === 1 ? '' : 's'} moved`);
    busy = false;
    if (ok) {
      endOpen = false;
      changed();
    }
  }

  // --- delete
  let delOpen = $state(false);
  let delRow = $state<AdminLeague | null>(null);
  let delTyped = $state('');
  function openDelete(l: AdminLeague) {
    delRow = l;
    delTyped = '';
    delOpen = true;
  }
  const delCount = $derived(delRow ? (delRow.id !== delRow.family ? delRow.characters : list.filter((x) => x.family === delRow!.family).reduce((n, x) => n + x.characters, 0)) : 0);
  async function submitDelete(e: SubmitEvent) {
    e.preventDefault();
    if (!delRow || delCount > 0 || delTyped !== delRow.id) return;
    busy = true;
    const d = delRow;
    const ok = await run(() => unwrap(api.POST('/api/v1/admin/leagues/{id}/delete', { params: { path: { id: d.id } }, body: { confirm: d.id } })), (r) => `Deleted ${r.deleted.join(', ')}`);
    busy = false;
    if (ok) {
      delOpen = false;
      changed();
    }
  }
</script>

<PageHead title="Leagues" subtitle="Leagues players can create characters in" icon="trophy">
  <Status {res} />
  <button type="button" class="btn sm icon ghost" onclick={() => res.load()} disabled={res.loading} aria-label="Refresh" title="Refresh"><Icon name="refresh" size={14} /></button>
  <button type="button" class="btn primary" onclick={openNew}><Icon name="plus" size={14} /> New league</button>
</PageHead>

{#if res.data}
  {#if fams.length === 0}
    <Empty icon="trophy" title="No leagues">
      This server has no league. Players can log in but cannot create characters.
      {#snippet action()}<button type="button" class="btn primary" onclick={openNew}><Icon name="plus" size={15} /> New league</button>{/snippet}
    </Empty>
  {:else}
    {#each fams as f (f.base.family)}
      {@const b = f.base}
      <section class="card league" class:ended={b.state === 'ended'}>
        <div class="banner-box">
          {#if b.art.banner_url ?? b.art.creation_url ?? b.art.logo_url}
            <img src={b.art.banner_url ?? b.art.creation_url ?? b.art.logo_url} alt="" />
          {:else}
            <Icon name="trophy" size={32} />
          {/if}
        </div>
        <div class="league-body">
          <ul class="rows">
            {#each f.rows as r (r.id)}
              <li class:dim={r.state !== 'active'}>
                <b>{r.display_name}</b>
                {#if r.is_default}<Chip tone="accent">DEFAULT</Chip>{/if}
                {#if variantTag(r)}<Chip>{variantTag(r)}</Chip>{/if}
                {#if r.permanent && !r.hardcore && !r.ssf}<Chip tone="info">PERMANENT</Chip>{/if}
                <Chip tone={r.state === 'active' ? 'ok' : r.state === 'hidden' ? 'warn' : 'neutral'}>{r.state.toUpperCase()}</Chip>
                <span class="muted count">{r.characters} character{r.characters === 1 ? '' : 's'}</span>
                <span class="grow"></span>
                {#if r.state !== 'ended'}
                  <button type="button" class="btn sm ghost" aria-label="{r.state === 'hidden' ? 'Show' : 'Hide'} {r.display_name}" onclick={() => toggleHidden(r)}>{r.state === 'hidden' ? 'Show' : 'Hide'}</button>
                {/if}
              </li>
            {/each}
          </ul>
          <p class="muted small">
            Starts {b.starts_at ? formatDate(b.starts_at) : 'now'} · Ends {b.ends_at ? formatDate(b.ends_at) : 'never'}{#if b.migrate_to} · ends into {b.migrate_to}{/if}
          </p>
          {#if b.mechanics.length > 0}
            <p class="muted small">Mechanics: {b.mechanics.map(mechName).join(', ')} <span class="tag-soon">not implemented yet</span></p>
          {/if}
          <div class="row-actions left">
            <button type="button" class="btn sm" onclick={() => openEdit(f.rows)}><Icon name="edit" size={13} /> Edit</button>
            {#if b.state !== 'ended' && !b.permanent}
              <button type="button" class="btn sm" onclick={() => openEnd(b)}>End league...</button>
            {/if}
            <button type="button" class="btn sm danger" onclick={() => openDelete(b)}><Icon name="trash" size={13} /> Delete...</button>
          </div>
        </div>
      </section>
    {/each}
  {/if}
{:else if res.error}
  <div class="notice danger" role="alert"><span class="notice-title"><Icon name="alert" size={16} /> {res.error}</span></div>
{:else}
  <div class="loading"><Spinner size={20} /> Loading...</div>
{/if}

<LeagueForm bind:open={formOpen} family={editing} all={list} {flags} {mechanics} done={changed} />

<Modal bind:open={endOpen} title={`End ${endFam?.display_name ?? ''}`} icon="alert" danger>
  <form onsubmit={submitEnd}>
    {#if endOptions.length === 0}
      <p class="muted">There is no permanent league to move the characters into. Create a permanent league first.</p>
      <div class="actions"><button type="button" class="btn" onclick={() => (endOpen = false)}>Close</button></div>
    {:else}
      <label class="field">
        <span>Characters move into</span>
        <select bind:value={endTarget}>
          {#each endOptions as t (t.id)}<option value={t.family}>{t.display_name}</option>{/each}
        </select>
      </label>
      <ul class="mapping">
        {#each moves as m (m.from.id)}
          <li>{m.from.display_name} <Icon name="arrow" size={13} /> <b>{m.to ? m.to.display_name : 'no matching league'}</b> <span class="muted">({m.from.characters} character{m.from.characters === 1 ? '' : 's'})</span></li>
        {/each}
      </ul>
      <p class="hint"><b>{moveCount}</b> character{moveCount === 1 ? '' : 's'} will move. This cannot be undone.</p>
      <label class="field">
        <span>Type <b>{endFam?.display_name}</b> to confirm</span>
        <input bind:value={endTyped} autocomplete="off" />
      </label>
      <div class="actions">
        <button type="button" class="btn" onclick={() => (endOpen = false)}>Cancel</button>
        <button type="submit" class="btn danger solid" disabled={busy || !endTarget || endTyped !== endFam?.display_name || moves.some((m) => !m.to)}>End league</button>
      </div>
    {/if}
  </form>
</Modal>

<Modal bind:open={delOpen} title={`Delete ${delRow?.id ?? ''}`} icon="alert" danger>
  <form onsubmit={submitDelete}>
    <p class="muted">
      {#if delRow && delRow.id === delRow.family}Deletes the league and all its variants.{:else}Deletes this league.{/if}
      A league can only be deleted while it has no characters.
    </p>
    {#if delCount > 0}
      {@const base = fams.find((f) => f.base.family === delRow?.family)?.base}
      <div class="notice danger" role="alert"><span class="notice-title"><Icon name="alert" size={16} /> {delCount} character{delCount === 1 ? ' is' : 's are'} still in it.</span>
        {#if base && !base.permanent && base.state !== 'ended'}<p class="muted">End the league to move them into another one first.</p>{:else}<p class="muted">Move them to another league from their character pages first.</p>{/if}
      </div>
      <div class="actions">
        <button type="button" class="btn" onclick={() => (delOpen = false)}>Close</button>
        {#if base && !base.permanent && base.state !== 'ended'}
          <button type="button" class="btn" onclick={() => { delOpen = false; openEnd(base); }}>End league...</button>
        {/if}
      </div>
    {:else}
      <label class="field">
        <span>Type <b>{delRow?.id}</b> to confirm</span>
        <input bind:value={delTyped} autocomplete="off" />
      </label>
      <div class="actions">
        <button type="button" class="btn" onclick={() => (delOpen = false)}>Cancel</button>
        <button type="submit" class="btn danger solid" disabled={busy || delTyped !== delRow?.id}>Delete</button>
      </div>
    {/if}
  </form>
</Modal>

<style>
  .league { display: flex; gap: var(--sp-4); align-items: flex-start; margin-bottom: var(--sp-3); }
  .league.ended { opacity: 0.7; }
  .banner-box { flex: none; width: 140px; min-height: 80px; display: grid; place-items: center; background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: var(--radius); color: var(--muted); overflow: hidden; }
  .banner-box img { width: 100%; height: auto; display: block; }
  .league-body { flex: 1; min-width: 0; }
  .rows { list-style: none; margin: 0 0 8px; padding: 0; }
  .rows li { display: flex; align-items: center; gap: var(--sp-2); padding: 6px 0; border-top: 1px solid var(--line-soft); }
  .rows li:first-child { border-top: 0; }
  .rows li.dim b { color: var(--muted); }
  .count { font-size: 12.5px; }
  .grow { flex: 1; }
  .small { font-size: 12.5px; margin: 2px 0; }
  .row-actions.left { justify-content: flex-start; margin-top: 10px; }
  .tag-soon { margin-left: 6px; font-size: 11px; color: var(--warn); font-weight: 600; }
  .mapping { list-style: none; margin: 0 0 10px; padding: 0; font-size: 13px; }
  .mapping li { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 3px 0; }
  .mapping li :global(svg) { color: var(--muted); }
  @media (max-width: 640px) {
    .league { flex-direction: column; }
    .banner-box { width: 100%; min-height: 56px; max-height: 96px; }
    .rows li { flex-wrap: wrap; row-gap: 4px; }
    .rows li .grow { display: none; }
    .rows li .btn { margin-left: auto; }
  }
</style>
