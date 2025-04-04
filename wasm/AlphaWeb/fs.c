#include <assert.h>
#include <emscripten.h>
#include <emscripten/wasmfs.h>

static backend_t backend;

void setup_fs() {
  backend = wasmfs_create_opfs_backend();
  assert(backend);
  int result = wasmfs_create_directory("/game", 0777, backend);
  assert(result == 0);
}
