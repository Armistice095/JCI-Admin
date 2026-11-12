<script lang="ts">
  import Icon from './Icon.svelte';
  import Button from './Button.svelte';
  import { checkPosterFiles, MAX_POSTERS } from '$lib/features/posters';

  export interface PosterItem { key: string; url: string; isCover: boolean; label: string }
  interface Props {
    items: PosterItem[];
    busy?: boolean;
    onadd: (files: File[]) => void;
    onremove: (key: string) => void;
    oncover: (key: string) => void;
  }
  let { items, busy = false, onadd, onremove, oncover }: Props = $props();

  let input = $state<HTMLInputElement>();
  let problems = $state<string[]>([]);
  let over = $state(false);

  function take(list: FileList | File[] | null) {
    if (!list) return;
    const { valid, errors } = checkPosterFiles(Array.from(list), items.length);
    problems = errors;
    if (valid.length) onadd(valid);
    if (input) input.value = '';
  }
</script>

<div
  class="drop"
  class:over
  role="group"
  aria-label="Affiches"
  ondragover={(e) => { e.preventDefault(); over = true; }}
  ondragleave={() => (over = false)}
  ondrop={(e) => { e.preventDefault(); over = false; take(e.dataTransfer?.files ?? null); }}
>
  <div class="txt">
    <Icon name="download" />
    <div>
      <b>Ajoutez vos affiches</b>
      <small>JPG ou PNG, format 4:5 recommandé, 2 Mo maximum par image ({items.length}/{MAX_POSTERS})</small>
    </div>
  </div>
  <Button variant="outline" size="sm" type="button" disabled={busy || items.length >= MAX_POSTERS} onclick={() => input?.click()}>
    <Icon name="plus" size={16} />Ajouter une affiche
  </Button>
  <input bind:this={input} type="file" accept="image/jpeg,image/png" multiple class="vh" tabindex="-1" aria-label="Choisir des affiches" onchange={() => take(input?.files ?? null)} />
</div>

{#if problems.length}
  <ul class="pb" role="alert">{#each problems as p (p)}<li>{p}</li>{/each}</ul>
{/if}

{#if items.length}
  <ul class="grid">
    {#each items as it (it.key)}
      <li>
        <img src={it.url} alt={it.label} />
        {#if it.isCover}<span class="cv">Couverture</span>{/if}
        <div class="ac">
          {#if !it.isCover}<button type="button" disabled={busy} onclick={() => oncover(it.key)}>Définir comme couverture</button>{/if}
          <button type="button" class="rm" disabled={busy} onclick={() => onremove(it.key)} aria-label="Retirer l’affiche {it.label}"><Icon name="close" size={16} /></button>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .drop { border: 1.5px dashed var(--line); border-radius: 12px; padding: 16px 18px; display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; background: var(--soft); }
  .drop.over { border-color: var(--acc); }
  .txt { display: flex; gap: 10px; align-items: flex-start; }
  small { display: block; color: var(--mut); font-size: 13px; }
  .pb { margin: 10px 0 0; padding: 0 0 0 18px; color: var(--err); font-size: 13px; font-weight: 700; }
  .grid { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  li { position: relative; border-radius: 12px; overflow: hidden; background: var(--soft); }
  img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; display: block; }
  .cv { position: absolute; top: 8px; left: 8px; background: var(--card); color: var(--ink); font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 99px; }
  .ac { display: flex; gap: 6px; align-items: center; justify-content: space-between; padding: 8px; }
  .ac button { border: 0; background: none; color: var(--acc); font: 700 12px var(--font); cursor: pointer; padding: 4px; text-align: left; }
  .ac button:disabled { color: var(--mut); cursor: default; }
  .ac .rm { color: var(--err); margin-left: auto; display: grid; place-items: center; }
</style>
