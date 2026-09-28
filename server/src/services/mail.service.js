import { Resend } from "resend";
import { env } from "../config/env.js";

let client = null;
function resend() {
  if (!env.resendApiKey) return null;
  if (!client) client = new Resend(env.resendApiKey);
  return client;
}

function resetEmailHtml({ firstName, link }) {
  const safeFirst = escapeHtml(firstName);
  const safeLink = escapeHtml(link);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6f4;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Campus Coin</p>
      <h1 style="margin:0 0 16px;font-size:22px;">Reset your CampusCoin password</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Hi ${safeFirst},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
        Use the button below to choose a new password. The link works once and
        expires in 15 minutes.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${safeLink}"
           style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;
                  padding:12px 20px;border-radius:8px;font-weight:600;">Choose a new password</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">If the button does not work, paste this into your browser:</p>
      <p style="margin:0 0 24px;font-size:13px;word-break:break-all;color:#2563eb;">${safeLink}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
        If you did not ask for this you can ignore this email. Your password
        will not change until someone opens the link above.
      </p>
    </div>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Always resolves. A caller must never be able to tell from the outcome
// whether the email was sent, the account exists, or the provider rejected it,
// because that difference is exactly what an attacker enumerates accounts with.
export async function sendPasswordResetEmail({ to, firstName, link }) {
  const api = resend();
  if (!api) {
    console.log("\n  [mail] RESEND_API_KEY is not set - reset link for the console:");
    console.log(`  [mail] ${to}`);
    console.log(`  [mail] ${link}\n`);
    return { delivered: false, reason: "no_api_key" };
  }

  try {
    const { error } = await api.emails.send({
      from: env.emailFrom,
      to,
      subject: "Reset your CampusCoin password",
      html: resetEmailHtml({ firstName, link }),
    });
    if (error) {
      console.error(`[mail] Resend rejected the message: ${error.message}`);
      return { delivered: false, reason: "provider_error" };
    }
    console.log(`[mail] reset email sent to ${to}`);
    return { delivered: true };
  } catch (error) {
    console.error(`[mail] sending failed: ${error.message}`);
    return { delivered: false, reason: "send_failed" };
  }
}
