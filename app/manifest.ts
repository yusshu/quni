import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Q'uñi — Calculadora de propiedades del agua",
    short_name: "Q'uñi",
    description: "Calculadora de propiedades termodinámicas del agua.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f8",
    theme_color: "#0877b9",
    icons: [
      {
        src: "/icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
