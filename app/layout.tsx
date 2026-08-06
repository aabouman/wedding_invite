import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sophie & Alex | Save the Date",
  description:
    "Open a hand-drawn save-the-date invitation from Sophie and Alex.",
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
