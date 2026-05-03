import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Heroicons - matching InteractionCheck style
import {
    DocumentTextIcon,
    CloudArrowUpIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
    DocumentArrowDownIcon,
    PrinterIcon,
    ShareIcon,
    ClockIcon,
    ShieldCheckIcon,
    InformationCircleIcon,
    LightBulbIcon,
    SparklesIcon,
    BeakerIcon,
    EyeIcon,
    EyeSlashIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    TrashIcon,
    CameraIcon,
    AdjustmentsHorizontalIcon,
    ArrowDownTrayIcon,
    ClipboardDocumentCheckIcon,
    CpuChipIcon,
    ChartBarIcon,
    CurrencyDollarIcon,
    HeartIcon,
    StarIcon,
    CalendarDaysIcon,
    BellIcon,
    UserCircleIcon,
    BuildingOfficeIcon,
    IdentificationIcon,
    ChatBubbleLeftRightIcon,
    HandThumbUpIcon,
    HandThumbDownIcon,
    MinusIcon,
    PlusIcon,
    SunIcon,
    MoonIcon,
    SwatchIcon,
    ViewfinderCircleIcon,
    Bars3Icon,
    XCircleIcon,
    CheckIcon,
    ExclamationCircleIcon,
    BoltIcon,
    MicrophoneIcon,
    TableCellsIcon,
    GlobeAltIcon,
    AcademicCapIcon
} from '@heroicons/react/24/outline';

import {
    SparklesIcon as SparklesSolid,
    StarIcon as StarSolid,
    HeartIcon as HeartSolid,
    CheckCircleIcon as CheckCircleSolid,
    BoltIcon as BoltSolid,
    ShieldCheckIcon as ShieldCheckSolid
} from '@heroicons/react/24/solid';

// ================================================================================
// API CONFIGURATION
// ================================================================================
const API_BASE = import.meta.env.VITE_PRESCRIPTION_API || 'http://localhost:3004';
const ML_SERVICE_BASE = import.meta.env.VITE_ML_SERVICE_API || 'http://localhost:8003';
const BACKEND_API = import.meta.env.VITE_BACKEND_API || 'http://localhost:3000/api';

const API_ENDPOINTS = {
    UPLOAD: `${API_BASE}/interpret`,
    ANALYZE_TEXT: `${API_BASE}/analyze-text`,
    HEALTH: `${API_BASE}/health`,
    OCR_INTERPRET: `${ML_SERVICE_BASE}/interpret`,
    PRESCRIPTION_INTERPRET: `${BACKEND_API}/prescription/interpret`,
};

// ================================================================================
// STYLED COMPONENTS & ANIMATIONS
// ================================================================================

const GradientOrbs = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/8 via-indigo-500/6 to-purple-400/8 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-cyan-400/6 via-teal-500/6 to-emerald-400/6 blur-3xl" />
    </div>
);

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
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        @keyframes slide-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-shimmer { animation: shimmer 3s linear infinite; background-size: 200% 100%; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
    `}</style>
);

// ================================================================================
// LOADING COMPONENTS
// ================================================================================

const PremiumLoader = () => (
    <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-slate-700" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin" style={{ animationDuration: '1s' }} />
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <DocumentTextIcon className="w-7 h-7 text-white" />
        </div>
    </div>
);

const StageLoader = ({ stage, isActive, isComplete }) => (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
        isComplete ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20' :
        isActive ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20' :
        'bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700'
    }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isComplete ? 'bg-emerald-500 text-white' :
            isActive ? 'bg-blue-500 text-white animate-pulse' :
            'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
        }`}>
            {isComplete ? <CheckIcon className="w-5 h-5" /> :
             isActive ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> :
             <stage.icon className="w-5 h-5" />}
        </div>
        <div className="flex-1">
            <p className={`font-semibold text-sm ${
                isComplete ? 'text-emerald-700 dark:text-emerald-300' :
                isActive ? 'text-blue-700 dark:text-blue-300' :
                'text-gray-600 dark:text-slate-400'
            }`}>{stage.name}</p>
            <p className="text-xs text-gray-500 dark:text-slate-500">{stage.description}</p>
        </div>
    </div>
);

const LoadingOverlay = ({ message = "Processing prescription...", stages = [], currentStage = 0 }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                    <PremiumLoader />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{message}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">4-Stage AI Pipeline</p>
            </div>
            
            <div className="space-y-3">
                {stages.map((stage, idx) => (
                    <StageLoader 
                        key={stage.id}
                        stage={stage}
                        isActive={idx === currentStage}
                        isComplete={idx < currentStage}
                    />
                ))}
            </div>
        </div>
    </div>
);

const SkeletonLoader = ({ className = "" }) => (
    <div className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 animate-shimmer rounded ${className}`} />
);

// ================================================================================
// 4-STAGE PIPELINE CONFIGURATION
// ================================================================================

const PIPELINE_STAGES = [
    { id: 'detection', name: 'Zone Detection', description: 'YOLOv8 locating medication areas', icon: ViewfinderCircleIcon },
    { id: 'ocr', name: 'OCR Recognition', description: 'TrOCR reading handwriting', icon: DocumentTextIcon },
    { id: 'refinement', name: 'AI Refinement', description: 'GPT-4o correcting medical text', icon: SparklesIcon },
    { id: 'validation', name: 'Drug Validation', description: 'Checking interactions', icon: ShieldCheckIcon }
];

// ================================================================================
// MAIN COMPONENT
// ================================================================================

export default function PrescriptionInterpreter() {
    // Navigation hook available for future use
    const fileInputRef = useRef(null);
    const resultRef = useRef(null);
    
    // State
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('prescriptionHistory');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    
    // Image enhancement state
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [showEnhancements, setShowEnhancements] = useState(false);
    
    // Preserved functionality: File dropzone
    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    }, []);
    
    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.bmp', '.tiff', '.webp'] },
        maxSize: 10 * 1024 * 1024,
        multiple: false
    });
    
    // Preserved functionality: Process prescription
    const processPrescription = async () => {
        if (!selectedImage) return;
        
        setIsProcessing(true);
        setProcessingStage(0);
        setError(null);
        
        const formData = new FormData();
        formData.append('file', selectedImage);
        formData.append('check_interactions', 'true');
        
        // Simulate stage progression for UI
        const stageInterval = setInterval(() => {
            setProcessingStage(prev => {
                if (prev < 3) return prev + 1;
                clearInterval(stageInterval);
                return prev;
            });
        }, 1500);
        
        try {
            const response = await axios.post(API_ENDPOINTS.UPLOAD, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            });
            
            clearInterval(stageInterval);
            setProcessingStage(4);
            
            const processedResult = processAPIResponse(response.data);
            setResult(processedResult);
            
            // Add to history
            const historyEntry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                imageName: selectedImage.name,
                medications: processedResult.medications?.length || 0,
                confidence: processedResult.confidence,
            };
            setHistory(prev => [historyEntry, ...prev].slice(0, 50));
            
            // Scroll to results
            setTimeout(() => {
                resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            
        } catch (err) {
            clearInterval(stageInterval);
            setError(err.response?.data?.message || 'Failed to process prescription');
            console.error('Processing error:', err);
        } finally {
            setIsProcessing(false);
        }
    };
    
    // Process API response
    const processAPIResponse = (data) => {
        const interpretation = data.interpretation || data;
        return {
            rawText: interpretation.rawText || '',
            refinedText: interpretation.cleanedText || '',
            medications: interpretation.medications || [],
            dosages: interpretation.dosages || [],
            frequencies: interpretation.frequencies || [],
            durations: interpretation.durations || [],
            warnings: interpretation.warnings || [],
            interactions: interpretation.interactions || [],
            confidence: interpretation.confidence || 0,
            requiresManualReview: interpretation.requiresManualReview || false,
            reviewReasons: interpretation.reviewReasons || [],
            metadata: {
                engine: data.metadata?.engine || 'unknown',
                pipeline: data.metadata?.pipeline || '',
                timestamp: data.timestamp,
            },
            pipelineInfo: data.pipeline_info || {}
        };
    };
    
    // Preserved functionality: Clear all
    const clearAll = () => {
        setSelectedImage(null);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        setBrightness(100);
        setContrast(100);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    
    // Preserved functionality: Export to PDF
    const exportToPDF = () => {
        if (!result) return;
        
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Prescription Analysis Report', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });
        doc.text(`Confidence: ${result.confidence}%`, 105, 40, { align: 'center' });
        
        const medications = result.medications?.map(med => [
            med.name,
            med.dosage,
            med.frequency,
            med.duration
        ]) || [];
        
        doc.autoTable({
            head: [['Medication', 'Dosage', 'Frequency', 'Duration']],
            body: medications,
            startY: 50,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }
        });
        
        if (result.warnings?.length > 0) {
            const finalY = doc.lastAutoTable?.finalY || 50;
            doc.text('Warnings:', 14, finalY + 15);
            result.warnings.forEach((warning, idx) => {
                doc.text(`• ${warning}`, 14, finalY + 25 + (idx * 7));
            });
        }
        
        doc.save('prescription-analysis.pdf');
    };
    
    // Save history to localStorage
    useEffect(() => {
        localStorage.setItem('prescriptionHistory', JSON.stringify(history));
    }, [history]);
    
    // Cleanup
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);
    
    // ================================================================================
    // RENDER HELPERS
    // ================================================================================
    
    // Render helpers
    const getConfidenceColor = (confidence) => {
        if (confidence >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (confidence >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };
    
    // ================================================================================
    // MAIN RENDER
    // ================================================================================
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900 relative">
            <AnimationStyles />
            <GradientOrbs />
            
            {/* Loading Overlay */}
            {isProcessing && (
                <LoadingOverlay 
                    stages={PIPELINE_STAGES} 
                    currentStage={processingStage}
                />
            )}
            
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <DocumentTextIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                                Prescription Interpreter
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400">
                                AI-powered 4-Stage handwriting recognition
                            </p>
                        </div>
                    </div>
                    
                    {/* Pipeline Badges */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        {PIPELINE_STAGES.map((stage) => (
                            <span key={stage.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300">
                                <stage.icon className="w-3.5 h-3.5 text-blue-500" />
                                {stage.name}
                            </span>
                        ))}
                    </div>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Left Column - Upload */}
                    <div className="space-y-6">
                        {/* Upload Area */}
                        <div className="backdrop-blur-xl bg-white/90 dark:bg-slate-900/50 dark:border-white/10 border border-white/50 rounded-3xl shadow-xl p-6">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <CloudArrowUpIcon className="w-5 h-5 text-blue-500" />
                                Upload Prescription
                            </h2>
                            
                            {!previewUrl ? (
                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                                        isDragActive 
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10' 
                                            : isDragReject
                                                ? 'border-red-500 bg-red-50/50'
                                                : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    <input {...getInputProps()} />
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center">
                                        <CameraIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                                        {isDragActive ? 'Drop image here' : 'Drag & drop prescription image'}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                        or click anywhere to browse (JPG, PNG, up to 10MB)
                                    </p>
                                    <span className="inline-block px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors pointer-events-none">
                                        Select Image
                                    </span>
                                </div>
                            ) : (
                                <div className="relative">
                                    <img 
                                        src={previewUrl} 
                                        alt="Prescription preview"
                                        className="w-full rounded-2xl shadow-lg"
                                        style={{
                                            filter: `brightness(${brightness}%) contrast(${contrast}%)`
                                        }}
                                    />
                                    <button
                                        onClick={clearAll}
                                        className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"
                                    >
                                        <TrashIcon className="w-5 h-5 text-red-500" />
                                    </button>
                                </div>
                            )}
                            
                            {/* Enhancement Controls */}
                            {previewUrl && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={() => setShowEnhancements(!showEnhancements)}
                                        className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-500"
                                    >
                                        <AdjustmentsHorizontalIcon className="w-4 h-4" />
                                        Image Enhancements
                                        {showEnhancements ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                    </button>
                                    
                                    {showEnhancements && (
                                        <div className="mt-4 space-y-4">
                                            <div>
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Brightness</label>
                                                <input
                                                    type="range"
                                                    min="50"
                                                    max="150"
                                                    value={brightness}
                                                    onChange={(e) => setBrightness(Number(e.target.value))}
                                                    className="w-full mt-1 accent-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contrast</label>
                                                <input
                                                    type="range"
                                                    min="50"
                                                    max="150"
                                                    value={contrast}
                                                    onChange={(e) => setContrast(Number(e.target.value))}
                                                    className="w-full mt-1 accent-blue-500"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Process Button */}
                            {previewUrl && !result && (
                                <button
                                    onClick={processPrescription}
                                    disabled={isProcessing}
                                    className="w-full mt-6 py-3 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <SparklesIcon className="w-5 h-5" />
                                    Analyze with 4-Stage AI
                                </button>
                            )}
                        </div>
                        
                        {/* History */}
                        {history.length > 0 && (
                            <div className="backdrop-blur-xl bg-white/90 dark:bg-slate-900/50 dark:border-white/10 border border-white/50 rounded-3xl shadow-xl p-6">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <ClockIcon className="w-5 h-5 text-blue-500" />
                                    Recent Analyses
                                </h3>
                                <div className="space-y-3">
                                    {history.slice(0, 5).map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <DocumentTextIcon className="w-5 h-5 text-slate-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[150px]">{item.imageName}</p>
                                                    <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                item.confidence >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                item.confidence >= 60 ? 'bg-amber-100 text-amber-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {item.confidence}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Right Column - Results */}
                    <div ref={resultRef} className="space-y-6">
                        {/* Error Display */}
                        {error && (
                            <div className="backdrop-blur-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-6">
                                <div className="flex items-start gap-3">
                                    <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-red-900 dark:text-red-300">Processing Error</h3>
                                        <p className="text-red-700 dark:text-red-400 mt-1">{error}</p>
                                        <button
                                            onClick={() => setError(null)}
                                            className="mt-3 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Results Card */}
                        {result && (
                            <div className="backdrop-blur-xl bg-white/90 dark:bg-slate-900/50 dark:border-white/10 border border-white/50 rounded-3xl shadow-xl overflow-hidden">
                                {/* Results Header */}
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                                                Analysis Complete
                                            </h2>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Processed with {result.metadata?.pipeline || '4-Stage AI Pipeline'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={exportToPDF}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                title="Export PDF"
                                            >
                                                <DocumentArrowDownIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                            </button>
                                            <button
                                                onClick={clearAll}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                title="Clear"
                                            >
                                                <TrashIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Confidence Badge */}
                                    {result.confidence > 0 && (
                                        <div className="mt-4 flex items-center gap-3">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${getConfidenceColor(result.confidence)}`}>
                                                {result.confidence >= 80 ? <CheckCircleIcon className="w-4 h-4" /> :
                                                 result.confidence >= 60 ? <ExclamationTriangleIcon className="w-4 h-4" /> :
                                                 <XCircleIcon className="w-4 h-4" />}
                                                {result.confidence}% Confidence
                                            </span>
                                            {result.requiresManualReview && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                                    Manual Review Recommended
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Medications List */}
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <BeakerIcon className="w-5 h-5 text-blue-500" />
                                        Detected Medications ({result.medications?.length || 0})
                                    </h3>
                                    
                                    {result.medications?.length > 0 ? (
                                        <div className="space-y-3">
                                            {result.medications.map((med, idx) => (
                                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-slate-900 dark:text-white text-lg">{med.name}</h4>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {med.dosage && (
                                                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg">
                                                                        {med.dosage}
                                                                    </span>
                                                                )}
                                                                {med.frequency && (
                                                                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-lg">
                                                                        {med.frequency}
                                                                    </span>
                                                                )}
                                                                {med.duration && (
                                                                    <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-lg">
                                                                        {med.duration}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {med.instructions && (
                                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                                                    {med.instructions}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {med.confidence && (
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                med.confidence >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                                med.confidence >= 60 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                                {med.confidence}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                                            No medications detected. Please try a clearer image.
                                        </p>
                                    )}
                                </div>
                                
                                {/* Warnings */}
                                {result.warnings?.length > 0 && (
                                    <div className="px-6 pb-6">
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                                            Warnings & Alerts
                                        </h3>
                                        <div className="space-y-2">
                                            {result.warnings.map((warning, idx) => (
                                                <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                                                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                                    <p className="text-sm text-amber-800 dark:text-amber-300">{warning}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Interactions */}
                                {result.interactions?.length > 0 && (
                                    <div className="px-6 pb-6">
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <ShieldCheckIcon className="w-5 h-5 text-red-500" />
                                            Drug Interactions
                                        </h3>
                                        <div className="space-y-2">
                                            {result.interactions.map((interaction, idx) => (
                                                <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border ${
                                                    interaction.severity === 'high' 
                                                        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' 
                                                        : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                                                }`}>
                                                    {interaction.severity === 'high' 
                                                        ? <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                        : <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                                    }
                                                    <div>
                                                        <p className={`font-medium ${
                                                            interaction.severity === 'high'
                                                                ? 'text-red-800 dark:text-red-300'
                                                                : 'text-amber-800 dark:text-amber-300'
                                                        }`}>
                                                            {interaction.drug1} + {interaction.drug2}
                                                        </p>
                                                        <p className={`text-sm ${
                                                            interaction.severity === 'high'
                                                                ? 'text-red-600 dark:text-red-400'
                                                                : 'text-amber-600 dark:text-amber-400'
                                                        }`}>
                                                            {interaction.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Raw Text Toggle */}
                                {result.rawText && (
                                    <div className="px-6 pb-6">
                                        <button
                                            onClick={() => document.getElementById('raw-text')?.classList.toggle('hidden')}
                                            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-500"
                                        >
                                            <DocumentTextIcon className="w-4 h-4" />
                                            View Extracted Text
                                            <ChevronDownIcon className="w-4 h-4" />
                                        </button>
                                        <div id="raw-text" className="hidden mt-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                            <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mibold">
                                                {result.rawText}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Footer */}
                                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
                                        {result.metadata?.disclaimer || 'This analysis is for informational purposes only. Always consult a healthcare professional.'}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {/* Empty State */}
                        {!result && !error && !isProcessing && (
                            <div className="backdrop-blur-xl bg-white/90 dark:bg-slate-900/50 dark:border-white/10 border border-white/50 rounded-3xl shadow-xl p-12 text-center">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                                    <DocumentTextIcon className="w-10 h-10 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Analysis Yet</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    Upload a prescription image to see the 4-Stage AI Pipeline in action. The system will detect zones, read handwriting, refine with AI, and check drug interactions.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
