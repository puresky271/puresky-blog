<script lang="ts">
  let {
    value = $bindable(),
    label,
    hint,
    maxlength,
    invalid = false,
  }: {
    value: string;
    label: string;
    hint?: string;
    maxlength: number;
    invalid?: boolean;
  } = $props();
  const id = $props.id();
</script>

<label class="field" for={id}>
  <span class="label-row"><span>{label}</span>{#if hint}<small>{hint}</small>{/if}</span>
  <input {id} bind:value {maxlength} class:invalid spellcheck="false" autocomplete="off" aria-invalid={invalid} />
</label>

<style>
  .field { display: block; min-width: 0; }
  .label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; font-size: 0.72rem; font-weight: 550; color: var(--fg-muted); }
  .label-row small { font-family: var(--font-mono); font-size: 0.62rem; font-weight: 400; color: var(--fg-subtle); }
  input {
    width: 100%;
    height: 2.5rem;
    padding: 0 0.7rem;
    border: 1px solid var(--anim-line, var(--line-strong));
    border-radius: 7px;
    background: transparent;
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
  }
  input:hover { border-color: color-mix(in oklab, var(--fg) 22%, var(--line)); }
  input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); background: var(--surface); }
  input.invalid { border-color: var(--danger); }
</style>
