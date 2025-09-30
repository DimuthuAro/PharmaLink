const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PRESCRIPTION_PORT || 3004;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/prescriptions/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'prescription-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
        }
    }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = 'uploads/prescriptions';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.get('/health', (req, res) => {
    res.status(200).json({
        service: 'Prescription Interpreter Microservice',
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Upload and interpret prescription image
app.post('/interpret', upload.single('prescription'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Prescription image is required'
            });
        }

        const { patientInfo } = req.body;
        const interpretation = await interpretPrescription(req.file.path, patientInfo);

        res.json({
            filename: req.file.filename,
            originalname: req.file.originalname,
            interpretation,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Prescription interpretation error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to interpret prescription'
        });
    }
});

// Analyze prescription text (manual input)
app.post('/analyze-text', async (req, res) => {
    try {
        const { prescriptionText, patientInfo } = req.body;

        if (!prescriptionText) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Prescription text is required'
            });
        }

        const analysis = await analyzePrescriptionText(prescriptionText, patientInfo);

        res.json({
            inputText: prescriptionText,
            analysis,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Prescription text analysis error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to analyze prescription text'
        });
    }
});

// Validate prescription format and content
app.post('/validate', async (req, res) => {
    try {
        const { prescriptionData } = req.body;

        if (!prescriptionData) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Prescription data is required'
            });
        }

        const validation = await validatePrescription(prescriptionData);

        res.json({
            prescriptionData,
            validation,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Prescription validation error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to validate prescription'
        });
    }
});

// Extract structured data from prescription
app.post('/extract', async (req, res) => {
    try {
        const { rawPrescriptionData, format } = req.body;

        if (!rawPrescriptionData) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Raw prescription data is required'
            });
        }

        const extractedData = await extractStructuredData(rawPrescriptionData, format);

        res.json({
            rawData: rawPrescriptionData,
            extractedData,
            format,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Data extraction error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to extract structured data'
        });
    }
});

// Generate prescription summary
app.post('/summarize', async (req, res) => {
    try {
        const { prescriptionData, patientProfile } = req.body;

        if (!prescriptionData) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Prescription data is required'
            });
        }

        const summary = await generatePrescriptionSummary(prescriptionData, patientProfile);

        res.json({
            prescriptionData,
            summary,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Prescription summarization error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate prescription summary'
        });
    }
});

// Placeholder functions - implement with actual OCR, NLP, and medical knowledge
async function interpretPrescription(imagePath, patientInfo) {
    // Simulate OCR and prescription interpretation
    const ocrResults = {
        confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
        extractedText: `
      Dr. John Smith, MD
      123 Medical Center Dr.
      
      Patient: ${patientInfo?.name || 'John Doe'}
      DOB: ${patientInfo?.dob || '01/01/1980'}
      
      Rx:
      1. Lisinopril 10mg - Take 1 tablet daily
      2. Metformin 500mg - Take 2 tablets twice daily with meals
      3. Atorvastatin 20mg - Take 1 tablet at bedtime
      
      Refills: 2
      Date: ${new Date().toLocaleDateString()}
      DEA#: BS1234567
    `
    };

    const structuredData = await analyzePrescriptionText(ocrResults.extractedText, patientInfo);

    return {
        ocrResults,
        structuredData,
        processingNotes: [
            'Image quality: Good',
            'Handwriting legibility: High',
            'All required fields detected'
        ]
    };
}

async function analyzePrescriptionText(prescriptionText, patientInfo) {
    // Simulate NLP analysis of prescription text
    const medications = [
        {
            name: 'Lisinopril',
            dosage: '10mg',
            frequency: 'Once daily',
            instructions: 'Take 1 tablet daily',
            duration: 'Ongoing',
            refills: 2,
            category: 'ACE Inhibitor',
            indication: 'Hypertension'
        },
        {
            name: 'Metformin',
            dosage: '500mg',
            frequency: 'Twice daily',
            instructions: 'Take 2 tablets twice daily with meals',
            duration: 'Ongoing',
            refills: 2,
            category: 'Antidiabetic',
            indication: 'Type 2 Diabetes'
        },
        {
            name: 'Atorvastatin',
            dosage: '20mg',
            frequency: 'Once daily at bedtime',
            instructions: 'Take 1 tablet at bedtime',
            duration: 'Ongoing',
            refills: 2,
            category: 'Statin',
            indication: 'Hypercholesterolemia'
        }
    ];

    const doctorInfo = {
        name: 'Dr. John Smith, MD',
        deaNumber: 'BS1234567',
        address: '123 Medical Center Dr.',
        phoneNumber: '(555) 123-4567'
    };

    const patientDetails = {
        name: patientInfo?.name || 'John Doe',
        dob: patientInfo?.dob || '01/01/1980',
        address: patientInfo?.address || 'Not specified'
    };

    return {
        medications,
        doctorInfo,
        patientDetails,
        prescriptionDate: new Date().toISOString().split('T')[0],
        totalMedications: medications.length,
        estimatedMonthlyCost: Math.random() * 200 + 50
    };
}

async function validatePrescription(prescriptionData) {
    const validationResults = {
        isValid: true,
        errors: [],
        warnings: [],
        score: 100
    };

    // Simulate validation checks
    if (!prescriptionData.doctorInfo?.deaNumber) {
        validationResults.errors.push('DEA number missing');
        validationResults.isValid = false;
        validationResults.score -= 20;
    }

    if (!prescriptionData.patientDetails?.name) {
        validationResults.errors.push('Patient name missing');
        validationResults.isValid = false;
        validationResults.score -= 15;
    }

    if (prescriptionData.medications?.length === 0) {
        validationResults.errors.push('No medications specified');
        validationResults.isValid = false;
        validationResults.score -= 30;
    }

    // Check for potential drug interactions
    if (prescriptionData.medications?.length > 1) {
        validationResults.warnings.push('Multiple medications - check for interactions');
        validationResults.score -= 5;
    }

    // Check dosage ranges
    prescriptionData.medications?.forEach(med => {
        if (!med.dosage || !med.frequency) {
            validationResults.warnings.push(`Incomplete dosage information for ${med.name}`);
            validationResults.score -= 10;
        }
    });

    return validationResults;
}

async function extractStructuredData(rawData, format) {
    // Simulate structured data extraction
    return {
        medications: [
            {
                ndc: '12345-678-90',
                name: 'Lisinopril',
                genericName: 'Lisinopril',
                strength: '10mg',
                dosageForm: 'tablet',
                quantity: 30,
                daysSupply: 30,
                sig: '1 tablet by mouth daily'
            }
        ],
        pharmacy: {
            name: 'Local Pharmacy',
            address: '456 Pharmacy St.',
            phoneNumber: '(555) 987-6543',
            npi: '1234567890'
        },
        insurance: {
            planName: 'Health Insurance Plan',
            memberID: 'ABC123456',
            groupNumber: 'GRP789',
            copay: 10.00
        },
        extractionMetadata: {
            format: format || 'auto-detected',
            confidence: 0.92,
            extractedFields: 15,
            missingFields: 2
        }
    };
}

async function generatePrescriptionSummary(prescriptionData, patientProfile) {
    // Simulate prescription summary generation
    const totalMedications = prescriptionData.medications?.length || 0;
    const estimatedCost = prescriptionData.medications?.reduce((sum, med) => {
        return sum + (Math.random() * 50 + 10);
    }, 0) || 0;

    return {
        overview: {
            totalMedications,
            estimatedMonthlyCost: Math.round(estimatedCost * 100) / 100,
            refillsNeeded: prescriptionData.medications?.some(med => med.refills < 1),
            chronicMedications: totalMedications > 2
        },
        medicationSummary: prescriptionData.medications?.map(med => ({
            name: med.name,
            purpose: med.indication || 'As prescribed',
            frequency: med.frequency,
            importantNotes: [
                'Take as directed',
                'Do not stop without consulting doctor'
            ]
        })) || [],
        recommendations: [
            'Set up medication reminders',
            'Review with pharmacist',
            'Monitor for side effects',
            'Schedule follow-up appointment'
        ],
        nextSteps: [
            'Fill prescription at pharmacy',
            'Verify insurance coverage',
            'Ask pharmacist about generic options',
            'Set up refill reminders'
        ]
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
    console.log(`Prescription Interpreter Microservice listening on port ${PORT}`);
});

module.exports = app;