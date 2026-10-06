import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useSearchHistory } from "../hooks/useSearchHistory.js";
import { searchAdmin, searchEverything } from "../lib/apiClient.js";

/**
 * The header typeahead, shared by the student header and the admin header.
 *
 * Everything here is built around one rule: the dropdown updates as you type and
 * Enter is optional. A request goes out on a pause in typing (250 ms), an
 * in-flight request is aborted when the next keystroke supersedes it, and a
 * response that somehow arrives late is discarded rather than allowed to
 * overwrite newer results.
 */

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;
const FETCHERS = { student: searchEverything, admin: searchAdmin };

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wraps every case-insensitive occurrence of the query in <mark>. Splitting with
 * a capture group rather than by index means a match can never land inside a
 * surrogate pair and cut a character in half.
 */
function Highlight({ text, query }) {
  const value = String(text ?? "");
  const needle = query.trim();
  if (!needle) return value;

  return value
    .split(new RegExp(`(${escapeForRegExp(needle)})`, "gi"))
    .map((part, index) =>
      part.toLowerCase() === needle.toLowerCase() ? (
        <mark
          key={`${part}-${index}`}
          className="rounded-[3px] bg-emerald-100 px-0.5 text-ink-900 dark:bg-emerald-500/25 dark:text-sage-100"
        >
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      ),
    );
}

function SkeletonRow() {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5" aria-hidden="true">
      <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-100" />
      <span className="min-w-0 flex-1 space-y-2 py-0.5">
        <span className="block h-3 w-2/5 animate-pulse rounded bg-slate-100" />
        <span className="block h-2.5 w-3/5 animate-pulse rounded bg-slate-100" />
      </span>
    </li>
  );
}

function ResultRow({ item, query, optionId, isActive, onSelect, onHover }) {
  return (
    <li
      id={optionId}
      role="option"
      aria-selected={isActive}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(item)}
      onMouseEnter={onHover}
      className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
        isActive ? "bg-emerald-50 dark:bg-emerald-500/15" : ""
      }`}
    >
      {item.icon ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Icon name={item.icon} size={15} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900">
          <Highlight text={item.title} query={query} />
        </span>
        {item.subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-ink-500">
            <Highlight text={item.subtitle} query={query} />
          </span>
        ) : null}
      </span>
      {item.meta ? (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
          {item.meta}
        </span>
      ) : null}
      {typeof item.amount === "number" ? (
        <span className="shrink-0 text-xs font-bold tabular-nums text-ink-500">
          {item.amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}
        </span>
      ) : null}
      <Icon name="chevron-right" size={15} className="shrink-0 text-ink-500" />
    </li>
  );
}

/**
 * One flat, ordered list of every selectable row, each remembering which group
 * it came from and its own position. The keyboard walks this array; the
 * renderer reads the very same entries, so "the third arrow press" and "the
 * third row on screen" cannot drift apart - and aria-activedescendant always
 * names an id that exists in the DOM.
 */
function buildRows(serverGroups, pageItems) {
  const rows = [];
  const blocks = [
    ...serverGroups.map((group) => ({
      label: group.label,
      seeAll: group.seeAll,
      items: group.items.map((item) => ({ item, to: item.link })),
    })),
    ...(pageItems.length
      ? [{ label: "Pages and actions", seeAll: null, items: pageItems.map((item) => ({ item, to: item.to })) }]
      : []),
  ];

  for (const block of blocks) {
    const start = rows.length;
    block.entries = block.items.map((entry, index) => ({
      ...entry,
      flatIndex: start + index,
    }));
    rows.push(...block.entries);
  }
  return { rows, blocks };
}

export default function SearchBox({
  scope = "student",
  targets = [],
  placeholder = "Search anything...",
  label = "Search",
  variant = "header",
  autoFocus = false,
  onClose,
}) {
  const navigate = useNavigate();
  const listId = useId();
  const statusId = useId();

  const [query, setQuery] = useState("");
  const [serverGroups, setServerGroups] = useState([]);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);

  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const controllerRef = useRef(null);
  // Monotonic id of the newest request. A response whose id is no longer the
  // newest is dropped, which covers the case where abort arrives too late.
  const requestIdRef = useRef(0);
  const retryRef = useRef(null);

  const history = useSearchHistory(scope);
  const trimmed = query.trim();
  const ready = trimmed.length >= MIN_CHARS;

  /* The fixed page/action half, matched in the browser - no round trip. */
  const pageItems = useMemo(() => {
    if (!ready) return [];
    const needle = trimmed.toLowerCase();
    const exact = targets.filter((target) => target.title.toLowerCase().startsWith(needle));
    const loose = targets.filter(
      (target) => !exact.includes(target) && `${target.title} ${target.keywords ?? ""}`.toLowerCase().includes(needle),
    );
    return [...exact, ...loose].slice(0, 5);
  }, [ready, targets, trimmed]);

  const { rows, blocks } = useMemo(
    () => buildRows(ready ? serverGroups : [], pageItems),
    [serverGroups, pageItems, ready],
  );
  const total = rows.length;
  // The panel is shown whenever the box is open. Every branch of the body below
  // has something sensible to render - the idle hint, recent searches, loading
  // rows, results, "nothing found", or the error - so an empty box explains
  // itself on focus rather than looking broken.
  const expanded = open;
  const activeOptionId =
    activeIndex >= 0 && activeIndex < rows.length ? `${listId}-option-${activeIndex}` : undefined;

  const idle = useCallback(() => {
    controllerRef.current?.abort();
    setServerGroups([]);
    setState("idle");
    setError("");
    setActiveIndex(-1);
  }, []);

  const run = useCallback(
    // Named so the error path below can rebuild the exact request that failed
    // without reading `run` while its own declaration is still initialising.
    async function runSearch(term) {
      const value = term.trim();
      controllerRef.current?.abort();

      if (value.length < MIN_CHARS) {
        setServerGroups([]);
        setState("idle");
        setError("");
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      const id = requestIdRef.current + 1;
      requestIdRef.current = id;

      setState("loading");
      setError("");
      setActiveIndex(-1);

      try {
        const data = await FETCHERS[scope](value, { signal: controller.signal });
        if (requestIdRef.current !== id) return;
        setServerGroups(Array.isArray(data?.groups) ? data.groups : []);
        setState("ready");
        retryRef.current = null;
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (requestIdRef.current !== id) return;
        setServerGroups([]);
        setState("error");
        setError(err?.message || "Search is unavailable right now.");
        retryRef.current = () => runSearch(value);
      }
    },
    [scope],
  );

  /* Debounced as-you-type; the timer is cleared on every keystroke. */
  useEffect(() => {
    if (!ready) {
      // Dropping back under the minimum cancels whatever is in flight. The
      // panels already key off `ready`, so there is nothing to reset here.
      controllerRef.current?.abort();
      return undefined;
    }
    const timer = setTimeout(() => run(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [ready, trimmed, run]);

  /* An unmount mid-flight must not set state afterwards. */
  useEffect(() => () => controllerRef.current?.abort(), []);

  const go = useCallback(
    (to) => {
      if (!to) return;
      history.remember(trimmed);
      idle();
      setQuery("");
      setOpen(false);
      onClose?.();
      navigate(to);
    },
    [history, navigate, onClose, trimmed, idle],
  );

  const move = useCallback(
    (delta) => {
      if (!rows.length) return;
      setOpen(true);
      setActiveIndex((current) => {
        const next = current + delta;
        if (next < 0) return rows.length - 1;
        if (next >= rows.length) return -1;
        return next;
      });
    },
    [rows.length],
  );

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
      return;
    }
    if (event.key === "Escape") {
      // Closes the dropdown and keeps the text, so the same query can be
      // reopened without typing it again.
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = rows[activeIndex];
      if (chosen) {
        go(chosen.to);
        return;
      }
      // Nothing highlighted: fall through to the first group's "See all
      // results", so Enter is never a dead key.
      const first = blocks[0];
      if (first?.seeAll) go(first.seeAll);
      else if (first?.items[0]) go(first.items[0].to);
    }
  };

  /* "/" focuses the box, unless the user is already typing somewhere. */
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      if (variant === "header") setOpen(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [variant]);

  /* Clicking anywhere else closes the dropdown. */
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const announcement = !ready
    ? ""
    : state === "loading"
      ? "Searching"
      : state === "error"
        ? "Search is unavailable"
        : total === 0
          ? "No results"
          : `${total} result${total === 1 ? "" : "s"}`;

  const renderBlocks = () => (
    <>
      {blocks.map((block, blockIndex) => (
        <li key={`${block.label}-${blockIndex}`} role="presentation">
          <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
              {block.label}
            </span>
            {block.seeAll ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(block.seeAll)}
                className="rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-brand-700 transition hover:underline dark:text-emerald-400"
              >
                See all results
              </button>
            ) : null}
          </div>
          <ul role="presentation">
            {block.entries.map((entry) => (
              <ResultRow
                key={entry.item.key}
                item={entry.item}
                query={trimmed}
                optionId={`${listId}-option-${entry.flatIndex}`}
                isActive={activeIndex === entry.flatIndex}
                onSelect={() => go(entry.to)}
                onHover={() => setActiveIndex(entry.flatIndex)}
              />
            ))}
          </ul>
        </li>
      ))}
    </>
  );

  const body = (
    <>
      {/* idle: recent searches, kept in this browser only */}
      {!ready && history.entries.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
              Recent searches
            </span>
            <button
              type="button"
              onClick={history.clear}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 transition hover:bg-slate-50 hover:text-ink-900"
            >
              Clear
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {history.entries.map((entry) => (
              <li key={entry}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(entry);
                    run(entry);
                  }}
                  className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <Icon name="history" size={15} className="shrink-0 text-ink-500" />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-900">{entry}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!ready && history.entries.length === 0 && (
        <p className="px-3 py-4 text-sm text-ink-500">
          Type at least {MIN_CHARS} characters to search.
        </p>
      )}

      {ready && state === "loading" && (
        <ul className="py-1">
          {[0, 1, 2, 3].map((index) => (
            <SkeletonRow key={index} />
          ))}
        </ul>
      )}

      {ready && state === "error" && (
        <div className="px-3 py-4" role="alert">
          <p className="text-sm font-semibold text-red-500">{error}</p>
          <button
            type="button"
            onClick={() => retryRef.current?.()}
            className="mt-2 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-800"
          >
            Retry
          </button>
        </div>
      )}

      {ready && state === "ready" && total === 0 && (
        <div className="px-3 py-4">
          <p className="text-sm font-semibold text-ink-900">Nothing found for “{trimmed}”</p>
          <p className="mt-1 text-xs text-ink-500">
            Try a shorter word, an amount like 2500, or a page name.
          </p>
        </div>
      )}

      {ready && state === "ready" && total > 0 && (
        <ul
          className="max-h-[70vh] overflow-y-auto py-1"
          id={listId}
          role="listbox"
          aria-label={`${label} results`}
        >
          {renderBlocks()}
        </ul>
      )}
    </>
  );

  if (variant === "page") {
    return (
      <div ref={wrapRef} className="min-h-svh bg-mint-50">
        <div className="border-b border-slate-200 bg-surface px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="mb-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-50"
          >
            <Icon name="chevron-left" size={16} />
            Back
          </button>
          <div className="relative">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
            />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              autoFocus={autoFocus}
              autoComplete="off"
              spellCheck="false"
              value={query}
              placeholder={placeholder}
              aria-label={`${label}. Type to search your account.`}
              aria-expanded={expanded}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={expanded ? activeOptionId : undefined}
              aria-describedby={statusId}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
                setActiveIndex(-1);
              }}
              onKeyDown={onKeyDown}
              className="w-full rounded-full bg-surface py-2.5 pl-10 pr-4 text-sm text-ink-900 ring-1 ring-slate-200/70 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <p id={statusId} className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        {expanded && <div className="px-4 py-3">{body}</div>}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck="false"
          value={query}
          placeholder={placeholder}
          aria-label={`${label}. Type to search your account.`}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? activeOptionId : undefined}
          aria-describedby={statusId}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full max-w-md rounded-full bg-surface py-2.5 pl-10 pr-4 text-sm text-ink-900 ring-1 ring-slate-200/70 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <p id={statusId} className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {expanded && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-card border border-slate-200 bg-surface shadow-card">
          {body}
        </div>
      )}
    </div>
  );
}