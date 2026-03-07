import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mlService from '../utils/mlService';
import {
    ShieldCheckIcon as ShieldCheck,
    MagnifyingGlassIcon as Search,
    ExclamationTriangleIcon as Warning,
    ClockIcon as Clock,
    CheckCircleIcon as CheckCircle,
    CheckIcon as Check,
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
    ChartBarIcon,
    CubeTransparentIcon,
    AcademicCapIcon,
    GlobeAltIcon,
    LightBulbIcon,
    StarIcon as StarOutline,
    ArrowRightIcon as ArrowRight
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid, HeartIcon as HeartSolid, StarIcon } from '@heroicons/react/24/solid';

const API_BASE = import.meta.env.VITE_DRUG_INTERACTION_API || 'http://localhost:3000/api/drug-interactions';

// Subtle Gradient Orbs Background
const GradientOrbs = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/8 via-indigo-500/6 to-purple-400/8 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-cyan-400/6 via-teal-500/6 to-emerald-400/6 blur-3xl"></div>
    </div>
);

// CSS Keyframes for custom animations (add to style tag)
const AnimationStyles = () => (
    <style>{`
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            50% { transform: scale(1); opacity: 1; }
            100% { transform: scale(0.8); opacity: 0.5; }
        }
        @keyframes bounce-dot {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
        .animate-shimmer { animation: shimmer 3s linear infinite; background-size: 200% 100%; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
    `}</style>
);

// Loading Spinner Component
const PremiumLoader = () => (
    <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin" style={{ animationDuration: '1s' }}></div>
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-white" />
        </div>
    </div>
);

// Skeleton Loader Component
const SkeletonLoader = ({ className = "" }) => (
    <div className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer rounded ${className}`}></div>
);

// Results Skeleton
const ResultsSkeleton = () => (
    <div className="relative overflow-hidden backdrop-blur-xl bg-white/90 border border-white/50 rounded-3xl shadow-2xl p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-shimmer"></div>
        <div className="flex items-start gap-4 mb-6">
            <SkeletonLoader className="w-16 h-16 rounded-2xl" />
            <div className="flex-1 space-y-3">
                <SkeletonLoader className="h-6 w-48" />
                <SkeletonLoader className="h-4 w-32" />
            </div>
            <SkeletonLoader className="w-24 h-10 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-gray-50">
                    <SkeletonLoader className="h-8 w-16 mx-auto mb-2" />
                    <SkeletonLoader className="h-3 w-20 mx-auto" />
                </div>
            ))}
        </div>
        <div className="space-y-4">
            {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-gray-50 space-y-3">
                    <SkeletonLoader className="h-5 w-full" />
                    <SkeletonLoader className="h-4 w-3/4" />
                    <SkeletonLoader className="h-4 w-1/2" />
                </div>
            ))}
        </div>
    </div>
);

// Full Page Loading Overlay
const LoadingOverlay = ({ message = "Analyzing interactions..." }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
        <div className="text-center">
            <div className="flex justify-center mb-6">
                <PremiumLoader />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">{message}</h3>
            <div className="flex items-center justify-center gap-4">
                {['Fetching data', 'Analyzing', 'Generating report'].map((step, i) => (
                    <div key={step} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}></div>
                        <span className="text-sm text-blue-200">{step}</span>
                        {i < 2 && <span className="text-blue-400/40 mx-1">→</span>}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const severityColor = {
    severe: 'bg-red-500/10 text-red-700 border-red-200/50 backdrop-blur-sm',
    moderate: 'bg-amber-500/10 text-amber-700 border-amber-200/50 backdrop-blur-sm',
    mild: 'bg-yellow-500/10 text-yellow-700 border-yellow-200/50 backdrop-blur-sm',
    none: 'bg-emerald-500/10 text-emerald-700 border-emerald-200/50 backdrop-blur-sm'
};

const severityGradient = {
    severe: 'from-red-500 to-rose-600',
    moderate: 'from-amber-500 to-orange-600',
    mild: 'from-yellow-500 to-amber-600',
    none: 'from-emerald-500 to-teal-600'
};

const SeverityDot = ({ level }) => {
    const colors = { severe: 'bg-red-500', moderate: 'bg-amber-500', mild: 'bg-yellow-400', none: 'bg-emerald-500' };
    return <span className={`inline-block w-3 h-3 rounded-full ${colors[level] || 'bg-gray-400'}`}></span>;
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

// Drug-Food Interactions Database
const drugFoodInteractions = {
    'Warfarin': { foods: ['Leafy greens', 'Cranberries', 'Alcohol'], severity: 'severe', warning: 'Vitamin K in foods can affect blood thinning' },
    'Metformin': { foods: ['Alcohol'], severity: 'moderate', warning: 'May increase risk of lactic acidosis' },
    'Lisinopril': { foods: ['Potassium-rich foods', 'Salt substitutes'], severity: 'moderate', warning: 'Can increase potassium levels' },
    'Simvastatin': { foods: ['Grapefruit juice'], severity: 'severe', warning: 'Increases drug levels significantly' },
    'Levothyroxine': { foods: ['Soy', 'Coffee', 'Calcium'], severity: 'mild', warning: 'Take on empty stomach' },
    'Tetracycline': { foods: ['Dairy products', 'Calcium'], severity: 'moderate', warning: 'Reduces drug absorption' }
};

// Drug Alternatives Database
const drugAlternatives = {
    'Aspirin': [{ name: 'Clopidogrel', reason: 'Alternative antiplatelet', pros: 'Better GI tolerance' }, { name: 'Dipyridamole', reason: 'Non-aspirin antiplatelet', pros: 'Lower bleeding risk' }],
    'Ibuprofen': [{ name: 'Naproxen', reason: 'Longer-acting NSAID', pros: 'Less frequent dosing' }, { name: 'Acetaminophen', reason: 'Non-NSAID option', pros: 'Safer for kidneys' }],
    'Metformin': [{ name: 'Glipizide', reason: 'Sulfonylurea option', pros: 'Different mechanism' }, { name: 'Sitagliptin', reason: 'DPP-4 inhibitor', pros: 'Lower hypoglycemia risk' }],
    'Sertraline': [{ name: 'Escitalopram', reason: 'Alternative SSRI', pros: 'Fewer interactions' }, { name: 'Bupropion', reason: 'NDRI antidepressant', pros: 'No sexual side effects' }]
};

// Dosage Tracker Component
const DosageTracker = ({ drugs, dosageTracking, onAddDosage, onRemoveDosage, onClose }) => {
    const [selectedDrug, setSelectedDrug] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState('daily');
    const [time, setTime] = useState('08:00');

    const handleAdd = () => {
        if (selectedDrug && dosage) {
            onAddDosage({
                id: Date.now(),
                drug: selectedDrug,
                dosage,
                frequency,
                time,
                createdAt: new Date().toISOString()
            });
            setSelectedDrug('');
            setDosage('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CalendarDaysIcon className="h-8 w-8 text-white" />
                        <div>
                            <h2 className="text-2xl font-black text-white">Dosage Tracker</h2>
                            <p className="text-blue-100 text-sm">Monitor your medication schedule</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <Close className="h-6 w-6 text-white" />
                    </button>
                </div>

                <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                    {/* Add Dosage Form */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-200">
                        <h3 className="font-bold text-slate-900 mb-4">Add New Dosage</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Drug</label>
                                <select value={selectedDrug} onChange={(e) => setSelectedDrug(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="">Select drug...</option>
                                    {drugs.map(drug => <option key={drug} value={drug}>{drug}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Dosage</label>
                                <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g., 500mg" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Frequency</label>
                                <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="daily">Daily</option>
                                    <option value="twice">Twice daily</option>
                                    <option value="three">Three times daily</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
                                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <button onClick={handleAdd} className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all">
                            Add to Tracker
                        </button>
                    </div>

                    {/* Current Dosages */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-slate-900">Current Schedule</h3>
                        {dosageTracking.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No dosages tracked yet</p>
                        ) : (
                            dosageTracking.map(entry => (
                                <div key={entry.id} className="bg-white rounded-lg p-4 border border-slate-200 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-900">{entry.drug}</h4>
                                        <p className="text-sm text-slate-600">{entry.dosage} • {entry.frequency} at {entry.time}</p>
                                    </div>
                                    <button onClick={() => onRemoveDosage(entry.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash className="h-5 w-5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Drug Alternatives Modal
const DrugAlternativesModal = ({ drugs, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LightBulbIcon className="h-8 w-8 text-white" />
                        <div>
                            <h2 className="text-2xl font-black text-white">Drug Alternatives</h2>
                            <p className="text-purple-100 text-sm">Suggested safer or more effective options</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <Close className="h-6 w-6 text-white" />
                    </button>
                </div>

                <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                    {drugs.filter(drug => drugAlternatives[drug]).length === 0 ? (
                        <p className="text-center text-slate-500 py-12">No alternatives available for selected drugs</p>
                    ) : (
                        <div className="space-y-6">
                            {drugs.filter(drug => drugAlternatives[drug]).map(drug => (
                                <div key={drug} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border border-slate-200">
                                    <h3 className="text-xl font-bold text-slate-900 mb-4">Alternatives for {drug}</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {drugAlternatives[drug].map((alt, idx) => (
                                            <div key={idx} className="bg-white rounded-lg p-4 border border-slate-200">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h4 className="font-bold text-indigo-600">{alt.name}</h4>
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">Alternative</span>
                                                </div>
                                                <p className="text-sm text-slate-600 mb-2">{alt.reason}</p>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Check className="h-4 w-4 text-emerald-600" />
                                                    <span className="text-emerald-700 font-medium">{alt.pros}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Interactive Drug Matrix View
const DrugMatrixView = ({ drugs, interactions = [], onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <TableCellsIcon className="h-8 w-8 text-white" />
                        <div>
                            <h2 className="text-2xl font-black text-white">Drug Interaction Matrix</h2>
                            <p className="text-cyan-100 text-sm">Visual interaction map</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <Close className="h-6 w-6 text-white" />
                    </button>
                </div>

                <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 bg-slate-100 border border-slate-300 p-3 font-bold text-slate-700"></th>
                                    {drugs.map(drug => (
                                        <th key={drug} className="border border-slate-300 p-3 font-bold text-slate-700 min-w-[100px]">
                                            <div className="transform -rotate-45 origin-center">{drug}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {drugs.map((drug1, i) => (
                                    <tr key={drug1}>
                                        <td className="sticky left-0 bg-slate-100 border border-slate-300 p-3 font-bold text-slate-700">{drug1}</td>
                                        {drugs.map((drug2, j) => {
                                            const isSame = i === j;
                                            const interaction = !isSame && interactions.find(
                                                x => (x.drug1 === drug1 && x.drug2 === drug2) ||
                                                    (x.drug1 === drug2 && x.drug2 === drug1)
                                            );
                                            const severity = interaction ? interaction.severity : 'none';
                                            return (
                                                <td key={drug2} className={`border border-slate-300 p-3 text-center ${isSame ? 'bg-slate-200' :
                                                    severity === 'severe' ? 'bg-red-100 hover:bg-red-200' :
                                                        severity === 'moderate' ? 'bg-amber-100 hover:bg-amber-200' :
                                                            severity === 'mild' ? 'bg-yellow-100 hover:bg-yellow-200' :
                                                                'bg-emerald-100 hover:bg-emerald-200'
                                                    } transition-colors cursor-pointer`}>
                                                    {isSame ? '—' : <SeverityDot level={severity} />}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-red-100 border border-red-300 rounded"></span><span className="text-sm">Severe</span></div>
                        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-amber-100 border border-amber-300 rounded"></span><span className="text-sm">Moderate</span></div>
                        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></span><span className="text-sm">Mild</span></div>
                        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-emerald-100 border border-emerald-300 rounded"></span><span className="text-sm">Safe</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// AI Risk Score Calculator
const RiskScoreCalculator = ({ drugs, interactions, onClose }) => {
    const calculateRisk = () => {
        let score = 0;
        let factors = [];

        // Base risk from number of drugs
        if (drugs.length >= 5) {
            score += 30;
            factors.push('High number of medications (polypharmacy)');
        } else if (drugs.length >= 3) {
            score += 15;
            factors.push('Multiple medications');
        }

        // Risk from interactions
        const severeCount = interactions?.filter(i => i.severity === 'severe').length || 0;
        const moderateCount = interactions?.filter(i => i.severity === 'moderate').length || 0;

        score += severeCount * 25;
        score += moderateCount * 10;

        if (severeCount > 0) factors.push(`${severeCount} severe interaction(s)`);
        if (moderateCount > 0) factors.push(`${moderateCount} moderate interaction(s)`);

        score = Math.min(score, 100);

        return { score, factors };
    };

    const { score, factors } = calculateRisk();
    const riskLevel = score >= 70 ? 'High' : score >= 40 ? 'Moderate' : score >= 20 ? 'Low' : 'Minimal';
    const riskColor = score >= 70 ? 'red' : score >= 40 ? 'amber' : score >= 20 ? 'yellow' : 'emerald';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CubeTransparentIcon className="h-8 w-8 text-white" />
                        <div>
                            <h2 className="text-2xl font-black text-white">AI Risk Score</h2>
                            <p className="text-indigo-100 text-sm">Personalized risk assessment</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <Close className="h-6 w-6 text-white" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Risk Score Gauge */}
                    <div className="text-center mb-6">
                        <div className="relative inline-block">
                            <svg className="transform -rotate-90" width="200" height="200">
                                <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="16" />
                                <circle cx="100" cy="100" r="80" fill="none" stroke={`rgb(var(--color-${riskColor}-500))`} strokeWidth="16" strokeDasharray={`${(score / 100) * 502.4} 502.4`} strokeLinecap="round" className="transition-all duration-1000" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="text-5xl font-black text-slate-900">{score}</div>
                                <div className="text-sm font-semibold text-slate-500">Risk Score</div>
                            </div>
                        </div>
                        <div className={`mt-4 inline-block px-6 py-2 bg-${riskColor}-100 text-${riskColor}-700 rounded-full font-bold text-lg`}>
                            {riskLevel} Risk
                        </div>
                    </div>

                    {/* Risk Factors */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <h3 className="font-bold text-slate-900 mb-3">Risk Factors</h3>
                        <div className="space-y-2">
                            {factors.map((factor, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <Warning className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-slate-700">{factor}</span>
                                </div>
                            ))}
                            {factors.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">No significant risk factors detected</p>
                            )}
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <LightBulbIcon className="h-5 w-5 text-blue-600" />
                            Recommendations
                        </h3>
                        <ul className="space-y-1 text-sm text-slate-700">
                            {score >= 40 && <li>• Consult your healthcare provider immediately</li>}
                            <li>• Review all medications with your pharmacist</li>
                            <li>• Keep an updated medication list</li>
                            <li>• Report any unusual symptoms</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Drug-Food Interactions Warning
const FoodInteractionsWarning = ({ drugs, onClose }) => {
    const relevantInteractions = drugs.filter(drug => drugFoodInteractions[drug]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Beaker className="h-8 w-8 text-white" />
                        <div>
                            <h2 className="text-2xl font-black text-white">Drug-Food Interactions</h2>
                            <p className="text-orange-100 text-sm">Foods to avoid or monitor</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <Close className="h-6 w-6 text-white" />
                    </button>
                </div>

                <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                    {relevantInteractions.length === 0 ? (
                        <p className="text-center text-slate-500 py-12">No known food interactions for selected drugs</p>
                    ) : (
                        <div className="space-y-4">
                            {relevantInteractions.map(drug => {
                                const interaction = drugFoodInteractions[drug];
                                const severityStyles = {
                                    severe: 'from-red-50 to-rose-50 border-red-300',
                                    moderate: 'from-amber-50 to-orange-50 border-amber-300',
                                    mild: 'from-yellow-50 to-amber-50 border-yellow-300'
                                };
                                return (
                                    <div key={drug} className={`bg-gradient-to-br ${severityStyles[interaction.severity]} rounded-xl p-5 border-2`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-xl font-bold text-slate-900">{drug}</h3>
                                            <span className={`px-3 py-1 bg-white rounded-full text-xs font-bold uppercase ${interaction.severity === 'severe' ? 'text-red-700' :
                                                interaction.severity === 'moderate' ? 'text-amber-700' :
                                                    'text-yellow-700'
                                                }`}>
                                                <SeverityDot level={interaction.severity} /> {interaction.severity}
                                            </span>
                                        </div>
                                        <div className="bg-white/60 rounded-lg p-3 mb-3">
                                            <h4 className="font-semibold text-slate-700 mb-2">Avoid These Foods:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {interaction.foods.map(food => (
                                                    <span key={food} className="px-3 py-1 bg-white rounded-full text-sm font-medium text-slate-700 border border-slate-200">
                                                        {food}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 text-sm text-slate-700">
                                            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                            <p>{interaction.warning}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
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

    // New advanced features state
    const [dosageTracking, setDosageTracking] = useState(() => {
        const saved = localStorage.getItem('dosageTracking');
        return saved ? JSON.parse(saved) : [];
    });
    const [medicationReminders, setMedicationReminders] = useState(() => {
        const saved = localStorage.getItem('medicationReminders');
        return saved ? JSON.parse(saved) : [];
    });
    const [showDosageTracker, setShowDosageTracker] = useState(false);
    const [showReminders, setShowReminders] = useState(false);
    const [showAlternatives, setShowAlternatives] = useState(false);
    const [showMatrixView, setShowMatrixView] = useState(false);
    const [showRiskCalculator, setShowRiskCalculator] = useState(false);
    const [showFoodInteractions, setShowFoodInteractions] = useState(false);

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
        if (drugInput.trim().length < 1) {
            setSuggestions([]);
            return undefined;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                setIsSearching(true);
                const query = encodeURIComponent(drugInput.trim());
                let results = [];

                // Try microservice search first
                try {
                    const res = await fetch(`${API_BASE}/search?query=${query}&limit=50`, {
                        signal: controller.signal
                    });
                    if (!res.ok) throw new Error('Microservice search failed');
                    const data = await res.json();
                    results = data.results || [];
                } catch (msErr) {
                    if (msErr.name === 'AbortError') throw msErr;
                    // Fallback: ML service drug search (FastAPI /drugs endpoint)
                    const ML_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
                    const fallbackRes = await fetch(`${ML_BASE}/drugs?q=${query}&limit=50`, {
                        signal: controller.signal
                    });
                    if (fallbackRes.ok) {
                        const fallbackData = await fallbackRes.json();
                        results = (fallbackData || []).map(d => ({
                            name: d.name,
                            type: d.type || 'generic',
                            genericName: d.generic || '',
                            class: d.class || ''
                        }));
                    }
                }

                // Only show generic drug names (not brand names)
                results = results.filter(s => s.type === 'generic');

                setSuggestions(results);
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
            // Add top suggestion on Enter if available
            if (suggestions.length > 0) {
                const s = suggestions[0];
                addDrug(s.name);
            }
        }
    }, [suggestions, addDrug]);

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

    // New feature handlers
    const handleAddDosage = useCallback((dosage) => {
        setDosageTracking(prev => [...prev, dosage]);
        localStorage.setItem('dosageTracking', JSON.stringify([...dosageTracking, dosage]));
    }, [dosageTracking]);

    const handleRemoveDosage = useCallback((id) => {
        setDosageTracking(prev => {
            const updated = prev.filter(d => d.id !== id);
            localStorage.setItem('dosageTracking', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const handleExportToPDF = useCallback(() => {
        window.print();
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
            // Call both ML Service and Microservice in parallel for maximum coverage
            const [mlPromise, msPromise] = [
                mlService.checkInteractions(drugs, false).catch(() => null),
                fetch(`${API_BASE}/check-interactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ drugs })
                }).then(r => r.ok ? r.json() : null).catch(() => null)
            ];

            const [mlResult, msResult] = await Promise.all([mlPromise, msPromise]);

            let data = null;

            // Transform ML service result
            if (mlResult?.success) {
                data = {
                    severity: mlResult.interactions?.length > 0
                        ? mlResult.interactions.reduce((max, i) =>
                            i.severity === 'severe' ? 'severe' :
                                i.severity === 'moderate' && max !== 'severe' ? 'moderate' :
                                    i.severity === 'mild' && max === 'none' ? 'mild' : max, 'none')
                        : 'none',
                    interactions: mlResult.interactions?.map(i => ({
                        drug1: i.drug_pair[0],
                        drug2: i.drug_pair[1],
                        severity: i.severity,
                        description: i.description,
                        confidence: i.confidence,
                        recommendation: `Confidence: ${(i.confidence * 100).toFixed(0)}%`
                    })) || [],
                    risk_score: mlResult.risk_score,
                    processing_time_ms: mlResult.processing_time_ms
                };
            }

            // Merge microservice results (adds any interactions not already found)
            if (msResult?.interactions?.length > 0) {
                if (!data) {
                    data = msResult;
                } else {
                    const existingKeys = new Set(data.interactions.map(i =>
                        [i.drug1, i.drug2].sort().join('|').toLowerCase()));
                    for (const mi of msResult.interactions) {
                        const key = [mi.drug1, mi.drug2].sort().join('|').toLowerCase();
                        if (!existingKeys.has(key)) {
                            existingKeys.add(key);
                            data.interactions.push(mi);
                        }
                    }
                    // Recalculate severity after merge
                    if (data.interactions.length > 0) {
                        data.severity = data.interactions.reduce((max, i) =>
                            i.severity === 'severe' ? 'severe' :
                                i.severity === 'moderate' && max !== 'severe' ? 'moderate' :
                                    i.severity === 'mild' && max === 'none' ? 'mild' : max, 'none');
                    }
                }
            }

            if (!data) {
                throw new Error('Both ML Service and Drug Interaction Service are unavailable');
            }

            // Add minimum 1.5s delay to show beautiful loading animation
            const elapsed = performance.now() - started;
            const minDelay = 1500;
            if (elapsed < minDelay) {
                await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
            }

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
        if (!result?.interactions?.length) return { severe: 0, moderate: 0, mild: 0, none: 0 };
        const counts = result.interactions.reduce((acc, i) => {
            acc[i.severity] = (acc[i.severity] || 0) + 1;
            return acc;
        }, { severe: 0, moderate: 0, mild: 0, none: 0 });
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
        <div className="relative">
            {/* Animation Styles */}
            <AnimationStyles />

            {/* Loading Overlay */}
            {loading && <LoadingOverlay message="Analyzing Drug Interactions..." />}

            {/* Page Header */}
            <div className="mb-4">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Drug Interaction Checker</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Clinical Safety Analysis</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
                    {[
                        { id: 'check', label: 'Check Interactions', icon: ShieldCheck, count: null },
                        { id: 'history', label: 'History', icon: Clock, count: history.length },
                        { id: 'saved', label: 'Saved', icon: Bookmark, count: savedResults.length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            {activeTab === tab.id && (
                                <div className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-500 rounded-full"></div>
                            )}
                            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-blue-500' : ''}`} />
                            <span>{tab.label}</span>
                            {tab.count !== null && tab.count > 0 && (
                                <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${activeTab === tab.id
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative">
                {/* Main Check Tab */}
                {activeTab === 'check' && (
                    <div className="space-y-6">
                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <section className="lg:col-span-2 space-y-6">
                                {/* Input Card */}
                                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">

                                    <div>
                                        <div className="mb-4">
                                            <h2 className="text-lg font-semibold text-gray-900">Enter Medications</h2>
                                            <p className="text-sm text-gray-500 mt-1">Add at least two drugs to check for potential interactions.</p>
                                        </div>
                                    </div>

                                    <form className="space-y-4" onSubmit={submitCheck}>
                                        {/* Enhanced Search Input */}
                                        <div className="relative group">
                                            {/* Glow Effect */}
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl blur opacity-0 group-focus-within:opacity-30 transition duration-500"></div>

                                            <div className="relative">
                                                {/* Search Icon with Animation */}
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <div className="relative">
                                                        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                                                        {isSearching && (
                                                            <div className="absolute inset-0 animate-ping">
                                                                <Search className="h-5 w-5 text-blue-400 opacity-50" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <input
                                                    value={drugInput}
                                                    onChange={(e) => setDrugInput(e.target.value)}
                                                    onKeyDown={handleInputKeyDown}
                                                    placeholder="Search medications by generic name..."
                                                    className="w-full pl-12 pr-24 py-4 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-base shadow-sm hover:shadow-md hover:border-gray-300"
                                                />

                                                {/* Right Side Actions */}
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    {isSearching && (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg">
                                                            <Refresh className="h-4 w-4 text-blue-500 animate-spin" />
                                                            <span className="text-xs text-blue-600 font-medium">Searching...</span>
                                                        </div>
                                                    )}

                                                    {/* Voice Input Button */}
                                                    <button
                                                        type="button"
                                                        onClick={startListening}
                                                        className={`relative p-2.5 rounded-xl transition-all duration-300 ${isListening
                                                            ? 'bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30'
                                                            : 'bg-gray-100 text-gray-500 hover:bg-gradient-to-br hover:from-blue-500 hover:to-indigo-500 hover:text-white hover:shadow-lg hover:shadow-blue-500/30'
                                                            }`}
                                                        title={isListening ? 'Listening...' : 'Voice Input'}
                                                    >
                                                        <MicrophoneIcon className="h-5 w-5" />
                                                        {isListening && (
                                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                            </span>
                                                        )}
                                                    </button>
                                            </div>
                                            </div>

                                            {/* Enhanced Suggestions Dropdown */}
                                        {suggestions.length > 0 && (
                                                <ul className="absolute z-20 mt-2 w-full backdrop-blur-xl bg-white/95 border border-gray-200/50 rounded-2xl shadow-2xl shadow-blue-500/10 divide-y divide-gray-100/50 max-h-72 overflow-auto">
                                                    <li className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                                                        Suggested Medications
                                                    </li>
                                                    {suggestions.map((s, idx) => (
                                                    <li
                                                        key={s.id || s.name}
                                                            className="px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 group/item"
                                                            onMouseDown={() => addDrug(s.name)}
                                                    >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center group-hover/item:from-blue-200 group-hover/item:to-indigo-200 transition-colors">
                                                                        <Beaker className="h-5 w-5 text-blue-600" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-gray-900 group-hover/item:text-blue-700 transition-colors">{s.name}</p>
                                                                        {s.class && (
                                                                            <p className="text-xs text-blue-400">{s.class}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                                                                        Generic
                                                                    </span>
                                                                    <span className="text-xs text-gray-400 group-hover/item:text-blue-500 transition-colors">+ Add</span>
                                                                </div>
                                                            </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                        {/* Drug Tags - 3D Pill Style */}
                                        <div className="relative">
                                            <div className="flex flex-wrap gap-2.5 min-h-[52px] p-3 bg-gradient-to-br from-gray-50/80 to-blue-50/30 backdrop-blur-sm rounded-xl border border-gray-200/50">
                                                {drugs.length === 0 ? (
                                                    <div className="flex items-center gap-3 text-gray-400">
                                                        <div className="flex -space-x-2">
                                                            {[...Array(3)].map((_, i) => (
                                                                <div key={i} className="w-8 h-8 rounded-full bg-gray-200/50 border-2 border-white flex items-center justify-center">
                                                                    <ShieldCheck className="h-4 w-4 text-gray-400" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <span className="text-sm">Add medications to check interactions...</span>
                                                    </div>
                                                ) : (
                                                    drugs.map((drug, idx) => (
                                                        <div
                                                            key={drug}
                                                            className="group relative animate-fade-in-up"
                                                            style={{ animationDelay: `${idx * 50}ms` }}
                                                        >
                                                            {/* 3D Pill Tag */}
                                                            <div className="relative">
                                                                {/* Shadow/Glow Layer */}
                                                                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full blur-sm opacity-30 group-hover:opacity-50 transition-opacity"></div>

                                                                {/* Main Pill */}
                                                                <span className="relative inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-br from-white via-blue-50 to-indigo-100 text-blue-800 text-sm font-medium border border-blue-200/50 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5">
                                                                    {/* Pill Icon with Shine */}
                                                                    <span className="relative mr-2">
                                                                        <span className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full blur-[2px] opacity-30"></span>
                                                                        <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                                                                            <ShieldCheck className="h-3.5 w-3.5" />
                                                                        </span>
                                                                    </span>

                                                                    {/* Drug Name */}
                                                                    <span className="font-semibold">{drug}</span>

                                                                    {/* Remove Button */}
                                                                    <button
                                                                        type="button"
                                                                        className="ml-2 p-1 rounded-full text-blue-400 hover:text-white hover:bg-red-500 transition-all duration-200 hover:rotate-90"
                                                                        onClick={() => removeDrug(drug)}
                                                                        aria-label={`Remove ${drug}`}
                                                                    >
                                                                        <Close className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Drug Count Badge */}
                                            {drugs.length > 0 && (
                                                <div className="absolute -top-2 -right-2 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-full shadow-lg animate-fade-in-up">
                                                    {drugs.length} drug{drugs.length > 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons - Enhanced */}
                                        <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-gray-100">
                                            {/* Primary Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={!canSubmit}
                                                className={`group relative inline-flex items-center px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden ${canSubmit
                                                    ? 'text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                                {/* Animated Gradient Background */}
                                                {canSubmit && (
                                                    <>
                                                        <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 background-animate"></span>
                                                        <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ filter: 'brightness(1.1)' }}></span>
                                                        <span className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[radial-gradient(circle_at_50%_-20%,white,transparent_70%)] transition-opacity duration-300"></span>
                                                    </>
                                                )}
                                                <span className="relative flex items-center gap-2">
                                            {loading ? (
                                                <>
                                                            <Refresh className="h-5 w-5 animate-spin" />
                                                            <span>Analyzing...</span>
                                                </>
                                            ) : (
                                                <>
                                                                <Bolt className="h-5 w-5 group-hover:animate-pulse" />
                                                                <span>Check Interactions</span>
                                                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                                                </>
                                            )}
                                                </span>
                                        </button>

                                            {/* Sample Button */}
                                        <button
                                            type="button"
                                            onClick={loadSample}
                                                className="group inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 hover:border-amber-300 hover:shadow-md hover:shadow-amber-500/10 transition-all duration-300"
                                        >
                                                <Sparkles className="h-4 w-4 mr-2 text-amber-500 group-hover:animate-spin" style={{ animationDuration: '3s' }} />
                                            Load Sample
                                        </button>

                                            {/* Categories Button */}
                                        <button
                                            type="button"
                                            onClick={() => setShowCategories(!showCategories)}
                                                className={`group inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-300 ${
                                                showCategories 
                                                    ? 'border-indigo-300 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 shadow-md shadow-indigo-500/10'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:bg-indigo-50'
                                            }`}
                                        >
                                                <Beaker className="h-4 w-4 mr-2" />
                                            Categories
                                                <span className={`ml-1.5 transition-transform duration-300 ${showCategories ? 'rotate-180' : ''}`}>
                                                    <ChevronDown className="h-4 w-4" />
                                                </span>
                                        </button>

                                            {/* Clear Button */}
                                        {drugs.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={clearAll}
                                                    className="group inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:shadow-md hover:shadow-red-500/10 transition-all duration-300"
                                            >
                                                    <Trash className="h-4 w-4 mr-2 group-hover:animate-bounce" />
                                                    Clear All
                                            </button>
                                        )}
                                    </div>
                                </form>

                                    {/* Drug Categories Panel - Enhanced */}
                                {showCategories && (
                                        <div className="mt-5 p-5 backdrop-blur-sm bg-gradient-to-br from-white/80 to-indigo-50/50 rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-500/5 animate-fade-in-up">
                                            <div className="flex items-center gap-2 mb-4">
                                                <ShieldCheck className="h-5 w-5 text-indigo-500" />
                                                <p className="text-sm font-bold text-gray-800">Quick Add by Category</p>
                                            </div>
                                            <div className="space-y-4">
                                            {Object.entries(drugCategories).map(([category, categoryDrugs]) => (
                                                <div key={category} className="group">
                                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                        {category}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {categoryDrugs.map(drug => (
                                                            <button
                                                                key={drug}
                                                                type="button"
                                                                onClick={() => addDrug(drug)}
                                                                disabled={drugs.includes(drug)}
                                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                                                                    drugs.includes(drug)
                                                                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 cursor-not-allowed ring-2 ring-blue-300/50'
                                                                    : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 hover:shadow-md hover:scale-105'
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

                                {/* Results Skeleton when Loading */}
                                {loading && !result && (
                                    <ResultsSkeleton />
                                )}

                                {/* Results Section - Enhanced */}
                            {result && (
                                    <div ref={resultRef} className="relative overflow-hidden backdrop-blur-xl bg-white/90 border border-white/50 rounded-3xl shadow-2xl shadow-blue-500/10 animate-fade-in-up print:shadow-none">
                                        {/* Decorative Background */}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
                                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 rounded-full blur-3xl"></div>

                                        {/* Header Section */}
                                        <div className="relative p-6 border-b border-gray-100">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                    {/* Animated Status Icon */}
                                                    <div className={`relative p-4 rounded-2xl ${result.severity === 'severe' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                                                        result.severity === 'moderate' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                                                            result.severity === 'mild' ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                                                                'bg-gradient-to-br from-emerald-500 to-teal-600'
                                                        } shadow-lg`}>
                                                        <span className="text-3xl"><SeverityDot level={result.severity} /></span>
                                                        {result.severity === 'severe' && (
                                                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                                            Analysis Complete
                                                            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${result.severity === 'severe' ? 'bg-red-100 text-red-700' :
                                                                result.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                                                                    result.severity === 'mild' ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-emerald-100 text-emerald-700'
                                                                }`}>
                                                                {result.severity || 'Safe'}
                                                            </span>
                                                        </h3>
                                                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                                                            {lastCheckedAt && (
                                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded-full">
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                    {lastCheckedAt.toLocaleString()}
                                                                </span>
                                                            )}
                                                            {typeof durationMs === 'number' && (
                                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                                                    <Bolt className="h-3.5 w-3.5" />
                                                                    {durationMs}ms
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                                                                {drugs.length} medications
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Enhanced Action Buttons */}
                                                <div className="flex items-center gap-1 p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl print:hidden">
                                                    <button
                                                        onClick={saveResult}
                                                        disabled={isResultSaved}
                                                        className={`group p-2.5 rounded-lg transition-all duration-300 ${isResultSaved
                                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                            : 'text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-md'
                                                            }`}
                                                        title={isResultSaved ? 'Saved' : 'Save result'}
                                                    >
                                                        {isResultSaved ? <BookmarkSolid className="h-5 w-5" /> : <Bookmark className="h-5 w-5 group-hover:scale-110 transition-transform" />}
                                                    </button>
                                                    <button
                                                        onClick={copyToClipboard}
                                                        className={`group p-2.5 rounded-lg transition-all duration-300 ${copiedToClipboard
                                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                            : 'text-gray-500 hover:bg-white hover:text-emerald-600 hover:shadow-md'
                                                            }`}
                                                        title="Copy to clipboard"
                                                    >
                                                        {copiedToClipboard ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5 group-hover:scale-110 transition-transform" />}
                                                    </button>
                                                    <button
                                                        onClick={exportAsJSON}
                                                        className="group p-2.5 rounded-lg text-gray-500 hover:bg-white hover:text-purple-600 hover:shadow-md transition-all duration-300"
                                                        title="Export as JSON"
                                                    >
                                                        <Download className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                                    </button>
                                                    <button
                                                        onClick={printResults}
                                                        className="group p-2.5 rounded-lg text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-md transition-all duration-300"
                                                        title="Print results"
                                                    >
                                                        <Print className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* New Features Action Bar */}
                                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-b border-indigo-100 px-6 py-4 print:hidden">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    onClick={() => setShowDosageTracker(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 text-blue-600 font-semibold rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all text-sm"
                                                >
                                                    <CalendarDaysIcon className="h-5 w-5" />
                                                    <span>Dosage Tracker</span>
                                                    {dosageTracking.length > 0 && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                                            {dosageTracking.length}
                                                        </span>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setShowAlternatives(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 text-purple-600 font-semibold rounded-lg border border-purple-200 hover:border-purple-300 hover:shadow-md transition-all text-sm"
                                                >
                                                    <LightBulbIcon className="h-5 w-5" />
                                                    <span>Alternatives</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowMatrixView(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-cyan-50 text-cyan-600 font-semibold rounded-lg border border-cyan-200 hover:border-cyan-300 hover:shadow-md transition-all text-sm"
                                                >
                                                    <TableCellsIcon className="h-5 w-5" />
                                                    <span>Matrix View</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowRiskCalculator(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-600 font-semibold rounded-lg border border-indigo-200 hover:border-indigo-300 hover:shadow-md transition-all text-sm"
                                                >
                                                    <CubeTransparentIcon className="h-5 w-5" />
                                                    <span>Risk Score</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowFoodInteractions(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-orange-50 text-orange-600 font-semibold rounded-lg border border-orange-200 hover:border-orange-300 hover:shadow-md transition-all text-sm"
                                                >
                                                    <Beaker className="h-5 w-5" />
                                                    <span>Food Warnings</span>
                                                </button>
                                                <button
                                                    onClick={handleExportToPDF}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-sm"
                                                >
                                                    <Download className="h-5 w-5" />
                                                    <span>Export PDF</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Summary Cards - Enhanced */}
                                        <div className="p-6">
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                                                {/* Circular Risk Score Card */}
                                                <div className="relative overflow-hidden backdrop-blur-sm bg-gradient-to-br from-white to-gray-50 border border-gray-200/50 rounded-2xl p-5 shadow-lg">
                                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl"></div>

                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Safety Score</h4>
                                                            <p className="text-xs text-gray-500 mt-0.5">Overall risk assessment</p>
                                                        </div>
                                                        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${riskLevel.bgLight} ${riskLevel.color}`}>
                                                            {riskLevel.label}
                                                        </div>
                                                    </div>

                                                    {/* Circular Progress */}
                                                    <div className="flex items-center justify-center py-4">
                                                        <div className="relative">
                                                            {/* Background Circle */}
                                                            <svg className="w-32 h-32 transform -rotate-90">
                                                                <circle
                                                                    cx="64"
                                                                    cy="64"
                                                                    r="56"
                                                                    stroke="currentColor"
                                                                    strokeWidth="12"
                                                                    fill="none"
                                                                    className="text-gray-200"
                                                                />
                                                                {/* Progress Circle */}
                                                                <circle
                                                                    cx="64"
                                                                    cy="64"
                                                                    r="56"
                                                                    stroke="url(#scoreGradient)"
                                                                    strokeWidth="12"
                                                                    fill="none"
                                                                    strokeLinecap="round"
                                                                    strokeDasharray={`${riskScore * 3.52} 352`}
                                                                    className="transition-all duration-1000 ease-out"
                                                                />
                                                                <defs>
                                                                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                                        <stop offset="0%" stopColor={riskScore >= 70 ? '#10b981' : riskScore >= 50 ? '#f59e0b' : '#ef4444'} />
                                                                        <stop offset="100%" stopColor={riskScore >= 70 ? '#06b6d4' : riskScore >= 50 ? '#f97316' : '#dc2626'} />
                                                                    </linearGradient>
                                                                </defs>
                                                            </svg>
                                                            {/* Score Text */}
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                <span className={`text-4xl font-black ${riskLevel.color}`}>{riskScore}</span>
                                                                <span className="text-xs text-gray-400 font-medium">/ 100</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Interaction Severity Cards */}
                                                <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    {[
                                                        { level: 'severe', dotColor: 'bg-red-500', gradient: 'from-red-500 to-rose-600', bg: 'from-red-50 to-rose-50', border: 'border-red-200' },
                                                        { level: 'moderate', dotColor: 'bg-amber-500', gradient: 'from-amber-500 to-orange-600', bg: 'from-amber-50 to-orange-50', border: 'border-amber-200' },
                                                        { level: 'mild', dotColor: 'bg-yellow-400', gradient: 'from-yellow-400 to-amber-500', bg: 'from-yellow-50 to-amber-50', border: 'border-yellow-200' },
                                                        { level: 'none', dotColor: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-600', bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200' }
                                                    ].map(({ level, dotColor, gradient, bg, border }) => (
                                                        <button
                                                            key={level}
                                                            onClick={() => setSeverityFilter(severityFilter === level ? 'all' : level)}
                                                            className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${severityFilter === level
                                                                ? `bg-gradient-to-br ${gradient} text-white shadow-lg`
                                                                : `bg-gradient-to-br ${bg} ${border} border hover:shadow-md`
                                                                }`}
                                                        >
                                                            {/* Selection Ring */}
                                                            {severityFilter === level && (
                                                                <div className="absolute inset-0 ring-2 ring-white/50 rounded-2xl"></div>
                                                            )}

                                                            <div className="relative">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className={`w-4 h-4 rounded-full ${severityFilter === level ? 'bg-white/80' : dotColor}`}></span>
                                                                    {severityFilter === level && (
                                                                        <Check className="h-4 w-4" />
                                                                    )}
                                                                </div>
                                                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${severityFilter === level ? 'text-white/80' : 'text-gray-500'
                                                                    }`}>
                                                                    {level}
                                                                </p>
                                                                <p className={`text-3xl font-black ${severityFilter === level ? 'text-white' : 'text-gray-900'
                                                                    }`}>
                                                                    {interactionSummary[level] || 0}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Timing Assistant - Enhanced */}
                                    {result.interactions?.length > 0 && (
                                                <div className="mb-6 relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-[1px]">
                                                    <div className="relative bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-5">
                                                        {/* Decorative */}
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl"></div>

                                                        <div className="relative flex items-start gap-4">
                                                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                                                <CalendarDaysIcon className="h-6 w-6 text-white" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                                    Optimization Strategy
                                                                </h3>
                                                                <p className="text-sm text-gray-600 mt-2">
                                                                    Based on the identified interactions, consider the following scheduling adjustments:
                                                                </p>
                                                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <div className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-100">
                                                                        <Clock className="h-6 w-6 text-indigo-500 flex-shrink-0" />
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-900">Timing Gap</p>
                                                                            <p className="text-xs text-gray-600">Space out administration by <strong className="text-indigo-600">2-4 hours</strong></p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
                                                                        <Beaker className="h-6 w-6 text-purple-500 flex-shrink-0" />
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-900">Food Intake</p>
                                                                            <p className="text-xs text-gray-600">Consult pharmacist for <strong className="text-purple-600">meal timing</strong></p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                            </div>
                                        </div>
                                    )}

                                            {/* Enhanced Filter Bar */}
                                    {result.interactions?.length > 0 && (
                                                <div className="flex items-center justify-between mb-5 p-3 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-100 print:hidden">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                                            <Filter className="h-4 w-4 text-gray-500" />
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-semibold text-gray-700">
                                                                Showing {filteredInteractions.length} of {result.interactions.length}
                                                            </span>
                                                            <span className="text-sm text-gray-500 ml-1">interactions</span>
                                                        </div>
                                                {severityFilter !== 'all' && (
                                                    <button
                                                        onClick={() => setSeverityFilter('all')}
                                                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                                                    >
                                                                <Close className="h-3 w-3" />
                                                        Clear filter
                                                    </button>
                                                )}
                                            </div>
                                                    <div className="flex items-center gap-1 p-1 bg-white rounded-xl shadow-sm border border-gray-200">
                                                <button
                                                    onClick={() => setViewMode('cards')}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'cards'
                                                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                                                                : 'text-gray-500 hover:bg-gray-100'
                                                                }`}
                                                    title="Card view"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                            <span className="hidden sm:inline">Cards</span>
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('compact')}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'compact'
                                                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                                                                : 'text-gray-500 hover:bg-gray-100'
                                                                }`}
                                                    title="Compact view"
                                                >
                                                    <EyeOff className="h-4 w-4" />
                                                            <span className="hidden sm:inline">Compact</span>
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('matrix')}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'matrix'
                                                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                                                                : 'text-gray-500 hover:bg-gray-100'
                                                                }`}
                                                    title="Matrix view"
                                                >
                                                    <TableCellsIcon className="h-4 w-4" />
                                                            <span className="hidden sm:inline">Matrix</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Interaction Content */}
                                    {viewMode === 'matrix' ? (
                                                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                                            <table className="min-w-full border-collapse text-sm">
                                                <thead>
                                                    <tr>
                                                                <th className="p-3 border-b border-r bg-gradient-to-br from-gray-50 to-gray-100 font-bold text-gray-600 text-xs uppercase tracking-wider">Drug</th>
                                                        {drugs.map(d => (
                                                            <th key={d} className="p-3 border-b bg-gradient-to-br from-gray-50 to-gray-100 font-bold text-gray-700 text-sm">{d}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {drugs.map((rowDrug, i) => (
                                                        <tr key={rowDrug} className="hover:bg-blue-50/30 transition-colors">
                                                            <td className="p-3 border-r bg-gradient-to-r from-gray-50 to-transparent font-bold text-gray-700">{rowDrug}</td>
                                                            {drugs.map((colDrug, j) => {
                                                                if (i === j) return <td key={colDrug} className="p-3 bg-gray-100/50 text-center"><span className="text-gray-300">—</span></td>;
                                                                
                                                                const interaction = result.interactions.find(
                                                                    x => (x.drug1 === rowDrug && x.drug2 === colDrug) || 
                                                                         (x.drug1 === colDrug && x.drug2 === rowDrug)
                                                                );
                                                                
                                                                return (
                                                                    <td key={colDrug} className={`p-3 text-center transition-all hover:scale-110 ${interaction ? severityColor[interaction.severity] : ''}`}>
                                                                        {interaction ? (
                                                                            <span className="text-2xl cursor-help" title={interaction.description}><SeverityDot level={interaction.severity} /></span>
                                                                        ) : (
                                                                                <span className="text-xl text-emerald-500">✓</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                                    <div className="p-3 bg-gray-50 border-t text-center">
                                                        <p className="text-xs text-gray-500">Hover over icons for interaction details • ✓ indicates no known interaction</p>
                                                    </div>
                                        </div>
                                    ) : (
                                                    <div className={`space-y-4 ${viewMode === 'compact' ? 'space-y-3' : ''}`}>
                                            {filteredInteractions.length > 0 ? (
                                                            filteredInteractions.map((i, idx) => {
                                                                const severityStyles = {
                                                                    severe: { gradient: 'from-red-500 to-rose-600', bg: 'from-red-50 via-rose-50 to-pink-50', border: 'border-red-200/50', dotColor: 'bg-red-500' },
                                                                    moderate: { gradient: 'from-amber-500 to-orange-600', bg: 'from-amber-50 via-orange-50 to-yellow-50', border: 'border-amber-200/50', dotColor: 'bg-amber-500' },
                                                                    mild: { gradient: 'from-yellow-400 to-amber-500', bg: 'from-yellow-50 via-amber-50 to-orange-50', border: 'border-yellow-200/50', dotColor: 'bg-yellow-400' },
                                                                    none: { gradient: 'from-emerald-500 to-teal-600', bg: 'from-emerald-50 via-teal-50 to-cyan-50', border: 'border-emerald-200/50', dotColor: 'bg-emerald-500' }
                                                                };
                                                                const style = severityStyles[i.severity] || severityStyles.mild;

                                                                return (
                                                                    <div
                                                                        key={`${i.drug1}-${i.drug2}-${idx}`} 
                                                                        className={`group relative overflow-hidden backdrop-blur-sm bg-gradient-to-br ${style.bg} border ${style.border} rounded-2xl shadow-lg shadow-gray-500/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${viewMode === 'compact' ? 'p-4' : 'p-5'
                                                                            }`}
                                                                    >
                                                                        {/* Decorative Gradient Line */}
                                                                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.gradient}`}></div>

                                                                        {/* Header */}
                                                                        <div
                                                                            className="flex items-center justify-between cursor-pointer"
                                                                            onClick={() => toggleExpanded(idx)}
                                                                        >
                                                                            <div className="flex items-center gap-4">
                                                                                {/* Icon Container */}
                                                                                <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg`}>
                                                                                    <ShieldCheck className="h-6 w-6 text-white" />
                                                                                    {i.severity === 'severe' && (
                                                                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Drug Names */}
                                                                                <div>
                                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                                        <span className="px-2.5 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-sm font-bold text-gray-800 shadow-sm">
                                                                                            {i.drug1}
                                                                                        </span>
                                                                                        <span className="text-gray-400 font-bold">×</span>
                                                                                        <span className="px-2.5 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-sm font-bold text-gray-800 shadow-sm">
                                                                                            {i.drug2}
                                                                                        </span>
                                                                                    </div>
                                                                                    {viewMode === 'compact' && !expandedInteractions[idx] && (
                                                                                        <p className="text-xs text-gray-600 mt-1.5 truncate max-w-md">{i.description}</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Right Side */}
                                                                            <div className="flex items-center gap-3">
                                                                                <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${style.gradient} text-white shadow-md`}>
                                                                                    {i.severity}
                                                                                </span>
                                                                                <button className="p-2 hover:bg-white/50 rounded-lg transition-all duration-200 print:hidden group-hover:bg-white/30">
                                                                                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${expandedInteractions[idx] ? 'rotate-180' : ''}`} />
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Expandable Content */}
                                                                        {(viewMode !== 'compact' || expandedInteractions[idx]) && (
                                                                            <div className={`mt-4 space-y-4 ${expandedInteractions[idx] ? 'animate-fade-in-up' : ''}`}>
                                                                                {/* Description */}
                                                                                <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50">
                                                                                    <p className="text-sm text-gray-700 leading-relaxed">{i.description}</p>
                                                                                </div>

                                                                                {/* Recommendation */}
                                                                                <div className="flex items-start gap-3 p-4 bg-blue-50/50 backdrop-blur-sm rounded-xl border border-blue-100/50">
                                                                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                                                                                        <Info className="h-4 w-4 text-white" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Recommendation</p>
                                                                                        <p className="text-sm text-blue-700">
                                                                                            {i.recommendation || 'Consult a healthcare provider for guidance.'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Mechanism (if expanded and available) */}
                                                                                {expandedInteractions[idx] && i.mechanism && (
                                                                                    <div className="flex items-start gap-3 p-4 bg-purple-50/50 backdrop-blur-sm rounded-xl border border-purple-100/50">
                                                                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                                                                                            <Beaker className="h-4 w-4 text-white" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">Mechanism</p>
                                                                                            <p className="text-sm text-purple-700">{i.mechanism}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                            ) : result.interactions?.length > 0 ? (
                                                                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border border-gray-100">
                                                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                                                                        <Filter className="h-8 w-8 text-gray-400" />
                                                                    </div>
                                                                    <p className="text-gray-600 font-medium">No interactions match the selected filter</p>
                                                    <button
                                                        onClick={() => setSeverityFilter('all')}
                                                                        className="mt-3 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                    >
                                                        Show all interactions
                                                    </button>
                                                </div>
                                            ) : (
                                                                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/50 rounded-2xl p-6">
                                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl"></div>
                                                                        <div className="relative flex items-center gap-4">
                                                                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                                                                <Check className="h-7 w-7 text-white" />
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-lg font-bold text-emerald-800">No Interactions Detected!</h4>
                                                                                <p className="text-sm text-emerald-600 mt-1">This drug combination appears to be safe based on our clinical database.</p>
                                                                            </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                        </div>
                                </div>
                            )}
                        </section>

                        {/* Sidebar */}
                        <aside className="space-y-4">
                                {/* Clinical Guidance Card - Enhanced */}
                                <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 border border-amber-200/50 rounded-2xl shadow-xl shadow-amber-500/10 p-5">
                                    {/* Decorative Elements */}
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-2xl"></div>
                                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-yellow-400/20 to-amber-400/20 rounded-full blur-xl"></div>

                                    {/* Header */}
                                    <div className="relative flex items-center gap-3 mb-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl blur opacity-40"></div>
                                            <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                                <Warning className="h-6 w-6 text-amber-500" />
                                            </div>
                                    </div>
                                    <div>
                                            <p className="text-sm font-bold text-amber-900">Clinical Guidance</p>
                                            <p className="text-xs text-amber-700/70">Important safety notes</p>
                                        </div>
                                    </div>

                                    {/* Guidelines */}
                                    <div className="relative space-y-3">
                                        <div className="group flex gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-amber-200/50 hover:bg-white/80 hover:shadow-md transition-all duration-300">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Beaker className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <p className="text-sm text-amber-900 leading-relaxed">Always verify results with clinical judgment and professional guidance.</p>
                                        </div>
                                        <div className="group flex gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-blue-200/50 hover:bg-white/80 hover:shadow-md transition-all duration-300">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Heart className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <p className="text-sm text-blue-900 leading-relaxed">Consider patient-specific factors like age, weight, and comorbidities.</p>
                                        </div>
                                        <div className="group flex gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-purple-200/50 hover:bg-white/80 hover:shadow-md transition-all duration-300">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Bookmark className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <p className="text-sm text-purple-900 leading-relaxed">Document all interactions and discuss with healthcare team.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Add Popular Drugs - Enhanced */}
                                <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-violet-50/90 border border-blue-200/50 rounded-2xl shadow-xl shadow-blue-500/10 p-5">
                                    {/* Decorative */}
                                    <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-2xl"></div>

                                    {/* Header */}
                                    <div className="relative flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                                <Bolt className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Quick Add</p>
                                                <p className="text-xs text-gray-500">Popular medications</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 rounded-full">
                                            Top 6
                                        </span>
                                    </div>

                                    {/* Drug Pills */}
                                    <div className="relative flex flex-wrap gap-2">
                                        {[
                                            { name: 'Warfarin' },
                                            { name: 'Aspirin' },
                                            { name: 'Metformin' },
                                            { name: 'Ibuprofen' },
                                            { name: 'Lisinopril' },
                                            { name: 'Omeprazole' }
                                        ].map((drug) => (
                                        <button
                                                key={drug.name}
                                            type="button"
                                                onClick={() => addDrug(drug.name)}
                                                disabled={drugs.includes(drug.name)}
                                                className={`group flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${drugs.includes(drug.name)
                                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30 cursor-not-allowed'
                                                    : 'bg-white/80 backdrop-blur-sm border border-gray-200/50 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md hover:scale-105'
                                            }`}
                                            >
                                                <span>{drug.name}</span>
                                                {drugs.includes(drug.name) && <Check className="h-3.5 w-3.5 ml-1" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                                {/* Recent Activity - Enhanced */}
                            {history.length > 0 && (
                                    <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 border border-gray-200/50 rounded-2xl shadow-xl shadow-gray-500/10 p-5">
                                        {/* Decorative */}
                                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-gray-400/10 to-slate-400/10 rounded-full blur-2xl"></div>

                                        {/* Header */}
                                        <div className="relative flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-600 to-slate-700 flex items-center justify-center shadow-lg">
                                                    <Clock className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">Recent Checks</p>
                                                    <p className="text-xs text-gray-500">{history.length} total</p>
                                                </div>
                                            </div>
                                        <button
                                            onClick={() => setActiveTab('history')}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            View all
                                                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                                        </button>
                                    </div>

                                        {/* Timeline */}
                                        <div className="relative space-y-2">
                                            <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-gray-200 rounded-full"></div>

                                            {history.slice(0, 3).map((entry, idx) => (
                                            <button
                                                key={entry.id}
                                                onClick={() => loadFromHistory(entry)}
                                                    className="group relative w-full text-left p-3 pl-10 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:bg-white hover:shadow-md hover:border-blue-200 transition-all duration-300"
                                            >
                                                    {/* Timeline Dot */}
                                                    <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md ${entry.result?.severity === 'severe' ? 'bg-red-500' :
                                                        entry.result?.severity === 'moderate' ? 'bg-amber-500' :
                                                            entry.result?.severity === 'mild' ? 'bg-yellow-400' :
                                                                'bg-emerald-500'
                                                        }`}></div>

                                                <div className="flex items-center justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-semibold text-gray-800 truncate block">
                                                                {entry.drugs.slice(0, 2).join(' + ')}
                                                                {entry.drugs.length > 2 && <span className="text-gray-400"> +{entry.drugs.length - 2}</span>}
                                                            </span>
                                                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                                <Clock className="h-3 w-3" />
                                                                {new Date(entry.timestamp).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <span className="text-lg group-hover:scale-125 transition-transform"><SeverityDot level={entry.result?.severity} /></span>
                                                    </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                                {/* Statistics Card - NEW */}
                                <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-emerald-50/90 via-teal-50/80 to-cyan-50/90 border border-emerald-200/50 rounded-2xl shadow-xl shadow-emerald-500/10 p-5">
                                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-2xl"></div>

                                    <div className="relative flex items-center gap-3 mb-4">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                            <ChartBarIcon className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Your Statistics</p>
                                            <p className="text-xs text-gray-500">Usage overview</p>
                                        </div>
                                    </div>

                                    <div className="relative grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-emerald-100">
                                            <p className="text-2xl font-black text-emerald-600">{statistics.totalChecks}</p>
                                            <p className="text-xs text-gray-500">Total Checks</p>
                                        </div>
                                        <div className="p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-teal-100">
                                            <p className="text-2xl font-black text-teal-600">{statistics.uniqueDrugs}</p>
                                            <p className="text-xs text-gray-500">Unique Drugs</p>
                                        </div>
                                        <div className="p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-cyan-100">
                                            <p className="text-2xl font-black text-cyan-600">{statistics.safeCount}</p>
                                            <p className="text-xs text-gray-500">Safe Results</p>
                                        </div>
                                        <div className="p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-blue-100">
                                            <p className="text-2xl font-black text-blue-600">{savedResults.length}</p>
                                            <p className="text-xs text-gray-500">Saved</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Pro Tips Card */}
                                <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-violet-50/90 via-purple-50/80 to-fuchsia-50/90 border border-violet-200/50 rounded-2xl shadow-xl shadow-violet-500/10 p-5">
                                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-violet-400/20 to-purple-400/20 rounded-full blur-2xl"></div>

                                    <div className="relative flex items-center gap-3 mb-4">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                                            <LightBulbIcon className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Pro Tips</p>
                                            <p className="text-xs text-gray-500">Get the most out of PharmaLink</p>
                                        </div>
                                    </div>

                                    <div className="relative space-y-2 text-xs">
                                        <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
                                            <MicrophoneIcon className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-gray-700">Use voice input for hands-free drug entry</p>
                                        </div>
                                        <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
                                            <Bookmark className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-gray-700">Save important results for quick access later</p>
                                        </div>
                                        <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
                                            <ChartBarIcon className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-gray-700">Switch to Matrix view for multi-drug analysis</p>
                                        </div>
                                    </div>
                            </div>
                        </aside>
                    </div>
                    </div>
                )}

                {/* History Tab - Enhanced */}
                {activeTab === 'history' && (
                    <div className="max-w-4xl mx-auto">
                        {/* Header Card */}
                        <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 border border-gray-200/50 rounded-3xl shadow-xl mb-6">
                            <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>

                            <div className="relative p-6 sm:p-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur opacity-40"></div>
                                            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                                <Clock className="h-7 w-7 text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                                                Check History
                                            </h2>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                Your recent interaction checks • Last 20 entries
                                            </p>
                                        </div>
                                    </div>

                                    {history.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            <div className="px-4 py-2 bg-blue-50 rounded-xl">
                                                <span className="text-2xl font-black text-blue-600">{history.length}</span>
                                                <span className="text-xs text-blue-500 ml-1">entries</span>
                                            </div>
                                            <button
                                                onClick={clearHistory}
                                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                                            >
                                                <Trash className="h-4 w-4" />
                                                Clear All
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {history.length === 0 ? (
                            <div className="relative overflow-hidden backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-3xl shadow-xl p-12 text-center">
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-blue-50/30"></div>
                                <div className="relative">
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                        <Clock className="h-10 w-10 text-gray-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-700 mb-2">No History Yet</h3>
                                    <p className="text-gray-500 mb-6">Your interaction checks will appear here once you start analyzing medications.</p>
                                    <button
                                        onClick={() => setActiveTab('check')}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                        <ShieldCheck className="h-5 w-5" />
                                        Start Checking
                                    </button>
                                </div>
                            </div>
                        ) : (
                                <div className="relative">
                                    {/* Timeline Line */}
                                    <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 rounded-full"></div>

                                    {/* Timeline Items */}
                                    <div className="space-y-4">
                                        {history.map((entry, idx) => {
                                            const severityStyles = {
                                                severe: { gradient: 'from-red-500 to-rose-600', bg: 'from-red-50 to-rose-50', border: 'border-red-200/50', dot: 'bg-red-500' },
                                                moderate: { gradient: 'from-amber-500 to-orange-600', bg: 'from-amber-50 to-orange-50', border: 'border-amber-200/50', dot: 'bg-amber-500' },
                                                mild: { gradient: 'from-yellow-400 to-amber-500', bg: 'from-yellow-50 to-amber-50', border: 'border-yellow-200/50', dot: 'bg-yellow-500' },
                                                none: { gradient: 'from-emerald-500 to-teal-600', bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200/50', dot: 'bg-emerald-500' }
                                            };
                                            const style = severityStyles[entry.result?.severity] || severityStyles.none;

                                            return (
                                                <div
                                                    key={entry.id}
                                                    className="relative pl-14 sm:pl-20 group"
                                                    style={{ animationDelay: `${idx * 50}ms` }}
                                                >
                                                    {/* Timeline Dot */}
                                                    <div className={`absolute left-4 sm:left-6 top-6 w-4 h-4 rounded-full ${style.dot} border-4 border-white shadow-lg group-hover:scale-125 transition-transform z-10`}></div>

                                                    {/* Card */}
                                                    <div
                                                        className={`relative overflow-hidden backdrop-blur-sm bg-gradient-to-br ${style.bg} border ${style.border} rounded-2xl shadow-lg hover:shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1`}
                                                        onClick={() => loadFromHistory(entry)}
                                                    >
                                                        {/* Gradient Accent */}
                                                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.gradient}`}></div>

                                                        <div className="p-5">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1 min-w-0">
                                                                    {/* Drug Pills */}
                                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                                        {entry.drugs.map((drug, drugIdx) => (
                                                                            <span key={drug} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 border border-gray-200/50 shadow-sm">
                                                                                <ShieldCheck className="h-4 w-4 text-blue-500" />
                                                                                {drug}
                                                                            </span>
                                                                        ))}
                                                                    </div>

                                                                    {/* Meta Info */}
                                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                                        <span className="flex items-center gap-1">
                                                                            <Clock className="h-3.5 w-3.5" />
                                                                            {new Date(entry.timestamp).toLocaleString()}
                                                                        </span>
                                                                        {entry.result?.interactions?.length > 0 && (
                                                                            <span className="flex items-center gap-1">
                                                                                <Warning className="h-3.5 w-3.5" />
                                                                                {entry.result.interactions.length} interaction{entry.result.interactions.length > 1 ? 's' : ''}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Severity Badge */}
                                                                <div className={`flex-shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r ${style.gradient} text-white shadow-lg`}>
                                                                    <span className="text-lg mr-1"><SeverityDot level={entry.result?.severity} /></span>
                                                                    <span className="text-xs font-bold uppercase tracking-wider">{entry.result?.severity || 'Safe'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Saved Tab - Enhanced */}
                {activeTab === 'saved' && (
                    <div className="max-w-4xl mx-auto">
                        {/* Header Card */}
                        <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-amber-50/90 via-yellow-50/80 to-orange-50/90 border border-amber-200/50 rounded-3xl shadow-xl mb-6">
                            <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-yellow-400/10 to-amber-400/10 rounded-full blur-3xl"></div>

                            <div className="relative p-6 sm:p-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl blur opacity-40"></div>
                                            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                                                <BookmarkSolid className="h-7 w-7 text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-amber-800 to-orange-900 bg-clip-text text-transparent">
                                                Saved Results
                                            </h2>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                Your bookmarked interaction checks
                                            </p>
                                        </div>
                                    </div>

                                    {savedResults.length > 0 && (
                                        <div className="px-4 py-2 bg-amber-100 rounded-xl">
                                            <span className="text-2xl font-black text-amber-600">{savedResults.length}</span>
                                            <span className="text-xs text-amber-500 ml-1">saved</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {savedResults.length === 0 ? (
                            <div className="relative overflow-hidden backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-3xl shadow-xl p-12 text-center">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 to-orange-50/30"></div>
                                <div className="relative">
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                        <Bookmark className="h-10 w-10 text-amber-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Saved Results</h3>
                                    <p className="text-gray-500 mb-6">Click the bookmark icon on any result to save it for quick access.</p>
                                    <button
                                        onClick={() => setActiveTab('check')}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                        <ShieldCheck className="h-5 w-5" />
                                        Start Checking
                                    </button>
                                </div>
                            </div>
                        ) : (
                                <div className="grid gap-4">
                                    {savedResults.map((entry, idx) => {
                                        const severityStyles = {
                                            severe: { gradient: 'from-red-500 to-rose-600', bg: 'from-red-50 to-rose-50', border: 'border-red-200/50' },
                                            moderate: { gradient: 'from-amber-500 to-orange-600', bg: 'from-amber-50 to-orange-50', border: 'border-amber-200/50' },
                                            mild: { gradient: 'from-yellow-400 to-amber-500', bg: 'from-yellow-50 to-amber-50', border: 'border-yellow-200/50' },
                                            none: { gradient: 'from-emerald-500 to-teal-600', bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200/50' }
                                        };
                                        const style = severityStyles[entry.result?.severity] || severityStyles.none;

                                        return (
                                            <div
                                                key={entry.id}
                                                className={`group relative overflow-hidden backdrop-blur-sm bg-gradient-to-br ${style.bg} border ${style.border} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300`}
                                            >
                                                {/* Gradient Accent */}
                                                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.gradient}`}></div>

                                                {/* Bookmark Badge */}
                                                <div className="absolute top-3 right-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                                        <BookmarkSolid className="h-4 w-4 text-white" />
                                                    </div>
                                                </div>

                                                <div className="p-5 pr-14">
                                                    <div 
                                                        className="cursor-pointer"
                                                        onClick={() => loadFromHistory(entry)}
                                                    >
                                                        {/* Drug Pills */}
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {entry.drugs.map((drug) => (
                                                                <span key={drug} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 border border-gray-200/50 shadow-sm">
                                                                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                                                                {drug}
                                                            </span>
                                                            ))}
                                                        </div>

                                                        {/* Result Summary */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Bookmark className="h-3.5 w-3.5" />
                                                                    Saved {new Date(entry.timestamp).toLocaleDateString()}
                                                                </span>
                                                                {entry.result?.interactions?.length > 0 && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Warning className="h-3.5 w-3.5" />
                                                                        {entry.result.interactions.length} interaction{entry.result.interactions.length > 1 ? 's' : ''}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Severity Badge */}
                                                            <div className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${style.gradient} text-white shadow-md`}>
                                                                <span className="text-sm mr-1"><SeverityDot level={entry.result?.severity} /></span>
                                                                <span className="text-xs font-bold uppercase">{entry.result?.severity || 'Safe'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200/50">
                                                        <button
                                                            onClick={() => loadFromHistory(entry)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                            View Details
                                                        </button>
                                                        <button
                                                            onClick={() => deleteSavedResult(entry.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                                        >
                                                            <Trash className="h-3.5 w-3.5" />
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer - Enhanced */}
            <footer className="mt-auto print:hidden relative">
                {/* Gradient Top Border */}
                <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

                {/* Main Footer */}
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900">
                    {/* Background Effects */}
                    <div className="absolute inset-0">
                        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/5 to-pink-500/5 rounded-full blur-3xl"></div>
                    </div>

                    {/* Grid Pattern Overlay */}
                    <div className="absolute inset-0 opacity-5">
                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="footer-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#footer-grid)" />
                        </svg>
                    </div>

                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Main Footer Content */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                            {/* Brand Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur opacity-50"></div>
                                        <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                            <ShieldCheck className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">PharmaLink</h3>
                                        <p className="text-xs text-gray-400">Drug Interaction Checker</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    AI-powered platform for checking drug interactions and supporting medication safety decisions.
                                </p>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                                        <ShieldCheck className="h-3.5 w-3.5" /> Secure
                                    </span>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Quick Links</h4>
                                <ul className="space-y-2">
                                    {[
                                        { label: 'Check Interactions' },
                                        { label: 'View History' },
                                        { label: 'Saved Results' },
                                        { label: 'Clinical Resources' }
                                    ].map((link) => (
                                        <li key={link.label}>
                                            <a href="#" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
                                                <ArrowRight className="h-3.5 w-3.5" />
                                                {link.label}
                                                <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Safety Notice */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Medical Disclaimer</h4>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                            <Warning className="h-5 w-5 text-amber-400" />
                                        </div>
                                        <p className="text-xs text-gray-300 leading-relaxed">
                                            This tool is for <span className="text-amber-400 font-semibold">informational purposes only</span>. Always consult a qualified healthcare professional before making any medical decisions.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2.5 py-1 bg-white/5 rounded-lg text-xs text-gray-400">FDA Database</span>
                                    <span className="px-2.5 py-1 bg-white/5 rounded-lg text-xs text-gray-400">DrugBank</span>
                                    <span className="px-2.5 py-1 bg-white/5 rounded-lg text-xs text-gray-400">Clinical Trials</span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className="pt-6 border-t border-white/10">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>© {new Date().getFullYear()} PharmaLink.</span>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="hidden sm:inline">All rights reserved.</span>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="hidden sm:inline">Research & Educational Use Only</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                        v2.0.0
                                    </span>
                                    <span className="text-xs text-gray-500">Made by PharmaLink Team</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            {/* New Feature Modals */}
            {showDosageTracker && (
                <DosageTracker
                    drugs={drugs}
                    dosageTracking={dosageTracking}
                    onAddDosage={handleAddDosage}
                    onRemoveDosage={handleRemoveDosage}
                    onClose={() => setShowDosageTracker(false)}
                />
            )}

            {showAlternatives && (
                <DrugAlternativesModal
                    drugs={drugs}
                    onClose={() => setShowAlternatives(false)}
                />
            )}

            {showMatrixView && (
                <DrugMatrixView
                    drugs={drugs}
                    interactions={result?.interactions || []}
                    onClose={() => setShowMatrixView(false)}
                />
            )}

            {showRiskCalculator && (
                <RiskScoreCalculator
                    drugs={drugs}
                    interactions={result?.interactions}
                    onClose={() => setShowRiskCalculator(false)}
                />
            )}

            {showFoodInteractions && (
                <FoodInteractionsWarning
                    drugs={drugs}
                    onClose={() => setShowFoodInteractions(false)}
                />
            )}
        </div>
    );
};

export default InteractionCheck;
