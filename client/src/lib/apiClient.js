// The only place in the client that talks to the server. Every hook goes
// through apiFetch, so swapping localStorage for the API is a change here and
// in the hooks, not scattered across components.

const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    // Field-level messages from the server's zod validation, keyed by field
    // name, so a form can put each one next to the input that caused it.
    this.details = details ?? null;
  }
}

function readErrorMessage(status, payload) {
  const message = payload?.error?.message;
  if (typeof message === "string" && message) return message;
  if (status === 401) return "Please log in to continue.";
  if (status === 403) return "You do not have access to that.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status === 404) return "That could not be found.";
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return "That request could not be completed.";
}

export async function apiFetch(path, { method = "GET", body, formData, signal } = {}) {
  // Built up rather than written as one literal, because a GET carrying an
  // explicit body key is rejected by fetch even when the value is undefined.
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

// ---------------------------------------------------------------- auth

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

// Development shortcut. The server refuses this route in production, so it is
// not a back door - it signs in as a seeded student with a real session, which
// is why the data endpoints keep working after it.
export function demoLogin() {
  return apiFetch("/auth/demo", { method: "POST" });
}

export function requestPasswordReset(email) {
  return apiFetch("/auth/forgot-password", { method: "POST", body: { email } });
}

export function resetPassword({ token, password }) {
  return apiFetch("/auth/reset-password", { method: "POST", body: { token, password } });
}

export function saveProfile(patch) {
  return apiFetch("/auth/me", { method: "PATCH", body: patch });
}

// Changing the display name goes through the same profile patch, so both
// settings live behind one call.
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

// A local object URL for the confirm dialog. Nothing is uploaded until the
// student says yes, so backing out of the dialog sends nothing to the server.
export function previewAvatar(file) {
  return URL.createObjectURL(checkAvatarFile(file));
}

// Cropped to a square before upload so the stored image matches the round
// avatar it is displayed in, and so a 12 MP phone photo is not stored in full.
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

// ------------------------------------------------------- ledger + budgets

export function listCategories() {
  return apiFetch("/categories");
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
