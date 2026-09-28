const MAX_BYTES = 4096;
const MAX_VIEW_BOX = 100000;

const ALLOWED_ELEMENTS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
]);

const ALLOWED_ATTRIBUTES = new Set([
  "viewBox",
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "width",
  "height",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "fill-rule",
  "clip-rule",
  "transform",
  "opacity",
  "xmlns",
  "viewbox",
]);

const ATTRIBUTE_PATTERN = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;

function reject(message) {
  const error = new Error(message);
  error.status = 400;
  error.isSvgRule = true;
  return error;
}

function isDangerousValue(value) {
  const lower = value.toLowerCase().replace(/\s+/g, "");
  return (
    lower.includes("javascript:") ||
    lower.includes("url(") ||
    lower.includes("data:") ||
    lower.includes("expression(") ||
    lower.includes("&#")
  );
}

export function sanitizeSvg(source) {
  if (typeof source !== "string" || source.trim() === "") {
    throw reject("Paste an SVG to use it.");
  }
  if (Buffer.byteLength(source, "utf8") > MAX_BYTES) {
    throw reject("That SVG is too large. The limit is 4 KB.");
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) {
    throw reject("DOCTYPE and entity declarations are not allowed.");
  }

  const open = source.match(/<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/);
  if (!open) throw reject("That could not be read as an SVG.");
  if (open[1].toLowerCase() !== "svg") {
    throw reject("An icon must be a single <svg> element.");
  }
  if (!/<\/svg>\s*$/i.test(source.trim())) {
    throw reject("An icon must be a single <svg> element.");
  }

  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^<>"']|"[^"]*"|'[^']*')*)>/g;
  let match = tagPattern.exec(source);
  let sawRoot = false;

  while (match) {
    const name = match[1].toLowerCase();
    if (!ALLOWED_ELEMENTS.has(name)) {
      throw reject(`<${name}> is not allowed in an icon.`);
    }
    if (name === "svg") sawRoot = true;

    const attrs = match[2] ?? "";
    ATTRIBUTE_PATTERN.lastIndex = 0;
    let attr = ATTRIBUTE_PATTERN.exec(attrs);
    while (attr) {
      const attrName = attr[1].toLowerCase();
      const attrValue = attr[3] ?? attr[4] ?? "";
      if (attrName.startsWith("on")) {
        throw reject(`Event handler "${attrName}" is not allowed in an icon.`);
      }
      if (attrName.includes("href")) {
        throw reject("Links are not allowed in an icon.");
      }
      if (!ALLOWED_ATTRIBUTES.has(attrName.toLowerCase())) {
        throw reject(`Attribute "${attrName}" is not allowed in an icon.`);
      }
      if (isDangerousValue(attrValue)) {
        throw reject(`The value of "${attrName}" is not allowed in an icon.`);
      }
      if (["viewbox", "width", "height"].includes(attrName.toLowerCase())) {
        const numeric = Number.parseFloat(attrValue);
        if (!Number.isFinite(numeric) || numeric < 0 || numeric > MAX_VIEW_BOX) {
          throw reject(`"${attrName}" is out of range.`);
        }
      }
      attr = ATTRIBUTE_PATTERN.exec(attrs);
    }

    match = tagPattern.exec(source);
  }

  if (!sawRoot) throw reject("An icon must be a single <svg> element.");

  const viewBox = source.match(/viewBox\s*=\s*("([^"]*)"|'([^']*)')/i);
  if (!viewBox) throw reject("An icon needs a viewBox.");

  return { viewBox: viewBox[2] ?? viewBox[3] };
}

export const SVG_MAX_BYTES = MAX_BYTES;
