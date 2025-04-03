# AlphaWeb

Lumina running fully in the browser. No, I'm serious.

## What?

Using [.NET's experimental WebAssembly target](https://learn.microsoft.com/en-us/aspnet/core/client-side/dotnet-interop/wasm-browser-app), C# code can run in the browser. This means Lumina could run in the browser! However, how do you read the game files?

Using the [File System Access API](https://wicg.github.io/file-system-access/), websites can access directories on your local machine when granted permission. This integrates with the greater [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) interfaces, which means that you can hack it to work with APIs that use the [origin private file system](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API#origin_private_file_system).

Emscripten (which is what the .NET WebAssembly toolchain uses) has [experimental filesystem implementations with WASM](https://emscripten.org/docs/api_reference/Filesystem-API.html#new-file-system-wasmfs). One of these implementations is using OPFS, and it turns out it can be bodged enough to accept the File System Access API handles. With a lot of prayer, monkeypatching, and cursed build scripts, C# in WASM can use the filesystem APIs to access a folder on your local machine.

This is *not* streaming data from a server, or pre-packing game files or anything, it's all local at runtime. It's like how [the actual Alpha](https://github.com/NotNite/Alpha) works, but several times slower.

## Why?

It's funny, and I got nerdsniped when complaining about C# UI frameworks and talking about how the web has the best UI frameworks. So why not use them?

## Usage

Note that this doesn't actually have any features, it's a proof of concept. The name is just funny.

Requirements:

- .NET WASM toolchains (`dotnet workload install wasm-tools` and `dotnet workload install wasm-experimental`)
- Node.js (for the site itself)
- Chrome (for the File System Access API). Firefox will not work and I hope it never does because this filesystem API is so stupid
- You *might* need the Emscripten toolchain and a C compiler, but I already had those installed, so who knows

Running it is simple, just run `dotnet build -c Release ./wasm`, then `npm i` and `npm run dev`. Right now it doesn't work outside of the dev server because bundling this while also leaving dotnet untouched while also patching the scripts is hell.

## TODO

- Don't
- Add actual features to this
- Make it bundle release builds properly
