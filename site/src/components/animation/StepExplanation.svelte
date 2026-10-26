<script lang="ts">
  let {
    phase,
    description,
    tone = 'accent',
  }: {
    phase: string;
    description: string;
    tone?: 'accent' | 'success' | 'warning' | 'danger';
  } = $props();
</script>

<div class="explanation" data-tone={tone} aria-live="polite" aria-atomic="true">
  <span class="phase">{phase}</span>
  <p>{description}</p>
</div>

<style>
  .explanation {
    display: grid;
    grid-template-columns: minmax(5.5rem, auto) 1fr;
    align-items: baseline;
    gap: 1rem;
    margin-top: 1.2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--anim-line);
  }
  .phase { color: var(--accent-strong); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; }
  .explanation p { margin: 0; color: var(--fg); font-size: 0.8rem; line-height: 1.75; text-align: left; }
  .explanation[data-tone='success'] .phase { color: var(--success); }
  .explanation[data-tone='warning'] .phase { color: var(--warning); }
  .explanation[data-tone='danger'] .phase { color: var(--danger); }
  @media (width < 34rem) {
    .explanation { grid-template-columns: 1fr; gap: 0.3rem; }
  }
</style>
