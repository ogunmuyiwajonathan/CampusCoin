import { z } from "zod";

const ID = z.string().trim().min(1).max(64);

export const chatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Type a message first.")
    .max(1000, "That message is too long. Keep it under 1000 characters."),
  conversationId: ID.optional(),
});

export const renameConversationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the chat a name.")
    .max(60, "Keep the title under 60 characters."),
});

export const conversationParamsSchema = z.object({ id: ID });

export const suggestSchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Type a few words first.")
    .max(140, "Keep the description under 140 characters."),
});

export const confirmSuggestionSchema = z.object({
  description: z.string().trim().min(1, "Type a description first.").max(140),
  category_id: z.string().trim().min(1, "Choose a category."),
});

export const batchSuggestSchema = z.object({
  rows: z
    .array(
      z.object({
        row: z.number().int().min(1).max(1000),
        description: z.string().trim().max(140),
      }),
    )
    .min(1, "There is nothing to categorise.")
    .max(100, "Suggest 100 rows at a time."),
});

export const conversationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(30),
  cursor: z.string().trim().max(64).optional(),
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isPlausibleDate(value) {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function daysFromToday(value) {
  const [year, month, day] = value.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86400000);
}

export const proposalSchema = z.object({
  amount: z
    .number({ message: "An amount is needed." })
    .positive("The amount must be more than zero.")
    .finite("That amount is not a real number.")
    .max(100000000, "That amount is too large."),
  description: z.string().trim().max(140, "Keep the description under 140 characters.").default(""),
  category: z.string().trim().max(60).nullable().optional(),
  date: z
    .string()
    .trim()
    .refine(isPlausibleDate, { message: "Use a date like 2026-09-20." })
    .refine((value) => daysFromToday(value) <= 1, {
      message: "The date cannot be more than a day ahead.",
    }),
});

export function parseProposal(raw) {
  return proposalSchema.safeParse(raw);
}
