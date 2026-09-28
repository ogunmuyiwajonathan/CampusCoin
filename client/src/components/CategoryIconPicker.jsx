import { useId, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import CategoryIcon from "./CategoryIcon.jsx";
import { CATEGORY_ICON_OPTIONS } from "../data/categoryIcons.js";
import { sanitizeSvg, SVG_MAX_BYTES } from "../lib/sanitizeSvg.js";

const TABS = [
  { id: "icons", label: "Icons" },
  { id: "svg", label: "Custom SVG" },
];

export default function CategoryIconPicker({
  iconKey,
  iconSvg,
  onChange,
  error,
}) {
  const [tab, setTab] = useState(iconSvg ? "svg" : "icons");
  const [draft, setDraft] = useState(iconSvg ?? "");
  const [svgError, setSvgError] = useState("");
  const fileRef = useRef(null);
  const baseId = useId();

  const shown = svgError ? "" : draft.trim();

  const applyDraft = (value) => {
    setDraft(value);
    if (!value.trim()) {
      setSvgError("");
      onChange({ iconKey: null, iconSvg: null });
      return;
    }
    try {
      sanitizeSvg(value);
      setSvgError("");
      onChange({ iconKey: null, iconSvg: value.trim() });
    } catch (err) {
      setSvgError(err.message);
    }
  };

  const pick = (key) => {
    setSvgError("");
    onChange({ iconKey: key, iconSvg: null });
  };

  const clearAll = () => {
    setDraft("");
    setSvgError("");
    onChange({ iconKey: null, iconSvg: null });
  };

  const upload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > SVG_MAX_BYTES) {
      setSvgError("That file is too large. The limit is 4 KB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => applyDraft(String(reader.result ?? ""));
    reader.onerror = () => setSvgError("That file could not be read.");
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="rounded-card border border-slate-200 bg-surface p-3">
      <div className="flex items-center gap-2">
        <div
          role="tablist"
          aria-label="Icon source"
          className="flex rounded-lg bg-mint-50 p-1"
        >
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${entry.id}`}
              aria-selected={tab === entry.id}
              aria-controls={`${baseId}-panel-${entry.id}`}
              onClick={() => setTab(entry.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                tab === entry.id
                  ? "bg-surface text-ink-900 shadow-card"
                  : "text-ink-500 hover:text-ink-900"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-ink-500">Preview</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CategoryIcon
              iconKey={iconSvg ? null : iconKey}
              iconSvg={iconSvg ?? shown}
              size={20}
            />
          </span>
        </div>
      </div>

      {tab === "icons" ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-icons`}
          aria-labelledby={`${baseId}-tab-icons`}
          className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-8"
        >
          {CATEGORY_ICON_OPTIONS.map((option) => {
            const active = !iconSvg && iconKey === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-label={option.label}
                aria-pressed={active}
                onClick={() => pick(option.key)}
                className={`flex h-10 items-center justify-center rounded-lg border transition ${
                  active
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-transparent text-ink-500 hover:bg-mint-50 hover:text-ink-900"
                }`}
              >
                <Icon name={option.key} size={18} />
              </button>
            );
          })}
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`${baseId}-panel-svg`}
          aria-labelledby={`${baseId}-tab-svg`}
          className="mt-3 space-y-2"
        >
          <label
            htmlFor={`${baseId}-svg`}
            className="block text-xs font-semibold text-ink-900"
          >
            Paste an SVG
          </label>
          <textarea
            id={`${baseId}-svg`}
            value={draft}
            onChange={(event) => applyDraft(event.target.value)}
            rows={4}
            spellCheck={false}
            placeholder="&lt;svg viewBox=&quot;0 0 24 24&quot;&gt;…&lt;/svg&gt;"
            aria-invalid={svgError ? "true" : "false"}
            aria-describedby={svgError ? `${baseId}-err` : undefined}
            className="w-full rounded-lg border border-slate-200 bg-surface p-2.5 font-mono text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-mint-50 hover:text-ink-900"
            >
              Upload .svg
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-mint-50 hover:text-ink-900"
            >
              Clear
            </button>
            <span className="text-[11px] text-ink-500">Max 4 KB</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            onChange={upload}
            className="sr-only"
            tabIndex={-1}
          />
        </div>
      )}

      {svgError && (
        <p
          id={`${baseId}-err`}
          role="alert"
          className="mt-2 text-xs font-semibold text-red-600"
        >
          {svgError}
        </p>
      )}
      {error && !svgError && (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
