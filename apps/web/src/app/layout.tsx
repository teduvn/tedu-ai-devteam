import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TEDU AI Dev Team",
  description: "Automate SDLC from Jira to GitHub PRs with multi-agent AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
