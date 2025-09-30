const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.DRUG_INTERACTION_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    // Simulate drug interaction checking
    const interactions = [];

    for (let i = 0; i < drugs.length; i++) {
        for (let j = i + 1; j < drugs.length; j++) {
            // Simulate some interactions
            if (Math.random() > 0.7) {
                interactions.push({
                    drug1: drugs[i],
                    drug2: drugs[j],
                    severity: ['mild', 'moderate', 'severe'][Math.floor(Math.random() * 3)],
                    description: `Potential interaction between ${drugs[i]} and ${drugs[j]}`,
                    recommendation: 'Consult healthcare provider'
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