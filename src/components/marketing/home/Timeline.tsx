import { PROCESS } from "../process-steps";

/** Five steps on one line. The line draws itself when it scrolls into view. */
export function Timeline() {
  return (
    <ol className="relative grid gap-10 lg:grid-cols-5 lg:gap-6">
      <li aria-hidden className="absolute top-0 bottom-0 left-[19px] w-px bg-white/14 lg:hidden">
        <span data-grow="y" className="block size-full bg-signal" />
      </li>
      <li aria-hidden className="absolute top-[19px] right-0 left-0 hidden h-px bg-white/14 lg:block">
        <span data-grow="x" className="block size-full bg-signal" />
      </li>
      {PROCESS.map((s, i) => (
        <li key={s.title} data-reveal={String(i * 2)} className="relative pl-16 lg:pt-16 lg:pr-4 lg:pl-0">
          <span
            aria-hidden
            className="absolute top-0 left-0 grid size-10 place-items-center rounded-full border border-signal bg-ink-950 font-display text-sm font-semibold"
          >
            {i + 1}
          </span>
          <h3 className="font-display text-xl leading-snug font-semibold tracking-tight">{s.title}</h3>
          <p className="mt-2.5 leading-relaxed text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}
