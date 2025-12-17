import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheckIcon as ShieldCheck,
    MagnifyingGlassIcon as Search,
    ExclamationTriangleIcon as Warning,
    ClockIcon as Clock,
    CheckCircleIcon as Check,
    XMarkIcon as Close,
    DocumentDuplicateIcon as Copy,
    PrinterIcon as Print,
    BookmarkIcon as Bookmark,
    ChevronDownIcon as ChevronDown,
    ChevronUpIcon as ChevronUp,
    ArrowPathIcon as Refresh,
    FunnelIcon as Filter,
    InformationCircleIcon as Info,
    TrashIcon as Trash,
    ShareIcon as Share,
    ArrowDownTrayIcon as Download,
    HeartIcon as Heart,
    BeakerIcon as Beaker,
    SparklesIcon as Sparkles,
    BoltIcon as Bolt,
    EyeIcon as Eye,
    EyeSlashIcon as EyeOff,
    MicrophoneIcon,
    TableCellsIcon,
    CalendarDaysIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid, HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

const API_BASE = import.meta.env.VITE_DRUG_INTERACTION_API || 'http://localhost:3000/api/drug-interactions';

const severityColor = {
    severe: 'bg-red-50 text-red-800 border-red-200',
    moderate: 'bg-amber-50 text-amber-800 border-amber-200',
    mild: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    none: 'bg-green-50 text-green-800 border-green-200'
};

const severityIcon = {
    severe: '🔴',
    moderate: '🟠',
    mild: '🟡',
    none: '🟢'
};

// Drug categories for quick add
const drugCategories = {
    'Blood Thinners': ['Warfarin', 'Heparin', 'Aspirin', 'Clopidogrel'],
    'Pain Relief': ['Ibuprofen', 'Acetaminophen', 'Naproxen', 'Morphine'],
    'Diabetes': ['Metformin', 'Insulin', 'Glipizide', 'Sitagliptin'],
    'Heart': ['Lisinopril', 'Amlodipine', 'Atenolol', 'Digoxin'],
    'Antibiotics': ['Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Doxycycline'],
    'Mental Health': ['Sertraline', 'Fluoxetine', 'Alprazolam', 'Lithium']
};

const InteractionCheck = () => {
    const navigate = useNavigate();
    const [drugInput, setDrugInput] = useState('');
    const [drugs, setDrugs] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [lastCheckedAt, setLastCheckedAt] = useState(null);
    const [durationMs, setDurationMs] = useState(null);
    
    // New state for enhanced features
    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem('interactionCheckHistory');
        return saved ? JSON.parse(saved) : [];
    });
    const [savedResults, setSavedResults] = useState(() => {
        const saved = localStorage.getItem('savedInteractionResults');
        return saved ? JSON.parse(saved) : [];
    });
    const [severityFilter, setSeverityFilter] = useState('all');
    const [expandedInteractions, setExpandedInteractions] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [copiedToClipboard, setCopiedToClipboard] = useState(false);
    const [activeTab, setActiveTab] = useState('check'); // 'check', 'history', 'saved'
    const [viewMode, setViewMode] = useState('cards'); // 'cards', 'table', 'compact', 'matrix'
    const [isListening, setIsListening] = useState(false);
    const resultRef = useRef(null);

    const canSubmit = useMemo(() => drugs.length >= 2 && !loading, [drugs.length, loading]);

    // Voice Input
    const startListening = useCallback(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice input is not supported in this browser.');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => setIsListening(true);
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setDrugInput(transcript);
            setIsListening(false);
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };
        
        recognition.onend = () => setIsListening(false);
        
        recognition.start();
    }, []);

    // Save history to localStorage
    useEffect(() => {
        localStorage.setItem('interactionCheckHistory', JSON.stringify(history.slice(0, 20)));
    }, [history]);

    // Save saved results to localStorage
    useEffect(() => {
        localStorage.setItem('savedInteractionResults', JSON.stringify(savedResults));
    }, [savedResults]);

    useEffect(() => {
        if (drugInput.trim().length < 2) {
            setSuggestions([]);
            return undefined;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                setIsSearching(true);
                const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(drugInput.trim())}&limit=6`, {
                    signal: controller.signal
                });
                if (!res.ok) throw new Error('Search failed');
                const data = await res.json();
                setSuggestions(data.results || []);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Search error', err);
                }
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [drugInput]);

    const addDrug = useCallback((name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (drugs.some(d => d.toLowerCase() === trimmed.toLowerCase())) return;
        setDrugs(prev => [...prev, trimmed]);
        setDrugInput('');
        setSuggestions([]);
    }, [drugs]);

    const removeDrug = useCallback((name) => {
        setDrugs(prev => prev.filter(d => d !== name));
    }, []);

    const handleInputKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addDrug(drugInput || '');
        }
    }, [addDrug, drugInput]);

    const clearAll = useCallback(() => {
        setDrugs([]);
        setResult(null);
        setError('');
        setExpandedInteractions({});
    }, []);

    const loadSample = useCallback(() => {
        setDrugs(['Warfarin', 'Aspirin', 'Metformin']);
        setResult(null);
        setError('');
    }, []);

    // Toggle expanded state for interaction cards
    const toggleExpanded = useCallback((idx) => {
        setExpandedInteractions(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    }, []);

    // Add to history
    const addToHistory = useCallback((checkResult, drugList) => {
        const entry = {
            id: Date.now(),
            drugs: drugList,
            result: checkResult,
            timestamp: new Date().toISOString()
        };
        setHistory(prev => [entry, ...prev].slice(0, 20));
    }, []);

    // Save result
    const saveResult = useCallback(() => {
        if (!result) return;
        const entry = {
            id: Date.now(),
            drugs: [...drugs],
            result: { ...result },
            timestamp: new Date().toISOString(),
            notes: ''
        };
        setSavedResults(prev => [entry, ...prev]);
    }, [result, drugs]);

    // Delete from saved
    const deleteSavedResult = useCallback((id) => {
        setSavedResults(prev => prev.filter(r => r.id !== id));
    }, []);

    // Clear history
    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    // Load from history
    const loadFromHistory = useCallback((entry) => {
        setDrugs(entry.drugs);
        setResult(entry.result);
        setLastCheckedAt(new Date(entry.timestamp));
        setActiveTab('check');
    }, []);

    // Copy results to clipboard
    const copyToClipboard = useCallback(async () => {
        if (!result) return;
        const text = `Drug Interaction Check Results\n` +
            `Drugs: ${drugs.join(', ')}\n` +
            `Overall Severity: ${result.severity || 'none'}\n\n` +
            (result.interactions?.map(i => 
                `${i.drug1} × ${i.drug2}: ${i.severity}\n${i.description}\nRecommendation: ${i.recommendation || 'Consult healthcare provider'}`
            ).join('\n\n') || 'No interactions found');
        
        try {
            await navigator.clipboard.writeText(text);
            setCopiedToClipboard(true);
            setTimeout(() => setCopiedToClipboard(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [result, drugs]);

    // Print results
    const printResults = useCallback(() => {
        window.print();
    }, []);

    // Export as JSON
    const exportAsJSON = useCallback(() => {
        if (!result) return;
        const data = {
            drugs,
            result,
            checkedAt: lastCheckedAt?.toISOString(),
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interaction-check-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [result, drugs, lastCheckedAt]);

    const submitCheck = useCallback(async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setLoading(true);
        setError('');
        setResult(null);
        setDurationMs(null);
        const started = performance.now();

        try {
            const res = await fetch(`${API_BASE}/check-interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ drugs })
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.message || 'Unable to check interactions');
            }

            const data = await res.json();
            setResult(data);
            setLastCheckedAt(new Date());
            addToHistory(data, drugs);
        } catch (err) {
            console.error('Interaction check error', err);
            setError(err.message || 'Unexpected error');
        } finally {
            setLoading(false);
            setDurationMs(Math.round(performance.now() - started));
        }
    }, [canSubmit, drugs, addToHistory]);

    const interactionSummary = useMemo(() => {
        if (!result?.interactions?.length) return null;
        const counts = result.interactions.reduce((acc, i) => {
            acc[i.severity] = (acc[i.severity] || 0) + 1;
            return acc;
        }, {});
        return counts;
    }, [result]);

    // Filtered interactions based on severity filter
    const filteredInteractions = useMemo(() => {
        if (!result?.interactions) return [];
        if (severityFilter === 'all') return result.interactions;
        return result.interactions.filter(i => i.severity === severityFilter);
    }, [result, severityFilter]);

    // Check if result is saved
    const isResultSaved = useMemo(() => {
        if (!result) return false;
        return savedResults.some(s => 
            JSON.stringify(s.drugs.sort()) === JSON.stringify([...drugs].sort())
        );
    }, [result, savedResults, drugs]);

    // Statistics
    const statistics = useMemo(() => {
        const totalChecks = history.length;
        const severeCount = history.filter(h => h.result?.severity === 'severe').length;
        const safeCount = history.filter(h => !h.result?.interactions?.length).length;
        const uniqueDrugs = [...new Set(history.flatMap(h => h.drugs))].length;
        return { totalChecks, severeCount, safeCount, uniqueDrugs };
    }, [history]);

    // Risk Score Calculation
    const riskScore = useMemo(() => {
        if (!result?.interactions) return 0;
        if (result.interactions.length === 0) return 100;
        
        let score = 100;
        result.interactions.forEach(i => {
            if (i.severity === 'severe') score -= 25;
            else if (i.severity === 'moderate') score -= 10;
            else if (i.severity === 'mild') score -= 5;
        });
        return Math.max(0, score);
    }, [result]);

    const riskLevel = useMemo(() => {
        if (riskScore >= 90) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-500', border: 'border-green-200', bgLight: 'bg-green-50' };
        if (riskScore >= 70) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-500', border: 'border-blue-200', bgLight: 'bg-blue-50' };
        if (riskScore >= 50) return { label: 'Caution', color: 'text-yellow-600', bg: 'bg-yellow-500', border: 'border-yellow-200', bgLight: 'bg-yellow-50' };
        return { label: 'High Risk', color: 'text-red-600', bg: 'bg-red-500', border: 'border-red-200', bgLight: 'bg-red-50' };
    }, [riskScore]);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 shadow-sm print:hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Clinical Safety Tool</p>
                            <h1 className="text-xl font-semibold text-gray-900">Drug Interaction Checker</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Statistics Mini Cards */}
                        <div className="hidden md:flex items-center gap-2 mr-4">
                            <div className="px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                                <span className="text-xs text-blue-600 font-medium">{statistics.totalChecks} checks</span>
                            </div>
                            <div className="px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
                                <span className="text-xs text-green-600 font-medium">{statistics.safeCount} safe</span>
                            </div>
                        </div>
                        <button
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            onClick={() => navigate('/dashboard')}
                        >
                            ← Dashboard
                        </button>
                    </div>
                </div>
                
                {/* Tab Navigation */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-1 border-b border-gray-200 -mb-px">
                        {[
                            { id: 'check', label: 'Check Interactions', icon: ShieldCheck },
                            { id: 'history', label: `History (${history.length})`, icon: Clock },
                            { id: 'saved', label: `Saved (${savedResults.length})`, icon: Bookmark }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Main Check Tab */}
                {activeTab === 'check' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <section className="lg:col-span-2 space-y-6">
                            {/* Input Card */}
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover-lift">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Enter medications</h2>
                                        <p className="text-sm text-gray-600">Add at least two drugs to evaluate potential interactions.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            Real-time
                                        </span>
                                    </div>
                                </div>

                                <form className="space-y-4" onSubmit={submitCheck}>
                                    <div className="relative">
                                        <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                                        <input
                                            value={drugInput}
                                            onChange={(e) => setDrugInput(e.target.value)}
                                            onKeyDown={handleInputKeyDown}
                                            placeholder="Search or type a medication name"
                                            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                        />
                                        <button
                                            type="button"
                                            onClick={startListening}
                                            className={`absolute right-3 top-3 p-1 rounded-full transition-colors ${
                                                isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                                            }`}
                                            title="Voice Input"
                                        >
                                            <MicrophoneIcon className="h-5 w-5" />
                                        </button>
                                        {isSearching && (
                                            <div className="absolute right-12 top-3">
                                                <Refresh className="h-5 w-5 text-blue-500 animate-spin" />
                                            </div>
                                        )}
                                        {suggestions.length > 0 && (
                                            <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg divide-y divide-gray-100 max-h-60 overflow-auto">
                                                {suggestions.map((s) => (
                                                    <li
                                                        key={s.id || s.name}
                                                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"
                                                        onMouseDown={() => addDrug(s.name || s.genericName || drugInput)}
                                                    >
                                                        <p className="text-sm font-medium text-gray-900">{s.name || s.genericName}</p>
                                                        {s.genericName && s.name !== s.genericName && (
                                                            <p className="text-xs text-gray-500">{s.genericName}</p>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Drug Tags */}
                                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                                        {drugs.length === 0 ? (
                                            <span className="text-sm text-gray-400 italic">No drugs added yet...</span>
                                        ) : (
                                            drugs.map((drug, idx) => (
                                                <span
                                                    key={drug}
                                                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-sm border border-blue-200 shadow-sm animate-fade-in-up"
                                                    style={{ animationDelay: `${idx * 50}ms` }}
                                                >
                                                    <Beaker className="h-3.5 w-3.5 mr-1.5" />
                                                    {drug}
                                                    <button
                                                        type="button"
                                                        className="ml-2 text-blue-400 hover:text-red-500 transition-colors"
                                                        onClick={() => removeDrug(drug)}
                                                        aria-label={`Remove ${drug}`}
                                                    >
                                                        <Close className="h-4 w-4" />
                                                    </button>
                                                </span>
                                            ))
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-3 flex-wrap pt-2">
                                        <button
                                            type="submit"
                                            disabled={!canSubmit}
                                            className={`inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm border border-transparent transition-all ${canSubmit
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-[1.02]'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {loading ? (
                                                <>
                                                    <Refresh className="h-4 w-4 mr-2 animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <Bolt className="h-4 w-4 mr-2" />
                                                    Check Interactions
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={loadSample}
                                            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <Sparkles className="h-4 w-4 mr-1.5 text-amber-500" />
                                            Load Sample
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowCategories(!showCategories)}
                                            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                                showCategories 
                                                    ? 'border-blue-200 bg-blue-50 text-blue-700' 
                                                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Beaker className="h-4 w-4 mr-1.5" />
                                            Categories
                                            {showCategories ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                                        </button>
                                        {drugs.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={clearAll}
                                                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash className="h-4 w-4 mr-1" />
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </form>

                                {/* Drug Categories Panel */}
                                {showCategories && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in-up">
                                        <p className="text-sm font-medium text-gray-700 mb-3">Quick add by category:</p>
                                        <div className="space-y-3">
                                            {Object.entries(drugCategories).map(([category, categoryDrugs]) => (
                                                <div key={category}>
                                                    <p className="text-xs font-medium text-gray-500 mb-1.5">{category}</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {categoryDrugs.map(drug => (
                                                            <button
                                                                key={drug}
                                                                type="button"
                                                                onClick={() => addDrug(drug)}
                                                                disabled={drugs.includes(drug)}
                                                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                                                    drugs.includes(drug)
                                                                        ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                                                                        : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                                                                }`}
                                                            >
                                                                {drug}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 animate-fade-in-up">
                                        <Warning className="h-5 w-5 flex-shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>

                            {/* Results Section */}
                            {result && (
                                <div ref={resultRef} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 animate-fade-in-up print:shadow-none">
                                    {/* Result Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${severityColor[result.severity] || severityColor.none}`}>
                                                <span className="mr-1.5">{severityIcon[result.severity] || severityIcon.none}</span>
                                                Overall: {result.severity || 'none'}
                                            </div>
                                            <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3 items-center">
                                                {lastCheckedAt && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {lastCheckedAt.toLocaleString()}
                                                    </span>
                                                )}
                                                {typeof durationMs === 'number' && (
                                                    <span className="flex items-center gap-1">
                                                        <Bolt className="h-3.5 w-3.5" />
                                                        {durationMs}ms
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 print:hidden">
                                            <button
                                                onClick={saveResult}
                                                disabled={isResultSaved}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    isResultSaved 
                                                        ? 'text-blue-600 bg-blue-50' 
                                                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                                }`}
                                                title={isResultSaved ? 'Saved' : 'Save result'}
                                            >
                                                {isResultSaved ? <BookmarkSolid className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                                            </button>
                                            <button
                                                onClick={copyToClipboard}
                                                className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                                title="Copy to clipboard"
                                            >
                                                {copiedToClipboard ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                                            </button>
                                            <button
                                                onClick={exportAsJSON}
                                                className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                                title="Export as JSON"
                                            >
                                                <Download className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={printResults}
                                                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                                title="Print results"
                                            >
                                                <Print className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        {/* Risk Score Card */}
                                        <div className={`border rounded-xl p-4 ${riskLevel.bgLight} ${riskLevel.border}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-sm font-semibold ${riskLevel.color}`}>Safety Score</span>
                                                <ChartBarIcon className={`h-5 w-5 ${riskLevel.color}`} />
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <span className={`text-3xl font-bold ${riskLevel.color}`}>{riskScore}</span>
                                                <span className="text-sm text-gray-500 mb-1">/ 100</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                                                <div 
                                                    className={`h-2 rounded-full transition-all duration-500 ${riskLevel.bg}`} 
                                                    style={{ width: `${riskScore}%` }}
                                                ></div>
                                            </div>
                                            <p className={`text-xs mt-2 font-medium ${riskLevel.color}`}>{riskLevel.label}</p>
                                        </div>

                                        {/* Interaction Counts */}
                                        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {['severe', 'moderate', 'mild', 'none'].map(level => (
                                                <button
                                                    key={level}
                                                    onClick={() => setSeverityFilter(severityFilter === level ? 'all' : level)}
                                                    className={`border rounded-lg p-3 text-sm transition-all h-full flex flex-col justify-between ${
                                                        severityFilter === level 
                                                            ? 'ring-2 ring-blue-500 ring-offset-1' 
                                                            : ''
                                                    } ${severityColor[level] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                                                >
                                                    <div className="font-semibold capitalize flex items-center gap-1">
                                                        {severityIcon[level]} {level}
                                                    </div>
                                                    <div className="text-2xl font-bold mt-2">{interactionSummary[level] || 0}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Timing Assistant */}
                                    {result.interactions?.length > 0 && (
                                        <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <CalendarDaysIcon className="h-5 w-5 text-indigo-600" />
                                                <h3 className="text-sm font-semibold text-indigo-900">Optimization Strategy</h3>
                                            </div>
                                            <div className="text-sm text-indigo-800 space-y-2">
                                                <p>Based on the identified interactions, consider the following scheduling adjustments:</p>
                                                <ul className="list-disc list-inside space-y-1 ml-2">
                                                    <li>Space out administration of interacting drugs by at least <strong>2-4 hours</strong> to minimize absorption conflicts.</li>
                                                    <li>Consult a pharmacist for specific timing instructions regarding food intake.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {/* Filter Bar */}
                                    {result.interactions?.length > 0 && (
                                        <div className="flex items-center justify-between mb-4 print:hidden">
                                            <div className="flex items-center gap-2">
                                                <Filter className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    Showing {filteredInteractions.length} of {result.interactions.length} interactions
                                                </span>
                                                {severityFilter !== 'all' && (
                                                    <button
                                                        onClick={() => setSeverityFilter('all')}
                                                        className="text-xs text-blue-600 hover:text-blue-800"
                                                    >
                                                        Clear filter
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                                                <button
                                                    onClick={() => setViewMode('cards')}
                                                    className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                                    title="Card view"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('compact')}
                                                    className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                                    title="Compact view"
                                                >
                                                    <EyeOff className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('matrix')}
                                                    className={`p-1.5 rounded ${viewMode === 'matrix' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                                    title="Matrix view"
                                                >
                                                    <TableCellsIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Interaction Content */}
                                    {viewMode === 'matrix' ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full border-collapse text-sm">
                                                <thead>
                                                    <tr>
                                                        <th className="p-2 border bg-gray-50"></th>
                                                        {drugs.map(d => (
                                                            <th key={d} className="p-2 border bg-gray-50 font-semibold text-gray-700">{d}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {drugs.map((rowDrug, i) => (
                                                        <tr key={rowDrug}>
                                                            <td className="p-2 border bg-gray-50 font-semibold text-gray-700">{rowDrug}</td>
                                                            {drugs.map((colDrug, j) => {
                                                                if (i === j) return <td key={colDrug} className="p-2 border bg-gray-100"></td>;
                                                                
                                                                const interaction = result.interactions.find(
                                                                    x => (x.drug1 === rowDrug && x.drug2 === colDrug) || 
                                                                         (x.drug1 === colDrug && x.drug2 === rowDrug)
                                                                );
                                                                
                                                                return (
                                                                    <td key={colDrug} className={`p-2 border text-center ${interaction ? severityColor[interaction.severity] : ''}`}>
                                                                        {interaction ? (
                                                                            <span title={interaction.description}>{severityIcon[interaction.severity]}</span>
                                                                        ) : (
                                                                            <span className="text-gray-300">-</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <p className="text-xs text-gray-500 mt-2 text-center">Grid shows interaction severity between pairs.</p>
                                        </div>
                                    ) : (
                                        <div className={`space-y-3 ${viewMode === 'compact' ? 'space-y-2' : ''}`}>
                                            {filteredInteractions.length > 0 ? (
                                                filteredInteractions.map((i, idx) => (
                                                    <div 
                                                        key={`${i.drug1}-${i.drug2}-${idx}`} 
                                                        className={`border rounded-lg overflow-hidden transition-all hover-lift ${
                                                            viewMode === 'compact' ? 'p-3' : 'p-4'
                                                        } ${severityColor[i.severity] || severityColor.mild}`}
                                                    >
                                                        <div 
                                                            className="flex items-center justify-between cursor-pointer"
                                                            onClick={() => toggleExpanded(idx)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg">{severityIcon[i.severity]}</span>
                                                                <div>
                                                                    <div className="font-semibold text-gray-900">
                                                                        {i.drug1} × {i.drug2}
                                                                    </div>
                                                                    {viewMode === 'compact' && !expandedInteractions[idx] && (
                                                                        <p className="text-xs text-gray-600 truncate max-w-md">{i.description}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${severityColor[i.severity] || severityColor.mild}`}>
                                                                    {i.severity}
                                                                </span>
                                                                <button className="p-1 hover:bg-white/50 rounded transition-colors print:hidden">
                                                                    {expandedInteractions[idx] ? (
                                                                        <ChevronUp className="h-4 w-4" />
                                                                    ) : (
                                                                        <ChevronDown className="h-4 w-4" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        
                                                        {(viewMode !== 'compact' || expandedInteractions[idx]) && (
                                                            <div className={`mt-3 space-y-2 ${expandedInteractions[idx] ? 'animate-fade-in-up' : ''}`}>
                                                                <p className="text-sm text-gray-700">{i.description}</p>
                                                                <div className="flex items-start gap-2 pt-2 border-t border-current/10">
                                                                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                                    <p className="text-sm">
                                                                        <span className="font-medium">Recommendation:</span>{' '}
                                                                        {i.recommendation || 'Consult a healthcare provider for guidance.'}
                                                                    </p>
                                                                </div>
                                                                {expandedInteractions[idx] && i.mechanism && (
                                                                    <div className="text-xs text-gray-600 bg-white/50 rounded p-2 mt-2">
                                                                        <span className="font-medium">Mechanism:</span> {i.mechanism}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : result.interactions?.length > 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                    <p>No interactions match the selected filter</p>
                                                    <button
                                                        onClick={() => setSeverityFilter('all')}
                                                        className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                                                    >
                                                        Show all interactions
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-4">
                                                    <Check className="h-6 w-6 flex-shrink-0" />
                                                    <div>
                                                        <p className="font-medium">No interactions detected!</p>
                                                        <p className="text-green-600 text-xs mt-0.5">This drug combination appears to be safe based on our database.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Sidebar */}
                        <aside className="space-y-4">
                            {/* Clinical Guidance Card */}
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover-lift">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                        <Warning className="h-5 w-5 text-amber-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Clinical Guidance</p>
                                        <p className="text-xs text-gray-500">Important safety notes</p>
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-amber-800">Always verify results with clinical judgment and professional guidance.</p>
                                    </div>
                                    <div className="flex gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                        <Heart className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-blue-800">Consider patient-specific factors like age, weight, and comorbidities.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Add Popular Drugs */}
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover-lift">
                                <p className="text-sm font-semibold text-gray-900 mb-3">Quick Add</p>
                                <div className="flex flex-wrap gap-2">
                                    {['Warfarin', 'Aspirin', 'Metformin', 'Ibuprofen', 'Lisinopril', 'Omeprazole'].map((drug) => (
                                        <button
                                            key={drug}
                                            type="button"
                                            onClick={() => addDrug(drug)}
                                            disabled={drugs.includes(drug)}
                                            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                                                drugs.includes(drug)
                                                    ? 'bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed'
                                                    : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                                            }`}
                                        >
                                            {drug}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Activity */}
                            {history.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover-lift">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-semibold text-gray-900">Recent Checks</p>
                                        <button
                                            onClick={() => setActiveTab('history')}
                                            className="text-xs text-blue-600 hover:text-blue-800"
                                        >
                                            View all
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {history.slice(0, 3).map((entry) => (
                                            <button
                                                key={entry.id}
                                                onClick={() => loadFromHistory(entry)}
                                                className="w-full text-left p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-gray-700 truncate">
                                                        {entry.drugs.slice(0, 2).join(' + ')}
                                                        {entry.drugs.length > 2 && ` +${entry.drugs.length - 2}`}
                                                    </span>
                                                    <span className="text-xs">{severityIcon[entry.result?.severity] || '⚪'}</span>
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(entry.timestamp).toLocaleDateString()}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* API Status */}
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span>API Connected</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-400 truncate" title={API_BASE}>{API_BASE}</p>
                            </div>
                        </aside>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Check History</h2>
                                    <p className="text-sm text-gray-500">Your recent interaction checks (last 20)</p>
                                </div>
                                {history.length > 0 && (
                                    <button
                                        onClick={clearHistory}
                                        className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                                    >
                                        <Trash className="h-4 w-4" />
                                        Clear History
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        {history.length === 0 ? (
                            <div className="p-12 text-center">
                                <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500">No history yet</p>
                                <p className="text-sm text-gray-400">Your interaction checks will appear here</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {history.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => loadFromHistory(entry)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {entry.drugs.map((drug, idx) => (
                                                        <span key={drug} className="inline-flex items-center">
                                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-sm">
                                                                {drug}
                                                            </span>
                                                            {idx < entry.drugs.length - 1 && (
                                                                <span className="mx-1 text-gray-400">+</span>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {new Date(entry.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${severityColor[entry.result?.severity] || severityColor.none}`}>
                                                {severityIcon[entry.result?.severity]} {entry.result?.severity || 'none'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Saved Tab */}
                {activeTab === 'saved' && (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Saved Results</h2>
                            <p className="text-sm text-gray-500">Your bookmarked interaction checks</p>
                        </div>
                        
                        {savedResults.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bookmark className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500">No saved results</p>
                                <p className="text-sm text-gray-400">Click the bookmark icon on any result to save it</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {savedResults.map((entry) => (
                                    <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div 
                                                className="flex-1 cursor-pointer"
                                                onClick={() => loadFromHistory(entry)}
                                            >
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {entry.drugs.map((drug, idx) => (
                                                        <span key={drug} className="inline-flex items-center">
                                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-sm">
                                                                {drug}
                                                            </span>
                                                            {idx < entry.drugs.length - 1 && (
                                                                <span className="mx-1 text-gray-400">+</span>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Saved on {new Date(entry.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${severityColor[entry.result?.severity] || severityColor.none}`}>
                                                    {severityIcon[entry.result?.severity]} {entry.result?.severity || 'none'}
                                                </div>
                                                <button
                                                    onClick={() => deleteSavedResult(entry.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Remove from saved"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="mt-auto border-t border-gray-200 bg-white print:hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                        <span>© {new Date().getFullYear()} PharmaLink. For research and educational purposes only.</span>
                        <span>Always consult a qualified healthcare professional before making medical decisions.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default InteractionCheck;
