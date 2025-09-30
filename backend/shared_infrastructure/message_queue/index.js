const amqp = require('amqplib');
const logger = require('../logger');

class MessageQueueService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
            this.connection = await amqp.connect(rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            this.isConnected = true;
            logger.info('RabbitMQ connected successfully');

            // Handle connection events
            this.connection.on('error', (err) => {
                logger.error('RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                logger.warn('RabbitMQ connection closed');
                this.isConnected = false;
            });

            // Setup default exchanges and queues
            await this.setupDefaultQueues();

            return this.connection;
        } catch (error) {
            logger.error('Failed to connect to RabbitMQ:', error);
            throw error;
        }
    }

    async setupDefaultQueues() {
        try {
            // Define exchanges
            const exchanges = [
                { name: 'drug_interactions', type: 'topic' },
                { name: 'prescriptions', type: 'topic' },
                { name: 'notifications', type: 'fanout' },
                { name: 'analytics', type: 'topic' }
            ];

            // Define queues
            const queues = [
                'drug_interaction_processing',
                'prescription_analysis',
                'personalized_recommendations',
                'crossbrand_comparison',
                'notification_dispatch',
                'audit_logs'
            ];

            // Create exchanges
            for (const exchange of exchanges) {
                await this.channel.assertExchange(exchange.name, exchange.type, {
                    durable: true
                });
                logger.info(`Exchange created: ${exchange.name}`);
            }

            // Create queues
            for (const queueName of queues) {
                await this.channel.assertQueue(queueName, {
                    durable: true,
                    arguments: {
                        'x-message-ttl': 86400000 // 24 hours TTL
                    }
                });
                logger.info(`Queue created: ${queueName}`);
            }

            // Bind queues to exchanges
            await this.bindQueues();

        } catch (error) {
            logger.error('Error setting up default queues:', error);
            throw error;
        }
    }

    async bindQueues() {
        try {
            const bindings = [
                {
                    queue: 'drug_interaction_processing',
                    exchange: 'drug_interactions',
                    routingKey: 'interaction.*'
                },
                {
                    queue: 'prescription_analysis',
                    exchange: 'prescriptions',
                    routingKey: 'prescription.analyze'
                },
                {
                    queue: 'personalized_recommendations',
                    exchange: 'prescriptions',
                    routingKey: 'prescription.recommend'
                },
                {
                    queue: 'crossbrand_comparison',
                    exchange: 'drug_interactions',
                    routingKey: 'interaction.compare'
                },
                {
                    queue: 'notification_dispatch',
                    exchange: 'notifications',
                    routingKey: ''
                },
                {
                    queue: 'audit_logs',
                    exchange: 'analytics',
                    routingKey: 'audit.*'
                }
            ];

            for (const binding of bindings) {
                await this.channel.bindQueue(
                    binding.queue,
                    binding.exchange,
                    binding.routingKey
                );
                logger.info(`Queue bound: ${binding.queue} -> ${binding.exchange}`);
            }
        } catch (error) {
            logger.error('Error binding queues:', error);
            throw error;
        }
    }

    async publish(exchange, routingKey, message, options = {}) {
        try {
            if (!this.isConnected || !this.channel) {
                throw new Error('RabbitMQ not connected');
            }

            const messageBuffer = Buffer.from(JSON.stringify(message));
            const published = this.channel.publish(
                exchange,
                routingKey,
                messageBuffer,
                {
                    persistent: true,
                    timestamp: Date.now(),
                    ...options
                }
            );

            if (published) {
                logger.debug(`Message published to ${exchange}:${routingKey}`);
            }

            return published;
        } catch (error) {
            logger.error('Error publishing message:', error);
            throw error;
        }
    }

    async sendToQueue(queueName, message, options = {}) {
        try {
            if (!this.isConnected || !this.channel) {
                throw new Error('RabbitMQ not connected');
            }

            const messageBuffer = Buffer.from(JSON.stringify(message));
            const sent = this.channel.sendToQueue(
                queueName,
                messageBuffer,
                {
                    persistent: true,
                    timestamp: Date.now(),
                    ...options
                }
            );

            if (sent) {
                logger.debug(`Message sent to queue: ${queueName}`);
            }

            return sent;
        } catch (error) {
            logger.error('Error sending message to queue:', error);
            throw error;
        }
    }

    async consume(queueName, callback, options = {}) {
        try {
            if (!this.isConnected || !this.channel) {
                throw new Error('RabbitMQ not connected');
            }

            await this.channel.consume(
                queueName,
                async (message) => {
                    if (message) {
                        try {
                            const content = JSON.parse(message.content.toString());
                            await callback(content, message);
                            this.channel.ack(message);
                            logger.debug(`Message processed from queue: ${queueName}`);
                        } catch (error) {
                            logger.error('Error processing message:', error);
                            this.channel.nack(message, false, false);
                        }
                    }
                },
                {
                    noAck: false,
                    ...options
                }
            );

            logger.info(`Consumer registered for queue: ${queueName}`);
        } catch (error) {
            logger.error('Error setting up consumer:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.isConnected = false;
            logger.info('RabbitMQ disconnected');
        } catch (error) {
            logger.error('Error disconnecting from RabbitMQ:', error);
        }
    }
}

// Create singleton instance
const messageQueueService = new MessageQueueService();

module.exports = messageQueueService;