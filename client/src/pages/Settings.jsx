import { useState } from "react";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useTheme } from "../hooks/useTheme.js";
import { mockUser } from "../data/mockData.js";
import { formatCurrency } from "../lib/formatCurrency.js";

const QUICK_ROWS = [
  { icon: "bell", title: "Notifications", subtitle: "Manage alerts and reminder preferences" },
  { icon: "sun", title: "Appearance", subtitle: "Switch between light and dark mode" },
  { icon: "globe", title: "Language", subtitle: "Choose your preferred language" },
  { icon: "shield", title: "Data & Privacy", subtitle: "Control your data and privacy settings" },
];

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  const displayName = user?.name ?? mockUser.name;
  const email = user?.email ?? mockUser.email;
  const phone = user?.phone ?? mockUser.phone;
  const academicYear = user?.academic_year ?? mockUser.academic_year;
  const savingsGoal = formatCurrency(user?.monthly_savings_goal ?? mockUser.monthly_savings_goal);

  const accountRows = [
    { icon: "mail", label: "Email Address", value: email },
    { icon: "phone", label: "Phone Number", value: phone },
    { icon: "graduation-cap", label: "Academic Year", value: academicYear },
    { icon: "target", label: "Monthly Savings Goal", value: savingsGoal },
  ];

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:pl-60">
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
          <PageHeader onMenu={() => setSidebarOpen(true)} />

          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Icon name="settings" size={22} />
            </span>
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">
                Settings
              </h1>
              <p className="mt-0.5 text-sm text-ink-500">
                Manage your account, preferences, and security settings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <section className="overflow-hidden rounded-card bg-surface shadow-card">
                <div className="flex items-center justify-between border-b border-emerald-100 bg-linear-to-r from-emerald-100/80 via-emerald-50 to-surface px-5 py-3.5">
                  <h2 className="font-display text-base font-bold text-ink-900">
                    Profile Information
                  </h2>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-surface px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    <Icon name="pencil" size={13} />
                    Edit Profile
                  </button>
                </div>
                <div className="flex flex-wrap items-start gap-5 p-5">
                  <div className="relative">
                    <span className="flex h-28 w-28 items-center justify-center rounded-full bg-forest-700 text-4xl font-extrabold text-white">
                      {displayName.charAt(0)}
                    </span>
                    <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-surface text-ink-900 shadow-card">
                      <Icon name="camera" size={14} />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="font-display text-lg font-bold text-ink-900">{displayName}</p>
                      <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">
                        Level 1
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-500">{email}</p>
                    <ul className="mt-3.5 flex flex-col gap-2 text-sm text-ink-500">
                      <li className="flex items-center gap-2">
                        <Icon name="user" size={15} className="text-emerald-600" />
                        Student
                      </li>
                      <li className="flex items-center gap-2">
                        <Icon name="graduation-cap" size={15} className="text-emerald-600" />
                        {mockUser.school}
                      </li>
                      <li className="flex items-center gap-2">
                        <Icon name="calendar" size={15} className="text-emerald-600" />
                        Joined {mockUser.joined}
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-card bg-surface shadow-card">
                <div className="border-b border-emerald-100 bg-linear-to-r from-emerald-100/80 via-emerald-50 to-surface px-5 py-3.5">
                  <h2 className="font-display text-base font-bold text-ink-900">Quick Settings</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {QUICK_ROWS.map((row) =>
                    row.title === "Appearance" ? (
                      <button
                        key={row.title}
                        type="button"
                        role="switch"
                        aria-checked={theme === "dark"}
                        onClick={toggle}
                        className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition hover:bg-slate-50"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <Icon name={row.icon} size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink-900">
                            {row.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-500">{row.subtitle}</span>
                        </span>
                        <span
                          className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                            theme === "dark" ? "bg-brand-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`h-5 w-5 rounded-full bg-surface dark:bg-white shadow transition-transform ${
                              theme === "dark" ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </span>
                      </button>
                    ) : (
                      <button
                        key={row.title}
                        type="button"
                        className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition hover:bg-slate-50"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <Icon name={row.icon} size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink-900">
                            {row.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-500">{row.subtitle}</span>
                        </span>
                        <Icon name="chevron-right" size={16} className="shrink-0 text-slate-400" />
                      </button>
                    ),
                  )}
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-4">
              <section className="overflow-hidden rounded-card bg-surface shadow-card">
                <div className="flex items-center gap-2.5 px-5 py-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Icon name="user" size={17} />
                  </span>
                  <h2 className="font-display text-base font-bold text-ink-900">
                    Account Settings
                  </h2>
                </div>
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {accountRows.map((row) => (
                    <button
                      key={row.label}
                      type="button"
                      className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition hover:bg-slate-50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <Icon name={row.icon} size={16} />
                      </span>
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span className="text-sm font-medium text-ink-900">{row.label}</span>
                        <span className="truncate text-sm text-ink-500">{row.value}</span>
                      </span>
                      <Icon name="chevron-right" size={16} className="shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-card bg-surface shadow-card">
                <div className="flex items-center gap-2.5 px-5 py-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Icon name="shield" size={17} />
                  </span>
                  <h2 className="font-display text-base font-bold text-ink-900">Security</h2>
                </div>
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Icon name="lock" size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-900">
                        Change Password
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        Update your password regularly
                      </span>
                    </span>
                    <Icon name="chevron-right" size={16} className="shrink-0 text-slate-400" />
                  </button>
                  <div className="flex w-full items-center gap-3.5 px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Icon name="shield" size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-900">
                        Two-Factor Authentication
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        Add an extra layer of security
                      </span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={twoFactor}
                      aria-label="Two-factor authentication"
                      onClick={() => setTwoFactor((value) => !value)}
                      className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                        twoFactor ? "bg-brand-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full bg-surface dark:bg-white shadow transition-transform ${
                          twoFactor ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Icon name="clock" size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-900">
                        Login Activity
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        View recent login sessions
                      </span>
                    </span>
                    <Icon name="chevron-right" size={16} className="shrink-0 text-slate-400" />
                  </button>
                </div>
              </section>

              <section className="flex flex-wrap items-center gap-4 rounded-card bg-linear-to-r from-emerald-100/80 via-emerald-50 to-surface p-5 ring-1 ring-emerald-100">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-emerald-600 shadow-card">
                  <Icon name="graduation-cap" size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold text-ink-900">Need Help?</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                    If you&apos;re having trouble with your account, our support team is here to
                    help.
                  </p>
                </div>
                <a
                  href="mailto:support@campuscoin.app"
                  className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-surface px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <Icon name="mail" size={14} />
                  Contact Support
                </a>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
