import { CONTINENTS, countryByCode, countryFromBasedIn, flagOf, KNOWN_BROAD_REGIONS } from "../core/countries";
import { chromeStore, Settings, type BlockLogEntry, type RegionRule } from "../core/settings";

const settings = new Settings(chromeStore());
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string)[]) {
  const node: HTMLElementTagNameMap[K] = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}

async function xTab() {
  const [tab] = await chrome.tabs.query({ url: "https://x.com/*" });
  return tab?.id;
}

async function unblock(handles: string[]) {
  const tabId = await xTab();
  if (tabId === undefined) {
    $("tab-note").hidden = false;
    return;
  }
  for (const [i, handle] of handles.entries()) {
    if (i) await new Promise((r) => setTimeout(r, 1000));
    await chrome.tabs.sendMessage(tabId, { type: "unblock", handle }).catch(() => false);
  }
  await render();
}

function describe(rule: RegionRule) {
  const names = [
    ...rule.countries.map((c) => countryByCode(c)?.name ?? c),
    ...rule.broadRegions.map((b) => `${b} (region only)`),
  ];
  return names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3}` : names.join(", ") || "No countries";
}

function reasonText(e: BlockLogEntry) {
  return e.reason.kind === "hand" ? "by hand" : `${e.reason.ruleName} rule · ${e.reason.basedIn}`;
}

async function render() {
  const [rules, paused, log, exempt] = await Promise.all([
    settings.rules(),
    settings.paused(),
    settings.log(),
    settings.exempt(),
  ]);

  $<HTMLInputElement>("pause").checked = paused;
  $("pause-label").textContent = paused ? "Rules paused" : "Pause rules";
  $("pause-label").className = paused ? "paused" : "";

  $("rules").replaceChildren(
    ...rules.map((rule) => {
      const toggle = el("input", { type: "checkbox", checked: rule.enabled, title: "Rule on/off" });
      toggle.onchange = async () => {
        rule.enabled = toggle.checked;
        await settings.saveRules(rules);
      };
      const del = el("button", { className: "danger", textContent: "Delete" });
      del.onclick = async () => {
        if (!confirm(`Delete the ${rule.name} rule? Accounts it already blocked stay blocked.`)) return;
        await settings.saveRules(rules.filter((r) => r !== rule));
        await render();
      };
      const edit = el("button", { textContent: "Edit" });
      edit.onclick = () => openEditor(rule);
      return el(
        "div",
        { className: "row" },
        toggle,
        el("div", { className: "grow" }, el("strong", {}, rule.name), el("div", { className: "muted" }, describe(rule))),
        edit,
        del,
      );
    }),
  );

  const active = log.filter((e) => !e.undone).reverse();
  const byRule = new Map<string, string[]>();
  for (const e of active) {
    if (e.reason.kind !== "rule") continue;
    byRule.set(e.reason.ruleName, [...(byRule.get(e.reason.ruleName) ?? []), e.handle]);
  }
  $("log").replaceChildren(
    ...(active.length ? [] : [el("p", { className: "muted", textContent: "Nothing blocked yet." })]),
    ...[...byRule].map(([ruleName, handles]) => {
      const undoAll = el("button", { className: "danger", textContent: `Undo all ${handles.length} from ${ruleName} rule` });
      undoAll.onclick = () => {
        if (confirm(`Unblock ${handles.length} accounts blocked by the ${ruleName} rule?`)) void unblock(handles);
      };
      return el("div", { className: "row" }, undoAll);
    }),
    ...active.slice(0, 200).map((e) => {
      const btn = el("button", { textContent: "Unblock" });
      btn.onclick = () => unblock([e.handle]);
      return el(
        "div",
        { className: "row" },
        el(
          "div",
          { className: "grow" },
          el("a", { href: `https://x.com/${e.handle}`, target: "_blank", textContent: `@${e.handle}` }),
          el("div", { className: "muted" }, `${new Date(e.at).toLocaleString()} · ${reasonText(e)}`),
        ),
        btn,
      );
    }),
  );

  const spared = Object.entries(exempt).filter(([, r]) => r === "never-block");
  $("spared").replaceChildren(
    ...(spared.length ? [] : [el("p", { className: "muted", textContent: "Use 🛡 next to a post to protect an account." })]),
    ...spared.map(([handle]) => {
      const btn = el("button", { textContent: "Remove" });
      btn.onclick = async () => {
        await settings.setExempt(handle, null);
        await render();
      };
      return el("div", { className: "row" }, el("span", { className: "grow", textContent: `@${handle}` }), btn);
    }),
  );
}

async function openEditor(existing?: RegionRule) {
  const rule: RegionRule = existing
    ? structuredClone(existing)
    : { id: crypto.randomUUID(), name: "", enabled: true, countries: [], broadRegions: [] };
  const chosen = new Set(rule.countries);
  const broadChosen = new Set(rule.broadRegions);

  $("editor-title").textContent = existing ? `Edit ${existing.name}` : "New rule";
  $<HTMLInputElement>("rule-name").value = rule.name;

  $("continents").replaceChildren(
    ...CONTINENTS.map((continent) => {
      const all = el("input", { type: "checkbox", title: `Tick every country in ${continent.name}` });
      const boxes = continent.countries.map((country) => {
        const box = el("input", { type: "checkbox", checked: chosen.has(country.code) });
        box.onchange = () => {
          box.checked ? chosen.add(country.code) : chosen.delete(country.code);
          sync();
        };
        return { box, label: el("label", {}, box, ` ${flagOf(country.code)} ${country.name}`) };
      });
      const count = el("span", { className: "muted" });
      const sync = () => {
        const n = boxes.filter((b) => b.box.checked).length;
        all.checked = n === boxes.length;
        all.indeterminate = n > 0 && n < boxes.length;
        count.textContent = n ? ` ${n} of ${boxes.length}` : "";
      };
      all.onclick = (e) => e.stopPropagation();
      all.onchange = () => {
        for (const { box } of boxes) box.checked = all.checked;
        continent.countries.forEach((c) => (all.checked ? chosen.add(c.code) : chosen.delete(c.code)));
        sync();
      };
      sync();
      return el(
        "details",
        { open: boxes.some((b) => b.box.checked) },
        el("summary", {}, all, ` ${continent.name}`, count),
        el("div", { className: "countries" }, ...boxes.map((b) => b.label)),
      );
    }),
  );

  // Broad Regions: the likely ones, plus any region-only value already seen on X.
  const seen = Object.values(await settings.regions())
    .map((r) => r.basedIn)
    .filter((b): b is string => !!b && !countryFromBasedIn(b));
  const broad = [...new Set([...KNOWN_BROAD_REGIONS, ...seen, ...rule.broadRegions])].sort();
  $("broad").replaceChildren(
    ...broad.map((name) => {
      const box = el("input", { type: "checkbox", checked: broadChosen.has(name) });
      box.onchange = () => (box.checked ? broadChosen.add(name) : broadChosen.delete(name));
      return el("label", { className: "row" }, box, `🌐 ${name}`);
    }),
  );

  $("save-rule").onclick = async () => {
    rule.name = $<HTMLInputElement>("rule-name").value.trim() || "Untitled rule";
    rule.countries = [...chosen];
    rule.broadRegions = [...broadChosen];
    const rules = await settings.rules();
    const i = rules.findIndex((r) => r.id === rule.id);
    i === -1 ? rules.push(rule) : (rules[i] = rule);
    await settings.saveRules(rules);
    closeEditor();
  };

  $("main").hidden = true;
  $("editor").hidden = false;
}

function closeEditor() {
  $("editor").hidden = true;
  $("main").hidden = false;
  void render();
}

$("cancel-rule").onclick = closeEditor;
$("new-rule").onclick = () => openEditor();
$<HTMLInputElement>("pause").onchange = async (e) => {
  await settings.setPaused((e.target as HTMLInputElement).checked);
  await render();
};

void render();
