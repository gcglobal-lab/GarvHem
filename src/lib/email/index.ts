import "server-only";
import { env } from "@/lib/env";
import { renderEmail, type EmailContent } from "./template";
import { ConsoleTransport, ResendTransport, SmtpTransport, type EmailTransport } from "./transports";

let transport: EmailTransport | undefined;

function getTransport(): EmailTransport {
  if (transport) return transport;
  const e = env();
  transport =
    e.EMAIL_PROVIDER === "smtp"
      ? new SmtpTransport({
          host: e.SMTP_HOST!,
          port: e.SMTP_PORT,
          user: e.SMTP_USER,
          password: e.SMTP_PASSWORD,
        })
      : e.EMAIL_PROVIDER === "resend"
        ? new ResendTransport(e.RESEND_API_KEY!)
        : new ConsoleTransport();
  return transport;
}

export type SendEmailInput = EmailContent & { to: string | string[]; subject: string; replyTo?: string };

/** Never throws: an email problem must not break the action that triggered it. */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const { html, text } = renderEmail(input);
  try {
    await getTransport().send({
      from: env().EMAIL_FROM,
      to: [input.to].flat(),
      subject: input.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
      replyTo: input.replyTo,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error("[email] delivery failed:", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}
