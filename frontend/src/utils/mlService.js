/**
 * ML Service API Client - Frontend
 * Simple interface to interact with ML prediction endpoints
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export const mlService = {
    /**
     * Check drug interactions using AI model
     * @param {string[]} drugs - Array of drug names
     * @param {boolean} includeFood - Include food interaction check
     */
    async checkInteractions(drugs, includeFood = false) {
        try {
            const response = await fetch(`${API_BASE}/api/ml/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ drugs, includeFood })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('ML Service Error:', error);
            throw error;
        }
    },

    /**
     * Get AI risk assessment
     * @param {string[]} drugs - Array of drug names
     * @param {number} patientAge - Patient age (optional)
     * @param {string[]} conditions - Medical conditions (optional)
     */
    async assessRisk(drugs, patientAge = null, conditions = []) {
        try {
            const response = await fetch(`${API_BASE}/api/ml/risk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ drugs, patientAge, conditions })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('ML Risk Assessment Error:', error);
            throw error;
        }
    },

    /**
     * Check food-drug interactions
     * @param {string} drug - Drug name
     * @param {string[]} foods - Array of food names
     */
    async checkFoodDrug(drug, foods) {
        try {
            const response = await fetch(`${API_BASE}/api/ml/food-drug`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ drug, foods })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Food-Drug Check Error:', error);
            throw error;
        }
    },

    /**
     * Health check for ML service
     */
    async healthCheck() {
        try {
            const response = await fetch(`${API_BASE}/api/ml/health`);
            return await response.json();
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
};

export default mlService;
