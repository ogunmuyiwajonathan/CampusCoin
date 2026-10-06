import { apiFetch, ApiError } from "./apiClient.js";

export { ApiError };

const CHAT_URL = "/ai/chat";
const CONVERSATIONS_URL = "/ai/conversations";

export const FRIENDLY_AI_ERRORS = {
  0: "Can't reach Rix. Check your connection.",
  401: "Your session expired. Please log in again.",
  429: "You're asking quickly. Give me a moment and try again.",
};

export const FRIENDLY_AI_FALLBACK =
  "Rix is unavailable right now. Try again.";

export function friendlyAiError(error) {
  const status = error?.status;
  if (status === 401) {
    return { message: FRIENDLY_AI_ERRORS[401], expired: true };
  }
  return { message: FRIENDLY_AI_ERRORS[status] ?? FRIENDLY_AI_FALLBACK, expired: false };
}

export async function sendMessage(message, conversationId) {
  const body = { message };
  if (conversationId) body.conversationId = conversationId;

  const data = await apiFetch(CHAT_URL, { method: "POST", body });
  return {
    conversationId: data.conversationId,
    reply: String(data.reply ?? ""),
    userMessage: data.user_message ?? null,
    assistantMessage: data.assistant_message ?? null,
  };
}

export async function listConversations({ limit = 30, cursor } = {}) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  const data = await apiFetch(`${CONVERSATIONS_URL}?${query.toString()}`);
  return {
    conversations: data.conversations ?? [],
    nextCursor: data.nextCursor ?? null,
  };
}

export async function getMessages(conversationId) {
  const data = await apiFetch(`${CONVERSATIONS_URL}/${conversationId}/messages`);
  return data.messages ?? [];
}

export async function renameConversation(conversationId, title) {
  const data = await apiFetch(`${CONVERSATIONS_URL}/${conversationId}`, {
    method: "PATCH",
    body: { title },
  });
  return data.conversation;
}

export async function deleteConversation(conversationId) {
  const data = await apiFetch(`${CONVERSATIONS_URL}/${conversationId}`, {
    method: "DELETE",
  });
  return Boolean(data.deleted);
}

export async function confirmProposal(messageId, categoryId) {
  const body = {};
  if (categoryId) body.category_id = categoryId;
  return apiFetch(`/ai/messages/${messageId}/confirm`, {
    method: "POST",
    body,
  });
}

export async function cancelProposal(messageId) {
  return apiFetch(`/ai/messages/${messageId}/cancel`, { method: "POST" });
}

/** "Create it again" for a draft that has gone stale. */
export async function recreateProposal(messageId) {
  const data = await apiFetch(`/ai/messages/${messageId}/recreate`, {
    method: "POST",
  });
  return data.message ?? null;
}
