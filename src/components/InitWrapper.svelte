<script lang="ts">
  import { initWasm } from "../lib/interop/wasm.svelte";
  import Main from "./Main.svelte";

  async function initFS() {
    const handle = await window.showDirectoryPicker({
      id: "ffxiv"
    });
    if (handle.name !== "game")
      throw new Error(`Expected directory name game, got ${handle.name}`);
    return handle;
  }

  let message = $state("Loading filesystem, please wait...");
  let initPromise = $state<Promise<void> | null>(null);

  async function initWrapper() {
    try {
      const handle = await initFS();
      message = "Loading WASM, please wait...";
      const bindings = await initWasm(handle);
      message = "Starting Lumina, please wait...";
      const success = await bindings.CreateLumina();
      if (!success) throw new Error("Failed to create Lumina");
    } catch (e) {
      // rethrow to log in console
      console.error(e);
      throw e;
    }
  }
</script>

{#if initPromise == null}
  <p>Select the <code>game</code> folder from your game install.</p>

  <button
    onclick={() => {
      // Filesystem mounting can only be done from user input
      initPromise = initWrapper();
    }}>Mount game</button
  >
{:else}
  {#await initPromise}
    <p>{message}</p>
  {:then}
    <Main />
  {:catch err}
    <p>Failed to load :(</p>
    <pre>{err}</pre>
  {/await}
{/if}
