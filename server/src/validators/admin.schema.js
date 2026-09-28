import { z } from "zod";

export {
  categoryBodySchema,
  categoryPatchSchema,
  CATEGORY_ICON_KEYS,
} from "./category.schema.js";

export const tipTemplateBodySchema = z.object({
  key: z.string().trim().min(1, "Key is required"),
  text: z.string().trim().min(1, "Text is required").max(400),
  rule: z.string().trim().min(1, "Rule is required").optional(),
  threshold: z.number().nullable().optional(),
  category_id: z.string().nullable().optional(),
  savings_impact: z.number().default(0),
  is_active: z.boolean().default(true),
});

export const announcementBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().min(1, "Body is required"),
  active: z.boolean().default(true),
});
