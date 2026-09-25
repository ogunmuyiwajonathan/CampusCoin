import { Link } from "react-router-dom";
import Icon from "../Icon.jsx";
import desktopDashboard from "../../assets/Website.png";
import mobileDashboard from "../../assets/mobile.png";

export default function Hero() {
  return (
    <section id="home" className="relative scroll-mt-20 overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute -left-28 top-4 h-72 w-72 rounded-full bg-sage-100/70 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-emerald-100/50 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,45%)_minmax(0,55%)] lg:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-sage-100 px-4 py-1.5 text-xs font-bold text-forest-700">
            Smart Spending
            <span className="h-1 w-1 rounded-full bg-brand-600" aria-hidden="true" />
            Better Tomorrow
          </p>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-forest-900 sm:text-5xl lg:text-[3.4rem]">
            Take Control of Your Money.
            <span className="block text-brand-600">Student Style.</span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-500 sm:text-lg">
            Campus Coin is a simple, smart and student-friendly budget tracker that helps you
            manage your income, expenses and build better financial habits.
          </p>

          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            Get Started Free
            <Icon name="arrow-right" size={17} />
          </Link>
        </div>

        <div className="relative pb-28 sm:pb-20 lg:pb-10">
          <div
            className="absolute inset-x-4 top-4 bottom-14 rounded-[2.5rem] bg-sage-100/60"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-2xl">
            <div className="rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-slate-200/80">
              <img
                src={desktopDashboard}
                alt="Campus Coin dashboard showing balance, spending overview and recent transactions"
                className="w-full rounded-xl"
              />
            </div>
            <div
              className="mx-auto h-2.5 w-2/5 rounded-b-full bg-slate-300"
              aria-hidden="true"
            />

            <div className="absolute -top-6 right-0 z-20 w-48 rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-slate-100 sm:-right-4 sm:w-56 sm:p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-500">
                  <Icon name="lightbulb" size={15} />
                </span>
                <p className="text-sm font-bold text-forest-900">AI Tip</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">
                You&apos;ve spent 30% more on food this month. Consider cooking more at home to
                save!
              </p>
            </div>

            <div className="absolute -bottom-6 right-1 z-10 w-32 sm:-bottom-8 sm:right-0 sm:w-36 lg:w-40">
              <div className="rounded-[2rem] bg-forest-900 p-2 shadow-2xl ring-1 ring-forest-900">
                <img
                  src={mobileDashboard}
                  alt="Campus Coin mobile dashboard"
                  className="w-full rounded-[1.5rem]"
                />
              </div>
            </div>

            <Icon
              name="sparkles"
              size={26}
              className="absolute -top-4 right-16 hidden text-amber-400 sm:block"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
