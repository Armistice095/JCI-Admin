<script lang="ts">
  import Icon from './Icon.svelte';
  interface Props { id: string; value: string; autocomplete?: 'current-password' | 'new-password'; required?: boolean; minlength?: number }
  let { id, value = $bindable(''), autocomplete = 'current-password', required = true, minlength }: Props = $props();
  let shown = $state(false);
</script>

<div class="pw">
  <input {id} type={shown ? 'text' : 'password'} bind:value {autocomplete} {required} {minlength} />
  <button type="button" onclick={() => (shown = !shown)} aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={shown}>
    <Icon name={shown ? 'eye-off' : 'eye'} />
  </button>
</div>

<style>
  .pw { position: relative; }
  input { padding-right: 52px; }
  button { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: grid; place-items: center; width: 40px; height: 40px; border: 0; background: none; color: var(--acc); cursor: pointer; border-radius: 8px; }
  button:hover { background: var(--soft); }
</style>
