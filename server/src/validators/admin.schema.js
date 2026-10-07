import { z } from "zod";

export {
  categoryBodySchema,
  categoryPatchSchema,
  CATEGORY_ICON_KEYS,
} from "./category.schema.js";

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

const RULE_CHOICES = TIP_RULES.map((entry) => entry.label).join(", ");

// zod v4 removed the `errorMap` parameter and ignores it silently, which left
  // the admin reading "Invalid option: expected one of ..." instead of the
  // plain-English list below. v4 spells this `error`.
const tipRule = z.enum(TIP_RULE_NAMES, {
  error: (issue) =>
    issue.code === "invalid_type" || issue.input === undefined
      ? `A rule is required. Choose: ${RULE_CHOICES}.`
      : `Choose: ${RULE_CHOICES}.`,
});

const tipThreshold = z.number().min(0).max(100).nullable();
const tipImpact = z.number().min(0).max(100);
const tipCategory = z.string().nullable();
const tipActive = z.boolean();

export const tipTemplateBodySchema = z.object({
  key: tipKey,
  text: tipText,
  rule: tipRule,
  threshold: tipThreshold.optional(),
  category_id: tipCategory.optional(),
  savings_impact: tipImpact.default(0),
  is_active: tipActive.default(true),
});

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
