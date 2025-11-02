

import { createServer } from 'https';
import { createServer as createHttpServer } from 'http';
import next from 'next';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from multiple possible locations
const envPaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env')
];

envPaths.forEach(envPath => {
    if (fs.existsSync(envPath)) {
        console.log(`Loading environment variables from: ${envPath}`);
        dotenv.config({ path: envPath });
    }
});

const dev = process.env.NODE_ENV !== 'production';
const httpPort = 3001;
const httpsPort = 3002;
const certPath = process.env.SSL_CERTIFICATE;
const keyPath = process.env.SSL_KEY;

// Create Next.js app with explicit environment variables
const app = next({
    dev,
    // Pass environment variables to Next.js
    env: {
        JWT_SECRET: process.env.JWT_SECRET,
        // Add any other environment variables your app needs
    }
});

const handle = app.getRequestHandler();

// Get all LAN IPv4 addresses
const interfaces = os.networkInterfaces();
const lanIps = Object.values(interfaces)
    .flat()
    .filter(i => i.family === 'IPv4' && !i.internal)
    .map(i => i.address);

app.prepare().then(() => {
    // Start HTTP server
    createHttpServer((req, res) => {
        handle(req, res);
    }).listen(httpPort, '0.0.0.0', () => {
        console.log(`> 🌐 HTTP server ready on http://localhost:${httpPort}`);
        lanIps.forEach(ip => {
            const url = `http://${ip}:${httpPort}`;
            console.log(`> 📱 Accessible via LAN: ${url}`);
        });
    });

    // Start HTTPS server if certs are valid
    if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        };

        createServer(httpsOptions, (req, res) => {
            handle(req, res);
        }).listen(httpsPort, '0.0.0.0', () => {
            console.log(`> ✅ HTTPS server ready on https://localhost:${httpsPort}`);
            lanIps.forEach(ip => {
                const url = `https://${ip}:${httpsPort}`;
                console.log(`> 🔐 Accessible via LAN: ${url}`);
            });
        });
    } else {
        console.warn('⚠️ SSL certs missing or invalid. HTTPS server not started.');
    }
});