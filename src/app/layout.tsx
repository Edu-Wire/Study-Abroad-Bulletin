import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

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
  icons: {
    icon: [
      { url: "/logo/ab-logo.png", type: "image/png" },
    ],
    shortcut: "/logo/ab-logo.png",
    apple: "/logo/ab-logo.png",
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
      <head>
        {/* Google Tag Manager */}
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WR9G9NR2');`,
          }}
        />
        {/* End Google Tag Manager */}
      </head>
      <body className="min-h-screen bg-background antialiased">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WR9G9NR2"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {children}
      </body>
    </html>
  );
}



//