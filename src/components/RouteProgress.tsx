"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Ladezustand bei Seitenwechseln: dünner Balken oben und Ansage für Screenreader. */
export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setLoading(true);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      {loading && <div className="route-progress" aria-hidden="true" />}
      <span className="visually-hidden" role="status" aria-live="polite">
        {loading ? "Seite wird geladen …" : ""}
      </span>
    </>
  );
}
