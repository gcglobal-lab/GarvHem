"use client";

import Script from "next/script";
import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";

type Api = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Api;
  }
}

export type TurnstileHandle = { token: () => string; reset: () => void };

export function Turnstile({
  siteKey,
  nonce,
  ref,
}: {
  siteKey: string;
  nonce?: string;
  ref?: Ref<TurnstileHandle>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string>(undefined);
  const value = useRef("");

  const render = useCallback(() => {
    if (!window.turnstile || !box.current || widget.current) return;
    widget.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      theme: "light",
      callback: (t: string) => (value.current = t),
      "expired-callback": () => (value.current = ""),
      "error-callback": () => (value.current = ""),
    });
  }, [siteKey]);

  useEffect(() => {
    render();
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [render]);

  useImperativeHandle(ref, () => ({
    token: () => value.current,
    reset: () => {
      value.current = "";
      if (widget.current) window.turnstile?.reset(widget.current);
    },
  }));

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        nonce={nonce}
        onReady={render}
      />
      <div ref={box} className="min-h-[65px]" />
    </>
  );
}
