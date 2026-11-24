import "server-only";
import nodemailer from "nodemailer";

export type OutgoingEmail = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export interface EmailTransport {
  send(email: OutgoingEmail): Promise<void>;
}

/** Used when no provider is configured. The body is printed in development only. */
export class ConsoleTransport implements EmailTransport {
  async send(email: OutgoingEmail) {
    if (process.env.NODE_ENV === "production")
      console.info(`[email] not configured, skipped: "${email.subject}"`);
    else console.info(`[email] to=${email.to.join(", ")} subject="${email.subject}"\n${email.text}`);
  }
}

export class SmtpTransport implements EmailTransport {
  private readonly mailer;
  constructor(o: { host: string; port: number; user?: string; password?: string }) {
    this.mailer = nodemailer.createTransport({
      host: o.host,
      port: o.port,
      secure: o.port === 465,
      requireTLS: o.port !== 465 && o.host !== "localhost" && o.host !== "127.0.0.1",
      auth: o.user ? { user: o.user, pass: o.password } : undefined,
      connectionTimeout: 10_000,
    });
  }
  async send(email: OutgoingEmail) {
    await this.mailer.sendMail(email);
  }
}

export class ResendTransport implements EmailTransport {
  constructor(private readonly apiKey: string) {}
  async send(email: OutgoingEmail) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        reply_to: email.replyTo,
      }),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
  }
}
