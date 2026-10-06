// Chat wording rules shared by Rix's UI.
//
// The sentence stripper itself lives with the server copy
// (server/src/utils/cleanReply.js) so both sides agree on what "mentioning
// Confirm" means; it is bundled into the client at build time.

import { cleanProposallessReply, stripConfirmMentions } from "../../../server/src/utils/cleanReply.js";

/**
 * Text shown next to a draft that the student has already acted on. Once the
 * draft is saved or cancelled the old "press Confirm" wording would be a lie,
 * so it is stripped; `null` means the whole reply was about a button and there
 * is nothing left to say.
 */
export function savedReplyText(text, status) {
  if (!text) return "";
  if (status === "pending" || !status) return text;
  return stripConfirmMentions(text) ?? "";
}

const CONFIRM_WORDS = new Set([
  "yes",
  "y",
  "yea",
  "yeah",
  "yep",
  "yup",
  "ok",
  "okay",
  "sure",
  "confirm",
  "confirmed",
  "confirm it",
  "confirmed it",
  "save",
  "save it",
  "do it",
  "go ahead",
  "proceed",
  "please do",
  "yes please",
  "that's right",
  "thats right",
  "correct",
]);

const CANCEL_WORDS = new Set([
  "no",
  "n",
  "nope",
  "nah",
  "cancel",
  "cancel it",
  "dont",
  "don't",
  "stop",
  "not now",
  "no thanks",
  "no thank you",
  "change it",
  "never mind",
  "nevermind",
]);

const REVEAL_WORDS = [
  /button/,
  /where.*(save|confirm)/,
  /can'?t\s+(?:see|find|spot)/,
  /cannot\s+(?:see|find|spot)/,
  /don'?t\s+(?:see|find)/,
  /do not\s+(?:see|find)/,
  /nothing\s+(?:to\s+)?(?:press|click)/,
];

function normalise(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * What the student means when a draft is waiting.
 *
 * - "confirm"  -> point at the Confirm control (never save from typed text)
 * - "cancel"   -> point at Cancel
 * - "reveal"   -> the button is out of sight: scroll it into view and highlight
 * - "normal"   -> a real message, send it to Rix as usual
 */
export function classifyTypedReply(text) {
  const words = normalise(text);
  if (!words) return "normal";
  if (REVEAL_WORDS.some((pattern) => pattern.test(words))) return "reveal";
  if (CONFIRM_WORDS.has(words)) return "confirm";
  if (CANCEL_WORDS.has(words)) return "cancel";
  return "normal";
}

export { cleanProposallessReply, stripConfirmMentions };
