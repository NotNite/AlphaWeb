(() => {
  // console.log("Web worker loaded!");

  // BroadcastChannel is wasteful here but it saves me from having to intercept the existing message handler
  const channel = new BroadcastChannel("alpha-web-handle");
  let handle;
  navigator.storage.getDirectory = async () => {
    // console.log("getDirectory called!");

    if (handle != null) {
      return handle;
    } else {
      return await new Promise((resolve) => {
        const eventListener = (msg) => {
          if (msg.data == null) return;
          channel.removeEventListener("message", eventListener);
          handle = msg.data;
          // console.log("Worker got handle:", handle);
          resolve(handle);
        };

        channel.addEventListener("message", eventListener);
        channel.postMessage(null); // main thread will receive this
      });
    }
  };
})();
