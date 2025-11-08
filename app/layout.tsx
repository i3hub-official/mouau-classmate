import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/components/theme-provider";
import { InternetConnectionProvider } from "@/app/providers/internet-connection-provider";
import { OfflineBanner } from "@/app/components/offline-banner";
import { ServiceWorkerRegister } from "@/app/components/service-worker-register";

// 🆒 Academic + modern font
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// =========================
// 📱 PWA + SEO Metadata
// =========================
export const metadata: Metadata = {
  title: "MOUAU Classmate - Learning Management System",
  description:
    "A modern academic management platform connecting students and lecturers at MOUAU. Streamline coursework, materials, and collaboration seamlessly.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16" },
      { url: "/favicon-32x32.png", sizes: "32x32" },
      { url: "/android/android-launchericon-192-192.png", sizes: "192x192" },
      { url: "/android/android-launchericon-512-512.png", sizes: "512x512" },
    ],
    apple: [
      { url: "/ios/ios-icon-180.png", sizes: "180x180" },
      { url: "/ios/ios-icon-167.png", sizes: "167x167" },
      { url: "/ios/ios-icon-152.png", sizes: "152x152" },
    ],
    other: [{ rel: "mask-icon", url: "/favicon-32x32.png", color: "#FFF600" }],
  },

  openGraph: {
    title: "MOUAU Classmate - Learning Management System",
    description:
      "Your digital classroom for MOUAU. Learn, collaborate, and stay organized anywhere.",
    url: "https://mouaucm.vercel.app",
    siteName: "MOUAU Classmate",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MOUAU Classmate - Modern Learning Platform",
      },
    ],
    type: "website",
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "MOUAU Classmate - Learning Management System",
    description:
      "A seamless platform for MOUAU students and lecturers — modern, fast, and collaborative.",
    images: ["/og-image.png"],
  },

  keywords: [
    "MOUAU",
    "Learning Management System",
    "LMS",
    "student portal",
    "university education",
    "classroom collaboration",
    "academic resources",
    "MOUAU Classmate",
  ],

  authors: [{ name: "MOUAU Classmate Team" }],
  category: "education",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MOUAU Classmate",
  },
};

// 🖼️ Theme Color (used by browsers + PWA UI)
export const viewport: Viewport = {
  themeColor: "#FFF600",
};

// =========================
// 🧩 Root Layout Component
// =========================
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apple Touch Icons */}
        <link
          rel="apple-touch-icon-precomposed"
          sizes="180x180"
          href="/ios/ios-icon-180.png"
        />

        {/* Microsoft-specific */}
        <meta name="msapplication-TileColor" content="#FFF600" />
        <meta
          name="msapplication-TileImage"
          content="/windows11/Square150x150Logo.scale-100.png"
        />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* PWA Meta */}
        <meta name="theme-color" content="#FFF600" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MOUAU Classmate" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Prevent white flash on dark mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem("theme");
                  if (theme === "dark") {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${poppins.variable} antialiased bg-background text-foreground min-h-screen`}
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="mouau-cm-theme"
          disableTransitionOnChange={false}
        >
          <InternetConnectionProvider>
            <ServiceWorkerRegister />
            <OfflineBanner />
            <main>{children}</main>
          </InternetConnectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
