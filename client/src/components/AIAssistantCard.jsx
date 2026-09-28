import { useCallback, useEffect, useState } from "react";
import BotAvatar from "./BotAvatar.jsx";
import Icon from "./Icon.jsx";
import { askAssistant } from "../lib/aiAssistant.js";

// The summary card on the dashboard. It asks the server for this month's picture
// on mount, so what it shows is the same figure the charts above it are drawn
// from, rather than a separate calculation.
//
// The breakdown prop used to be answered here from mockData. The server owns
// that now, so the prop is not read - Dashboard still passes it, and an ignored
// prop is not a reason to edit a file another session is working in.
export default function AIAssistantCard() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState(null);
  const [status, setStatus] = useState("loading");

  // Used only for questions the student sends. The mount call below does its own
  // fetch rather than calling this, because calling a state-setting function from
  // inside an effect is the cascading-render pattern the linter rejects.
  const load = useCallback(async (q) => {
    setStatus("loading");
    try {
      const result = await askAssistant(q);
      setAnswer(result.reply);
      setSource(result.source);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  // status already starts as "loading", so nothing has to be set synchronously
  // before the request goes out. The cancelled flag stops a reply that lands
  // after unmount from writing to a dead component.
  useEffect(() => {
    let cancelled = false;
    askAssistant("")
      .then((result) => {
        if (cancelled) return;
        setAnswer(result.reply);
        setSource(result.source);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const q = question.trim();
    if (!q) return;
    load(q);
  };

  return (
    <div className="flex h-full flex-col rounded-card bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <BotAvatar className="h-12 w-12" />
        <h2 className="font-display text-base font-bold tracking-tight text-ink-900">Rix</h2>
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
            Couldn&apos;t reach Rix.{" "}
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
          <>
            <p className="text-sm italic leading-relaxed text-ink-500">{answer}</p>
            {source !== "poolside" && (
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-amber-800">
                <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                <span>Offline mode - this was computed from your ledger, not generated.</span>
              </p>
            )}
          </>
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800"
        >
          <Icon name="arrow-up" size={16} />
        </button>
      </form>
    </div>
  );
}
