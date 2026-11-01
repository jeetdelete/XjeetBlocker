import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const script = readFileSync(new URL("../dist-mobile/XjeetBlocker.user.js", import.meta.url), "utf8");
assert.ok(script.startsWith("// ==UserScript==\n"));
const dom = new JSDOM('<!doctype html><html><head></head><body><article><div data-testid="User-Name"><a href="/sample">Sample</a></div></article></body></html>', {
  url: "https://x.com/home", runScripts: "outside-only", pretendToBeVisual: true,
});
const { window } = dom;
const values = new Map([["xjeetblocker:region:sample", { basedIn: "United States", accurate: true, fetchedAt: 1 }]]);
window.structuredClone = structuredClone;
window.GM = {
  async getValue(key, fallback) { return structuredClone(values.has(key) ? values.get(key) : fallback); },
  async setValue(key, value) { values.set(key, structuredClone(value)); },
  async deleteValue(key) { values.delete(key); },
  async listValues() { return [...values.keys()]; },
};
let networkCalls = 0;
window.fetch = async () => { networkCalls++; throw new Error("Unexpected network call in smoke test"); };
const attachShadow = window.Element.prototype.attachShadow;
let controls;
window.Element.prototype.attachShadow = function (options) {
  const shadow = attachShadow.call(this, options);
  if (this.id === "xjeetblocker-mobile") controls = shadow;
  return shadow;
};
try {
  window.eval(script);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.ok(window.document.querySelector("#xjeetblocker-mobile"));
  assert.equal(window.document.querySelector("#xjeetblocker-mobile").shadowRoot, null);
  assert.equal(window.document.querySelector(".xrb-badge")?.textContent, "🇺🇸 United States");
  assert.equal(controls.querySelectorAll(".rule-card").length, 3);
  assert.equal(controls.querySelector("#pause").checked, true);
  controls.querySelector(".launcher").click();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(controls.querySelector(".panel").hidden, false);
  assert.equal(networkCalls, 0);
  console.log("Compiled mobile installer boots without Chrome APIs; cached badge, isolated settings, rules and paused default verified.");
} finally {
  window.close();
}
