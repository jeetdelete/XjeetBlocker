import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const version = JSON.parse(readFileSync(resolve(import.meta.dirname, "package.json"), "utf8")).version;
const mobileHeader = `// ==UserScript==
// @name         XjeetBlocker
// @namespace    https://github.com/jeetdelete/XjeetBlocker
// @version      ${version}
// @description  Region badges, account blocking, rules and CSV lists for X on mobile browsers.
// @match        https://x.com/*
// @run-at       document-idle
// @inject-into  content
// @noframes
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.listValues
// ==/UserScript==`;

// Shared code builds as a desktop extension and as a standalone mobile userscript.
export default defineConfig(({ mode }) =>
  mode === "mobile"
    ? {
        publicDir: false,
        plugins: [{
          name: "userscript-metadata",
          generateBundle(_options, bundle) {
            const script = bundle["XjeetBlocker.user.js"];
            if (script?.type === "chunk") script.code = `${mobileHeader}\n${script.code}`;
          },
        }],
        build: {
          outDir: "dist-mobile",
          target: "es2022",
          lib: {
            entry: resolve(import.meta.dirname, "src/mobile/main.ts"),
            formats: ["iife"],
            name: "XjeetBlockerMobile",
            fileName: () => "XjeetBlocker.user.js",
          },
        },
      }
    : mode === "content"
    ? {
        publicDir: false,
        build: {
          emptyOutDir: false,
          lib: {
            entry: resolve(import.meta.dirname, "src/content/main.ts"),
            formats: ["iife"],
            name: "XRegionBlocker",
            fileName: () => "content.js",
          },
        },
      }
    : {
        root: "src/popup",
        publicDir: resolve(import.meta.dirname, "public"),
        base: "./",
        build: { outDir: resolve(import.meta.dirname, "dist"), emptyOutDir: true },
        test: { root: import.meta.dirname, environment: "jsdom", globals: true },
      },
);
