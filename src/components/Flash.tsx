"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const FlashContext = createContext<(message: string) => void>(() => {});

export const useFlash = () => useContext(FlashContext);

/** Erfolgsmeldungen überleben das Neuladen der Seite, weil sie im Layout leben. */
export function FlashProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((m: string) => setMessage(m), []);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(t);
  }, [message]);
  return (
    <FlashContext.Provider value={show}>
      <FlashSlot message={message} onClose={() => setMessage(null)} />
      {children}
    </FlashContext.Provider>
  );
}

/** Meldung im Seitenfluss (nicht schwebend), damit sie nie Bedienelemente verdeckt. */
function FlashSlot({ message, onClose }: { message: string | null; onClose: () => void }) {
  return (
    <div className="flash-region" role="status" aria-live="polite">
      {message && (
        <div className="flash" data-testid="flash">
          <span>{message}</span>
          <button type="button" className="flash__close" onClick={onClose} aria-label="Meldung schließen">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
