import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Icon from "../../components/Icon.jsx";
import AssistantFab from "../../components/AssistantFab.jsx";
import MobileNav from "../../components/MobileNav.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import SubmitSpinner from "../../components/SubmitSpinner.jsx";
import { getReportCategories, getReports, shareReport } from "../../lib/apiClient.js";
import { formatCurrency } from "../../lib/formatCurrency.js";

const INCOME = "#059669";
const EXPENSE = "#dc2626";
const GRANULARITIES = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

const emptyReport = {
  totals: { income: 0, expense: 0, net: 0, count: 0 },
  byCategory: [],
  buckets: [],
  trend: [],
};

function monthStart(offset = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
    .toISOString()
    .slice(0, 10);
}

const today = () => new Date().toISOString().slice(0, 10);

function reason(err) {
  const text = err?.message || String(err || "unknown error");
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}

function mailOutcome(reason) {
  const sent = "Nothing was actually sent. The report is on screen either way.";
  if (reason === "no_api_key") return `This server has no mail service set up. ${sent}`;
  if (reason === "provider_error") {
    return `The mail provider refused that address, so nothing was sent. Check the address and try again. ${sent}`;
  }
  if (reason === "send_failed") return `The send failed before it left the server. ${sent}`;
  return `Nothing was actually sent. ${sent}`;
}

function bucketLabel(key) {
  if (/^\d{4}-W\d{2}$/.test(key)) return key.replace("-W", " wk ");
  if (/^\d{4}-\d{2}$/.test(key)) {
    const [y, m] = key.split("-");
    return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
    });
  }
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-surface px-3 py-2 shadow-card">
      <p className="text-xs font-semibold text-ink-900">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-xs"
          style={{ color: entry.dataKey === "income" ? INCOME : EXPENSE }}
        >
          {entry.dataKey === "income" ? "In" : "Out"} {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

function StatTile({ label, value, tone }) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p
        className="mt-1 font-display text-2xl font-extrabold tabular-nums"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Loading report</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[86px] animate-pulse rounded-card bg-surface shadow-card" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-card bg-surface shadow-card" />
    </div>
  );
}

export default function Reports() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState({
    from: monthStart(-5),
    to: today(),
    category: "",
    granularity: "month",
  });
  const [categories, setCategories] = useState([]);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({ key: null, data: emptyReport, error: null });
  const [busy, setBusy] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [shareResult, setShareResult] = useState(null);
  const [shareError, setShareError] = useState("");
  const [exportError, setExportError] = useState("");
  const exportRef = useRef(null);

  const requestKey = `${JSON.stringify(filters)}:${nonce}`;

  useEffect(() => {
    let cancelled = false;
    getReportCategories()
      .then((data) => {
        if (cancelled) return;
        setCategories(data.categories ?? []);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getReports(filters)
      .then((data) => {
        if (cancelled) return;
        setResult({ key: requestKey, data: { ...emptyReport, ...data }, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          data: emptyReport,
          error: err.message || "Couldn't load your report.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, filters]);

  const settled = result.key === requestKey;
  const status = settled ? (result.error ? "error" : "ready") : "loading";
  const error = result.error;
  const report = result.data;
  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  const setFilter = (field, value) => setFilters((f) => ({ ...f, [field]: value }));

  const trend = useMemo(
    () =>
      (report.trend ?? []).map((row) => ({
        ...row,
        label: bucketLabel(row.month),
      })),
    [report.trend],
  );

  const buckets = useMemo(
    () => (report.buckets ?? []).map((row) => ({ ...row, label: bucketLabel(row.bucket) })),
    [report.buckets],
  );

  const capture = async () => {
    const node = exportRef.current;
    if (!node) return null;
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    if (wasDark) root.classList.remove("dark");
    await new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      requestAnimationFrame(() => setTimeout(done, 60));
      setTimeout(done, 200);
    });
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      return await html2canvas(node, { backgroundColor: "#ffffff", scale: 2, logging: false });
    } finally {
      if (wasDark) root.classList.add("dark");
    }
  };

  const exportImage = async () => {
    setBusy("image");
    setExportError("");
    try {
      const canvas = await capture();
      if (!canvas) throw new Error("the report was not on the page");
      const link = document.createElement("a");
      link.download = `campuscoin-report-${today()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      setExportError(`Couldn't export the image (${reason(err)}). Try again.`);
    } finally {
      setBusy("");
    }
  };

  const exportPdf = async () => {
    setBusy("pdf");
    setExportError("");
    try {
      const canvas = await capture();
      if (!canvas) throw new Error("the report was not on the page");
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth() - 48;
      const pageHeight = pdf.internal.pageSize.getHeight() - 48;
      const ratio = canvas.height / canvas.width;
      const height = Math.min(pageHeight, pageWidth * ratio);
      const width = height / ratio;
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        (pdf.internal.pageSize.getWidth() - width) / 2,
        24,
        width,
        height,
      );
      pdf.save(`campuscoin-report-${today()}.pdf`);
    } catch (err) {
      setExportError(`Couldn't export the PDF (${reason(err)}). Try again.`);
    } finally {
      setBusy("");
    }
  };

  const sendShare = async (event) => {
    event.preventDefault();
    if (busy) return;
    setShareError("");
    setShareResult(null);
    setBusy("share");
    try {
      const data = await shareReport({
        email: shareEmail.trim(),
        message: shareNote.trim(),
        from: filters.from,
        to: filters.to,
        category: filters.category || undefined,
        granularity: filters.granularity,
      });
      setShareResult(data.mail ?? { delivered: false, reason: "unknown" });
    } catch (err) {
      setShareError(err.message || "Couldn't send that report.");
    } finally {
      setBusy("");
    }
  };

  const hasRows = report.byCategory.length > 0 || buckets.length > 0;

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />
      <AssistantFab />

      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl space-y-5 px-4 pb-24 pt-5 md:pb-5">
          <PageHeader onMenu={() => setSidebarOpen(true)} />

          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Icon name="file-chart" size={22} />
            </span>
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">
                Monthly Reports
              </h1>
              <p className="mt-0.5 text-sm text-ink-500">
                Filter a range, read the split, and export it.
              </p>
            </div>
          </div>

          <section className="rounded-card bg-surface p-4 shadow-card">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-900">From</span>
                <input
                  type="date"
                  value={filters.from}
                  max={filters.to}
                  onChange={(event) => setFilter("from", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-900">To</span>
                <input
                  type="date"
                  value={filters.to}
                  min={filters.from}
                  onChange={(event) => setFilter("to", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-900">Category</span>
                <select
                  value={filters.category}
                  onChange={(event) => setFilter("category", event.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="mb-1 block text-xs font-semibold text-ink-900">Group by</span>
                <div
                  role="group"
                  aria-label="Granularity"
                  className="flex rounded-lg border border-slate-200 p-0.5"
                >
                  {GRANULARITIES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilter("granularity", option.value)}
                      aria-pressed={filters.granularity === option.value}
                      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                        filters.granularity === option.value
                          ? "bg-brand-600 text-white"
                          : "text-ink-500 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={exportPdf}
                disabled={busy !== "" || !hasRows}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink-900 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {busy === "pdf" ? <SubmitSpinner /> : <Icon name="file-down" size={14} />}
                Export PDF
              </button>
              <button
                type="button"
                onClick={exportImage}
                disabled={busy !== "" || !hasRows}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink-900 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {busy === "image" ? <SubmitSpinner /> : <Icon name="image" size={14} />}
                Export image
              </button>
              <button
                type="button"
                onClick={() => {
                  setShareResult(null);
                  setShareError("");
                  setShareOpen((open) => !open);
                }}
                disabled={!hasRows}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink-900 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Icon name="mail" size={14} />
                Share by email
              </button>
              {busy !== "" && <span className="text-xs text-ink-500">Working…</span>}
            </div>

            {exportError && (
              <p className="mt-2 text-xs font-semibold text-red-500" role="alert">
                {exportError}
              </p>
            )}

            {shareOpen && (
              <form onSubmit={sendShare} className="mt-3 rounded-lg bg-slate-50 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-ink-900">Send to</span>
                    <input
                      type="email"
                      required
                      value={shareEmail}
                      onChange={(event) => setShareEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-ink-900">Note</span>
                    <input
                      type="text"
                      value={shareNote}
                      onChange={(event) => setShareNote(event.target.value)}
                      placeholder="Here is my spending for the term"
                      className="w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </label>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={busy === "share"}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-800 disabled:opacity-60"
                  >
                    {busy === "share" && <SubmitSpinner />}
                    Send report
                  </button>
                  {shareResult && (
                    <p className="text-xs text-ink-500">
                      {shareResult.delivered
                        ? `Sent to ${shareEmail.trim()}.`
                        : mailOutcome(shareResult.reason)}
                    </p>
                  )}
                </div>
                {shareError && (
                  <p className="mt-1.5 text-xs font-semibold text-red-500" role="alert">
                    {shareError}
                  </p>
                )}
              </form>
            )}
          </section>

          {status === "loading" && <Skeleton />}

          {status === "error" && (
            <div className="rounded-card bg-surface p-8 text-center shadow-card">
              <Icon name="triangle-alert" size={28} className="mx-auto text-red-500" />
              <p className="mt-2 text-sm font-semibold text-ink-900">{error}</p>
              <button
                type="button"
                onClick={refresh}
                className="mt-3 rounded-lg bg-brand-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-800"
              >
                Try again
              </button>
            </div>
          )}

          {status === "ready" && !hasRows && (
            <div className="rounded-card bg-surface p-10 text-center shadow-card">
              <Icon name="file-chart" size={28} className="mx-auto text-ink-500" />
              <p className="mt-2 text-sm font-semibold text-ink-900">
                Nothing in this range yet
              </p>
              <p className="mt-1 text-sm text-ink-500">
                Widen the dates or clear the category filter.
              </p>
            </div>
          )}

          {status === "ready" && hasRows && (
            <div className="space-y-4" ref={exportRef}>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatTile label="Income" value={formatCurrency(report.totals.income)} tone={INCOME} />
                <StatTile
                  label="Expenses"
                  value={formatCurrency(report.totals.expense)}
                  tone={EXPENSE}
                />
                <StatTile
                  label="Net"
                  value={formatCurrency(report.totals.net)}
                  tone={report.totals.net >= 0 ? INCOME : EXPENSE}
                />
                <StatTile label="Entries" value={String(report.totals.count)} />
              </div>

              <section className="rounded-card bg-surface p-5 shadow-card">
                <h2 className="font-display text-base font-bold text-ink-900">
                  Income vs expenses · last 6 months
                </h2>
                <div className="mt-4 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend} margin={{ top: 5, right: 8, bottom: 0, left: -12 }} barGap={6}>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke="var(--color-slate-200)"
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: "var(--color-ink-500)" }}
                      />
                      <YAxis
                        width={44}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--color-ink-500)" }}
                        tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : value)}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--color-slate-100)" }}
                        content={<TrendTooltip />}
                      />
                      <Bar dataKey="income" name="income" fill={INCOME} radius={[6, 6, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                      <Bar dataKey="expense" name="expense" fill={EXPENSE} radius={[6, 6, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex items-center gap-5 text-xs text-ink-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: INCOME }} />
                    Income
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: EXPENSE }} />
                    Expenses
                  </span>
                </div>
              </section>

              <section className="rounded-card bg-surface p-5 shadow-card">
                <h2 className="font-display text-base font-bold text-ink-900">
                  By {filters.granularity}
                </h2>
                {buckets.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500">No entries to group.</p>
                ) : (
                  <div className="mt-4 h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={buckets} margin={{ top: 5, right: 8, bottom: 0, left: -12 }} barGap={4}>
                        <CartesianGrid
                          vertical={false}
                          strokeDasharray="3 3"
                          stroke="var(--color-slate-200)"
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "var(--color-ink-500)" }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          width={44}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "var(--color-ink-500)" }}
                          tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : value)}
                        />
                        <Tooltip
                          cursor={{ fill: "var(--color-slate-100)" }}
                          content={<TrendTooltip />}
                        />
                        <Bar dataKey="income" name="income" fill={INCOME} radius={[6, 6, 0, 0]} isAnimationActive={false}>
                          {buckets.map((row) => (
                            <Cell key={row.bucket} fill={INCOME} />
                          ))}
                        </Bar>
                        <Bar dataKey="expense" name="expense" fill={EXPENSE} radius={[6, 6, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-card bg-surface shadow-card">
                <div className="border-b border-slate-100 px-5 py-3.5">
                  <h2 className="font-display text-base font-bold text-ink-900">Category split</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-ink-500">
                        <th scope="col" className="px-5 py-2.5 font-semibold">Category</th>
                        <th scope="col" className="px-5 py-2.5 font-semibold">Type</th>
                        <th scope="col" className="px-5 py-2.5 text-right font-semibold">Entries</th>
                        <th scope="col" className="px-5 py-2.5 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.byCategory.map((row) => (
                        <tr key={`${row.category_id}-${row.type}`}>
                          <td className="px-5 py-2.5 font-medium text-ink-900">{row.category}</td>
                          <td className="px-5 py-2.5">
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
                              style={{
                                background: row.type === "income" ? "#d1fae5" : "#fee2e2",
                                color: row.type === "income" ? "#065f46" : "#991b1b",
                              }}
                            >
                              {row.type}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-ink-500">
                            {row.count}
                          </td>
                          <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-ink-900">
                            {formatCurrency(row.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 font-bold">
                        <td className="px-5 py-2.5 text-ink-900" colSpan={3}>
                          Net
                        </td>
                        <td
                          className="px-5 py-2.5 text-right tabular-nums"
                          style={{ color: report.totals.net >= 0 ? INCOME : EXPENSE }}
                        >
                          {formatCurrency(report.totals.net)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
