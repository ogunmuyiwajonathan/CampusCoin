import { env } from "../config/env.js";

// Single exit point for every error. The rule: the client gets a useful message
// for its own mistakes, and a generic one for ours. Stack traces, driver errors
// and file paths are logged server-side and never sent to the browser.
export default function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  const isServerFault = status >= 500;

  if (isServerFault) {
    console.error(`${req.method} ${req.originalUrl} failed:`, error);
  }

  // Multer rejects an oversized or wrong-typed upload with its own error class
  // that carries no status, so it would otherwise surface as a 500. These are
  // the student's mistake, not ours, and deserve a message they can act on.
  const uploadProblems = {
    LIMIT_FILE_SIZE: "That file is too large. Keep it under 2 MB.",
    LIMIT_FILE_COUNT: "Upload one file at a time.",
    LIMIT_UNEXPECTED_FILE: "That upload was not expected.",
  };
  if (error.name === "MulterError" && uploadProblems[error.code]) {
    res.status(400).json({ error: { message: uploadProblems[error.code] } });
    return;
  }

  const payload = {
    error: {
      message: isServerFault
        ? "Something went wrong on our end. Please try again."
        : error.message,
    },
  };

  if (error.details) payload.error.details = error.details;

  // Opt-in only. Gating on "not production" would mean a typo or a missing
  // NODE_ENV in a deployed environment silently starts leaking internals, so
  // this has to be positively asserted instead.
  if (isServerFault && env.isDev) {
    payload.error.debug = error.message;
  }

  res.status(status).json(payload);
}
