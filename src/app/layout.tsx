import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI English Spelling",
  description: "AI-powered English phrase and sentence spelling practice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
