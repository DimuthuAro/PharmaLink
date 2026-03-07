/**
 * ML Service API Client - Frontend
 * Simple interface to interact with ML prediction endpoints
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const USE_DEMO = import.meta.env.VITE_USE_DEMO === 'true';

let DEMO = null;
if (USE_DEMO) {
    try {
        // Vite supports importing JSON
        DEMO = await import('../assets/treatment_demo.json');
        DEMO = DEMO.default || DEMO;
    } catch (e) {
        DEMO = null;
    }
}

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
    },

    // ── Treatment Identifier ────────────────────────────────

    /**
     * Identify treatments from a list of medications
     * @param {string[]} medications - Array of medication names
     */
    async identifyTreatments(medications) {
        try {
            if (USE_DEMO && DEMO) {
                // Return demo identify response (clone and adapt medications)
                const resp = JSON.parse(JSON.stringify(DEMO.identify));
                // If medications provided, map to demo where possible
                resp.medications = medications.map((m) => {
                    const key = m.toLowerCase();
                    const demo = DEMO.medication_conditions[key];
                    if (demo) return demo;
                    return { medication: m, generic_name: m.toLowerCase(), conditions: [], source: 'demo' };
                });
                return resp;
            }

            const response = await fetch(`${API_BASE}/api/ml/treatment/identify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ medications })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Treatment Identify Error:', error);
            throw error;
        }
    },

    /**
     * Identify treatments from prescription text
     * @param {string} prescriptionText - Raw prescription text
     */
    async identifyTreatmentsFromText(prescriptionText) {
        try {
            if (USE_DEMO && DEMO) {
                // Return demo identify response, include extracted_medications from text
                const resp = JSON.parse(JSON.stringify(DEMO.identify));
                // naive extraction: look for known demo names
                const extracted = [];
                const txt = prescriptionText.toLowerCase();
                for (const d of DEMO.search) {
                    if (txt.includes(d.name.toLowerCase()) || (d.genericName && txt.includes(d.genericName.toLowerCase()))) {
                        extracted.push(d.name);
                    }
                }
                resp.extracted_medications = extracted;
                resp.medications = extracted.map((m) => {
                    const key = m.toLowerCase();
                    return DEMO.medication_conditions[key] || { medication: m, generic_name: m.toLowerCase(), conditions: [], source: 'demo' };
                });
                return resp;
            }

            const response = await fetch(`${API_BASE}/api/ml/treatment/identify-from-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prescription_text: prescriptionText })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Treatment Text Identify Error:', error);
            throw error;
        }
    },

    /**
     * Get conditions for a single medication
     * @param {string} medication - Medication name
     */
    async getMedicationConditions(medication) {
        try {
            if (USE_DEMO && DEMO) {
                const key = medication.toLowerCase();
                if (DEMO.medication_conditions && DEMO.medication_conditions[key]) {
                    return DEMO.medication_conditions[key];
                }
                return { medication, generic_name: medication.toLowerCase(), conditions: [], source: 'demo' };
            }

            const response = await fetch(`${API_BASE}/api/ml/treatment/medication-conditions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ medication })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Medication Conditions Error:', error);
            throw error;
        }
    }
};

export default mlService;
