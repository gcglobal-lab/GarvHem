import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { invalid } from "@/lib/errors";
import { storage } from "@/lib/storage";
import { MAX_UPLOAD_BYTES, safeFilename, validateUpload } from "@/lib/storage/file-type";

export type AttachmentOwner = { taskId?: string; dailyReportId?: string; leadId?: string };

export type PreparedUpload = { bytes: Uint8Array; filename: string; mime: string; ext: string };

/** Size, extension, declared MIME and magic bytes must all agree. */
export async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (file.size > MAX_UPLOAD_BYTES)
    throw invalid("Files can be up to 10 MB.", { attachment: "Maximum size is 10 MB" });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = validateUpload(file.name, file.type, bytes);
  if (!type)
    throw invalid("That file type is not allowed. Use PDF, DOCX, PNG, JPG, WEBP or GIF.", {
      attachment: "Use PDF, DOCX or an image",
    });
  return { bytes, filename: safeFilename(file.name), mime: type.mime, ext: type.ext };
}

export async function saveUpload(
  prepared: PreparedUpload,
  owner: AttachmentOwner,
  uploadedById: string | null,
) {
  const folder = owner.leadId ? "leads" : owner.taskId ? "tasks" : "reports";
  const storageKey = `${folder}/${randomUUID()}.${prepared.ext}`;
  await storage().put(storageKey, prepared.bytes, prepared.mime);
  try {
    return await db.attachment.create({
      data: {
        storageKey,
        filename: prepared.filename,
        mimeType: prepared.mime,
        size: prepared.bytes.length,
        uploadedById,
        ...owner,
      },
    });
  } catch (error) {
    await storage().remove(storageKey);
    throw error;
  }
}

export async function deleteAttachment(id: string) {
  const a = await db.attachment.delete({ where: { id } });
  await storage().remove(a.storageKey);
}
