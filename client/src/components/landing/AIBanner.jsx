import Icon from "../Icon.jsx";

const AI_POINTS = [
  "Auto-categorize expenses",
  "Monthly spending summary",
  "Actionable suggestions",
];

export default function AIBanner() {
  return (
    <section className="bg-white pb-4 pt-6" aria-label="Smarter with AI">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-8 rounded-3xl bg-violet-50 px-6 py-8 ring-1 ring-violet-100 sm:px-8 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="relative h-24 w-32 shrink-0" aria-hidden="true">
            <span className="absolute bottom-0 left-0 flex h-16 w-16 items-center justify-center rounded-full bg-violet-300 text-violet-700">
              <Icon name="bot" size={34} />
            </span>
            <span className="absolute right-0 top-0 flex flex-col gap-1.5 rounded-xl bg-white px-2.5 py-2 shadow-md">
              <span className="block h-1.5 w-12 rounded-full bg-slate-200" />
              <span className="block h-1.5 w-9 rounded-full bg-slate-200" />
            </span>
            <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-violet-500 shadow-md">
              <Icon name="chart-column" size={15} />
            </span>
          </div>

          <div>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-forest-900 sm:text-2xl">
              Meet Penny, Your Expense AI
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
              Let AI do the heavy lifting — automatically categorize your expenses, summarize your
              monthly spending and give you simple, actionable insights.
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {AI_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-center gap-2.5 text-sm font-semibold text-forest-900"
              >
                <Icon name="check" size={16} className="shrink-0 text-violet-600" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
