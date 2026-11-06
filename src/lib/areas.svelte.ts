// The world areas from the server's game data (`GET /admin/data/areas`), fetched once per page
// load: the area pickers' list and the names shown next to area ids. Empty when the server has no
// game data; then ids are shown as they are.
import { api } from './api/client';
import type { components } from './api/schema';

export type Area = components['schemas']['AreaView'];

class Areas {
  list = $state<Area[]>([]);
  private byId = $derived(new Map(this.list.map((a) => [a.id, a])));
  private loading: Promise<void> | null = null;

  load(): Promise<void> {
    this.loading ??= api
      .GET('/api/v1/admin/data/areas')
      .then(({ data }) => {
        this.list = data ?? [];
      })
      .catch(() => {});
    return this.loading;
  }

  /** "The Riverbank" for "G1_1" once the list is in, else the id. */
  name(id: string): string {
    void this.load();
    return this.byId.get(id)?.name || id;
  }
}

export const areas = new Areas();
