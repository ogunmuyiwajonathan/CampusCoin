import { z } from "zod";
import { sanitizeSvg } from "../utils/sanitizeSvg.js";

export const CATEGORY_ICON_KEYS = [
  "utensils",
  "car",
  "bus",
  "house",
  "book-open",
  "repeat",
  "gamepad-2",
  "heart-pulse",
  "shopping-bag",
  "wallet",
  "gift",
  "briefcase",
  "graduation-cap",
  "coffee",
  "smartphone",
  "piggy-bank",
  "plane",
  "shirt",
  "music",
  "dumbbell",
  "more-horizontal",
];

const iconKey = z
  .string()
  .trim()
  .min(1)
  .refine((value) => CATEGORY_ICON_KEYS.includes(value), {
    message: "That icon is not one of the available icons.",
  })
  .nullable()
  .optional();

function svgMessage(error) {
  return error.isSvgRule ? error.message : "That SVG could not be used.";
}

const iconSvg = z
  .string()
  .trim()
  .min(1)
  .max(4096, "That SVG is too large. The limit is 4 KB.")
  .nullable()
  .optional()
  .superRefine((value, ctx) => {
    if (!value) return;
    try {
      sanitizeSvg(value);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["icon_svg"],
        message: svgMessage(error),
      });
    }
  });

const categoryShape = {
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["income", "expense"]),
  color: z.string().trim().max(20).nullable().optional(),
  icon_key: iconKey,
  icon_svg: iconSvg,
};

function noBothFields(data) {
  return !(data.icon_key && data.icon_svg);
}

export const BOTH_ICON_FIELDS_MESSAGE =
  "A category uses either an icon or a custom SVG, not both.";

export const categoryBodySchema = z
  .object(categoryShape)
  .refine(noBothFields, { message: BOTH_ICON_FIELDS_MESSAGE, path: ["icon_key"] });

export const categoryPatchSchema = z
  .object(categoryShape)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Send at least one field to update.",
  })
  .refine(noBothFields, { message: BOTH_ICON_FIELDS_MESSAGE, path: ["icon_key"] });
