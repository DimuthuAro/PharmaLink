const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.TREATMENT_IDENTIFIER_PORT || 3005;

// ML Service URL (Python FastAPI — Treatment Identifier on port 8004)
const ML_SERVICE_URL = process.env.TREATMENT_ML_URL || 'http://localhost:8004';

// ── Local Knowledge Base ────────────────────────────────────
const ARTIFACTS_DIR = path.resolve(__dirname, '..', '..', '..', 'artifacts');
const INDEX_FILE = path.join(ARTIFACTS_DIR, 'drug_search_index.json');
const KB_FILE = path.join(ARTIFACTS_DIR, 'treatment_knowledge_base.json');
const SUFFIX_FILE = path.join(ARTIFACTS_DIR, 'drug_suffix_patterns.json');

let drugIndex = [];
let brandToGeneric = {};
let knowledgeBase = {};
let suffixPatterns = {};

function loadDatabases() {
    // Drug search index (brand → generic resolution)
    try {
        if (fs.existsSync(INDEX_FILE)) {
            drugIndex = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
            for (const entry of drugIndex) {
                const nameLower = (entry.name || '').toLowerCase().trim();
                if (entry.type === 'brand' && entry.generic) {
                    brandToGeneric[nameLower] = entry.generic.toLowerCase().trim();
                } else if (entry.type === 'generic') {
                    brandToGeneric[nameLower] = nameLower;
                }
            }
            console.log(`✓ Loaded drug index: ${drugIndex.length} entries, ${Object.keys(brandToGeneric).length} brand→generic mappings`);
        } else {
            console.warn(`⚠ Drug index not found: ${INDEX_FILE}`);
        }
    } catch (err) {
        console.error('Failed to load drug index:', err.message);
    }

    // Treatment knowledge base (curated drug → conditions)
    try {
        if (fs.existsSync(KB_FILE)) {
            knowledgeBase = JSON.parse(fs.readFileSync(KB_FILE, 'utf-8'));
            console.log(`✓ Loaded treatment knowledge base: ${Object.keys(knowledgeBase).length} entries`);
        } else {
            console.warn(`⚠ Treatment knowledge base not found: ${KB_FILE}`);
            console.warn('  Run: python -m ml_service.treatment_identifier.extract_data');
        }
    } catch (err) {
        console.error('Failed to load treatment knowledge base:', err.message);
    }

    // Suffix patterns (fallback)
    try {
        if (fs.existsSync(SUFFIX_FILE)) {
            suffixPatterns = JSON.parse(fs.readFileSync(SUFFIX_FILE, 'utf-8'));
            console.log(`✓ Loaded suffix patterns: ${Object.keys(suffixPatterns).length} patterns`);
        }
    } catch (err) {
        console.error('Failed to load suffix patterns:', err.message);
    }
}

loadDatabases();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug Middleware
app.use((req, res, next) => {
    console.log(`[Treatment Identifier] ${req.method} ${req.url}`);
    next();
});

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve a drug name (brand or generic) to its generic name.
 */
function resolveGeneric(drugName) {
    const name = drugName.toLowerCase().trim();
    if (brandToGeneric[name]) return brandToGeneric[name];

    // Strip dosage info
    const stripped = name.replace(/\s+\d+(\.\d+)?\s*(mg|g|ml|mcg|iu)\b.*$/i, '').trim();
    if (brandToGeneric[stripped]) return brandToGeneric[stripped];

    // Strip formulation suffixes (SR, CR, etc.)
    const stripped2 = stripped.replace(/\s+(SR|CR|ER|XR|XL|LA|MD|DT|OD|PR|MR|DS|CV|OZ|SP|HP)$/i, '').trim();
    if (brandToGeneric[stripped2]) return brandToGeneric[stripped2];

    return name;
}

/**
 * Get therapeutic class for a generic drug from the index.
 */
function getDrugClass(generic) {
    const gen = generic.toLowerCase().trim();
    for (const entry of drugIndex) {
        const entryGeneric = (entry.generic || '').toLowerCase().trim();
        const entryName = (entry.name || '').toLowerCase().trim();
        if (entryGeneric === gen || entryName === gen) {
            return entry.class || 'Unknown';
        }
    }
    return 'Unknown';
}

/**
 * THERAPEUTIC_CLASS_CONDITIONS — inline mapping for class-based fallback.
 */
const THERAPEUTIC_CLASS_CONDITIONS = {
    'ANTI DIABETIC': { conditions: ['Type 2 Diabetes', 'Hyperglycemia'], area: 'Endocrinology' },
    'ANTI DIABETI': { conditions: ['Type 2 Diabetes', 'Hyperglycemia'], area: 'Endocrinology' },
    'CARDIAC': { conditions: ['Hypertension', 'Heart Disease', 'Angina'], area: 'Cardiovascular' },
    'CARDIA': { conditions: ['Hypertension', 'Heart Disease', 'Angina'], area: 'Cardiovascular' },
    'ANTI INFECTIVES': { conditions: ['Bacterial Infection', 'Viral Infection'], area: 'Infectious Disease' },
    'ANTI INFECTIVE': { conditions: ['Bacterial Infection', 'Viral Infection'], area: 'Infectious Disease' },
    'PAIN ANALGESIC': { conditions: ['Pain', 'Inflammation', 'Fever'], area: 'Pain Management' },
    'PAIN ANALGESICS': { conditions: ['Pain', 'Inflammation', 'Fever'], area: 'Pain Management' },
    'NEURO CNS': { conditions: ['Epilepsy', 'Anxiety', 'Depression'], area: 'Neurology' },
    'NEURO CN': { conditions: ['Epilepsy', 'Anxiety', 'Depression'], area: 'Neurology' },
    'GASTRO INTESTINAL': { conditions: ['GERD', 'Peptic Ulcer', 'Nausea'], area: 'Gastroenterology' },
    'GASTRO INTESTINA': { conditions: ['GERD', 'Peptic Ulcer', 'Nausea'], area: 'Gastroenterology' },
    'RESPIRATORY': { conditions: ['Asthma', 'COPD', 'Allergic Rhinitis'], area: 'Respiratory' },
    'RESPIRATOR': { conditions: ['Asthma', 'COPD', 'Allergic Rhinitis'], area: 'Respiratory' },
    'BLOOD RELATED': { conditions: ['Anemia', 'Thrombosis', 'Bleeding Disorders'], area: 'Hematology' },
    'BLOOD RELATE': { conditions: ['Anemia', 'Thrombosis', 'Bleeding Disorders'], area: 'Hematology' },
    'DERMA': { conditions: ['Eczema', 'Psoriasis', 'Fungal Skin Infection'], area: 'Dermatology' },
    'DERM': { conditions: ['Eczema', 'Psoriasis', 'Fungal Skin Infection'], area: 'Dermatology' },
    'HORMONES': { conditions: ['Hypothyroidism', 'Hormonal Imbalance'], area: 'Endocrinology' },
    'HORMONE': { conditions: ['Hypothyroidism', 'Hormonal Imbalance'], area: 'Endocrinology' },
    'GYNAECOLOGICAL': { conditions: ['Menstrual Disorders', 'Contraception'], area: 'Gynecology' },
    'GYNAECOLOGICA': { conditions: ['Menstrual Disorders', 'Contraception'], area: 'Gynecology' },
    'OPHTHAL': { conditions: ['Glaucoma', 'Eye Infection', 'Dry Eye'], area: 'Ophthalmology' },
    'OPHTHA': { conditions: ['Glaucoma', 'Eye Infection', 'Dry Eye'], area: 'Ophthalmology' },
    'ANTI NEOPLASTIC': { conditions: ['Cancer', 'Malignant Neoplasm'], area: 'Oncology' },
    'ANTI NEOPLASTICS': { conditions: ['Cancer', 'Malignant Neoplasm'], area: 'Oncology' },
    'ANTI MALARIALS': { conditions: ['Malaria'], area: 'Infectious Disease' },
    'STOMATOLOGICALS': { conditions: ['Oral Ulcers', 'Gingivitis'], area: 'Dentistry' },
    'UROLOGY': { conditions: ['BPH', 'Urinary Incontinence'], area: 'Urology' },
    'VITAMINS MINERALS NUTRIENT': { conditions: ['Nutritional Deficiency'], area: 'General Medicine' },
    'VACCINE': { conditions: ['Immunization', 'Disease Prevention'], area: 'Preventive Medicine' },
    'VACCINES': { conditions: ['Immunization', 'Disease Prevention'], area: 'Preventive Medicine' },
    'OTOLOGICAL': { conditions: ['Ear Infection', 'Otitis'], area: 'ENT' },
    'OTHERS': { conditions: ['Various Conditions'], area: 'General Medicine' },
};

/**
 * Built-in suffix patterns for fallback matching.
 */
const BUILTIN_SUFFIX_PATTERNS = {
    'cillin$': { conditions: ['Bacterial Infection'], area: 'Infectious Disease' },
    'mycin$': { conditions: ['Bacterial Infection'], area: 'Infectious Disease' },
    'floxacin$': { conditions: ['Bacterial Infection', 'UTI'], area: 'Infectious Disease' },
    'cycline$': { conditions: ['Bacterial Infection', 'Acne'], area: 'Infectious Disease' },
    'azole$': { conditions: ['Fungal Infection'], area: 'Infectious Disease' },
    'statin$': { conditions: ['Hyperlipidemia', 'High Cholesterol'], area: 'Cardiovascular' },
    'sartan$': { conditions: ['Hypertension'], area: 'Cardiovascular' },
    'pril$': { conditions: ['Hypertension', 'Heart Failure'], area: 'Cardiovascular' },
    'olol$': { conditions: ['Hypertension', 'Angina'], area: 'Cardiovascular' },
    'dipine$': { conditions: ['Hypertension', 'Angina'], area: 'Cardiovascular' },
    'prazole$': { conditions: ['GERD', 'Peptic Ulcer'], area: 'Gastroenterology' },
    'tidine$': { conditions: ['GERD', 'Peptic Ulcer'], area: 'Gastroenterology' },
    'gliptin$': { conditions: ['Type 2 Diabetes'], area: 'Endocrinology' },
    'gliflozin$': { conditions: ['Type 2 Diabetes'], area: 'Endocrinology' },
    'formin$': { conditions: ['Type 2 Diabetes'], area: 'Endocrinology' },
    'setron$': { conditions: ['Nausea', 'Vomiting'], area: 'Gastroenterology' },
    'triptan$': { conditions: ['Migraine'], area: 'Neurology' },
    'pam$': { conditions: ['Anxiety', 'Insomnia'], area: 'Psychiatry' },
    'zepine$': { conditions: ['Epilepsy', 'Bipolar Disorder'], area: 'Neurology' },
    'mab$': { conditions: ['Autoimmune Disease', 'Cancer'], area: 'Oncology / Immunology' },
    'nib$': { conditions: ['Cancer'], area: 'Oncology' },
    'profen$': { conditions: ['Pain', 'Inflammation', 'Fever'], area: 'Pain Management' },
    'lukast$': { conditions: ['Asthma', 'Allergic Rhinitis'], area: 'Respiratory' },
    'semide$': { conditions: ['Edema', 'Heart Failure'], area: 'Cardiovascular' },
};

/**
 * Identify conditions for a single medication using three-tier approach:
 *  1. Knowledge base lookup (highest confidence)
 *  2. Suffix pattern matching
 *  3. Therapeutic class fallback
 */
function identifyConditionsForDrug(drugName) {
    const generic = resolveGeneric(drugName);
    let conditions = [];
    let source = 'none';

    // Tier 1: Knowledge base lookup
    if (knowledgeBase[generic]) {
        const entry = knowledgeBase[generic];
        source = entry.source || 'knowledge_base';
        const confidence = entry.confidence || 0.90;
        const area = entry.treatment_area || 'General Medicine';
        conditions = (entry.conditions || []).map(c => ({
            condition: c,
            confidence,
            treatment_area: area,
        }));
    }

    // Tier 2: Suffix pattern matching
    if (conditions.length === 0) {
        // Use suffix patterns from file or built-in
        const patterns = Object.keys(suffixPatterns).length > 0 ? suffixPatterns : BUILTIN_SUFFIX_PATTERNS;
        for (const [pattern, info] of Object.entries(patterns)) {
            try {
                const regex = new RegExp(pattern, 'i');
                if (regex.test(generic)) {
                    source = 'suffix_pattern';
                    const patternConditions = info.conditions || [];
                    const area = info.area || info.treatment_area || 'General Medicine';
                    conditions = patternConditions.map(c => ({
                        condition: c,
                        confidence: 0.60,
                        treatment_area: area,
                    }));
                    break;
                }
            } catch {
                // Invalid regex pattern, skip
            }
        }
    }

    // Tier 3: Therapeutic class fallback
    if (conditions.length === 0) {
        const drugClass = getDrugClass(generic);
        if (drugClass && drugClass !== 'Unknown') {
            const upperClass = drugClass.toUpperCase().trim();
            const classInfo = THERAPEUTIC_CLASS_CONDITIONS[upperClass];
            if (classInfo) {
                source = 'drug_class';
                conditions = classInfo.conditions.map(c => ({
                    condition: c,
                    confidence: 0.70,
                    treatment_area: classInfo.area,
                }));
            }
        }
    }

    return {
        medication: drugName,
        generic_name: generic,
        conditions,
        source,
    };
}

/**
 * Deduplicate conditions — keep the highest confidence for each.
 */
function dedupeConditions(conditions) {
    const best = {};
    for (const c of conditions) {
        const key = c.condition.toLowerCase();
        if (!best[key] || c.confidence > best[key].confidence) {
            best[key] = c;
        }
    }
    return Object.values(best).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Build a human-readable treatment summary.
 */
function buildSummary(combined) {
    if (combined.length === 0) {
        return 'Unable to determine treatment from the provided medications.';
    }

    const areas = {};
    for (const c of combined) {
        const area = c.treatment_area || 'General Medicine';
        if (!areas[area]) areas[area] = [];
        areas[area].push(c.condition);
    }

    const parts = [];
    const sorted = Object.entries(areas).sort((a, b) => b[1].length - a[1].length);
    for (const [area, conds] of sorted) {
        const unique = [...new Set(conds)];
        parts.push(`${area}: ${unique.slice(0, 3).join(', ')}`);
    }

    return 'Likely treatment areas – ' + parts.join('; ');
}

/**
 * Extract medication names from free text.
 */
function extractMedicationsFromText(text) {
    const medications = [];
    const seen = new Set();
    const textLower = text.toLowerCase();

    // Match against known drugs in the index
    for (const entry of drugIndex) {
        const name = entry.name || '';
        const nameLower = name.toLowerCase();
        if (nameLower.length >= 3 && textLower.includes(nameLower) && !seen.has(nameLower)) {
            seen.add(nameLower);
            medications.push(name);
        }
    }

    // Fallback: line-based extraction
    if (medications.length === 0) {
        const lines = text.split(/[\n,;]+/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length < 3) continue;
            const match = trimmed.match(/^([A-Za-z][A-Za-z\s-]+?)(?:\s+\d|\s*$)/);
            if (match) {
                const candidate = match[1].trim();
                if (candidate.length >= 3 && !seen.has(candidate.toLowerCase())) {
                    seen.add(candidate.toLowerCase());
                    medications.push(candidate);
                }
            }
        }
    }

    return medications.slice(0, 20);
}

// ═══════════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════════

// Health check
app.get('/health', async (req, res) => {
    let mlStatus = 'unknown';
    try {
        const mlRes = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
        mlStatus = mlRes.data;
    } catch {
        mlStatus = 'offline';
    }

    res.status(200).json({
        service: 'Treatment Identifier Microservice',
        status: 'OK',
        knowledgeBaseSize: Object.keys(knowledgeBase).length,
        drugIndexSize: drugIndex.length,
        mlService: mlStatus,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Identify treatments from a list of medications.
 * POST /identify
 * Body: { medications: ["Metformin", "Atorvastatin", "Amlodipine"] }
 */
app.post('/identify', async (req, res) => {
    try {
        const { medications } = req.body;

        if (!medications || !Array.isArray(medications) || medications.length === 0) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Medications array with at least 1 item is required',
            });
        }

        // Try ML Service first
        try {
            const mlRes = await axios.post(`${ML_SERVICE_URL}/identify`, { medications }, { timeout: 15000 });
            return res.json(mlRes.data);
        } catch (mlErr) {
            console.warn('ML service unavailable, using local knowledge base:', mlErr.message);
        }

        // Fallback to local knowledge base
        const start = Date.now();
        const results = [];
        const allConditions = [];

        for (const med of medications) {
            const result = identifyConditionsForDrug(med);
            results.push(result);
            allConditions.push(...result.conditions);
        }

        const combined = dedupeConditions(allConditions);
        const summary = buildSummary(combined);

        res.json({
            success: true,
            medications: results,
            combined_conditions: combined,
            likely_treatment_summary: summary,
            processing_time_ms: Date.now() - start,
        });
    } catch (error) {
        console.error('Treatment identification error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to identify treatments',
        });
    }
});

/**
 * Identify treatments from prescription text.
 * POST /identify-from-text
 * Body: { prescription_text: "Metformin 500mg, Atorvastatin 20mg ..." }
 */
app.post('/identify-from-text', async (req, res) => {
    try {
        const { prescription_text } = req.body;

        if (!prescription_text || typeof prescription_text !== 'string' || !prescription_text.trim()) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'prescription_text is required',
            });
        }

        // Try ML Service first
        try {
            const mlRes = await axios.post(
                `${ML_SERVICE_URL}/identify-from-text`,
                { prescription_text },
                { timeout: 15000 }
            );
            return res.json(mlRes.data);
        } catch (mlErr) {
            console.warn('ML service unavailable, using local fallback:', mlErr.message);
        }

        // Local fallback
        const start = Date.now();
        const extracted = extractMedicationsFromText(prescription_text);
        const results = [];
        const allConditions = [];

        for (const med of extracted) {
            const result = identifyConditionsForDrug(med);
            results.push(result);
            allConditions.push(...result.conditions);
        }

        const combined = dedupeConditions(allConditions);
        const summary = buildSummary(combined);

        res.json({
            success: true,
            extracted_medications: extracted,
            medications: results,
            combined_conditions: combined,
            likely_treatment_summary: summary,
            processing_time_ms: Date.now() - start,
        });
    } catch (error) {
        console.error('Treatment text identification error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to identify treatments from text',
        });
    }
});

/**
 * Get conditions for a single medication.
 * POST /medication-conditions
 * Body: { medication: "Metformin" }
 */
app.post('/medication-conditions', async (req, res) => {
    try {
        const { medication } = req.body;

        if (!medication || typeof medication !== 'string') {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'medication name is required',
            });
        }

        // Try ML Service first
        try {
            const mlRes = await axios.post(
                `${ML_SERVICE_URL}/medication-conditions`,
                { medication },
                { timeout: 10000 }
            );
            return res.json(mlRes.data);
        } catch {
            // Fallback to local
        }

        const result = identifyConditionsForDrug(medication);
        res.json(result);
    } catch (error) {
        console.error('Medication conditions error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get medication conditions',
        });
    }
});

/**
 * List all supported conditions.
 * GET /supported-conditions
 */
app.get('/supported-conditions', async (req, res) => {
    try {
        // Try ML Service first
        try {
            const mlRes = await axios.get(`${ML_SERVICE_URL}/supported-conditions`, { timeout: 5000 });
            return res.json(mlRes.data);
        } catch {
            // Fallback
        }

        const allConditions = new Set();

        // From knowledge base
        for (const entry of Object.values(knowledgeBase)) {
            for (const cond of entry.conditions || []) {
                allConditions.add(cond);
            }
        }

        // From therapeutic class map
        for (const classInfo of Object.values(THERAPEUTIC_CLASS_CONDITIONS)) {
            for (const cond of classInfo.conditions) {
                allConditions.add(cond);
            }
        }

        res.json({
            total: allConditions.size,
            conditions: [...allConditions].sort(),
        });
    } catch (error) {
        console.error('Supported conditions error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to list supported conditions',
        });
    }
});

/**
 * Search drugs by name.
 * GET /search?query=metf&limit=10
 */
app.get('/search', async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;

        if (!query) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Search query is required',
            });
        }

        const q = query.toLowerCase().trim();
        const maxResults = Math.min(parseInt(limit) || 10, 50);
        const results = [];
        const seen = new Set();

        // Generic name matches first
        for (const d of drugIndex) {
            if (results.length >= maxResults) break;
            if (d.type !== 'generic') continue;
            const lower = d.name.toLowerCase();
            if (lower.startsWith(q) && !seen.has(lower)) {
                seen.add(lower);
                const kbEntry = knowledgeBase[lower];
                results.push({
                    name: d.name,
                    type: 'generic',
                    conditions: kbEntry ? kbEntry.conditions : [],
                });
            }
        }

        // Brand name matches
        for (const d of drugIndex) {
            if (results.length >= maxResults) break;
            if (d.type !== 'brand') continue;
            const lower = d.name.toLowerCase();
            if (lower.startsWith(q) && !seen.has(lower)) {
                seen.add(lower);
                const generic = resolveGeneric(d.name);
                const kbEntry = knowledgeBase[generic];
                results.push({
                    name: d.name,
                    genericName: d.generic || '',
                    class: d.class || '',
                    type: 'brand',
                    conditions: kbEntry ? kbEntry.conditions : [],
                });
            }
        }

        // Contains matches
        if (results.length < maxResults) {
            for (const d of drugIndex) {
                if (results.length >= maxResults) break;
                const lower = d.name.toLowerCase();
                if (lower.includes(q) && !lower.startsWith(q) && !seen.has(lower)) {
                    seen.add(lower);
                    const generic = resolveGeneric(d.name);
                    const kbEntry = knowledgeBase[generic];
                    results.push({
                        name: d.name,
                        type: d.type,
                        genericName: d.generic || '',
                        class: d.class || '',
                        conditions: kbEntry ? kbEntry.conditions : [],
                    });
                }
            }
        }

        res.json({
            query,
            results,
            count: results.length,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Drug search error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to search drugs',
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The route ${req.originalUrl} does not exist`,
    });
});

app.listen(PORT, () => {
    console.log(`Treatment Identifier Microservice listening on port ${PORT}`);
    console.log(`ML Service URL: ${ML_SERVICE_URL}`);
});

module.exports = app;
