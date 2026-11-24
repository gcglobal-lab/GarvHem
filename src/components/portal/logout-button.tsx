"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export async function signOut() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.assign("/login");
  }
}

export function LogoutButton(props: ButtonProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      {...props}
      loading={busy}
      onClick={() => {
        setBusy(true);
        void signOut();
      }}
    />
  );
}
