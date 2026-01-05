/**
 * ML Routes - Express API endpoints for ML Service
 */
const express = require('express');
const router = express.Router();
const { mlClient } = require('../services/mlServiceClient');

// Middleware to parse JSON
router.use(express.json());

/**
 * Health check for ML service
 */
router.get('/health', async (req, res) => {
    const result = await mlClient.healthCheck();

    if (result.success) {
        res.json({ status: 'ok', ml_service: result.data });
    } else {
        res.status(503).json({ status: 'error', message: result.error });
    }
});

/**
 * Predict drug interactions
 * POST /api/ml/interactions
 * Body: { drugs: ["Aspirin", "Warfarin"], includeFood: false }
 */
router.post('/interactions', async (req, res) => {
    try {
        const { drugs, includeFood } = req.body;

        if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'At least 2 drugs are required'
            });
        }

        const result = await mlClient.predictInteractions(drugs, includeFood);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * AI Risk Assessment
 * POST /api/ml/risk
 * Body: { drugs: [...], patientAge: 65, conditions: [...] }
 */
router.post('/risk', async (req, res) => {
    try {
        const { drugs, patientAge, conditions } = req.body;

        if (!drugs || !Array.isArray(drugs)) {
            return res.status(400).json({
                success: false,
                error: 'Drugs array is required'
            });
        }

        const result = await mlClient.assessRisk(drugs, patientAge, conditions);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Check food-drug interactions
 * POST /api/ml/food-drug
 * Body: { drug: "Warfarin", foods: ["spinach", "apple"] }
 */
router.post('/food-drug', async (req, res) => {
    try {
        const { drug, foods } = req.body;

        if (!drug || !foods || !Array.isArray(foods)) {
            return res.status(400).json({
                success: false,
                error: 'Drug name and foods array are required'
            });
        }

        const result = await mlClient.checkFoodDrugInteraction(drug, foods);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
