import { animate, inView } from "framer-motion/dom";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/**
 * One small script drives every reveal on the page, so sections can stay Server Components.
 * Markup is fully visible by default: elements are hidden only after this runs, only below the fold,
 * and never with reduced motion. Attributes:
 *   data-reveal="n"   fade and rise, n = stagger step
 *   data-grow="x|y"   line that draws itself
 *   data-count        counts up to its own number
 */
export function startMotion(): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window))
    return () => undefined;
  const stops: (() => void)[] = [];
  const below = (el: Element) => el.getBoundingClientRect().top > window.innerHeight * 0.98;
  const once = (el: HTMLElement, run: () => void, amount: number) => {
    const stop = inView(
      el,
      () => {
        run();
        stop();
      },
      { amount, margin: "0px 0px -6% 0px" },
    );
    stops.push(stop);
  };

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    if (!below(el)) return;
    const step = Number(el.dataset.reveal || 0);
    el.style.opacity = "0";
    once(
      el,
      () => {
        const a = animate(
          el,
          { opacity: [0, 1], transform: ["translateY(22px)", "translateY(0px)"] },
          { duration: 0.65, delay: step * 0.08, ease: EASE },
        );
        const clear = () => {
          el.style.removeProperty("opacity");
          el.style.removeProperty("transform");
        };
        a.then(clear, clear);
      },
      0.08,
    );
  });

  document.querySelectorAll<HTMLElement>("[data-grow]").forEach((el) => {
    if (!below(el)) return;
    const axis = el.dataset.grow === "y" ? "scaleY" : "scaleX";
    el.style.transform = `${axis}(0)`;
    el.style.transformOrigin = "0 0";
    once(
      el,
      () => animate(el, { transform: [`${axis}(0)`, `${axis}(1)`] }, { duration: 1.5, ease: EASE }),
      0,
    );
  });

  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const text = el.textContent ?? "";
    const target = Number(text);
    if (!Number.isFinite(target) || !below(el)) return;
    el.textContent = "0";
    once(
      el,
      () => {
        const a = animate(0, target, {
          duration: 1.3,
          ease: EASE,
          onUpdate: (v) => (el.textContent = String(Math.round(v))),
          onComplete: () => (el.textContent = text),
        });
        stops.push(() => a.stop());
      },
      0.2,
    );
    stops.push(() => (el.textContent = text));
  });

  return () => stops.forEach((s) => s());
}
