const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.COMPARATOR_PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (req, res) => {
    res.status(200).json({
        service: 'Cross-Brand Comparator Microservice',
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Compare drug brands
app.post('/compare', async (req, res) => {
    try {
        const { genericName, location, insuranceInfo } = req.body;

        if (!genericName) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Generic drug name is required'
            });
        }

        const comparison = await compareBrands(genericName, location, insuranceInfo);

        res.json({
            genericName,
            comparison,
            location,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Brand comparison error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to compare drug brands'
        });
    }
});

// Get price history for a specific brand
app.get('/price-history/:brandName', async (req, res) => {
    try {
        const { brandName } = req.params;
        const { timeframe = '6months' } = req.query;

        const priceHistory = await getPriceHistory(brandName, timeframe);

        res.json({
            brandName,
            timeframe,
            priceHistory,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Price history error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve price history'
        });
    }
});

// Find cheapest alternatives
app.post('/cheapest', async (req, res) => {
    try {
        const { genericName, maxDistance, insuranceInfo } = req.body;

        if (!genericName) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Generic drug name is required'
            });
        }

        const cheapestOptions = await findCheapestOptions(genericName, maxDistance, insuranceInfo);

        res.json({
            genericName,
            cheapestOptions,
            searchRadius: maxDistance,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Cheapest options error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to find cheapest options'
        });
    }
});

// Get insurance coverage comparison
app.post('/insurance-coverage', async (req, res) => {
    try {
        const { genericName, insurancePlans } = req.body;

        if (!genericName || !insurancePlans || !Array.isArray(insurancePlans)) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Generic name and insurance plans array are required'
            });
        }

        const coverageComparison = await compareInsuranceCoverage(genericName, insurancePlans);

        res.json({
            genericName,
            coverageComparison,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Insurance coverage error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to compare insurance coverage'
        });
    }
});

// Get pharmacy-specific pricing
app.post('/pharmacy-pricing', async (req, res) => {
    try {
        const { genericName, pharmacyChain, location } = req.body;

        if (!genericName) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Generic drug name is required'
            });
        }

        const pharmacyPricing = await getPharmacyPricing(genericName, pharmacyChain, location);

        res.json({
            genericName,
            pharmacyChain,
            pricing: pharmacyPricing,
            location,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Pharmacy pricing error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get pharmacy pricing'
        });
    }
});

// Placeholder functions - implement with actual pricing data sources
async function compareBrands(genericName, location, insuranceInfo) {
    // Simulate brand comparison data
    const brands = [
        {
            brandName: `Brand A ${genericName}`,
            manufacturer: 'Pharma Corp A',
            price: Math.random() * 100 + 20,
            dosageForm: 'tablet',
            strength: '10mg',
            packageSize: 30,
            availability: 'in-stock',
            rating: Math.random() * 2 + 3, // 3-5 rating
            insuranceCovered: insuranceInfo ? Math.random() > 0.3 : false,
            copay: insuranceInfo ? Math.random() * 20 + 5 : null
        },
        {
            brandName: `Brand B ${genericName}`,
            manufacturer: 'Pharma Corp B',
            price: Math.random() * 100 + 20,
            dosageForm: 'tablet',
            strength: '10mg',
            packageSize: 30,
            availability: 'in-stock',
            rating: Math.random() * 2 + 3,
            insuranceCovered: insuranceInfo ? Math.random() > 0.3 : false,
            copay: insuranceInfo ? Math.random() * 20 + 5 : null
        },
        {
            brandName: `Generic ${genericName}`,
            manufacturer: 'Generic Pharma',
            price: Math.random() * 50 + 10,
            dosageForm: 'tablet',
            strength: '10mg',
            packageSize: 30,
            availability: 'in-stock',
            rating: Math.random() * 2 + 3,
            insuranceCovered: insuranceInfo ? Math.random() > 0.2 : false,
            copay: insuranceInfo ? Math.random() * 15 + 3 : null
        }
    ];

    // Sort by price (ascending)
    brands.sort((a, b) => a.price - b.price);

    return {
        totalBrandsFound: brands.length,
        brands,
        priceRange: {
            min: Math.min(...brands.map(b => b.price)),
            max: Math.max(...brands.map(b => b.price))
        },
        averagePrice: brands.reduce((sum, b) => sum + b.price, 0) / brands.length
    };
}

async function getPriceHistory(brandName, timeframe) {
    // Simulate price history data
    const months = timeframe === '1year' ? 12 : 6;
    const priceHistory = [];

    let basePrice = Math.random() * 100 + 50;

    for (let i = months; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);

        // Simulate price fluctuation
        basePrice += (Math.random() - 0.5) * 10;
        basePrice = Math.max(basePrice, 20); // Minimum price

        priceHistory.push({
            date: date.toISOString().split('T')[0],
            price: Math.round(basePrice * 100) / 100
        });
    }

    return priceHistory;
}

async function findCheapestOptions(genericName, maxDistance = 10, insuranceInfo) {
    // Simulate cheapest options search
    const options = [
        {
            pharmacy: 'Pharmacy A',
            address: '123 Main St',
            distance: Math.random() * maxDistance,
            brandName: `Generic ${genericName}`,
            price: Math.random() * 30 + 10,
            insuranceCovered: insuranceInfo ? Math.random() > 0.3 : false,
            finalPrice: null, // Will be calculated
            discountsAvailable: ['Senior discount', 'Loyalty program'],
            phoneNumber: '(555) 123-4567'
        },
        {
            pharmacy: 'Pharmacy B',
            address: '456 Oak Ave',
            distance: Math.random() * maxDistance,
            brandName: `Brand X ${genericName}`,
            price: Math.random() * 50 + 20,
            insuranceCovered: insuranceInfo ? Math.random() > 0.3 : false,
            finalPrice: null,
            discountsAvailable: ['First-time customer discount'],
            phoneNumber: '(555) 987-6543'
        }
    ];

    // Calculate final prices
    options.forEach(option => {
        if (option.insuranceCovered && insuranceInfo) {
            option.finalPrice = Math.random() * 15 + 5; // Copay
        } else {
            option.finalPrice = option.price;
        }
    });

    // Sort by final price
    options.sort((a, b) => a.finalPrice - b.finalPrice);

    return options;
}

async function compareInsuranceCoverage(genericName, insurancePlans) {
    // Simulate insurance coverage comparison
    return insurancePlans.map(plan => ({
        planName: plan.name || plan,
        covered: Math.random() > 0.2,
        tier: Math.floor(Math.random() * 4) + 1,
        copay: Math.random() * 25 + 5,
        coinsurance: Math.random() * 0.3 + 0.1,
        deductibleApplies: Math.random() > 0.6,
        priorAuthRequired: Math.random() > 0.8,
        quantityLimits: Math.random() > 0.7 ? '30-day supply' : null
    }));
}

async function getPharmacyPricing(genericName, pharmacyChain, location) {
    // Simulate pharmacy-specific pricing
    const basePrice = Math.random() * 80 + 30;

    return {
        retailPrice: basePrice,
        memberPrice: basePrice * 0.9, // 10% member discount
        cashDiscount: basePrice * 0.85, // 15% cash discount
        priceMatchPolicy: Math.random() > 0.5,
        discountPrograms: [
            'Pharmacy rewards program',
            'Generic drug discount',
            'Senior citizen discount'
        ],
        estimatedSavings: Math.random() * 20 + 5,
        lastUpdated: new Date().toISOString()
    };
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
    console.log(`Cross-Brand Comparator Microservice listening on port ${PORT}`);
});

module.exports = app;