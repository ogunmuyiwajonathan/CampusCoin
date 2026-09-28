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

// A new session id on every privilege change. Without this, a session cookie
// captured before login would keep working as the signed-in user afterwards,
// which is the whole point of rotating it.
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
  // Fire and forget on purpose. A mail outage must not turn a successful signup
  // into an error, and the account is already usable whether or not this lands.
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

// The client calls this on every page load to find out who it is. It returns
// 200 with user: null rather than 401, because "not logged in" is a normal
// state for this endpoint and the client branches on it.
export const me = asyncHandler(async (req, res) => {
  if (!req.user) return res.json({ user: null });
  return res.json({ user: publicUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const patch = { ...req.body };
  if (patch.name !== undefined) patch.name = normaliseName(patch.name);
  // Email is deliberately not updatable here. Changing it needs a
  // verification step on the new address; the client renders it read-only and
  // the SRS only asks for reset by email.
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

// Always the same 200 with the same body, whether the address exists, is
// already used, or the mail provider is down. Anything else turns this
// endpoint into an account-enumeration oracle.
// Changing a password is how someone reacts to a stolen account, so every other
// session for this user dies with it. The session making the change is kept,
// otherwise the user is thrown out of the tab they are working in.
export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.user_id).select("+password_hash");
  if (!user) throw ApiError.notFound("Account not found.");

  const currentOk = await bcrypt.compare(req.body.currentPassword, user.password_hash);
  if (!currentOk) throw ApiError.unauthorized("Your current password is not correct.");

  await setPassword(user._id, req.body.newPassword);
  await invalidateResetTokens(user._id);

  // connect-mongo stores the session as a serialised string, so the user id is
  // matched by pattern rather than a query.
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
    // A fresh code supersedes any earlier one, so a code someone obtained from
    // an email that has since been replaced can no longer be spent.
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

  // An unknown address is handed a made up id rather than an early return, so
  // it falls through to the same "that code is not valid" answer a wrong code
  // gets. Returning quietly here instead would leak which emails exist.
  const token = await consumeResetCode(
    user?._id ?? new mongoose.Types.ObjectId(),
    req.body.code,
  );
  await setPassword(user._id, req.body.password);
  await markResetTokenUsed(token._id);
  // Every other outstanding code for this account dies with the password, so a
  // code emailed before a compromise cannot be used afterwards.
  await invalidateResetTokens(user._id);
  res.json({ ok: true });
});
