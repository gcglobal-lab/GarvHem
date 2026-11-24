import { parseInput } from "@/lib/action";
import { handler, json } from "@/lib/api";
import { AppError, invalid } from "@/lib/errors";
import { enforceLimit, ipBudget } from "@/lib/rate-limit";
import { assertSameOrigin, metaFrom } from "@/lib/request";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/file-type";
import { verifyTurnstile } from "@/lib/turnstile";
import { leadSchema } from "@/lib/validators/leads";
import { createLead } from "@/server/leads";
import { prepareUpload } from "@/server/uploads";

const MIN_FILL_MS = 3_000;

export const POST = handler("lead.create", async (req) => {
  assertSameOrigin(req);
  const meta = metaFrom(req.headers);
  await enforceLimit(`lead:burst:${meta.ip}`, ipBudget(meta.ip, 20), 600); // attempts, including invalid ones
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 200_000)
    throw invalid("Files can be up to 10 MB.", { attachment: "Maximum size is 10 MB" });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw invalid("Invalid request body.");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("data") ?? ""));
  } catch {
    throw invalid("Invalid request body.");
  }

  // Bots fill the hidden field or submit instantly. They get a normal-looking answer.
  const elapsed = Number(form.get("elapsed") ?? 0);
  if (String(form.get("website") ?? "") !== "" || !(elapsed >= MIN_FILL_MS)) return json({ ok: true });

  const data = parseInput(leadSchema, payload);
  if (!(await verifyTurnstile(form.get("turnstile") as string | null, meta.ip)))
    throw new AppError("VALIDATION", "Please complete the security check and try again.");
  await enforceLimit(
    `lead:${meta.ip}`,
    ipBudget(meta.ip, 5),
    3600,
    "You have sent several enquiries. Please try again in an hour.",
  );

  const file = form.get("attachment");
  const upload = file instanceof File && file.size > 0 ? await prepareUpload(file) : null;
  await createLead(data, upload, meta);
  return json({ ok: true });
});
