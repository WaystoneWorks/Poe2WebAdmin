<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import Icon, { type IconName } from './Icon.svelte';

  let {
    open = $bindable(false),
    title,
    icon,
    danger = false,
    wide = false,
    children,
  }: { open?: boolean; title: string; icon?: IconName; danger?: boolean; wide?: boolean; children: Snippet } = $props();

  const titleId = $props.id();
  let dialog: HTMLDialogElement | undefined = $state();
  /** First focus: an `autofocus` element, else the first field, else the first button after the X. */
  async function focusFirst(d: HTMLDialogElement) {
    await tick();
    const pick =
      d.querySelector<HTMLElement>('[autofocus]') ??
      d.querySelector<HTMLElement>('.dialog-body input:not([type="hidden"]):not(:disabled), .dialog-body select:not(:disabled), .dialog-body textarea:not(:disabled)') ??
      d.querySelector<HTMLElement>('.dialog-body button:not(.dialog-close):not(:disabled), .dialog-body a[href]');
    pick?.focus();
  }

  // Typed into since it opened: a stray click on the backdrop then does not throw the input away.
  let edited = false;

  // The native <dialog> traps focus, closes on Escape and restores focus to the opener.
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      edited = false;
      dialog.showModal();
      void focusFirst(dialog);
    }
    else if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  class="modal"
  class:wide
  aria-labelledby={titleId}
  onclose={() => (open = false)}
  oninput={() => (edited = true)}
  onclick={(e) => {
    if (e.target === dialog && !edited) open = false;
  }}
>
  {#if open}
    <div class="dialog-body">
      <div class="dialog-head">
        {#if icon}<span class="dialog-icon" class:danger><Icon name={icon} size={20} /></span>{/if}
        <h2 id={titleId}>{title}</h2>
        <button type="button" class="btn icon sm ghost dialog-close" aria-label="Close" title="Close (Esc)" onclick={() => (open = false)}>
          <Icon name="close" size={16} />
        </button>
      </div>
      {@render children()}
    </div>
  {/if}
</dialog>
