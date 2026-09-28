import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { User } from "../models/index.js";
import { publicUser } from "../services/auth.service.js";

const UPLOAD_DIR = path.resolve(env.uploadDir);
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

// Filenames are generated rather than derived from the upload. A student-supplied
// name is untrusted input, and using it as a path is how a write ends up outside
// the upload directory. The extension is the one we chose from the MIME type we
// verified, not one read off the file.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdir(UPLOAD_DIR, { recursive: true })
      .then(() => cb(null, UPLOAD_DIR))
      .catch((error) => cb(error));
  },
  filename: (_req, file, cb) => {
    const extension = ALLOWED.get(file.mimetype) ?? ".bin";
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(ApiError.badRequest("Use a JPG, PNG or WEBP image."));
      return;
    }
    cb(null, true);
  },
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  // multer has already written the file by the time we get here, so any failure
  // from this point on has to remove it or the upload directory grows forever.
  let savedPath = req.file?.path;

  try {
    if (!req.file) throw ApiError.badRequest("Choose an image first.");

    const previous = req.user.profile_image_url;
    const relative = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profile_image_url: relative } },
      { new: true, runValidators: true },
    );
    if (!user) throw ApiError.notFound("Account not found.");

    // Only remove the old file once the new path is safely stored, so a failed
    // update never leaves the student with no picture at all.
    if (previous?.startsWith("/uploads/")) {
      const oldName = path.basename(previous);
      await fs.unlink(path.join(UPLOAD_DIR, oldName)).catch(() => {});
    }

    savedPath = null;
    res.json({ user: publicUser(user) });
  } catch (error) {
    if (savedPath) await fs.unlink(savedPath).catch(() => {});
    throw error;
  }
});

export const avatarUpload = upload.single("avatar");
