import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Two builds: the popup as a normal page, and the content script as a single
// IIFE file, because Chrome content scripts cannot load ES module chunks.
export default defineConfig(({ mode }) =>
  mode === "content"
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
