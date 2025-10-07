import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Vows Social - Wedding Venue Marketplace",
  description: "Discover and book your perfect wedding venue",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
