import multer from "multer";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { CSV_MAX_BYTES, importTransactionsCsv, undoImportBatch } from "../services/import.service.js";

const ALLOWED = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/octet-stream",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CSV_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname ?? "").toLowerCase();
    if (ALLOWED.has(file.mimetype) || name.endsWith(".csv") || name.endsWith(".txt")) {
      cb(null, true);
      return;
    }
    cb(ApiError.badRequest("Upload a .csv file exported from your bank or spreadsheet."));
  },
});

export const importCsv = asyncHandler(async (req, res) => {
  if (req.file?.size > CSV_MAX_BYTES) {
    throw ApiError.badRequest("That file is too large. Keep it under 2 MB.");
  }
  if (!req.file) throw ApiError.badRequest("Choose a CSV file to import.");

  const result = await importTransactionsCsv(req.user._id, req.file.buffer);
  res.status(201).json(result);
});

export const undoImport = asyncHandler(async (req, res) => {
  const removed = await undoImportBatch(req.user._id, req.params.batchId);
  res.json({ ok: true, removed });
});

export { upload };
