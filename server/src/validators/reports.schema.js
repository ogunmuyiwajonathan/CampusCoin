import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

export const reportsQuerySchema = z.object({
  from: day.optional(),
  to: day.optional(),
  category: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "That is not a valid category.")
    .optional(),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});

export const shareReportSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  message: z.string().trim().max(500, "Keep the note under 500 characters.").default(""),
  from: day.optional(),
  to: day.optional(),
  category: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "That is not a valid category.")
    .optional(),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});
