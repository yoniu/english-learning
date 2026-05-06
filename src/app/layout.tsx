import type { Metadata } from "next";
import Script from "next/script";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Spelling AI",
  description: "AI-powered English phrase and sentence spelling practice.",
  icons: {
    icon: [{ url: "/new-logo.png", type: "image/png" }],
    shortcut: "/new-logo.png",
    apple: "/new-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var mode = localStorage.getItem("english-learning.themeMode") || "system";
                var resolved = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
                document.documentElement.dataset.themeMode = mode;
                document.documentElement.dataset.theme = resolved;
              } catch (_) {}
            })();
          `}
        </Script>
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
