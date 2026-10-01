import { useState } from "react";
import Icon from "../components/Icon.jsx";
import PublicPage from "../components/PublicPage.jsx";
import { FAQ_GROUPS } from "../data/legal.js";

const DESCRIPTION =
  "Plain answers about CampusCoin: adding transactions, budgets and alerts, CSV import, AI suggestions, and your account.";

function Answer({ answer, points }) {
  return (
    <div className="text-sm leading-relaxed text-ink-500">
      {answer ? <p>{answer}</p> : null}
      {points?.length ? (
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  const buttonId = `faq-${item.id}-button`;
  const panelId = `faq-${item.id}-panel`;

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-start justify-between gap-3 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="text-sm font-semibold text-ink-900">{item.question}</span>
          <Icon
            name="chevron-down"
            size={16}
            className={`mt-0.5 shrink-0 text-ink-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="pb-4">
        <Answer answer={item.answer} points={item.points} />
      </div>
    </div>
  );
}

export default function Faq() {
  return (
    <PublicPage
      title="Frequently asked questions"
      description={DESCRIPTION}
      current="FAQ"
    >
      <div className="space-y-8">
        {FAQ_GROUPS.map((group) => (
          <section key={group.id} aria-labelledby={`faq-group-${group.id}`}>
            <h2
              id={`faq-group-${group.id}`}
              className="font-display text-xl font-bold tracking-tight text-ink-900"
            >
              {group.title}
            </h2>
            <div className="mt-3 overflow-hidden rounded-card border border-slate-200 bg-surface px-5 shadow-card">
              {group.items.map((item) => (
                <FaqItem key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PublicPage>
  );
}
