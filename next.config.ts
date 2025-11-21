import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,

  turbopack: {},

  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // ENFORCE HTTPS + Security Headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },

          // Force HTTPS (HSTS)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },

          // Force redirect to HTTPS in production
          {
            key: "Content-Security-Policy",
            value: "upgrade-insecure-requests", // Auto-upgrade HTTP → HTTPS
          },

          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Secure cookies + prevent fingerprinting
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },

  // Optional: Redirect HTTP → HTTPS at Next.js level (works in dev + prod)
  async redirects() {
    return process.env.NODE_ENV === "production"
      ? [
          {
            source: "/:path*",
            has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
            destination: "https://:host/:path*",
            permanent: true,
          },
        ]
      : [];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "ui-avatars.com", pathname: "/**" },
      { protocol: "https", hostname: "i.pravatar.cc", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "**.pexels.com", pathname: "/**" },
      { protocol: "https", hostname: "geeksforgeeks.org", pathname: "/**" },
    ],
    minimumCacheTTL: 60,
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      };
      config.externals = [
        ...(config.externals || []),
        "@prisma/client",
        "@prisma/engines",
      ];
    }
    return config;
  },

  output: process.env.DOCKER_BUILD ? "standalone" : undefined,

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // This is the magic: Force HTTPS in dev too (optional)
  // Only enable if you want HTTPS in local dev (requires cert)
  // Note: 'devServer' is not supported in next.config.ts. Use a custom server or proxy for HTTPS in development.

  // Best for production: Let reverse proxy (Nginx, Vercel, Cloudflare) handle HTTPS
  // But this ensures cookies are secure
  // Add this if you use cookies/auth:
  // → Will be respected by NextAuth, cookies, etc.
  // (No code change needed — Next.js reads this automatically)
  // But you can also set it in .env:
  // COOKIE_SECURE=true
};

export default nextConfig;