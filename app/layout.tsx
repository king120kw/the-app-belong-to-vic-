import type { Metadata } from "next";
import { GlobalProviders } from "@/components/GlobalProviders";
import "./global.css";

export const metadata: Metadata = {
  title: "VicCalary",
  description: "AI-powered nutrition tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.lordicon.com/lordicon.js" async />
      </head>
      <body>
        <GlobalProviders>{children}</GlobalProviders>
      </body>
    </html>
  );
}
