import { startApp } from "../content/app";
import { xApi } from "../content/xApi";
import { Settings } from "../core/settings";
import { mountMobilePanel } from "./panel";
import { userscriptStore, type UserscriptStorage } from "./store";

declare const GM: UserscriptStorage;

if (window.top === window.self && location.hostname === "x.com" && !document.getElementById("xjeetblocker-mobile")) {
  if (typeof GM === "undefined" || ![GM.getValue, GM.setValue, GM.deleteValue, GM.listValues].every((method) => typeof method === "function")) {
    console.error("[XjeetBlocker] Install with Tampermonkey or Userscripts and allow the four GM storage grants.");
  } else {
    const store = userscriptStore(GM);
    const app = startApp({ doc: document, gateway: xApi(document), store });
    mountMobilePanel(new Settings(store), async (handles) => {
      let success = true;
      for (const handle of handles) {
        try { if (!(await app.unblock(handle))) success = false; }
        catch { success = false; }
      }
      return success;
    });
  }
}
