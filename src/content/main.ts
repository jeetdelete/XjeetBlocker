import { chromeStore } from "../core/settings";
import { startApp } from "./app";
import { xApi } from "./xApi";

const app = startApp({ doc: document, gateway: xApi(document), store: chromeStore() });

// The popup has no X session of its own, so it asks an open x.com tab to unblock.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === "unblock" && typeof msg.handle === "string") {
    app.unblock(msg.handle).then(reply, () => reply(false));
    return true;
  }
});

