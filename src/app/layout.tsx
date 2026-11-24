import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { cookies, headers } from "next/headers";
import { site, siteUrl } from "@/config/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${site.name} | ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", siteName: site.name, locale: site.locale },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1220",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading headers makes every page dynamic, which the per-request CSP nonce needs.
  const [jar, h] = await Promise.all([cookies(), headers()]);
  const inPortal = (h.get("x-pathname") ?? "").startsWith("/portal");
  const dark = inPortal && jar.get("gv_theme")?.value === "dark";
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${sora.variable} ${dark ? "dark" : ""}`}
    >
      <body>{children}</body>
    </html>
  );
}
