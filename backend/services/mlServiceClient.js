/**
 * ML Service Client - Express Middleware
 * Connects Express API to Python ML Service (FastAPI)
 */
const axios = require('axios');
const logger = require('../shared_infrastructure/logger');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

class MLServiceClient {
    constructor(baseUrl = ML_SERVICE_URL) {
        this.client = axios.create({
            baseURL: baseUrl,
            timeout: 30000, // 30 second timeout
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                logger.info(`ML Service Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                logger.error('ML Service Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                logger.info(`ML Service Response: ${response.status} - ${response.config.url}`);
                return response;
            },
            (error) => {
                logger.error('ML Service Response Error:', error.message);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Health check for ML service
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health');
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Predict drug interactions
     * @param {string[]} drugs - List of drug names
     * @param {boolean} includeFood - Include food interactions
     */
    async predictInteractions(drugs, includeFood = false) {
        try {
            const response = await this.client.post('/predict/interactions', {
                drugs,
                include_food: includeFood
            });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }

    /**
     * AI Risk Assessment
     * @param {string[]} drugs - List of drugs
     * @param {number} patientAge - Patient age (optional)
     * @param {string[]} conditions - Medical conditions (optional)
     */
    async assessRisk(drugs, patientAge = null, conditions = []) {
        try {
            const response = await this.client.post('/predict/risk', {
                drugs,
                patient_age: patientAge,
                conditions
            });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }

    /**
     * Check food-drug interactions
     * @param {string} drug - Drug name
     * @param {string[]} foods - List of foods
     */
    async checkFoodDrugInteraction(drug, foods) {
        try {
            const response = await this.client.post('/predict/food-drug', {
                drug,
                foods
            });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }
}

// Singleton instance
const mlClient = new MLServiceClient();

module.exports = { MLServiceClient, mlClient };
