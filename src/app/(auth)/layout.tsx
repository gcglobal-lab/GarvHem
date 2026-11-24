import { Toaster } from "@/components/ui/toast";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-10 sm:px-6">
      <div
        aria-hidden
        className="grid-lines-ink absolute inset-0 -z-10 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />
      <div
        aria-hidden
        className="absolute -top-40 -left-32 -z-10 size-[34rem] rounded-full bg-accent/12 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-40 -bottom-48 -z-10 size-[36rem] rounded-full bg-brand/12 blur-3xl"
      />
      {children}
      <Toaster />
    </main>
  );
}
