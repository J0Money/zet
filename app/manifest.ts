import type { MetadataRoute } from "next";

// Next.js-konvention: genkendes automatisk og serveres på
// /manifest.webmanifest, med et <link rel="manifest"> tilføjet på alle
// sider. Gør det muligt at føje ZET til hjemmeskærmen som en app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZET",
    short_name: "ZET",
    description: "Registrer styrke og cardio, og følg din træning over tid.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f7fa",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
