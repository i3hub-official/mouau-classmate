// src/lib/security/cspConfig.ts

export const cspConfig = {
  // Default source for everything
  defaultSrc: [
    "'self'",
    "blob:",
    "https://cecportal.vercel.app",
    "https://cecms.vercel.app",
    "https://apinigeria.vercel.app",
    "https://localhost",
    "http://localhost",
    "https://127.0.0.1",
    "http://127.0.0.1",
    "https://192.168.0.159",
    "http://192.168.0.159",
  ],

  // JavaScript sources
  scriptSrc: [
    "'self'",
    "'report-sample'",
    "blob:",
    "https://mouauclassmate.vercel.app",
    "https://apinigeria.vercel.app",
    "https://localhost",
    "http://localhost",
    "https://127.0.0.1",
    "http://127.0.0.1",
    "https://192.168.0.159",
    "http://192.168.0.159",
    "'unsafe-inline'", // Needed for Tailwind in dev
    "'unsafe-eval'", // Needed for Next.js in dev
    "https://apis.google.com",
    "https://www.googletagmanager.com",
  ],

  // Stylesheets
  styleSrc: [
    "'self'",
    "'unsafe-inline'", // Tailwind requires this
    "blob:",
    "https://fonts.googleapis.com",
    "https://mouauclassmate.vercel.app",
    "https://apinigeria.vercel.app",
    "https://localhost",
    "http://localhost",
    "https://127.0.0.1",
    "http://127.0.0.1",
    "https://192.168.0.159",
    "http://192.168.0.159",
  ],

  // Images
  imgSrc: [
    "'self'",
    "data:",
    "blob:",
    "https://mouauclassmate.vercel.app",
    "https://apinigeria.vercel.app",
    "https://ui-avatars.com",
    "https://placehold.co",
    "https://res.cloudinary.com",
    "https://*.cloudinary.com/",
    "https://*.pravatar.cc",
    "https://i.pravatar.cc",
    "https://localhost",
    "http://localhost",
    "https://127.0.0.1",
    "http://127.0.0.1",
    "https://192.168.0.159",
    "http://192.168.0.159",
    "https://www.google-analytics.com",
    "https://stats.g.doubleclick.net",
  ],

  // Fonts
  fontSrc: [
    "'self'",
    "data:",
    "blob:",
    "https://fonts.gstatic.com",
    "https://mouauclassmate.vercel.app",
    "https://apinigeria.vercel.app",
    "https://localhost",
    "http://localhost",
    "https://127.0.0.1",
    "http://127.0.0.1",
    "https://192.168.0.159",
    "http://192.168.0.159",
  ],

  // Connections
  connectSrc: [
    "'self'",
    "blob:",
    "https://mouauclassmate.vercel.app",
    "https://apinigeria.vercel.app",
    "https://localhost",
    "http://localhost",
    "https://127.0.0.1",
    "http://127.0.0.1",
    "https://192.168.0.159",
    "http://192.168.0.159",
    "ws://localhost:*",
    "ws://127.0.0.1:*",
    "ws://192.168.0.159:*",
    "wss://localhost:*",
    "wss://127.0.0.1:*",
    "wss://192.168.0.159:*",
    "https://www.google-analytics.com",
    "https://stats.g.doubleclick.net",

    // External IP APIs
    "https://api.ipify.org",
    "https://api.my-ip.io",
    "https://ipecho.net",
    "https://ident.me",
    "https://icanhazip.com",
  ],

  // Media
  mediaSrc: [
    "'self'",
    "blob:",
    "data:",
    "https://mouauclassmate.vercel.app",
    "https://apinigeria.vercel.app",
    "https://localhost",
    "http://localhost",
    "https://127.0.0.1",
    "http://127.0.0.1",
    "https://192.168.0.159",
    "http://192.168.0.159",
  ],

  // Frames
  frameSrc: [
    "'self'",
    "blob:",
    "https://mouauclassmate.vercel.app",
    "https://apinigeria.vercel.app",
    "https://localhost",
    "http://localhost",
    "https://127.0.0.1",
    "http://127.0.0.1",
    "https://192.168.0.159",
    "http://192.168.0.159",
  ],

  // Objects
  objectSrc: ["'none'"],

  // Base URI
  baseUri: ["'self'"],

  // Form actions
  formAction: [
    "'self'",
    "https://mouauclassmate.vercel.app",
    "https://apinigeria.vercel.app",
  ],

  // Security directives (✅ empty arrays instead of booleans)
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: [],
  blockAllMixedContent: [],

  // Reporting
  reportUri: ["/api/csp-violation-report"],
};

// Looser config for development
export const devCspConfig = {
  ...cspConfig,
  scriptSrc: [...cspConfig.scriptSrc, "'unsafe-inline'", "'unsafe-eval'"],
};

// Stricter config for production
export const prodCspConfig = {
  ...cspConfig,
  scriptSrc: [
    ...cspConfig.scriptSrc,
    "'unsafe-inline'", // required for hydration unless you add nonces
    "'unsafe-eval'", // required by Next.js dev/runtime
    "https://vercel.live",
    "https://*.vercel.app",
    "https://mouauclassmate.vercel.app",
  ],
  connectSrc: [
    ...cspConfig.connectSrc,
    "https://vercel.live",
    "wss://vercel.live",
    "https://mouauclassmate.vercel.app",
  ],
};

// Pick config by environment
export const getCspConfig = () => {
  return process.env.NODE_ENV === "production" ? prodCspConfig : devCspConfig;
};
