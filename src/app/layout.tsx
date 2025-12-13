import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TimeDesk",
  description: "TimeDesk is a comprehensive, role-based attendance and leave management system designed for modern organizations. Seamlessly manage attendance, leaves, and reporting for Employees, Managers, HR, and Admins.",
  manifest: "/manifest.json",
  icons: {
    icon: "/timedesk-icon.png",
    shortcut: "/timedesk-icon.png",
    apple: "/timedesk-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TimeDesk",
    startupImage: ["/timedesk-logo.png"],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://timedesk.app/",
    title: "TimeDesk - Smart Attendance. Seamless Workflow.",
    description: "Effortlessly manage attendance, leaves, and reporting for your entire organization.",
    siteName: "TimeDesk",
    images: [
      {
        url: "/timedesk-logo.png",
        width: 800,
        height: 600,
        alt: "TimeDesk Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "TimeDesk",
    description: "Smart Attendance. Seamless Workflow.",
    images: ["/timedesk-logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
