# XjeetBlocker

A Chrome extension that lets you purge entire regions from your X timeline with extreme prejudice.

Built primarily for the majority of the clean world who are sick of the endless spam, scams, and low-effort sludge pouring out of **India, Nigeria, and Pakistan**.  
But it works just as well if you’re English and want to soft-genocide the French, a Serb who never wants to see another Bosnian, a Hutu tired of Zulus, or any other group that has worn out its welcome on your feed.

## What the fuck it does

- Stamps a big fat region badge next to every account so you can immediately see where the shit is coming from (🇮🇳 India, 🌐 South Asia, ❓ unknown, ⚠ “X is probably lying”)
- One-click **Hand Block** (🚫) with a 5-second undo window
- **Never block** (🛡) button for the rare accounts you actually want to keep
- Auto-blocks entire regions according to your rules  
  (defaults: India, Pakistan, Nigeria — the current global champions of timeline pollution)
- Skips people you follow, people you marked “never block”, people you already unblocked, and accounts X flags as “maybe we pulled this region out of our ass”
- Keeps a Block Log in the popup so you can admire the body count and mass-unblock if you ever get soft

The region rules are fully configurable. Point it at whoever is currently ruining your experience.

Terms are defined in [GLOSSARY.md](GLOSSARY.md).

## Install (Noob-Friendly Version)

### Option 1: From a Release (Easiest – Recommended for most people)

#### Windows

1. Go to the [Releases page](../../releases/latest) on this GitHub repo.
2. Download the file called `x-region-blocker.zip`.
3. Right-click the zip file → **Extract All…** → extract it somewhere easy (like your Desktop).
4. Open Google Chrome.
5. In the address bar type: `chrome://extensions` and press Enter.
6. Turn **on** the switch that says **Developer mode** (top right).
7. Click the **Load unpacked** button.
8. Select the folder you just extracted (the one that contains files like `manifest.json`).
9. Done. Go to x.com and the badges + block buttons should appear.

#### Mac

1. Go to the [Releases page](../../releases/latest) on this GitHub repo.
2. Download the file called `x-region-blocker.zip`.
3. Double-click the zip file to extract it (it will create a folder).
4. Open Google Chrome.
5. In the address bar type: `chrome://extensions` and press Enter.
6. Turn **on** the switch that says **Developer mode** (top right).
7. Click the **Load unpacked** button.
8. Select the folder you just extracted (the one that contains files like `manifest.json`).
9. Done. Go to x.com and the badges + block buttons should appear.

---

### Option 2: Build from Source (Only if you know what a terminal is)

#### Windows

1. Install [Node.js](https://nodejs.org/) (just download the LTS version and click Next a bunch of times).
2. Open **Command Prompt** or **PowerShell**.
3. Type these commands one by one and press Enter after each:

```bash
git clone https://github.com/jeetdelete/XjeetBlocker.git
cd XjeetBlocker
npm install
npm run build
```
