import { z } from "zod";

// A question is optional: opening the assistant with an empty box is the normal
// case on the dashboard card, and the server answers it from the month's figures
// rather than refusing. The cap keeps one prompt from becoming a bill.
export const askAiSchema = z.object({
  question: z.string().trim().max(400, "That question is too long.").default(""),
});
