<script lang="ts">
  import wasm from "../lib/wasm.svelte";

  const sheets = $state(wasm.callAndParseJson("GetExcelSheets").then((sheets) => sheets.sort()));
</script>

{#await sheets}
  <span>Waiting for response from WASM...</span>
{:then sheets}
  <ul>
    {#each sheets as sheet}
      <li>{sheet}</li>
    {/each}
  </ul>
{/await}
