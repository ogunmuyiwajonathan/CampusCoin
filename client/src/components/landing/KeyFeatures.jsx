import Icon from "../Icon.jsx";

const FEATURES = [
  {
    icon: "wallet",
    title: "Track Income & Expenses",
    note: "Log your money in seconds.",
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: "tag",
    title: "Smart Categories",
    note: "Auto & manual categorization for better clarity.",
    tone: "bg-violet-100 text-violet-600",
  },
  {
    icon: "target",
    title: "Budget Goals",
    note: "Set limits and stay on track.",
    tone: "bg-orange-100 text-orange-500",
  },
  {
    icon: "chart-column",
    title: "Spending Insights",
    note: "Visualize trends and spot patterns.",
    tone: "bg-sky-100 text-sky-500",
  },
  {
    icon: "lightbulb",
    title: "Saving Tips",
    note: "Personalized tips based on your habits.",
    tone: "bg-rose-100 text-rose-500",
  },
  {
    icon: "bot",
    title: "AI Assistant (Optional)",
    note: "Auto-categorize and get monthly summaries.",
    tone: "bg-violet-100 text-violet-600",
  },
];

export default function KeyFeatures() {
  return (
    <section id="features" className="scroll-mt-20 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-forest-900 sm:text-4xl">
          Key Features
        </h2>
        <p className="mt-3 text-center text-ink-500">
          Everything you need to manage your money, made simple.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl bg-white p-5 text-center shadow-card ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span
                className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${feature.tone}`}
              >
                <Icon name={feature.icon} size={22} />
              </span>
              <h3 className="mt-4 text-sm font-bold leading-snug text-forest-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">{feature.note}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
