import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Frawst Fever <contact@frawstfevergames.ca>";

/** Generate a 6-digit verification code */
export function generateVerifyCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;

  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Reset your password — Frawst Fever Games",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; color: #1a1a2e; margin: 0;">Frawst Fever Games</h1>
        </div>
        <p style="font-size: 16px; color: #333;">Hey ${name},</p>
        <p style="font-size: 16px; color: #333;">
          We received a request to reset your password. Click the button below to choose a new one:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; background: #9b5cff; color: #fff; padding: 14px 32px;
                    border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size: 13px; color: #9b5cff; word-break: break-all;">${resetUrl}</p>
        <p style="font-size: 14px; color: #666;">This link expires in <strong>1 hour</strong>.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(to: string, name: string, code: string) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${code} — Your verification code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; color: #1a1a2e; margin: 0;">Frawst Fever Games</h1>
        </div>
        <p style="font-size: 16px; color: #333;">Hey ${name},</p>
        <p style="font-size: 16px; color: #333;">
          Thanks for signing up! Enter this verification code to confirm your email:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background: #f5f0ff; border: 2px solid #9b5cff;
                      border-radius: 12px; padding: 20px 40px; letter-spacing: 8px;
                      font-size: 36px; font-weight: 700; color: #9b5cff; font-family: monospace;">
            ${code}
          </div>
        </div>
        <p style="font-size: 14px; color: #666; text-align: center;">
          This code expires in <strong>15 minutes</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
