import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLACKBOATS",
  description: "Sistema de gestión de alquiler de barcos en Ibiza",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "BLACKBOATS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/logo.png",
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="BLACKBOATS" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
