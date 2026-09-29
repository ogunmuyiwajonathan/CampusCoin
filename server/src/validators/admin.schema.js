import { z } from "zod";

export {
  categoryBodySchema,
  categoryPatchSchema,
  CATEGORY_ICON_KEYS,
} from "./category.schema.js";

// The rules the tips engine can actually run, with the placeholders each one
// fills in. The engine skips a template whose rule it does not recognise, so
// without this list an admin could save a tip that is active, looks correct in
// the panel, and is silently never shown to anybody. The three lists are the
// contract between the engine and this form, and the admin route below serves
// them so the panel never has to hardcode them.
export const TIP_RULES = [
  {
    rule: "category_share_above",
    label: "A category is too big a share of spending",
    description:
      "Fires when one category is more than the threshold percent of everything the student spent this month.",
    uses_threshold: true,
    threshold_label: "Share of spending (%)",
    placeholders: ["category", "percentage", "weekly"],
  },
  {
    rule: "budget_near_limit",
    label: "A budget is close to its limit",
    description:
      "Fires when spending on a category has reached the threshold percent of that category's budget for the month.",
    uses_threshold: true,
    threshold_label: "Percent of budget used",
    placeholders: ["category", "percentage", "remaining"],
  },
  {
    rule: "no_transactions",
    label: "The student has logged nothing yet",
    description: "Fires only when the month has no transactions at all. Needs no threshold.",
    uses_threshold: false,
    threshold_label: null,
    placeholders: [],
  },
];

export const TIP_RULE_NAMES = TIP_RULES.map((entry) => entry.rule);

// Declared once, with no defaults, because a default is a value the field takes
// when the key is absent. That is right when creating a row and wrong when
// updating one: zod still fills a defaulted key in on a partial object, so a
// request that only flipped is_active also wrote savings_impact back to 0 and
// quietly undid the admin's ranking on every student's dashboard.
const tipKey = z
  .string()
  .trim()
  .min(1, "Key is required")
  .max(60, "Keep the key under 60 characters")
  .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores only");

const tipText = z
  .string()
  .trim()
  .min(1, "Text is required")
  .max(400)
  .refine((value) => /^[^{}]*(\{[a-z_]+\}[^{}]*)*$/.test(value), {
    message: "Braces are only for placeholders, like {category}.",
  });

// A missing rule and a misspelled one are the same mistake to whoever is filling
// this in, and both are answered with the choices rather than "invalid option",
// which is the validation library's wording rather than ours.
const RULE_CHOICES = TIP_RULES.map((entry) => entry.label).join(", ");

const tipRule = z.enum(TIP_RULE_NAMES, {
  errorMap: (issue) => ({
    message:
      issue.code === "invalid_type"
        ? `A rule is required. Choose: ${RULE_CHOICES}.`
        : `Choose: ${RULE_CHOICES}.`,
  }),
});

const tipThreshold = z.number().min(0).max(100).nullable();
const tipImpact = z.number().min(0).max(100);
const tipCategory = z.string().nullable();
const tipActive = z.boolean();

export const tipTemplateBodySchema = z.object({
  key: tipKey,
  text: tipText,
  // Required, not optional. The engine reads this to decide whether the tip
  // applies at all, so a template without one can never be shown, and letting it
  // through turned a client's mistake into a 500 from Mongoose's own check.
  rule: tipRule,
  threshold: tipThreshold.optional(),
  category_id: tipCategory.optional(),
  savings_impact: tipImpact.default(0),
  is_active: tipActive.default(true),
});

// Every field optional, and no defaults anywhere, so a partial update touches
// exactly what it was sent and leaves the rest of the row alone.
export const tipTemplatePatchSchema = z
  .object({
    key: tipKey.optional(),
    text: tipText.optional(),
    rule: tipRule.optional(),
    threshold: tipThreshold.optional(),
    category_id: tipCategory.optional(),
    savings_impact: tipImpact.optional(),
    is_active: tipActive.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to update.",
  });

export const announcementBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().min(1, "Body is required"),
  active: z.boolean().default(true),
});
