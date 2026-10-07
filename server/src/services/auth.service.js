import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import ApiError from "../utils/ApiError.js";
import { ResetToken, User } from "../models/index.js";

const BCRYPT_ROUNDS = 10;
export const RESET_CODE_TTL_MS = 10 * 60 * 1000;

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseEmail(email) {
  return email.trim().toLowerCase();
}

export function normaliseName(name) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function firstNameOf(name) {
  return String(name ?? "").trim().split(/\s+/).filter(Boolean)[0] || "there";
}

export function isValidEmail(email) {
  return EMAIL_RE.test(email);
}

export async function registerUser({ name, email, password }) {
  const cleanEmail = normaliseEmail(email);
  const existing = await User.findOne({ email: cleanEmail }).lean();
  if (existing) {
    throw ApiError.conflict("That email is already registered.");
  }

  return User.create({
    name: normaliseName(name),
    email: cleanEmail,
    password_hash: await hashPassword(password),
    role: "student",
    is_active: true,
  });
}

function loginFailed() {
  return ApiError.unauthorized("Invalid email or password.");
}

export async function authenticate({ email, password }) {
  const cleanEmail = normaliseEmail(email);
  const user = await User.findOne({ email: cleanEmail }).select("+password_hash");

  if (!user) {
    await bcrypt.compare(password, "$2a$10$abcdefghijklmnopqrstuv0123456789012345678901234567890");
    throw loginFailed();
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw loginFailed();
  if (!user.is_active) throw loginFailed();
  if (user.role !== "student") throw loginFailed();

  return user;
}

function newCodeHash(raw) {
  const salt = crypto.randomBytes(12).toString("hex");
  return `${salt}$${crypto.createHash("sha256").update(`${salt}:${raw}`).digest("hex")}`;
}

function codeMatches(stored, raw) {
  const [salt, digest] = String(stored).split("$");
  if (!salt || !digest) return false;
  const check = crypto.createHash("sha256").update(`${salt}:${raw}`).digest("hex");
  if (check.length !== digest.length) return false;
  return crypto.timingSafeEqual(Buffer.from(check), Buffer.from(digest));
}

export const RESET_CODE_MAX_ATTEMPTS = 5;

const INVALID_CODE = "That code is not valid or has expired. Request a new one.";

export async function createResetCode(userId) {
  const raw = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await ResetToken.create({
    user_id: userId,
    token_hash: newCodeHash(raw),
    expires_at: new Date(Date.now() + RESET_CODE_TTL_MS),
  });
  return raw;
}

export async function consumeResetCode(userId, raw) {
  const token = await ResetToken.findOne({ user_id: userId, used_at: null })
    .sort({ createdAt: -1 });

  if (!token) throw ApiError.badRequest(INVALID_CODE);
  if (token.expires_at.getTime() < Date.now()) throw ApiError.badRequest(INVALID_CODE);
  if ((token.attempts ?? 0) >= RESET_CODE_MAX_ATTEMPTS) throw ApiError.badRequest(INVALID_CODE);

  if (!codeMatches(token.token_hash, raw)) {
    await ResetToken.updateOne({ _id: token._id }, { $inc: { attempts: 1 } });
    throw ApiError.badRequest(INVALID_CODE);
  }

  return token;
}

export async function setPassword(userId, password) {
  await User.updateOne(
    { _id: userId },
    { $set: { password_hash: await hashPassword(password) } },
  );
}

export async function markResetTokenUsed(tokenId) {
  await ResetToken.updateOne({ _id: tokenId }, { $set: { used_at: new Date() } });
}

export async function invalidateResetTokens(userId) {
  await ResetToken.updateMany({ user_id: userId, used_at: null }, { $set: { used_at: new Date() } });
}

export function publicUser(user) {
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    academic_year: user.academic_year,
    allowance_baseline: user.allowance_baseline,
    monthly_savings_goal: user.monthly_savings_goal,
    role: user.role,
    profileOnboarded: user.profileOnboarded ?? false,
    profile_image_url: user.profile_image_url,
    created_at: user.createdAt ?? user.created_at ?? null,
  };
}
