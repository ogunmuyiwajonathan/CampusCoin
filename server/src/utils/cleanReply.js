/**
 * Keeps Rix's wording honest.
 *
 * A reply may only point at the Confirm control when this reply actually
 * carries a proposal - otherwise the UI shows a message promising a button
 * that does not exist. The server strips those sentences when no proposal was
 * created, and the client reuses the same function for messages that were
 * saved before the fix.
 *
 * Imported by the client too, so keep it dependency free.
 */

const CONFIRM_SENTENCE = [
  /\bpress(?:ing)?\s+(?:the\s+)?(?:confirm|save|ok|button)\b/i,
  /\btap(?:ping)?\s+(?:the\s+)?(?:confirm|save|ok|button)\b/i,
  /\bclick(?:ing)?\s+(?:the\s+)?(?:confirm|save|ok|button)\b/i,
  /\b(?:confirm|save)\s+(?:button|option|control|prompt|dialog)\b/i,
  /\b(?:press|tap|click|find|look\s+for)\s+.*\b(?:confirm|confirmation)\b/i,
  /\bconfirmation\s+(?:option|button|prompt|control)\b/i,
  /\bcan'?t\s+(?:save|confirm)\b/i,
  /\b(?:i|we)\s+(?:can'?t|cannot)\s+(?:save|confirm|store)\b/i,
  /\bpending\s+confirmation\b/i,
  /\bwait(?:ing)?\s+for\s+(?:your\s+)?confirmation\b/i,
  /\b(?:me\s+to\s+)?confirm\s+(?:it|this|that)\b/i,
  /\bonce you (?:confirm|save)\b/i,
  /\byou(?:'ll| will)?\s*need(?:ing)? to (?:press|tap|click|find|look|confirm)\b/i,
  /\b(?:i'?ve|i have|has been|was)\s+(?:already\s+)?proposed\b/i,
  /\bproposed\s+for\s+(?:today|tomorrow)\b/i,
];

/**
 * Claims that a draft, proposal or entry exists. These are only stripped from
 * replies that carry no proposal: the model sometimes says "I've drafted your
 * transport expense…" without ever calling propose_transaction, which would
 * leave the student waiting on a card that was never built.
 */
const DRAFT_CLAIM = [
  /\b(?:i'?ve|i\s+have|i)\s+(?:already\s+)?(?:drafted|proposed|created|prepared|set\s+up|put\s+together)\b/i,
  /\b(?:i'?ve|i\s+have|i)\s+(?:logged|recorded|entered|saved|added|noted)\s+(?:it|that|this|the|a|an|your|these)\b/i,
  /\b(?:the|this|your|a)\s+(?:draft|proposal|entry)\s+(?:is|has\s+been|was)\s+(?:ready|waiting|pending|created|proposed|saved|recorded|set)\b/i,
  /\bhas\s+been\s+(?:drafted|proposed|created|logged|recorded|saved|noted)\b/i,
  /\bready\s+to\s+be\s+(?:confirmed|saved)\b/i,
  /\b(?:it|this|that)\s+(?:is|'s)\s+(?:now\s+)?(?:ready|waiting|pending)\b/i,
  /\bwaiting\s+for\s+your\s+(?:confirmation|review|ok)\b/i,
];

/** True when a sentence tells the student about a Confirm control. */
export function mentionsConfirmControl(sentence) {
  const text = String(sentence ?? "");
  return CONFIRM_SENTENCE.some((pattern) => pattern.test(text));
}

/** True when a sentence claims a draft exists. */
export function mentionsDraftClaim(sentence) {
  const text = String(sentence ?? "");
  return DRAFT_CLAIM.some((pattern) => pattern.test(text));
}

/** Split on sentence ends without needing lookbehind (older Safari). */
function sentences(text) {
  return String(text).match(/[^.!?]+[.!?]*/g) ?? [];
}

/**
 * Remove sentences that point at a Confirm control.
 * Returns `null` when nothing is left to say.
 */
export function stripConfirmMentions(text) {
  const kept = sentences(text)
    .map((part) => part.trim())
    .filter((part) => part && !mentionsConfirmControl(part));
  if (!kept.length) return null;
  return kept.join(" ");
}

/**
 * Remove sentences that point at a Confirm control or claim a draft exists.
 * Only for replies that carry no proposal at all. Returns `null` when nothing
 * is left to say.
 */
export function cleanProposallessReply(text) {
  const kept = sentences(text)
    .map((part) => part.trim())
    .filter((part) => part && !mentionsConfirmControl(part) && !mentionsDraftClaim(part));
  if (!kept.length) return null;
  return kept.join(" ");
}
