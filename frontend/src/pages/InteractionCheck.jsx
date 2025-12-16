import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheckIcon as ShieldCheck,
    MagnifyingGlassIcon as Search,
    ExclamationTriangleIcon as Warning,
    ClockIcon as Clock,
    CheckCircleIcon as Check,
    XMarkIcon as Close
} from '@heroicons/react/24/outline';

const API_BASE = import.meta.env.VITE_DRUG_INTERACTION_API || 'http://localhost:3000/api/drug-interactions';

const severityColor = {
    severe: 'bg-red-50 text-red-800 border-red-200',
    moderate: 'bg-amber-50 text-amber-800 border-amber-200',
    mild: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    none: 'bg-green-50 text-green-800 border-green-200'
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

    const canSubmit = useMemo(() => drugs.length >= 2 && !loading, [drugs.length, loading]);

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
    }, []);

    const loadSample = useCallback(() => {
        setDrugs(['Warfarin', 'Aspirin', 'Metformin']);
        setResult(null);
        setError('');
    }, []);

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
        } catch (err) {
            console.error('Interaction check error', err);
            setError(err.message || 'Unexpected error');
        } finally {
            setLoading(false);
            setDurationMs(Math.round(performance.now() - started));
        }
    }, [canSubmit, drugs]);

    const interactionSummary = useMemo(() => {
        if (!result?.interactions?.length) return null;
        const counts = result.interactions.reduce((acc, i) => {
            acc[i.severity] = (acc[i.severity] || 0) + 1;
            return acc;
        }, {});
        return counts;
    }, [result]);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <ShieldCheck className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Clinical Safety</p>
                            <h1 className="text-xl font-semibold text-gray-900">Drug Interaction Checker</h1>
                        </div>
                    </div>
                    <button
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        onClick={() => navigate('/dashboard')}
                    >
                        ← Back to dashboard
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Enter medications</h2>
                                <p className="text-sm text-gray-600">Add at least two drugs to evaluate potential interactions.</p>
                            </div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                Real-time check
                            </span>
                        </div>

                        <form className="space-y-4" onSubmit={submitCheck}>
                            <div className="relative">
                                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                                <input
                                    value={drugInput}
                                    onChange={(e) => setDrugInput(e.target.value)}
                                    onKeyDown={handleInputKeyDown}
                                    placeholder="Search or type a medication name"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-2.5 text-xs text-gray-500">Searching…</div>
                                )}
                                {suggestions.length > 0 && (
                                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg divide-y divide-gray-100">
                                        {suggestions.map((s) => (
                                            <li
                                                key={s.id || s.name}
                                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                                onMouseDown={() => addDrug(s.name || s.genericName || drugInput)}
                                            >
                                                <p className="text-sm text-gray-900">{s.name || s.genericName}</p>
                                                {s.genericName && <p className="text-xs text-gray-500">{s.genericName}</p>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {drugs.map((drug) => (
                                    <span
                                        key={drug}
                                        className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm border border-blue-100"
                                    >
                                        {drug}
                                        <button
                                            type="button"
                                            className="ml-2 text-blue-500 hover:text-blue-700"
                                            onClick={() => removeDrug(drug)}
                                            aria-label={`Remove ${drug}`}
                                        >
                                            <Close className="h-4 w-4" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold shadow-sm border border-transparent transition-colors ${canSubmit
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {loading ? 'Checking…' : 'Check interactions'}
                                </button>
                                <button
                                    type="button"
                                    onClick={loadSample}
                                    className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                    Load sample
                                </button>
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                    Clear
                                </button>
                                <p className="text-xs text-gray-500">You can add more drugs to refine the check.</p>
                            </div>
                        </form>

                        {error && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                                <Warning className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}

                        {result && (
                            <div className="mt-6">
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${severityColor[result.severity] || severityColor.none}`}>
                                    Overall severity: {result.severity || 'none'}
                                </div>
                                <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-3 items-center">
                                    {lastCheckedAt && <span>Checked: {lastCheckedAt.toLocaleString()}</span>}
                                    {typeof durationMs === 'number' && <span>Response time: {durationMs} ms</span>}
                                    <span>Endpoint: {API_BASE}</span>
                                </div>

                                {interactionSummary && (
                                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {['severe', 'moderate', 'mild', 'none'].map(level => (
                                            <div key={level} className={`border rounded-lg p-3 text-sm ${severityColor[level] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                                <div className="font-semibold capitalize">{level}</div>
                                                <div className="text-2xl font-bold">{interactionSummary[level] || 0}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4 space-y-3">
                                    {result.interactions?.length ? (
                                        result.interactions.map((i, idx) => (
                                            <div key={`${i.drug1}-${i.drug2}-${idx}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <div className="font-semibold text-gray-900">{i.drug1} × {i.drug2}</div>
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${severityColor[i.severity] || severityColor.mild}`}>
                                                        {i.severity}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 mt-2">{i.description}</p>
                                                <p className="text-sm text-gray-600 mt-1">Recommendation: {i.recommendation || 'Consult a healthcare provider.'}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                                            <Check className="h-4 w-4" />
                                            <span>No interactions detected in this combination.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    <aside className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Warning className="h-5 w-5 text-amber-700" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Clinical guidance</p>
                                <p className="text-sm text-gray-600">Always review results with clinical judgment.</p>
                            </div>
                        </div>

                        <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                            <p className="text-sm text-gray-700">Quick add</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {['Warfarin', 'Aspirin', 'Metformin', 'Ibuprofen'].map((drug) => (
                                    <button
                                        key={drug}
                                        type="button"
                                        onClick={() => addDrug(drug)}
                                        className="px-3 py-1 rounded-full text-sm border border-gray-200 text-gray-700 hover:bg-gray-100"
                                    >
                                        {drug}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border border-gray-100 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Clock className="h-4 w-4" />
                                <span>Last checked updates at runtime.</span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Microservice endpoint: {API_BASE}</p>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default InteractionCheck;
