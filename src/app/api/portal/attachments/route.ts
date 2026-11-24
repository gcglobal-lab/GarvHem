import { z } from "zod";
import { parseInput } from "@/lib/action";
import { handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { conflict, invalid } from "@/lib/errors";
import { enforceLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/file-type";
import { id } from "@/lib/validators/common";
import { db } from "@/lib/db";
import { assertOwnEditableReport } from "@/server/reports";
import { assertTaskVisible, logAttachment } from "@/server/tasks";
import { prepareUpload, saveUpload } from "@/server/uploads";

const schema = z.object({ owner: z.enum(["task", "report"]), ownerId: id });
const MAX_PER_OWNER = 20;

export const POST = handler("attachments.upload", async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  await enforceLimit(`upload:${user.id}`, 40, 600);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 100_000)
    throw invalid("Files can be up to 10 MB.");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw invalid("Invalid request body.");
  }
  const { owner, ownerId } = parseInput(schema, { owner: form.get("owner"), ownerId: form.get("ownerId") });
  // Object-level check before touching the file.
  if (owner === "task") await assertTaskVisible(user, ownerId);
  else await assertOwnEditableReport(user, ownerId);
  const key = owner === "task" ? { taskId: ownerId } : { dailyReportId: ownerId };
  if ((await db.attachment.count({ where: key })) >= MAX_PER_OWNER) throw conflict("Too many attachments.");

  const file = form.get("file");
  if (!(file instanceof File)) throw invalid("Choose a file.");
  const saved = await saveUpload(await prepareUpload(file), key, user.id);
  if (owner === "task") await logAttachment(ownerId, user.id, saved.filename);
  return json({ ok: true, id: saved.id, filename: saved.filename, size: saved.size });
});
