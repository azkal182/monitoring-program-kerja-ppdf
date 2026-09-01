import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ConfirmationProvider } from "@/contexts/confirmation-context";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monitoring Program Kerja",
  description: "Aplikasi monitoring program kerja berbasis bukti dan terukur",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", rel: "icon" },
      { url: "/favicon.svg?v=2", rel: "icon", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="MPK" />
        <meta name="application-name" content="MPK" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </head>
      <body className={`${fontSans.variable} font-sans antialiased bg-muted/20`}>
        <Providers>
          <ConfirmationProvider>{children}</ConfirmationProvider>
        </Providers>
      </body>
    </html>
  );
}
