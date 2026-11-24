import { handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { forbiddenError, notFound } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/request";
import { storage } from "@/lib/storage";
import { assertOwnEditableReport, getReport } from "@/server/reports";
import { assertTaskVisible, canDeleteTaskFile } from "@/server/tasks";
import { deleteAttachment } from "@/server/uploads";

type Ctx = { params: Promise<{ id: string }> };

/** Streams a private file after checking access to the record that owns it. */
export const GET = handler("attachments.download", async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const a = await db.attachment.findUnique({ where: { id: (await params).id } });
  if (!a) throw notFound("File");
  if (a.taskId) await assertTaskVisible(user, a.taskId);
  else if (a.dailyReportId) await getReport(user, a.dailyReportId);
  else if (!a.leadId || !user.permissions.has("leads.view")) throw notFound("File");
  const stream = await storage().read(a.storageKey);
  if (!stream) throw notFound("File");
  return new Response(stream, {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Length": String(a.size),
      "Content-Disposition": `attachment; filename="${a.filename.replace(/[^\x20-\x7e]|["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(a.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});

export const DELETE = handler("attachments.delete", async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const a = await db.attachment.findUnique({ where: { id: (await params).id } });
  if (!a) throw notFound("File");
  if (a.taskId) {
    if (!(await canDeleteTaskFile(user, a.taskId, a.uploadedById))) throw forbiddenError();
  } else if (a.dailyReportId) await assertOwnEditableReport(user, a.dailyReportId);
  else throw notFound("File");
  await deleteAttachment(a.id);
  return json({ ok: true });
});
