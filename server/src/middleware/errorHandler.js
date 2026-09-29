import { env } from "../config/env.js";

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

  if (isServerFault && env.isDev) {
    payload.error.debug = error.message;
  }

  res.status(status).json(payload);
}
