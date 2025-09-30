const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.ADVISORY_PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (req, res) => {
    res.status(200).json({
        service: 'Personalized Advisory Microservice',
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Get personalized recommendations
app.post('/recommendations', async (req, res) => {
    try {
        const { patientProfile, medications, conditions } = req.body;

        if (!patientProfile) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Patient profile is required'
            });
        }

        const recommendations = await generateRecommendations(patientProfile, medications, conditions);

        res.json({
            patientId: patientProfile.id,
            recommendations,
            generatedAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
    } catch (error) {
        console.error('Recommendation generation error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate recommendations'
        });
    }
});

// Get medication adherence insights
app.post('/adherence', async (req, res) => {
    try {
        const { patientId, medicationHistory } = req.body;

        if (!patientId || !medicationHistory) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Patient ID and medication history are required'
            });
        }

        const adherenceInsights = await analyzeAdherence(patientId, medicationHistory);

        res.json({
            patientId,
            adherenceInsights,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Adherence analysis error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to analyze medication adherence'
        });
    }
});

// Get lifestyle recommendations
app.post('/lifestyle', async (req, res) => {
    try {
        const { patientProfile, healthGoals } = req.body;

        if (!patientProfile) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Patient profile is required'
            });
        }

        const lifestyleRecommendations = await generateLifestyleRecommendations(patientProfile, healthGoals);

        res.json({
            patientId: patientProfile.id,
            lifestyleRecommendations,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Lifestyle recommendation error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate lifestyle recommendations'
        });
    }
});

// Get drug alternatives
app.post('/alternatives', async (req, res) => {
    try {
        const { drugName, patientProfile, reason } = req.body;

        if (!drugName || !patientProfile) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Drug name and patient profile are required'
            });
        }

        const alternatives = await findDrugAlternatives(drugName, patientProfile, reason);

        res.json({
            originalDrug: drugName,
            alternatives,
            patientId: patientProfile.id,
            reason,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Drug alternatives error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to find drug alternatives'
        });
    }
});

// Placeholder functions - implement with actual AI/ML models and patient data
async function generateRecommendations(patientProfile, medications, conditions) {
    const recommendations = [];

    // Simulate personalized recommendations based on patient profile
    if (patientProfile.age > 65) {
        recommendations.push({
            type: 'medication_adjustment',
            priority: 'high',
            title: 'Senior-Friendly Medication Review',
            description: 'Consider lower dosages due to age-related metabolism changes',
            action: 'Consult with healthcare provider about current dosages'
        });
    }

    if (conditions && conditions.includes('diabetes')) {
        recommendations.push({
            type: 'lifestyle',
            priority: 'medium',
            title: 'Blood Sugar Monitoring',
            description: 'Regular monitoring recommended with current medications',
            action: 'Check blood sugar levels as prescribed'
        });
    }

    if (medications && medications.length > 5) {
        recommendations.push({
            type: 'medication_management',
            priority: 'medium',
            title: 'Polypharmacy Management',
            description: 'Multiple medications require careful coordination',
            action: 'Consider medication organizer and regular pharmacy consultations'
        });
    }

    // Add more personalized recommendations based on AI analysis
    recommendations.push({
        type: 'preventive_care',
        priority: 'low',
        title: 'Preventive Health Measures',
        description: 'Based on your profile, consider these preventive measures',
        action: 'Discuss preventive care options with your healthcare provider'
    });

    return recommendations;
}

async function analyzeAdherence(patientId, medicationHistory) {
    // Simulate adherence analysis
    const adherenceScore = Math.random() * 100;
    const missedDoses = Math.floor(Math.random() * 10);

    return {
        adherenceScore: Math.round(adherenceScore),
        status: adherenceScore > 80 ? 'good' : adherenceScore > 60 ? 'fair' : 'poor',
        missedDoses,
        patterns: [
            'More missed doses on weekends',
            'Better adherence with morning medications'
        ],
        recommendations: [
            'Set up medication reminders',
            'Use a pill organizer',
            'Consider long-acting formulations'
        ]
    };
}

async function generateLifestyleRecommendations(patientProfile, healthGoals) {
    const recommendations = [];

    // Simulate lifestyle recommendations based on profile and goals
    if (healthGoals && healthGoals.includes('weight_management')) {
        recommendations.push({
            category: 'nutrition',
            title: 'Balanced Diet Plan',
            description: 'Focus on whole foods and portion control',
            tips: ['Eat more vegetables', 'Limit processed foods', 'Stay hydrated']
        });
    }

    if (patientProfile.conditions && patientProfile.conditions.includes('hypertension')) {
        recommendations.push({
            category: 'exercise',
            title: 'Heart-Healthy Exercise',
            description: 'Low to moderate intensity cardiovascular exercise',
            tips: ['30 minutes daily walking', 'Swimming', 'Yoga or stretching']
        });
    }

    recommendations.push({
        category: 'sleep',
        title: 'Sleep Hygiene',
        description: 'Quality sleep supports medication effectiveness',
        tips: ['Consistent sleep schedule', 'Avoid screens before bed', 'Comfortable sleep environment']
    });

    return recommendations;
}

async function findDrugAlternatives(drugName, patientProfile, reason) {
    // Simulate finding drug alternatives
    const alternatives = [
        {
            name: `Alternative A to ${drugName}`,
            genericName: `Generic Alt A`,
            advantages: ['Lower cost', 'Fewer side effects'],
            considerations: ['Different dosing schedule', 'May require monitoring'],
            suitability: 'high'
        },
        {
            name: `Alternative B to ${drugName}`,
            genericName: `Generic Alt B`,
            advantages: ['Once daily dosing', 'Better tolerance profile'],
            considerations: ['Higher cost', 'Not suitable for certain conditions'],
            suitability: 'medium'
        }
    ];

    return alternatives;
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
    console.log(`Personalized Advisory Microservice listening on port ${PORT}`);
});

module.exports = app;