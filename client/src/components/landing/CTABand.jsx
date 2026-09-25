import { Link } from "react-router-dom";
import Icon from "../Icon.jsx";

export default function CTABand() {
  return (
    <section className="bg-white pb-16 pt-8 sm:pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-r from-brand-600 to-emerald-700 px-6 py-8 text-center shadow-lg shadow-emerald-600/20 sm:px-10 md:flex-row md:justify-between md:text-left">
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-amber-300">
              <Icon name="coins" size={28} />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold text-white sm:text-2xl">
                Your money. Your goals. Your Campus Coin.
              </h2>
              <p className="mt-1.5 text-sm text-emerald-50">
                Join thousands of students who are already making smarter financial decisions.
              </p>
            </div>
          </div>

          <Link
            to="/login"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-forest-900 transition hover:bg-sage-100"
          >
            Create Your Account
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
