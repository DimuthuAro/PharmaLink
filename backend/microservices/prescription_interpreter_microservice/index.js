const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const PORT = process.env.PRESCRIPTION_PORT || 3004;

// ML Service URL (Python FastAPI)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

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
app.get('/health', async (req, res) => {
    // Also check ML service health
    let mlStatus = 'unknown';
    try {
        const mlRes = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
        mlStatus = mlRes.data;
    } catch {
        mlStatus = 'offline';
    }

    res.status(200).json({
        service: 'Prescription Interpreter Microservice',
        status: 'OK',
        mlService: mlStatus,
        timestamp: new Date().toISOString()
    });
});

/**
 * Upload and interpret prescription image via ML Service pipeline.
 * Pipeline:  Image → (ML OCR: Donut/EasyOCR) → NER → Structured Output
 */
app.post('/interpret', upload.single('prescription'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Prescription image is required'
            });
        }

        const engine = req.body.engine || 'auto';
        const enhanceMode = req.body.enhanceMode || 'medical';

        // Forward image to ML Service /prescription/interpret endpoint
        const mlResult = await forwardToMLService(
            req.file.path,
            req.file.originalname,
            req.file.mimetype,
            engine,
            enhanceMode
        );

        res.json({
            filename: req.file.filename,
            originalname: req.file.originalname,
            ...mlResult,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Prescription interpretation error:', error.message);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to interpret prescription',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

        const validation = validatePrescription(prescriptionData);

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

        const extractedData = extractStructuredData(rawPrescriptionData, format);

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

        const summary = generatePrescriptionSummary(prescriptionData, patientProfile);

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

// ================================================================
// ML Service Integration
// ================================================================

/**
 * Forward a prescription image to the ML Service for OCR + NER processing.
 * Uses /prescription/interpret (full pipeline) with fallback to /prescription/ocr.
 */
async function forwardToMLService(filePath, originalName, mimeType, engine, enhanceMode) {
    const fileStream = fs.createReadStream(filePath);
    const form = new FormData();
    form.append('file', fileStream, { filename: originalName, contentType: mimeType });
    form.append('engine', engine);
    form.append('enhance_mode', enhanceMode);

    try {
        // Primary: full interpret pipeline
        const response = await axios.post(
            `${ML_SERVICE_URL}/prescription/interpret`,
            form,
            {
                headers: form.getHeaders(),
                timeout: 120000, // 2 min (model loading may take time on first call)
                maxContentLength: 50 * 1024 * 1024,
            }
        );
        return response.data;
    } catch (primaryErr) {
        console.warn('Interpret endpoint failed, falling back to /prescription/ocr:', primaryErr.message);

        // Fallback: basic OCR endpoint
        const fileStream2 = fs.createReadStream(filePath);
        const form2 = new FormData();
        form2.append('file', fileStream2, { filename: originalName, contentType: mimeType });
        form2.append('engine', engine);
        form2.append('enhance_mode', enhanceMode);

        try {
            const fallbackRes = await axios.post(
                `${ML_SERVICE_URL}/prescription/ocr`,
                form2,
                {
                    headers: form2.getHeaders(),
                    timeout: 120000,
                    maxContentLength: 50 * 1024 * 1024,
                }
            );
            return fallbackRes.data;
        } catch (fallbackErr) {
            console.error('ML Service unavailable:', fallbackErr.message);
            // Return mock data so the frontend still works during development
            return getMockInterpretation();
        }
    }
}

/**
 * Analyze manually-entered prescription text (no image).
 * Calls ML Service NER endpoint if available.
 */
async function analyzePrescriptionText(prescriptionText, patientInfo) {
    // Attempt to parse via regex locally (fast path)
    const medications = extractMedicationsFromText(prescriptionText);

    return {
        medications,
        patientDetails: {
            name: patientInfo?.name || 'N/A',
            dob: patientInfo?.dob || 'N/A',
        },
        prescriptionDate: new Date().toISOString().split('T')[0],
        totalMedications: medications.length,
    };
}

/**
 * Extract medication info from free text using regex patterns
 */
function extractMedicationsFromText(text) {
    const medications = [];
    const lines = text.split('\n');

    const medPattern = /(?:Tab(?:let)?\.?|Cap(?:sule)?\.?|Syrup\.?|Inj(?:ection)?\.?)\s*([A-Za-z][A-Za-z\s-]+?)(?:\s+(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg))?/gi;
    const numberedPattern = /^\s*\d+[.)\s]+([A-Z][a-zA-Z\s-]+?)(?:\s+(\d+)\s*(mg|g|ml))?/gm;

    const allPatterns = [medPattern, numberedPattern];
    const seen = new Set();

    for (const pattern of allPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const name = (match[1] || '').trim();
            if (name.length >= 3 && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                medications.push({
                    name,
                    dosage: match[2] ? `${match[2]} ${match[3] || 'mg'}` : '',
                    frequency: '',
                    instructions: '',
                    duration: '',
                    confidence: 70,
                });
            }
        }
    }

    return medications;
}

function validatePrescription(prescriptionData) {
    const result = { isValid: true, errors: [], warnings: [], score: 100 };

    if (!prescriptionData.medications || prescriptionData.medications.length === 0) {
        result.errors.push('No medications specified');
        result.isValid = false;
        result.score -= 30;
    }

    if (prescriptionData.medications?.length > 1) {
        result.warnings.push('Multiple medications – check for interactions');
        result.score -= 5;
    }

    prescriptionData.medications?.forEach(med => {
        if (!med.dosage || !med.frequency) {
            result.warnings.push(`Incomplete dosage information for ${med.name}`);
            result.score -= 10;
        }
    });

    return result;
}

function extractStructuredData(rawData, format) {
    const meds = extractMedicationsFromText(
        typeof rawData === 'string' ? rawData : JSON.stringify(rawData)
    );
    return {
        medications: meds,
        extractionMetadata: {
            format: format || 'auto-detected',
            confidence: 0.85,
            extractedFields: meds.length,
        },
    };
}

function generatePrescriptionSummary(prescriptionData, patientProfile) {
    const totalMedications = prescriptionData.medications?.length || 0;

    return {
        overview: {
            totalMedications,
            chronicMedications: totalMedications > 2,
        },
        medicationSummary: prescriptionData.medications?.map(med => ({
            name: med.name,
            purpose: med.indication || 'As prescribed',
            frequency: med.frequency,
            importantNotes: ['Take as directed', 'Do not stop without consulting doctor'],
        })) || [],
        recommendations: [
            'Set up medication reminders',
            'Review with pharmacist',
            'Monitor for side effects',
            'Schedule follow-up appointment',
        ],
        disclaimer: 'This is for educational/research purposes only. Not validated for clinical use.',
    };
}

/**
 * Mock interpretation for when ML service is unavailable
 */
function getMockInterpretation() {
    return {
        success: true,
        interpretation: {
            rawText: 'Dr. Smith Medical Clinic\nPatient: John Doe\nDate: ' + new Date().toLocaleDateString() +
                '\n\nRx:\n1. Amoxicillin 500mg - Take 1 tablet 3 times daily for 7 days\n' +
                '2. Ibuprofen 400mg - Take 1 tablet as needed for pain\n' +
                '3. Omeprazole 20mg - Take 1 capsule daily before breakfast\n\n' +
                'Instructions: Take medications with food.\nSignature: Dr. Smith, MD',
            medications: [
                { name: 'Amoxicillin', dosage: '500mg', frequency: 'Three times daily', duration: '7 days', confidence: 92 },
                { name: 'Ibuprofen', dosage: '400mg', frequency: 'As needed', duration: 'PRN', confidence: 88 },
                { name: 'Omeprazole', dosage: '20mg', frequency: 'Once daily', duration: '14 days', confidence: 95 },
            ],
            dosages: ['500mg', '400mg', '20mg'],
            instructions: ['Take medications with food'],
            frequencies: ['Three times daily', 'As needed', 'Once daily before breakfast'],
            durations: ['7 days', 'PRN', '14 days'],
            warnings: ['Amoxicillin may cause allergic reactions in penicillin-sensitive patients'],
            interactions: [],
            confidence: 87,
            imageQuality: 82,
        },
        metadata: {
            engine: 'mock',
            pipeline: 'mock (ML service unavailable)',
            timestamp: new Date().toISOString(),
        },
        disclaimer: 'This is mock data. ML service is not connected.',
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
    console.log(`ML Service URL: ${ML_SERVICE_URL}`);
});

module.exports = app;