import { useEffect, useState } from "react";

/**
 * Track which section id is currently most visible in the viewport.
 * IntersectionObserver-based; no dependencies.
 */
export function useScrollSpy(
  ids: string[],
  options: { rootMargin?: string; threshold?: number | number[] } = {},
): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (typeof window === "undefined" || ids.length === 0) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          // Pick the section with the highest visible ratio; tiebreak by document order.
          let best: string | null = null;
          let bestRatio = -1;
          for (const id of ids) {
            const ratio = visible.get(id);
            if (ratio !== undefined && ratio > bestRatio) {
              best = id;
              bestRatio = ratio;
            }
          }
          if (best) setActiveId(best);
        }
      },
      {
        rootMargin: options.rootMargin ?? "-96px 0px -60% 0px",
        threshold: options.threshold ?? [0, 0.25, 0.5, 1],
      },
    );

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [ids, options.rootMargin, options.threshold]);

  return activeId;
}
