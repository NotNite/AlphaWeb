import type { RuntimeAPI } from "./dotnet";

export type JSONWrapper<T> = string & {
  __jsonWrapperType: T;
};

export interface Bindings {
  CreateLumina(): Promise<boolean>;
  GetExcelSheets(): Promise<JSONWrapper<string[]>>;
}

export interface WasmWrapper {
  runtime: RuntimeAPI | null;
  bindings: Bindings | null;

  // most normal typescript project
  callAndParseJson<
    Method extends keyof Bindings,
    MethodReturnType = ReturnType<Bindings[Method]>,
    RealReturnType = MethodReturnType extends Promise<JSONWrapper<infer WrappedReturnType>> ? WrappedReturnType : never
  >(
    method: Method,
    ...args: Parameters<Bindings[Method]>
  ): Promise<RealReturnType>;
}

type DotnetExports = {
  AlphaWeb: {
    Bindings: Bindings;
  };
};

const wasm = $state<WasmWrapper>({
  runtime: null,
  bindings: null,
  async callAndParseJson<Method extends keyof Bindings>(method: Method, ...args: Parameters<Bindings[Method]>) {
    if (this.bindings == null) throw new Error(`Attempted to call method ${method} when bindings were not initialized`);

    // epic typescript fail
    const func = this.bindings[method] as unknown as (...args: Parameters<Bindings[Method]>) => Promise<string>;

    const result = await func(...args);
    return JSON.parse(result);
  }
});
export default wasm;

async function importWithViteBypass<T = void>(path: string): Promise<T> {
  // "Cannot import non-asset file which is inside /public" and other fun jokes to tell yourself
  return await import(/* @vite-ignore */ new URL(path, import.meta.url).href);
}

export async function initWasm(handle: FileSystemDirectoryHandle) {
  // When a script asks for the handle, send it
  const channel = new BroadcastChannel("alpha-web-handle");
  channel.addEventListener("message", (msg) => {
    if (msg.data === null) {
      channel.postMessage(handle);
    }
  });

  // dotnet.js isn't bundled or else it breaks everything
  // Copied by the build script in the WASM project
  // types from https://github.com/dotnet/runtime/blob/cabacfcdabf1f3fde00edd096dc7412c5e0ec2cf/src/mono/browser/runtime/dotnet.d.ts
  const { dotnet } = await importWithViteBypass<typeof import("./dotnet")>("/wasm/dotnet.js");

  let builder = dotnet; //.withDiagnosticTracing(true).withDebugging(42069);

  // @ts-expect-error Internal .NET API, separated for better type safety
  builder = builder.withModuleConfig({
    // Simple reimplementation to grab `this` for a monkeypatch
    locateFile: function (file: string, folder: string) {
      const emscriptenModule = this;

      emscriptenModule.onRuntimeInitialized = () => {
        // Assigned here so that it doesn't get overwritten by Emscripten itself
        emscriptenModule.FS_createPath = () => {
          // dotnet.js tries to make /usr and /usr/share on startup, but the filesystem isn't initialized yet
          // We just nop it since it does literally nothing for our program anyways
        };
      };

      return folder + file;
    }
  });

  const runtime = await builder.create();
  wasm.runtime = runtime;

  const config = runtime.getConfig();

  // Main() will set up the OPFS filesystem
  await runtime.runMain(config.mainAssemblyName);

  const exports: DotnetExports = await runtime.getAssemblyExports(config.mainAssemblyName!);
  wasm.bindings = exports.AlphaWeb.Bindings;
  return exports.AlphaWeb.Bindings;
}
