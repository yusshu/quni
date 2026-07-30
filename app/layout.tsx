import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Q'uñi | Calculadora de propiedades del agua",
  description:
    "Calcula estados termodinámicos del agua a partir de dos propiedades intensivas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F8FB" },
    { media: "(prefers-color-scheme: dark)", color: "#07141C" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
