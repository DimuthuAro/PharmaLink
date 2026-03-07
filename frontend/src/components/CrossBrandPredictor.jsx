// CrossBrandPredictor.jsx - Cross-Brand DDI Prediction Component
// Displays formulation-aware drug interaction predictions
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    BeakerIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    MinusIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    SparklesIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ArrowPathIcon,
    ShieldExclamationIcon,
    DocumentTextIcon,
    AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon } from '@heroicons/react/24/solid';

// ML Service API Configuration
const ML_SERVICE_BASE = import.meta.env.VITE_ML_SERVICE_API || 'http://localhost:8000';

// Severity color mapping
const SEVERITY_CONFIG = {
    critical: {
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-800',
        icon: 'text-red-600',
        gradient: 'from-red-500 to-rose-600',
        badge: 'bg-red-100 text-red-800 border-red-200'
    },
    high: {
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        text: 'text-orange-800',
        icon: 'text-orange-600',
        gradient: 'from-orange-500 to-amber-600',
        badge: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    moderate: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-300',
        text: 'text-yellow-800',
        icon: 'text-yellow-600',
        gradient: 'from-yellow-500 to-amber-500',
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    low: {
        bg: 'bg-blue-50',
        border: 'border-blue-300',
        text: 'text-blue-800',
        icon: 'text-blue-600',
        gradient: 'from-blue-500 to-cyan-500',
        badge: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    minimal: {
        bg: 'bg-green-50',
        border: 'border-green-300',
        text: 'text-green-800',
        icon: 'text-green-600',
        gradient: 'from-green-500 to-emerald-500',
        badge: 'bg-green-100 text-green-800 border-green-200'
    }
};

// Risk modifier icons and colors
const MODIFIER_CONFIG = {
    mitigates: {
        icon: ArrowTrendingDownIcon,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'Mitigates Risk'
    },
    potentiates: {
        icon: ArrowTrendingUpIcon,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'Potentiates Risk'
    },
    neutral: {
        icon: MinusIcon,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'Neutral'
    }
};

// Risk gauge component
const RiskGauge = ({ risk, label, isBase = false }) => {
    const percentage = Math.round(risk * 100);
    const severity = risk >= 0.8 ? 'critical' : risk >= 0.6 ? 'high' : risk >= 0.4 ? 'moderate' : risk >= 0.2 ? 'low' : 'minimal';
    const config = SEVERITY_CONFIG[severity];

    return (
        <div className={`relative ${isBase ? 'opacity-75' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className={`text-lg font-bold ${config.text}`}>{percentage}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${config.gradient} transition-all duration-1000 ease-out rounded-full`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {isBase && (
                <div className="absolute -right-2 top-0 text-xs text-gray-400">(base)</div>
            )}
        </div>
    );
};

// Adjustment indicator component
const AdjustmentIndicator = ({ adjustment, modifier }) => {
    const adjustmentPct = Math.round(Math.abs(adjustment) * 100);
    const config = MODIFIER_CONFIG[modifier] || MODIFIER_CONFIG.neutral;
    const Icon = config.icon;

    if (adjustmentPct === 0) {
        return (
            <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                    <MinusIcon className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-600 font-medium">No Formulation Adjustment</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center py-4">
            <div className={`flex items-center gap-3 px-4 py-2 ${config.bg} rounded-full`}>
                <Icon className={`w-6 h-6 ${config.color}`} />
                <div className="text-center">
                    <div className={`text-lg font-bold ${config.color}`}>
                        {modifier === 'mitigates' ? '-' : '+'}{adjustmentPct}%
                    </div>
                    <div className="text-xs text-gray-600">{config.label}</div>
                </div>
            </div>
        </div>
    );
};

// Drug info card component
const DrugInfoCard = ({ drugInfo, label }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800">{label}</h4>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                    {expanded ? (
                        <ChevronUpIcon className="w-5 h-5" />
                    ) : (
                        <ChevronDownIcon className="w-5 h-5" />
                    )}
                </button>
            </div>

            <div className="space-y-2">
                <div>
                    <span className="text-lg font-bold text-indigo-600">
                        {drugInfo.trade_name}
                    </span>
                </div>
                <div className="text-sm text-gray-600">
                    <span className="font-medium">Active Ingredient:</span>{' '}
                    {drugInfo.ingredient_base}
                </div>

                {/* Formulation badges */}
                <div className="flex flex-wrap gap-2 mt-2">
                    {drugInfo.is_extended_release && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                            Extended Release
                        </span>
                    )}
                    {drugInfo.is_delayed_release && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            Delayed Release
                        </span>
                    )}
                    {drugInfo.route && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {drugInfo.route}
                        </span>
                    )}
                    {drugInfo.strength && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                            {drugInfo.strength}
                        </span>
                    )}
                </div>

                {/* Expanded details */}
                {expanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm text-gray-600">
                        {drugInfo.dosage_form && (
                            <div><span className="font-medium">Form:</span> {drugInfo.dosage_form}</div>
                        )}
                        {drugInfo.manufacturer && (
                            <div><span className="font-medium">Manufacturer:</span> {drugInfo.manufacturer}</div>
                        )}
                        <div>
                            <span className="font-medium">Resolution:</span>{' '}
                            <span className={drugInfo.resolution_method === 'lexicon' ? 'text-green-600' : 'text-yellow-600'}>
                                {drugInfo.resolution_method === 'lexicon' ? 'FDA Orange Book' : 'Name Parsing'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Key factors component
const FormulationFactors = ({ factors }) => {
    if (!factors || factors.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center gap-2 mb-3">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-indigo-600" />
                <h4 className="font-semibold text-gray-800">Key Formulation Factors</h4>
            </div>
            <div className="space-y-2">
                {factors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                        <div className={`mt-0.5 ${factor.direction === 'mitigating' ? 'text-green-500' : 'text-red-500'}`}>
                            {factor.direction === 'mitigating' ? (
                                <ArrowTrendingDownIcon className="w-5 h-5" />
                            ) : (
                                <ArrowTrendingUpIcon className="w-5 h-5" />
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-gray-800 capitalize">
                                {factor.factor.replace(/_/g, ' ')}
                                {factor.drug && factor.drug !== 'both' && (
                                    <span className="text-indigo-600 ml-1">({factor.drug})</span>
                                )}
                            </div>
                            <div className="text-sm text-gray-600">{factor.impact}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Recommendations component
const Recommendations = ({ recommendations, severity }) => {
    const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.moderate;

    return (
        <div className={`${config.bg} rounded-lg p-4 border ${config.border}`}>
            <div className="flex items-center gap-2 mb-3">
                <ShieldExclamationIcon className={`w-5 h-5 ${config.icon}`} />
                <h4 className={`font-semibold ${config.text}`}>Clinical Recommendations</h4>
            </div>
            <ul className="space-y-2">
                {recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircleIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Main CrossBrandPredictor component
const CrossBrandPredictor = ({ initialDrug1 = '', initialDrug2 = '' }) => {
    const [drug1, setDrug1] = useState(initialDrug1);
    const [drug2, setDrug2] = useState(initialDrug2);
    const [strength1, setStrength1] = useState('');
    const [strength2, setStrength2] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    // Brand autocomplete state
    const [suggestions1, setSuggestions1] = useState([]);
    const [suggestions2, setSuggestions2] = useState([]);
    const [showSuggestions1, setShowSuggestions1] = useState(false);
    const [showSuggestions2, setShowSuggestions2] = useState(false);
    const ref1 = useRef(null);
    const ref2 = useRef(null);

    // Brand search for Drug 1
    useEffect(() => {
        if (drug1.trim().length < 1) { setSuggestions1([]); return; }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const q = encodeURIComponent(drug1.trim());
                const API = import.meta.env.VITE_DRUG_INTERACTION_API || 'http://localhost:3000/api/drug-interactions';
                let res = await fetch(`${API}/search?query=${q}&limit=30`, { signal: controller.signal });
                if (!res.ok) throw new Error();
                const data = await res.json();
                setSuggestions1((data.results || []).filter(s => s.type === 'brand'));
                setShowSuggestions1(true);
            } catch (err) {
                if (err.name === 'AbortError') return;
                // Fallback to ML service
                try {
                    const ML = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
                    const res = await fetch(`${ML}/drugs?q=${encodeURIComponent(drug1.trim())}&limit=30`, { signal: controller.signal });
                    if (res.ok) {
                        const d = await res.json();
                        setSuggestions1((d || []).filter(s => s.type === 'brand').map(s => ({ name: s.name, type: 'brand', genericName: s.generic || '', class: s.class || '' })));
                        setShowSuggestions1(true);
                    }
                } catch (_) { }
            }
        }, 300);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [drug1]);

    // Brand search for Drug 2
    useEffect(() => {
        if (drug2.trim().length < 1) { setSuggestions2([]); return; }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const q = encodeURIComponent(drug2.trim());
                const API = import.meta.env.VITE_DRUG_INTERACTION_API || 'http://localhost:3000/api/drug-interactions';
                let res = await fetch(`${API}/search?query=${q}&limit=30`, { signal: controller.signal });
                if (!res.ok) throw new Error();
                const data = await res.json();
                setSuggestions2((data.results || []).filter(s => s.type === 'brand'));
                setShowSuggestions2(true);
            } catch (err) {
                if (err.name === 'AbortError') return;
                try {
                    const ML = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
                    const res = await fetch(`${ML}/drugs?q=${encodeURIComponent(drug2.trim())}&limit=30`, { signal: controller.signal });
                    if (res.ok) {
                        const d = await res.json();
                        setSuggestions2((d || []).filter(s => s.type === 'brand').map(s => ({ name: s.name, type: 'brand', genericName: s.generic || '', class: s.class || '' })));
                        setShowSuggestions2(true);
                    }
                } catch (_) { }
            }
        }, 300);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [drug2]);

    const predictInteraction = useCallback(async () => {
        if (!drug1.trim() || !drug2.trim()) {
            setError('Please enter both drug names');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${ML_SERVICE_BASE}/api/cross-brand/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    drug1: drug1.trim(),
                    drug2: drug2.trim(),
                    strength1: strength1.trim() || null,
                    strength2: strength2.trim() || null
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API error: ${response.status}`);
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err.message || 'Failed to predict interaction');
            setResult(null);
        } finally {
            setLoading(false);
        }
    }, [drug1, drug2, strength1, strength2]);

    const handleSubmit = (e) => {
        e.preventDefault();
        predictInteraction();
    };

    const clearResults = () => {
        setResult(null);
        setError(null);
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <BeakerIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold">Cross-Brand DDI Predictor</h2>
                </div>
                <p className="text-white/80 text-sm">
                    Formulation-aware drug interaction prediction using FDA Orange Book data and ML models
                </p>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Drug 1 */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                            First Drug
                        </h3>
                        <div className="relative" ref={ref1}>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                                Brand Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={drug1}
                                onChange={(e) => setDrug1(e.target.value)}
                                placeholder="e.g., PAXIL CR, LIPITOR"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                onFocus={() => suggestions1.length > 0 && setShowSuggestions1(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions1(false), 150)}
                            />
                            {showSuggestions1 && suggestions1.length > 0 && (
                                <ul className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                                    {suggestions1.map((s) => (
                                        <li
                                            key={s.name}
                                            className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm"
                                            onMouseDown={() => { setDrug1(s.name); setShowSuggestions1(false); }}
                                        >
                                            <span className="font-semibold text-gray-900">{s.name}</span>
                                            {s.genericName && <span className="text-xs text-gray-500 ml-2">({s.genericName})</span>}
                                            {s.class && <span className="block text-xs text-indigo-400">{s.class}</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                                Strength (optional)
                            </label>
                            <input
                                type="text"
                                value={strength1}
                                onChange={(e) => setStrength1(e.target.value)}
                                placeholder="e.g., 12.5MG, 20MG"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Drug 2 */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                            Second Drug
                        </h3>
                        <div className="relative" ref={ref2}>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                                Brand Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={drug2}
                                onChange={(e) => setDrug2(e.target.value)}
                                placeholder="e.g., NOLVADEX, COUMADIN"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                onFocus={() => suggestions2.length > 0 && setShowSuggestions2(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions2(false), 150)}
                            />
                            {showSuggestions2 && suggestions2.length > 0 && (
                                <ul className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                                    {suggestions2.map((s) => (
                                        <li
                                            key={s.name}
                                            className="px-4 py-2 hover:bg-purple-50 cursor-pointer text-sm"
                                            onMouseDown={() => { setDrug2(s.name); setShowSuggestions2(false); }}
                                        >
                                            <span className="font-semibold text-gray-900">{s.name}</span>
                                            {s.genericName && <span className="text-xs text-gray-500 ml-2">({s.genericName})</span>}
                                            {s.class && <span className="block text-xs text-purple-400">{s.class}</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                                Strength (optional)
                            </label>
                            <input
                                type="text"
                                value={strength2}
                                onChange={(e) => setStrength2(e.target.value)}
                                placeholder="e.g., 10MG, 5MG"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="mt-6 flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={loading || !drug1.trim() || !drug2.trim()}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg dark:bg-indigo-700 dark:hover:bg-indigo-800"
                    >
                        {loading ? (
                            <>
                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                Predict Interaction
                            </>
                        )}
                    </button>
                    {result && (
                        <button
                            type="button"
                            onClick={clearResults}
                            className="px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </form>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-red-800">Prediction Error</h4>
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Results Display */}
            {result && result.success && (
                <div className="space-y-6">
                    {/* Main Risk Summary */}
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className={`bg-gradient-to-r ${SEVERITY_CONFIG[result.final_severity]?.gradient || 'from-gray-500 to-gray-600'} p-6 text-white`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">Predicted Interaction Risk</h3>
                                    <p className="text-white/80 text-sm">Formulation-adjusted assessment</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-bold">{result.final_risk_percentage}%</div>
                                    <div className="text-white/80 uppercase text-sm tracking-wide">
                                        {result.final_severity}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Risk Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <RiskGauge
                                    risk={result.base_ingredient_risk}
                                    label="Base Ingredient Risk"
                                    isBase={true}
                                />
                                <AdjustmentIndicator
                                    adjustment={result.formulation_adjustment}
                                    modifier={result.risk_modifier}
                                />
                                <RiskGauge
                                    risk={result.final_predicted_risk}
                                    label="Final Adjusted Risk"
                                />
                            </div>

                            {/* Explanation */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                <div className="flex items-start gap-3">
                                    <DocumentTextIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-gray-800 mb-1">Explanation</h4>
                                        <p className="text-gray-700 text-sm leading-relaxed">
                                            {result.explanation}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Base Description */}
                            {result.base_description && (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-start gap-3">
                                        <InformationCircleIcon className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-gray-800 mb-1">Base Interaction Details</h4>
                                            <p className="text-gray-600 text-sm">{result.base_description}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {result.recommendations && result.recommendations.length > 0 && (
                                <Recommendations
                                    recommendations={result.recommendations}
                                    severity={result.final_severity}
                                />
                            )}
                        </div>
                    </div>

                    {/* Detailed Analysis Toggle */}
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                    >
                        {showDetails ? (
                            <>
                                <ChevronUpIcon className="w-5 h-5" />
                                Hide Detailed Analysis
                            </>
                        ) : (
                            <>
                                <ChevronDownIcon className="w-5 h-5" />
                                Show Detailed Analysis
                            </>
                        )}
                    </button>

                    {/* Detailed Analysis */}
                    {showDetails && result.formulation_analysis && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Drug Information Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DrugInfoCard
                                    drugInfo={result.formulation_analysis.drug1_features}
                                    label="Drug 1 Details"
                                />
                                <DrugInfoCard
                                    drugInfo={result.formulation_analysis.drug2_features}
                                    label="Drug 2 Details"
                                />
                            </div>

                            {/* Formulation Factors */}
                            {result.formulation_analysis.key_formulation_factors && (
                                <FormulationFactors
                                    factors={result.formulation_analysis.key_formulation_factors}
                                />
                            )}

                            {/* Feature Vector (for technical users) */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <BeakerIcon className="w-5 h-5 text-gray-600" />
                                    <h4 className="font-semibold text-gray-700">Feature Vector</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                    {Object.entries(result.formulation_analysis.feature_vector || {}).map(([key, value]) => (
                                        <div key={key} className="flex justify-between bg-white rounded px-3 py-2 border border-gray-100">
                                            <span className="text-gray-600">{key.replace(/_/g, ' ')}:</span>
                                            <span className="font-mono font-medium text-gray-800">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modifier Confidence */}
                            {result.modifier_confidence && Object.keys(result.modifier_confidence).length > 0 && (
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="font-semibold text-gray-700 mb-3">Modifier Confidence</h4>
                                    <div className="space-y-2">
                                        {Object.entries(result.modifier_confidence).map(([modifier, confidence]) => (
                                            <div key={modifier} className="flex items-center gap-3">
                                                <span className="w-24 text-sm text-gray-600 capitalize">{modifier}</span>
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${modifier === 'mitigates' ? 'bg-green-500' :
                                                                modifier === 'potentiates' ? 'bg-red-500' : 'bg-gray-400'
                                                            }`}
                                                        style={{ width: `${Math.round(confidence * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="w-12 text-sm text-gray-600 text-right">
                                                    {Math.round(confidence * 100)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!loading && !result && !error && (
                <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
                    <ShieldCheckIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        Enter Brand Names to Predict Interaction
                    </h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                        This tool uses FDA Orange Book data and ML models to predict drug interactions
                        with formulation-aware adjustments for extended-release, delayed-release, and other formulations.
                    </p>
                </div>
            )}
        </div>
    );
};

export default CrossBrandPredictor;
