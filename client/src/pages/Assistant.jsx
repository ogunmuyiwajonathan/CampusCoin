import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import BotAvatar from "../components/BotAvatar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { askAssistant } from "../lib/aiAssistant.js";
import {
  categories,
  computeTotals,
  expenseBreakdown,
  transactions,
} from "../data/mockData.js";
import { formatCurrency } from "../lib/formatCurrency.js";

const CATEGORY_KEYWORDS = [
  { names: ["Food"], words: ["food", "cafeteria", "canteen", "grocer", "snack", "drink", "restaurant", "lunch", "dinner", "breakfast", "meal", "eat"] },
  { names: ["Transport"], words: ["transport", "uber", "bus", "bike", "taxi", "fare", "fuel", "ride", "bolt"] },
  { names: ["Hostel/Rent"], words: ["hostel", "rent", "accommodation", "room", "lodge"] },
  { names: ["Academics"], words: ["textbook", "book", "printing", "school", "course", "exam", "tutorial", "stationery"] },
  { names: ["Subscriptions"], words: ["netflix", "subscription", "spotify", "data", "bundle", "wifi", "airtime"] },
  { names: ["Entertainment"], words: ["movie", "game", "cinema", "party", "concert", "entertainment", "outing"] },
  { names: ["Allowance", "Gigs", "Scholarships", "Gifts"], words: ["received", "allowance", "salary", "paid", "scholarship", "gift"] },
];

function parseAmount(text) {
  const match = text.replace(/₦/g, "").match(/(\d[\d,]*)/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function matchCategory(text) {
  const lower = text.toLowerCase();
  for (const group of CATEGORY_KEYWORDS) {
    if (group.words.some((w) => lower.includes(w))) {
      return categories.find((c) => group.names.includes(c.name)) ?? null;
    }
  }
  return categories.find((c) => c.name === "Others") ?? null;
}

function summarize(categoryName, extraAmount) {
  const totals = computeTotals(transactions);
  const breakdown = expenseBreakdown(transactions);
  const current = breakdown.find((c) => c.name === categoryName)?.amount ?? 0;
  const categoryTotal = current + (extraAmount ?? 0);
  const grandTotal = totals.expense + (extraAmount ?? 0);
  const percentage = grandTotal ? Math.round((categoryTotal / grandTotal) * 100) : 0;
  return { categoryTotal, percentage };
}

function tipFor(categoryName, categoryTotal) {
  const saveTarget = formatCurrency(Math.round(categoryTotal * 0.2));
  if (categoryName === "Food") {
    return `Try cooking more or using student discounts to save up to ${saveTarget} next month.`;
  }
  const weekly = formatCurrency(Math.round(categoryTotal / 4));
  return `A weekly cap of ${weekly} keeps ${categoryName.toLowerCase()} on track and frees up to ${saveTarget} a month.`;
}

function seedConversation() {
  const userText = "I just bought food at the cafeteria for ₦5,000";
  const { categoryTotal, percentage } = summarize("Food", 0);
  return [
    { id: "seed-user", role: "user", kind: "text", text: userText },
    {
      id: "seed-assistant",
      role: "assistant",
      kind: "categorize",
      category: "Food",
      summary: `This month, you've spent ${formatCurrency(categoryTotal)} on food (${percentage}% of your total expenses).`,
      tip: tipFor("Food", categoryTotal),
    },
  ];
}

export default function Assistant() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState(seedConversation);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("ready");
  const idRef = useRef(0);
  const bottomRef = useRef(null);
  const breakdown = useMemo(() => expenseBreakdown(transactions), []);
  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [],
  );
  const botReadyCount = messages.filter(
    (m) => m.role === "assistant" && m.kind !== "typing",
  ).length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const nextId = () => {
    idRef.current += 1;
    return `msg-${Date.now()}-${idRef.current}`;
  };

  const handleExpense = (text) => {
    const amount = parseAmount(text);
    const category = matchCategory(text);
    const name = category?.name ?? "Others";
    const { categoryTotal, percentage } = summarize(name, amount ?? 0);
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "assistant",
        kind: "categorize",
        category: name,
        summary: `This month, you've spent ${formatCurrency(categoryTotal)} on ${name.toLowerCase()} (${percentage}% of your total expenses).`,
        tip: tipFor(name, categoryTotal),
      },
    ]);
    setStatus("ready");
  };

  const handleQuestion = async (text, id) => {
    try {
      const answer = await askAssistant(text, breakdown, recent);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, kind: "text", text: answer } : m)),
      );
      setStatus("ready");
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, kind: "error" } : m)),
      );
      setStatus("error");
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || status === "loading") return;
    setDraft("");
    setMessages((prev) => [...prev, { id: nextId(), role: "user", kind: "text", text }]);
    if (parseAmount(text)) {
      setStatus("loading");
      window.setTimeout(() => handleExpense(text), 450);
      return;
    }
    const id = nextId();
    setStatus("loading");
    setMessages((prev) => [...prev, { id, role: "assistant", kind: "typing" }]);
    handleQuestion(text, id);
  };

  const retry = () => {
    const failed = [...messages].reverse().find((m) => m.kind === "error");
    if (!failed) return;
    const userText = [...messages]
      .slice(0, messages.indexOf(failed))
      .reverse()
      .find((m) => m.role === "user")?.text;
    if (!userText) return;
    setStatus("loading");
    setMessages((prev) => prev.map((m) => (m.id === failed.id ? { ...m, kind: "typing" } : m)));
    handleQuestion(userText, failed.id);
  };

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:pl-60">
        <main className="flex min-h-svh flex-col px-4 py-5">
          <header className="mb-4 flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-white md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Icon name="menu" size={20} />
            </button>
            <h1 className="sr-only">AI Assistant</h1>
          </header>

          <section
            aria-label="AI assistant chat"
            className="flex min-h-0 flex-1 flex-col rounded-card bg-white p-4 shadow-card sm:p-5"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BotAvatar key={botReadyCount} className="h-9 w-9" shake />
              <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
                AI Assistant
              </h2>
              <Link
                to="/"
                aria-label="Close assistant"
                className="ml-auto rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-100"
              >
                <Icon name="x" size={18} />
              </Link>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4" aria-live="polite">
              {messages.map((message) => {
                if (message.role === "user") {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-500 px-4 py-2.5 text-sm font-medium text-white">
                        {message.text}
                      </p>
                    </div>
                  );
                }
                if (message.kind === "typing") {
                  return (
                    <div key={message.id} className="flex items-center gap-2" aria-busy="true" aria-label="Assistant is typing">
                      <BotAvatar typing />
                      <span className="flex gap-1" aria-hidden="true">
                        {[0, 1, 2].map((dot) => (
                          <span
                            key={dot}
                            className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
                            style={{ animationDelay: `${dot * 150}ms` }}
                          />
                        ))}
                      </span>
                    </div>
                  );
                }
                if (message.kind === "error") {
                  return (
                    <div key={message.id} className="flex items-center gap-2">
                      <BotAvatar shake />
                      <p className="text-sm text-red-500">
                        Couldn&apos;t reach the assistant.{" "}
                        <button type="button" onClick={retry} className="font-semibold underline">
                          Try again
                        </button>
                      </p>
                    </div>
                  );
                }
                if (message.kind === "categorize") {
                  return (
                    <div key={message.id} className="space-y-3">
                      <div className="flex items-start gap-2">
                        <BotAvatar shake />
                        <p className="rounded-2xl rounded-tl-md bg-slate-100 px-4 py-2.5 text-sm text-ink-900">
                          Got it! I&apos;ve categorized this as{" "}
                          <strong>{message.category}</strong>.
                        </p>
                      </div>
                      <div className="ml-10">
                        <h3 className="font-display text-sm font-bold text-ink-900">
                          Quick Summary
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-ink-500">
                          {message.summary}
                        </p>
                      </div>
                      <div className="ml-10 flex gap-2 rounded-2xl bg-sky-50 px-4 py-3">
                        <Icon name="lightbulb" size={16} className="mt-0.5 shrink-0 text-amber-500" />
                        <div>
                          <p className="font-display text-sm font-bold text-ink-900">Tip</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-ink-500">
                            {message.tip}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={message.id} className="flex items-start gap-2">
                    <BotAvatar shake />
                    <p className="rounded-2xl rounded-tl-md bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-ink-900">
                      {message.text}
                    </p>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={submit}
              className="mt-2 flex items-center gap-2 rounded-full bg-slate-100 py-1.5 pl-4 pr-1.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask me anything..."
                aria-label="Ask the AI assistant anything"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-500"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600"
              >
                <Icon name="send" size={16} />
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
