import { useState, useEffect } from "react";
import Icon from "../../components/Icon.jsx";

function AnnouncementModal({ ann, onClose, onSave }) {
  const [title, setTitle] = useState(ann?.title ?? "");
  const [body, setBody] = useState(ann?.body ?? "");
  const [active, setActive] = useState(ann?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = ann ? `/api/admin/announcements/${ann.id}` : "/api/admin/announcements";
      const method = ann ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Save failed");
      onSave(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-card bg-surface p-6 shadow-card">
        <h3 className="text-lg font-bold text-ink-900">{ann ? "Edit Announcement" : "New Announcement"}</h3>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-900">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-900">Body</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-900">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
            Active (visible to students)
          </label>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-mint-50">Cancel</button>
            <button type="submit" disabled={saving || !title.trim() || !body.trim()} className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const requestAnnouncements = async () => {
    const res = await fetch("/api/admin/announcements");
    if (!res.ok) throw new Error("Failed to load announcements");
    return res.json();
  };

  const load = async () => {
    try {
      setLoading(true);
      setAnnouncements(await requestAnnouncements());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    requestAnnouncements()
      .then((data) => {
        if (cancelled) return;
        setAnnouncements(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (ann) => {
    if (!window.confirm(`Delete announcement "${ann.title}"?`)) return;
    setDeleting(ann.id);
    try {
      await fetch(`/api/admin/announcements/${ann.id}`, { method: "DELETE" });
      await load();
    } catch {
    } finally {
      setDeleting(null);
    }
  };

  if (loading && announcements.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-card bg-surface shadow-card" />
        <div className="h-32 w-full animate-pulse rounded-card bg-surface shadow-card" />
        <div className="h-32 w-full animate-pulse rounded-card bg-surface shadow-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-900">
        <Icon name="alert-circle" size={32} className="mx-auto mb-2 text-red-500" />
        <p className="font-semibold">{error}</p>
        <button onClick={() => load()} className="mt-4 rounded-lg bg-red-100 px-4 py-2 font-medium text-red-900 hover:bg-red-200">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Announcements</h1>
          <p className="text-sm text-ink-500">Banners shown on the student dashboard</p>
        </div>
        <button onClick={() => setModal({ ann: null })} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700">
          <Icon name="plus" size={16} /> New Announcement
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-card border border-dashed border-slate-200 bg-surface p-12 text-center">
          <Icon name="megaphone" size={32} className="mx-auto mb-3 text-ink-500" />
          <p className="font-medium text-ink-900">No announcements yet</p>
          <p className="mt-1 text-sm text-ink-500">Create one to show a banner to all students.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div key={ann.id} className="rounded-card bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink-900 truncate">{ann.title}</h3>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      ann.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-ink-500"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${ann.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {ann.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">{ann.body}</p>
                  <p className="mt-2 text-xs text-ink-500">
                    Created {new Date(ann.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setModal({ ann })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-mint-50">Edit</button>
                  <button onClick={() => handleDelete(ann)} disabled={deleting === ann.id}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50">
                    {deleting === ann.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <AnnouncementModal ann={modal.ann} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}
