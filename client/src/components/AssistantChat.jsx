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
import {
  sendMessage,
  listConversations,
  getMessages,
  renameConversation,
  deleteConversation,
  confirmProposal,
  cancelProposal,
  friendlyAiError,
} from "../lib/aiAssistant.js";

const SCROLL_THRESHOLD = 120;

const CHIPS = [
  "How much did I spend this month?",
  "What's my top spending category?",
  "Am I going over any budget?",
  "How can I save more?",
];

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
    kind: row.kind === "proposal" ? "proposal" : "text",
    text: row.content ?? "",
    proposal: row.proposal ?? null,
    createdAt: row.createdAt,
  };
}

function TypingRow() {
  return (
    <div
      className="flex items-center gap-2"
      aria-busy="true"
      aria-label="Rix is typing"
    >
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

function ProposalBlock({
  proposal,
  proposalError,
  busy,
  categories,
  onConfirm,
  onCancel,
}) {
  const [picked, setPicked] = useState("");
  const needsCategory = proposal?.status === "pending" && !proposal?.category_id;
  const categoryLabel =
    proposal?.category_name ?? (proposal?.category_id ? "Chosen category" : null);

  if (proposal?.status === "confirmed") {
    return (
      <div className="ml-10 space-y-2 rounded-2xl rounded-tl-md bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
        <div className="flex items-start gap-2">
          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900">
              Saved · {formatCurrency(proposal.amount)}
            </p>
            <p className="mt-0.5 break-words text-sm text-ink-500">
              {proposal.description}
              {categoryLabel ? ` · ${categoryLabel}` : ""} · {proposal.date}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (proposal?.status === "cancelled") {
    return (
      <div className="ml-10 rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3">
        <p className="text-sm font-medium text-ink-500">
          Draft cancelled · {formatCurrency(proposal.amount)} · {proposal.description}
        </p>
      </div>
    );
  }

  return (
    <div className="ml-10 space-y-3 rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            Expense draft
          </p>
          <p className="mt-0.5 font-display text-lg font-bold text-ink-900">
            {formatCurrency(proposal.amount)}
          </p>
          <p className="mt-0.5 break-words text-sm text-ink-500">
            {proposal.description || "Expense"} · {proposal.date}
          </p>
        </div>
        <Icon name="piggy-bank" size={20} className="shrink-0 text-brand-600" />
      </div>

      {needsCategory ? (
        <label className="block">
          <span className="text-xs font-semibold text-ink-500">
            Pick a category
          </span>
          <select
            value={picked}
            onChange={(event) => setPicked(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 dark:bg-slate-100"
          >
            <option value="">Choose a category…</option>
            {categories.map((row) => (
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
        <p className="text-sm font-medium text-red-500">{proposalError}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || needsCategory}
          onClick={() => onConfirm(picked)}
          className="rounded-xl bg-brand-700 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save expense"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-xl px-3.5 py-1.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-100 disabled:opacity-50"
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

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pinnedRef = useRef(true);
  const idRef = useRef(0);

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
        setCategories(
          (data?.categories ?? []).filter((row) => row.type === "expense"),
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

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

  const send = async (text, addUserBubble = true) => {
    if (!text) return;
    if (!lockSend()) return;
    setStatus("loading");
    setProposalError(null);
    const tempId = addUserBubble ? nextId("temp-") : null;
    if (tempId) {
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: "user", kind: "text", text },
      ]);
    }

    try {
      const result = await sendMessage(text, activeId);
      setMessages((prev) => {
        const base = tempId ? prev.filter((row) => row.id !== tempId) : prev;
        return [
          ...base,
          toUiMessage(result.userMessage),
          toUiMessage(result.assistantMessage),
        ].filter(Boolean);
      });
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

  const submit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || status === "loading") return;
    setDraft("");
    setConfirmNew(false);
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

  const applyProposal = (messageId, proposal) => {
    setMessages((prev) =>
      prev.map((row) => (row.id === messageId ? { ...row, proposal } : row)),
    );
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
      setProposalError({
        id: messageId,
        text: error?.message ?? "Couldn't save that expense.",
      });
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

  const closeHeader = onClose ? (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close assistant"
      className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-100"
    >
      <Icon name="x" size={18} />
    </button>
  ) : null;

  const showIntro = messages.length === 0 && !sending;

  return (
    <section
      aria-label="AI assistant chat"
      className="flex min-h-0 flex-1 flex-col rounded-card bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <BotAvatar className="h-12 w-12" animate={false} />
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
            Rix
          </h2>
          <p className="truncate text-xs text-ink-500">
            Ask about your real budget
          </p>
        </div>

        {confirmNew ? (
          <div className="ml-auto flex items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-1.5">
            <span className="text-xs font-medium text-ink-500">Start fresh?</span>
            <button
              type="button"
              onClick={startNewChat}
              className="rounded-lg bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-800"
            >
              New chat
            </button>
            <button
              type="button"
              onClick={() => setConfirmNew(false)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 hover:bg-white"
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
              aria-expanded={showHistory}
              aria-controls="rix-history"
              className={`rounded-lg p-1.5 transition hover:bg-slate-100 ${
                showHistory ? "bg-slate-100 text-ink-900" : "text-ink-500"
              }`}
            >
              <Icon name="history" size={18} />
            </button>
            <button
              type="button"
              onClick={startNewChat}
              aria-label="New chat"
              className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-100"
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
          className="h-full min-h-0 overflow-y-auto py-4"
          aria-live="polite"
        >
          {showIntro && (
            <div className="mb-5">
              <div className="flex items-start gap-2">
                <BotAvatar />
                <p className="rounded-2xl rounded-tl-md bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-ink-900">
                  {name ? `Hi ${name}, I'm Rix. ` : "Hi, I'm Rix. "}
                  I read your actual transactions and budgets, so ask me what you
                  really spent.
                </p>
              </div>
              <div className="mt-3 ml-10 flex flex-wrap gap-2">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={status === "loading"}
                    onClick={() => askChip(chip)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-ink-900 transition hover:border-brand-500 hover:text-brand-700 disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
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
                <div key={message.id} className="flex items-start gap-2">
                  <BotAvatar />
                  <p className="rounded-2xl rounded-tl-md bg-red-50 px-4 py-2.5 text-sm text-red-500">
                    {message.text}{" "}
                    <button
                      type="button"
                      onClick={retry}
                      className="font-semibold underline"
                    >
                      Try again
                    </button>
                  </p>
                </div>
              );
            }

            if (message.kind === "proposal" && message.proposal) {
              return (
                <div key={message.id} className="space-y-3">
                  {message.text ? (
                    <div className="flex items-start gap-2">
                      <BotAvatar />
                      <p className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-ink-900">
                        {message.text}
                      </p>
                    </div>
                  ) : null}
                  <ProposalBlock
                    proposal={message.proposal}
                    proposalError={
                      proposalError?.id === message.id ? proposalError.text : null
                    }
                    busy={busyProposal === message.id}
                    categories={categories}
                    onConfirm={(categoryId) => onConfirm(message.id, categoryId)}
                    onCancel={() => onCancelProposal(message.id)}
                  />
                </div>
              );
            }

            return (
              <div key={message.id} className="mb-4 flex items-start gap-2">
                <BotAvatar />
                <p className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-ink-900">
                  {message.text}
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
            className="absolute bottom-3 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-surface text-ink-500 shadow-card transition hover:text-ink-900"
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

      <form
        onSubmit={submit}
        className="mt-2 flex items-center gap-2 rounded-full bg-slate-100 py-1.5 pl-4 pr-1.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={status === "loading" ? "Working…" : "Ask me anything…"}
          aria-label="Ask the AI assistant anything"
          disabled={status === "loading"}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-500 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          ref={measureSend}
          aria-label="Send message"
          aria-busy={sending}
          disabled={sending || draft.trim().length === 0}
          style={sendMinWidth ? { minWidth: sendMinWidth } : undefined}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <SubmitSpinner className="h-3.5 w-3.5" /> : <Icon name="send" size={16} />}
        </button>
      </form>
    </section>
  );
}
