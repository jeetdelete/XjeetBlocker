import { chromeStore, Settings } from "../core/settings";
import { mountPanel } from "./panel";

mountPanel(document, new Settings(chromeStore()), async (handles) => {
  const [tab] = await chrome.tabs.query({ url: "https://x.com/*" });
  if (tab?.id === undefined) return false;
  let success = true;
  for (const handle of handles) {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "unblock", handle }).catch(() => false);
    if (!result) success = false;
  }
  return success;
});
