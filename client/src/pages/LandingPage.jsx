import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import Reveal from "../components/Reveal.jsx";
import Sitemap from "../components/Sitemap.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import SpendingDonut from "../components/SpendingDonut.jsx";
import { CATEGORY_COLORS } from "../data/mockData.js";
import { demoLogin } from "../lib/apiClient.js";
import { formatCurrency } from "../lib/formatCurrency.js";
import aibot from "../assets/aibot.webp";
import aboutArt from "../assets/about.webp";
import laptop from "../assets/laptop.webp";
import student from "../assets/student.webp";

const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Insights", href: "#insights" },
];

const TRUST_BADGES = [
  { id: "easy", icon: "zap", chip: "bg-amber-100 text-amber-600", title: "Easy to Use", text: "In minutes, not hours" },
  { id: "secure", icon: "lock", chip: "bg-emerald-100 text-emerald-600", title: "Secure & Private", text: "Your data, your control" },
  { id: "devices", icon: "smartphone", chip: "bg-blue-100 text-blue-600", title: "Works on All Devices", text: "Desktop, tablet & mobile" },
];

const FINANCE_CHECKLIST = [
  { id: "balance", text: "Balance overview" },
  { id: "budget", text: "Budget vs actual" },
  { id: "top", text: "Top spending category" },
  { id: "recent", text: "Recent transactions" },
  { id: "tip", text: "Personalized saving tip" },
];

const PREVIEW_STATS = [
  { id: "balance", label: "Total Balance", value: formatCurrency(48200), icon: "wallet", tile: "bg-emerald-50", chip: "bg-emerald-100 text-emerald-600" },
  { id: "spending", label: "This Month's Spending", value: formatCurrency(26400), icon: "arrow-down", tile: "bg-sky-50", chip: "bg-blue-100 text-blue-600" },
  { id: "budget", label: "Monthly Budget", value: formatCurrency(35000), icon: "target", tile: "bg-purple-50", chip: "bg-purple-100 text-purple-600" },
];

const PREVIEW_BREAKDOWN = [
  { category_id: "c5", name: "Food", amount: 21888, percentage: 32, color: CATEGORY_COLORS.c5 },
  { category_id: "c6", name: "Transport", amount: 12312, percentage: 18, color: CATEGORY_COLORS.c6 },
  { category_id: "c7", name: "Hostel", amount: 10260, percentage: 15, color: CATEGORY_COLORS.c7 },
  { category_id: "c8", name: "Academics", amount: 8208, percentage: 12, color: CATEGORY_COLORS.c8 },
  { category_id: "c11", name: "Others", amount: 15732, percentage: 23, color: CATEGORY_COLORS.c11 },
];

const PREVIEW_TRANSACTIONS = [
  { id: "canteen", icon: "utensils", chip: "bg-red-100 text-red-500", name: "Canteen", sub: "Food · Apr 23", amount: "-₦850", positive: false },
  { id: "bus", icon: "bus", chip: "bg-blue-100 text-blue-600", name: "Bus Pass", sub: "Transport · Apr 22", amount: "-₦1,200", positive: false },
  { id: "salary", icon: "wallet", chip: "bg-emerald-100 text-emerald-600", name: "Salary (Part-time)", sub: "Income · Apr 20", amount: "+₦12,000", positive: true },
];

const ABOUT_CARDS = [
  { id: "track", icon: "wallet", chip: "bg-emerald-100 text-emerald-600", title: "Track Income & Expenses", text: "Log every naira in and out the moment it happens." },
  { id: "budgets", icon: "chart-pie", chip: "bg-blue-100 text-blue-600", title: "Set Monthly Budgets", text: "Give every category a limit and watch it in real time." },
  { id: "habits", icon: "chart-column", chip: "bg-purple-100 text-purple-600", title: "Understand Spending Habits", text: "See your patterns with charts that actually make sense." },
  { id: "tips", icon: "lightbulb", chip: "bg-amber-100 text-amber-600", title: "Get Personalized Saving Tips", text: "Small, practical advice based on how you really spend." },
];

const AI_CHECKLIST = [
  { id: "auto", text: "Auto-categorize expenses" },
  { id: "summary", text: "Monthly spending summary" },
  { id: "actions", text: "Actionable suggestions" },
];

const QUICK_LINKS = [
  { label: "Home", href: "#top" },
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Insights", href: "#insights" },
];

const ACCOUNT_LINKS = [
  { label: "Login", to: "/login" },
  { label: "Register", to: "/signup" },
];

const RESOURCE_LINKS = [
  { label: "FAQ", to: "/faq" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
];

const SOCIALS = [
  { label: "Instagram", icon: "instagram" },
  { label: "Facebook", icon: "facebook" },
  { label: "X", icon: "x" },
  { label: "YouTube", icon: "youtube" },
];

function SocialIcon({ icon }) {
  if (icon === "x") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icon === "instagram" && (
        <>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </>
      )}
      {icon === "facebook" && (
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      )}
      {icon === "youtube" && (
        <>
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.92 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
        </>
      )}
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await demoLogin();
      navigate("/dashboard");
    } catch {
      navigate("/signup");
    } finally {
      setBusy(false);
    }
  };
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("scroll-smooth");
    return () => root.classList.remove("scroll-smooth");
  }, []);

  const scrollToSection = (event, href) => {
    const target = document.getElementById(href.replace("#", ""));
    if (!target) return;
    event.preventDefault();
    setMenuOpen(false);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (event.target instanceof Element && !event.target.closest("[data-landing-header]")) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  return (
    <div id="top" className="min-h-svh bg-mint-50 text-ink-900">
      <header
        data-landing-header
        className="sticky top-0 z-50 border-b border-slate-200/70 bg-surface/95 backdrop-blur"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                navigate("/");
              }}
              className="flex items-center gap-2"
              aria-label="Campus Coin home"
            >
              <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
              <span className="font-display text-lg font-extrabold tracking-tight">
                Campus <span className="text-brand-600">Coin</span>
              </span>
            </button>
          </div>
          <nav className="hidden items-center justify-center gap-8 lg:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(event) => scrollToSection(event, link.href)}
                className="text-sm font-semibold text-ink-500 transition hover:text-ink-900"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-4">
            <ThemeToggle className="mr-1" />
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="hidden text-sm font-semibold text-ink-500 transition hover:text-ink-900 md:block"
            >
              Login
            </button>
            <button
              type="button"
              onClick={start}
              className="hidden rounded-full bg-brand-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-800 md:inline-flex"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="rounded-lg p-2 text-ink-900 hover:bg-slate-100 lg:hidden"
            >
              <Icon name={menuOpen ? "x" : "menu"} size={22} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            className="absolute inset-x-0 top-full z-50 border-t border-slate-200/70 bg-surface px-4 py-3 shadow-card lg:hidden"
            aria-label="Menu"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(event) => scrollToSection(event, link.href)}
                className="block rounded-lg px-2 py-2.5 text-sm font-semibold text-ink-900 hover:bg-slate-100"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-slate-200/70 pt-3 md:hidden">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex-1 rounded-full px-4 py-2 text-sm font-bold text-ink-900 ring-1 ring-slate-300"
              >
                Login
              </button>
              <button
                type="button"
                onClick={start}
                className="flex-1 rounded-full bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800"
              >
                Get Started
              </button>
            </div>
          </nav>
        )}
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-10 lg:grid-cols-2 lg:pt-16">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Smart Spending <span aria-hidden="true">•</span> Better Tomorrow
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Take Control of Your Money. <span className="text-brand-600">Student Style.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-500 sm:text-base">
              Campus Coin is a simple, smart and student-friendly budget tracker that helps
              you manage your income, expenses and build better financial habits.
            </p>
            <button
              type="button"
              onClick={start}
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-800 active:scale-[0.98]"
            >
              Get Started Free
              <Icon
                name="arrow-right"
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>
            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {TRUST_BADGES.map((badge) => (
                <li key={badge.id} className="flex items-start gap-2.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${badge.chip}`}>
                    <Icon name={badge.icon} size={17} />
                  </span>
                  <span>
                    <span className="block text-xs font-bold">{badge.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-ink-500">{badge.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="relative" delay={120}>
            <img
              src={laptop}
              alt="Campus Coin dashboard on a laptop and phone"
              width={1400}
              height={783}
              loading="eager"
              className="h-auto w-full object-contain"
            />
          </Reveal>
        </section>

        <section className="bg-surface">
          <Reveal className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-14 md:grid-cols-2 md:pb-0">
            <img
              src={student}
              alt="Student with a laptop wondering where their money went"
              width={1000}
              height={800}
              loading="lazy"
              className="mx-auto h-auto w-full max-w-md object-contain"
            />
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                Built for Real Student Life
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500 sm:text-base">
                Unlike generic finance apps, Campus Coin is designed around your student
                expenses — from food and transport to hostel, academics and subscriptions.
              </p>
              <a
                href="#features"
                onClick={(event) => scrollToSection(event, "#features")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline"
              >
                See all features
                <Icon name="arrow-right" size={16} />
              </a>
            </div>
          </Reveal>
        </section>

        <section id="about" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14">
          <Reveal className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                About Campus Coin
              </p>
              <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Smart Spending
                <br />
                <span className="text-brand-600">Student Style</span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-500 sm:text-base md:max-w-none lg:max-w-md">
                Campus Coin is a budget tracker built around the way students actually
                spend — on an allowance, a side gig, or whatever came in this month. It
                turns that into a plan you can see and stick to.
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500 sm:text-base md:max-w-none lg:max-w-md">
                Log what comes in and what goes out, set a limit for the things that drain
                you fastest, and let the app show you where you can save without giving up
                what makes campus life worth it.
              </p>
              <p className="mt-6 text-lg font-extrabold text-emerald-700 dark:text-emerald-400 sm:text-xl">
                Spend smarter. Save better. Stay in control.
                <span
                  aria-hidden="true"
                  className="mx-auto mt-2 block h-1 w-16 rounded-full bg-brand-500"
                />
              </p>
            </div>
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-x-4 bottom-6 h-28 rounded-full bg-emerald-100 blur-2xl"
              />
              <img
                src={aboutArt}
                alt="A student reviewing their Campus Coin budget on a laptop"
                width={1200}
                height={623}
                loading="lazy"
                className="relative mx-auto h-auto w-full object-contain"
              />
            </div>
          </Reveal>

          <div id="features" className="scroll-mt-20">
            <Reveal className="mt-12 text-center">
              <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                Key Features
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
                Everything you need to manage your money, made simple.
              </p>
            </Reveal>

            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT_CARDS.map((card, index) => (
              <Reveal
                as="li"
                key={card.id}
                delay={index * 70}
                className="rounded-xl bg-surface p-5 text-center shadow-card"
              >
                <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${card.chip}`}>
                  <Icon name={card.icon} size={22} />
                </span>
                <p className="mt-3 text-sm font-bold">{card.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{card.text}</p>
              </Reveal>
            ))}
            </ul>
          </div>

          <Reveal className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={start}
              className="group inline-flex items-center gap-2 rounded-full bg-brand-700 px-8 py-3.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-800 active:scale-[0.98]"
            >
              Get Started
              <Icon
                name="arrow-right"
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>
          </Reveal>
        </section>

        <section id="insights" className="scroll-mt-20 bg-emerald-50">
          <Reveal className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                A Clearer View of Your Finances
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500 sm:text-base">
                Get a complete picture of your spending with an easy-to-read dashboard.
              </p>
              <ul className="mt-5 space-y-3">
                {FINANCE_CHECKLIST.map((item) => (
                  <li key={item.id} className="flex items-center gap-2.5 text-sm font-semibold">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
                      <Icon name="check" size={14} />
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4 rounded-card bg-surface p-5 shadow-card">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PREVIEW_STATS.map((stat) => (
                  <div key={stat.id} className={`flex items-center gap-2.5 rounded-xl ${stat.tile} p-3`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${stat.chip}`}>
                      <Icon name={stat.icon} size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] text-ink-500">{stat.label}</span>
                      <span className="block truncate text-sm font-extrabold tabular-nums">{stat.value}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl ring-1 ring-slate-200/70 p-4">
                  <h3 className="text-sm font-bold">Spending by Category</h3>
                  <div className="mt-2">
                    <SpendingDonut breakdown={PREVIEW_BREAKDOWN} totalExpense={68400} stacked />
                  </div>
                </div>
                <div className="rounded-xl ring-1 ring-slate-200/70 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Recent Transactions</h3>
                    <button
                      type="button"
                      onClick={() => navigate("/transactions")}
                      className="text-[11px] font-bold text-brand-600 hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {PREVIEW_TRANSACTIONS.map((tx) => (
                      <li key={tx.id} className="flex items-center gap-2.5 py-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tx.chip}`}>
                          <Icon name={tx.icon} size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold">{tx.name}</span>
                          <span className="block truncate text-[11px] text-ink-500">{tx.sub}</span>
                        </span>
                        <span className={`shrink-0 text-xs font-bold tabular-nums ${tx.positive ? "text-brand-600" : "text-red-500"}`}>
                          {tx.amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <Icon name="lightbulb" size={17} />
                </span>
                <p className="min-w-0 flex-1 text-xs leading-relaxed">
                  <span className="block font-bold">Saving Tip</span>
                  <span className="text-ink-500">
                    You&apos;ve spent 30% more on food this month. Consider cooking more at
                    home to save!
                  </span>
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="mx-auto max-w-7xl px-4">
          <Reveal className="grid items-center gap-6 rounded-card bg-purple-50 p-6 md:grid-cols-[auto_1fr_auto] md:p-8">
            <img src={aibot} alt="" className="h-20 w-20 object-contain" loading="lazy" />
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight">
                Smarter with Rix (Beta)
              </h2>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-500">
                Let AI do the heavy lifting — automatically categorize your expenses,
                summarize your monthly spending and give you simple, actionable insights.
              </p>
            </div>
            <ul className="space-y-2.5">
              {AI_CHECKLIST.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm font-semibold">
                  <Icon name="check" size={16} className="shrink-0 text-purple-600" />
                  {item.text}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        <section className="mx-auto max-w-7xl px-4 pt-6">
          <Reveal className="flex flex-col items-center gap-6 rounded-card bg-brand-700 p-8 md:flex-row">
            <img src="/logo.png" alt="" className="h-12 w-12 shrink-0 object-contain" />
            <div className="min-w-0 flex-1 text-center md:text-left">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                Your money. Your goals. Your Campus Coin.
              </h2>
              <p className="mt-1 text-sm text-white">
                Join thousands of students who are already making smarter financial decisions.
              </p>
            </div>
            <button
              type="button"
              onClick={start}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-forest-900 transition hover:bg-emerald-50"
            >
              Create Your Account
              <Icon name="arrow-right" size={17} />
            </button>
          </Reveal>
        </section>

        <section id="sitemap" className="mx-auto max-w-7xl px-4 pb-16 pt-14">
          <Sitemap />
        </section>
      </main>

      <footer className="mt-14 bg-forest-900 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:gap-x-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] lg:gap-x-10">
          <div id="footer-about" className="col-span-2 sm:col-span-1">
            <p className="flex items-center gap-2">
              <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
              <span className="font-display text-lg font-extrabold tracking-tight">Campus Coin</span>
            </p>
            <p className="mt-2 text-xs text-sage-400">Smart Spending • Student Style</p>
          </div>
          <nav aria-label="Quick links">
            <p className="text-xs font-bold uppercase tracking-wider text-sage-400">Quick Links</p>
            <ul className="mt-3 space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(event) => scrollToSection(event, link.href)}
                    className="text-sm text-white/85 transition hover:text-white hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Account" className="col-span-2 order-1 sm:col-span-1 sm:order-none">
            <p className="text-xs font-bold uppercase tracking-wider text-sage-400">Account</p>
            <ul className="mt-3 space-y-2">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-white/85 transition hover:text-white hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Resources">
            <p className="text-xs font-bold uppercase tracking-wider text-sage-400">Resources</p>
            <ul className="mt-3 space-y-2">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.label}>
                  <button
                    type="button"
                    onClick={() => navigate(link.to)}
                    className="text-sm text-white/85 transition hover:text-white hover:underline"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="col-span-2 order-2 sm:order-none lg:col-span-1">
            <p className="text-xs font-bold uppercase tracking-wider text-sage-400">Connect With Us</p>
            <ul className="mt-3 flex items-center gap-2">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href="#top"
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  >
                    <SocialIcon icon={social.icon} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-white/70 sm:text-left">
            © 2026 Campus Coin. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
