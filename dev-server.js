// server.js
// Development-friendly custom Next.js server with robust graceful shutdown
// Usage: NODE_ENV=development node server.js
// (In production, don't use this custom dev server file.)

import { createServer as createHttpsServer } from "https";
import { createServer as createHttpServer } from "http";
import next from "next";
import fs from "fs";
import os from "os";
import path from "path";
import dotenv from "dotenv";
import { exec } from "child_process";

// ==============================
// Basic environment setup
// ==============================
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("[INFO] Loaded .env");
} else {
  console.log("[WARN] .env not found, relying on environment variables");
}

if (process.env.NODE_ENV === "production") {
  console.error("[ERROR] server.js is intended for development only.");
  process.exit(1);
}

const dev = process.env.NODE_ENV !== "production";
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "3001", 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || "3002", 10);
const CERT_PATH = process.env.SSL_CERTIFICATE || "";
const KEY_PATH = process.env.SSL_KEY || "";
const FORCE_KILL_NODE = process.env.FORCE_KILL_NODE === "true"; // opt-in

// ==============================
// Logging helpers
// ==============================
const colors = {
  RESET: "\x1b[0m",
  CYAN: "\x1b[36m",
  YELLOW: "\x1b[33m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  MAG: "\x1b[35m",
};

function log(level, message, meta) {
  const now = new Date().toISOString();
  const prefix = {
    INFO: `${colors.CYAN}[INFO]${colors.RESET}`,
    WARN: `${colors.YELLOW}[WARN]${colors.RESET}`,
    ERROR: `${colors.RED}[ERROR]${colors.RESET}`,
    SUCCESS: `${colors.GREEN}[SUCCESS]${colors.RESET}`,
    DEBUG: `${colors.MAG}[DEBUG]${colors.RESET}`,
  }[level] || `[${level}]`;

  if (meta !== undefined) {
    try {
      console.log(`${prefix} ${now} - ${message}`, meta);
    } catch {
      console.log(`${prefix} ${now} - ${message} (meta unprintable)`);
    }
  } else {
    console.log(`${prefix} ${now} - ${message}`);
  }
}

// ==============================
// Utility: get LAN IPv4 addresses
// ==============================
function getLanIPs() {
  try {
    const interfaces = os.networkInterfaces();
    return Object.values(interfaces)
      .flat()
      .filter((i) => i && i.family === "IPv4" && !i.internal)
      .map((i) => i.address)
      .sort();
  } catch (err) {
    log("ERROR", "Failed to enumerate network interfaces", err);
    return [];
  }
}

// ==============================
// Next.js app setup
// ==============================
const app = next({ dev });
const handle = app.getRequestHandler();

// ==============================
// Server state
// ==============================
let httpServer = null;
let httpsServer = null;
let networkMonitorInterval = null;
let currentIPs = getLanIPs();
let isRestarting = false;
let isShuttingDown = false;
const activeSockets = new Set(); // track sockets to force destroy if needed

// ==============================
// Connection tracking helpers
// ==============================
function trackServerConnections(server, serverName) {
  if (!server) return;
  server.on("connection", (socket) => {
    activeSockets.add(socket);
    socket.on("close", () => activeSockets.delete(socket));
  });

  server.on("close", () => {
    log("INFO", `${serverName} closed - clearing any tracked sockets for it`);
  });

  server.on("error", (err) => {
    log("ERROR", `${serverName} encountered an error`, err);
  });
}

function destroyTrackedSockets() {
  if (activeSockets.size === 0) return;
  log("WARN", `Destroying ${activeSockets.size} tracked sockets to allow process exit`);
  for (const s of Array.from(activeSockets)) {
    try {
      // unref/destroy to break the event loop
      s.destroy();
    } catch (e) {
      // ignore per-socket errors
    } finally {
      activeSockets.delete(s);
    }
  }
}

// ==============================
// Graceful close with timeout
// ==============================
function forceCloseServer(server, name, timeout = 2500) {
  return new Promise((resolve) => {
    if (!server) {
      log("DEBUG", `${name} not running`);
      return resolve();
    }

    let finished = false;

    server.close((err) => {
      if (finished) return;
      finished = true;
      if (err) log("ERROR", `${name} close error`, err);
      else log("SUCCESS", `${name} closed gracefully`);
      resolve();
    });

    // Failsafe timeout to avoid hanging forever
    setTimeout(() => {
      if (finished) return;
      finished = true;
      try {
        // attempt to close underlying handles by destroying sockets
        destroyTrackedSockets();
      } catch (e) {
        log("WARN", `Error while force-destroying sockets for ${name}`, e);
      }
      log("WARN", `${name} close timed out; proceeding`);
      resolve();
    }, timeout);
  });
}

// ==============================
// Optional: kill leftover node processes (Windows)
// Only invoked when explicitly enabled via FORCE_KILL_NODE=true
// ==============================
function killLeftoverNodeProcesses() {
  if (!FORCE_KILL_NODE) {
    log("DEBUG", "FORCE_KILL_NODE not set — skipping force kill of node processes");
    return;
  }
  if (process.platform === "win32") {
    log("WARN", "FORCE_KILL_NODE enabled — will run `taskkill /F /IM node.exe /T` (Windows)");
    exec("taskkill /F /IM node.exe /T", (err, stdout, stderr) => {
      if (err) {
        log("ERROR", "taskkill returned an error", { err: err.message, stderr });
      } else {
        log("SUCCESS", "Ran taskkill to clean leftover node processes", stdout.trim());
      }
    });
  } else {
    log("WARN", "FORCE_KILL_NODE only implemented for Windows in this script");
  }
}

// ==============================
// Remove Next.js dev lockfile (dev mode only)
// ==============================
function removeNextLock() {
  if (!dev) return;
  try {
    const lockPath = path.join(process.cwd(), ".next", "dev", "lock");
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      log("SUCCESS", "Removed .next/dev/lock");
    } else {
      log("DEBUG", "No Next.js lockfile present");
    }
  } catch (e) {
    log("WARN", "Failed to remove .next/dev/lock (it might be held by a process)", e.message);
  }
}

// ==============================
// Request logging wrapper
// ==============================
function createLoggingHandler(handler) {
  return async (req, res) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    log("DEBUG", "Incoming request", {
      method: req.method,
      url: req.url,
      timestamp,
      "user-agent": req.headers["user-agent"],
    });

    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - start;
      log("INFO", "Request completed", {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
      return originalEnd.apply(this, args);
    };

    // safety: catch response errors
    res.on("error", (err) => {
      log("ERROR", "Response error", { error: err?.message || err });
    });

    return handler(req, res);
  };
}

// ==============================
// Start servers
// ==============================
async function startServers() {
  log("INFO", "Preparing Next.js app...");
  await app.prepare();
  log("SUCCESS", "Next.js prepared");

  const loggingHandle = createLoggingHandler(handle);

  // HTTP server
  httpServer = createHttpServer(loggingHandle);
  trackServerConnections(httpServer, "HTTP server");

  httpServer.listen(HTTP_PORT, "0.0.0.0", () => {
    log("SUCCESS", `HTTP server listening on http://localhost:${HTTP_PORT}`);
    const ips = currentIPs.length ? currentIPs : getLanIPs();
    ips.forEach((ip) => log("INFO", `Accessible via LAN: http://${ip}:${HTTP_PORT}`));
  });

  httpServer.on("error", (err) => {
    log("ERROR", "HTTP server error", err);
  });

  // HTTPS server (optional)
  if (CERT_PATH && KEY_PATH && fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
    try {
      const httpsOptions = {
        key: fs.readFileSync(KEY_PATH),
        cert: fs.readFileSync(CERT_PATH),
      };
      httpsServer = createHttpsServer(httpsOptions, loggingHandle);
      trackServerConnections(httpsServer, "HTTPS server");

      httpsServer.listen(HTTPS_PORT, "0.0.0.0", () => {
        log("SUCCESS", `HTTPS server listening on https://localhost:${HTTPS_PORT}`);
        const ips = currentIPs.length ? currentIPs : getLanIPs();
        ips.forEach((ip) => log("INFO", `Accessible via LAN: https://${ip}:${HTTPS_PORT}`));
      });

      httpsServer.on("error", (err) => {
        log("ERROR", "HTTPS server error", err);
      });
    } catch (e) {
      log("ERROR", "Failed to start HTTPS server", e);
    }
  } else {
    log("WARN", "SSL certificate or key missing — HTTPS server not started");
  }
}

// ==============================
// Restart helper (on IP changes)
// ==============================
async function restartServers() {
  if (isRestarting || isShuttingDown) {
    log("DEBUG", "Restart skipped (already restarting or shutting down)");
    return;
  }
  isRestarting = true;
  log("INFO", "Restarting servers due to network change...");

  await forceCloseServer(httpServer, "HTTP server");
  await forceCloseServer(httpsServer, "HTTPS server");

  httpServer = null;
  httpsServer = null;

  // small delay for OS to release ports
  await new Promise((r) => setTimeout(r, 1000));

  // clear tracked sockets in case
  destroyTrackedSockets();

  // remove Next lock just in case (dev)
  removeNextLock();

  // restart
  try {
    await startServers();
    log("SUCCESS", "Servers restarted");
  } catch (e) {
    log("ERROR", "Failed to restart servers", e);
  } finally {
    isRestarting = false;
  }
}

// ==============================
// Network watcher
// ==============================
function watchNetworkChanges(interval = 5000) {
  let debounce = null;
  networkMonitorInterval = setInterval(() => {
    if (isShuttingDown) {
      clearInterval(networkMonitorInterval);
      networkMonitorInterval = null;
      return;
    }
    const newIPs = getLanIPs();
    if (newIPs.length === 0) {
      log("WARN", "No LAN addresses detected — skipping restart");
      return;
    }
    if (JSON.stringify(newIPs) !== JSON.stringify(currentIPs)) {
      log("INFO", "Network change detected", { old: currentIPs, new: newIPs });
      currentIPs = newIPs;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        restartServers().catch((err) => log("ERROR", "Restart error", err));
      }, 1000);
    }
  }, interval);
}

// ==============================
// Graceful shutdown
// ==============================
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    log("DEBUG", "Shutdown already in progress");
    return;
  }
  isShuttingDown = true;
  log("INFO", `Received ${signal}. Beginning graceful shutdown...`);

  // Immediately stop network watcher
  if (networkMonitorInterval) {
    clearInterval(networkMonitorInterval);
    networkMonitorInterval = null;
    log("INFO", "Network monitor stopped");
  }

  // Attempt to call Next.js app.close() if available (helps dev server release watchers)
  try {
    if (typeof app.close === "function") {
      log("INFO", "Calling app.close() on Next.js (if implemented)");
      await app.close();
      log("SUCCESS", "app.close() completed");
    } else {
      log("DEBUG", "app.close() not available on this Next.js version");
    }
  } catch (e) {
    log("WARN", "app.close() threw an error (continuing shutdown)", e.message);
  }

  // Close HTTP/HTTPS servers gracefully with timeout
  await forceCloseServer(httpServer, "HTTP server");
  await forceCloseServer(httpsServer, "HTTPS server");

  httpServer = null;
  httpsServer = null;

  // Destroy any remaining sockets to ensure Node can exit
  destroyTrackedSockets();

  // Remove Next lock file (dev only)
  removeNextLock();

  // Optional: force kill node child processes on Windows (opt-in)
  if (FORCE_KILL_NODE) {
    killLeftoverNodeProcesses();
  }

  log("SUCCESS", "Shutdown complete — exiting process.");
  // give logs a moment then exit
  setTimeout(() => process.exit(0), 50);
}

// ==============================
// Process event handlers
// ==============================
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  log("ERROR", "Uncaught exception", err);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  log("ERROR", "Unhandled rejection", reason);
  gracefulShutdown("unhandledRejection");
});

// ==============================
// Start everything
// ==============================
log("INFO", "Starting custom Next.js development server...");
startServers()
  .then(() => {
    log("SUCCESS", "Servers started");
    watchNetworkChanges(5000);
  })
  .catch((err) => {
    log("ERROR", "Failed to start servers", err);
    // attempt a deterministic shutdown path
    gracefulShutdown("startup-failure").catch(() => process.exit(1));
  });
