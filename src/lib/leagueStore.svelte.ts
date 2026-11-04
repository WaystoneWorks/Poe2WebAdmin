import { api, unwrap } from './api/client';
import { type AdminLeague, POPUP_KEY, needsLeaguePopup, popupDismissed } from './leagues';

/** The admin league list shared by the popup, the dashboard card and the Leagues page. */
class LeagueStore {
  list = $state<AdminLeague[] | undefined>(undefined);
  dismissed = $state(popupDismissed());

  async load(): Promise<void> {
    try {
      this.list = await unwrap(api.GET('/api/v1/admin/leagues'));
    } catch {
      /* keep the last list; the pages show their own errors */
    }
  }

  /** True once the list is loaded and no league is active. */
  get missing(): boolean {
    return this.list !== undefined && !this.list.some((l) => l.state === 'active');
  }

  get popup(): boolean {
    return needsLeaguePopup(this.list, this.dismissed);
  }

  later(): void {
    this.dismissed = true;
    try {
      sessionStorage.setItem(POPUP_KEY, '1');
    } catch {
      /* private mode: just until reload */
    }
  }
}
export const leagueStore = new LeagueStore();
