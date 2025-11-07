import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/components/theme-provider";

// 🆒 Cool academic font (modern + legible)
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
    "A modern learning management platform connecting students and lecturers at MOUAU. Streamline coursework, materials, and collaboration securely and efficiently.",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/android-icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",

  openGraph: {
    title: "MOUAU Classmate - Learning Management System",
    description:
      "Your digital classroom for Physics and beyond. Stay connected, organized, and engaged at MOUAU.",
    url: "https://mouau-classmate.vercel.app",
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
      "A seamless platform connecting students and lecturers for physics education and academic collaboration.",
    images: ["/og-image.png"],
  },

  keywords: [
    "MOUAU",
    "learning management system",
    "LMS",
    "student portal",
    "academic resources",
    "university education",
    "classroom collaboration",
    "physics education",
  ].join(", "),

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
  themeColor: "#FFF600", // main MOUAU accent color
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
        {/* Apple touch icons */}
        <link
          rel="apple-touch-icon-precomposed"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />

        {/* Microsoft-specific */}
        <meta name="msapplication-TileColor" content="#FFF600" />
        <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
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
          {/* Main Content */}
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
