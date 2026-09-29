import { env } from "../config/env.js";

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
