import { formatName } from "./formatName.js";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

const SESSION_KEY = "campuscoin.session";
const LATENCY = 420;

function wait(value, ms = LATENCY) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    return null;
  }
}

function requirePositiveAmount(value, label) {
  if (value === null || value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be zero or more.`);
  }
}

// Server must repeat these checks on PATCH /api/users/me.
export async function updateUserProfile(patch) {
  const next = { ...(readSession() ?? {}), ...patch };
  if (typeof next.name === "string") {
    const name = next.name.trim();
    if (!name) throw new Error("Enter your name.");
    next.name = formatName(name);
  }
  requirePositiveAmount(next.monthly_savings_goal, "Savings goal");
  requirePositiveAmount(next.allowance_baseline, "Allowance baseline");
  await wait(null);
  return next;
}

// The real endpoint takes multipart and returns a `profile_image_url`.
export async function uploadAvatar(file) {
  if (!file) throw new Error("Choose an image first.");
  if (!AVATAR_TYPES.includes(file.type)) throw new Error("Use a JPG, PNG or WEBP image.");
  if (file.size > AVATAR_MAX_BYTES) throw new Error("Pick an image under 2 MB.");
  const dataUrl = await cropToSquare(file);
  await wait(dataUrl, 650);
  return dataUrl;
}

function cropToSquare(file, size = 192) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("That image couldn't be opened."));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const side = Math.min(image.width, image.height);
        canvas
          .getContext("2d")
          .drawImage(
            image,
            (image.width - side) / 2,
            (image.height - side) / 2,
            side,
            side,
            0,
            0,
            size,
            size,
          );
        resolve(canvas.toDataURL("image/png"));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
