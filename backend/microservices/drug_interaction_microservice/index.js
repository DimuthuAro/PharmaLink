const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.DRUG_INTERACTION_PORT || 3001;

// ── Drug Database ───────────────────────────────────────────
const ARTIFACTS_DIR = path.resolve(__dirname, '..', '..', '..', 'artifacts');
const INDEX_FILE = path.join(ARTIFACTS_DIR, 'drug_search_index.json');
const INTERACTION_DB_FILE = path.join(ARTIFACTS_DIR, 'drug_interaction_db.json');
const DDI_DRUG_NAMES_FILE = path.join(ARTIFACTS_DIR, 'drug_interaction_drug_names.json');

let drugIndex = [];       // full list
let genericNames = [];    // just generics for fast filter
let brandNames = [];      // just brands for fast filter
let interactionDB = {};   // loaded from DrugBank DDI dataset (~191k pairs)

function loadDrugDatabase() {
    try {
        if (!fs.existsSync(INDEX_FILE)) {
            console.warn(`⚠ Drug index not found: ${INDEX_FILE}`);
            return;
        }
        const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
        drugIndex = JSON.parse(raw);
        genericNames = drugIndex.filter(d => d.type === 'generic');
        brandNames = drugIndex.filter(d => d.type === 'brand');

        // Merge DDI drug names into generic list (drugs that exist in DDI but not in MID)
        if (fs.existsSync(DDI_DRUG_NAMES_FILE)) {
            const ddiNames = JSON.parse(fs.readFileSync(DDI_DRUG_NAMES_FILE, 'utf-8'));
            const existingGenerics = new Set(genericNames.map(d => d.name.toLowerCase()));
            let added = 0;
            for (const name of ddiNames) {
                if (!existingGenerics.has(name.toLowerCase())) {
                    const entry = { name, type: 'generic' };
                    drugIndex.push(entry);
                    genericNames.push(entry);
                    existingGenerics.add(name.toLowerCase());
                    added++;
                }
            }
            if (added > 0) console.log(`  + Added ${added} drug names from DDI dataset`);
        }

        console.log(`✓ Loaded ${drugIndex.length} drugs (${genericNames.length} generics, ${brandNames.length} brands)`);
    } catch (err) {
        console.error('Failed to load drug database:', err.message);
    }
}

function loadInteractionDatabase() {
    try {
        if (!fs.existsSync(INTERACTION_DB_FILE)) {
            console.warn(`⚠ Interaction DB not found: ${INTERACTION_DB_FILE}`);
            console.warn('  Run: python ml_service/build_interaction_db.py');
            return;
        }
        const raw = fs.readFileSync(INTERACTION_DB_FILE, 'utf-8');
        interactionDB = JSON.parse(raw);
        const count = Object.keys(interactionDB).length;
        console.log(`✓ Loaded ${count.toLocaleString()} drug-drug interactions from DrugBank`);
    } catch (err) {
        console.error('Failed to load interaction database:', err.message);
    }
}

loadDrugDatabase();
loadInteractionDatabase();

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
        drugCount: drugIndex.length,
        genericCount: genericNames.length,
        interactionCount: Object.keys(interactionDB).length,
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

// ── Real drug search against loaded database ────────────────
async function searchDrugs(query, limit) {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results = [];
    const seen = new Set();

    // 1) Exact-start matches on generics (highest priority)
    for (const d of genericNames) {
        if (results.length >= limit) break;
        const lower = d.name.toLowerCase();
        if (lower.startsWith(q) && !seen.has(lower)) {
            seen.add(lower);
            results.push({ name: d.name, type: 'generic' });
        }
    }

    // 2) Exact-start matches on brand names
    for (const d of brandNames) {
        if (results.length >= limit) break;
        const lower = d.name.toLowerCase();
        if (lower.startsWith(q) && !seen.has(lower)) {
            seen.add(lower);
            results.push({
                name: d.name,
                genericName: d.generic || '',
                class: d.class || '',
                type: 'brand'
            });
        }
    }

    // 3) Contains matches (broader) if we still need more
    if (results.length < limit) {
        for (const d of drugIndex) {
            if (results.length >= limit) break;
            const lower = d.name.toLowerCase();
            if (lower.includes(q) && !lower.startsWith(q) && !seen.has(lower)) {
                seen.add(lower);
                if (d.type === 'generic') {
                    results.push({ name: d.name, type: 'generic' });
                } else {
                    results.push({
                        name: d.name,
                        genericName: d.generic || '',
                        class: d.class || '',
                        type: 'brand'
                    });
                }
            }
        }
    }

    // 4) Generic ingredient match for brand entries
    if (results.length < limit) {
        for (const d of brandNames) {
            if (results.length >= limit) break;
            const lower = d.name.toLowerCase();
            if (d.generic && d.generic.toLowerCase().includes(q) && !seen.has(lower)) {
                seen.add(lower);
                results.push({
                    name: d.name,
                    genericName: d.generic || '',
                    class: d.class || '',
                    type: 'brand'
                });
            }
        }
    }

    return results;
}

async function checkDrugInteractions(drugs) {
    // Common drug name synonyms → DrugBank INN names
    const drugSynonyms = {
        'aspirin': 'acetylsalicylic acid',
        'paracetamol': 'acetaminophen',
        'tylenol': 'acetaminophen',
        'advil': 'ibuprofen',
        'motrin': 'ibuprofen',
        'aleve': 'naproxen',
        'lipitor': 'atorvastatin',
        'zocor': 'simvastatin',
        'glucophage': 'metformin',
        'coumadin': 'warfarin',
        'plavix': 'clopidogrel',
        'prilosec': 'omeprazole',
        'nexium': 'esomeprazole',
        'zantac': 'ranitidine',
        'synthroid': 'levothyroxine',
        'lopressor': 'metoprolol',
        'norvasc': 'amlodipine',
        'zestril': 'lisinopril',
        'prinivil': 'lisinopril',
        'cozaar': 'losartan',
        'diovan': 'valsartan',
        'prozac': 'fluoxetine',
        'zoloft': 'sertraline',
        'lexapro': 'escitalopram',
        'xanax': 'alprazolam',
        'valium': 'diazepam',
        'ativan': 'lorazepam',
        'ambien': 'zolpidem',
        'lasix': 'furosemide',
        'augmentin': 'amoxicillin',
        'cipro': 'ciprofloxacin',
        'flagyl': 'metronidazole',
        'diflucan': 'fluconazole',
        'prednisone': 'prednisolone',
        'lanoxin': 'digoxin',
        'cordarone': 'amiodarone',
        'dilantin': 'phenytoin',
        'ultram': 'tramadol',
        'biaxin': 'clarithromycin',
        'aldactone': 'spironolactone',
        'humulin': 'insulin',
        'amaryl': 'glimepiride',
        'cardizem': 'diltiazem',
        'calan': 'verapamil',
        'iscover': 'clopidogrel',
        'aspro': 'acetylsalicylic acid',
        'disprin': 'acetylsalicylic acid',
        'ecosprin': 'acetylsalicylic acid',
        'acetylsalicylic acid': 'acetylsalicylic acid',
    };

    // Resolve brand names to generic ingredients, then to DDI names
    function resolveGeneric(name) {
        const lower = name.toLowerCase().trim();

        // 1) Check synonym table first
        if (drugSynonyms[lower]) return drugSynonyms[lower];

        // 2) Direct match in drug index
        const entry = drugIndex.find(d => d.name.toLowerCase() === lower);
        if (entry) {
            const generic = (entry.generic || entry.name).toLowerCase();
            // Also check if the resolved generic has a synonym
            return drugSynonyms[generic] || generic;
        }

        // 3) Strip dosage info ("Aspirin 300mg Tablet" → "aspirin")
        const stripped = lower.replace(/\s+\d+\s*(mg|g|ml|mcg|iu)\b.*$/i, '').trim();
        if (drugSynonyms[stripped]) return drugSynonyms[stripped];

        const entry2 = drugIndex.find(d => d.name.toLowerCase() === stripped);
        if (entry2) {
            const generic = (entry2.generic || entry2.name).toLowerCase();
            return drugSynonyms[generic] || generic;
        }

        return drugSynonyms[lower] || lower;
    }

    // Lookup from the loaded DrugBank interaction database (~191k pairs)
    function lookupInteraction(g1, g2) {
        const key = [g1, g2].sort().join('|');
        return interactionDB[key] || null;
    }

    const interactions = [];
    for (let i = 0; i < drugs.length; i++) {
        for (let j = i + 1; j < drugs.length; j++) {
            const g1 = resolveGeneric(drugs[i]);
            const g2 = resolveGeneric(drugs[j]);
            const result = lookupInteraction(g1, g2);
            if (result) {
                interactions.push({
                    drug1: drugs[i],
                    drug2: drugs[j],
                    severity: result.severity,
                    confidence: result.severity === 'severe' ? 0.95
                        : result.severity === 'moderate' ? 0.85 : 0.75,
                    description: result.description,
                    recommendation: result.severity === 'severe' ? 'Consult healthcare provider immediately'
                        : result.severity === 'moderate' ? 'Discuss with pharmacist before combining'
                            : 'Monitor and use with caution'
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
    const match = drugIndex.find(d => d.name.toLowerCase() === drugId.toLowerCase());
    if (match) {
        return {
            id: drugId,
            name: match.name,
            genericName: match.generic || match.name,
            type: match.type,
            class: match.class || '',
        };
    }
    return null;
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