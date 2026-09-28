import assert from "node:assert/strict";
import {
  categoryBodySchema,
  categoryPatchSchema,
  CATEGORY_ICON_KEYS,
} from "../src/validators/category.schema.js";
import { sanitizeSvg } from "../src/utils/sanitizeSvg.js";

const SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16v16H4z"/></svg>';

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok    ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  FAIL  ${name}: ${error.message}`);
  }
}

function rejects(schema, body) {
  const result = schema.safeParse(body);
  assert.equal(result.success, false, "expected the payload to be rejected");
  return result.error.issues[0]?.message ?? "";
}

check("a registry key from the curated list is accepted", () => {
  const result = categoryBodySchema.safeParse({
    name: "Food",
    type: "expense",
    icon_key: CATEGORY_ICON_KEYS[0],
  });
  assert.equal(result.success, true);
});

check("an unknown registry key is rejected with a readable message", () => {
  const message = rejects(categoryBodySchema, {
    name: "Food",
    type: "expense",
    icon_key: "not-a-real-icon",
  });
  assert.match(message, /not one of the available icons/i);
});

check("a valid SVG is accepted", () => {
  const result = categoryBodySchema.safeParse({
    name: "Food",
    type: "expense",
    icon_svg: SVG,
  });
  assert.equal(result.success, true);
});

check("a <script> element is rejected", () => {
  const message = rejects(categoryBodySchema, {
    name: "Food",
    type: "expense",
    icon_svg: SVG.replace("<path", "<script>alert(1)</script><path"),
  });
  assert.match(message, /script|not allowed/i);
});

check("an onload attribute is rejected", () => {
  const message = rejects(categoryBodySchema, {
    name: "Food",
    type: "expense",
    icon_svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><path d="M0 0"/></svg>',
  });
  assert.match(message, /Event handler/i);
});

check("a <foreignObject> is rejected", () => {
  const message = rejects(categoryBodySchema, {
    name: "Food",
    type: "expense",
    icon_svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><foreignObject><b>x</b></foreignObject></svg>',
  });
  assert.match(message, /foreignObject|not allowed/i);
});

check("an external href is rejected", () => {
  const message = rejects(categoryBodySchema, {
    name: "Food",
    type: "expense",
    icon_svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><a href="https://example.com"><path d="M0 0"/></a></svg>',
  });
  assert.match(message, /<a>|not allowed/i);
});

check("a javascript: value is rejected", () => {
  const message = rejects(categoryBodySchema, {
    name: "Food",
    type: "expense",
    icon_svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0" fill="javascript:alert(1)"/></svg>',
  });
  assert.match(message, /not allowed/i);
});

check("a url(...) value is rejected", () => {
  const message = rejects(categoryBodySchema, {
    name: "Food",
    type: "expense",
    icon_svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0" fill="url(#x)"/></svg>',
  });
  assert.match(message, /not allowed/i);
});

check("an SVG over 4 KB is rejected", () => {
  const padding = "M0 0 ".repeat(900);
  const oversized = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="${padding}"/></svg>`;
  const message = rejects(categoryBodySchema, {
    name: "Food",
    type: "expense",
    icon_svg: oversized,
  });
  assert.match(message, /too large|not be used/i);
});

check("a DOCTYPE / entity trick is rejected", () => {
  const message = rejects(categoryBodySchema, {
    name: "Food",
    type: "expense",
    icon_svg: `<!DOCTYPE svg [<!ENTITY x "y">]>${SVG}`,
  });
  assert.match(message, /DOCTYPE|entity/i);
});

check("an SVG with no viewBox is rejected", () => {
  const message = rejects(categoryBodySchema, {
    name: "Food",
    type: "expense",
    icon_svg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>',
  });
  assert.match(message, /viewBox/i);
});

check("sending icon_key and icon_svg together is rejected", () => {
  const message = rejects(categoryBodySchema, {
    name: "Food",
    type: "expense",
    icon_key: "utensils",
    icon_svg: SVG,
  });
  assert.match(message, /not both/i);
});

check("a patch may set only the icon key", () => {
  const result = categoryPatchSchema.safeParse({ icon_key: "coffee" });
  assert.equal(result.success, true);
});

check("the patch schema rejects both icon fields too", () => {
  const message = rejects(categoryPatchSchema, { icon_key: "coffee", icon_svg: SVG });
  assert.match(message, /not both/i);
});

check("neither field set is allowed so old rows still validate", () => {
  const result = categoryBodySchema.safeParse({ name: "Food", type: "expense" });
  assert.equal(result.success, true);
});

check("sanitizeSvg returns a usable viewBox for a good icon", () => {
  const out = sanitizeSvg(SVG);
  assert.equal(out.viewBox, "0 0 24 24");
});

check("sanitizeSvg throws on an <img> element", () => {
  assert.throws(() => sanitizeSvg('<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><image href="x.png"/></svg>'));
});

check("sanitizeSvg throws on a <style> element", () => {
  assert.throws(() => sanitizeSvg('<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>*{}</style></svg>'));
});

console.log(`\n  ${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  process.exit(1);
}
