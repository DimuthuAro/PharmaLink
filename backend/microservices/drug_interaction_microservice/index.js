const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.DRUG_INTERACTION_PORT || 3001;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// ML Service client
const mlClient = axios.create({
    baseURL: ML_SERVICE_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug Middleware
app.use((req, res, next) => {
    console.log(`[Microservice] Received ${req.method} ${req.url}`);
    next();
});

// Routes
app.get('/health', (req, res) => {
    res.status(200).json({
        service: 'Drug Interaction Microservice',
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Check drug interactions
app.post('/check-interactions', async (req, res) => {
    try {
        const { drugs } = req.body;

        if (!drugs || !Array.isArray(drugs)) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Drugs array is required'
            });
        }

        // Placeholder for drug interaction logic
        const interactions = await checkDrugInteractions(drugs);

        res.json({
            drugs,
            interactions,
            severity: calculateSeverity(interactions),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Drug interaction check error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to check drug interactions'
        });
    }
});

// Check endpoint (frontend compatibility)
app.post('/check', async (req, res) => {
    try {
        const { drugs, includeFood, patientAge, conditions } = req.body;

        if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'At least 2 drugs are required'
            });
        }

        const interactions = await checkDrugInteractions(drugs);
        
        // Calculate summary
        const highRisk = interactions.filter(i => i.severity === 'high').length;
        const mediumRisk = interactions.filter(i => i.severity === 'medium').length;
        const lowRisk = interactions.filter(i => i.severity === 'low').length;
        const noInteraction = interactions.filter(i => !i.hasInteraction).length;

        res.json({
            success: true,
            data: {
                requestId: `req_${Date.now()}`,
                timestamp: new Date().toISOString(),
                drugCount: drugs.length,
                interactions: interactions.map(i => ({
                    drugs: [i.drug1, i.drug2],
                    prediction: {
                        hasInteraction: i.hasInteraction,
                        probability: i.probability,
                        severity: i.severity,
                        description: i.description,
                        confidence: i.confidence,
                        source: i.source,
                        recommendation: i.recommendation
                    }
                })),
                summary: {
                    totalPairs: interactions.length,
                    highRisk,
                    mediumRisk,
                    lowRisk,
                    noInteraction,
                    overallRisk: highRisk > 0 ? 'high' : mediumRisk > 0 ? 'medium' : lowRisk > 0 ? 'low' : 'none'
                },
                model: 'ml_service'
            }
        });
    } catch (error) {
        console.error('Drug interaction check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check drug interactions'
        });
    }
});

// Get drug information
app.get('/drug/:drugId', async (req, res) => {
    try {
        const { drugId } = req.params;

        // Placeholder for drug information retrieval
        const drugInfo = await getDrugInformation(drugId);

        if (!drugInfo) {
            return res.status(404).json({
                error: 'Drug not found',
                message: `Drug with ID ${drugId} not found`
            });
        }

        res.json(drugInfo);
    } catch (error) {
        console.error('Drug information error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve drug information'
        });
    }
});

// Search drugs
app.get('/search', async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;

        if (!query) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Search query is required'
            });
        }

        // Placeholder for drug search logic
        const results = await searchDrugs(query, parseInt(limit));

        res.json({
            query,
            results,
            count: results.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Drug search error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to search drugs'
        });
    }
});

// Placeholder functions - implement with actual drug database
async function checkDrugInteractions(drugs) {
    // Call ML Service for real predictions
    try {
        const response = await mlClient.post('/predict/interactions', {
            drugs: drugs,
            include_food: false
        });
        
        const data = response.data;
        
        // Transform ML response to microservice format
        const interactions = (data.interactions || []).map(interaction => ({
            drug1: interaction.drug_pair?.[0] || interaction.drug1,
            drug2: interaction.drug_pair?.[1] || interaction.drug2,
            hasInteraction: interaction.interaction,
            probability: interaction.probability,
            severity: interaction.severity || 'unknown',
            description: interaction.description || `Interaction between ${interaction.drug_pair?.[0]} and ${interaction.drug_pair?.[1]}`,
            recommendation: getRecommendation(interaction.severity, interaction.probability),
            confidence: interaction.confidence || 'medium',
            source: interaction.source || 'ml_model'
        }));
        
        return interactions;
        
    } catch (error) {
        console.error('ML Service error:', error.message);
        // Fallback to rule-based checking
        return fallbackInteractionCheck(drugs);
    }
}

function getRecommendation(severity, probability) {
    if (severity === 'high' || probability > 0.8) {
        return 'AVOID this combination. Consult healthcare provider immediately.';
    } else if (severity === 'medium' || probability > 0.5) {
        return 'Use with caution. Monitor for adverse effects and consult healthcare provider.';
    } else if (severity === 'low' || probability > 0.2) {
        return 'Low risk. Standard monitoring recommended.';
    }
    return 'No significant interaction expected. Safe to use together.';
}

function fallbackInteractionCheck(drugs) {
    // Known dangerous interactions (fallback)
    const knownInteractions = {
        'aspirin_warfarin': { severity: 'high', probability: 0.95 },
        'warfarin_ibuprofen': { severity: 'high', probability: 0.92 },
        'metformin_insulin': { severity: 'medium', probability: 0.75 },
        'sertraline_tramadol': { severity: 'high', probability: 0.85 },
        'alprazolam_oxycodone': { severity: 'high', probability: 0.90 },
    };
    
    const interactions = [];
    
    for (let i = 0; i < drugs.length; i++) {
        for (let j = i + 1; j < drugs.length; j++) {
            const key = [drugs[i].toLowerCase(), drugs[j].toLowerCase()].sort().join('_');
            const known = knownInteractions[key];
            
            if (known) {
                interactions.push({
                    drug1: drugs[i],
                    drug2: drugs[j],
                    hasInteraction: true,
                    probability: known.probability,
                    severity: known.severity,
                    description: `Known interaction between ${drugs[i]} and ${drugs[j]}`,
                    recommendation: getRecommendation(known.severity, known.probability),
                    confidence: 'high',
                    source: 'fallback_database'
                });
            }
        }
    }
    
    return interactions;
}

function calculateSeverity(interactions) {
    if (interactions.some(i => i.severity === 'severe')) return 'severe';
    if (interactions.some(i => i.severity === 'moderate')) return 'moderate';
    if (interactions.length > 0) return 'mild';
    return 'none';
}

async function getDrugInformation(drugId) {
    // Simulate drug information retrieval
    return {
        id: drugId,
        name: `Drug ${drugId}`,
        genericName: `Generic ${drugId}`,
        brandNames: [`Brand A ${drugId}`, `Brand B ${drugId}`],
        description: `Description for drug ${drugId}`,
        indications: ['Indication 1', 'Indication 2'],
        contraindications: ['Contraindication 1'],
        sideEffects: ['Side effect 1', 'Side effect 2'],
        dosage: 'As prescribed by healthcare provider'
    };
}

async function searchDrugs(query, limit) {
    // Simulate drug search
    const mockResults = [];
    for (let i = 1; i <= limit; i++) {
        mockResults.push({
            id: `drug_${i}`,
            name: `${query} Drug ${i}`,
            genericName: `Generic ${query} ${i}`,
            type: 'medication'
        });
    }
    return mockResults;
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The route ${req.originalUrl} does not exist`
    });
});

app.listen(PORT, () => {
    console.log(`Drug Interaction Microservice listening on port ${PORT}`);
});

module.exports = app;