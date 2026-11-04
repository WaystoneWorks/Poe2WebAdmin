<script lang="ts">
  import { router } from '../router.svelte';
  import { leagueStore } from '../leagueStore.svelte';
  import Modal from './Modal.svelte';

  // Shown on every admin page while no league is active; the Leagues page itself explains it.
  const show = $derived(leagueStore.popup && router.page !== 'leagues');
</script>

<Modal bind:open={() => show, (v) => { if (!v) leagueStore.later(); }} title="This server needs a league" icon="trophy">
  <p class="muted">This server has no league. Players can log in but cannot create characters.</p>
  <div class="actions">
    <button type="button" class="btn" onclick={() => leagueStore.later()}>Later</button>
    <button type="button" class="btn primary" onclick={() => router.go('leagues', { new: '1' })}>Create a league</button>
  </div>
</Modal>
