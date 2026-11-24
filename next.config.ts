import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// The Content-Security-Policy carries a per-request nonce, so it is set in src/proxy.ts.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@node-rs/argon2", "pg", "nodemailer"],
  images: { formats: ["image/avif", "image/webp"] },
  experimental: {
    authInterrupts: true, // forbidden() -> HTTP 403
    serverActions: { bodySizeLimit: "2mb" },
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion", "radix-ui"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
