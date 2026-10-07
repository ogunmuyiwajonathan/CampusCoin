// Palette contrast test: node tests/palette-contrast.mjs
//
// The palette is defined once in client/src/index.css as CSS custom
// properties, in both a light and a dark block. Contrast is easy to break by
// editing a hex value, and the failure is invisible in review, so the pairs the
// app actually renders are asserted here against the real hex values read out
// of that file.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cssPath = fileURLToPath(new URL("../../client/src/index.css", import.meta.url));
const css = readFileSync(cssPath, "utf8");

/** Tailwind's stock light slate-100; the custom palette only overrides it in dark mode. */
const SLATE_100_LIGHT = "#f1f5f9";

let passed = 0;
let failed = 0;

function check(label, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` -> ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` -> ${detail}` : ""}`);
  }
}

/** Pull `--name: #hex;` out of a block that starts at `start`. */
function blockVars(start) {
  const end = css.indexOf("}", start);
  const body = css.slice(start, end);
  const vars = {};
  for (const [, name, hex] of body.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    vars[name] = hex;
  }
  return vars;
}

const themeStart = css.indexOf("@theme");
const lightStart = css.indexOf(":root");
const darkStart = css.indexOf(".dark {");

check("light variables were found", lightStart > 0, String(lightStart));
check("dark variables were found", darkStart > 0, String(darkStart));
check("the theme block was found", themeStart > 0, String(themeStart));

const dark = blockVars(darkStart);
// The light block inherits from @theme, so merge: dark overrides, theme fills.
const theme = (() => {
  const end = css.indexOf("}", themeStart);
  const body = css.slice(themeStart, end);
  const vars = {};
  for (const [, name, hex] of body.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    vars[name] = hex;
  }
  return vars;
})();
const light = { ...theme, ...blockVars(lightStart) };

const srgb = (hex) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const channel = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const [r, g, b] = srgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
};

// WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text (>=18.66px bold or
// 24px regular). Every case below renders at text-sm or smaller, so all of them
// are held to 4.5.
// brand-500 is deliberately never used behind white text: it measures 3.77:1,
// below the 4.5 that text-sm needs. It stays in the palette for non-text uses
// (progress bars, active dots, avatars).
const cases = [
  { theme: "light", label: "white on brand-700 (primary buttons, incl. the auth pages)", fg: "#ffffff", bg: light["brand-700"] },
  { theme: "light", label: "white on brand-800 (primary hover)", fg: "#ffffff", bg: light["brand-800"] },
  { theme: "light", label: "ink-500 on surface (muted body copy)", fg: light["ink-500"], bg: light.surface },
  { theme: "light", label: "ink-900 on slate-100 (assistant bubble)", fg: light["ink-900"], bg: light["slate-100"] ?? SLATE_100_LIGHT },
  { theme: "light", label: "ink-500 on slate-100 (muted copy in a bubble)", fg: light["ink-500"], bg: light["slate-100"] ?? SLATE_100_LIGHT },
  { theme: "light", label: "red-500 on surface (error text)", fg: light["red-500"], bg: light.surface },
  { theme: "light", label: "sage-400 on forest-900 (Sidebar rail)", fg: light["sage-400"], bg: light["forest-900"] },
  { theme: "light", label: "sage-400 on forest-800 (Sidebar hover)", fg: light["sage-400"], bg: light["forest-800"] },
  { theme: "dark", label: "ink-500 on surface (muted copy)", fg: dark["ink-500"], bg: dark.surface },
  { theme: "dark", label: "ink-900 on slate-100 (assistant bubble)", fg: dark["ink-900"], bg: dark["slate-100"] },
  { theme: "dark", label: "slate-400 on surface (muted copy on a dark control)", fg: dark["slate-400"], bg: dark.surface },
  { theme: "dark", label: "ink-500 on slate-100 (muted copy in a bubble)", fg: dark["ink-500"], bg: dark["slate-100"] },
];

console.log("\nlight theme");
for (const c of cases.filter((x) => x.theme === "light")) {
  if (!c.fg || !c.bg) {
    check(c.label, false, "a variable was missing from the palette");
    continue;
  }
  const r = contrast(c.fg, c.bg);
  check(c.label, r >= 4.5, `${r.toFixed(2)}:1 (needs 4.5)`);
}

console.log("\ndark theme");
for (const c of cases.filter((x) => x.theme === "dark")) {
  if (!c.fg || !c.bg) {
    check(c.label, false, "a variable was missing from the dark palette");
    continue;
  }
  const r = contrast(c.fg, c.bg);
  check(c.label, r >= 4.5, `${r.toFixed(2)}:1 (needs 4.5)`);
}

console.log("\nnon-text UI contrast (WCAG 1.4.11 needs 3:1)");
const uiCases = [
  { label: "brand-500 control edge on surface (light)", fg: light["brand-500"], bg: light.surface },
  { label: "forest-800 rail against page (light)", fg: light["forest-800"], bg: light.surface },
  { label: "brand-500 control edge on surface (dark)", fg: dark["brand-500"], bg: dark.surface },
];
for (const c of uiCases) {
  const r = contrast(c.fg, c.bg);
  check(c.label, r >= 3, `${r.toFixed(2)}:1 (needs 3)`);
}

console.log(`\n=============== RESULT: ${passed} passed, ${failed} failed ===============\n`);
process.exit(failed === 0 ? 0 : 1);