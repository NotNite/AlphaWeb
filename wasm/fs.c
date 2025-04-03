// TODO: don't need this many includes, I was just testing a bunch of stuff
#include <assert.h>
#include <emscripten.h>
#include <emscripten/console.h>
#include <emscripten/emscripten.h>
#include <emscripten/wasmfs.h>
#include <unistd.h>

static backend_t backend;

void setup_fs() {
  // emscripten_console_log("setup_fs() enter");

  backend = wasmfs_create_opfs_backend();
  assert(backend);
  int result = wasmfs_create_directory("/game", 0777, backend);
  assert(result == 0);

  // emscripten_console_log("setup_fs() exit");
}
