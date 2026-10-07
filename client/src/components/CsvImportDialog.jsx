import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import SubmitSpinner from "./SubmitSpinner.jsx";
import { CSV_MAX_BYTES, importTransactionsCsv, undoImportBatch } from "../lib/apiClient.js";
import { formatCurrency } from "../lib/formatCurrency.js";

const SAMPLE = `date,description,amount,category,type
2026-08-01,Campus Cafe,850,Food,expense
2026-08-03,Bus fare,600,Transport,expense`;

function RowOutcome({ row }) {
  const accepted = row.status === "accepted";
  return (
    <li className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            accepted ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
          }`}
        >
          {accepted ? "Imported" : "Skipped"}
        </span>
        <span className="text-xs font-semibold text-ink-500">Row {row.row}</span>
        {accepted && row.amount !== undefined && (
          <span className="ml-auto text-sm font-bold text-ink-900">
            {formatCurrency(row.amount)}
          </span>
        )}
      </div>
      {accepted ? (
        <p className="text-sm text-ink-900">
          {row.description || "No description"}
          <span className="text-ink-500">
            {" "}
            &middot; {row.date} &middot; {row.category_name}
          </span>
        </p>
      ) : (
        <p className="text-sm text-ink-500">{row.reason}</p>
      )}
    </li>
  );
}

export default function CsvImportDialog({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [undoing, setUndoing] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && status !== "uploading" && !undoing) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, status, undoing]);

  const busy = status === "uploading";

  const choose = (event) => {
    const picked = event.target.files?.[0] ?? null;
    setError("");
    setResult(null);
    setStatus("idle");
    if (picked && picked.size > CSV_MAX_BYTES) {
      setError("That file is over 2 MB. Split it into smaller files.");
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const upload = async () => {
    if (!file || busy) return;
    setError("");
    setStatus("uploading");
    try {
      const payload = await importTransactionsCsv(file);
      setResult(payload);
      setStatus("done");
      onImported?.();
    } catch (err) {
      setError(err.message || "Couldn't import that file.");
      setStatus("idle");
    }
  };

  const undo = async () => {
    if (!result?.batch_id || undoing) return;
    setUndoing(true);
    setError("");
    try {
      await undoImportBatch(result.batch_id);
      onImported?.();
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't undo that import.");
      setUndoing(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "campuscoin-template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const summary = result?.summary;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Import transactions from CSV"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={busy || undoing ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[90svh] w-full max-w-lg flex-col overflow-hidden rounded-card bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">
              Import from CSV
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Bring in past spending from your bank or spreadsheet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy || undoing}
            aria-label="Close dialog"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 transition hover:bg-slate-50 hover:text-ink-900 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:h-9 md:w-9"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {status === "done" && summary ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="font-display text-xl font-extrabold text-ink-900">
                    {summary.total}
                  </p>
                  <p className="text-xs font-semibold text-ink-500">Rows read</p>
                </div>
                <div>
                  <p className="font-display text-xl font-extrabold text-emerald-600">
                    {summary.accepted}
                  </p>
                  <p className="text-xs font-semibold text-ink-500">Imported</p>
                </div>
                <div>
                  <p className="font-display text-xl font-extrabold text-red-500">
                    {summary.rejected}
                  </p>
                  <p className="text-xs font-semibold text-ink-500">Skipped</p>
                </div>
              </div>
              {summary.rejected > 0 && (
                <p className="mt-3 text-sm text-ink-500">
                  Skipped rows were left out. Fix them in your file and import it again, or add
                  them by hand.
                </p>
              )}
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto">
              {result.rows.map((row) => (
                <RowOutcome key={row.row} row={row} />
              ))}
            </ul>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <label
              htmlFor="csv-file"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-slate-200 px-4 py-8 text-center transition hover:border-brand-500 hover:bg-emerald-50/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon name="upload" size={22} />
              </span>
              <span className="text-sm font-semibold text-ink-900">
                {file ? file.name : "Choose a CSV file"}
              </span>
              <span className="text-xs text-ink-500">Up to 2 MB, 500 rows at a time</span>
              <input
                id="csv-file"
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={choose}
                className="sr-only"
              />
            </label>

            <div className="mt-5 rounded-card bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink-900">Expected columns</p>
              <p className="mt-1 text-sm text-ink-500">
                A header row with <span className="font-semibold">date</span> and{" "}
                <span className="font-semibold">amount</span> is required.{" "}
                <span className="font-semibold">description</span>,{" "}
                <span className="font-semibold">category</span> and{" "}
                <span className="font-semibold">type</span> are used when present.
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 underline transition hover:text-emerald-800"
              >
                <Icon name="file-down" size={15} />
                Download a template
              </button>
            </div>

            {error && (
              <p className="mt-4 text-sm font-semibold text-red-500" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {error && status === "done" && (
          <p className="px-6 pb-4 text-sm font-semibold text-red-500" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4">
          {status === "done" ? (
            <>
              <button
                type="button"
                onClick={undo}
                disabled={undoing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {undoing && <SubmitSpinner />}
                {undoing ? "Undoing..." : "Undo this import"}
                {!undoing && <Icon name="undo" size={15} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={undoing}
                className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:opacity-50"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={upload}
                disabled={!file || busy}
                aria-busy={busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busy && <SubmitSpinner />}
                {busy ? "Importing..." : "Import"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
