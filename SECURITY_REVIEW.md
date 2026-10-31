# Security and privacy review — XjeetBlocker

Reviewed 31 October 2026. This is a source review and regression-test exercise by the coding assistant that helped implement the extension, not an independent security audit.

## Scope and release verification

Baseline: **v0.1.0**, commit `e3e36d20f6b4d8d48bedfea9f7360c1f78e4e343`. Reviewed all application source, the manifest, popup HTML, build configuration, package metadata and lockfile, and the published `x-region-blocker.zip`.

The downloaded v0.1.0 ZIP has SHA-256:

```text
a6e0a03256a3cb5cc40d1823e4a3a66e89bab6ce63695ceb5646c6ad75dc669f
```

Its four files (`manifest.json`, `index.html`, `content.js`, and the popup JavaScript asset) matched a local rebuild of the baseline byte-for-byte, with no extra files. That verifies the artifact inspected matches that build; it does not provide signed provenance or prove the build tools are trustworthy.

Fixes described below are in **v0.1.1**. The old ZIP remains historical and does not acquire the fixes when the repository changes. Install the newer release.

## Confirmed findings and remediation

Line references in the first column below are pinned to the original v0.1.0 source. Severity reflects practical impact here, rather than asserting every upstream advisory is exploitable through the installed extension.

| Severity and original location | Finding and evidence | Fix in v0.1.1 |
| --- | --- | --- |
| High for developers — [package.json:15](https://github.com/jeetdelete/XjeetBlocker/blob/e3e36d20f6b4d8d48bedfea9f7360c1f78e4e343/package.json#L15) | `npm audit` reported five affected dependency packages, including upstream critical Vitest/Tinypool advisories and high-severity Vite findings. These affect development/test tooling under the advisory conditions, such as an exposed API/UI/dev server; they are not runtime libraries shipped inside the extension. | Upgraded and pinned Vite to 8.3.5 and Vitest to 5.0.5; regenerated the lockfile. A fresh audit reports zero known vulnerabilities. Existing scripts use one-shot tests/builds rather than a publicly exposed server. |
| Medium — [settings.ts:109](https://github.com/jeetdelete/XjeetBlocker/blob/e3e36d20f6b4d8d48bedfea9f7360c1f78e4e343/src/core/settings.ts#L109) | Exemptions and logs were shared read-modify-write objects. A reproduction with 20 simultaneous log additions retained only one. Concurrent exemption writes and simultaneous unblocks also lost updates. A valid `__proto__` handle could not reliably receive an exemption because of object-prototype semantics. Losing an exemption can cause an unwanted automatic block. | Exemptions now have separate storage keys per handle; log records have unique keys. Legacy data stays readable, with newer updates overriding it. Own-property checks handle prototype-shaped names safely. Regression tests cover concurrency, legacy data, and special handles. |
| Medium — [xApi.ts:92](https://github.com/jeetdelete/XjeetBlocker/blob/e3e36d20f6b4d8d48bedfea9f7360c1f78e4e343/src/content/xApi.ts#L92) | A missing `following` field was coerced to `false`. If X changed its response format, the extension could treat followed accounts as unprotected. Following results were cached for the page's lifetime, even after the user followed an account. | Require a boolean following result; otherwise fail closed and pause automatic rules. Recheck following status at execution time instead of caching it across attempts. |
| Medium account-safety risk — [app.ts:277](https://github.com/jeetdelete/XjeetBlocker/blob/e3e36d20f6b4d8d48bedfea9f7360c1f78e4e343/src/content/app.ts#L277), [settings.ts:73](https://github.com/jeetdelete/XjeetBlocker/blob/e3e36d20f6b4d8d48bedfea9f7360c1f78e4e343/src/core/settings.ts#L73) | Automatic blocking started immediately by default, without mutation spacing or stopping after unconfirmed blocks. A long feed could send many account changes. This is an operational/account risk, not evidence of account compromise. | Start paused if no preference was saved. Serialize block/unblock operations with a 1.5-second gap after completion in each tab. Recheck rules, Pause, exemptions, and following before executing queued automatic blocks. Pause rules after automatic-action failures or uncertainty; do not retry mutations automatically. This mitigates bursts but is not a global rate limit across tabs or a guarantee of account safety. |
| Low privacy exposure — [manifest.json:6](https://github.com/jeetdelete/XjeetBlocker/blob/e3e36d20f6b4d8d48bedfea9f7360c1f78e4e343/public/manifest.json#L6) | `tabs` could expose sensitive metadata about tabs on unrelated websites, although the actual code only queried X tabs. The separate asset-host permission was also unnecessary for the content-script fetch. No unrelated-tab collection was found. | Removed `tabs` and the asset-host permission. Retained the X host permission, which is sufficient for querying matching tabs. |
| Low network-boundary hardening — [xApi.ts:26](https://github.com/jeetdelete/XjeetBlocker/blob/e3e36d20f6b4d8d48bedfea9f7360c1f78e4e343/src/content/xApi.ts#L26) | A substring test accepted script URLs such as `https://evil.example/abs.twimg.com.js`. An attacker able to modify X's DOM could trigger requests to an unrelated destination. This metadata request did not attach the X authentication headers, so this finding does not demonstrate session-token theft. | Require the exact HTTPS asset origin, reject embedded credentials and redirects, and fetch metadata without cookies or referrer. API requests also reject redirects. Returned JavaScript is parsed as text for a query ID and never executed. |
| Low correctness and boundary hardening — [xApi.ts:60](https://github.com/jeetdelete/XjeetBlocker/blob/e3e36d20f6b4d8d48bedfea9f7360c1f78e4e343/src/content/xApi.ts#L60), [main.ts:8](https://github.com/jeetdelete/XjeetBlocker/blob/e3e36d20f6b4d8d48bedfea9f7360c1f78e4e343/src/content/main.ts#L8) | Any response with a `screen_name` property counted as a confirmed block. Popup messages checked only type and string shape. No externally connectable messaging endpoint was present, so arbitrary websites were not demonstrated to have direct messaging access. | Require the requested handle and the expected boolean `blocking` state before logging success. Validate handles before network requests. Restrict unblock messages to this extension's popup URL and extension ID. |

Editing a disabled rule could also restore an outdated enabled flag from the popup closure ([original popup.ts:107](https://github.com/jeetdelete/XjeetBlocker/blob/e3e36d20f6b4d8d48bedfea9f7360c1f78e4e343/src/popup/popup.ts#L107)). This medium account-safety issue is fixed by updating the local toggle state and preserving the latest saved enabled flag when the editor saves. A popup regression test covers toggling off, renaming, and saving without re-enabling the rule.

The current implementation locations are `src/core/settings.ts:103` (safe persistence), `src/content/xApi.ts:27` (asset origin), `src/content/xApi.ts:63` (mutation confirmation), `src/content/xApi.ts:102` (following check), `src/content/app.ts:277` (queued safety checks), `src/core/mutationQueue.ts:1` (request spacing), and `src/content/main.ts:8` (message authorization).

## Permissions and account access

- **`storage`** is required for rules, saved account locations, exemptions, imported lists, and the block log.
- **`unlimitedStorage`** supports large locally stored lists and caches. It relaxes storage quotas; it does not grant access to other sites. File-size and account-count import limits remain removed as requested. Device memory, disk capacity, and browser limits still apply.
- **`https://x.com/*` host access and a content script on X** allow reading/modifying X page DOM and making authenticated requests on that origin. Technically the content script can see visible page information, potentially including private content displayed on X; the reviewed code selects account links and names rather than collecting post bodies or DMs. This is still a powerful permission, not a sandbox limiting the extension to account names.
- No `cookies`, `history`, `webRequest`, `debugger`, all-sites access, service worker, external messaging declaration, or web-accessible resource declaration is present.

The content script reads X's JavaScript-readable `ct0` CSRF cookie and includes that value in authenticated X request headers. `credentials: include` lets the browser attach applicable session cookies, including HttpOnly cookies the script cannot directly read. It does not ask for your X password or store session cookies/tokens in extension storage. The hard-coded bearer value is static in public source, not read from your personal account. I did not independently validate X's current acceptance of that value.

The implemented account-changing calls are block and unblock. The extension can perform those real changes on the currently signed-in X account; collapsing a post in the page is additional UI behavior. No posting, messaging, following, or profile-edit API call was found. Its same-origin session access is technically powerful enough that a malicious future extension version could do more, so future updates also require trust.

## Data storage and destinations

| Data | Storage or destination |
| --- | --- |
| Rules, imported handles/country/region metadata, Pause, exemptions, timestamps and reasons for blocks, cached X locations | `chrome.storage.local`, in the Chrome profile. No app-level encryption or expiry. This is not Chrome Sync storage. |
| Account handles being looked up, followed-status queries, block/unblock targets, CSRF header and applicable session cookies | HTTPS requests to `x.com` only. |
| Script text used to discover X's changing query ID | HTTPS fetches from the exact `abs.twimg.com` origin, without credentials/referrer. Text is inspected, not executed. CORS may prevent reading it, in which case the fallback query ID is used. |
| Exported CSV | A local download initiated in the popup. Sharing it discloses account selections and location metadata. |

No analytics endpoint, telemetry, external upload, password harvesting, remote `eval`, dynamic execution of downloaded scripts, or app-controlled third-party data destination was found in the application source or inspected bundles. This is a bounded code-review observation, not proof that malicious behavior is impossible. X itself already receives the extension's API requests.

The popup uses DOM text APIs rather than HTML interpolation for imported account metadata. CSV parsing validates handles and column structure. Export escapes quotes and prefixes potentially executable spreadsheet-formula fields with an apostrophe. Imported location claims never replace the X lookup cache, but listed handles intentionally match regardless of their reported location.

## Dependencies and builds

There are no production npm dependencies; Vite/Vitest/jsdom/TypeScript and Chrome type definitions are development dependencies. The inspected lockfile's resolved package tarballs use the npm registry and integrity hashes. No project `preinstall`, `install`, or `postinstall` hook exists. Baseline esbuild and optional fsevents packages declared installation hooks; after the update only optional fsevents declares one. A clean `npm ci --ignore-scripts` build/test workflow avoids those lifecycle hooks. This review did not manually audit every transitive dependency or native binary.

Chrome MV3's normal packaged-code restrictions apply. The build emits local popup assets and one bundled content script. Downloaded X scripts are never added to the extension execution context.

## Validation and remaining uncertainty

Regression tests reproduce the old storage, following-response, asset-URL, and response-confirmation issues and verify the fixes. Tests also cover the request queue, paused default, failure cancellation, popup sender restrictions, CSV behavior, and prior application behavior. All 66 tests passed after a clean `npm ci --ignore-scripts`; TypeScript checks and both production builds passed. The patched lockfile has zero vulnerabilities reported by `npm audit` at review time. Known-advisory scans do not detect every vulnerability.

Important remaining limits:

1. No live account mutations, real Chrome extension installation, or live X response-schema validation were performed during this review. Stricter confirmation checks may refuse responses that omit fields rather than incorrectly report success. X's private APIs and query IDs can change without notice.
2. The 1.5-second queue is **per tab**. Multiple X tabs can still make overlapping requests; use one tab for automatic rules. Pausing stops future queued automatic actions after their checks, not a request already sent.
3. Location cache entries are retained indefinitely and keyed by handle. Locations can become stale and handles can be reassigned. Lists and logs are shared within the Chrome profile rather than separated by signed-in X account. An X-side unblock made outside the extension does not automatically update its local log. Use a separate Chrome profile and one X account; do not assume the local log is X's authoritative current block list.
4. Very large CSVs are read/parsed in memory and may freeze or exhaust the popup. No arbitrary size cap was reintroduced. A streaming importer would improve resource use but cannot remove finite device limits.
5. Following checks and account changes are separate requests, so a follow change or account switch in between them cannot be made atomic by this extension.
6. The extension shares the page DOM with X. A compromised X page or other installed software/extensions remains outside the protection provided by this code review.
7. Automated blocking through undocumented web APIs may violate X's rules and can lead to restrictions or suspension. Request spacing and paused defaults do not establish compliance or eliminate that risk.

## Practical recommendation

I would skip v0.1.0 and only trial v0.1.1 in a separate Chrome profile with one X tab, rules paused initially, and a review of the selected rules/imported accounts. I would not enable automatic blocking on an account whose loss would be unacceptable without independent review and live compatibility testing. If you require strong assurance or guaranteed platform compliance, I would not install it on your main account. No absence of findings, passing test suite, or clean dependency scan establishes safety.

## Primary references

- [Chrome tabs permissions](https://developer.chrome.com/docs/extensions/reference/api/tabs): host access provides matching-tab metadata, so the broader `tabs` permission was removable.
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts): isolated JavaScript context with access to page DOM.
- [Chrome cross-origin requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests): content-script requests remain subject to the page origin/CORS.
- [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage): extension-local persistence and storage permissions.
- [Vitest's critical API-server advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-9crc-q9x8-hgqq): server-dependent developer risk, not an installed-extension exploit.
- [Vite's dev-server advisory](https://github.com/vitejs/vite/security/advisories/GHSA-vg6x-rcgg-rjx6): website access to vulnerable development servers.
- [X automation rules](https://help.x.com/en/rules-and-policies/x-automation): automation restrictions and possible enforcement.
