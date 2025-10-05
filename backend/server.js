const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const logger = require('./shared_infrastructure/logger');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;
const test = 10;
console.log(test);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/drug-interactions', createProxyMiddleware({
    target: `http://localhost:${process.env.DRUG_INTERACTION_PORT || 3001}`,
    changeOrigin: true,
    pathRewrite: { '^/api/drug-interactions': '' }
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