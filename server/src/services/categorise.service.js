import OpenAI from "openai";
import ApiError from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { Category, CategorySuggestion } from "../models/index.js";

// Three tiers, cheapest first. The student's own confirmed corrections beat the
// shared keyword rules, which beat the model. That order is the whole of "learns
// from corrections": a student who keeps typing "bus fare" and picking Transport
// gets Transport suggested next time, for their own account only, without any
// training and without another student's habit leaking into theirs.
const KEYWORD_RULES = [
  { words: ["food", "cafe", "cafeteria", "canteen", "restaurant", "lunch", "dinner", "breakfast", "snack", "jollof", "rice", "meal", "eats", "eatery", "grill", "munch"], category: "Food" },
  { words: ["bus", "transport", "taxi", "uber", "bolt", "fare", "fuel", "petrol", "gas", "train", "metro", "danfo", "okada", "ride", "commute"], category: "Transport" },
  { words: ["rent", "hostel", "accommodation", "housing", "dorm", "landlord"], category: "Hostel/Rent" },
  { words: ["tuition", "school", "books", "book", "lecture", "fees", "course", "exam", "past questions", "textbook", "printing", "revision"], category: "Academics" },
  { words: ["subscription", "netflix", "spotify", "showmax", "prime", "membership", "data bundle"], category: "Subscriptions" },
  { words: ["game", "gaming", "concert", "party", "club", "movie", "entertainment", "show", "cinema"], category: "Entertainment" },
  { words: ["allowance", "upkeep"], category: "Allowance" },
  { words: ["salary", "job", "gig", "freelance", "wage", "part-time", "parttime"], category: "Gigs" },
  { words: ["scholarship", "bursary", "stipend", "grant"], category: "Scholarships" },
  { words: ["gift", "birthday", "christmas", "eid", "transfer from"], category: "Gifts" },
];

const STOP_WORDS = new Set([
  "a", "an", "and", "at", "for", "from", "in", "of", "on", "the", "to", "with", "my", "i",
  "paid", "payment", "purchase", "bought", "spent", "debit", "transaction", "pos", "transfer",
  "cash", "naira", "ngn", "e", "g", "eg", "etc",
]);

let client = null;

// The same provider Rix uses. Returns null when no key is configured, so
// suggestions still work from the keyword rules without the model.
function provider() {
  if (!env.poolsideApiKey) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: env.poolsideApiKey,
      baseURL: env.poolsideBaseUrl,
      timeout: 8000,
      maxRetries: 0,
    });
  }
  return client;
}

function words(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function matchCategoryName(categories, name) {
  const wanted = String(name ?? "").trim().toLowerCase();
  if (!wanted) return null;
  return (
    categories.find((category) => category.name.toLowerCase() === wanted) ??
    categories.find((category) => category.name.toLowerCase().includes(wanted)) ??
    categories.find((category) => wanted.includes(category.name.toLowerCase())) ??
    null
  );
}

function keywordMatch(categories, text) {
  const parts = words(text);
  if (!parts.length) return null;
  const haystack = parts.join(" ");

  for (const rule of KEYWORD_RULES) {
    const category = matchCategoryName(categories, rule.category);
    if (!category) continue;
    for (const word of rule.words) {
      if (haystack.includes(word)) {
        return { category, source: "keyword", confidence: 0.6, matched: word };
      }
    }
  }
  return null;
}

// The student's own confirmed pairings. A fragment is any meaningful word or
// adjacent word pair from what they typed, and hit_count decides how strong the
// signal is.
async function learnedMatch(userId, text) {
  const parts = words(text);
  if (!parts.length) return null;

  const fragments = new Set();
  for (const word of parts) {
    if (!STOP_WORDS.has(word) && word.length > 2) fragments.add(word);
  }
  for (let index = 0; index < parts.length - 1; index += 1) {
    fragments.add(`${parts[index]} ${parts[index + 1]}`);
  }
  if (!fragments.size) return null;

  const rows = await CategorySuggestion.find({
    user_id: userId,
    description_key: { $in: [...fragments] },
  })
    .sort({ hit_count: -1 })
    .lean();

  if (!rows.length) return null;

  const best = rows[0];
  const category = await Category.findOne({
    _id: best.category_id,
    $or: [{ user_id: null }, { user_id: userId }],
  })
    .select("_id name type")
    .lean();
  if (!category) return null;

  const total = rows.reduce((sum, row) => sum + (row.hit_count ?? 1), 0);
  return {
    category,
    source: "learned",
    confidence: Math.min(0.95, 0.5 + (best.hit_count ?? 1) / (total + 2)),
    matched: best.description_key,
  };
}

async function modelMatch(categories, text) {
  const api = provider();
  if (!api) return null;

  const options = categories.map((category) => `${category.name} (${category.type})`).join(", ");

  try {
    const completion = await api.chat.completions.create({
      model: env.poolsideModel,
      temperature: 0,
      max_tokens: 60,
      messages: [
        {
          role: "system",
          content: [
            "You categorise a single personal transaction.",
            `Reply with exactly one category name from this list and nothing else: ${options}.`,
            "Choose the closest match even if it is imperfect. Never explain.",
          ].join(" "),
        },
        { role: "user", content: `Transaction description: "${text}"` },
      ],
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() ?? "";
    const category = matchCategoryName(categories, answer);
    if (!category) return null;
    return { category, source: "ai", confidence: 0.75, matched: null };
  } catch {
    return null;
  }
}

export async function suggestCategory(userId, text) {
  const categories = await Category.find({
    $or: [{ user_id: null }, { user_id: userId }],
  })
    .select("_id name type")
    .lean();

  if (!categories.length) throw ApiError.badRequest("There are no categories to choose from.");

  const learned = await learnedMatch(userId, text);
  if (learned) return learned;

  const keyword = keywordMatch(categories, text);
  if (keyword) return keyword;

  const ai = await modelMatch(categories, text);
  if (ai) return ai;

  const fallback =
    categories.find((category) => category.name.toLowerCase() === "others") ??
    categories.find((category) => category.type === "expense") ??
    categories[0];
  return { category: fallback, source: "default", confidence: 0.2, matched: null };
}

// Records that a student filed this description under this category, so the next
// identical or similar description is suggested correctly. Each fragment is
// counted separately so one confirmation strengthens every word it contains, and
// the hit_count is what decides whether the learned signal beats the rules.
export async function recordSuggestion(userId, description, categoryId) {
  const category = await Category.findOne({
    _id: categoryId,
    $or: [{ user_id: null }, { user_id: userId }],
  })
    .select("_id type")
    .lean();
  if (!category) throw ApiError.badRequest("That category was not found.");

  const parts = words(description).filter((word) => !STOP_WORDS.has(word));
  const fragments = new Set();
  for (const word of parts) {
    if (word.length > 2) fragments.add(word);
  }
  for (let index = 0; index < parts.length - 1; index += 1) {
    fragments.add(`${parts[index]} ${parts[index + 1]}`);
  }
  if (!fragments.size) return { learned: 0, type: category.type };

  await CategorySuggestion.bulkWrite(
    [...fragments].map((key) => ({
      updateOne: {
        filter: { user_id: userId, description_key: key },
        update: { $inc: { hit_count: 1 }, $set: { category_id: category._id } },
        upsert: true,
      },
    })),
  );
  return { learned: fragments.size, type: category.type };
}

// One suggestion per CSV row, so an import can be reviewed before it is saved.
// An empty description is skipped rather than guessed at, because there is
// nothing to categorise.
export async function suggestBatch(userId, rows) {
  const results = [];
  for (const row of rows) {
    const text = row?.description ?? "";
    if (!String(text).trim()) {
      results.push({ row: row?.row ?? null, category: null, source: "skipped" });
      continue;
    }
    const suggestion = await suggestCategory(userId, text);
    results.push({
      row: row?.row ?? null,
      category: {
        category_id: String(suggestion.category._id),
        name: suggestion.category.name,
        type: suggestion.category.type,
      },
      source: suggestion.source,
      confidence: Math.round(suggestion.confidence * 100) / 100,
    });
  }
  return results;
}
