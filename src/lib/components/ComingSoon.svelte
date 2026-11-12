<script lang="ts">
  /** Bloc « à venir » pour les données dont la route n'est pas encore livrée (guide §9) : on n'invente jamais de chiffres. */
  interface Props { text?: string }
  let { text = 'Disponible prochainement : cette donnée arrive avec une prochaine version de l’API.' }: Props = $props();
</script>

<div class="fut">{text}</div>

<style>
  .fut { border: 1.5px dashed var(--line); border-radius: var(--radius); padding: 12px 14px; font-size: 13px; color: var(--mut); }
</style>
