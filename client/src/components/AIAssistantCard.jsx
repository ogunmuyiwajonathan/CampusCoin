import { useCallback, useEffect, useState } from "react";
import BotAvatar from "./BotAvatar.jsx";
import Icon from "./Icon.jsx";
import { askAssistant } from "../lib/aiAssistant.js";

export default function AIAssistantCard({ breakdown, recent }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("loading");

  const load = useCallback(
    (q) =>
      askAssistant(q, breakdown, recent)
        .then((res) => {
          setAnswer(res);
          setStatus("ready");
        })
        .catch(() => setStatus("error")),
    [breakdown, recent],
  );

  useEffect(() => {
    load("");
  }, [load]);

  const submit = (event) => {
    event.preventDefault();
    const q = question.trim();
    if (!q) return;
    setStatus("loading");
    load(q);
  };

  if (!breakdown?.length) return null;

  return (
    <div className="flex h-full flex-col rounded-card bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <BotAvatar
          className="h-9 w-9"
          shake={status === "ready"}
          typing={status === "loading"}
          key={status === "ready" ? answer : status}
        />
        <h2 className="font-display text-base font-bold tracking-tight text-ink-900">AI Assistant</h2>
      </div>

      <div className="min-h-23 flex-1" aria-live="polite">
        {status === "loading" && (
          <div className="animate-pulse space-y-2.5" aria-busy="true">
            <div className="h-3 w-full rounded bg-slate-200" />
            <div className="h-3 w-5/6 rounded bg-slate-200" />
            <div className="h-3 w-2/3 rounded bg-slate-200" />
          </div>
        )}
        {status === "error" && (
          <p className="text-sm text-red-500">
            Couldn&apos;t reach the assistant.{" "}
            <button
              type="button"
              onClick={() => load(question.trim())}
              className="font-semibold underline"
            >
              Try again
            </button>
          </p>
        )}
        {status === "ready" && (
          <p className="text-sm italic leading-relaxed text-ink-500">{answer}</p>
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
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-500"
        />
        <button
          type="submit"
          aria-label="Send question"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600"
        >
          <Icon name="arrow-up" size={16} />
        </button>
      </form>
    </div>
  );
}
