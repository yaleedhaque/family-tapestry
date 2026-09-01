import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Providers from "@/components/Providers";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://family-tapestry-nine.vercel.app"),
  title: {
    default: "Family Tapestry | Digital Family Tree Builder",
    template: "%s | Family Tapestry",
  },
  description:
    "Build and preserve your family history with Family Tapestry — a collaborative, graph-based web app that visualizes your family's entire ancestry as an interactive, living tapestry.",
  keywords: [
    "family tree",
    "family history",
    "genealogy",
    "ancestry",
    "family tapestry",
    "family tree builder",
    "interactive family tree",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://family-tapestry-nine.vercel.app",
    siteName: "Family Tapestry",
    title: "Family Tapestry | Digital Family Tree Builder",
    description:
      "Build and preserve your family history with Family Tapestry — an interactive, living tapestry of your entire ancestry.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Family Tapestry | Digital Family Tree Builder",
    description:
      "Build and preserve your family history with Family Tapestry.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Family Tapestry",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#16130F" },
    { media: "(prefers-color-scheme: light)", color: "#F5F0E8" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
