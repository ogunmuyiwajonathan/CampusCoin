const API_KEY = import.meta.env.VITE_AI_API_KEY;
const CACHE_KEY = "campuscoin.ai-insights";
const DAY_MS = 86400000;

function spendingContext(breakdown, recent) {
  const categories = breakdown
    .map((c) => `${c.name} NGN ${c.amount} (${c.percentage}%)`)
    .join(", ");
  const transactions = recent
    .slice(0, 5)
    .map((t) => `${t.description} ${t.type === "income" ? "+" : "-"}NGN ${t.amount}`)
    .join("; ");
  return `Categories: ${categories}. Recent transactions: ${transactions}.`;
}

function promptFor(context, question) {
  const base = `Given this student's spending breakdown: ${context}, give one short, specific, actionable financial tip in under 40 words. No generic advice - reference their actual numbers.`;
  return question ? `${base} Student's question: ${question}` : base;
}

function localTip(question, breakdown) {
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

async function callLLM(context, question) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: promptFor(context, question) }],
      max_tokens: 80,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`AI request failed with status ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
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

export async function askAssistant(question, breakdown, recent) {
  const key = question.trim();
  const cache = readCache();
  if (cache[key]) return cache[key].answer;

  const context = spendingContext(breakdown, recent);
  const answer = API_KEY ? await callLLM(context, key) : localTip(key, breakdown);
  cache[key] = { answer, at: Date.now() };
  writeCache(cache);
  return answer;
}
