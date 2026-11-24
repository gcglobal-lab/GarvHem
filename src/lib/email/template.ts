export type EmailContent = { heading: string; lines: string[]; cta?: { label: string; url: string } };

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderEmail({ heading, lines, cta }: EmailContent) {
  const body = lines.map((l) => `<p style="margin:0 0 14px;white-space:pre-line">${esc(l)}</p>`).join("");
  const button = cta
    ? `<p style="margin:26px 0 6px"><a href="${esc(cta.url)}" style="background:#d90b1c;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">${esc(cta.label)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#eef1f6;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1b2436">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:#0b1220;border-radius:16px 16px 0 0;padding:22px 28px;color:#fff;font-weight:700;letter-spacing:.22em">GARVHEM</div>
<div style="background:#fff;border-radius:0 0 16px 16px;padding:28px;font-size:15px;line-height:1.6">
<h1 style="font-size:20px;margin:0 0 16px">${esc(heading)}</h1>${body}${button}</div>
<p style="font-size:12px;color:#66708a;text-align:center;margin:18px 0 0">GARVHEM &middot; Your global team, built in India.</p>
</div></body></html>`;
  const text = [heading, "", ...lines, ...(cta ? ["", `${cta.label}: ${cta.url}`] : [])].join("\n");
  return { html, text };
}
