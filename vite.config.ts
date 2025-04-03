import { createLogger, defineConfig, PluginOption } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

function dumbShitHacks(): PluginOption {
  const headerIdRegex = /dotnet\.native\.[a-z0-9]+.js/;
  const workerIdRegex = /dotnet\.native\.worker\.[a-z0-9]+.mjs/;

  return {
    name: "dumbShitHacks",
    transform(code, id) {
      if (headerIdRegex.test(id)) {
        // Hack to inject our own script into the .NET workers
        // Read is here for """hot reload"""
        const header = fs.readFileSync(
          fileURLToPath(new URL("./web-worker-jank.js", import.meta.url)),
          "utf8"
        );

        return {
          code: header + "\n" + code
        };
      } else if (workerIdRegex.test(id)) {
        // Fix import analysis exploding
        return {
          code: code
            // lmfao the string changes based off of optimization
            .replace(`import("./dotnet.native.js")`, "null")
            .replace(`import('./dotnet.native.js')`, "null")
        };
      }
    }
  };
}

// https://vite.dev/config
export default defineConfig(() => {
  const wasmDir = fileURLToPath(
    new URL(
      // For reasons I do not understand, debug build does not work
      "./wasm/bin/Release/net9.0-browser/wwwroot/_framework",
      import.meta.url
    )
  );

  // Hide the warnings from the dotnet.js file we don't control
  const dotnetFiles = ["dotnet.js", "dotnet.runtime", "dotnet.native.worker"];
  const dotnetWarnings = [
    "The above dynamic import cannot be analyzed by Vite.", // use of dynamic import()
    "points to missing source files", // broken source map URL
    "has been externalized for browser compatibility" // use of process global
  ];
  const allWarnings = [
    "Files in the public directory are served at the root path." // public imports
  ];

  // how is this the suggested method https://vite.dev/config/shared-options.html#customlogger
  const logger = createLogger();
  for (const level of ["warn", "info", "warnOnce"] as const) {
    const orig = logger[level];
    logger[level] = (msg, options) => {
      if (
        (dotnetFiles.some((f) => msg.includes(f)) &&
          dotnetWarnings.some((w) => msg.includes(w))) ||
        allWarnings.some((w) => msg.includes(w))
      ) {
        return;
      } else {
        return orig(msg, options);
      }
    };
  }

  return {
    plugins: [svelte(), dumbShitHacks()],
    customLogger: logger,
    resolve: {
      alias: {
        "#wasm": wasmDir
      }
    },
    // Required for the web workers I guess
    server: {
      headers: {
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Opener-Policy": "same-origin"
      }
    }
  };
});
