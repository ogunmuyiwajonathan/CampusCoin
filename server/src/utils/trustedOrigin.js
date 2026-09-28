import { env } from "../config/env.js";

// Browsers attach the Origin header to cross-site state-changing requests, and
// the session cookie is what identifies the caller, so an origin that is not on
// the allowlist is refused outright rather than left to sameSite to catch.
//
// Three things count as trusted:
//   1. no Origin at all - curl and server-to-server calls do not send one;
//   2. an exact match for an entry in CORS_ORIGIN - this is the only rule that
//      ever applies in production;
//   3. in development, any loopback origin and any origin served from the same
//      host as the API. The client runs through Vite dev and several preview
//      ports, and hard-coding them in .env meant a new port broke sign-in again.
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function originHostname(origin) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname;
  } catch {
    return null;
  }
}

function hostHeaderHostname(host) {
  const value = String(host ?? "").trim();
  if (!value) return "";
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end === -1 ? "" : value.slice(0, end + 1);
  }
  return value.split(":")[0];
}

export function isTrustedOrigin(origin, host) {
  if (!origin) return true;
  if (env.corsOrigins.includes(origin)) return true;
  if (env.isProd) return false;

  const originHost = originHostname(origin);
  if (!originHost) return false;
  if (LOOPBACK_HOSTS.has(originHost)) return true;

  const requestHost = hostHeaderHostname(host);
  return Boolean(requestHost) && originHost === requestHost;
}
