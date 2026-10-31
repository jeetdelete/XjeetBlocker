import { chromeStore } from "../core/settings";
import { startApp } from "./app";
import { xApi } from "./xApi";

const app = startApp({ doc: document, gateway: xApi(document), store: chromeStore() });

// The popup has no X session of its own, so it asks an open x.com tab to unblock.
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL("index.html")) return false;
  if (msg?.type === "unblock" && typeof msg.handle === "string" && /^[A-Za-z0-9_]{1,15}$/.test(msg.handle)) {
    app.unblock(msg.handle).then(reply, () => reply(false));
    return true;
  }
});
