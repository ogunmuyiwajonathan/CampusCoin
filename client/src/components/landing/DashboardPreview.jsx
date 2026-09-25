import Icon from "../Icon.jsx";
import financePreview from "../../assets/finance.png";

const HIGHLIGHTS = [
  "Balance overview",
  "Budget vs actual",
  "Top spending category",
  "Recent transactions",
  "Personalized saving tip",
];

export default function DashboardPreview() {
  return (
    <section id="insights" className="scroll-mt-20 bg-sage-100/60 py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)]">
        <div>
          <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-forest-900 sm:text-4xl">
            A Clearer View of Your Finances
          </h2>
          <p className="mt-4 leading-relaxed text-ink-500">
            Get a complete picture of your spending with an easy-to-read dashboard.
          </p>
          <ul className="mt-6 flex flex-col gap-3.5">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-sm font-semibold text-forest-900"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                  <Icon name="check" size={14} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-white p-3 shadow-xl ring-1 ring-black/5">
          <img
            src={financePreview}
            alt="Dashboard preview with balance, spending by category and recent transactions"
            className="w-full rounded-2xl"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
