<script lang="ts">
  import { areas } from '../areas.svelte';

  // A <datalist> of the world areas (id, with the name and act as the label) for an area input:
  // <input list={id}>. Empty when the server has no game data; typing any id still works.
  let { id }: { id: string } = $props();
  $effect(() => {
    void areas.load();
  });
</script>

<datalist {id}>
  {#each areas.list as a (a.id)}
    <option value={a.id}>{a.name}{a.act ? ` (act ${a.act})` : ''}{a.is_town ? ', town' : ''}</option>
  {/each}
</datalist>
