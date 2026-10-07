import { useCallback, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import SubmitSpinner from "../../components/SubmitSpinner.jsx";
import { adminFetch } from "../../lib/apiClient.js";

// Long enough to swallow a burst of keystrokes, short enough that the list feels
// like it is answering you rather than waiting to be asked.
const DEBOUNCE_MS = 200;

async function requestUsers(p, s, { signal } = {}) {
  const res = await adminFetch(
    `/api/admin/users?page=${p}&limit=10&search=${encodeURIComponent(s)}`,
    { signal },
  );
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // A user result from the header typeahead arrives as ?search=, so the box is
  // seeded with that term and the first page is fetched for it on arrival.
  const [params] = useSearchParams();
  const initialSearch = params.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  // What the table is actually showing, as opposed to what is in the box. Kept
  // apart so the row count and the empty message never describe a half-typed
  // word while the next request is still in flight.
  const [appliedSearch, setAppliedSearch] = useState(initialSearch);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState("");
  const [resetModal, setResetModal] = useState(null);
  const actionLockRef = useRef(false);

  // Only the newest request is allowed to write to the table. Anything older
  // that still lands is dropped, so a slow reply can never overwrite fresher
  // rows, and the in-flight one is aborted as soon as a new keystroke supersedes
  // it. This is what makes the box feel live instead of laggy.
  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);

  const runQuery = useCallback(async (p, s, { signal } = {}) => {
    const id = requestIdRef.current + 1;
    requestIdRef.current = id;
    setLoading(true);
    try {
      const data = await requestUsers(p, s, { signal });
      if (requestIdRef.current !== id) return;
      setUsers(data.users);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setAppliedSearch(s);
      setError(null);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (requestIdRef.current !== id) return;
      setError(err.message);
    } finally {
      if (requestIdRef.current === id) setLoading(false);
    }
  }, []);

  // Paging acts on what is on screen, not on a half-typed word in the box.
  const fetchUsers = (p = 1, s = appliedSearch) => runQuery(p, s);

  // A new ?search= arriving from the header typeahead reseeds the box. React
  // documents adjusting state during render for exactly this case, so the
  // debounced effect below picks the new term up on the very next pass.
  const [seed, setSeed] = useState(initialSearch);
  if (initialSearch !== seed) {
    setSeed(initialSearch);
    setSearch(initialSearch);
  }

  /* As-you-type. The timer is cleared on every keystroke, so a burst of typing
     costs one request, not one request per letter. It is kept on a ref so a
     submit can cancel it: otherwise Enter starts one request and the pending
     timer starts the identical one a moment later, throwing the first away. */
  const searchTimerRef = useRef(null);

  useEffect(() => {
    searchTimerRef.current = setTimeout(() => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setSearching(true);
      runQuery(1, search, { signal: controller.signal }).finally(() => {
        if (controllerRef.current === controller) setSearching(false);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(searchTimerRef.current);
  }, [search, runQuery]);

  /* An unmount mid-flight must not set state afterwards. */
  useEffect(() => () => controllerRef.current?.abort(), []);

  const handleSearch = (e) => {
    e.preventDefault();
    clearTimeout(searchTimerRef.current);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setSearching(true);
    runQuery(1, search, { signal: controller.signal }).finally(() => {
      if (controllerRef.current === controller) setSearching(false);
    });
  };

  const toggleDisable = async (user) => {
    if (actionLockRef.current) return;
    const disabling = user.is_active;
    const question = disabling
      ? `Disable ${user.name}? They will be signed out immediately.`
      : `Enable ${user.name}? They will be able to sign in again.`;
    if (!window.confirm(question)) return;

    actionLockRef.current = true;
    try {
      setActionLoading(user.user_id);
      setActionError("");
      const res = await adminFetch(`/api/admin/users/${user.user_id}/${disabling ? "disable" : "enable"}`, {
        method: "PUT",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Action failed");
      }
      await fetchUsers(page);
    } catch (err) {
      setActionError(err.message || "That did not work. Try again.");
    } finally {
      actionLockRef.current = false;
      setActionLoading(null);
    }
  };

  const handleReset = async (id) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      setActionLoading(id);
      setActionError("");
      const res = await adminFetch(`/api/admin/users/${id}/reset`, { method: "PUT" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Reset failed");
      }
      const data = await res.json();
      setResetModal({ password: data.temporaryPassword });
    } catch (err) {
      setActionError(err.message || "That did not work. Try again.");
    } finally {
      actionLockRef.current = false;
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
      {actionError && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {actionError}
        </p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Users</h1>
          <p className="text-sm text-ink-500">Manage student accounts ({total} total)</p>
        </div>
        
        <form onSubmit={handleSearch} className="relative w-full sm:w-72">
          <label htmlFor="admin-user-search" className="sr-only">
            Search users by name or email
          </label>
          <input
            id="admin-user-search"
            type="search"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-busy={searching}
            autoComplete="off"
            className="w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-10 pr-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="pointer-events-none absolute left-3 top-2.5 text-sage-400">
            <Icon name="search" size={18} />
          </div>
          {searching && (
            <span className="absolute right-3 top-2.5 text-brand-600">
              <SubmitSpinner className="h-[18px] w-[18px]" />
            </span>
          )}
          <button type="submit" className="sr-only">Search</button>
        </form>
      </div>

      {/* The list now updates on its own, so a screen reader needs to be told. */}
      <p className="sr-only" role="status" aria-live="polite">
        {searching
          ? "Searching"
          : appliedSearch
            ? `${total} ${total === 1 ? "result" : "results"} for ${appliedSearch}`
            : `${total} ${total === 1 ? "user" : "users"}`}
      </p>

      {/* `loading`, not `searching`: paging and retrying fetch too, and with the
          API answering in a second or more a silent table reads as broken.
          Deliberately un-animated: the wrapper sits inside the scroll-reveal
          block and its transition never progresses, leaving the table at full
          opacity for the whole request. */}
      <div
        aria-busy={loading}
        className={`overflow-x-auto rounded-card bg-surface shadow-card ${
          loading ? "opacity-60" : ""
        }`}
      >
        <table className="w-full min-w-[660px] text-left text-sm">
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
                  No users found matching "{appliedSearch}".
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
                          type="button"
                          onClick={() => {
                            if (actionLockRef.current) return;
                            if (window.confirm("Are you sure you want to reset this user's password?")) {
                              handleReset(u.user_id);
                            }
                          }}
                          disabled={actionLoading === u.user_id}
                          aria-busy={actionLoading === u.user_id}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-mint-50 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === u.user_id && <SubmitSpinner className="h-3 w-3" />}
                          {actionLoading === u.user_id ? "Working..." : "Reset"}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDisable(u)}
                          disabled={actionLoading === u.user_id}
                          aria-busy={actionLoading === u.user_id}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            u.is_active
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {actionLoading === u.user_id && <SubmitSpinner className="h-3 w-3" />}
                          {actionLoading === u.user_id
                            ? "Working..."
                            : u.is_active
                              ? "Disable"
                              : "Enable"}
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



