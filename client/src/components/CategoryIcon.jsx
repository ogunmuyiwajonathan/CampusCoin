import React, { useMemo } from "react";
import Icon from "./Icon.jsx";
import {
  CATEGORY_ICON_KEYS,
  categoryIconKeyFor,
} from "../data/categoryIcons.js";
import { sanitizeSvg } from "../lib/sanitizeSvg.js";

function renderElements(node, keyPrefix) {
  return node.children.map((child, index) => {
    const nested = renderElements(child, `${keyPrefix}-${index}`);
    return React.createElement(
      child.type,
      { key: `${keyPrefix}-${index}`, ...child.props },
      nested.length > 0 ? nested : undefined,
    );
  });
}

function SvgShape({ iconSvg, size, className, label }) {
  const parsed = useMemo(() => {
    try {
      return sanitizeSvg(iconSvg);
    } catch {
      return null;
    }
  }, [iconSvg]);

  if (!parsed) return null;

  const { type, props, children } = parsed.elements;
  const nested = renderElements(parsed.elements, "s");
  const rootProps = { ...props, width: size, height: size, className };
  if (!label) rootProps["aria-hidden"] = "true";

  return React.createElement(
    type,
    rootProps,
    children.length > 0 ? nested : undefined,
  );
}

export default function CategoryIcon({
  category,
  iconKey,
  iconSvg,
  size = 18,
  className,
  label,
}) {
  const key = iconKey ?? category?.icon_key ?? null;
  const svg = iconSvg ?? category?.icon_svg ?? null;
  const name = category?.name ?? null;

  const resolved =
    (key && CATEGORY_ICON_KEYS.includes(key) ? key : null) ??
    categoryIconKeyFor(name);

  if (svg) {
    return <SvgShape iconSvg={svg} size={size} className={className} label={label} />;
  }

  return <Icon name={resolved} size={size} className={className} />;
}
