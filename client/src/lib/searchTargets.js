/**
 * The page and action half of the typeahead, held here on the client.
 *
 * These are the fixed destinations of the app, not rows in the database, so
 * asking the server for them would be a round trip to return something already
 * in the bundle. They are matched locally, which is also why "bud" finds
 * Budgets without the student typing the whole word.
 *
 * `keywords` exist so a person can type what they mean rather than the exact
 * label: "csv", "upload" and "import" all reach Import CSV.
 */

export const STUDENT_TARGETS = [
  { key: "page-dashboard", title: "Dashboard", subtitle: "Your month at a glance", to: "/dashboard", icon: "house" },
  { key: "page-transactions", title: "Transactions", subtitle: "Every income and expense", to: "/transactions", icon: "arrow-left-right" },
  { key: "page-budgets", title: "Budgets", subtitle: "Monthly limits per category", to: "/budgets", icon: "target", keywords: "limit limits spending cap" },
  { key: "page-insights", title: "Insights", subtitle: "Monthly narrative and advice", to: "/insights", icon: "chart-column" },
  { key: "page-reports", title: "Reports", subtitle: "Statements you can export", to: "/reports", icon: "file-chart" },
  { key: "page-bookmarks", title: "Bookmarks", subtitle: "Months and notes you saved", to: "/bookmarks", icon: "bookmark", keywords: "saved saved months" },
  { key: "page-assistant", title: "AI Assistant", subtitle: "Ask Rix about your spending", to: "/assistant", icon: "bot", keywords: "rix chat bot ask" },
  { key: "page-settings", title: "Settings", subtitle: "Profile, preferences, security", to: "/settings", icon: "settings", keywords: "profile password theme" },
  {
    key: "action-add-transaction",
    title: "Add a transaction",
    subtitle: "Log income or an expense",
    to: "/transactions?new=1",
    icon: "plus",
    keywords: "new log add income expense",
  },
  {
    key: "action-import-csv",
    title: "Import CSV",
    subtitle: "Upload a statement in bulk",
    to: "/transactions?import=1",
    icon: "upload",
    keywords: "csv upload bulk import file",
  },
  {
    key: "action-change-password",
    title: "Change password",
    subtitle: "Update the password on this account",
    to: "/settings?password=1",
    icon: "lock",
    keywords: "password passwd security credentials",
  },
];

export const ADMIN_TARGETS = [
  { key: "admin-page-users", title: "Users", subtitle: "View, disable and reset accounts", to: "/admin/users", icon: "users", keywords: "accounts students people" },
  { key: "admin-page-categories", title: "Categories", subtitle: "The default categories everyone shares", to: "/admin/categories", icon: "tags", keywords: "default tags" },
  { key: "admin-page-tips", title: "Tips", subtitle: "Tip templates behind the tips engine", to: "/admin/tips", icon: "lightbulb", keywords: "templates wording rules" },
  { key: "admin-page-announcements", title: "Announcements", subtitle: "Posts students see on Notifications", to: "/admin/announcements", icon: "megaphone", keywords: "posts notices campus" },
  { key: "admin-page-statistics", title: "Statistics", subtitle: "Active users, totals and trends", to: "/admin", icon: "chart-column", keywords: "stats dashboard numbers usage" },
  {
    key: "admin-action-category",
    title: "New default category",
    subtitle: "Add a category every student gets",
    to: "/admin/categories?new=1",
    icon: "plus",
    keywords: "add create new",
  },
  {
    key: "admin-action-tip",
    title: "New tip template",
    subtitle: "Add wording the tips engine can use",
    to: "/admin/tips?new=1",
    icon: "plus",
    keywords: "add create new template",
  },
  {
    key: "admin-action-announcement",
    title: "New announcement",
    subtitle: "Post to every student",
    to: "/admin/announcements?new=1",
    icon: "plus",
    keywords: "add create new post",
  },
];

/** Case-insensitive, accent-tolerant substring match over title + keywords. */
function matches(target, needle) {
  const haystack = `${target.title} ${target.keywords ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

/**
 * At most five, matching the server's per-group cap, so the whole dropdown has
 * a predictable height. Exact label matches win over keyword matches, because
 * typing "Budgets" should show Budgets rather than anything that merely mentions
 * budgets in its keywords.
 */
export function matchTargets(targets, query, limit = 5) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const exact = targets.filter((target) => target.title.toLowerCase().startsWith(needle));
  const loose = targets.filter(
    (target) => !exact.includes(target) && matches(target, needle),
  );
  return [...exact, ...loose].slice(0, limit);
}