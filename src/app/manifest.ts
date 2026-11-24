import type { MetadataRoute } from "next";
import { site } from "@/config/site";

const INK = "#0b1220";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: INK,
    theme_color: INK,
    icons: [
      { src: "/media/images/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/media/images/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
