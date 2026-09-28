import { useState, useEffect } from "react";
import Icon from "../../components/Icon.jsx";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [resetModal, setResetModal] = useState(null);

  const requestUsers = async (p, s) => {
    const res = await fetch(`/api/admin/users?page=${p}&limit=10&search=${encodeURIComponent(s)}`);
    if (!res.ok) throw new Error("Failed to load users");
    return res.json();
  };

  const fetchUsers = async (p = 1, s = search) => {
    try {
      setLoading(true);
      const data = await requestUsers(p, s);
      setUsers(data.users);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    requestUsers(1, "")
      .then((data) => {
        if (cancelled) return;
        setUsers(data.users);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, search);
  };

  const toggleDisable = async (user) => {
    try {
      setActionLoading(user.user_id);
      const endpoint = user.is_active ? 'disable' : 'enable';
      const res = await fetch(`/api/admin/users/${user.user_id}/${endpoint}`, { method: 'PUT' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Action failed");
      }
      await fetchUsers(page, search);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async (id) => {
    try {
      setActionLoading(id);
      const res = await fetch(`/api/admin/users/${id}/reset`, { method: 'PUT' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Reset failed");
      }
      const data = await res.json();
      setResetModal({ password: data.temporaryPassword });
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded-card bg-surface shadow-card" />
        <div className="h-16 w-full animate-pulse rounded-card bg-surface shadow-card" />
        <div className="h-16 w-full animate-pulse rounded-card bg-surface shadow-card" />
        <div className="h-16 w-full animate-pulse rounded-card bg-surface shadow-card" />
        <div className="h-16 w-full animate-pulse rounded-card bg-surface shadow-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-card border border-red-200 bg-red-50 p-6 text-center text-red-900">
        <Icon name="alert-circle" size={32} className="mx-auto mb-2 text-red-500" />
        <h2 className="text-lg font-semibold">Failed to load users</h2>
        <p className="mt-1">{error}</p>
        <button
          onClick={() => fetchUsers(page, search)}
          className="mt-4 rounded-lg bg-red-100 px-4 py-2 font-medium text-red-900 transition hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 reveal is-visible">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Users</h1>
          <p className="text-sm text-ink-500">Manage student accounts ({total} total)</p>
        </div>
        
        <form onSubmit={handleSearch} className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="absolute left-3 top-2.5 text-sage-400">
            <Icon name="search" size={18} />
          </div>
          <button type="submit" className="sr-only">Search</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-mint-50 text-ink-500">
            <tr>
              <th className="px-6 py-4 font-medium">User</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Joined</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-ink-500">
                  No users found matching "{search}".
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.user_id} className="transition hover:bg-mint-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-ink-900">{u.name}</div>
                    <div className="text-ink-500">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-50 text-blue-700"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-ink-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.role !== "admin" && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to reset this user's password?")) {
                              handleReset(u.user_id);
                            }
                          }}
                          disabled={actionLoading === u.user_id}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-mint-50 hover:text-ink-900 disabled:opacity-50"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => toggleDisable(u)}
                          disabled={actionLoading === u.user_id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                            u.is_active 
                              ? "bg-red-50 text-red-700 hover:bg-red-100" 
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {u.is_active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => fetchUsers(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm font-medium text-ink-500 transition hover:bg-mint-50 disabled:opacity-50"
          >
            <Icon name="chevron-left" size={16} /> Previous
          </button>
          <span className="text-sm text-ink-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => fetchUsers(page + 1)}
            disabled={page === totalPages}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm font-medium text-ink-500 transition hover:bg-mint-50 disabled:opacity-50"
          >
            Next <Icon name="chevron-right" size={16} />
          </button>
        </div>
      )}

      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-card bg-surface p-6 shadow-card">
            <h3 className="text-lg font-bold text-ink-900">Password Reset</h3>
            <p className="mt-2 text-sm text-ink-500">
              The user's password has been reset. Please copy this temporary password immediately. It will not be shown again.
            </p>
            <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-4 text-center">
              <code className="text-lg font-mono font-bold text-brand-700 select-all">
                {resetModal.password}
              </code>
            </div>
            <button
              onClick={() => setResetModal(null)}
              className="mt-6 w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white transition hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
