<script lang="ts">
  import wasm from "../lib/interop/wasm.svelte";

  const sheets = $state(
    wasm
      .bindings!.GetExcelSheets()
      .then((msg) => JSON.parse(msg) as string[])
      .then((sheets) => sheets.sort())
  );
</script>

{#await sheets}
  <span>Asked for sheets...</span>
{:then sheets}
  <ul>
    {#each sheets as sheet}
      <li>{sheet}</li>
    {/each}
  </ul>
{/await}
