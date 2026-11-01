# XjeetBlocker on Android and iPhone

Version 0.2.0 adds a standalone userscript for extension-capable mobile browsers. Use a current browser and userscript manager. This is an **experimental mobile release**: automated tests and a phone-sized desktop-browser UI check pass, but no physical Android/iPhone or live X API testing has been performed.

The script runs on **https://x.com/** in the browser. It does not run inside the native X app, mobile Chrome, or Firefox on iPhone. An ordinary desktop extension ZIP cannot be installed directly into Safari on iPhone.

## Download

- [Latest release](https://github.com/jeetdelete/XjeetBlocker/releases/latest)
- [Mobile installer: XjeetBlocker.user.js](https://github.com/jeetdelete/XjeetBlocker/releases/latest/download/XjeetBlocker.user.js)
- [Mobile ZIP with installer and these instructions](https://github.com/jeetdelete/XjeetBlocker/releases/latest/download/XjeetBlocker-mobile.zip)

## Android: Firefox + Tampermonkey

1. Install Firefox for Android.
2. In Firefox's Extensions menu, install [Tampermonkey from Mozilla Add-ons](https://addons.mozilla.org/en-GB/android/addon/tampermonkey/).
3. Open the mobile installer link above in Firefox. Accept Tampermonkey's installation prompt. If Firefox downloads it instead, use Tampermonkey's dashboard to import the downloaded `.user.js` file, or create a new script and replace its contents with that file.
4. Open **x.com in Firefox**, sign in, and reload the page.
5. Tap the **XjeetBlocker** button near the bottom right. Review the rules before turning off **Rules paused**. Reload X to apply them to posts already on screen.

## iPhone / iPad: Safari + Userscripts

1. Install [Userscripts from the App Store](https://apps.apple.com/app/userscripts/id1463298887), then open it once to establish its script folder.
2. Enable Userscripts in Safari's extension settings. Allow access to **x.com**; this script does not need access to every website.
3. Download `XjeetBlocker-mobile.zip`, extract it in Files, and move **XjeetBlocker.user.js** into the folder shown in the Userscripts app. Alternatively, open the `.user.js` installer URL in Safari and open Userscripts from Safari's extensions menu to install it.
4. Open Userscripts' Safari menu once so it discovers the file, then open **x.com in Safari**, sign in, and reload.
5. Tap the **XjeetBlocker** button. Review your rules before unpausing, then reload X to apply them to posts already on screen.

Safari extensions are configured in Settings → Apps → Safari → Extensions on recent iOS versions, or Settings → Safari → Extensions on older versions. The Safari page menu also provides extension controls.

## Features and data

The mobile build reuses the desktop rule engine and settings controls: region badges, Hand Block, Never block, Pause, block log, undo controls, and per-rule CSV import/export. The panel stays open while editing and uses larger touch targets. Imported accounts are blocked as they appear, not as an immediate bulk job.

Settings and lists use the userscript manager's `GM` storage APIs, **not X's localStorage**. Mobile and desktop installations have separate settings. To transfer accounts, export the desired rule's CSV on one device and import it into a rule on the other. CSV import has no extension-imposed file-size or account-count limit; device memory and browser limits still apply.

The manager is an additional trusted component with its own permissions and storage/sync behavior. This script asks for four storage grants only; it has no `@require`, cross-origin GM request grant, or downloaded executable dependency. The settings UI, file picker, and CSV download links are inside a closed shadow root so ordinary X-page DOM queries cannot inspect the panel's file inputs. This is not a guarantee against a compromised browser or manager.

Use one X tab and one signed-in X account per browser profile. Keep rules paused until you have checked them. X API changes, stale location data, and X automation enforcement remain risks; see [the security review](https://github.com/jeetdelete/XjeetBlocker/blob/main/SECURITY_REVIEW.md).

## Updates and troubleshooting

- Install the newer `.user.js` from the next release through the same manager. Do not create a second enabled copy. Export important lists before updating; this release does not provide a separate automatic-update service.
- No button: confirm the script is enabled, the manager has access to x.com, you are using the browser rather than the X app, and the file still ends in `.user.js` rather than `.txt`. Reload x.com.
- Buttons missing from posts: try the browser's **Request Desktop Site** option if X changes its mobile markup. This does not fix X API failures.
- Rules pause themselves: an action or safety check failed. Do not repeatedly unpause; check X's state and the browser/manager console first.
- CSV export: use the browser's Downloads/Files interface. Mobile browsers may show a preview or save sheet. CSV import uses the system file picker.
- Storage errors: check the manager supports `GM.getValue`, `GM.setValue`, `GM.deleteValue`, and `GM.listValues`. Do not substitute page localStorage for these APIs.

## Build and release

`npm run release:package` builds both targets, smoke-tests the compiled userscript, and produces the desktop ZIP, mobile ZIP, standalone mobile script, instructions, security report, and SHA-256 checksums in `release/v<version>/`. Release packaging requires Python 3 as well as Node.js. `npm run build` alone produces desktop assets in `dist/` and the bundled mobile script in `dist-mobile/`.

A standalone Safari App Store extension would require a separate signed distribution workflow. This release uses the existing Userscripts app; it does not include an IPA, APK, native Safari app, or browser-store submission.

## Platform references

- [Tampermonkey on Firefox Android](https://addons.mozilla.org/en-GB/android/addon/tampermonkey/)
- [Userscripts installation and storage API documentation](https://github.com/quoid/userscripts)
- [Chrome's mobile extension support statement](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/tCUm3kceybk)
- [Apple Safari extension distribution](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)
