import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";

/**
 * AI insight card - tip derived from the top expense category (advisory only,
 * SRS: insights are guidance, never certified financial advice).
 */
export default function AIAssistantCard({ topCategory }) {
  if (!topCategory) return null;

  return (
    <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600">
          <Icon name="bot" size={18} />
        </span>
        <h2 className="text-base font-bold text-ink-900">AI Assistant</h2>
      </div>

      <p className="flex-1 text-sm italic leading-relaxed text-ink-500">
        You spent {topCategory.percentage}% of your money on {topCategory.name.toLowerCase()} this
        month - your top category. Consider cooking more or using student discounts to keep it
        lower next month.
      </p>

      <Link
        to="/insights"
        className="mt-4 block rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-600"
      >
        View Full Insights
      </Link>
    </div>
  );
}
