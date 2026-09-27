const CACHE_KEY = "campuscoin.ai-insights";
const CHAT_URL = "/api/ai/chat";
const DAY_MS = 86400000;

function localTip(question, breakdown) {
  if (breakdown.length === 0) {
    return "Log a few transactions first and I will break down exactly where your money is going.";
  }
  const top = breakdown[0];
  const match = question
    ? breakdown.find((c) => question.toLowerCase().includes(c.name.toLowerCase()))
    : null;
  const category = match ?? top;
  const weekly = Math.round(category.amount / 4);
  if (question) {
    return `${category.name} is at NGN ${category.amount} (${category.percentage}% of spending). A weekly cap of NGN ${weekly} keeps you on track.`;
  }
  return `You spent ${top.percentage}% of your money on ${top.name.toLowerCase()} this month - your top category. Cap it at NGN ${weekly} a week to save more next month.`;
}

async function askServer(question) {
  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`Assistant request failed with status ${res.status}`);
  const data = await res.json();
  return String(data.reply ?? "").trim();
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
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

export async function askAssistant(question, breakdown) {
  const key = question.trim();
  const cache = readCache();
  if (cache[key]) return cache[key].answer;

  let answer = "";
  try {
    answer = await askServer(key);
  } catch {
    answer = "";
  }
  if (!answer) answer = localTip(key, breakdown);

  cache[key] = { answer, at: Date.now() };
  writeCache(cache);
  return answer;
}
