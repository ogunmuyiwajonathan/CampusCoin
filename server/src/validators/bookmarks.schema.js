import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "That is not a valid id.");

const month = z.string().regex(/^\d{4}-\d{2}$/, "Use a YYYY-MM month.");
const note = z.string().trim().max(280, "Keep the note under 280 characters.").default("");

export const createBookmarkSchema = z
  .object({
    month: month.optional(),
    insight_id: objectId.optional(),
    tip_id: objectId.optional(),
    note,
  })
  .refine((value) => value.month || value.insight_id || value.tip_id, {
    message: "Save a month, an insight or a tip.",
  });

export const updateBookmarkSchema = z.object({
  month: month.optional(),
  note: note.optional(),
});
