import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/index.js";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../services/mail.service.js";
import {
  authenticate,
  consumeResetCode,
  createResetCode,
  firstNameOf,
  invalidateResetTokens,
  markResetTokenUsed,
  normaliseEmail,
  normaliseName,
  publicUser,
  registerUser,
  setPassword,
} from "../services/auth.service.js";

function startSession(req, user) {
  return new Promise((resolve, reject) => {
    const previous = req.session.userId;
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.userId = user.user_id;
      if (previous) req.session.previousUserId = previous;
      return req.session.save((saveError) => (saveError ? reject(saveError) : resolve()));
    });
  });
}

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);
  await startSession(req, user);
  void sendWelcomeEmail({ to: user.email, firstName: firstNameOf(user.name) });
  res.status(201).json({ user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const user = await authenticate(req.body);
  await startSession(req, user);
  res.json({ user: publicUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  await new Promise((resolve) => {
    if (!req.session) return resolve();
    return req.session.destroy(() => resolve());
  });
  res.clearCookie("campuscoin.sid");
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) return res.json({ user: null });
  return res.json({ user: publicUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const patch = { ...req.body };
  if (patch.name !== undefined) patch.name = normaliseName(patch.name);
  delete patch.email;
  delete patch.role;
  delete patch.is_active;
  delete patch.user_id;

  const user = await User.findByIdAndUpdate(
    req.user.user_id,
    { $set: patch },
    { new: true, runValidators: true },
  );
  if (!user) throw ApiError.notFound("Account not found.");
  res.json({ user: publicUser(user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.user_id).select("+password_hash");
  if (!user) throw ApiError.notFound("Account not found.");

  const currentOk = await bcrypt.compare(req.body.currentPassword, user.password_hash);
  if (!currentOk) throw ApiError.unauthorized("Your current password is not correct.");

  await setPassword(user._id, req.body.newPassword);
  await invalidateResetTokens(user._id);

  await mongoose.connection.collection("sessions").deleteMany({
    _id: { $ne: req.sessionID },
    session: { $regex: `"userId":"${user._id.toString()}"` },
  });

  res.json({ ok: true });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = normaliseEmail(req.body.email);
  const user = await User.findOne({ email, is_active: true }).lean();

  if (user) {
    await invalidateResetTokens(user._id);
    const code = await createResetCode(user._id);
    await sendPasswordResetEmail({
      to: user.email,
      firstName: firstNameOf(user.name),
      code,
    });
  }

  res.json({
    ok: true,
    message: "If that email is registered, a reset code is on its way.",
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    email: normaliseEmail(req.body.email),
    is_active: true,
  }).lean();

  const token = await consumeResetCode(
    user?._id ?? new mongoose.Types.ObjectId(),
    req.body.code,
  );
  await setPassword(user._id, req.body.password);
  await markResetTokenUsed(token._id);
  await invalidateResetTokens(user._id);
  res.json({ ok: true });
});
