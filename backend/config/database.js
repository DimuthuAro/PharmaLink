const mongoose = require('mongoose');
const logger = require('../shared_infrastructure/logger');

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            logger.warn('MONGODB_URI not set; skipping database connection for this session.');
            return;
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('connected', () => {
            logger.info('Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            logger.error('Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('Mongoose disconnected from MongoDB');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('Mongoose connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        logger.error('Database connection failed:', error);
        process.exit(1);
    }
};

module.exports = connectDB;