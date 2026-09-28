import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import BotAvatar from "./BotAvatar.jsx";
import { askAssistant } from "../lib/aiAssistant.js";

// The greeting the student sees before they type. It is labelled as a prompt
// rather than an answer, because Rix has not been asked anything yet.
function greeting() {
  return [
    {
      id: "greeting",
      role: "assistant",
      kind: "text",
      text: "Hi, I am Rix. Ask me where your money went this month, or how to cut a category down.",
      source: null,
    },
  ];
}

export default function AssistantChat({ onClose } = {}) {
  const [messages, setMessages] = useState(greeting);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("ready");
  const [offline, setOffline] = useState(false);
  const idRef = useRef(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const nextId = () => {
    idRef.current += 1;
    return `msg-${Date.now()}-${idRef.current}`;
  };

  // One path for every question. The old version detected an amount in the text
  // and answered from a hardcoded keyword table without ever calling the
  // server, which meant the assistant quoted numbers from a mock dataset rather
  // than from the signed-in student's ledger.
  const handleQuestion = async (text, id) => {
    try {
      const answer = await askAssistant(text);
      if (answer.source !== "poolside") setOffline(true);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, kind: "text", text: answer.reply, source: answer.source }
            : m,
        ),
      );
      setStatus("ready");
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, kind: "error" } : m)));
      setStatus("error");
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || status === "loading") return;
    setDraft("");
    setMessages((prev) => [...prev, { id: nextId(), role: "user", kind: "text", text }]);
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
    setMessages((prev) =>
      prev.map((m) => (m.id === failed.id ? { ...m, kind: "typing" } : m)),
    );
    handleQuestion(userText, failed.id);
  };

  return (
    <section
      aria-label="AI assistant chat"
      className="flex min-h-0 flex-1 flex-col rounded-card bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <BotAvatar className="h-12 w-12" animate={false} />
        <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
          Rix
        </h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="ml-auto rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-100"
          >
            <Icon name="x" size={18} />
          </button>
        ) : (
          <Link
            to="/"
            aria-label="Close assistant"
            className="ml-auto rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-100"
          >
            <Icon name="x" size={18} />
          </Link>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4" aria-live="polite">
        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[85%] break-words rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white">
                  {message.text}
                </p>
              </div>
            );
          }
          if (message.kind === "typing") {
            return (
              <div key={message.id} className="flex items-center gap-2" aria-busy="true" aria-label="Rix is typing">
                <BotAvatar />
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
                <BotAvatar />
                <p className="text-sm text-red-500">
                  Couldn&apos;t reach Rix.{" "}
                  <button type="button" onClick={retry} className="font-semibold underline">
                    Try again
                  </button>
                </p>
              </div>
            );
          }
          return (
            <div key={message.id} className="flex items-start gap-2">
              <BotAvatar />
              <p className="rounded-2xl rounded-tl-md bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-ink-900">
                {message.text}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {offline && (
        <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          <span>
            Rix is answering from your own figures, not the AI model. Every number above
            is read from your ledger, but the wording is a fixed rule rather than a
            generated answer.
          </span>
        </p>
      )}

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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800"
        >
          <Icon name="send" size={16} />
        </button>
      </form>
    </section>
  );
}
