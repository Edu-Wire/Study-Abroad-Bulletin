import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://studyabroadintelligence.com"),
  title: {
    default: "Study Abroad Intelligence — Universities, Scholarships & Visa News",
    template: "%s | Study Abroad Intelligence",
  },
  description:
    "Discover universities, scholarships, visa updates and the latest study-abroad news for international students — all in one editorial platform.",
  authors: [{ name: "Study Abroad Intelligence" }],
  openGraph: {
    type: "website",
    siteName: "Study Abroad Intelligence",
    title: "Study Abroad Intelligence — Universities, Scholarships & Visa News",
    description:
      "Discover universities, scholarships, visa updates and the latest study-abroad news for international students.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Study Abroad Intelligence",
    description:
      "Universities, scholarships, visa updates and study-abroad news for international students.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakartaSans.variable}`}
    >
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
