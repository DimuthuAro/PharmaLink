const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

const logger = require('./shared_infrastructure/logger');
const { connectDB, getDBStatus } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Auto-start microservices
const microserviceProcesses = [];

function startMicroservice(name, dir, port) {
    const servicePath = path.join(__dirname, 'microservices', dir);
    logger.info(`Starting ${name} on port ${port}...`);
    
    const proc = spawn('node', ['index.js'], {
        cwd: servicePath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PORT: port },
        shell: true
    });
    
    proc.stdout.on('data', (data) => {
        logger.info(`[${name}] ${data.toString().trim()}`);
    });
    
    proc.stderr.on('data', (data) => {
        logger.error(`[${name}] ${data.toString().trim()}`);
    });
    
    proc.on('error', (err) => {
        logger.error(`Failed to start ${name}: ${err.message}`);
    });
    
    proc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            logger.warn(`${name} exited with code ${code}`);
        }
    });
    
    microserviceProcesses.push({ name, proc, port });
    return proc;
}

// Start microservices with delay to allow main server to initialize first
setTimeout(() => {
    if (process.env.AUTO_START_MICROSERVICES !== 'false') {
        logger.info('Auto-starting microservices...');
        startMicroservice('Drug Interaction Service', 'drug_interaction_microservice', 3001);
        // Uncomment these to start other microservices:
        // startMicroservice('Advisory Service', 'personalized_advisory_microservice', 3002);
        // startMicroservice('Comparator Service', 'crossbrand_comparator_microservice', 3003);
        // startMicroservice('Prescription Service', 'prescription_interpreter_microservice', 3004);
    }
}, 2000);

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

// Connect to MongoDB (non-blocking if unavailable)
connectDB();

// Health check endpoint
app.get('/health', (req, res) => {
    const dbStatus = getDBStatus();
    const status = dbStatus.connected ? 'OK' : 'DEGRADED';

    res.status(200).json({
        status,
        timestamp: new Date().toISOString(),
        services: {
            database: dbStatus.connected ? 'connected' : 'unavailable',
            redis: 'connected',
            messageQueue: 'connected'
        },
        database: {
            connected: dbStatus.connected,
            lastError: dbStatus.lastError,
            lastAttempt: dbStatus.lastAttempt
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
    pathRewrite: { '^/api/advisory': '' }
}));

app.use('/api/comparator', createProxyMiddleware({
    target: `http://localhost:${process.env.COMPARATOR_PORT || 3003}`,
    changeOrigin: true,
    pathRewrite: { '^/api/comparator': '' }
}));

app.use('/api/prescription', createProxyMiddleware({
    target: `http://localhost:${process.env.PRESCRIPTION_PORT || 3004}`,
    changeOrigin: true,
    pathRewrite: { '^/api/prescription': '' }
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

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received. Closing HTTP server.');
    
    // Kill all microservice processes
    microserviceProcesses.forEach(({ name, proc }) => {
        logger.info(`Stopping ${name}...`);
        proc.kill('SIGTERM');
    });
    
    server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received. Closing HTTP server.');
    
    // Kill all microservice processes
    microserviceProcesses.forEach(({ name, proc }) => {
        logger.info(`Stopping ${name}...`);
        proc.kill('SIGTERM');
    });
    
    server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
    });
});

const server = app.listen(PORT, () => {
    logger.info(`Pharmalink Backend API Gateway listening on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;