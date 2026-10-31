import { countryFromBasedIn, flagOf } from "../core/countries";
import { RateLimitedError, type LookupResult, type XGateway } from "../core/gateway";
import { LookupQueue } from "../core/lookupQueue";
import { MutationQueue } from "../core/mutationQueue";
import {
  handleKey,
  matchingRule,
  Settings,
  type BlockReason,
  type KeyValueStore,
  type RegionInfo,
} from "../core/settings";
import { STYLES } from "./styles";

export interface AppOptions {
  doc: Document;
  gateway: XGateway;
  store: KeyValueStore;
  now?: () => number;
  /** Whether an element is on screen. Defaults to a viewport check. */
  isVisible?: (el: Element) => boolean;
  lookupSpacingMs?: number;
  mutationSpacingMs?: number;
}

export interface App {
  /** Process anything new on the page. Runs automatically on page changes. */
  scan(): void;
  block(handle: string, reason: BlockReason): Promise<boolean>;
  unblock(handle: string): Promise<boolean>;
  /** Resolves once queued page work has settled (for tests). */
  idle(): Promise<void>;
  stop(): void;
}

const HANDLE_PATH = /^\/([A-Za-z0-9_]{1,15})\/?$/;
const NOT_HANDLES = new Set(["home", "explore", "notifications", "messages", "i", "settings", "search", "compose"]);

function handleFromHref(href: string | null): string | null {
  if (!href) return null;
  const m = HANDLE_PATH.exec(href.replace(/^https:\/\/(x|twitter)\.com/, ""));
  return m && !NOT_HANDLES.has(m[1].toLowerCase()) ? m[1] : null;
}

/** Our own tooltip, shown instantly on hover; the browser's title tooltip has a fixed delay. */
function setTip(el: HTMLElement, text: string) {
  el.dataset.xrbTip = text;
  el.setAttribute("aria-label", text);
}

function handleWithin(el: Element): string | null {
  for (const a of el.querySelectorAll("a[href]")) {
    const h = handleFromHref(a.getAttribute("href"));
    if (h) return h;
  }
  return null;
}

export function startApp(opts: AppOptions): App {
  const { doc, gateway } = opts;
  const now = opts.now ?? (() => Date.now());
  const win = doc.defaultView!;
  const isVisible =
    opts.isVisible ??
    ((el: Element) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < win.innerHeight && r.height > 0;
    });
  const settings = new Settings(opts.store);
  // Cache reads wait until regions from older versions are moved, so none are looked up again.
  const ready = settings.migrateRegions().catch((err) => console.warn("[X Region Blocker]", err));
  const mutations = new MutationQueue(opts.mutationSpacingMs);
  const evaluating = new Set<string>();
  const work = new Set<Promise<unknown>>();

  const track = <T>(p: Promise<T>): Promise<T> => {
    work.add(p);
    p.catch((err) => console.warn("[X Region Blocker]", err)).finally(() => work.delete(p));
    return p;
  };

  const style = doc.createElement("style");
  style.textContent = STYLES;
  doc.head.appendChild(style);

  const badgesFor = (handle: string) =>
    [...doc.querySelectorAll<HTMLElement>(".xrb-badge")].filter(
      (b) => handleKey(b.dataset.xrbHandle!) === handleKey(handle),
    );

  const queue = new LookupQueue({
    lookup: (h) => gateway.lookupRegion(h),
    wanted: (h) => badgesFor(h).some((b) => !b.dataset.xrbCacheOnly && isVisible(b)),
    onResult: (h, r: LookupResult) => {
      track(
        settings
          .putRegion(h, { basedIn: r.basedIn, accurate: r.accurate, fetchedAt: now() })
          .then(() => refresh(h)),
      );
    },
    onPause: (until) => {
      paintWaiting();
      setTimeout(paintWaiting, Math.max(0, until - now()) + 50);
    },
    now,
    spacingMs: opts.lookupSpacingMs,
  });

  function makeBadge(handle: string, cacheOnly = false) {
    const badge = doc.createElement("span");
    badge.className = "xrb-badge xrb-loading";
    badge.dataset.xrbHandle = handle;
    if (cacheOnly) badge.dataset.xrbCacheOnly = "1";
    if (!cacheOnly) paintPending(badge);
    return badge;
  }

  /** A badge still waiting for its region: "…" while looking up, ⏳ while X's limit is reached. */
  function paintPending(badge: HTMLElement) {
    const until = queue.waitingUntil();
    badge.textContent = until ? "⏳" : "…";
    setTip(
      badge,
      until
        ? `Waiting for X's lookup limit; resumes at ${new Date(until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
        : "Looking up where this account is based",
    );
  }

  function paintWaiting() {
    for (const b of doc.querySelectorAll<HTMLElement>(".xrb-badge.xrb-loading:not([data-xrb-cache-only])")) {
      paintPending(b);
    }
  }

  function makeButtons(handle: string) {
    const wrap = doc.createElement("span");
    wrap.className = "xrb-actions";
    const blockBtn = doc.createElement("button");
    blockBtn.className = "xrb-block";
    setTip(blockBtn, `Block @${handle}`);
    blockBtn.textContent = "🚫";
    blockBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      track(handBlock(handle));
    });
    const spareBtn = doc.createElement("button");
    spareBtn.className = "xrb-spare";
    spareBtn.dataset.xrbHandle = handle;
    setTip(spareBtn, `Never block @${handle}`);
    spareBtn.textContent = "🛡";
    spareBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      track(toggleNeverBlock(handle));
    });
    wrap.append(blockBtn, spareBtn);
    return wrap;
  }

  function scan() {
    // Post authors, including quoted posts.
    for (const name of doc.querySelectorAll<HTMLElement>('[data-testid="User-Name"]:not([data-xrb-done])')) {
      if (name.closest('[data-testid="UserCell"]')) continue;
      name.dataset.xrbDone = "1";
      const handle = handleWithin(name);
      if (!handle) continue;
      name.appendChild(makeBadge(handle));
      const article = name.closest("article");
      const quoted = !!name.closest('div[role="link"]');
      if (article && !quoted && !article.dataset.xrbAuthor) {
        article.dataset.xrbAuthor = handle;
        name.appendChild(makeButtons(handle));
      }
      track(refresh(handle));
    }
    // Reposters ("@someone reposted").
    for (const ctx of doc.querySelectorAll<HTMLElement>('[data-testid="socialContext"]:not([data-xrb-done])')) {
      ctx.dataset.xrbDone = "1";
      const link = ctx.closest("a[href]") ?? ctx.querySelector("a[href]");
      const handle = handleFromHref(link?.getAttribute("href") ?? null);
      if (!handle) continue;
      ctx.closest("article")?.setAttribute("data-xrb-reposter", handle);
      (link ?? ctx).after(makeBadge(handle));
      track(refresh(handle));
    }
    // Follower and following lists: remembered regions only, no lookups.
    for (const cell of doc.querySelectorAll<HTMLElement>('[data-testid="UserCell"]:not([data-xrb-done])')) {
      cell.dataset.xrbDone = "1";
      const handle = handleWithin(cell);
      if (!handle) continue;
      const name = cell.querySelector('[data-testid="User-Name"]') ?? cell;
      name.setAttribute("data-xrb-done", "1");
      name.appendChild(makeBadge(handle, true));
      track(refresh(handle));
    }
    // Profile page header.
    for (const header of doc.querySelectorAll<HTMLElement>('[data-testid="UserName"]:not([data-xrb-done])')) {
      header.dataset.xrbDone = "1";
      const handle = handleFromHref(win.location.pathname);
      if (!handle) continue;
      header.append(makeBadge(handle), makeButtons(handle));
      track(refresh(handle));
    }
  }

  async function refresh(handle: string) {
    await ready;
    const info = await settings.region(handle);
    const badges = badgesFor(handle);
    if (!info) {
      if (badges.some((b) => !b.dataset.xrbCacheOnly)) queue.request(handle);
    } else {
      for (const b of badges) paintBadge(b, info);
    }
    const reason = await settings.exemptReason(handle);
    for (const btn of doc.querySelectorAll<HTMLElement>(".xrb-spare")) {
      if (handleKey(btn.dataset.xrbHandle!) === handleKey(handle)) {
        const on = reason === "never-block";
        btn.classList.toggle("xrb-on", on);
        setTip(btn, on ? `Allow blocking @${handle} again` : `Never block @${handle}`);
      }
    }
    if (await settings.isBlocked(handle)) {
      collapse(handle, await blockLabel(handle));
      return;
    }
    await evaluate(handle, info);
  }

  function paintBadge(badge: HTMLElement, info: RegionInfo) {
    badge.classList.remove("xrb-loading", "xrb-unknown");
    const warn = info.accurate ? "" : "⚠ ";
    if (info.basedIn === null) {
      badge.classList.add("xrb-unknown");
      badge.textContent = "?";
      setTip(badge, "X has no region for this account");
      return;
    }
    const country = countryFromBasedIn(info.basedIn);
    badge.textContent = warn + (country ? `${flagOf(country.code)} ${country.name}` : `🌐 ${info.basedIn}`);
    setTip(
      badge,
      info.accurate
        ? `Account based in ${info.basedIn}`
        : `Account based in ${info.basedIn}. X says this may be inaccurate (e.g. VPN).`,
    );
  }

  function highlight(handle: string, why: string) {
    for (const b of badgesFor(handle)) {
      b.classList.add("xrb-match");
      if (!b.dataset.xrbTip?.includes(why)) setTip(b, `${b.dataset.xrbTip} · ${why}`);
    }
  }

  async function evaluate(handle: string, info?: RegionInfo) {
    const key = handleKey(handle);
    if (evaluating.has(key)) return;
    evaluating.add(key);
    try {
      const rule = matchingRule(await settings.rules(), info?.basedIn ?? null, handle);
      if (!rule) return;
      const exempt = await settings.exemptReason(handle);
      if (await settings.paused()) return highlight(handle, `Matches ${rule.name} rule; paused`);
      const listed = rule.accounts?.some((a) => handleKey(a.handle) === key);
      if (!listed && !info?.accurate) return highlight(handle, `Matches ${rule.name} rule; not blocked because region may be inaccurate`);
      if (exempt === "never-block") return highlight(handle, `Matches ${rule.name} rule; marked Never block`);
      if (exempt === "unblocked") return highlight(handle, `Matches ${rule.name} rule; you unblocked this account`);
      await block(handle, { kind: "rule", ruleId: rule.id, ruleName: rule.name, basedIn: info?.basedIn ?? "" });
    } finally {
      evaluating.delete(key);
    }
  }

  async function block(handle: string, reason: BlockReason) {
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return false;
    return mutations.run(async () => {
      try {
        if (reason.kind === "rule") {
          // Recheck after waiting: Pause, exemptions or rules may have changed in the popup.
          const info = await settings.region(handle);
          const rule = matchingRule(await settings.rules(), info?.basedIn ?? null, handle);
          if (!rule || rule.id !== reason.ruleId || await settings.paused() ||
              await settings.exemptReason(handle) || await settings.isBlocked(handle)) return false;
          if (!rule.accounts?.some((a) => handleKey(a.handle) === handleKey(handle)) && !info?.accurate) return false;
          // Do not cache this across attempts: the user may have followed the account since the last check.
          if (await gateway.isFollowing(handle)) {
            highlight(handle, `Matches ${rule.name} rule; you follow this account`);
            return false;
          }
        }
        if (!(await gateway.block(handle))) {
          console.warn("[X Region Blocker] X did not confirm the block of", handle);
          if (reason.kind === "rule") await settings.setPaused(true);
          return false;
        }
        await settings.addLog({ handle, at: now(), reason });
        collapse(handle, labelFor(handle, reason));
        return true;
      } catch (error) {
        if (reason.kind === "rule" || error instanceof RateLimitedError) await settings.setPaused(true);
        throw error;
      }
    });
  }

  async function unblock(handle: string) {
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return false;
    return mutations.run(async () => {
      if (!(await gateway.unblock(handle))) return false;
      await settings.setExempt(handle, "unblocked");
      await settings.markUnblocked(handle);
      uncollapse(handle);
      return true;
    });
  }

  async function handBlock(handle: string) {
    if (await block(handle, { kind: "hand" })) showUndoToast(handle);
  }

  async function toggleNeverBlock(handle: string) {
    const on = (await settings.exemptReason(handle)) === "never-block";
    await settings.setExempt(handle, on ? null : "never-block");
    await refresh(handle);
  }

  const labelFor = (handle: string, reason: BlockReason) =>
    `Blocked: @${handle}` + (reason.kind === "rule" ? ` (${reason.ruleName} rule)` : "");

  async function blockLabel(handle: string) {
    const entry = (await settings.log()).findLast(
      (e) => !e.undone && handleKey(e.handle) === handleKey(handle),
    );
    return entry ? labelFor(handle, entry.reason) : `Blocked: @${handle}`;
  }

  function articlesBy(handle: string) {
    return [...doc.querySelectorAll<HTMLElement>("article")].filter(
      (a) =>
        handleKey(a.dataset.xrbAuthor ?? "") === handleKey(handle) ||
        handleKey(a.dataset.xrbReposter ?? "") === handleKey(handle),
    );
  }

  function collapse(handle: string, label: string) {
    for (const article of articlesBy(handle)) {
      if (article.classList.contains("xrb-collapsed")) continue;
      article.classList.add("xrb-collapsed");
      const line = doc.createElement("div");
      line.className = "xrb-blocked-line";
      line.textContent = label + " ";
      const undo = doc.createElement("button");
      undo.textContent = "Undo";
      undo.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        track(unblock(handle));
      });
      line.appendChild(undo);
      article.prepend(line);
    }
  }

  function uncollapse(handle: string) {
    for (const article of articlesBy(handle)) {
      article.classList.remove("xrb-collapsed");
      article.querySelector(".xrb-blocked-line")?.remove();
    }
  }

  function showUndoToast(handle: string) {
    const toast = doc.createElement("div");
    toast.className = "xrb-toast";
    toast.textContent = `Blocked @${handle} `;
    const undo = doc.createElement("button");
    undo.textContent = "Undo";
    undo.addEventListener("click", () => {
      toast.remove();
      track(unblock(handle));
    });
    toast.appendChild(undo);
    doc.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  // One fully opaque tooltip on top of the page, shown instantly on hover.
  const tip = doc.createElement("div");
  tip.className = "xrb-tip";
  tip.hidden = true;
  doc.body.appendChild(tip);
  const onOver = (e: Event) => {
    const target = (e.target as Element).closest?.<HTMLElement>("[data-xrb-tip]");
    if (!target) return;
    tip.textContent = target.dataset.xrbTip!;
    tip.hidden = false;
    const r = target.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.left = `${Math.max(4, Math.min(r.left + r.width / 2 - w / 2, win.innerWidth - w - 4))}px`;
    tip.style.top = `${r.bottom + 6}px`;
  };
  const onOut = (e: Event) => {
    if ((e.target as Element).closest?.("[data-xrb-tip]")) tip.hidden = true;
  };
  doc.addEventListener("mouseover", onOver);
  doc.addEventListener("mouseout", onOut);
  win.addEventListener("scroll", () => (tip.hidden = true), { passive: true });

  const observer = new win.MutationObserver(() => scan());
  observer.observe(doc.body, { childList: true, subtree: true });
  const onScroll = () => {
    // Accounts scrolled into view may need a lookup that was dropped earlier.
    for (const b of doc.querySelectorAll<HTMLElement>(".xrb-badge.xrb-loading:not([data-xrb-cache-only])")) {
      if (isVisible(b)) queue.request(b.dataset.xrbHandle!);
    }
  };
  win.addEventListener("scroll", onScroll, { passive: true });
  scan();

  return {
    scan,
    block,
    unblock,
    async idle() {
      while (work.size) await Promise.allSettled([...work]);
    },
    stop() {
      observer.disconnect();
      doc.removeEventListener("mouseover", onOver);
      doc.removeEventListener("mouseout", onOut);
      tip.remove();
      win.removeEventListener("scroll", onScroll);
    },
  };
}
