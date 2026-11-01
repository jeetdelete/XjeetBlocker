/// <reference types="vite/client" />
import html from "../popup/index.html?raw";
import { mountPanel } from "../popup/panel";
import type { Settings } from "../core/settings";

/** Reuses the desktop controls in an isolated, touch-friendly panel on X. */
export function mountMobilePanel(settings: Settings, unblock: (handles: string[]) => Promise<boolean>) {
  const host = document.createElement("div");
  host.id = "xjeetblocker-mobile";
  // Closed shadow root keeps page styling and ordinary DOM selectors out of the settings UI.
  const shadow = host.attachShadow({ mode: "closed" });
  const template = new DOMParser().parseFromString(html, "text/html");
  template.querySelectorAll("script").forEach((script) => script.remove());
  template.querySelector("header h1")?.remove();
  const style = document.createElement("style");
  style.textContent = template.querySelector("style")!.textContent + `
    :host { all: initial; position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; }
    .panel { --bg: #fff; --fg: #0f1419; --muted: #536471; --line: #ddd; --accent: #1d9bf0; --danger: #c41422;
      position: absolute; box-sizing: border-box; padding: 0; right: max(8px, env(safe-area-inset-right)); bottom: max(72px, env(safe-area-inset-bottom));
      width: min(420px, calc(100vw - 16px)); max-height: calc(100vh - 100px); max-height: calc(100dvh - 100px); overflow: auto;
      background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-radius: 14px;
      box-shadow: 0 8px 40px #0005; font: 14px system-ui, sans-serif; pointer-events: auto; }
    @media (prefers-color-scheme: dark) { .panel { --bg: #111; --fg: #e7e9ea; --muted: #aaa; --line: #444; } }
    button, input[type=checkbox], summary, label { touch-action: manipulation; }
    button { min-height: 44px; } input[type=checkbox] { width: 22px; height: 22px; flex-shrink: 0; }
    label, summary { min-height: 40px; } .countries label { display: flex; align-items: center; gap: 6px; }
    input[type=text] { font-size: 16px; min-height: 44px; }
    .launcher { position: absolute; right: max(12px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom));
      background: #1d9bf0; color: white; padding: 10px 16px; border: none; border-radius: 24px;
      font: 600 14px system-ui, sans-serif; box-shadow: 0 2px 12px #0005; pointer-events: auto; }
    .mobile-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; }
    @media (max-width: 359px) { .countries { columns: 1; } .row { flex-wrap: wrap; } }
  `;
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "settings-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "XjeetBlocker settings");
  const toolbar = document.createElement("div");
  toolbar.className = "mobile-toolbar";
  const title = document.createElement("strong"); title.textContent = "XjeetBlocker";
  const close = document.createElement("button"); close.textContent = "Close";
  close.setAttribute("aria-label", "Close XjeetBlocker settings");
  toolbar.append(title, close);
  panel.append(toolbar, ...Array.from(template.body.childNodes));
  const launcher = document.createElement("button");
  launcher.className = "launcher"; launcher.textContent = "XjeetBlocker";
  launcher.setAttribute("aria-controls", panel.id); launcher.setAttribute("aria-expanded", "false");
  shadow.append(style, panel, launcher);
  document.body.append(host);
  const controls = mountPanel(panel, settings, unblock);
  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    if (open) { void controls.refresh(); close.focus(); }
    else launcher.focus();
  };
  launcher.onclick = () => setOpen(panel.hidden);
  close.onclick = () => setOpen(false);
  panel.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });
  return { host, panel, launcher, close };
}
