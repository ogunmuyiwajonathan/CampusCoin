/**
 * Mock seed data mirroring the MongoDB schema (SRS entities).
 * Naming: snake_case fields - matches SRS docs (transaction_id, is_default...).
 * Every dashboard number is DERIVED from this array - no hardcoded percentages.
 */

export const categories = [
  { category_id: "c1", name: "Allowance", type: "income", is_default: true },
  { category_id: "c2", name: "Scholarships", type: "income", is_default: true },
  { category_id: "c3", name: "Gigs", type: "income", is_default: false },
  { category_id: "c4", name: "Gifts", type: "income", is_default: true },
  { category_id: "c5", name: "Food", type: "expense", is_default: true },
  { category_id: "c6", name: "Transport", type: "expense", is_default: true },
  { category_id: "c7", name: "Hostel/Rent", type: "expense", is_default: true },
  { category_id: "c8", name: "Academics", type: "expense", is_default: true },
  { category_id: "c9", name: "Subscriptions", type: "expense", is_default: false },
  { category_id: "c10", name: "Entertainment", type: "expense", is_default: false },
  { category_id: "c11", name: "Others", type: "expense", is_default: true },
];

export const mockUser = {
  user_id: "demo-student",
  name: "Alex",
  email: "alex@example.com",
  school: "University of Lagos",
  academic_year: "Year 2",
  allowance_baseline: 20000,
  monthly_savings_goal: 15000,
  role: "student",
};

export const transactions = [
  // Income - totals 75,000
  { transaction_id: "t1", user_id: "demo-student", category_id: "c1", type: "income", amount: 20000, description: "Monthly Allowance", date: "2026-09-20" },
  { transaction_id: "t2", user_id: "demo-student", category_id: "c3", type: "income", amount: 30000, description: "Part-time Gig", date: "2026-09-15" },
  { transaction_id: "t3", user_id: "demo-student", category_id: "c2", type: "income", amount: 15000, description: "Scholarship Stipend", date: "2026-09-05" },
  { transaction_id: "t4", user_id: "demo-student", category_id: "c4", type: "income", amount: 10000, description: "Birthday Gift", date: "2026-09-01" },
  // Expenses - totals 30,000 (Food 11,400 / Transport 4,800 / Hostel 3,900 /
  // Academics 3,000 / Subscriptions 2,400 / Entertainment 2,100 / Others 2,400)
  { transaction_id: "t5", user_id: "demo-student", category_id: "c5", type: "expense", amount: 5000, description: "Canteen Food", date: "2026-09-24" },
  { transaction_id: "t6", user_id: "demo-student", category_id: "c5", type: "expense", amount: 4400, description: "Groceries", date: "2026-09-18" },
  { transaction_id: "t7", user_id: "demo-student", category_id: "c5", type: "expense", amount: 2000, description: "Snacks & Drinks", date: "2026-09-12" },
  { transaction_id: "t8", user_id: "demo-student", category_id: "c6", type: "expense", amount: 2500, description: "Uber to class", date: "2026-09-23" },
  { transaction_id: "t9", user_id: "demo-student", category_id: "c6", type: "expense", amount: 1300, description: "Bus fare", date: "2026-09-17" },
  { transaction_id: "t10", user_id: "demo-student", category_id: "c6", type: "expense", amount: 1000, description: "Bike to campus", date: "2026-09-10" },
  { transaction_id: "t11", user_id: "demo-student", category_id: "c7", type: "expense", amount: 3900, description: "Hostel share", date: "2026-09-01" },
  { transaction_id: "t12", user_id: "demo-student", category_id: "c8", type: "expense", amount: 3000, description: "Textbook", date: "2026-09-18" },
  { transaction_id: "t13", user_id: "demo-student", category_id: "c9", type: "expense", amount: 1200, description: "Netflix", date: "2026-09-03" },
  { transaction_id: "t14", user_id: "demo-student", category_id: "c9", type: "expense", amount: 1200, description: "Data bundle", date: "2026-09-08" },
  { transaction_id: "t15", user_id: "demo-student", category_id: "c10", type: "expense", amount: 1100, description: "Movie night", date: "2026-09-14" },
  { transaction_id: "t16", user_id: "demo-student", category_id: "c10", type: "expense", amount: 1000, description: "Game credit", date: "2026-09-09" },
  { transaction_id: "t17", user_id: "demo-student", category_id: "c11", type: "expense", amount: 900, description: "Laundry", date: "2026-09-06" },
  { transaction_id: "t18", user_id: "demo-student", category_id: "c11", type: "expense", amount: 500, description: "Printing", date: "2026-09-11" },
  { transaction_id: "t19", user_id: "demo-student", category_id: "c11", type: "expense", amount: 1000, description: "Misc", date: "2026-09-16" },
];

/** Display icon per category name (keys of the Icon.jsx registry) */
export const CATEGORY_ICONS = {
  Allowance: "wallet",
  Scholarships: "graduation-cap",
  Gigs: "briefcase",
  Gifts: "gift",
  Food: "utensils",
  Transport: "bus",
  "Hostel/Rent": "house",
  Academics: "book-open",
  Subscriptions: "tv",
  Entertainment: "gamepad-2",
  Others: "ellipsis",
};

/** Distinct donut/legend colors per expense category */
export const CATEGORY_COLORS = {
  c5: "#10b981",
  c6: "#3b82f6",
  c7: "#f59e0b",
  c8: "#8b5cf6",
  c9: "#ef4444",
  c10: "#ec4899",
  c11: "#64748b",
};

export function categoryLookup() {
  return Object.fromEntries(categories.map((c) => [c.category_id, c]));
}

export function computeTotals(list) {
  return list.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );
}

/** Expense breakdown by category with derived percentages (sums to 100). */
export function expenseBreakdown(list) {
  const lookup = categoryLookup();
  const totals = computeTotals(list);
  const byCategory = new Map();
  for (const t of list) {
    if (t.type !== "expense") continue;
    byCategory.set(t.category_id, (byCategory.get(t.category_id) ?? 0) + t.amount);
  }
  return [...byCategory.entries()]
    .map(([categoryId, amount]) => ({
      category_id: categoryId,
      name: lookup[categoryId]?.name ?? "Others",
      amount,
      percentage: totals.expense ? Math.round((amount / totals.expense) * 100) : 0,
      color: CATEGORY_COLORS[categoryId] ?? "#64748b",
    }))
    .sort((a, b) => b.amount - a.amount);
}
