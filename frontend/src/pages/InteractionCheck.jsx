import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

// Medical SVG Background Pattern Component
const MedicalPattern = () => (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="medical-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M30 5v20M20 15h20" stroke="currentColor" strokeWidth="2" fill="none" />
                <circle cx="30" cy="45" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M26 45h8M30 41v8" stroke="currentColor" strokeWidth="1.5" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#medical-pattern)" />
    </svg>
);

// DNA Helix Animation Component
const DNAHelix = () => (
    <div className="absolute right-0 top-0 w-64 h-full overflow-hidden opacity-10 pointer-events-none">
        <svg viewBox="0 0 100 400" className="h-full animate-pulse" style={{ animationDuration: '4s' }}>
            <path d="M20,0 Q80,50 20,100 Q-40,150 20,200 Q80,250 20,300 Q-40,350 20,400"
                stroke="url(#dna-gradient)" strokeWidth="2" fill="none" />
            <path d="M80,0 Q20,50 80,100 Q140,150 80,200 Q20,250 80,300 Q140,350 80,400"
                stroke="url(#dna-gradient)" strokeWidth="2" fill="none" />
            {[0, 50, 100, 150, 200, 250, 300, 350].map((y, i) => (
                <line key={i} x1="20" y1={y} x2="80" y2={y} stroke="url(#dna-gradient)" strokeWidth="1.5" opacity="0.6" />
            ))}
            <defs>
                <linearGradient id="dna-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="50%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
            </defs>
        </svg>
    </div>
);

// Floating Pills Animation
const FloatingPills = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
            <div
                key={i}
                className="absolute animate-bounce opacity-10"
                style={{
                    left: `${15 + i * 15}%`,
                    top: `${20 + (i % 3) * 25}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${3 + i * 0.5}s`
                }}
            >
                <svg width="40" height="20" viewBox="0 0 40 20">
                    <rect x="0" y="0" width="40" height="20" rx="10" fill={i % 2 === 0 ? '#3B82F6' : '#8B5CF6'} />
                    <rect x="20" y="0" width="20" height="20" rx="10" fill={i % 2 === 0 ? '#60A5FA' : '#A78BFA'} />
                </svg>
            </div>
        ))}
    </div>
);

// Molecule Structure Component
const MoleculeStructure = ({ className = "" }) => (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="12" fill="url(#mol-grad)" opacity="0.8" />
        <circle cx="30" cy="30" r="8" fill="#3B82F6" opacity="0.6" />
        <circle cx="90" cy="30" r="8" fill="#8B5CF6" opacity="0.6" />
        <circle cx="30" cy="90" r="8" fill="#06B6D4" opacity="0.6" />
        <circle cx="90" cy="90" r="8" fill="#10B981" opacity="0.6" />
        <line x1="38" y1="38" x2="52" y2="52" stroke="#94A3B8" strokeWidth="2" />
        <line x1="68" y1="52" x2="82" y2="38" stroke="#94A3B8" strokeWidth="2" />
        <line x1="52" y1="68" x2="38" y2="82" stroke="#94A3B8" strokeWidth="2" />
        <line x1="68" y1="68" x2="82" y2="82" stroke="#94A3B8" strokeWidth="2" />
        <defs>
            <radialGradient id="mol-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(60 60) scale(12)">
                <stop stopColor="#6366F1" />
                <stop offset="1" stopColor="#3B82F6" />
            </radialGradient>
        </defs>
    </svg>
);

// Animated Particle Field Component
const ParticleField = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
            <div
                key={i}
                className="absolute rounded-full animate-float"
                style={{
                    width: `${3 + Math.random() * 6}px`,
                    height: `${3 + Math.random() * 6}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    background: ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'][i % 5],
                    opacity: 0.2 + Math.random() * 0.3,
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: `${15 + Math.random() * 20}s`
                }}
            />
        ))}
    </div>
);

// Animated Gradient Orbs
const GradientOrbs = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/10 via-indigo-500/10 to-purple-400/10 blur-3xl animate-morph" style={{ animationDuration: '20s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-cyan-400/10 via-teal-500/10 to-emerald-400/10 blur-3xl animate-morph" style={{ animationDuration: '25s', animationDelay: '5s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-400/5 via-purple-500/5 to-pink-400/5 blur-3xl animate-spin-slow"></div>
    </div>
);

// Hexagon Grid Pattern
const HexagonGrid = () => (
    <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="hexagon-pattern" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                <polygon points="25,0 50,14.4 50,38.6 25,53 0,38.6 0,14.4" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexagon-pattern)" />
    </svg>
);

// Animated Connection Lines
const ConnectionLines = () => (
    <svg className="absolute inset-0 w-full h-full opacity-5 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="1" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
            </linearGradient>
        </defs>
        {[...Array(8)].map((_, i) => (
            <line
                key={i}
                x1={`${10 + i * 12}%`}
                y1="0%"
                x2={`${90 - i * 10}%`}
                y2="100%"
                stroke="url(#line-gradient)"
                strokeWidth="1"
                className="animate-pulse"
                style={{ animationDelay: `${i * 0.5}s`, animationDuration: '4s' }}
            />
        ))}
    </svg>
);

// Glowing Ring Component
const GlowingRings = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
            <div
                key={i}
                className="absolute rounded-full border animate-ping-slow"
                style={{
                    width: `${200 + i * 150}px`,
                    height: `${200 + i * 150}px`,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    borderColor: ['rgba(59, 130, 246, 0.1)', 'rgba(139, 92, 246, 0.08)', 'rgba(6, 182, 212, 0.06)'][i],
                    animationDelay: `${i * 2}s`,
                    animationDuration: `${6 + i * 2}s`
                }}
            />
        ))}
    </div>
);

// CSS Keyframes for custom animations (add to style tag)
const AnimationStyles = () => (
    <style>{`
        @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); }
            25% { transform: translateY(-20px) translateX(10px); }
            50% { transform: translateY(-10px) translateX(-10px); }
            75% { transform: translateY(-30px) translateX(5px); }
        }
        @keyframes morph {
            0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(0deg); }
            25% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
            50% { border-radius: 50% 60% 30% 60% / 30% 60% 70% 40%; transform: rotate(180deg); }
            75% { border-radius: 60% 40% 60% 30% / 70% 30% 50% 60%; }
        }
        @keyframes spin-slow {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes ping-slow {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            50% { transform: scale(1); opacity: 1; }
            100% { transform: scale(0.8); opacity: 0.5; }
        }
        @keyframes orbit {
            from { transform: rotate(0deg) translateX(30px) rotate(0deg); }
            to { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
        }
        @keyframes dna-spin {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
        }
        @keyframes bounce-dot {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
        @keyframes scan-line {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
        }
        @keyframes typewriter {
            from { width: 0; }
            to { width: 100%; }
        }
        .animate-float { animation: float linear infinite; }
        .animate-morph { animation: morph ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 60s linear infinite; }
        .animate-ping-slow { animation: ping-slow ease-out infinite; }
        .animate-shimmer { animation: shimmer 3s linear infinite; background-size: 200% 100%; }
        .animate-gradient { animation: gradient-shift 8s ease infinite; background-size: 200% 200%; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
        .animate-orbit { animation: orbit 3s linear infinite; }
        .animate-dna-spin { animation: dna-spin 4s linear infinite; transform-style: preserve-3d; }
    `}</style>
);

// Premium Loading Spinner Component
const PremiumLoader = () => (
    <div className="relative w-24 h-24">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin" style={{ animationDuration: '1s' }}></div>
        {/* Middle ring */}
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-cyan-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
        {/* Inner pulsing core */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 animate-pulse-ring flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
            <div
                key={i}
                className="absolute top-1/2 left-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg shadow-blue-500/50 animate-orbit"
                style={{ animationDelay: `${i * 1}s`, animationDuration: '3s' }}
            ></div>
        ))}
    </div>
);

// DNA Helix Loading Animation
const DNALoader = () => (
    <div className="relative w-16 h-24 animate-dna-spin">
        {[...Array(8)].map((_, i) => (
            <div
                key={i}
                className="absolute w-full flex justify-between"
                style={{ top: `${i * 12}%` }}
            >
                <div
                    className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg"
                    style={{
                        transform: `translateX(${Math.sin(i * 0.8) * 20}px)`,
                        animationDelay: `${i * 0.1}s`
                    }}
                ></div>
                <div
                    className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg"
                    style={{
                        transform: `translateX(${-Math.sin(i * 0.8) * 20}px)`,
                        animationDelay: `${i * 0.1}s`
                    }}
                ></div>
            </div>
        ))}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-md">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-morph"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-morph" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative text-center">
            {/* Premium Loader */}
            <div className="flex justify-center mb-8">
                <PremiumLoader />
            </div>

            {/* Progress Text */}
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">{message}</h3>

                {/* Animated Progress Steps */}
                <div className="flex items-center justify-center gap-2">
                    {['Fetching data', 'Analyzing', 'Generating report'].map((step, i) => (
                        <div key={step} className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"
                                style={{ animationDelay: `${i * 0.3}s` }}
                            ></div>
                            <span className="text-sm text-blue-200">{step}</span>
                            {i < 2 && <span className="text-blue-400/50">→</span>}
                        </div>
                    ))}
                </div>

                {/* Bouncing Dots */}
                <div className="flex justify-center gap-1.5 pt-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                            style={{
                                animation: 'bounce-dot 1.4s ease-in-out infinite',
                                animationDelay: `${i * 0.16}s`
                            }}
                        ></div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// Mini Loading Spinner
const MiniSpinner = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: 'w-4 h-4 border-2',
        md: 'w-6 h-6 border-2',
        lg: 'w-8 h-8 border-3'
    };
    return (
        <div className={`${sizes[size]} rounded-full border-transparent border-t-current border-r-current animate-spin ${className}`}></div>
    );
};

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
        <div className="min-h-screen relative overflow-hidden">
            {/* Main Background Image */}
            <div
                className="fixed inset-0 z-0"
                style={{
                    backgroundImage: 'url(/src/assets/bg.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed'
                }}
            >
                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-blue-50/10 to-indigo-50/85 backdrop-blur-[2px]"></div>
            </div>

            {/* Animation Styles */}
            <AnimationStyles />

            {/* Loading Overlay */}
            {loading && <LoadingOverlay message="Analyzing Drug Interactions..." />}

            {/* Multi-Layer Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                {/* Base Gradient Orbs */}
                <GradientOrbs />

                {/* Hexagon Grid Pattern */}
                <HexagonGrid />

                {/* Connection Lines */}
                <ConnectionLines />

                {/* Floating Particles */}
                <ParticleField />

                {/* Animated Gradient Blobs */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
                <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/15 to-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
                <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-gradient-to-br from-violet-400/15 to-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }}></div>

                {/* Additional Moving Orbs */}
                <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-pink-400/10 to-rose-500/10 rounded-full blur-3xl animate-morph" style={{ animationDuration: '15s' }}></div>
                <div className="absolute bottom-1/3 left-1/3 w-56 h-56 bg-gradient-to-br from-emerald-400/10 to-teal-500/10 rounded-full blur-3xl animate-morph" style={{ animationDuration: '18s', animationDelay: '3s' }}></div>

                {/* Glowing Rings (subtle) */}
                <div className="opacity-30">
                    <GlowingRings />
                </div>

                {/* Shimmer Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer opacity-50"></div>
            </div>

            {/* Header with Glassmorphism */}
            <header className="sticky top-0 z-50 print:hidden">
                {/* Gradient Top Bar */}
                <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                <div className="backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-lg shadow-black/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            {/* Logo & Title */}
                            <div className="flex items-center space-x-4">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur opacity-40 group-hover:opacity-60 transition duration-300"></div>
                                    <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                        <ShieldCheck className="h-7 w-7 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                                            Drug Interaction Checker
                                        </h1>
                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full">
                                            Pro
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Clinical Safety Analysis Platform
                                    </p>
                                </div>
                            </div>

                            {/* Stats Pills */}
                            <div className="hidden lg:flex items-center gap-3">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200/50 backdrop-blur-sm">
                                    <ChartBarIcon className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-semibold text-blue-700">{statistics.totalChecks}</span>
                                    <span className="text-xs text-blue-600/70">checks</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 backdrop-blur-sm">
                                    <Check className="h-4 w-4 text-emerald-600" />
                                    <span className="text-sm font-semibold text-emerald-700">{statistics.safeCount}</span>
                                    <span className="text-xs text-emerald-600/70">safe</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-200/50 backdrop-blur-sm">
                                    <Beaker className="h-4 w-4 text-violet-600" />
                                    <span className="text-sm font-semibold text-violet-700">{statistics.uniqueDrugs}</span>
                                    <span className="text-xs text-violet-600/70">drugs</span>
                                </div>
                            </div>

                            {/* Navigation */}
                            <button
                                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 border border-gray-200/50 hover:bg-white hover:shadow-md transition-all duration-300"
                                onClick={() => navigate('/dashboard')}
                            >
                                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">← Dashboard</span>
                            </button>
                        </div>
                    </div>

                    {/* Tab Navigation with Glass Effect */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex gap-1 -mb-px">
                            {[
                                { id: 'check', label: 'Check Interactions', icon: ShieldCheck, count: null },
                                { id: 'history', label: 'History', icon: Clock, count: history.length },
                                { id: 'saved', label: 'Saved', icon: Bookmark, count: savedResults.length }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all duration-300 ${activeTab === tab.id
                                        ? 'text-blue-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {activeTab === tab.id && (
                                        <div className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                                    )}
                                    <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-blue-500' : ''}`} />
                                    <span>{tab.label}</span>
                                    {tab.count !== null && tab.count > 0 && (
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${activeTab === tab.id
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
                {/* Main Check Tab */}
                {activeTab === 'check' && (
                    <div className="space-y-8">
                        {/* Hero Section - Inspiring Introduction with Image */}
                        {!result && drugs.length === 0 && (
                            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 border border-white/50 shadow-2xl">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                                    {/* Left Content Section */}
                                    <div className="relative p-8 md:p-12 flex flex-col justify-center">
                                        {/* Background Decorations */}
                                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                            <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl"></div>
                                            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-3xl"></div>
                                        </div>

                                        <div className="relative z-10">
                                            {/* Badge Pills */}
                                            <div className="flex items-center gap-2 mb-6">
                                                <span className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg shadow-blue-500/30">
                                                    ✨ AI-Powered
                                                </span>
                                                <span className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-lg shadow-emerald-500/30">
                                                    🛡️ Clinically Validated
                                                </span>
                                            </div>

                                            {/* Main Title */}
                                            <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                                                <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                                                    Drug Interaction
                                                </span>
                                                <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                                    Checker
                                                </span>
                                            </h2>

                                            {/* Pro Badge inline */}
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                                                    <ShieldCheck className="h-5 w-5 text-white" />
                                                    <span className="text-sm font-bold text-white">Pro</span>
                                                </div>
                                                <p className="text-gray-600 font-medium">Clinical Safety Analysis Platform</p>
                                            </div>

                                            <p className="text-gray-600 text-lg mb-8 leading-relaxed max-w-lg">
                                                Instantly analyze potential drug interactions using our advanced AI-powered clinical database. Make safer medication decisions.
                                            </p>

                                            {/* Feature Pills */}
                                            <div className="flex flex-wrap gap-3 mb-8">
                                                {[
                                                    { icon: Bolt, text: 'Real-time Analysis', color: 'from-blue-500 to-cyan-500' },
                                                    { icon: AcademicCapIcon, text: 'Evidence-Based', color: 'from-purple-500 to-pink-500' },
                                                    { icon: GlobeAltIcon, text: '50,000+ Drug Pairs', color: 'from-emerald-500 to-teal-500' },
                                                ].map((feature, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="group flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                                                    >
                                                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                                                            <feature.icon className="h-4 w-4 text-white" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-700">{feature.text}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* CTA Buttons */}
                                            <div className="flex flex-wrap gap-4">
                                                <button
                                                    onClick={loadSample}
                                                    className="group inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105"
                                                >
                                                    <Sparkles className="h-5 w-5" />
                                                    Try with Sample Data
                                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                                </button>
                                                <button
                                                    onClick={() => document.querySelector('input')?.focus()}
                                                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-300"
                                                >
                                                    <Search className="h-5 w-5 text-blue-500" />
                                                    Start Searching
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Image Section */}
                                    <div className="relative lg:h-auto min-h-[300px] lg:min-h-[500px] overflow-hidden">
                                        {/* Hero Image */}
                                        <img
                                            src="/src/assets/aro.jpg"
                                            alt="Drug Interaction Checker - Clinical Analysis"
                                            className="absolute inset-0 w-full h-full object-cover object-center"
                                        />

                                        {/* Gradient Overlays for smooth blend - flipped and black */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-400/150 via-transparent to-transparent"></div>
                                        <div className="absolute inset-0 bg-gradient-to-l from-slate-100 via-transparent to-transparent sm:block hidden"></div>

                                        {/* Floating Stats Cards */}
                                        <div className="absolute top-6 right-6 backdrop-blur-xl bg-white/80 border border-white/50 rounded-2xl p-4 shadow-2xl transform hover:scale-105 transition-transform">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                                                    <Check className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium">Safety Verified</p>
                                                    <p className="text-lg font-black text-gray-900">12,847</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute top-31 right-6 backdrop-blur-xl bg-white/80 border border-white/50 rounded-2xl p-4 shadow-2xl transform hover:scale-105 transition-transform">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                                    <StarIcon className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium">Trusted by</p>
                                                    <p className="text-lg font-black text-gray-900">Healthcare Pros</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Particle Effects Overlay */}
                                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                            {[...Array(8)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute w-2 h-2 rounded-full bg-blue-400/40 animate-float"
                                                    style={{
                                                        left: `${20 + i * 10}%`,
                                                        top: `${15 + (i % 4) * 20}%`,
                                                        animationDelay: `${i * 0.5}s`,
                                                        animationDuration: `${4 + i * 0.5}s`
                                                    }}
                                                ></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Stats Bar */}
                                <div className="relative border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
                                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200/50">
                                        {[
                                            { value: '50K+', label: 'Drug Combinations', icon: '💊' },
                                            { value: '99.2%', label: 'Accuracy Rate', icon: '🎯' },
                                            { value: '< 1s', label: 'Response Time', icon: '⚡' },
                                            { value: '24/7', label: 'Always Available', icon: '🌐' }
                                        ].map((stat, idx) => (
                                            <div key={idx} className="p-4 md:p-5 text-center hover:bg-white/50 transition-colors">
                                                <span className="text-2xl mb-1 block">{stat.icon}</span>
                                                <p className="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{stat.value}</p>
                                                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <section className="lg:col-span-2 space-y-6">
                                {/* Input Card */}
                                <div className="relative overflow-hidden backdrop-blur-xl bg-white/80 border border-white/50 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
                                    {/* Decorative gradient */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl"></div>

                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                                        <Search className="h-4 w-4 text-white" />
                                                    </span>
                                                    Enter Medications
                                                </h2>
                                                <p className="text-sm text-gray-500 mt-1">Add at least two drugs to evaluate potential interactions.</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 border border-blue-200/50">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                                                    Live Analysis
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <form className="space-y-5" onSubmit={submitCheck}>
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
                                                    placeholder="🔍 Search medications by name, brand, or generic..."
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
                                                        💊 Suggested Medications
                                                    </li>
                                                    {suggestions.map((s, idx) => (
                                                    <li
                                                        key={s.id || s.name}
                                                            className="px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 group/item"
                                                        onMouseDown={() => addDrug(s.name || s.genericName || drugInput)}
                                                    >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center group-hover/item:from-blue-200 group-hover/item:to-indigo-200 transition-colors">
                                                                        <Beaker className="h-5 w-5 text-blue-600" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-gray-900 group-hover/item:text-blue-700 transition-colors">{s.name || s.genericName}</p>
                                                                        {s.genericName && s.name !== s.genericName && (
                                                                            <p className="text-xs text-gray-500">Generic: {s.genericName}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs text-gray-400 group-hover/item:text-blue-500 transition-colors">+ Add</span>
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
                                                                    <span className="text-xs">💊</span>
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
                                                                            💊
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
                                                <span className="text-lg">🏥</span>
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
                                                        <span className="text-3xl">{severityIcon[result.severity] || '✅'}</span>
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
                                                                💊 {drugs.length} medications
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
                                                        { level: 'severe', icon: '🔴', gradient: 'from-red-500 to-rose-600', bg: 'from-red-50 to-rose-50', border: 'border-red-200' },
                                                        { level: 'moderate', icon: '🟠', gradient: 'from-amber-500 to-orange-600', bg: 'from-amber-50 to-orange-50', border: 'border-amber-200' },
                                                        { level: 'mild', icon: '🟡', gradient: 'from-yellow-400 to-amber-500', bg: 'from-yellow-50 to-amber-50', border: 'border-yellow-200' },
                                                        { level: 'none', icon: '🟢', gradient: 'from-emerald-500 to-teal-600', bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200' }
                                                    ].map(({ level, icon, gradient, bg, border }) => (
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
                                                                    <span className="text-2xl">{icon}</span>
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
                                                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full">
                                                                        AI Suggested
                                                                    </span>
                                                                </h3>
                                                                <p className="text-sm text-gray-600 mt-2">
                                                                    Based on the identified interactions, consider the following scheduling adjustments:
                                                                </p>
                                                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <div className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-100">
                                                                        <span className="text-2xl">⏰</span>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-900">Timing Gap</p>
                                                                            <p className="text-xs text-gray-600">Space out administration by <strong className="text-indigo-600">2-4 hours</strong></p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
                                                                        <span className="text-2xl">🍽️</span>
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
                                                                            <span className="text-2xl cursor-help" title={interaction.description}>{severityIcon[interaction.severity]}</span>
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
                                                                    severe: { gradient: 'from-red-500 to-rose-600', bg: 'from-red-50 via-rose-50 to-pink-50', border: 'border-red-200/50', icon: '🔴' },
                                                                    moderate: { gradient: 'from-amber-500 to-orange-600', bg: 'from-amber-50 via-orange-50 to-yellow-50', border: 'border-amber-200/50', icon: '🟠' },
                                                                    mild: { gradient: 'from-yellow-400 to-amber-500', bg: 'from-yellow-50 via-amber-50 to-orange-50', border: 'border-yellow-200/50', icon: '🟡' },
                                                                    none: { gradient: 'from-emerald-500 to-teal-600', bg: 'from-emerald-50 via-teal-50 to-cyan-50', border: 'border-emerald-200/50', icon: '🟢' }
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
                                                                                    <span className="text-2xl">{style.icon}</span>
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
                                                                                            💊 {i.drug1}
                                                                                        </span>
                                                                                        <span className="text-gray-400 font-bold">×</span>
                                                                                        <span className="px-2.5 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-sm font-bold text-gray-800 shadow-sm">
                                                                                            💊 {i.drug2}
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
                                                                                <h4 className="text-lg font-bold text-emerald-800">No Interactions Detected! 🎉</h4>
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
                                                <span className="text-2xl">⚠️</span>
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
                                                <span className="text-lg">🔬</span>
                                            </div>
                                            <p className="text-sm text-amber-900 leading-relaxed">Always verify results with clinical judgment and professional guidance.</p>
                                        </div>
                                        <div className="group flex gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-blue-200/50 hover:bg-white/80 hover:shadow-md transition-all duration-300">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <span className="text-lg">❤️</span>
                                            </div>
                                            <p className="text-sm text-blue-900 leading-relaxed">Consider patient-specific factors like age, weight, and comorbidities.</p>
                                        </div>
                                        <div className="group flex gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-purple-200/50 hover:bg-white/80 hover:shadow-md transition-all duration-300">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <span className="text-lg">📋</span>
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
                                                <span className="text-xl">⚡</span>
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
                                            { name: 'Warfarin', icon: '💊' },
                                            { name: 'Aspirin', icon: '💉' },
                                            { name: 'Metformin', icon: '🩺' },
                                            { name: 'Ibuprofen', icon: '💊' },
                                            { name: 'Lisinopril', icon: '❤️' },
                                            { name: 'Omeprazole', icon: '🫁' }
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
                                                <span className="text-sm">{drug.icon}</span>
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
                                                        <span className="text-lg group-hover:scale-125 transition-transform">{severityIcon[entry.result?.severity] || '⚪'}</span>
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
                                            <span className="text-xl">📊</span>
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

                                {/* API Status - Enhanced */}
                                <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-green-50/90 to-emerald-50/90 border border-green-200/50 rounded-2xl shadow-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                                                    <span className="text-lg">🔗</span>
                                                </div>
                                                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-green-800">API Connected</p>
                                                <p className="text-xs text-green-600/70 truncate max-w-[140px]" title={API_BASE}>
                                                    {API_BASE.replace('http://', '').replace('https://', '')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="px-2.5 py-1 bg-green-100 rounded-lg">
                                            <span className="text-xs font-bold text-green-700">LIVE</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Pro Tips Card - NEW */}
                                <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-violet-50/90 via-purple-50/80 to-fuchsia-50/90 border border-violet-200/50 rounded-2xl shadow-xl shadow-violet-500/10 p-5">
                                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-violet-400/20 to-purple-400/20 rounded-full blur-2xl"></div>

                                    <div className="relative flex items-center gap-3 mb-4">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                                            <span className="text-xl">💡</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Pro Tips</p>
                                            <p className="text-xs text-gray-500">Get the most out of PharmaLink</p>
                                        </div>
                                    </div>

                                    <div className="relative space-y-2 text-xs">
                                        <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
                                            <span>🎤</span>
                                            <p className="text-gray-700">Use voice input for hands-free drug entry</p>
                                        </div>
                                        <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
                                            <span>📑</span>
                                            <p className="text-gray-700">Save important results for quick access later</p>
                                        </div>
                                        <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
                                            <span>📊</span>
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
                                                                                <span>💊</span>
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
                                                                    <span className="text-lg mr-1">{severityIcon[entry.result?.severity] || '✅'}</span>
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
                                                                    <span>💊</span>
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
                                                                <span className="text-sm mr-1">{severityIcon[entry.result?.severity] || '✅'}</span>
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
            </main>

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
                                    Advanced AI-powered platform for checking drug interactions, ensuring medication safety with real-time clinical data analysis.
                                </p>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                        System Online
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                                        🔒 HIPAA Compliant
                                    </span>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Quick Links</h4>
                                <ul className="space-y-2">
                                    {[
                                        { label: 'Check Interactions', icon: '💊' },
                                        { label: 'View History', icon: '📋' },
                                        { label: 'Saved Results', icon: '⭐' },
                                        { label: 'Clinical Resources', icon: '📚' }
                                    ].map((link) => (
                                        <li key={link.label}>
                                            <a href="#" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
                                                <span className="group-hover:scale-110 transition-transform">{link.icon}</span>
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
                                    <span className="text-xs text-gray-500">Made with ❤️ by PharmaLink Team</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default InteractionCheck;
