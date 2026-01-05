const mongoose = require('mongoose');
const logger = require('../shared_infrastructure/logger');

let connectionStatus = {
    connected: false,
    lastError: null,
    lastAttempt: null
};

const connectDB = async () => {
    connectionStatus.lastAttempt = new Date().toISOString();

    try {
        if (!process.env.MONGODB_URI) {
            logger.warn('MONGODB_URI not set; skipping database connection for this session.');
            connectionStatus = {
                connected: false,
                lastError: 'MONGODB_URI not configured',
                lastAttempt: connectionStatus.lastAttempt
            };
            return connectionStatus;
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        connectionStatus = {
            connected: true,
            lastError: null,
            lastAttempt: connectionStatus.lastAttempt
        };

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('connected', () => {
            logger.info('Mongoose connected to MongoDB');
            connectionStatus = {
                connected: true,
                lastError: null,
                lastAttempt: new Date().toISOString()
            };
        });

        mongoose.connection.on('error', (err) => {
            logger.error('Mongoose connection error:', err);
            connectionStatus = {
                connected: false,
                lastError: err.message,
                lastAttempt: new Date().toISOString()
            };
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('Mongoose disconnected from MongoDB');
            connectionStatus = {
                connected: false,
                lastError: 'Disconnected',
                lastAttempt: new Date().toISOString()
            };
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('Mongoose connection closed through app termination');
            process.exit(0);
        });

        return connectionStatus;

    } catch (error) {
        logger.error('Database connection failed:', error);
        connectionStatus = {
            connected: false,
            lastError: error.message,
            lastAttempt: connectionStatus.lastAttempt
        };

        if (process.env.EXIT_ON_DB_FAIL === 'true') {
            process.exit(1);
        } else {
            logger.warn('Continuing without database connection. Some features may be unavailable.');
        }

        return connectionStatus;
    }
};

const getDBStatus = () => connectionStatus;

module.exports = {
    connectDB,
    getDBStatus
};