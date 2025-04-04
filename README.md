# AlphaWeb

Lumina running fully in the browser. No, I'm serious.

## What?

Using [.NET's experimental WebAssembly target](https://learn.microsoft.com/en-us/aspnet/core/client-side/dotnet-interop/wasm-browser-app), C# code can run in the browser. So, using a lot of glue, I made Lumina run in the browser, completely clientside! Everything runs completely locally on your machine, and there is no remote API or pre-packed game files. It's streaming and parsing game files from your own hard drive.

Note that **this is a very impractical/slow/janky proof of concept, not an actual application**. This is *not* a replacement for [the real Alpha](https://github.com/NotNite/Alpha), it is a technical demonstration. It's just named after Alpha since they're both using Lumina and made by me.

If you're interested in an actually working Excel sheet browser for the web, check out [Asriel's EXDViewer](https://exd.camora.dev) ([source](https://github.com/WorkingRobot/EXDViewer)). It uses a different tech stack (Rust, egui, [ironworks](https://github.com/ackwell/ironworks)) and streams sheets from a web API.

## How?

Using the [File System Access API](https://wicg.github.io/file-system-access), websites can access directories on your local machine when granted permission. This integrates with the greater [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) interfaces, which means that you can hack it to work with APIs that use the [origin private file system](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API#origin_private_file_system).

Emscripten (which is what the .NET WebAssembly toolchain uses) has [experimental filesystem implementations with WASM](https://emscripten.org/docs/api_reference/Filesystem-API.html#new-file-system-wasmfs). One of these implementations is using OPFS, and it turns out it can be bodged enough to accept the File System Access API handles. With a lot of prayer, monkeypatching, and cursed build scripts, C# in WASM can use the filesystem APIs to access a folder on your local machine.

## Why?

- I got nerdsniped [when complaining about C# UI frameworks](https://bsky.app/profile/did:plc:ra3gxl2udc22odfbvcfslcn3/post/3lltt3n3irs2a) and [talking about how the web has the best UI frameworks](https://bsky.app/profile/did:plc:v64k7asq54jpxr3uyoircckd/post/3lltt6zolvs2t). I thought "why not just use the web?" and then started working on this.
- It's a fun proof of concept for something that could be evolved further in the future. The work on this could theoretically be applied to *any* C# library that uses the filesystem, even if they weren't designed for it (assuming they can be compiled to native code and aren't using any other unsupported APIs).
- I find working on these kind of exotic technical problems really fun, and it's a rare intersection of my favorite programming languages (TypeScript and C#).
- It's cursed and funny as hell. I like seeing things run in ways they aren't meant to.

## Testimonials

- "why are you this insane" - [maddy](https://github.com/maddymeows)
- "why are you like this" - [Cynthia](https://github.com/Cynosphere)
- "So, uh, what's wrong with you?" - [Aren](https://github.com/arenmn)
- "What the fuck is wrong with you" - [Emma](https://bsky.app/profile/did:plc:dqibjxtqfn6hydazpetzr2w4)
- "genuinely what the fuck is wrong with you" - [nightshade](https://github.com/snightshade)
- "i would repost it but i don't want to encourage this behavior" - [perchbird](https://bsky.app/profile/did:plc:h63xvhua443ofkl7qbbgqhmh)
- "but why" - [KazWolfe](https://github.com/KazWolfe)
- "vite user" - [adryd](https://adryd.com/)
- "nice, though I think exdviewer is faster :p" - [Asriel](https://github.com/WorkingRobot)
- "Where was this 2 years ago ffs" - [MidoriKami](https://github.com/MidoriKami)
- "oh that's fairly tame" - [redstonekasi](https://github.com/redstonekasi)
- "typescript, c, and c# all in the same repo being used to do incredibly cursed things... well done LOL" - [alltheamps](https://bsky.app/profile/did:plc:w54kz3wro63hhgn3hlsgciji)
- "You’re basically doing the 2025 version of `<script src=“ieshim.js” />` that we had to do back when I started webdev and Microsoft didn’t include half of the ECMAScript standard in their browser because they still wanted to push ActiveX." - [Kastor](https://bsky.app/profile/did:plc:v64k7asq54jpxr3uyoircckd)

## Usage

### Requirements

- [.NET 9 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/9.0) with the WASM toolchains (`dotnet workload install wasm-tools` and `dotnet workload install wasm-experimental`)
- [Node.js](https://nodejs.org) (to build the site itself)
- Chrome (for the File System Access API)
  - Firefox will *not* work, and [probably never will](https://mozilla.github.io/standards-positions#native-file-system), because it does not implement the required filesystem APIs
- You *might* need the Emscripten toolchain and a C compiler, but I already had those installed, so who knows

### Building

- Clone and enter this repository: `git clone https://github.com/NotNite/AlphaWeb.git` and `cd AlphaWeb`
- Install Node.js dependencies: `npm i`
- Build the C# library: `dotnet build -c Release ./wasm`
  - This *must* be built in Release mode. Debug mode will immediately crash, for reasons I do not fully understand.
- Build the website: `npm run build`
- Start a local web server: `npm run preview`

If you're hacking on the site, you can use `npm run dev`. Just keep in mind Vite hot reload might mess with the loaded C# library, so refresh often.

## Project structure

This repository is a "normal" project using [Vite](https://vite.dev) and [Svelte](https://svelte.dev). The `wasm` folder contains the C# solution and project:

- The actual library code is in the `AlphaWeb` project. The `.csproj` sets several properties and flags to enable WasmFS in the build output.
- `fs.c` contains some code to create/mount the filesystem. This is built automatically and called from `AlphaWeb`.
- `worker-jank.mjs` is injected at the top of the .NET web worker script to patch some APIs.
- `AlphaWeb.Build` handles patching the web worker script within a MSBuild task.
- The output files get copied to `public/wasm`. They are not bundled by Vite!

When the user is prompted to select the game directory, `window.showDirectoryPicker` is called to get a handle to the directory. This handle is sent through a `BroadcastChannel` to share it between web workers. The .NET script is then dynamically imported, and using some clever object pollution, a reference to the Emscripten `Module` global is obtained. `FS_createPath` is patched to prevent the .NET scripts from trying to create directories before the filesystem is initialized (because the filesystem was replaced with WasmFS).

When the program starts, in the `Main` method, the C code is called to create the filesystem. A web worker will call the JavaScript function `navigator.storage.getDirectory` to get the origin private file system handle, but `worker-jank.mjs` patches it to instead request the shared handle from the created `BroadcastChannel`. This makes WasmFS think that it's using the origin private file system, but in reality it's reading game files directly from disk, using the exact same API surface/interfaces.

After the program runs, all communication happens through the exported methods. Through the exported methods, Lumina is initialized, which takes quite a while due to poor filesystem speeds (~30 seconds on my machine). Finally, Lumina can be used from the site, using a wrapper API that serializes values as JSON strings.
