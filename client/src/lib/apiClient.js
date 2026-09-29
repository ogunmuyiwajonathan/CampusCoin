
const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/+$/, "");

const API_ORIGIN = BASE.match(/^https?:\/\/[^/]+/i)?.[0] ?? "";

export function apiAssetUrl(path) {
  if (!path || typeof path !== "string") return path;
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(path)) return path;
  if (path.startsWith("data:") || path.startsWith("blob:")) return path;
  if (!API_ORIGIN) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

export class ApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details ?? null;
  }
}

function readErrorMessage(status, payload) {
  const message = payload?.error?.message;
  if (status === 404 && /no route matches/i.test(String(message))) {
    return "That could not be found.";
  }
  if (typeof message === "string" && message) return message;
  if (status === 401) return "Please log in to continue.";
  if (status === 403) return "You do not have access to that.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status === 404) return "That could not be found.";
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return "That request could not be completed.";
}

export async function apiFetch(path, { method = "GET", body, formData, signal } = {}) {
  const options = { method, credentials: "include", signal };
  if (formData) {
    options.body = formData;
  } else if (method !== "GET" && body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, options);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Check your connection and try again.", {
      status: 0,
    });
  }

  if (res.status === 204) return null;

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new ApiError(readErrorMessage(res.status, payload), {
      status: res.status,
      details: payload?.error?.details ?? null,
    });
  }

  return payload;
}

export function getMe() {
  return apiFetch("/auth/me");
}

export function registerAccount({ name, email, password }) {
  return apiFetch("/auth/register", { method: "POST", body: { name, email, password } });
}

export function loginAccount({ email, password }) {
  return apiFetch("/auth/login", { method: "POST", body: { email, password } });
}

export function logoutAccount() {
  return apiFetch("/auth/logout", { method: "POST" });
}

export function demoLogin() {
  return apiFetch("/auth/demo", { method: "POST" });
}

export function requestPasswordReset(email) {
  return apiFetch("/auth/forgot-password", { method: "POST", body: { email } });
}

export function resetPassword({ email, code, password }) {
  return apiFetch("/auth/reset-password", { method: "POST", body: { email, code, password } });
}

export function saveProfile(patch) {
  return apiFetch("/auth/me", { method: "PATCH", body: patch });
}

export function changeUsername(name) {
  return apiFetch("/auth/me", { method: "PATCH", body: { name } });
}

export function changePassword({ currentPassword, newPassword }) {
  return apiFetch("/auth/me/password", {
    method: "PATCH",
    body: { currentPassword, newPassword },
  });
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

function checkAvatarFile(file) {
  if (!file) throw new ApiError("Choose an image first.", { status: 0 });
  if (!AVATAR_TYPES.includes(file.type)) {
    throw new ApiError("Use a JPG, PNG or WEBP image.", { status: 0 });
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new ApiError("Pick an image under 2 MB.", { status: 0 });
  }
  return file;
}

export function previewAvatar(file) {
  return URL.createObjectURL(checkAvatarFile(file));
}

export async function uploadAvatar(file) {
  checkAvatarFile(file);
  const blob = await cropToSquare(file);
  const form = new FormData();
  form.append("avatar", blob, "avatar.png");
  return apiFetch("/auth/me/avatar", { method: "POST", formData: form });
}

function cropToSquare(file, size = 192) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ApiError("Couldn't read that file.", { status: 0 }));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new ApiError("That image couldn't be opened.", { status: 0 }));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const side = Math.min(image.width, image.height);
        canvas
          .getContext("2d")
          .drawImage(
            image,
            (image.width - side) / 2,
            (image.height - side) / 2,
            side,
            side,
            0,
            0,
            size,
            size,
          );
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new ApiError("Couldn't process that image.", { status: 0 }));
        }, "image/png");
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function listCategories() {
  return apiFetch("/categories");
}

export function createCategory(body) {
  return apiFetch("/categories", { method: "POST", body });
}

export function updateCategory(id, body) {
  return apiFetch(`/categories/${id}`, { method: "PATCH", body });
}

export function deleteCategory(id) {
  return apiFetch(`/categories/${id}`, { method: "DELETE" });
}

export function listTransactions(month) {
  return apiFetch(`/transactions?month=${encodeURIComponent(month)}`);
}

export function createTransaction(body) {
  return apiFetch("/transactions", { method: "POST", body });
}

export function updateTransaction(id, body) {
  return apiFetch(`/transactions/${id}`, { method: "PATCH", body });
}

export function deleteTransaction(id) {
  return apiFetch(`/transactions/${id}`, { method: "DELETE" });
}

export function listTransactionHistory() {
  return apiFetch("/transactions/history");
}

export function restoreTransaction(historyId) {
  return apiFetch(`/transactions/history/${historyId}/restore`, { method: "POST" });
}

export const CSV_MAX_BYTES = 2 * 1024 * 1024;

function checkCsvFile(file) {
  if (!file) throw new ApiError("Choose a CSV file first.", { status: 0 });
  if (file.size > CSV_MAX_BYTES) {
    throw new ApiError("That file is over 2 MB. Split it into smaller files.", { status: 0 });
  }
  return file;
}

export function importTransactionsCsv(file) {
  checkCsvFile(file);
  const form = new FormData();
  form.append("file", file);
  return apiFetch("/transactions/import", { method: "POST", formData: form });
}

export function undoImportBatch(batchId) {
  return apiFetch(`/transactions/import/${batchId}`, { method: "DELETE" });
}

export function listBudgets(month) {
  return apiFetch(`/budgets?month=${encodeURIComponent(month)}`);
}

export function createBudget(body) {
  return apiFetch("/budgets", { method: "POST", body });
}

export function updateBudget(id, body) {
  return apiFetch(`/budgets/${id}`, { method: "PATCH", body });
}

export function deleteBudget(id) {
  return apiFetch(`/budgets/${id}`, { method: "DELETE" });
}

export function listAnnouncements() {
  return apiFetch("/announcements");
}

export function listNotifications() {
  return apiFetch("/notifications");
}

export function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return apiFetch("/notifications/read-all", { method: "PATCH" });
}

export function listTips(month) {
  return apiFetch(`/tips?month=${encodeURIComponent(month)}`);
}

export function listDismissedTips(month) {
  return apiFetch(`/tips/dismissed?month=${encodeURIComponent(month)}`);
}

export function pinTip(id) {
  return apiFetch(`/tips/${id}/pin`, { method: "POST" });
}

export function unpinTip(id) {
  return apiFetch(`/tips/${id}/unpin`, { method: "POST" });
}

export function dismissTip(id) {
  return apiFetch(`/tips/${id}/dismiss`, { method: "POST" });
}

export function restoreTip(id) {
  return apiFetch(`/tips/${id}/restore`, { method: "POST" });
}

export function listInsights() {
  return apiFetch("/insights");
}

export function getInsight(month) {
  return apiFetch(`/insights/month?month=${encodeURIComponent(month)}`);
}

export function regenerateInsight(month) {
  return apiFetch(`/insights/month?month=${encodeURIComponent(month)}`, { method: "POST" });
}

export function suggestCategory(text) {
  return apiFetch(`/ai/categorise/suggest?q=${encodeURIComponent(text)}`);
}

export function confirmSuggestion({ description, categoryId }) {
  return apiFetch("/ai/categorise/confirm", {
    method: "POST",
    body: { description, category_id: categoryId },
  });
}

export function suggestCategoryBatch(rows) {
  return apiFetch("/ai/categorise/batch", { method: "POST", body: { rows } });
}

export function getReports({ from, to, category, granularity } = {}) {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (category) query.set("category", category);
  if (granularity) query.set("granularity", granularity);
  const suffix = query.toString();
  return apiFetch(`/reports${suffix ? `?${suffix}` : ""}`);
}

export function getReportCategories() {
  return apiFetch("/reports/categories");
}

export function shareReport(body) {
  return apiFetch("/reports/share", { method: "POST", body });
}

export function listBookmarks() {
  return apiFetch("/bookmarks");
}

export function saveBookmark(body) {
  return apiFetch("/bookmarks", { method: "POST", body });
}

export function editBookmark(id, body) {
  return apiFetch(`/bookmarks/${id}`, { method: "PATCH", body });
}

export function removeBookmark(id) {
  return apiFetch(`/bookmarks/${id}`, { method: "DELETE" });
}
