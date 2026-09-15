import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SmashTeam | Câu Lạc Bộ Cầu Lông",
    short_name: "SmashTeam",
    description: "Câu lạc bộ cầu lông sinh viên năng động, chuyên nghiệp hàng đầu Làng Đại Học",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0F19",
    theme_color: "#7A22E0",
    orientation: "portrait",
    scope: "/",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
