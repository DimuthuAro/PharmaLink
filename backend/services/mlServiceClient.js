/**
 * ML Service Client - Express Middleware
 * Connects Express API to Python ML Service (FastAPI)
 */
const axios = require('axios');
const FormData = require('form-data');
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

    /**
     * Full prescription interpretation (OCR + NER + interaction check)
     * @param {object} file - Multer file object (buffer in memory)
     * @param {string} engine - 'auto', 'donut', 'easyocr', 'all'
     * @param {string} enhanceMode - 'medical', 'handwritten', 'standard'
     */
    async interpretPrescription(file, engine = 'auto', enhanceMode = 'medical') {
        try {
            const form = new FormData();
            form.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
            });
            form.append('engine', engine);
            form.append('enhance_mode', enhanceMode);

            const response = await this.client.post('/prescription/interpret', form, {
                headers: form.getHeaders(),
                timeout: 120000,
                maxContentLength: 50 * 1024 * 1024,
            });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || error.message,
            };
        }
    }

    /**
     * Basic prescription OCR (image to text)
     * @param {object} file - Multer file object
     * @param {string} engine - OCR engine to use
     */
    async ocrPrescription(file, engine = 'auto') {
        try {
            const form = new FormData();
            form.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
            });
            form.append('engine', engine);

            const response = await this.client.post('/prescription/ocr', form, {
                headers: form.getHeaders(),
                timeout: 120000,
                maxContentLength: 50 * 1024 * 1024,
            });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || error.message,
            };
        }
    }

    // ── Treatment Identifier Methods ────────────────────────────

    /**
     * Identify treatments/conditions from a list of medication names
     * @param {string[]} medications - List of medication names
     */
    async identifyTreatments(medications) {
        try {
            const treatmentClient = axios.create({
                baseURL: process.env.TREATMENT_ML_URL || 'http://localhost:8004',
                timeout: 15000,
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await treatmentClient.post('/identify', { medications });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || error.message,
            };
        }
    }

    /**
     * Identify treatments from prescription text
     * @param {string} prescriptionText - Raw prescription text
     */
    async identifyTreatmentsFromText(prescriptionText) {
        try {
            const treatmentClient = axios.create({
                baseURL: process.env.TREATMENT_ML_URL || 'http://localhost:8004',
                timeout: 15000,
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await treatmentClient.post('/identify-from-text', {
                prescription_text: prescriptionText,
            });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || error.message,
            };
        }
    }

    /**
     * Get conditions for a single medication
     * @param {string} medication - Medication name
     */
    async getMedicationConditions(medication) {
        try {
            const treatmentClient = axios.create({
                baseURL: process.env.TREATMENT_ML_URL || 'http://localhost:8004',
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await treatmentClient.post('/medication-conditions', { medication });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || error.message,
            };
        }
    }
}

// Singleton instance
const mlClient = new MLServiceClient();

module.exports = { MLServiceClient, mlClient };
