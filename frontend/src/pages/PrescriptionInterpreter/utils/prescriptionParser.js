import natural from 'natural';
import { DrugDatabase } from './drugDatabase';

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();
const classifier = new natural.BayesClassifier();

class PrescriptionParser {
    constructor() {
        this.drugDb = new DrugDatabase();
        this.initializePatterns();
        this.initializeClassifier();
    }

    initializePatterns() {
        this.patterns = {
            medication: [
                /(?:take|use|apply)\s+(\d+\s*(?:mg|g|ml|mcg|IU)?\s*)?([A-Z][a-zA-Z\s\-]+?)(?:\s+(?:tablet|capsule|injection|cream|ointment|syrup|solution))?/gi,
                /([A-Z][a-zA-Z\s\-]+?)\s+(\d+\s*(?:mg|g|ml|mcg|IU)?)(?:\s+(?:tablets?|capsules?|injections?|creams?|ointments?|syrups?|solutions?))?/gi,
                /Rx:\s*([A-Z][a-zA-Z\s\-]+)/gi
            ],
            dosage: [
                /(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|IU|tablet|cap|spray|puff|patch))\s*(?:per\s*(?:dose|time))?/gi,
                /(\d+)\s*(?:x|times)\s*(?:per|daily|weekly|monthly)/gi,
                /once|twice|thrice|daily|weekly|monthly|as\s+needed/gi
            ],
            frequency: [
                /(\d+)\s*(?:times?\s*)?(?:per|a|every)\s*(?:day|week|month|hour)/gi,
                /(?:q\.?d\.?|daily)|(?:b\.?i\.?d\.?|twice\s+daily)|(?:t\.?i\.?d\.?|thrice\s+daily)|(?:q\.?i\.?d\.?|four\s+times\s+daily)/gi,
                /every\s+(\d+)\s*(?:hours?|days?|weeks?|months?)/gi
            ],
            duration: [
                /for\s+(\d+)\s*(?:days?|weeks?|months?|years?)/gi,
                /until\s+(?:finished|completed|all\s+taken)/gi,
                /as\s+(?:directed|needed)/gi
            ],
            instructions: [
                /(?:take|use|apply)\s+(?:with|without)\s+food/gi,
                /(?:before|after)\s+(?:meals|breakfast|lunch|dinner)/gi,
                /(?:do\s+not|avoid)\s+(?:alcohol|driving|operating\s+machinery)/gi,
                /store\s+(?:at|in)\s+(?:room\s+temperature|refrigerator|cool\s+dry\s+place)/gi
            ],
            warnings: [
                /(?:stop|discontinue)\s+(?:immediately|at\s+once)\s+if/gi,
                /(?:avoid|do\s+not)\s+(?:use|take)\s+(?:if|when)/gi,
                /(?:may\s+cause|side\s+effects\s+include)/gi,
                /(?:consult|contact)\s+(?:doctor|physician|pharmacist)\s+(?:if|when)/gi
            ]
        };
    }

    initializeClassifier() {
        // Train classifier with sample data
        const trainingData = [
            { text: 'Take one tablet daily', category: 'dosage' },
            { text: 'Apply cream twice daily', category: 'dosage' },
            { text: 'Use as needed', category: 'frequency' },
            { text: 'For 7 days', category: 'duration' },
            { text: 'With food', category: 'instructions' },
            { text: 'Avoid alcohol', category: 'warnings' },
            { text: 'May cause drowsiness', category: 'warnings' }
        ];

        trainingData.forEach(item => {
            classifier.addDocument(item.text, item.category);
        });

        classifier.train();
    }

    parse(text, options = {}) {
        if (!text || typeof text !== 'string') {
            return this.getEmptyResult();
        }

        const normalizedText = this.normalizeText(text);
        const sentences = this.splitIntoSentences(normalizedText);
        
        const result = {
            medications: [],
            dosages: [],
            frequencies: [],
            durations: [],
            instructions: [],
            warnings: [],
            confidence: 0,
            metadata: {
                originalText: text,
                processedText: normalizedText,
                sentenceCount: sentences.length,
                wordCount: tokenizer.tokenize(normalizedText).length
            }
        };

        // Extract using multiple strategies
        this.extractUsingPatterns(normalizedText, result);
        this.extractUsingNLP(normalizedText, result);
        this.extractUsingRules(normalizedText, result);
        
        // Validate and cross-reference
        this.validateAndCrossReference(result);
        
        // Calculate confidence
        result.confidence = this.calculateConfidence(result);
        
        // Enrich with drug database
        if (options.enrichWithDrugDb) {
            this.enrichWithDrugDatabase(result);
        }
        
        return result;
    }

    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/rx:/gi, 'prescription:')
            .replace(/sig:/gi, 'instructions:')
            .replace(/q\.?d\.?/gi, 'daily')
            .replace(/b\.?i\.?d\.?/gi, 'twice daily')
            .replace(/t\.?i\.?d\.?/gi, 'thrice daily')
            .replace(/q\.?i\.?d\.?/gi, 'four times daily')
            .replace(/p\.?r\.?n\.?/gi, 'as needed')
            .replace(/p\.?o\.?/gi, 'by mouth')
            .replace(/i\.?v\.?/gi, 'intravenous')
            .replace(/i\.?m\.?/gi, 'intramuscular')
            .trim();
    }

    splitIntoSentences(text) {
        return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    }

    extractUsingPatterns(text, result) {
        Object.entries(this.patterns).forEach(([category, patterns]) => {
            patterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const value = match[1] || match[0];
                    if (value && this.isValidValue(value, category)) {
                        this.addToResult(result, category, value, match.index);
                    }
                }
            });
        });
    }

    extractUsingNLP(text, result) {
        const sentences = this.splitIntoSentences(text);
        
        sentences.forEach(sentence => {
            const category = classifier.classify(sentence);
            const tokens = tokenizer.tokenize(sentence);
            
            if (category !== 'none') {
                const value = this.extractValueFromSentence(sentence, category);
                if (value) {
                    this.addToResult(result, category, value, text.indexOf(sentence));
                }
            }
            
            // Check for medication names
            tokens.forEach((token, index) => {
                if (this.isPotentialMedication(token)) {
                    const context = tokens.slice(Math.max(0, index - 2), index + 3).join(' ');
                    if (this.confirmMedication(context)) {
                        this.addToResult(result, 'medications', token, text.indexOf(token));
                    }
                }
            });
        });
    }

    extractUsingRules(text, result) {
        const rules = [
            {
                condition: (sentence) => sentence.includes('tablet') || sentence.includes('capsule'),
                action: (sentence, result) => {
                    const match = sentence.match(/(\d+)\s*(?:mg|g)?\s*(?:tablet|capsule)/);
                    if (match) {
                        this.addToResult(result, 'dosages', match[0], text.indexOf(sentence));
                    }
                }
            },
            {
                condition: (sentence) => sentence.includes('daily') || sentence.includes('weekly'),
                action: (sentence, result) => {
                    const freq = sentence.includes('daily') ? 'daily' : 'weekly';
                    this.addToResult(result, 'frequencies', freq, text.indexOf(sentence));
                }
            },
            {
                condition: (sentence) => sentence.includes('for') && (sentence.includes('day') || sentence.includes('week')),
                action: (sentence, result) => {
                    const match = sentence.match(/for\s+(\d+)\s*(?:days?|weeks?)/);
                    if (match) {
                        this.addToResult(result, 'durations', match[0], text.indexOf(sentence));
                    }
                }
            }
        ];

        const sentences = this.splitIntoSentences(text);
        sentences.forEach(sentence => {
            rules.forEach(rule => {
                if (rule.condition(sentence)) {
                    rule.action(sentence, result);
                }
            });
        });
    }

    validateAndCrossReference(result) {
        // Ensure arrays have same length
        const maxLength = Math.max(
            result.medications.length,
            result.dosages.length,
            result.frequencies.length
        );

        // Align arrays
        for (let i = 0; i < maxLength; i++) {
            if (!result.medications[i]) result.medications[i] = 'Unknown Medication';
            if (!result.dosages[i]) result.dosages[i] = 'Dosage not specified';
            if (!result.frequencies[i]) result.frequencies[i] = 'Frequency not specified';
            if (!result.durations[i]) result.durations[i] = 'Duration not specified';
        }

        // Remove duplicates while preserving order
        result.medications = [...new Set(result.medications)];
        result.warnings = [...new Set(result.warnings)];
    }

    calculateConfidence(result) {
        let score = 0;
        
        // Base score
        if (result.medications.length > 0) score += 40;
        if (result.dosages.length > 0) score += 30;
        if (result.frequencies.length > 0) score += 15;
        if (result.durations.length > 0) score += 10;
        if (result.instructions.length > 0) score += 5;
        
        // Quality adjustments
        const hasCompletePairs = result.medications.length === result.dosages.length;
        if (hasCompletePairs) score += 10;
        
        // Penalize for unknown medications
        const unknownMeds = result.medications.filter(m => m === 'Unknown Medication').length;
        score -= unknownMeds * 5;
        
        return Math.max(0, Math.min(100, score));
    }

    enrichWithDrugDatabase(result) {
        result.medications = result.medications.map(med => {
            const drugInfo = this.drugDb.lookup(med);
            if (drugInfo) {
                return {
                    name: med,
                    genericName: drugInfo.genericName,
                    brandNames: drugInfo.brandNames,
                    drugClass: drugInfo.drugClass,
                    uses: drugInfo.uses,
                    sideEffects: drugInfo.sideEffects,
                    interactions: drugInfo.interactions
                };
            }
            return med;
        });

        // Add warnings from drug database
        result.medications.forEach((med, index) => {
            if (typeof med === 'object' && med.interactions) {
                med.interactions.forEach(interaction => {
                    result.warnings.push(`Interaction warning: ${interaction}`);
                });
            }
        });
    }

    addToResult(result, category, value, position) {
        const array = result[category];
        if (array && !array.includes(value)) {
            array.push(value);
            
            // Store position for debugging
            if (!result.metadata.positions) {
                result.metadata.positions = {};
            }
            if (!result.metadata.positions[category]) {
                result.metadata.positions[category] = [];
            }
            result.metadata.positions[category].push({ value, position });
        }
    }

    isValidValue(value, category) {
        if (!value || value.trim().length < 2) return false;
        
        const trimmed = value.trim();
        
        switch (category) {
            case 'medications':
                return trimmed.length >= 3 && /[a-zA-Z]/.test(trimmed);
            case 'dosages':
                return /[\d]/.test(trimmed);
            case 'warnings':
                return trimmed.length >= 10;
            default:
                return trimmed.length >= 3;
        }
    }

    isPotentialMedication(token) {
        // Simple heuristic for medication names
        return (
            token.length >= 3 &&
            /^[A-Z]/.test(token) &&
            !this.isCommonWord(token) &&
            !this.isMeasurement(token)
        );
    }

    confirmMedication(context) {
        // Check context for medication indicators
        const indicators = ['tablet', 'capsule', 'mg', 'g', 'ml', 'prescribe', 'take', 'use'];
        return indicators.some(indicator => 
            context.toLowerCase().includes(indicator)
        );
    }

    extractValueFromSentence(sentence, category) {
        switch (category) {
            case 'dosage':
                return this.extractDosage(sentence);
            case 'frequency':
                return this.extractFrequency(sentence);
            case 'duration':
                return this.extractDuration(sentence);
            case 'instructions':
                return sentence;
            case 'warnings':
                return sentence;
            default:
                return null;
        }
    }

    extractDosage(sentence) {
        const patterns = [
            /(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|IU))\s*(?:per\s*(?:dose|time))?/,
            /(\d+)\s*(?:tablet|capsule|pill|tab|cap)/,
            /(\d+)\s*(?:spray|puff|drop|patch)/
        ];
        
        for (const pattern of patterns) {
            const match = sentence.match(pattern);
            if (match) return match[0];
        }
        
        return null;
    }

    extractFrequency(sentence) {
        const patterns = [
            /once\s+(?:daily|a\s+day)/,
            /twice\s+(?:daily|a\s+day)/,
            /thrice\s+(?:daily|a\s+day)/,
            /(\d+)\s*times?\s*(?:daily|per\s*day)/,
            /every\s+(\d+)\s*(?:hours?|days?)/
        ];
        
        for (const pattern of patterns) {
            const match = sentence.match(pattern);
            if (match) return match[0];
        }
        
        return null;
    }

    extractDuration(sentence) {
        const match = sentence.match(/for\s+(\d+)\s*(?:days?|weeks?|months?)/);
        return match ? match[0] : null;
    }

    isCommonWord(word) {
        const commonWords = [
            'the', 'and', 'for', 'with', 'take', 'use', 'apply',
            'before', 'after', 'during', 'food', 'meal', 'water'
        ];
        return commonWords.includes(word.toLowerCase());
    }

    isMeasurement(word) {
        const measurements = ['mg', 'g', 'ml', 'mcg', 'IU', 'tablet', 'capsule'];
        return measurements.includes(word.toLowerCase());
    }

    getEmptyResult() {
        return {
            medications: [],
            dosages: [],
            frequencies: [],
            durations: [],
            instructions: [],
            warnings: [],
            confidence: 0,
            metadata: {
                originalText: '',
                processedText: '',
                sentenceCount: 0,
                wordCount: 0,
                positions: {}
            }
        };
    }

    // Advanced parsing methods
    parseStructured(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const structured = {
            header: {},
            body: [],
            footer: {}
        };

        let currentSection = 'header';
        
        lines.forEach(line => {
            line = line.trim();
            
            // Detect section changes
            if (this.isHeaderLine(line)) {
                currentSection = 'header';
                this.parseHeaderLine(line, structured.header);
            } else if (this.isBodyLine(line)) {
                currentSection = 'body';
                this.parseBodyLine(line, structured.body);
            } else if (this.isFooterLine(line)) {
                currentSection = 'footer';
                this.parseFooterLine(line, structured.footer);
            } else {
                // Continue with current section
                this.addToSection(line, structured[currentSection]);
            }
        });

        return structured;
    }

    isHeaderLine(line) {
        return /^(patient|name|dob|date|dr\.|doctor)/i.test(line);
    }

    isBodyLine(line) {
        return /^[A-Z]/.test(line) || /^\d/.test(line) || /^Rx/i.test(line);
    }

    isFooterLine(line) {
        return /^(refill|dispense|quantity|signature)/i.test(line);
    }

    parseHeaderLine(line, header) {
        const [key, ...values] = line.split(/[:|\t]/).map(s => s.trim());
        if (key && values.length > 0) {
            header[key.toLowerCase()] = values.join(' ');
        }
    }

    parseBodyLine(line, body) {
        // Split by common delimiters
        const parts = line.split(/[\t,|;]/).map(s => s.trim()).filter(s => s);
        
        if (parts.length >= 2) {
            body.push({
                medication: parts[0],
                dosage: parts[1],
                instructions: parts.slice(2).join(' ')
            });
        } else if (parts.length === 1) {
            // Try to parse as natural language
            const parsed = this.parse(parts[0]);
            if (parsed.medications.length > 0) {
                body.push({
                    medication: parsed.medications[0],
                    dosage: parsed.dosages[0] || '',
                    instructions: parsed.instructions.join(' ')
                });
            }
        }
    }

    parseFooterLine(line, footer) {
        const [key, ...values] = line.split(/[:|\t]/).map(s => s.trim());
        if (key && values.length > 0) {
            footer[key.toLowerCase()] = values.join(' ');
        }
    }

    addToSection(line, section) {
        if (Array.isArray(section)) {
            section[section.length - 1] += ' ' + line;
        } else {
            // Find last key and append
            const keys = Object.keys(section);
            if (keys.length > 0) {
                const lastKey = keys[keys.length - 1];
                section[lastKey] += ' ' + line;
            }
        }
    }
}

// Export singleton instance
export const prescriptionParser = new PrescriptionParser();
export default prescriptionParser;