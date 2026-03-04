const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logger = require('./shared_infrastructure/logger');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Microservice Auto-Launcher
// ============================================================
const MICROSERVICES = [
    { name: 'Drug Interaction',          dir: 'drug_interaction_microservice',          port: process.env.DRUG_INTERACTION_PORT || 3001,   emoji: '🧬' },
    { name: 'Personalized Advisory',     dir: 'personalized_advisory_microservice',     port: process.env.ADVISORY_PORT || 3002,           emoji: '💡' },
    { name: 'Cross-Brand Comparator',    dir: 'crossbrand_comparator_microservice',     port: process.env.COMPARATOR_PORT || 3003,         emoji: '⚖️' },
    { name: 'Prescription Interpreter',  dir: 'prescription_interpreter_microservice',  port: process.env.PRESCRIPTION_PORT || 3004,       emoji: '📋' },
    { name: 'Treatment Identifier',      dir: 'treatment_identifier_microservice',      port: process.env.TREATMENT_IDENTIFIER_PORT || 3005, emoji: '🔬' },
];

const childProcesses = [];

function ensureDependencies(serviceDir) {
    const svcPath = path.join(__dirname, 'microservices', serviceDir);
    const nodeModPath = path.join(svcPath, 'node_modules');
    if (!fs.existsSync(nodeModPath)) {
        logger.info(`Installing dependencies for ${serviceDir}...`);
        try {
            execSync('npm install --production', { cwd: svcPath, stdio: 'pipe' });
        } catch (e) {
            logger.error(`Failed to install deps for ${serviceDir}: ${e.message}`);
            return false;
        }
    }
    return true;
}

function startMicroservice({ name, dir, port, emoji }, delay) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const svcPath = path.join(__dirname, 'microservices', dir);
            if (!fs.existsSync(path.join(svcPath, 'index.js'))) {
                logger.error(`${emoji} ${name}: index.js not found at ${svcPath}`);
                return resolve(false);
            }

            if (!ensureDependencies(dir)) {
                return resolve(false);
            }

            const child = spawn('node', ['index.js'], {
                cwd: svcPath,
                env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: true,
            });

            child.stdout.on('data', (data) => {
                const msg = data.toString().trim();
                if (msg) logger.info(`${emoji} [${name}] ${msg}`);
            });

            child.stderr.on('data', (data) => {
                const msg = data.toString().trim();
                if (msg) logger.error(`${emoji} [${name}] ${msg}`);
            });

            child.on('error', (err) => {
                logger.error(`${emoji} ${name} failed to start: ${err.message}`);
                resolve(false);
            });

            child.on('exit', (code) => {
                if (code !== null && code !== 0) {
                    logger.warn(`${emoji} ${name} exited with code ${code}`);
                }
            });

            child._serviceName = name;
            childProcesses.push(child);
            logger.info(`${emoji} ${name} starting on port ${port}`);
            resolve(true);
        }, delay);
    });
}

async function startAllMicroservices() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🚀 Auto-starting all microservices...');
    logger.info('='.repeat(60));

    for (let i = 0; i < MICROSERVICES.length; i++) {
        await startMicroservice(MICROSERVICES[i], i * 1000); // 1s stagger
    }

    // Print summary after all services have been spawned
    setTimeout(() => {
        logger.info('\n' + '='.repeat(60));
        logger.info('✅ All microservices launched! Endpoints:');
        logger.info('='.repeat(60));
        logger.info('🌐 API Gateway:        http://localhost:' + PORT);
        logger.info('🧬 Drug Interactions:  http://localhost:' + PORT + '/api/drug-interactions');
        logger.info('💡 Advisory:           http://localhost:' + PORT + '/api/advisory');
        logger.info('⚖️  Comparator:         http://localhost:' + PORT + '/api/comparator');
        logger.info('📋 Prescription:       http://localhost:' + PORT + '/api/prescription');
        logger.info('🔬 Treatment:          http://localhost:' + PORT + '/api/treatment');
        logger.info('='.repeat(60) + '\n');
    }, MICROSERVICES.length * 1000 + 2000);
}

function shutdownMicroservices() {
    logger.info('🛑 Shutting down microservices...');
    childProcesses.forEach((child) => {
        try {
            if (!child.killed) {
                child.kill('SIGTERM');
                logger.info(`   Stopped: ${child._serviceName || 'unknown'}`);
            }
        } catch (_) { /* already dead */ }
    });
}

// Security middleware
app.use(helmet());

// CORS configuration — allow configurable comma-separated origins, default Vite dev
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

const allowAllCors = process.env.CORS_ALLOW_ALL === 'true' || process.env.NODE_ENV === 'development';

app.use(cors({
    origin: (origin, callback) => {
        if (allowAllCors) return callback(null, true);

        // Allow server-to-server/no-origin, configured origins, and common local dev hosts.
        const isLocal = origin && (
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:')
        );

        if (!origin || allowedOrigins.includes(origin) || isLocal) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// Body parsing middleware - MOVED AFTER PROXIES
// Note: http-proxy-middleware handles body parsing internally.
// If express.json() is used before proxy, it can consume the stream and cause issues with POST requests.
// We only apply body parsing to non-proxy routes if needed, or ensure proxy config handles it.
// For this setup, we'll move it after proxies or use a specific route for it if needed.
// However, since we have health check and potentially other routes, we can apply it conditionally or just remove it for proxy paths.
// Simplest fix for now: Move it after proxy definitions or remove global application if proxies need raw stream.
// Actually, better approach: Apply body parser only to routes that need it, or skip it for /api/* routes.

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
connectDB();

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            database: 'connected',
            redis: 'connected',
            messageQueue: 'connected'
        }
    });
});

// API Routes - Proxy to microservices
// Important: Do not use body-parser before proxies for POST requests to work correctly without custom onProxyReq
app.use('/api/drug-interactions', createProxyMiddleware({
    target: `http://localhost:${process.env.DRUG_INTERACTION_PORT || 3001}`,
    changeOrigin: true,
    pathRewrite: { '^/api/drug-interactions': '' },
    onProxyReq: (proxyReq, req, res) => {
        // Fix for body-parser issue if it was applied globally (though we moved it, this is safer)
        if (req.body && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    }
}));

app.use('/api/advisory', createProxyMiddleware({
    target: `http://localhost:${process.env.ADVISORY_PORT || 3002}`,
    changeOrigin: true,
    pathRewrite: { '^/api/advisory': '' },
    onProxyReq: (proxyReq, req, res) => {
        if (req.body && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    }
}));

app.use('/api/comparator', createProxyMiddleware({
    target: `http://localhost:${process.env.COMPARATOR_PORT || 3003}`,
    changeOrigin: true,
    pathRewrite: { '^/api/comparator': '' },
    onProxyReq: (proxyReq, req, res) => {
        if (req.body && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    }
}));

app.use('/api/prescription', createProxyMiddleware({
    target: `http://localhost:${process.env.PRESCRIPTION_PORT || 3004}`,
    changeOrigin: true,
    pathRewrite: { '^/api/prescription': '' },
    onProxyReq: (proxyReq, req, res) => {
        if (req.body && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    }
}));

app.use('/api/treatment', createProxyMiddleware({
    target: `http://localhost:${process.env.TREATMENT_IDENTIFIER_PORT || 3005}`,
    changeOrigin: true,
    pathRewrite: { '^/api/treatment': '' },
    onProxyReq: (proxyReq, req, res) => {
        if (req.body && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    }
}));

// ML Service Routes (connects to Python FastAPI)
const mlRoutes = require('./routes/mlRoutes');
app.use('/api/ml', mlRoutes);

// Apply body parsing for other routes (if any) that are not proxies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The route ${req.originalUrl} does not exist`
    });
});

// Graceful shutdown — kill all child microservices then exit
function gracefulShutdown(signal) {
    logger.info(`${signal} received. Shutting down...`);
    shutdownMicroservices();
    server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
    });
    // Force exit after 5 seconds if graceful shutdown stalls
    setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

const server = app.listen(PORT, () => {
    logger.info(`Pharmalink Backend API Gateway listening on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Auto-start all 5 microservices after gateway is ready
    startAllMicroservices();
});

module.exports = app;