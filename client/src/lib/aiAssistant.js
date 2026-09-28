// The assistant's single entry point. Two things live here and nothing else:
// a short-lived cache so a re-asked question is instant, and the shape the
// components consume.
//
// The old version of this file caught every failure and swapped in a local rule
// for the answer. That made the error state in AssistantChat and AIAssistantCard
// unreachable - the retry button could never render - and it let a reply computed
// from a hardcoded list of categories look identical to a real AI answer. Now a
// failure is a failure: the server decides whether to answer from the AI model
// or from the ledger, and says which in the reply.

import { askAssistant as askAssistantApi } from "./apiClient.js";

const CACHE_KEY = "campuscoin.ai-answers";
const DAY_MS = 86400000;

function readCache() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "{}");
    return Object.fromEntries(
      Object.entries(parsed).filter(([, entry]) => Date.now() - entry.at < DAY_MS),
    );
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    return;
  }
}

// Returns { reply, source, model }. source is "poolside" when the AI model
// answered and "offline" when the server computed it from the ledger itself -
// the components use it to show an honest offline notice rather than claiming
// every reply came from the model.
export async function askAssistant(question) {
  const key = String(question ?? "").trim();
  const cache = readCache();

  if (cache[key]) return cache[key].answer;

  const data = await askAssistantApi(key);
  const answer = {
    reply: String(data.reply ?? "").trim(),
    source: data.source === "poolside" ? "poolside" : "offline",
    model: data.model ?? null,
  };

  if (answer.reply) {
    cache[key] = { answer, at: Date.now() };
    writeCache(cache);
  }
  return answer;
}
