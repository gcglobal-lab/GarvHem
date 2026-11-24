"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { LeadServiceName } from "@/config/services";
import { useReturnFocus } from "../use-return-focus";

export type QuotePrefill = { service?: LeadServiceName; role?: string };
type Ctx = { open: (prefill?: QuotePrefill) => void; preload: () => void };

const load = () => import("./QuoteDialog").then((m) => m.QuoteDialog);
const QuoteDialog = dynamic(load, { ssr: false });

const QuoteContext = createContext<Ctx>({ open: () => {}, preload: () => {} });
export const useQuote = () => useContext(QuoteContext);

/** One enquiry dialog for the whole site. Its code loads only when somebody reaches for it. */
export function QuoteProvider({
  turnstileSiteKey,
  nonce,
  children,
}: {
  turnstileSiteKey?: string;
  nonce?: string;
  children: ReactNode;
}) {
  const [used, setUsed] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<QuotePrefill>({});
  const { remember, restore } = useReturnFocus();
  const open = useCallback(
    (p: QuotePrefill = {}) => {
      remember();
      setPrefill(p);
      setUsed(true);
      setOpen(true);
    },
    [remember],
  );
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) restore();
  };
  const value = useMemo<Ctx>(() => ({ open, preload: () => void load() }), [open]);
  return (
    <QuoteContext.Provider value={value}>
      {children}
      {used ? (
        <QuoteDialog
          {...prefill}
          open={isOpen}
          onOpenChange={onOpenChange}
          turnstileSiteKey={turnstileSiteKey}
          nonce={nonce}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </QuoteContext.Provider>
  );
}
