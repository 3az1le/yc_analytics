import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YC Companies Analytics",
  description: "Analytics dashboard for Y Combinator companies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
