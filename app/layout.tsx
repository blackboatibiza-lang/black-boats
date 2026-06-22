import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Black Boats — Sistema de Gestión",
  description: "Sistema de gestión de alquiler de barcos en Ibiza",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
