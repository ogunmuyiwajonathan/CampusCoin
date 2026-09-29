import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  authLoginLimiter,
  authRegisterLimiter,
  forgotPasswordLimiter,
} from "../middleware/rateLimiters.js";
import * as auth from "../controllers/auth.controller.js";
import { avatarUpload, uploadAvatar } from "../controllers/avatar.controller.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validators/auth.schema.js";

const router = Router();

router.post("/register", authRegisterLimiter, validate({ body: registerSchema }), auth.register);
router.post("/login", authLoginLimiter, validate({ body: loginSchema }), auth.login);
router.post("/logout", auth.logout);
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate({ body: forgotPasswordSchema }),
  auth.forgotPassword,
);
router.post("/reset-password", validate({ body: resetPasswordSchema }), auth.resetPassword);

router.get("/me", auth.me);
router.patch("/me", requireAuth, validate({ body: updateProfileSchema }), auth.updateProfile);
router.patch(
  "/me/password",
  requireAuth,
  validate({ body: changePasswordSchema }),
  auth.changePassword,
);
router.post("/me/avatar", requireAuth, avatarUpload, uploadAvatar);

export default router;
