"use client";

import { Download, Paperclip, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/client-api";
import { formatBytes } from "@/lib/utils";

const ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg,.webp,.gif";
const MAX = 10 * 1024 * 1024;

export type FileRow = { id: string; filename: string; size: number; by?: string; canDelete: boolean };

/** Private files: uploaded, downloaded and removed through authorised routes only. */
export function FileList({
  owner,
  ownerId,
  files,
  canUpload,
}: {
  owner: "task" | "report";
  ownerId: string;
  files: FileRow[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    if (file.size > MAX) {
      toast.error("Files can be up to 10 MB.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set("owner", owner);
      body.set("ownerId", ownerId);
      body.set("file", file);
      await api("/api/portal/attachments", { method: "POST", body });
      toast.success("File uploaded.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/portal/attachments/${id}`, { method: "DELETE" });
      toast.success("File removed.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove the file.");
    }
  }

  return (
    <div>
      {files.length ? (
        <ul className="mb-3 space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
              <Paperclip className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{f.filename}</span>
                <span className="block text-xs text-muted">
                  {formatBytes(f.size)}
                  {f.by ? `, ${f.by}` : ""}
                </span>
              </span>
              <Button asChild variant="ghost" size="icon-sm">
                <a href={`/api/portal/attachments/${f.id}`} download aria-label={`Download ${f.filename}`}>
                  <Download aria-hidden />
                </a>
              </Button>
              {f.canDelete ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${f.filename}`}>
                      <Trash2 aria-hidden />
                    </Button>
                  }
                  title="Remove this file?"
                  description={`${f.filename} will be deleted for everyone.`}
                  confirmLabel="Remove"
                  onConfirm={() => remove(f.id)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canUpload ? (
        <>
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose a file"
            onChange={(e) => void upload(e.target.files)}
          />
          <Button variant="outline" size="sm" loading={busy} onClick={() => input.current?.click()}>
            <Paperclip aria-hidden /> Attach file
          </Button>
          <p className="mt-1.5 text-xs text-muted">PDF, DOCX or image, up to 10 MB.</p>
        </>
      ) : !files.length ? (
        <p className="text-sm text-muted">No files.</p>
      ) : null}
    </div>
  );
}
