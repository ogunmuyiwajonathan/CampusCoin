const MAX_BYTES = 4096;

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
]);

const COLOR_ATTRIBUTES = new Set(["fill", "stroke"]);

const ELEMENT_NAMES = {
  svg: "svg",
  g: "g",
  path: "path",
  circle: "circle",
  ellipse: "ellipse",
  rect: "rect",
  line: "line",
  polyline: "polyline",
  polygon: "polygon",
};

const REACT_PROPS = {
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  viewBox: "viewBox",
};

const MAX_VIEW_BOX = 100000;

function isDangerousValue(value) {
  const lower = value.toLowerCase().replace(/\s+/g, "");
  return (
    lower.includes("javascript:") ||
    lower.includes("url(") ||
    lower.includes("data:") ||
    lower.includes("&#") ||
    lower.includes("expression(")
  );
}

function hasDoctypeOrEntity(source) {
  return /<!DOCTYPE|<!ENTITY/i.test(source);
}

function convertAttrs(tag, context) {
  const props = {};
  for (const attr of Array.from(tag.attributes)) {
    const name = attr.name;
    const value = attr.value;

    if (name.startsWith("on")) {
      throw new Error(`Event handler "${name}" is not allowed in an icon.`);
    }
    if (name === "href" || name === "xlink:href" || name.includes("href")) {
      throw new Error("Links are not allowed in an icon.");
    }
    if (!ALLOWED_ATTRIBUTES.has(name)) {
      throw new Error(`Attribute "${name}" is not allowed in an icon.`);
    }
    if (isDangerousValue(value)) {
      throw new Error(`The value of "${name}" is not allowed in an icon.`);
    }

    if (COLOR_ATTRIBUTES.has(name) && value.toLowerCase() !== "none") {
      props[REACT_PROPS[name] ?? name] = "currentColor";
      continue;
    }

    if (name === "viewBox" || name === "width" || name === "height") {
      const numeric = Number.parseFloat(value);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > MAX_VIEW_BOX) {
        throw new Error(`"${name}" is out of range.`);
      }
    }

    props[REACT_PROPS[name] ?? name] = value;
  }

  if (context.root && !props.viewBox) {
    throw new Error("An icon needs a viewBox.");
  }
  return props;
}

function convertNode(node, context) {
  if (node.nodeType === 3) return null;
  if (node.nodeType !== 1) {
    throw new Error("An icon may only contain shapes and groups.");
  }

  const tag = node.tagName.toLowerCase();
  if (!ALLOWED_ELEMENTS.has(tag)) {
    throw new Error(`<${tag}> is not allowed in an icon.`);
  }
  if (context.root && tag !== "svg") {
    throw new Error("An icon must have a single <svg> at the top.");
  }

  const props = convertAttrs(node, context);
  const children = [];
  for (const child of Array.from(node.childNodes)) {
    const converted = convertNode(child, { ...context, root: false });
    if (converted) children.push(converted);
  }

  return { type: ELEMENT_NAMES[tag], props, children };
}

export function sanitizeSvg(source) {
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Paste an SVG to use it.");
  }
  if (new Blob([source]).size > MAX_BYTES) {
    throw new Error("That SVG is too large. The limit is 4 KB.");
  }
  if (hasDoctypeOrEntity(source)) {
    throw new Error("DOCTYPE and entity declarations are not allowed.");
  }

  let doc;
  try {
    doc = new DOMParser().parseFromString(source, "image/svg+xml");
  } catch {
    throw new Error("That could not be read as an SVG.");
  }

  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("That is not valid SVG.");
  }

  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") {
    throw new Error("An icon must be a single <svg> element.");
  }
  if (root.getAttribute("xmlns") !== "http://www.w3.org/2000/svg") {
    throw new Error("The SVG is missing its xmlns.");
  }

  const node = convertNode(root, { root: true });
  return { viewBox: node.props.viewBox, elements: node };
}

export const SVG_MAX_BYTES = MAX_BYTES;
