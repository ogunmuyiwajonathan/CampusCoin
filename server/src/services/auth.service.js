import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import ApiError from "../utils/ApiError.js";
import { ResetToken, User } from "../models/index.js";

const BCRYPT_ROUNDS = 10;
export const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

// bcryptjs rather than bcrypt: same algorithm, no native build step, so a
// fresh clone on a new machine cannot fail to install.
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

// Mirrors lib/formatName.js on the client. The client normalises on the way in
// so the UI is forgiving, but the server has to do it too or a direct API call
// can store "jamie tester" and every later read disagrees with what was typed.
export function normaliseName(name) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function isValidEmail(email) {
  return EMAIL_RE.test(email);
}

export async function registerUser({ name, email, password }) {
  const cleanEmail = normaliseEmail(email);
  const existing = await User.findOne({ email: cleanEmail }).lean();
  if (existing) {
    // Named specifically, unlike login. Telling a registrar that an address is
    // taken costs nothing an attacker does not already know, and a vague
    // "registration failed" is the single most common support complaint.
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

// One message for every failure: unknown email, wrong password, and disabled
// account all return the same text and the same status, so the endpoint cannot
// be used to discover which addresses have accounts.
function loginFailed() {
  return ApiError.unauthorized("Invalid email or password.");
}

export async function authenticate({ email, password }) {
  const cleanEmail = normaliseEmail(email);
  const user = await User.findOne({ email: cleanEmail }).select("+password_hash");

  if (!user) {
    // Hash a throwaway value anyway. Without this the response time tells an
    // attacker which addresses exist: a missing account returns in a few
    // milliseconds, a real one takes as long as bcrypt.
    await bcrypt.compare(password, "$2a$10$abcdefghijklmnopqrstuv0123456789012345678901234567890");
    throw loginFailed();
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw loginFailed();
  if (!user.is_active) throw loginFailed();

  return user;
}

// Only the hash of the token is stored, so a database leak does not hand out
// working reset links. The raw token goes in the email and is never persisted.
function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createResetToken(userId) {
  const raw = crypto.randomBytes(32).toString("hex");
  await ResetToken.create({
    user_id: userId,
    token_hash: hashToken(raw),
    expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  return raw;
}

export async function consumeResetToken(raw) {
  const token = await ResetToken.findOne({ token_hash: hashToken(raw) });
  if (!token) throw ApiError.badRequest("That reset link is not valid.");
  if (token.used_at) throw ApiError.badRequest("That reset link has already been used.");
  if (token.expires_at.getTime() < Date.now()) {
    throw ApiError.badRequest("That reset link has expired. Request a new one.");
  }
  return token;
}

export async function setPassword(userId, password) {
  await User.updateOne(
    { _id: userId },
    { $set: { password_hash: await hashPassword(password) } },
  );
}

// Marking used rather than deleting keeps a replayed link distinguishable from
// a fabricated one, and the TTL index clears it out on its own later.
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
    profile_image_url: user.profile_image_url,
    created_at: user.createdAt ?? user.created_at ?? null,
  };
}
