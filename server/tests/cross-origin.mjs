import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "..");

let passed = 0;
const check = (name, condition, detail = "") => {
  if (condition) {
    passed += 1;
    process.stdout.write(`  PASS  ${name}\n`);
  } else {
    process.stdout.write(`  FAIL  ${name} ${detail}\n`);
    process.exitCode = 1;
  }
};

const probe = (corsOrigin) => {
  const probeFile = path.join(serverRoot, "_cors_probe.mjs");
  const script = `
    import "dotenv/config";
    const { env } = await import("./src/config/env.js");
    const { isTrustedOrigin } = await import("./src/utils/trustedOrigin.js");
    const results = {
      corsOrigins: env.corsOrigins,
      clean: isTrustedOrigin("https://campus-coin-nine.vercel.app", "campuscoin-1sbu.onrender.com"),
      slashed: isTrustedOrigin("https://campus-coin-nine.vercel.app/", "campuscoin-1sbu.onrender.com"),
      spaced: isTrustedOrigin("https://campus-coin-nine.vercel.app  ", "campuscoin-1sbu.onrender.com"),
      unrelated: isTrustedOrigin("https://evil.example", "campuscoin-1sbu.onrender.com"),
      local: isTrustedOrigin("http://localhost:5173", "campuscoin-1sbu.onrender.com"),
    };
    process.stdout.write(JSON.stringify(results));
  `;
  writeFileSync(probeFile, script);
  try {
    const result = spawnSync(process.execPath, [probeFile], {
      cwd: serverRoot,
      encoding: "utf8",
      env: { ...process.env, CORS_ORIGIN: corsOrigin, NODE_ENV: "production" },
    });
    const line = (result.stdout ?? "").trim().split("\n").pop();
    return JSON.parse(line);
  } catch (error) {
    throw new Error(`probe failed: ${error.message}`);
  } finally {
    rmSync(probeFile, { force: true });
  }
};

process.stdout.write("\n1. a trailing slash in CORS_ORIGIN still matches the browser's Origin\n");

const slashed = probe("https://campus-coin-nine.vercel.app/");
check("the stored origin is normalised to have no trailing slash", slashed.corsOrigins.length === 1 && slashed.corsOrigins[0] === "https://campus-coin-nine.vercel.app", JSON.stringify(slashed.corsOrigins));
check("the clean origin the browser sends is trusted", slashed.clean === true);
check("an origin with a trailing slash is still trusted", slashed.slashed === true);
check("surrounding whitespace is tolerated", slashed.spaced === true);
check("an unrelated origin is refused", slashed.unrelated === false, "an unrelated origin was trusted");

process.stdout.write("\n2. the documented value still works\n");

const clean = probe("https://campus-coin-nine.vercel.app");
check("the clean value is trusted", clean.clean === true);

process.stdout.write("\n3. several origins, mixed slashes and spacing\n");

const multi = probe("http://localhost:5173 , https://campus-coin-nine.vercel.app/ ,https://other.vercel.app");
check("all three are parsed", multi.corsOrigins.length === 3, JSON.stringify(multi.corsOrigins));
check("localhost is still trusted", multi.local === true);
check("the vercel origin is trusted despite the slash", multi.clean === true);

process.stdout.write("\n4. the session cookie can cross sites in production\n");

const cookieSource = readFileSync(
  path.join(serverRoot, "src", "config", "session.js"),
  "utf8",
);
check("the cookie is SameSite=None when NODE_ENV is production", /sameSite:\s*env\.isProd\s*\?\s*"none"\s*:\s*"lax"/.test(cookieSource), "cookie config not found");
check("the cookie is still Secure in production", /secure:\s*env\.isProd/.test(cookieSource), "secure flag not found");
check("the cookie is still HttpOnly", /httpOnly:\s*true/.test(cookieSource), "httpOnly not found");

process.stdout.write("\n5. the local .env needs no trailing slash to work either\n");

const envSource = readFileSync(
  path.join(serverRoot, "src", "config", "env.js"),
  "utf8",
);
check("env.js normalises trailing slashes on read", envSource.includes('replace(/\\/+$/, "")'), "normalisation not found");

process.stdout.write(`\ncross-origin config: ${passed} passed\n`);

