const redis = require('redis');
const logger = require('../logger');

class CacheService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                retry_strategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            });

            this.client.on('connect', () => {
                logger.info('Redis client connected');
                this.isConnected = true;
            });

            this.client.on('error', (err) => {
                logger.error('Redis client error:', err);
                this.isConnected = false;
            });

            this.client.on('end', () => {
                logger.warn('Redis client disconnected');
                this.isConnected = false;
            });

            await this.client.connect();
            return this.client;
        } catch (error) {
            logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            this.isConnected = false;
            logger.info('Redis client disconnected');
        }
    }

    async set(key, value, ttl = 3600) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis client not connected');
            }

            const serializedValue = JSON.stringify(value);
            await this.client.setEx(key, ttl, serializedValue);
            logger.debug(`Cache set: ${key}`);
        } catch (error) {
            logger.error('Cache set error:', error);
            throw error;
        }
    }

    async get(key) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis client not connected');
            }

            const value = await this.client.get(key);
            if (value) {
                logger.debug(`Cache hit: ${key}`);
                return JSON.parse(value);
            }

            logger.debug(`Cache miss: ${key}`);
            return null;
        } catch (error) {
            logger.error('Cache get error:', error);
            return null; // Fail gracefully
        }
    }

    async del(key) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis client not connected');
            }

            await this.client.del(key);
            logger.debug(`Cache deleted: ${key}`);
        } catch (error) {
            logger.error('Cache delete error:', error);
            throw error;
        }
    }

    async exists(key) {
        try {
            if (!this.isConnected) {
                return false;
            }

            const exists = await this.client.exists(key);
            return exists === 1;
        } catch (error) {
            logger.error('Cache exists error:', error);
            return false;
        }
    }

    async flush() {
        try {
            if (!this.isConnected) {
                throw new Error('Redis client not connected');
            }

            await this.client.flushAll();
            logger.info('Cache flushed');
        } catch (error) {
            logger.error('Cache flush error:', error);
            throw error;
        }
    }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;