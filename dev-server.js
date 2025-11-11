// server.js
import { createServer } from 'https';
import { createServer as createHttpServer } from 'http';
import next from 'next';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import path from 'path';

// ===== Environment Check =====
if (process.env.NODE_ENV === "production") {
  console.error("❌ server.js is for development use only.");
  process.exit(1);
}

// ===== Load Environment Variables FIRST =====
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("✅ Loaded environment from .env");
} else {
  console.warn("⚠️ .env not found, using system environment variables");
}

// ===== Logging Utilities =====
const logLevels = {
  INFO: '\x1b[36m[INFO]\x1b[0m',
  WARN: '\x1b[33m[WARN]\x1b[0m',
  ERROR: '\x1b[31m[ERROR]\x1b[0m',
  SUCCESS: '\x1b[32m[SUCCESS]\x1b[0m',
  DEBUG: '\x1b[35m[DEBUG]\x1b[0m'
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `${logLevels[level]} ${timestamp}`;

  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// ===== Verify Critical Environment Variables =====
log('INFO', 'Verifying environment variables...');
const requiredEnvVars = ['ENCRYPTION_KEY', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  log('ERROR', `Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

log('SUCCESS', 'All required environment variables are loaded');

// ===== Configuration =====
const dev = process.env.NODE_ENV !== 'production';
const httpPort = process.env.HTTP_PORT || 3001;
const httpsPort = process.env.HTTPS_PORT || 3002;
const certPath = process.env.SSL_CERTIFICATE;
const keyPath = process.env.SSL_KEY;

log('INFO', `Server configuration:`, {
  mode: dev ? 'development' : 'production',
  httpPort,
  httpsPort,
  sslEnabled: !!(certPath && keyPath)
});

const app = next({ dev });
const handle = app.getRequestHandler();

// ===== Request Logging Middleware =====
function createLoggingHandler(handler) {
  return async (req, res) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    // Log incoming request
    log('DEBUG', `Incoming request:`, {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'referer': req.headers['referer']
      },
      timestamp
    });

    // Capture response
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - start;

      // Log response
      log('INFO', `Request completed:`, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      originalEnd.apply(this, args);
    };

    // Handle errors
    res.on('error', (err) => {
      log('ERROR', `Response error:`, {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
      });
    });

    return handler(req, res);
  };
}

// ===== Utility: Get all LAN IPv4 addresses =====
function getLanIPs() {
  try {
    const interfaces = os.networkInterfaces();
    const ips = Object.values(interfaces)
      .flat()
      .filter(i => i.family === 'IPv4' && !i.internal)
      .map(i => i.address)
      .sort();

    log('DEBUG', `Detected LAN IPs: ${ips.join(', ') || 'none'}`);
    return ips;
  } catch (error) {
    log('ERROR', 'Failed to get LAN IPs:', error);
    return [];
  }
}

// ===== Server references =====
let httpServer = null;
let httpsServer = null;
let currentIPs = getLanIPs();
let isRestarting = false;
let restartCount = 0;
let networkMonitorInterval = null;
let isShuttingDown = false;

// ===== Helper: Graceful Restart =====
async function restartServers() {
  if (isRestarting || isShuttingDown) {
    log('DEBUG', 'Restart skipped (already in progress or shutting down)');
    return;
  }

  isRestarting = true;
  restartCount++;

  log('INFO', `🔄 Restarting servers due to network change... (Restart #${restartCount})`);

  // Close servers gracefully
  const closePromises = [];

  if (httpServer) {
    log('INFO', 'Closing HTTP server...');
    closePromises.push(
      new Promise(res => {
        httpServer.close(res);
        httpServer = null;
      })
    );
  }

  if (httpsServer) {
    log('INFO', 'Closing HTTPS server...');
    closePromises.push(
      new Promise(res => {
        httpsServer.close(res);
        httpsServer = null;
      })
    );
  }

  try {
    await Promise.all(closePromises);
    log('SUCCESS', 'All servers closed successfully');
  } catch (error) {
    log('ERROR', 'Error closing servers:', error);
  }

  // Wait a moment to release Next.js dev lock
  await new Promise(res => setTimeout(res, 1500));

  // Remove stale Next.js lock file (only in dev mode)
  if (dev) {
    const lockFile = path.join(process.cwd(), '.next', 'dev', 'lock');
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
        log('SUCCESS', '🧹 Removed stale Next.js lock file');
      } catch (err) {
        log('WARN', `Could not remove .next/dev/lock: ${err.message}`);
      }
    }
  }

  // Restart servers
  try {
    await startServers();
    log('SUCCESS', 'Servers restarted successfully');
  } catch (err) {
    log('ERROR', 'Error restarting servers:', err);
  }

  isRestarting = false;
}

// ===== Start servers =====
async function startServers() {
  try {
    log('INFO', 'Preparing Next.js app...');
    await app.prepare();
    log('SUCCESS', 'Next.js app prepared');

    const loggingHandle = createLoggingHandler(handle);

    // Start HTTP server
    httpServer = createHttpServer(loggingHandle)
      .listen(httpPort, '0.0.0.0', () => {
        log('SUCCESS', `🌐 HTTP server ready on http://localhost:${httpPort}`);
        currentIPs.forEach(ip =>
          log('INFO', `📱 Accessible via LAN: http://${ip}:${httpPort}`)
        );
      });

    httpServer.on('error', (err) => {
      log('ERROR', 'HTTP server error:', err);
    });

    // Start HTTPS server if certificates are available
    if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      try {
        const httpsOptions = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };

        httpsServer = createServer(httpsOptions, loggingHandle)
          .listen(httpsPort, '0.0.0.0', () => {
            log('SUCCESS', `✅ HTTPS server ready on https://localhost:${httpsPort}`);
            currentIPs.forEach(ip =>
              log('INFO', `🔐 Accessible via LAN: https://${ip}:${httpsPort}`)
            );
          });

        httpsServer.on('error', (err) => {
          log('ERROR', 'HTTPS server error:', err);
        });

      } catch (error) {
        log('ERROR', 'Failed to start HTTPS server:', error);
      }
    } else {
      log('WARN', '⚠️ SSL certs missing or invalid. HTTPS server not started');
    }

  } catch (error) {
    log('ERROR', 'Failed to start servers:', error);
    throw error;
  }
}

// ===== Monitor IP changes =====
function watchNetworkChanges(interval = 5000) {
  let debounceTimer = null;
  let lastCheckTime = Date.now();

  log('INFO', `Starting network monitoring (interval: ${interval}ms)`);

  networkMonitorInterval = setInterval(() => {
    // Stop monitoring if shutting down
    if (isShuttingDown) {
      clearInterval(networkMonitorInterval);
      networkMonitorInterval = null;
      log('INFO', 'Network monitoring stopped');
      return;
    }

    const newIPs = getLanIPs();

    // Skip restart if temporarily offline
    if (newIPs.length === 0) {
      log('WARN', 'Network temporarily lost, skipping restart');
      return;
    }

    if (JSON.stringify(newIPs) !== JSON.stringify(currentIPs)) {
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckTime;

      log('INFO', '⚠️ Detected network change:');
      log('INFO', `Old IPs: ${currentIPs.join(', ') || 'none'}`);
      log('INFO', `New IPs: ${newIPs.join(', ') || 'none'}`);
      log('DEBUG', `Time since last check: ${timeSinceLastCheck}ms`);

      currentIPs = newIPs;
      lastCheckTime = now;

      // Debounce restart
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        restartServers().catch(err =>
          log('ERROR', 'Error restarting servers:', err)
        );
      }, 1000);
    } else {
      log('DEBUG', 'Network unchanged');
    }
  }, interval);
}

// ===== Graceful Shutdown =====
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    log('DEBUG', 'Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  log('INFO', `Received ${signal}, shutting down gracefully...`);

  // Stop network monitoring
  if (networkMonitorInterval) {
    clearInterval(networkMonitorInterval);
    networkMonitorInterval = null;
    log('INFO', 'Network monitoring stopped');
  }

  // Close servers
  const closePromises = [];

  if (httpServer) {
    log('INFO', 'Closing HTTP server...');
    closePromises.push(
      new Promise((resolve) => {
        httpServer.close(() => {
          log('SUCCESS', 'HTTP server closed');
          resolve();
        });
      })
    );
  }

  if (httpsServer) {
    log('INFO', 'Closing HTTPS server...');
    closePromises.push(
      new Promise((resolve) => {
        httpsServer.close(() => {
          log('SUCCESS', 'HTTPS server closed');
          resolve();
        });
      })
    );
  }

  try {
    await Promise.all(closePromises);
    log('SUCCESS', 'All servers closed. Goodbye! 👋');
    process.exit(0);
  } catch (error) {
    log('ERROR', 'Error during shutdown:', error);
    process.exit(1);
  }
}

// ===== Error Handling =====
process.on('uncaughtException', (error) => {
  log('ERROR', 'Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', 'Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ===== Start everything =====
log('INFO', 'Starting MOUAU Classmate servers...');
startServers()
  .then(() => {
    log('SUCCESS', '🚀 All servers started successfully');
    log('INFO', `Server restart count: ${restartCount}`);
    watchNetworkChanges(5000); // check every 5 seconds
  })
  .catch(err => {
    log('ERROR', 'Failed to start servers:', err);
    process.exit(1);
  });