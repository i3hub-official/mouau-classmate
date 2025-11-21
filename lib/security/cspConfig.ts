// src/lib/security/cspConfig.ts

// Common sources that are allowed in both dev and prod
const commonSources = {
  // External domains
  external: [
    "https://cecportal.vercel.app",
    "https://cecms.vercel.app",
    "https://apinigeria.vercel.app",
    "https://checkmyninbvn.com.ng/api",
    "https://res.cloudinary.com",
    "https://*.cloudinary.com/",
  ],

  // Analytics and third-party services
  analytics: [
    "https://www.google-analytics.com",
    "https://stats.g.doubleclick.net",
    "https://apis.google.com",
    "https://www.googletagmanager.com",
  ],

  // CDN and media services
  media: [
    "https://ui-avatars.com",
    "https://placehold.co",
    "https://res.cloudinary.com",
    "https://*.cloudinary.com/",
    "https://*.pravatar.cc",
    "https://i.pravatar.cc",
  ],

  // Fonts
  fonts: ["https://fonts.googleapis.com", "https://fonts.gstatic.com"],

  // IP detection services
  ipDetection: [
    "https://api.ipify.org",
    "https://api.my-ip.io",
    "https://ipecho.net",
    "https://ident.me",
    "https://icanhazip.com",
  ],
};

// Development-only sources (LAN IPs and localhost)
const devOnlySources = {
  local: [
    "https://localhost",
    "http://localhost",
    "https://127.0.0.1",
    "http://127.0.0.1",
    "https://192.168.0.159",
    "http://192.168.0.159",
  ],

  webSockets: [
    "ws://localhost:*",
    "ws://127.0.0.1:*",
    "ws://192.168.0.159:*",
    "wss://localhost:*",
    "wss://127.0.0.1:*",
    "wss://192.168.0.159:*",
  ],
};

const baseConfig = {
  // Default source for everything
  defaultSrc: ["'self'", "blob:", ...commonSources.external],

  // JavaScript sources
  scriptSrc: [
    "'self'",
    "'report-sample'",
    "blob:",
    ...commonSources.external,
    ...commonSources.analytics,
  ],

  // Stylesheets
  styleSrc: [
    "'self'",
    "'unsafe-inline'", // Tailwind requires this
    "blob:",
    ...commonSources.fonts,
    ...commonSources.external,
  ],

  // Images
  imgSrc: [
    "'self'",
    "data:",
    "blob:",
    ...commonSources.external,
    ...commonSources.media,
    ...commonSources.analytics,
  ],

  // Fonts
  fontSrc: [
    "'self'",
    "data:",
    "blob:",
    ...commonSources.fonts,
    ...commonSources.external,
  ],

  // Connections
  connectSrc: [
    "'self'",
    "blob:",
    ...commonSources.external,
    ...commonSources.analytics,
    ...commonSources.ipDetection,
  ],

  // Media
  mediaSrc: ["'self'", "blob:", "data:", ...commonSources.external],

  // Frames
  frameSrc: ["'self'", "blob:", ...commonSources.external],

  // Objects
  objectSrc: ["'none'"],

  // Base URI
  baseUri: ["'self'"],

  // Form actions
  formAction: ["'self'", ...commonSources.external],

  // Security directives
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: [],
  blockAllMixedContent: [],

  // Reporting
  reportUri: ["/api/csp-violation-report"],
};

// Development config with LAN IPs and unsafe directives
export const devCspConfig = {
  ...baseConfig,
  defaultSrc: [...baseConfig.defaultSrc, ...devOnlySources.local],
  scriptSrc: [
    ...baseConfig.scriptSrc,
    ...devOnlySources.local,
    "'unsafe-inline'", // Needed for Tailwind in dev
    "'unsafe-eval'", // Needed for Next.js in dev
  ],
  styleSrc: [...baseConfig.styleSrc, ...devOnlySources.local],
  imgSrc: [...baseConfig.imgSrc, ...devOnlySources.local],
  fontSrc: [...baseConfig.fontSrc, ...devOnlySources.local],
  connectSrc: [
    ...baseConfig.connectSrc,
    ...devOnlySources.local,
    ...devOnlySources.webSockets,
  ],
  mediaSrc: [...baseConfig.mediaSrc, ...devOnlySources.local],
  frameSrc: [...baseConfig.frameSrc, ...devOnlySources.local],
};

// Production config - no LAN IPs, only public domains
export const prodCspConfig = {
  ...baseConfig,
  scriptSrc: [
    ...baseConfig.scriptSrc.filter((src) => !src.includes("unsafe")),
    "https://vercel.live",
    "https://*.vercel.app",
  ],
  connectSrc: [
    ...baseConfig.connectSrc,
    "https://vercel.live",
    "wss://vercel.live",
  ],
};

// Pick config by environment
export const getCspConfig = () => {
  return process.env.NODE_ENV === "production" ? prodCspConfig : devCspConfig;
};

// Helper to check if we're in development
export const isDevelopment = () => process.env.NODE_ENV === "development";
