import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Is Beautiful - Wrap Prototype",
  description: "Instagram-style wrap UI prototype",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white">{children}</body>
    </html>
  );
}
