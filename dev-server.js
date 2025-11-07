import { createServer } from 'https';
import { createServer as createHttpServer } from 'http';
import next from 'next';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import path from 'path';

// ===== Load environment variables =====
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env')
];

envPaths.forEach(envPath => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

const dev = process.env.NODE_ENV !== 'production';
const httpPort = 3001;
const httpsPort = 3002;
const certPath = process.env.SSL_CERTIFICATE;
const keyPath = process.env.SSL_KEY;

const app = next({
  dev,
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
  },
});

const handle = app.getRequestHandler();

// ===== Utility: Get all LAN IPv4 addresses =====
function getLanIPs() {
  const interfaces = os.networkInterfaces();
  return Object.values(interfaces)
    .flat()
    .filter(i => i.family === 'IPv4' && !i.internal)
    .map(i => i.address)
    .sort();
}

// ===== Server references =====
let httpServer = null;
let httpsServer = null;
let currentIPs = getLanIPs();
let isRestarting = false;

// ===== Helper: Graceful Restart =====
async function restartServers() {
  if (isRestarting) return;
  isRestarting = true;

  console.log('🔄 Restarting servers due to network change...');

  // Close servers gracefully
  if (httpServer) {
    await new Promise(res => httpServer.close(res));
    httpServer = null;
  }
  if (httpsServer) {
    await new Promise(res => httpsServer.close(res));
    httpsServer = null;
  }

  // Wait a moment to release Next.js dev lock
  await new Promise(res => setTimeout(res, 1500));

  // Remove stale Next.js lock file (only in dev mode)
  if (dev) {
    const lockFile = path.join(process.cwd(), '.next', 'dev', 'lock');
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
        console.log('🧹 Removed stale Next.js lock file.');
      } catch (err) {
        console.warn('⚠️ Could not remove .next/dev/lock:', err.message);
      }
    }
  }

  // Restart servers
  await startServers().catch(err => console.error('Error restarting servers:', err));

  isRestarting = false;
}

// ===== Start servers =====
async function startServers() {
  await app.prepare();

  httpServer = createHttpServer((req, res) => handle(req, res))
    .listen(httpPort, '0.0.0.0', () => {
      console.log(`> 🌐 HTTP server ready on http://localhost:${httpPort}`);
      currentIPs.forEach(ip =>
        console.log(`> 📱 Accessible via LAN: http://${ip}:${httpPort}`)
      );
    });

  if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    httpsServer = createServer(httpsOptions, (req, res) => handle(req, res))
      .listen(httpsPort, '0.0.0.0', () => {
        console.log(`> ✅ HTTPS server ready on https://localhost:${httpsPort}`);
        currentIPs.forEach(ip =>
          console.log(`> 🔐 Accessible via LAN: https://${ip}:${httpsPort}`)
        );
      });
  } else {
    console.warn('⚠️ SSL certs missing or invalid. HTTPS server not started.');
  }
}

// ===== Monitor IP changes =====
function watchNetworkChanges(interval = 5000) {
  let debounceTimer = null;

  setInterval(() => {
    const newIPs = getLanIPs();

    // Skip restart if temporarily offline
    if (newIPs.length === 0) {
      console.log('⚠️ Network temporarily lost, skipping restart.');
      return;
    }

    if (JSON.stringify(newIPs) !== JSON.stringify(currentIPs)) {
      console.log(`⚠️ Detected network change:`);
      console.log(`Old IPs: ${currentIPs.join(', ') || 'none'}`);
      console.log(`New IPs: ${newIPs.join(', ') || 'none'}`);
      currentIPs = newIPs;

      // Debounce restart
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        restartServers().catch(err => console.error('Error restarting servers:', err));
      }, 1000);
    }
  }, interval);
}

// ===== Start everything =====
startServers().then(() => {
  watchNetworkChanges(5000); // check every 5 seconds
});




// import { createServer } from 'https';
// import { createServer as createHttpServer } from 'http';
// import next from 'next';
// import fs from 'fs';
// import os from 'os';
// import dotenv from 'dotenv';
// import path from 'path';

// // Load environment variables from multiple possible locations
// const envPaths = [
//     path.resolve(process.cwd(), '.env.local'),
//     path.resolve(process.cwd(), '.env')
// ];

// envPaths.forEach(envPath => {
//     if (fs.existsSync(envPath)) {
//         // console.log(`Loading environment variables from: ${envPath}`);
//          dotenv.config({ path: envPath });
//     }
// });

// const dev = process.env.NODE_ENV !== 'production';
// const httpPort = 3001;
// const httpsPort = 3002;
// const certPath = process.env.SSL_CERTIFICATE;
// const keyPath = process.env.SSL_KEY;

// // Create Next.js app with explicit environment variables
// const app = next({
//     dev,
//     // Pass environment variables to Next.js
//     env: {
//         JWT_SECRET: process.env.JWT_SECRET,
//         // Add any other environment variables your app needs
//     }
// });

// const handle = app.getRequestHandler();

// // Get all LAN IPv4 addresses
// const interfaces = os.networkInterfaces();
// const lanIps = Object.values(interfaces)
//     .flat()
//     .filter(i => i.family === 'IPv4' && !i.internal)
//     .map(i => i.address);

// app.prepare().then(() => {
//     // Start HTTP server
//     createHttpServer((req, res) => {
//         handle(req, res);
//     }).listen(httpPort, '0.0.0.0', () => {
//         console.log(`> 🌐 HTTP server ready on http://localhost:${httpPort}`);
//         lanIps.forEach(ip => {
//             const url = `http://${ip}:${httpPort}`;
//             console.log(`> 📱 Accessible via LAN: ${url}`);
//         });
//     });

//     // Start HTTPS server if certs are valid
//     if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
//         const httpsOptions = {
//             key: fs.readFileSync(keyPath),
//             cert: fs.readFileSync(certPath),
//         };

//         createServer(httpsOptions, (req, res) => {
//             handle(req, res);
//         }).listen(httpsPort, '0.0.0.0', () => {
//             console.log(`> ✅ HTTPS server ready on https://localhost:${httpsPort}`);
//             lanIps.forEach(ip => {
//                 const url = `https://${ip}:${httpsPort}`;
//                 console.log(`> 🔐 Accessible via LAN: ${url}`);
//             });
//         });
//     } else {
//         console.warn('⚠️ SSL certs missing or invalid. HTTPS server not started.');
//     }
// });