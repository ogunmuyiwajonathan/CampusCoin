import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import BotAvatar from "./BotAvatar.jsx";
import ChatHistoryPanel from "./ChatHistoryPanel.jsx";
import SubmitSpinner from "./SubmitSpinner.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import { listCategories } from "../lib/apiClient.js";
import { formatCurrency } from "../lib/formatCurrency.js";
import { formatDate } from "../lib/formatMonth.js";
import {
  classifyTypedReply,
  cleanProposallessReply,
  savedReplyText,
} from "../lib/chatText.js";
import {
  sendMessage,
  listConversations,
  getMessages,
  renameConversation,
  deleteConversation,
  confirmProposal,
  cancelProposal,
  recreateProposal,
  friendlyAiError,
} from "../lib/aiAssistant.js";

const SCROLL_THRESHOLD = 120;
/** Same rule the server uses: a draft nobody touched after a day is stale. */
const PROPOSAL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const CHIPS = [
  "How much did I spend this month?",
  "What's my top spending category?",
  "Am I going over any budget?",
];

const money = (amount) =>
  formatCurrency(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FOCUS_RING = "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

/** Icon-only buttons need a real 44px touch target, not just padding around the icon. */
const TOUCH_TARGET =
  "flex h-11 w-11 items-center justify-center md:h-9 md:w-9";

function firstName(user) {
  const name = user?.name;
  if (typeof name !== "string") return "";
  const parts = name.trim().split(/\s+/);
  return parts[0] ?? "";
}

function toUiMessage(row) {
  if (!row?.chat_message_id) return null;
  return {
    id: row.chat_message_id,
    role: row.role,
    kind: row.proposal ? "proposal" : "text",
    text: row.content ?? "",
    proposal: row.proposal ?? null,
    createdAt: row.createdAt,
  };
}

/** True when the draft is older than the server will accept it for. */
function isStale(message) {
  const proposal = message?.proposal;
  if (!proposal) return false;
  if (proposal.status === "expired") return true;
  if (proposal.status !== "pending") return false;
  const created = Date.parse(message.createdAt ?? "");
  return Number.isFinite(created) && Date.now() - created > PROPOSAL_MAX_AGE_MS;
}

/**
 * Appends fresh rows and keeps the "one live draft" rule locally: as soon as a
 * new pending proposal arrives, every other pending draft in this conversation
 * is shown as replaced (the server marks them the same way).
 */
function appendMessages(prev, rows) {
  const fresh = rows.filter(Boolean);
  const all = [...prev, ...fresh];
  const live = [...fresh].reverse().find((row) => row.proposal?.status === "pending");
  if (!live) return all;
  return all.map((row) =>
    row.id !== live.id && row.proposal?.status === "pending"
      ? { ...row, proposal: { ...row.proposal, status: "superseded" } }
      : row,
  );
}

function TypingRow() {
  return (
    <div className="flex items-center gap-2" aria-busy="true" aria-label="Rix is typing">
      <BotAvatar />
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-2 w-2 animate-bounce rounded-full bg-slate-300 motion-reduce:animate-none"
            style={{ animationDelay: `${dot * 150}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * The saved card used to read "Food · Food · 2026-10-01": the category printed
 * twice (once as the description, once as the category) and the date was raw.
 * The category name appears once and the description is only added when it says
 * something the category does not already say.
 */
function savedMeta(proposal) {
  const category = String(proposal?.category_name ?? "").trim();
  const description = String(proposal?.description ?? "").trim();
  const parts = [];
  if (category) {
    if (description && description.toLowerCase() !== category.toLowerCase()) {
      parts.push(description);
    }
    parts.push(category);
  } else if (description) {
    parts.push(description);
  }
  parts.push(formatDate(proposal?.date ?? ""));
  return parts.filter(Boolean).join(" · ");
}

function ProposalBlock({
  messageId,
  proposal,
  stale,
  proposalError,
  busy,
  categories,
  highlight,
  onConfirm,
  onCancel,
  onRecreate,
  onViewTransactions,
}) {
  const [picked, setPicked] = useState("");
  const isIncome = proposal?.type === "income";
  const typeLabel = isIncome ? "Income draft" : "Expense draft";
  const amount = money(proposal?.amount);
  const dateText = formatDate(proposal?.date ?? "");
  const categoryLabel =
    proposal?.category_name ?? (proposal?.category_id ? "Chosen category" : null);
  const cardRing = highlight ? "ring-2 ring-brand-500" : "";

  if (proposal?.status === "confirmed") {
    return (
      <div
        id={`proposal-${messageId}`}
        className={`rounded-2xl rounded-tl-md bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10 ${cardRing}`}
      >
        <div className="flex items-start gap-2">
          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900">Saved · {amount}</p>
            <p className="mt-0.5 break-words text-sm text-ink-500">
              {savedMeta(proposal)}
            </p>
            <button
              type="button"
              onClick={onViewTransactions}
              className={`mt-1.5 text-xs font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800 ${FOCUS_RING}`}
            >
              View in Transactions
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (proposal?.status === "cancelled" || proposal?.status === "superseded") {
    const headline =
      proposal.status === "cancelled" ? "Draft cancelled" : "Draft replaced by a newer one";
    return (
      <div
        id={`proposal-${messageId}`}
        className={`rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 ${cardRing}`}
      >
        <p className="text-sm font-medium text-ink-500">
          {headline} · {amount} · {proposal.description}
        </p>
      </div>
    );
  }

  if (stale) {
    return (
      <div
        id={`proposal-${messageId}`}
        className={`space-y-3 rounded-2xl rounded-tl-md border border-amber-200 bg-amber-50 px-4 py-3 ${cardRing}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              {typeLabel} expired
            </p>
            <p className="mt-0.5 font-display text-lg font-bold text-ink-900">{amount}</p>
            <p className="mt-0.5 break-words text-sm text-ink-500">
              {proposal.description} · {dateText}
            </p>
          </div>
          <Icon name="clock" size={20} className="shrink-0 text-amber-600" />
        </div>
        {proposalError ? (
          <p className="text-sm font-medium text-red-500">{proposalError}</p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onRecreate}
          className={`min-h-11 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 md:py-1.5 ${FOCUS_RING}`}
        >
          {busy ? "Working…" : "Create it again"}
        </button>
      </div>
    );
  }

  const needsCategory = !proposal?.category_id;
  const matchingCategories = categories.filter(
    (row) => row.type === (isIncome ? "income" : "expense"),
  );

  return (
    <div
      id={`proposal-${messageId}`}
      className={`space-y-3 rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50 px-4 py-3 ${cardRing}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            {typeLabel}
          </p>
          <p className="mt-0.5 font-display text-lg font-bold text-ink-900">{amount}</p>
          <p className="mt-0.5 break-words text-sm text-ink-500">
            {proposal?.description || typeLabel} · {dateText}
          </p>
        </div>
        <Icon
          name={isIncome ? "arrow-up" : "piggy-bank"}
          size={20}
          className={`shrink-0 ${isIncome ? "text-emerald-600" : "text-brand-600"}`}
        />
      </div>

      {needsCategory ? (
        <label className="block">
          <span className="text-xs font-semibold text-ink-500">Pick a category</span>
          <select
            id={`category-${messageId}`}
            value={picked}
            onChange={(event) => setPicked(event.target.value)}
            className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 dark:bg-slate-100 ${FOCUS_RING}`}
          >
            <option value="">Choose a category…</option>
            {matchingCategories.map((row) => (
              <option key={row.category_id} value={row.category_id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-sm text-ink-500">
          Category: <span className="font-medium text-ink-900">{categoryLabel}</span>
        </p>
      )}

      {proposalError ? (
          <p className="text-sm font-medium text-red-500">
            {proposalError}{" "}
            <button
              type="button"
              onClick={() => onConfirm(picked)}
              className={`font-semibold underline ${FOCUS_RING}`}
            >
              Try again
            </button>
          </p>
        ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          id={`confirm-${messageId}`}
          disabled={busy || needsCategory}
          onClick={() => onConfirm(picked)}
          className={`min-h-11 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 md:py-1.5 ${FOCUS_RING}`}
        >
          {busy ? "Saving…" : "Confirm"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className={`min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-100 disabled:opacity-50 md:min-h-0 md:py-1.5 ${FOCUS_RING}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AssistantChat({ onClose } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = firstName(user);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("loading");
  const {
    locked: sending,
    lock: lockSend,
    unlock: unlockSend,
    minWidth: sendMinWidth,
    measure: measureSend,
  } = useSubmitLock();
  const proposalLockRef = useRef(false);
  const [activeId, setActiveId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [lastFailed, setLastFailed] = useState(null);
  const [categories, setCategories] = useState([]);
  const [busyProposal, setBusyProposal] = useState(null);
  const [proposalError, setProposalError] = useState(null);
  const [pinned, setPinned] = useState(true);
  const [unread, setUnread] = useState(false);
  const [highlightId, setHighlightId] = useState(null);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pinnedRef = useRef(true);
  const idRef = useRef(0);
  const highlightTimerRef = useRef(null);

  const nextId = (prefix) => {
    idRef.current += 1;
    return `${prefix}${idRef.current}`;
  };

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const scrollToBottom = useCallback(
    (behavior) => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    },
    [],
  );

  const refreshHistory = useCallback(async () => {
    try {
      const { conversations } = await listConversations();
      setHistory(conversations);
      return conversations;
    } catch {
      return [];
    }
  }, []);

  const closeHistory = useCallback(() => setShowHistory(false), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { conversations } = await listConversations();
        if (cancelled) return;
        setHistory(conversations);
        if (conversations.length > 0) {
          const rows = await getMessages(conversations[0].id);
          if (cancelled) return;
          setActiveId(conversations[0].id);
          setMessages(rows.map(toUiMessage).filter(Boolean));
        }
      } catch {
        setHistory([]);
      }
      if (!cancelled) {
        setHistoryLoading(false);
        setStatus("idle");
      }
    })();

    listCategories()
      .then((data) => {
        if (cancelled) return;
        setCategories(data?.categories ?? []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (messages.length === 0) return;
    if (pinnedRef.current) {
      scrollToBottom(reducedMotion ? "auto" : "smooth");
      setUnread(false);
    } else {
      setUnread(true);
    }
  }, [messages, reducedMotion, scrollToBottom]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    const atBottom = distance <= SCROLL_THRESHOLD;
    pinnedRef.current = atBottom;
    setPinned(atBottom);
    if (atBottom) setUnread(false);
  };

  const jumpToLatest = () => {
    pinnedRef.current = true;
    setPinned(true);
    setUnread(false);
    scrollToBottom(reducedMotion ? "auto" : "smooth");
  };

  /** Scroll a draft into view, focus its first control, and ring it briefly. */
  const revealProposal = useCallback(
    (messageId) => {
      const card = document.getElementById(`proposal-${messageId}`);
      if (!card) return;
      card.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      });
      setHighlightId(messageId);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightId(null), 3000);
      const control =
        document.getElementById(`confirm-${messageId}`) ??
        document.getElementById(`category-${messageId}`);
      window.setTimeout(
        () => control?.focus({ preventScroll: true }),
        reducedMotion ? 0 : 320,
      );
    },
    [reducedMotion],
  );

  const pushHint = (text) => {
    setMessages((prev) => [
      ...prev,
      { id: nextId("hint-"), role: "assistant", kind: "hint", text, proposal: null },
    ]);
  };

  const send = async (text, addUserBubble = true) => {
    if (!text) return;
    if (!lockSend()) return;
    setStatus("loading");
    setProposalError(null);
    const tempId = addUserBubble ? nextId("temp-") : null;
    if (tempId) {
      setMessages((prev) => [...prev, { id: tempId, role: "user", kind: "text", text }]);
    }

    try {
      const result = await sendMessage(text, activeId);
      const rows = [result.userMessage, result.assistantMessage].map(toUiMessage).filter(Boolean);
      setMessages((prev) => appendMessages(tempId ? prev.filter((row) => row.id !== tempId) : prev, rows));
      setActiveId(result.conversationId);
      setLastFailed(null);
      setStatus("idle");
      await refreshHistory();
    } catch (error) {
      const friendly = friendlyAiError(error);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("err-"),
          role: "assistant",
          kind: "error",
          text: friendly.message,
          expired: friendly.expired,
        },
      ]);
      setLastFailed(text);
      setStatus("error");
      if (friendly.expired) navigate("/login", { replace: true });
    } finally {
      unlockSend();
    }
  };

  /** The draft the student can still act on, if there is one. */
  const pendingProposal = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const row = messages[index];
      if (row?.proposal?.status === "pending") return row;
    }
    return null;
  }, [messages]);

  const submit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || status === "loading") return;
    setDraft("");
    setConfirmNew(false);
    if (inputRef.current) inputRef.current.style.height = "auto";

    if (pendingProposal) {
      const intent = classifyTypedReply(text);
      if (intent === "confirm") {
        revealProposal(pendingProposal.id);
        pushHint(
          isStale(pendingProposal)
            ? "That draft has expired — press Create it again on it, then Confirm the new one."
            : "The draft is waiting — press Confirm on it to save it. I never save anything from what you type.",
        );
        return;
      }
      if (intent === "cancel") {
        revealProposal(pendingProposal.id);
        pushHint("Use Cancel on the draft if you don't want it.");
        return;
      }
      if (intent === "reveal") {
        revealProposal(pendingProposal.id);
        pushHint("Here it is — the draft is highlighted.");
        return;
      }
    }

    void send(text, true);
  };

  const askChip = (text) => {
    if (status === "loading") return;
    setDraft("");
    setConfirmNew(false);
    void send(text, true);
  };

  const retry = () => {
    const text = lastFailed;
    if (!text || status === "loading") return;
    setMessages((prev) => prev.filter((row) => row.kind !== "error"));
    setLastFailed(null);
    void send(text, false);
  };

  const startNewChat = () => {
    if (messages.length > 0 && !confirmNew) {
      setConfirmNew(true);
      return;
    }
    setConfirmNew(false);
    setShowHistory(false);
    setActiveId(null);
    setMessages([]);
    setLastFailed(null);
    setProposalError(null);
    setUnread(false);
    setPinned(true);
    pinnedRef.current = true;
    setStatus("idle");
    inputRef.current?.focus();
  };

  const openConversation = async (id) => {
    setShowHistory(false);
    if (id === activeId) return;
    setStatus("loading");
    try {
      const rows = await getMessages(id);
      setActiveId(id);
      setMessages(rows.map(toUiMessage).filter(Boolean));
      setLastFailed(null);
      setProposalError(null);
      setUnread(false);
      setPinned(true);
      pinnedRef.current = true;
      setStatus("idle");
    } catch (error) {
      setLastFailed(null);
      setStatus("error");
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("err-"),
          role: "assistant",
          kind: "error",
          text: error?.message ?? "Couldn't open that chat.",
        },
      ]);
    }
  };

  const handleRename = async (id, title) => {
    try {
      await renameConversation(id, title);
      await refreshHistory();
    } catch {
      await refreshHistory();
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteConversation(id);
      await refreshHistory();
      if (id === activeId) {
        setActiveId(null);
        setMessages([]);
        setLastFailed(null);
        setStatus("idle");
        setUnread(false);
        setPinned(true);
        pinnedRef.current = true;
      }
    } catch {
      await refreshHistory();
    }
  };

  const applyProposal = (messageId, proposal, { supersedeOthers = false } = {}) => {
    setMessages((prev) => {
      const next = prev.map((row) =>
        row.id === messageId ? { ...row, proposal } : row,
      );
      if (supersedeOthers && proposal?.status === "pending") {
        return next.map((row) =>
          row.id !== messageId && row.proposal?.status === "pending"
            ? { ...row, proposal: { ...row.proposal, status: "superseded" } }
            : row,
        );
      }
      return next;
    });
  };

  const onConfirm = async (messageId, categoryId) => {
    if (proposalLockRef.current) return;
    const target = messages.find((row) => row.id === messageId);
    if (!target) return;
    proposalLockRef.current = true;
    setBusyProposal(messageId);
    setProposalError(null);
    try {
      const result = await confirmProposal(messageId, categoryId);
      applyProposal(messageId, result.message?.proposal ?? target.proposal);
      await refreshHistory();
    } catch (error) {
      const text = error?.message ?? "Couldn't save that entry.";
      if (/expired/i.test(text)) {
        applyProposal(messageId, { ...target.proposal, status: "expired" });
      }
      setProposalError({ id: messageId, text });
    } finally {
      proposalLockRef.current = false;
      setBusyProposal(null);
    }
  };

  const onCancelProposal = async (messageId) => {
    if (proposalLockRef.current) return;
    const target = messages.find((row) => row.id === messageId);
    if (!target) return;
    proposalLockRef.current = true;
    setBusyProposal(messageId);
    setProposalError(null);
    try {
      const result = await cancelProposal(messageId);
      applyProposal(messageId, result.message?.proposal ?? target.proposal);
    } catch (error) {
      setProposalError({
        id: messageId,
        text: error?.message ?? "Couldn't cancel that draft.",
      });
    } finally {
      proposalLockRef.current = false;
      setBusyProposal(null);
    }
  };

  const onRecreate = async (messageId) => {
    if (proposalLockRef.current) return;
    const target = messages.find((row) => row.id === messageId);
    if (!target?.proposal) return;
    proposalLockRef.current = true;
    setBusyProposal(messageId);
    setProposalError(null);
    try {
      const created = await recreateProposal(messageId);
      const row = toUiMessage(created);
      if (row) {
        applyProposal(messageId, { ...target.proposal, status: "superseded" });
        setMessages((prev) => appendMessages(prev, [row]));
      }
      await refreshHistory();
    } catch (error) {
      setProposalError({
        id: messageId,
        text: error?.message ?? "Couldn't create that draft again.",
      });
    } finally {
      proposalLockRef.current = false;
      setBusyProposal(null);
    }
  };

  const closeHeader = onClose ? (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close assistant"
      title="Close assistant"
      className={`${TOUCH_TARGET} rounded-lg text-ink-500 transition hover:bg-slate-100 ${FOCUS_RING}`}
    >
      <Icon name="x" size={18} />
    </button>
  ) : null;

  const showIntro = messages.length === 0 && !sending;
  const pendingStale = pendingProposal ? isStale(pendingProposal) : false;

  const confirmFromBar = () => {
    if (!pendingProposal) return;
    if (!pendingProposal.proposal?.category_id) {
      revealProposal(pendingProposal.id);
      return;
    }
    onConfirm(pendingProposal.id, null);
  };

  return (
    <section
      aria-label="AI assistant chat"
      className="flex min-h-0 flex-1 flex-col rounded-card bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 pb-3">
        <BotAvatar className="h-12 w-12" animate={false} />
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold tracking-tight text-ink-900">Rix</h2>
          <p className="truncate text-xs text-ink-500">Ask about your real budget</p>
        </div>

        {confirmNew ? (
          <div className="ml-auto flex items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-1.5">
            <span className="text-xs font-medium text-ink-500">Start fresh?</span>
            <button
              type="button"
              onClick={startNewChat}
              className={`rounded-lg bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-800 ${FOCUS_RING}`}
            >
              New chat
            </button>
            <button
              type="button"
              onClick={() => setConfirmNew(false)}
              className={`rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 hover:bg-white ${FOCUS_RING}`}
            >
              Keep
            </button>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowHistory((value) => !value)}
              aria-label="Chat history"
              title="Chat history"
              aria-expanded={showHistory}
              aria-controls="rix-history"
              className={`${TOUCH_TARGET} rounded-lg transition hover:bg-slate-100 ${
                showHistory ? "bg-slate-100 text-ink-900" : "text-ink-500"
              } ${FOCUS_RING}`}
            >
              <Icon name="history" size={18} />
            </button>
            <button
              type="button"
              onClick={startNewChat}
              aria-label="New chat"
              title="New chat"
              className={`${TOUCH_TARGET} rounded-lg text-ink-500 transition hover:bg-slate-100 ${FOCUS_RING}`}
            >
              <Icon name="plus" size={18} />
            </button>
            {closeHeader}
          </div>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full min-h-0 overflow-y-auto py-4 [scrollbar-gutter:stable]"
          aria-live="polite"
        >
          {showIntro && (
            <div className="mb-5">
              <div className="flex items-start gap-2">
                <BotAvatar />
                <p className="rounded-2xl rounded-tl-md bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-ink-900">
                  {name ? `Hi ${name}, I'm Rix. ` : "Hi, I'm Rix. "}
                  I read your actual transactions and budgets, so ask me what you really spent.
                </p>
              </div>
              <div className="mt-3 ml-12 flex flex-wrap gap-2">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={status === "loading"}
                    onClick={() => askChip(chip)}
                    className={`rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-ink-900 transition hover:border-brand-500 hover:text-brand-700 disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const grouped = Boolean(previous && previous.role === message.role);

            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white">
                    {message.text}
                  </p>
                </div>
              );
            }

            if (message.kind === "error") {
              return (
                <div key={message.id} className="mb-4 flex items-start gap-2">
                  <BotAvatar />
                  <p className="rounded-2xl rounded-tl-md bg-red-50 px-4 py-2.5 text-sm text-red-500">
                    {message.text}{" "}
                    <button
                      type="button"
                      onClick={retry}
                      className={`font-semibold underline ${FOCUS_RING}`}
                    >
                      Try again
                    </button>
                  </p>
                </div>
              );
            }

            const wrapper = `flex min-w-0 items-start ${grouped ? "ml-12" : "gap-2"}`;

            if (message.kind === "proposal" && message.proposal) {
              const stale = isStale(message);
              const text = savedReplyText(message.text, message.proposal.status);
              return (
                <div key={message.id} className={`${wrapper} mb-4`}>
                  {grouped ? null : <BotAvatar />}
                  <div className="min-w-0 flex-1 space-y-3">
                    {text ? (
                      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-ink-900 lg:max-w-[70%]">
                        {text}
                      </p>
                    ) : null}
                    <ProposalBlock
                      messageId={message.id}
                      proposal={message.proposal}
                      stale={stale}
                      proposalError={
                        proposalError?.id === message.id ? proposalError.text : null
                      }
                      busy={busyProposal === message.id}
                      categories={categories}
                      highlight={highlightId === message.id}
                      onConfirm={(categoryId) => onConfirm(message.id, categoryId)}
                      onCancel={() => onCancelProposal(message.id)}
                      onRecreate={() => onRecreate(message.id)}
                      onViewTransactions={() => navigate("/transactions")}
                    />
                  </div>
                </div>
              );
            }

            // A reply that carries no draft may not claim one exists, not even
            // in old history: strip the false sentences and hide it when the
            // whole message was a promise.
            const honest =
              message.kind === "text" ? cleanProposallessReply(message.text) : message.text;
            if (message.kind === "text" && !honest) return null;

            return (
              <div key={message.id} className={`${wrapper} mb-4`}>
                {grouped ? null : <BotAvatar />}
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-ink-900 lg:max-w-[70%]">
                  {honest}
                </p>
              </div>
            );
          })}

          {sending ? <TypingRow /> : null}
          <div ref={bottomRef} />
        </div>

        {!pinned ? (
          <button
            type="button"
            onClick={jumpToLatest}
            aria-label="Scroll to the latest reply"
            title="Jump to latest"
            className={`absolute bottom-3 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-surface text-ink-500 shadow-card transition hover:text-ink-900 ${FOCUS_RING}`}
          >
            <Icon name="arrow-down" size={18} />
            {unread ? (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-slate-100"
              />
            ) : null}
          </button>
        ) : null}

        {showHistory ? (
          <div id="rix-history">
            <ChatHistoryPanel
              conversations={history}
              activeId={activeId}
              loading={historyLoading}
              onSelect={openConversation}
              onRename={handleRename}
              onDelete={handleDelete}
              onClose={closeHistory}
            />
          </div>
        ) : null}
      </div>

      {pendingProposal ? (
        <div
          role="region"
          aria-label="Pending draft"
          className="mt-2 flex shrink-0 items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2"
        >
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-900">
            Draft · {money(pendingProposal.proposal.amount)} ·{" "}
            {pendingProposal.proposal.description || "waiting for you"}
          </p>
          {pendingStale ? (
            <button
              type="button"
              onClick={() => onRecreate(pendingProposal.id)}
              disabled={busyProposal === pendingProposal.id}
              className={`min-h-11 shrink-0 rounded-xl bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50 md:min-h-0 md:py-1.5 ${FOCUS_RING}`}
            >
              Create it again
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={confirmFromBar}
                disabled={busyProposal === pendingProposal.id}
                className={`min-h-11 shrink-0 rounded-xl bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50 md:min-h-0 md:py-1.5 ${FOCUS_RING}`}
              >
                {busyProposal === pendingProposal.id ? "Saving…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => onCancelProposal(pendingProposal.id)}
                disabled={busyProposal === pendingProposal.id}
                className={`min-h-11 shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-ink-500 transition hover:bg-white disabled:opacity-50 md:min-h-0 md:py-1.5 ${FOCUS_RING}`}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      ) : null}

      <form
        onSubmit={submit}
        className="mt-2 flex shrink-0 items-end gap-2 rounded-3xl bg-slate-100 py-1.5 pl-4 pr-1.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500"
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            const node = event.currentTarget;
            node.style.height = "auto";
            node.style.height = `${Math.min(node.scrollHeight, 112)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit(event);
            }
          }}
          placeholder={status === "loading" ? "Working…" : "Ask me anything…"}
          aria-label="Ask the AI assistant anything"
          disabled={status === "loading"}
          className="max-h-28 min-h-8 min-w-0 flex-1 resize-none self-center bg-transparent py-2 text-sm leading-6 outline-none placeholder:text-ink-500 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          ref={measureSend}
          aria-label="Send message"
          aria-busy={sending}
          disabled={sending || draft.trim().length === 0}
          style={sendMinWidth ? { minWidth: sendMinWidth } : undefined}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
        >
          {sending ? <SubmitSpinner className="h-3.5 w-3.5" /> : <Icon name="send" size={16} />}
        </button>
      </form>
    </section>
  );
}
