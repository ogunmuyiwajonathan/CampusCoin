import { useState } from "react";
import BotAvatar from "./BotAvatar.jsx";
import Icon from "./Icon.jsx";
import { sendMessage, friendlyAiError } from "../lib/aiAssistant.js";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import SubmitSpinner from "./SubmitSpinner.jsx";

export default function AIAssistantCard() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [status, setStatus] = useState("idle");
  const { locked, lock: lockSend, unlock: unlockSend, measure: measureSend } = useSubmitLock();

  // The lock is taken here, not in the callers, so every path that starts a
  // request is covered. Before, only the send button locked: "Try again" and
  // the example chips called load() directly and could be clicked twice.
  const load = (value) => {
    const text = value.trim();
    if (!text) return;
    if (!lockSend()) return;
    setLastQuestion(text);
    setStatus("loading");
    sendMessage(text)
      .then((res) => {
        setAnswer(res.reply);
        setStatus("ready");
      })
      .catch((error) => {
        setAnswer(friendlyAiError(error).message);
        setStatus("error");
      })
      .finally(() => unlockSend());
  };

  const submit = (event) => {
    event.preventDefault();
    const value = question.trim();
    if (!value || status === "loading") return;
    setQuestion("");
    load(value);
  };

  return (
    <div className="flex h-full flex-col rounded-card bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <BotAvatar className="h-12 w-12" />
        <h2 className="font-display text-base font-bold tracking-tight text-ink-900">Rix</h2>
      </div>

      <div className="min-h-23 flex-1" aria-live="polite">
        {status === "idle" && (
          <p className="text-sm leading-relaxed text-ink-500">
            Ask me anything about your spending and I&apos;ll answer from your
            real transactions.
          </p>
        )}
        {status === "loading" && (
          <div className="animate-pulse space-y-2.5" aria-busy="true">
            <div className="h-3 w-full rounded bg-slate-200" />
            <div className="h-3 w-5/6 rounded bg-slate-200" />
            <div className="h-3 w-2/3 rounded bg-slate-200" />
          </div>
        )}
        {status === "error" && (
          <p className="text-sm text-red-500">
            {answer}{" "}
            <button
              type="button"
              onClick={() => load(lastQuestion)}
              disabled={locked}
              aria-busy={locked}
              className="font-semibold underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {locked ? "Trying..." : "Try again"}
            </button>
          </p>
        )}
        {status === "ready" && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-900">{answer}</p>
        )}
      </div>

      <form
        onSubmit={submit}
        className="mt-4 flex items-center gap-2 rounded-card bg-slate-100 py-1.5 pl-4 pr-1.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about your spending..."
          aria-label="Ask the AI assistant a question"
          disabled={status === "loading"}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-500 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          ref={measureSend}
          aria-label="Send question"
          aria-busy={locked}
          disabled={locked || question.trim().length === 0}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {locked ? <SubmitSpinner className="h-3.5 w-3.5" /> : <Icon name="arrow-up" size={16} />}
        </button>
      </form>
    </div>
  );
}
