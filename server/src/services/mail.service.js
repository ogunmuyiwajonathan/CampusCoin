import { Resend } from "resend";
import { env } from "../config/env.js";

let client = null;
function resend() {
  if (!env.resendApiKey) return null;
  if (!client) client = new Resend(env.resendApiKey);
  return client;
}

function resetEmailHtml({ firstName, code }) {
  const safeFirst = escapeHtml(firstName);
  const safeCode = escapeHtml(code);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6f4;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Campus Coin</p>
      <h1 style="margin:0 0 16px;font-size:22px;">Your password reset code</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Hi ${safeFirst},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
        Enter this code on the reset password screen to choose a new one. It
        works once and expires in 10 minutes.
      </p>
      <p style="margin:0 0 24px;font-size:34px;font-weight:700;letter-spacing:8px;
                text-align:center;background:#f4f6f4;border-radius:12px;padding:20px;">${safeCode}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
        If you did not ask for this you can ignore this email. Your password
        will not change until someone enters the code above.
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

export async function sendPasswordResetEmail({ to, firstName, code }) {
  const api = resend();
  if (!api) {
    console.error(
      `[mail] RESEND_API_KEY is not set, so no reset code was sent to ${to}.`,
    );
    return { delivered: false, reason: "no_api_key" };
  }

  try {
    const { error } = await api.emails.send({
      from: env.emailFrom,
      to,
      subject: "Your CampusCoin password reset code",
      html: resetEmailHtml({ firstName, code }),
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

function reportEmailHtml({ firstName, message, report }) {
  const safeFirst = escapeHtml(firstName);
  const safeMessage = escapeHtml(message || "Here is my spending report.");
  const money = (value) =>
    `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const rows = report.byCategory
    .map(
      (row) =>
        `<tr>
           <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(row.category)}</td>
           <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${escapeHtml(row.type)}</td>
           <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(row.total)}</td>
         </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6f4;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Campus Coin</p>
      <h1 style="margin:0 0 16px;font-size:22px;">Spending report</h1>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Hi ${safeFirst},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${safeMessage}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">
        <tr>
          <th align="left" style="padding:6px 8px;border-bottom:2px solid #d1d5db;">Category</th>
          <th align="left" style="padding:6px 8px;border-bottom:2px solid #d1d5db;">Type</th>
          <th align="right" style="padding:6px 8px;border-bottom:2px solid #d1d5db;">Total</th>
        </tr>
        ${rows || '<tr><td colspan="3" style="padding:8px;">No transactions in this range.</td></tr>'}
      </table>
      <p style="margin:0;font-size:14px;line-height:1.8;">
        Income <strong>${money(report.totals.income)}</strong><br />
        Expenses <strong>${money(report.totals.expense)}</strong><br />
        Net <strong>${money(report.totals.net)}</strong>
      </p>
    </div>
  </body>
</html>`;
}

export async function sendWelcomeEmail({ to, firstName }) {
  const api = resend();
  if (!api) {
    console.error(`[mail] RESEND_API_KEY is not set, so no welcome mail was sent to ${to}.`);
    return { delivered: false, reason: "no_api_key" };
  }

  const safeFirst = escapeHtml(firstName);
  try {
    const { error } = await api.emails.send({
      from: env.emailFrom,
      to,
      subject: "Welcome to CampusCoin",
      html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6f4;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Campus Coin</p>
      <h1 style="margin:0 0 16px;font-size:22px;">Your account is ready</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Hi ${safeFirst},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
        This address was just used to create a CampusCoin account, so if you
        did not sign up, reply and we will look into it.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
        If you ever forget your password, ask for a reset code on the sign in
        screen and we will email one here.
      </p>
    </div>
  </body>
</html>`,
    });
    if (error) {
      console.error(`[mail] Resend rejected the welcome mail: ${error.message}`);
      return { delivered: false, reason: "provider_error" };
    }
    console.log(`[mail] welcome email sent to ${to}`);
    return { delivered: true };
  } catch (error) {
    console.error(`[mail] welcome send failed: ${error.message}`);
    return { delivered: false, reason: "send_failed" };
  }
}

export async function sendReportEmail({ to, name, message, report }) {
  const api = resend();
  if (!api) {
    console.error(`[mail] RESEND_API_KEY is not set, so no report was sent to ${to}.`);
    return { delivered: false, reason: "no_api_key" };
  }

  try {
    const { error } = await api.emails.send({
      from: env.emailFrom,
      to,
      subject: "Your Campus Coin spending report",
      html: reportEmailHtml({ firstName: name, message, report }),
    });
    if (error) {
      console.error(`[mail] Resend rejected the report: ${error.message}`);
      return { delivered: false, reason: "provider_error" };
    }
    console.log(`[mail] report sent to ${to}`);
    return { delivered: true };
  } catch (error) {
    console.error(`[mail] report send failed: ${error.message}`);
    return { delivered: false, reason: "send_failed" };
  }
}
