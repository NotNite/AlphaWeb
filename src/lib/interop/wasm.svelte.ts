import { dotnet, type RuntimeAPI } from "#wasm/dotnet.js";

export interface Bindings {
  CreateLumina(): Promise<boolean>;
  GetExcelSheets(): Promise<string>;
}

export interface WasmWrapper {
  runtime: RuntimeAPI | null;
  bindings: Bindings | null;
}

type DotnetExports = {
  AlphaWeb: {
    Bindings: Bindings;
  };
};

const wasm = $state<WasmWrapper>({
  runtime: null,
  bindings: null
});
export default wasm;

export async function initWasm(handle: FileSystemDirectoryHandle) {
  // Sends the handle to the header we injected into the worker (see Vite config)
  const channel = new BroadcastChannel("alpha-web-handle");
  channel.addEventListener("message", (msg) => {
    if (msg.data == null) {
      // console.log("Got a request for a handle");
      channel.postMessage(handle);
    }
  });

  const runtime: RuntimeAPI = await dotnet
    .withDebugging(10)
    .withDiagnosticTracing(true)
    // @ts-expect-error Internal API
    .withModuleConfig({
      // Simple reimplementation to grab `this` for a monkeypatch
      locateFile: function (file: string, folder: string) {
        this.onRuntimeInitialized = () => {
          // The JS wrapper tries to make /usr and /usr/share, which crashes since there's no FS yet
          // Just block the call, it doesn't matter lol
          this.FS_createPath = function (...args: any[]) {
            // console.log("Blocking FS_createPath", args);
          };
        };

        return folder + file;
      }
    })
    .create();
  const config = runtime.getConfig();

  await runtime.runMain(config.mainAssemblyName);

  const exports: DotnetExports = await runtime.getAssemblyExports(
    config.mainAssemblyName!
  );

  wasm.runtime = runtime;
  wasm.bindings = exports.AlphaWeb.Bindings;
  return exports.AlphaWeb.Bindings;
}
