/** Finds "@Full Name" or "@First" in a comment. Longest names win, so "@Mohit Rao" is not also "@Mohit". */
export function findMentions(body: string, people: readonly { id: string; name: string }[]): string[] {
  const found = new Set<string>();
  let text = body;
  const firstOf = (name: string) => name.split(/\s+/)[0] ?? name;
  const firstNames = new Map<string, number>();
  for (const p of people) {
    const f = firstOf(p.name).toLowerCase();
    firstNames.set(f, (firstNames.get(f) ?? 0) + 1);
  }
  const handles = people
    .flatMap((p) => {
      const first = firstOf(p.name);
      const list = [{ id: p.id, handle: p.name }];
      if (first !== p.name && firstNames.get(first.toLowerCase()) === 1)
        list.push({ id: p.id, handle: first });
      return list;
    })
    .sort((a, b) => b.handle.length - a.handle.length);
  for (const { id, handle } of handles) {
    const escaped = handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^\\p{L}\\p{N}_])@${escaped}(?![\\p{L}\\p{N}_])`, "giu");
    const replaced = text.replace(re, "$1");
    if (replaced !== text) {
      found.add(id);
      text = replaced;
    }
  }
  return [...found];
}
