// server.js (ES Module version)
import { createServer } from "https";
import { createServer as createHttpServer } from "http";
import { parse } from "url";
import next from "next";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import { exec } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const config = {
  dev: process.env.NODE_ENV !== "production",
  hostname: "0.0.0.0",
  port: parseInt(process.env.PORT || "443", 10),
  httpPort: parseInt(process.env.HTTP_PORT || "80", 10),
  enableHttpRedirect: true,
  enableRequestLogging: true,
  enableCompression: false,
  turbopack: true,
  autoOpenBrowser: true, // Auto-open browser on startup
  preferredBrowser: null, // null = default, or "chrome", "firefox", "edge"
};

// ─────────────────────────────────────────────────────────────────────────────
// COLORS FOR CONSOLE OUTPUT
// ─────────────────────────────────────────────────────────────────────────────
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }
  return addresses;
}

function getSystemInfo() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpuModel: cpus[0]?.model || "Unknown",
    cpuCores: cpus.length,
    totalMemory: (totalMem / 1024 / 1024 / 1024).toFixed(2) + " GB",
    freeMemory: (freeMem / 1024 / 1024 / 1024).toFixed(2) + " GB",
    uptime: formatUptime(os.uptime()),
  };
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(" ") || "< 1m";
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getTimestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-OPEN BROWSER
// ─────────────────────────────────────────────────────────────────────────────
function openBrowser(url) {
  const platform = os.platform();

  let command;

  // Determine the command based on OS and preferred browser
  if (config.preferredBrowser) {
    const browser = config.preferredBrowser.toLowerCase();

    if (platform === "win32") {
      const browsers = {
        chrome: "start chrome",
        firefox: "start firefox",
        edge: "start msedge",
        brave: "start brave",
        opera: "start opera",
      };
      command = browsers[browser]
        ? `${browsers[browser]} "${url}"`
        : `start "" "${url}"`;
    } else if (platform === "darwin") {
      const browsers = {
        chrome: "Google Chrome",
        firefox: "Firefox",
        safari: "Safari",
        brave: "Brave Browser",
        opera: "Opera",
      };
      command = browsers[browser]
        ? `open -a "${browsers[browser]}" "${url}"`
        : `open "${url}"`;
    } else {
      const browsers = {
        chrome: "google-chrome",
        firefox: "firefox",
        brave: "brave-browser",
        opera: "opera",
      };
      command = browsers[browser]
        ? `${browsers[browser]} "${url}"`
        : `xdg-open "${url}"`;
    }
  } else {
    // Use default browser
    if (platform === "win32") {
      command = `start "" "${url}"`;
    } else if (platform === "darwin") {
      command = `open "${url}"`;
    } else {
      command = `xdg-open "${url}"`;
    }
  }

  exec(command, (err) => {
    if (err) {
      console.log(c("yellow", `    ⚠️  Could not auto-open browser: ${err.message}`));
      console.log(c("dim", `    Please manually open: ${url}\n`));
    } else {
      console.log(c("green", `    ✓ Browser opened automatically\n`));
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST LOGGER
// ─────────────────────────────────────────────────────────────────────────────
function logRequest(req, res, duration) {
  if (!config.enableRequestLogging) return;

  const url = req.url || "";
  if (
    url.includes("/_next/") ||
    url.includes("/__nextjs") ||
    url.includes("/favicon.ico")
  ) {
    return;
  }

  const method = req.method || "GET";
  const statusCode = res.statusCode;

  let statusColor = "green";
  if (statusCode >= 400) statusColor = "red";
  else if (statusCode >= 300) statusColor = "yellow";

  const methodColors = {
    GET: "cyan",
    POST: "green",
    PUT: "yellow",
    DELETE: "red",
    PATCH: "magenta",
  };
  const methodColor = methodColors[method] || "gray";

  console.log(
    `${c("gray", getTimestamp())} ${c(methodColor, method.padEnd(6))} ${c(statusColor, statusCode)} ${c("dim", `${duration}ms`.padStart(6))} ${url}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATE CHECK
// ─────────────────────────────────────────────────────────────────────────────
function checkCertificates() {
  const keyPath = path.join(__dirname, "certs", "localhost.key");
  const certPath = path.join(__dirname, "certs", "localhost.crt");

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error(c("red", "\n❌ SSL certificates not found!\n"));
    console.log("Expected locations:");
    console.log(`   Key:  ${keyPath}`);
    console.log(`   Cert: ${certPath}\n`);
    console.log("Generate them with:\n");
    console.log(
      c("cyan", "   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\")
    );
    console.log(
      c("cyan", "     -keyout certs/localhost.key -out certs/localhost.crt \\")
    );
    console.log(
      c(
        "cyan",
        '     -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"\n'
      )
    );
    process.exit(1);
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT STARTUP BANNER
// ─────────────────────────────────────────────────────────────────────────────
function printBanner(localIPs) {
  const sys = getSystemInfo();

  console.clear();
  console.log(
    c(
      "cyan",
      "\n╔════════════════════════════════════════════════════════════╗"
    )
  );
  console.log(
    c("cyan", "║") +
    c("bright", "              🚀 MOUAU Classmate Dev Server              ") +
    c("cyan", "║")
  );
  console.log(
    c(
      "cyan",
      "╚════════════════════════════════════════════════════════════╝\n"
    )
  );

  // URLs
  console.log(c("bright", " 🌐 Access URLs:\n"));

  // Local URLs
  console.log(c("bright", "    Local:\n"));
  console.log(
    `      ${c("green", "HTTPS:")}      https://localhost${config.port === 443 ? "" : ":" + config.port}`
  );
  if (config.enableHttpRedirect) {
    console.log(
      `      ${c("yellow", "HTTP:")}       http://localhost${config.httpPort === 80 ? "" : ":" + config.httpPort}  ${c("dim", "→ HTTPS")}`
    );
  }

  // Network URLs
  if (localIPs.length > 0) {
    console.log(c("bright", "\n    Network:\n"));
    localIPs.forEach(({ name, address }) => {
      console.log(
        `      ${c("green", "HTTPS:")}      https://${address}${config.port === 443 ? "" : ":" + config.port}  ${c("dim", `(${name})`)}`
      );
      if (config.enableHttpRedirect) {
        console.log(
          `      ${c("yellow", "HTTP:")}       http://${address}${config.httpPort === 80 ? "" : ":" + config.httpPort}  ${c("dim", `→ HTTPS`)}`
        );
      }
    });
  }

  // Mobile Testing
  console.log(c("bright", "\n 📱 Mobile Testing:\n"));
  console.log(
    `    ${c("dim", "Just type the IP in your browser - HTTP auto-redirects to HTTPS")}`
  );
  if (localIPs.length > 0) {
    console.log(
      `    ${c("dim", "Example:")} ${c("cyan", localIPs[0].address)} ${c("dim", "→ auto-redirects to")} ${c("green", `https://${localIPs[0].address}`)}`
    );
  }

  // System Info
  console.log(c("bright", "\n 💻 System Info:\n"));
  console.log(`    ${c("dim", "Platform:")}     ${sys.platform} (${sys.arch})`);
  console.log(`    ${c("dim", "Node:")}         ${sys.nodeVersion}`);
  console.log(`    ${c("dim", "CPU:")}          ${sys.cpuCores} cores`);
  console.log(
    `    ${c("dim", "Memory:")}       ${sys.freeMemory} free / ${sys.totalMemory}`
  );
  console.log(`    ${c("dim", "Uptime:")}       ${sys.uptime}`);

  // Config
  console.log(c("bright", "\n ⚙️  Configuration:\n"));
  console.log(
    `    ${c("dim", "Mode:")}         ${config.dev ? c("yellow", "Development") : c("green", "Production")}`
  );
  console.log(
    `    ${c("dim", "Turbopack:")}    ${config.turbopack ? c("green", "Enabled") : c("gray", "Disabled")}`
  );
  console.log(
    `    ${c("dim", "Logging:")}      ${config.enableRequestLogging ? c("green", "Enabled") : c("gray", "Disabled")}`
  );
  console.log(
    `    ${c("dim", "HTTP→HTTPS:")}   ${config.enableHttpRedirect ? c("green", "Enabled") : c("gray", "Disabled")}`
  );
  console.log(
    `    ${c("dim", "Auto-Open:")}    ${config.autoOpenBrowser ? c("green", "Enabled") : c("gray", "Disabled")}`
  );

  console.log(
    c(
      "cyan",
      "\n────────────────────────────────────────────────────────────────\n"
    )
  );

  // Auto-open browser
  if (config.autoOpenBrowser) {
    const url = `https://localhost${config.port === 443 ? "" : ":" + config.port}`;
    console.log(c("bright", " 🌍 Opening browser...\n"));
    openBrowser(url);
  }

  console.log(c("dim", " Request Log:\n"));
}

// ─────────────────────────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────
function setupGracefulShutdown(httpsServer, httpServer) {
  const shutdown = (signal) => {
    console.log(
      c("yellow", `\n\n⚠️  Received ${signal}, shutting down gracefully...\n`)
    );

    httpsServer.close(() => {
      console.log(c("green", "   ✓ HTTPS server closed"));

      if (httpServer) {
        httpServer.close(() => {
          console.log(c("green", "   ✓ HTTP server closed"));
          console.log(c("green", "\n👋 Goodbye!\n"));
          process.exit(0);
        });
      } else {
        console.log(c("green", "\n👋 Goodbye!\n"));
        process.exit(0);
      }
    });

    setTimeout(() => {
      console.log(c("red", "\n❌ Forced shutdown after timeout\n"));
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SERVER
// ─────────────────────────────────────────────────────────────────────────────
async function startServer() {
  const httpsOptions = checkCertificates();
  const localIPs = getLocalIPs();

  const app = next({
    dev: config.dev,
    hostname: config.hostname,
    port: config.port,
    turbopack: config.turbopack,
  });

  const handle = app.getRequestHandler();

  await app.prepare();

  // HTTPS Server
  const httpsServer = createServer(httpsOptions, async (req, res) => {
    const start = Date.now();

    res.on("finish", () => {
      logRequest(req, res, Date.now() - start);
    });

    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error(c("red", "Server error:"), err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  httpsServer.listen(config.port, config.hostname, () => {
    printBanner(localIPs);
  });

  // HTTP Server (redirect to HTTPS)
  let httpServer = null;
  if (config.enableHttpRedirect) {
    httpServer = createHttpServer((req, res) => {
      const host = req.headers.host?.split(":")[0] || "localhost";
      const httpsPort = config.port === 443 ? "" : `:${config.port}`;
      const redirectUrl = `https://${host}${httpsPort}${req.url}`;

      res.writeHead(301, { Location: redirectUrl });
      res.end();
    });

    httpServer.listen(config.httpPort, config.hostname);
  }

  setupGracefulShutdown(httpsServer, httpServer);
}

// Start the server
startServer().catch((err) => {
  console.error(c("red", "\n❌ Failed to start server:\n"));
  console.error(err);
  process.exit(1);
});