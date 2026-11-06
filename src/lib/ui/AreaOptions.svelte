<script lang="ts" module>
  import { api } from '../api/client';
  import type { components } from '../api/schema';

  type Area = components['schemas']['AreaView'];
  // One fetch per page load: the server's game data does not change while it runs.
  let cached: Promise<Area[]> | null = null;
  function areas(): Promise<Area[]> {
    cached ??= api.GET('/api/v1/admin/data/areas').then(({ data }) => data ?? []);
    return cached;
  }
</script>

<script lang="ts">
  // A <datalist> of the world areas (id, with the name and act as the label) for an area input:
  // <input list={id}>. Empty when the server has no game data; typing any id still works.
  let { id }: { id: string } = $props();
  let list = $state<Area[]>([]);
  $effect(() => {
    void areas().then((a) => (list = a));
  });
</script>

<datalist {id}>
  {#each list as a (a.id)}
    <option value={a.id}>{a.name}{a.act ? ` (act ${a.act})` : ''}{a.is_town ? ', town' : ''}</option>
  {/each}
</datalist>
