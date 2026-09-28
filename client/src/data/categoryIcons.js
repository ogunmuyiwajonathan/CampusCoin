export const CATEGORY_ICON_OPTIONS = [
  { key: "utensils", label: "Food" },
  { key: "car", label: "Transport" },
  { key: "bus", label: "Bus" },
  { key: "house", label: "Rent" },
  { key: "book-open", label: "Academics" },
  { key: "repeat", label: "Subscription" },
  { key: "gamepad-2", label: "Entertainment" },
  { key: "heart-pulse", label: "Health" },
  { key: "shopping-bag", label: "Shopping" },
  { key: "wallet", label: "Allowance" },
  { key: "gift", label: "Gift" },
  { key: "briefcase", label: "Work" },
  { key: "graduation-cap", label: "Scholarship" },
  { key: "coffee", label: "Coffee" },
  { key: "smartphone", label: "Data" },
  { key: "piggy-bank", label: "Savings" },
  { key: "plane", label: "Travel" },
  { key: "shirt", label: "Clothing" },
  { key: "music", label: "Music" },
  { key: "dumbbell", label: "Fitness" },
  { key: "more-horizontal", label: "Other" },
];

export const CATEGORY_ICON_KEYS = CATEGORY_ICON_OPTIONS.map((option) => option.key);

const BY_NAME = {
  Allowance: "wallet",
  Scholarships: "graduation-cap",
  Gigs: "briefcase",
  Gifts: "gift",
  Food: "utensils",
  Transport: "bus",
  "Hostel/Rent": "house",
  Academics: "book-open",
  Subscriptions: "repeat",
  Entertainment: "gamepad-2",
  Others: "more-horizontal",
};

export const FALLBACK_CATEGORY_ICON = "more-horizontal";

export function categoryIconKeyFor(name) {
  if (!name) return FALLBACK_CATEGORY_ICON;
  return BY_NAME[name] ?? FALLBACK_CATEGORY_ICON;
}
