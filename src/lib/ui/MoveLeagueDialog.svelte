<script lang="ts">
  import { api, unwrap } from '../api/client';
  import { run } from '../notify.svelte';
  import { type AdminLeague, moveTargets, variantTag } from '../leagues';
  import Modal from './Modal.svelte';
  import Icon from './Icon.svelte';

  // An admin's move of one offline character into any league that has not ended.
  let {
    open = $bindable(false),
    character,
    done,
  }: { open?: boolean; character: { id: number; name: string; league: string; online: boolean }; done: () => void } = $props();

  let all = $state<AdminLeague[]>([]);
  let target = $state('');
  let busy = $state(false);

  $effect(() => {
    if (!open) return;
    target = '';
    void unwrap(api.GET('/api/v1/admin/leagues'))
      .then((v) => (all = v))
      .catch(() => (all = []));
  });

  const targets = $derived(moveTargets(all, character.league));

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!target || character.online) return;
    busy = true;
    const ok = await run(
      async () => {
        await unwrap(
          api.POST('/api/v1/admin/characters/{id}/league', { params: { path: { id: character.id } }, body: { league: target } }),
        );
      },
      `${character.name} moved`,
    );
    busy = false;
    if (ok) {
      open = false;
      done();
    }
  }
</script>

<Modal bind:open title={`Move ${character.name}`} icon="transfer">
  <form onsubmit={submit}>
    {#if character.online}
      <p class="muted" role="alert">{character.name} is online. Ask them to log out first: a character cannot be moved while it is playing.</p>
      <div class="actions"><button type="button" class="btn" onclick={() => (open = false)}>Close</button></div>
    {:else}
      <p class="muted">Moves the character from <b>{character.league}</b> to any league that has not ended, whatever its Hardcore or Solo Self-Found setting. Items and stash follow once they exist. The move is logged.</p>
      <label class="field">
        <span>New league</span>
        <select bind:value={target} required>
          <option value="" disabled>Choose a league</option>
          {#each targets as t (t.id)}
            <option value={t.id}>{t.display_name}{variantTag(t) ? ` (${variantTag(t)})` : ''}{t.state === 'hidden' ? ' - hidden' : ''}</option>
          {/each}
        </select>
      </label>
      <div class="actions">
        <button type="button" class="btn" onclick={() => (open = false)}>Cancel</button>
        <button type="submit" class="btn primary" disabled={busy || !target}><Icon name="transfer" size={15} /> Move character</button>
      </div>
    {/if}
  </form>
</Modal>
