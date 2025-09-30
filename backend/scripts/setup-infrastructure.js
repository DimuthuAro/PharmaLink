const logger = require('../shared_infrastructure/logger');
const cacheService = require('../shared_infrastructure/cache');
const messageQueueService = require('../shared_infrastructure/message_queue');
const fileStoreService = require('../shared_infrastructure/file_store');

async function setupInfrastructure() {
    try {
        logger.info('Setting up Pharmalink infrastructure...');

        // Setup Redis Cache
        try {
            await cacheService.connect();
            logger.info('✓ Cache service connected');
        } catch (error) {
            logger.warn('⚠ Cache service connection failed:', error.message);
        }

        // Setup Message Queue
        try {
            await messageQueueService.connect();
            logger.info('✓ Message queue connected');
        } catch (error) {
            logger.warn('⚠ Message queue connection failed:', error.message);
        }

        // Setup File Store
        try {
            await fileStoreService.init();
            logger.info('✓ File store initialized');
        } catch (error) {
            logger.warn('⚠ File store initialization failed:', error.message);
        }

        logger.info('Infrastructure setup completed');

        // Setup graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('Shutting down infrastructure...');

            try {
                await cacheService.disconnect();
                await messageQueueService.disconnect();
                logger.info('Infrastructure shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        });

    } catch (error) {
        logger.error('Infrastructure setup failed:', error);
        throw error;
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupInfrastructure().catch(error => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
}

module.exports = setupInfrastructure;