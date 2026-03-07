import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MagnifyingGlassIcon as Search,
    BeakerIcon as Beaker,
    SparklesIcon as Sparkles,
    CheckCircleIcon as CheckCircle,
    ExclamationTriangleIcon as Warning,
    XMarkIcon as Close,
    ArrowPathIcon as Refresh,
    InformationCircleIcon as Info,
    TrashIcon as Trash,
    PlusIcon as Plus,
    ClipboardDocumentListIcon,
    HeartIcon,
    DocumentTextIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ArrowDownTrayIcon as Download,
    ShareIcon as Share,
    PrinterIcon as Print,
    ClockIcon,
    TagIcon,
    ShieldCheckIcon,
    AcademicCapIcon,
    LightBulbIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

// ── API Config ──────────────────────────────────────────────
const TREATMENT_API = import.meta.env.VITE_TREATMENT_API || 'http://localhost:3000/api/treatment';

const FloatingPills = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
            <div
                key={i}
                className="absolute animate-bounce opacity-10"
                style={{
                    left: `${15 + i * 18}%`,
                    top: `${20 + (i % 3) * 25}%`,
                    animationDelay: `${i * 0.6}s`,
                    animationDuration: `${3 + i * 0.5}s`
                }}
            >
                <svg width="36" height="18" viewBox="0 0 36 18">
                    <rect x="0" y="0" width="36" height="18" rx="9" fill={i % 2 === 0 ? '#10B981' : '#06B6D4'} />
                    <rect x="18" y="0" width="18" height="18" rx="9" fill={i % 2 === 0 ? '#34D399' : '#22D3EE'} />
                </svg>
            </div>
        ))}
    </div>
);

// ── Confidence Badge ────────────────────────────────────────
const ConfidenceBadge = ({ confidence }) => {
    const pct = Math.round(confidence * 100);
    const color = pct >= 85 ? 'emerald' : pct >= 65 ? 'amber' : 'red';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-${color}-50 text-${color}-700 border border-${color}-200`}>
            {pct}%
        </span>
    );
};

// ── Source Badge ─────────────────────────────────────────────
const SourceBadge = ({ source }) => {
    const map = {
        knowledge_base: { label: 'Knowledge Base', color: 'emerald' },
        curated: { label: 'Curated', color: 'emerald' },
        ml_model: { label: 'ML Model', color: 'blue' },
        suffix_pattern: { label: 'Pattern', color: 'amber' },
        drug_class: { label: 'Drug Class', color: 'purple' },
        none: { label: 'Unknown', color: 'gray' },
    };
    const { label, color } = map[source] || map.none;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${color}-50 text-${color}-700 border border-${color}-200`}>
            <Sparkles className="h-3 w-3" />
            {label}
        </span>
    );
};

// ═════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════
const TreatmentIdentifier = () => {
    const navigate = useNavigate();

    // ── State ───────────────────────────────────────────────
    const [medications, setMedications] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [textMode, setTextMode] = useState(false);
    const [prescriptionText, setPrescriptionText] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedMed, setExpandedMed] = useState(null);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [history, setHistory] = useState([]);
    const inputRef = useRef(null);
    const sugRef = useRef(null);

    // ── Drug search ─────────────────────────────────────────
    const USE_DEMO = import.meta.env.VITE_USE_DEMO === 'true';

    const searchDrugs = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setSearchSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        try {
            if (USE_DEMO) {
                // load demo data locally
                const demo = await import('../assets/treatment_demo.json');
                const arr = (demo.default || demo).search || [];
                const q = query.toLowerCase();
                const results = arr.filter(d => (d.name || '').toLowerCase().includes(q) || (d.genericName || '').toLowerCase().includes(q)).slice(0, 8);
                setSearchSuggestions(results);
                setShowSuggestions(true);
                return;
            }

            const res = await fetch(`${TREATMENT_API}/search?query=${encodeURIComponent(query)}&limit=8`);
            if (res.ok) {
                const data = await res.json();
                setSearchSuggestions(data.results || []);
                setShowSuggestions(true);
            }
        } catch {
            // silent
        }
    }, []);

    const handleInputChange = useCallback((e) => {
        const val = e.target.value;
        setInputValue(val);
        searchDrugs(val);
    }, [searchDrugs]);

    const addMedication = useCallback((name) => {
        const trimmed = (typeof name === 'string' ? name : inputValue).trim();
        if (!trimmed) return;
        if (medications.some(m => m.toLowerCase() === trimmed.toLowerCase())) return;
        setMedications(prev => [...prev, trimmed]);
        setInputValue('');
        setShowSuggestions(false);
        setSearchSuggestions([]);
    }, [inputValue, medications]);

    const removeMedication = useCallback((idx) => {
        setMedications(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addMedication();
        }
    }, [addMedication]);

    // ── Identify treatments ─────────────────────────────────
    const identifyTreatments = useCallback(async () => {
        setError('');
        setResults(null);
        setLoading(true);

        try {
            let res;
            if (textMode) {
                if (!prescriptionText.trim()) {
                    setError('Please enter prescription text');
                    setLoading(false);
                    return;
                }
                res = await fetch(`${TREATMENT_API}/identify-from-text`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prescription_text: prescriptionText }),
                });
            } else {
                if (medications.length === 0) {
                    setError('Please add at least one medication');
                    setLoading(false);
                    return;
                }
                res = await fetch(`${TREATMENT_API}/identify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ medications }),
                });
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || errData.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            setResults(data);
            setHistory(prev => [
                { timestamp: new Date(), medications: textMode ? data.extracted_medications : medications, conditionCount: data.combined_conditions?.length || 0 },
                ...prev.slice(0, 9),
            ]);
        } catch (err) {
            setError(err.message || 'Failed to identify treatments');
        } finally {
            setLoading(false);
        }
    }, [medications, textMode, prescriptionText]);

    const clearAll = useCallback(() => {
        setMedications([]);
        setInputValue('');
        setPrescriptionText('');
        setResults(null);
        setError('');
        setExpandedMed(null);
    }, []);

    // ── Grouped conditions by area ──────────────────────────
    const groupedConditions = useMemo(() => {
        if (!results?.combined_conditions) return {};
        const groups = {};
        for (const c of results.combined_conditions) {
            const area = c.treatment_area || 'General Medicine';
            if (!groups[area]) groups[area] = [];
            groups[area].push(c);
        }
        return groups;
    }, [results]);

    const areaColors = {
        'Cardiovascular': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: HeartSolid },
        'Endocrinology': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Beaker },
        'Infectious Disease': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: ShieldCheckIcon },
        'Pain Management': { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: LightBulbIcon },
        'Neurology': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: AcademicCapIcon },
        'Gastroenterology': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: Beaker },
        'Respiratory': { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: HeartIcon },
        'Psychiatry': { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: LightBulbIcon },
        'Oncology': { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: ShieldCheckIcon },
        'Hematology': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: HeartIcon },
        'Dermatology': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', icon: Beaker },
        'Ophthalmology': { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: Info },
    };
    const defaultAreaStyle = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: TagIcon };

    // ═════════════════════════════════════════════════════════
    // Render
    // ═════════════════════════════════════════════════════════
    return (
        <div className="relative overflow-hidden">
            {/* Page Title */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                        <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Treatment Identifier</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">AI-powered condition detection</p>
                    </div>
                </div>
                <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <Refresh className="h-4 w-4" />
                    Reset
                </button>
            </div>

            {/* ── Main Content ───────────────────────────────── */}
            <div className="relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ── Left Panel: Input ──────────────────── */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Mode Toggle */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="h-5 w-5 text-emerald-500" />
                                <h2 className="text-sm font-semibold text-gray-900">Input Mode</h2>
                            </div>
                            <div className="flex rounded-xl bg-gray-100 p-1">
                                <button
                                    onClick={() => setTextMode(false)}
                                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${!textMode ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Medication List
                                </button>
                                <button
                                    onClick={() => setTextMode(true)}
                                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${textMode ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Prescription Text
                                </button>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                            {!textMode ? (
                                <>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Search className="h-5 w-5 text-emerald-500" />
                                        <h2 className="text-sm font-semibold text-gray-900">Add Medications</h2>
                                    </div>

                                    {/* Search Input */}
                                    <div className="relative mb-4">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={inputValue}
                                            onChange={handleInputChange}
                                            onKeyDown={handleKeyDown}
                                            onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                                            placeholder="Type a medication name..."
                                            className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-sm placeholder-gray-400"
                                        />
                                        <button
                                            onClick={() => addMedication()}
                                            disabled={!inputValue.trim()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>

                                        {/* Suggestions Dropdown */}
                                        {showSuggestions && searchSuggestions.length > 0 && (
                                            <div ref={sugRef} className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl max-h-60 overflow-y-auto">
                                                {searchSuggestions.map((drug, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => addMedication(drug.name)}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0"
                                                    >
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900">{drug.name}</span>
                                                            {drug.genericName && (
                                                                <span className="text-xs text-gray-500 ml-2">({drug.genericName})</span>
                                                            )}
                                                        </div>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded ${drug.type === 'generic' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                            {drug.type}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Added Medications */}
                                    {medications.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Added ({medications.length})</p>
                                            <div className="flex flex-wrap gap-2">
                                                {medications.map((med, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full border border-emerald-200 group">
                                                        {med}
                                                        <button onClick={() => removeMedication(idx)} className="p-0.5 rounded-full hover:bg-emerald-200 transition-colors">
                                                            <Close className="h-3.5 w-3.5" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-gray-400">
                                            <Beaker className="h-10 w-10 mx-auto mb-2 opacity-40" />
                                            <p className="text-sm">Add medications to identify treatments</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mb-4">
                                        <DocumentTextIcon className="h-5 w-5 text-emerald-500" />
                                        <h2 className="text-sm font-semibold text-gray-900">Prescription Text</h2>
                                    </div>
                                    <textarea
                                        value={prescriptionText}
                                        onChange={(e) => setPrescriptionText(e.target.value)}
                                        placeholder={"Paste prescription text here...\nExample:\nTab. Metformin 500mg BD\nTab. Atorvastatin 20mg HS\nTab. Amlodipine 5mg OD"}
                                        rows={8}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-sm placeholder-gray-400 resize-none"
                                    />
                                </>
                            )}

                            {/* Identify Button */}
                            <button
                                onClick={identifyTreatments}
                                disabled={loading || (!textMode && medications.length === 0) || (textMode && !prescriptionText.trim())}
                                className="w-full mt-4 py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-5 w-5" />
                                        Identify Treatments
                                    </>
                                )}
                            </button>

                            {/* Error */}
                            {error && (
                                <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                    <Warning className="h-5 w-5 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Recent History */}
                        {history.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <ClockIcon className="h-5 w-5 text-gray-400" />
                                    <h2 className="text-sm font-semibold text-gray-900">Recent Analyses</h2>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {history.map((h, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-xs">
                                            <div>
                                                <span className="font-medium text-gray-700">{h.medications.slice(0, 3).join(', ')}{h.medications.length > 3 ? ` +${h.medications.length - 3}` : ''}</span>
                                                <span className="text-gray-400 ml-2">{h.conditionCount} conditions</span>
                                            </div>
                                            <span className="text-gray-400">{h.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right Panel: Results ───────────────── */}
                    <div className="lg:col-span-2 space-y-6">
                        {!results && !loading && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-6">
                                    <ClipboardDocumentListIcon className="h-10 w-10 text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Treatment Identifier</h3>
                                <p className="text-gray-500 max-w-md mx-auto mb-6">
                                    Enter medications or paste prescription text to identify the medical conditions and treatments being addressed.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                                    <div className="flex flex-col items-center p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                        <Search className="h-6 w-6 text-emerald-500 mb-2" />
                                        <span className="text-xs font-medium text-emerald-700">Add Medications</span>
                                    </div>
                                    <div className="flex flex-col items-center p-4 rounded-xl bg-teal-50/50 border border-teal-100">
                                        <Sparkles className="h-6 w-6 text-teal-500 mb-2" />
                                        <span className="text-xs font-medium text-teal-700">AI Analysis</span>
                                    </div>
                                    <div className="flex flex-col items-center p-4 rounded-xl bg-cyan-50/50 border border-cyan-100">
                                        <CheckCircle className="h-6 w-6 text-cyan-500 mb-2" />
                                        <span className="text-xs font-medium text-cyan-700">Get Results</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4 animate-pulse">
                                    <Sparkles className="h-8 w-8 text-emerald-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Medications...</h3>
                                <p className="text-sm text-gray-500">Identifying conditions, treatments, and therapeutic areas</p>
                                <div className="mt-6 w-64 mx-auto">
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Results */}
                        {results && !loading && (
                            <>
                                {/* Summary Banner */}
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold mb-1">Treatment Analysis Complete</h3>
                                            <p className="text-emerald-100 text-sm">{results.likely_treatment_summary}</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{results.medications?.length || 0}</p>
                                                <p className="text-emerald-200 text-xs">Medications</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{results.combined_conditions?.length || 0}</p>
                                                <p className="text-emerald-200 text-xs">Conditions</p>
                                            </div>
                                            {results.processing_time_ms !== undefined && (
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold">{Math.round(results.processing_time_ms)}</p>
                                                    <p className="text-emerald-200 text-xs">ms</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Extracted medications (text mode) */}
                                    {results.extracted_medications && results.extracted_medications.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-emerald-400/30">
                                            <p className="text-xs text-emerald-200 mb-2 uppercase tracking-wide font-medium">Extracted Medications</p>
                                            <div className="flex flex-wrap gap-2">
                                                {results.extracted_medications.map((m, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-medium">{m}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Conditions Grouped by Treatment Area */}
                                {Object.keys(groupedConditions).length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center gap-2 mb-5">
                                            <ChartBarIcon className="h-5 w-5 text-emerald-500" />
                                            <h3 className="text-sm font-semibold text-gray-900">Identified Conditions by Treatment Area</h3>
                                        </div>
                                        <div className="space-y-4">
                                            {Object.entries(groupedConditions).map(([area, conditions]) => {
                                                const style = areaColors[area] || defaultAreaStyle;
                                                const AreaIcon = style.icon;
                                                return (
                                                    <div key={area} className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <AreaIcon className={`h-5 w-5 ${style.text}`} />
                                                            <h4 className={`text-sm font-bold ${style.text}`}>{area}</h4>
                                                            <span className={`ml-auto text-xs font-medium ${style.text} opacity-70`}>{conditions.length} condition{conditions.length > 1 ? 's' : ''}</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {conditions.map((c, i) => (
                                                                <div key={i} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-white">
                                                                    <span className="text-sm font-medium text-gray-800">{c.condition}</span>
                                                                    <ConfidenceBadge confidence={c.confidence} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Per-Medication Breakdown */}
                                {results.medications && results.medications.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center gap-2 mb-5">
                                            <Beaker className="h-5 w-5 text-emerald-500" />
                                            <h3 className="text-sm font-semibold text-gray-900">Medication Details</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {results.medications.map((med, idx) => {
                                                const isExpanded = expandedMed === idx;
                                                return (
                                                    <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-200 transition-colors">
                                                        <button
                                                            onClick={() => setExpandedMed(isExpanded ? null : idx)}
                                                            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                                                    <span className="text-sm font-bold text-emerald-600">{idx + 1}</span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-gray-900">{med.medication}</p>
                                                                    {med.generic_name && med.generic_name !== med.medication.toLowerCase() && (
                                                                        <p className="text-xs text-gray-500">Generic: {med.generic_name}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <SourceBadge source={med.source} />
                                                                <span className="text-xs text-gray-400">{med.conditions?.length || 0} conditions</span>
                                                                {isExpanded ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
                                                            </div>
                                                        </button>
                                                        {isExpanded && (
                                                            <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
                                                                {med.conditions && med.conditions.length > 0 ? (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                                                        {med.conditions.map((c, ci) => (
                                                                            <div key={ci} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                                                                                <div>
                                                                                    <span className="text-sm font-medium text-gray-800">{c.condition}</span>
                                                                                    <span className="text-xs text-gray-400 ml-2">{c.treatment_area}</span>
                                                                                </div>
                                                                                <ConfidenceBadge confidence={c.confidence} />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-gray-500 mt-3 italic">No conditions identified for this medication.</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Disclaimer */}
                                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                                    <Info className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                                    <div>
                                        <p className="font-semibold mb-1">Research & Educational Purpose Only</p>
                                        <p className="text-xs text-amber-700">This tool is for informational purposes only and is not a substitute for professional medical advice. Always consult a qualified healthcare provider for diagnosis and treatment.</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TreatmentIdentifier;
