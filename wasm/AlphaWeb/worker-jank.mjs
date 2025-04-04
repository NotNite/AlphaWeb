(() => {
  // BroadcastChannel is wasteful here but it saves me from having to intercept the existing web worker message handler
  const channel = new BroadcastChannel("alpha-web-handle");
  let handle;

  navigator.storage.getDirectory = async () => {
    if (handle != null) {
      return handle;
    } else {
      return await new Promise((resolve) => {
        const eventListener = (msg) => {
          if (msg.data === null) return; // another worker is also requesting a handle
          channel.removeEventListener("message", eventListener);
          handle = msg.data;
          resolve(handle);
        };

        channel.addEventListener("message", eventListener);
        channel.postMessage(null); // main thread will receive this
      });
    }
  };
})();
