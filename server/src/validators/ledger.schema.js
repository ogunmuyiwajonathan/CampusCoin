import { z } from "zod";
import { ACADEMIC_YEARS } from "../models/User.js";
import { CATEGORY_ICON_KEYS } from "./category.schema.js";
import { sanitizeSvg } from "../utils/sanitizeSvg.js";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

export const monthSchema = z.object({
  month: z.string().regex(MONTH, "Use a month like 2026-09.").optional(),
});

export const categoryType = z.enum(["income", "expense"]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(60),
  type: categoryType,
  color: z.string().trim().max(20).nullable().optional(),
  icon: z.string().trim().max(40).nullable().optional(),
  icon_key: z
    .string()
    .trim()
    .min(1)
    .refine((value) => CATEGORY_ICON_KEYS.includes(value), {
      message: "That icon is not one of the available icons.",
    })
    .nullable()
    .optional(),
  icon_svg: z
    .string()
    .trim()
    .min(1)
    .max(4096, "That SVG is too large. The limit is 4 KB.")
    .refine(
      (value) => {
        try {
          sanitizeSvg(value);
          return true;
        } catch {
          return false;
        }
      },
      { message: "That SVG could not be used." },
    )
    .nullable()
    .optional(),
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Send at least one field to update." },
);

const amount = z
  .number({ message: "Enter an amount." })
  .finite("Enter an amount.")
  .nonnegative("Amount cannot be negative.")
  .max(100_000_000, "That amount is too large.");

export const createTransactionSchema = z.object({
  category_id: z.string().min(1, "Choose a category."),
  type: categoryType.optional(),
  amount,
  description: z.string().trim().max(140).default(""),
  date: z.string().regex(DATE, "Use a date like 2026-09-20."),
  is_recurring: z.boolean().default(false),
  frequency: z.enum(["weekly", "monthly"]).nullable().optional(),
  next_run_at: z.string().regex(DATE).nullable().optional(),
  request_id: z.string().trim().min(8).max(80).optional(),
});

export const updateTransactionSchema = createTransactionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to update.",
  });

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "That is not a valid id."),
});

export const batchParamsSchema = z.object({
  batchId: z.string().min(1),
});

export const createBudgetSchema = z.object({
  category_id: z.string().min(1, "Choose a category."),
  month: z.string().regex(MONTH, "Use a month like 2026-09."),
  limit_amount: amount,
});

export const updateBudgetSchema = createBudgetSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to update.",
  });

export { ACADEMIC_YEARS };
