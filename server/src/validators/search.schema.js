import { z } from "zod";

export const SEARCH_MIN = 2;
export const SEARCH_MAX = 60;

/**
 * One schema for both search routes. The dropdown only asks the server once a
 * query is at least SEARCH_MIN characters long, so the same bounds are enforced
 * here rather than trusting the client to have filtered first. Anything longer
 * than SEARCH_MAX is rejected outright instead of being silently trimmed: a
 * truncated query would quietly search for something the user did not ask for.
 */
export const searchQuerySchema = z.object({
  q: z
    .string({ message: "Type something to search for." })
    .trim()
    .min(SEARCH_MIN, `Type at least ${SEARCH_MIN} characters to search.`)
    .max(SEARCH_MAX, `Keep the search under ${SEARCH_MAX} characters.`),
});