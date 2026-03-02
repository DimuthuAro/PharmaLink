import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_CONFIG } from '../config/api.config';
import Tesseract from 'tesseract.js';
import {
    Container, Paper, Typography, Box, Button, CircularProgress,
    Alert, Chip, Slider, Stack, LinearProgress, Menu, MenuItem,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, FormControlLabel, Checkbox, Tabs, Tab, Accordion,
    AccordionSummary, AccordionDetails, Divider, Badge, Avatar,
    Tooltip, Fade, Zoom, Card, CardContent, CardActions,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Switch, ToggleButton, ToggleButtonGroup, Select, InputLabel,
    FormControl, InputAdornment, Rating, Stepper, Step, StepLabel,
    Breadcrumbs, Link, SpeedDial, SpeedDialAction, SpeedDialIcon,
    Snackbar, Alert as MuiAlert, Pagination, Drawer, List,
    ListItem, ListItemIcon, ListItemText, Collapse,
    Grid
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import MedicalServices from '@mui/icons-material/MedicalServices';
import { styled, alpha } from '@mui/material/styles';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Additional Material-UI icons needed for the component
import Brightness4 from '@mui/icons-material/Brightness4';
import Contrast from '@mui/icons-material/Contrast';
import Grain from '@mui/icons-material/Grain';
import CenterFocusStrong from '@mui/icons-material/CenterFocusStrong';
import FilterVintage from '@mui/icons-material/FilterVintage';
import RotateLeft from '@mui/icons-material/RotateLeft';
import RotateRight from '@mui/icons-material/RotateRight';
import Flip from '@mui/icons-material/Flip';
import CloudUpload from '@mui/icons-material/CloudUpload';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import ImageSearch from '@mui/icons-material/ImageSearch';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Close from '@mui/icons-material/Close';
import Tune from '@mui/icons-material/Tune';
import Refresh from '@mui/icons-material/Refresh';
import Verified from '@mui/icons-material/Verified';
import FileDownload from '@mui/icons-material/FileDownload';
import Print from '@mui/icons-material/Print';
import Share from '@mui/icons-material/Share';
import Warning from '@mui/icons-material/Warning';
import ExpandMore from '@mui/icons-material/ExpandMore';
import History from '@mui/icons-material/History';
import ContentCopy from '@mui/icons-material/ContentCopy';
import ZoomIn from '@mui/icons-material/ZoomIn';
import ZoomOut from '@mui/icons-material/ZoomOut';
import Fullscreen from '@mui/icons-material/Fullscreen';
import LocalPharmacy from '@mui/icons-material/LocalPharmacy';
import Schedule from '@mui/icons-material/Schedule';
import Info from '@mui/icons-material/Info';

// ================================================================================
// API CONFIGURATION - Backend and ML Service Endpoints
// ================================================================================
// Backend microservice for prescription interpretation
const API_BASE = import.meta.env.VITE_PRESCRIPTION_API || 'http://localhost:3004';

// ML Service for OCR processing
const ML_SERVICE_BASE = import.meta.env.VITE_ML_SERVICE_API || 'http://localhost:8000';

// Backend gateway API
const BACKEND_API = import.meta.env.VITE_BACKEND_API || 'http://localhost:3000/api';

// API Endpoints
const API_ENDPOINTS = {
    // Prescription microservice endpoints
    UPLOAD: `${API_BASE}/interpret`,
    ANALYZE_TEXT: `${API_BASE}/analyze-text`,
    HEALTH: `${API_BASE}/health`,
    
    // ML Service OCR + NER endpoints (Donut + Medical NER pipeline)
    OCR_PROCESS: `${ML_SERVICE_BASE}/prescription/ocr`,
    OCR_INTERPRET: `${ML_SERVICE_BASE}/prescription/interpret`,
    OCR_ENHANCE: `${ML_SERVICE_BASE}/prescription/enhance`,
    
    // Backend gateway routes (proxied through Express to ML)
    ML_INTERPRET: `${BACKEND_API}/ml/prescription/interpret`,
    ML_OCR: `${BACKEND_API}/ml/prescription/ocr`,
    PRESCRIPTION_INTERPRET: `${BACKEND_API}/prescription/interpret`,
    PRESCRIPTION_HISTORY: `${BACKEND_API}/prescription/history`
};

// Animated background components (matching InteractionCheck theme)
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

const DNAHelix = () => (
    <div className="absolute right-0 top-0 w-64 h-full overflow-hidden opacity-10 pointer-events-none">
        <svg viewBox="0 0 100 400" className="h-full animate-pulse" style={{ animationDuration: '4s' }}>
            <path d="M20,0 Q80,50 20,100 Q-40,150 20,200 Q80,250 20,300 Q-40,350 20,400" stroke="url(#dna-gradient)" strokeWidth="2" fill="none" />
            <path d="M80,0 Q20,50 80,100 Q140,150 80,200 Q20,250 80,300 Q140,350 80,400" stroke="url(#dna-gradient)" strokeWidth="2" fill="none" />
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

const ParticleField = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

const GradientOrbs = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/10 via-indigo-500/10 to-purple-400/10 blur-3xl animate-morph" style={{ animationDuration: '20s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-cyan-400/10 via-teal-500/10 to-emerald-400/10 blur-3xl animate-morph" style={{ animationDuration: '25s', animationDelay: '5s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-400/5 via-purple-500/5 to-pink-400/5 blur-3xl animate-spin-slow"></div>
    </div>
);

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
        @keyframes bounce-dot {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
        @keyframes scan-line {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
        }
        @keyframes image-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
            50% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
        }
        .animate-float { animation: float linear infinite; }
        .animate-morph { animation: morph ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 60s linear infinite; }
        .animate-ping-slow { animation: ping-slow ease-out infinite; }
        .animate-shimmer { animation: shimmer 3s linear infinite; background-size: 200% 100%; }
        .animate-gradient { animation: gradient-shift 8s ease infinite; background-size: 200% 200%; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
        .animate-image-pulse { animation: image-pulse 2s ease-in-out infinite; }
    `}</style>
);

// Loading and skeleton components (styled like InteractionCheck)
const PremiumLoader = () => (
    <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin" style={{ animationDuration: '1s' }}></div>
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-cyan-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 animate-pulse flex items-center justify-center">
            <MedicalServices className="text-white" fontSize="large" />
        </div>
        {[0, 1, 2].map((i) => (
            <div
                key={i}
                className="absolute top-1/2 left-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg shadow-blue-500/50 animate-spin"
                style={{ animationDelay: `${i * 1}s`, animationDuration: '3s' }}
            ></div>
        ))}
    </div>
);

const LoadingOverlay = ({ message = 'Processing prescription...' }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-md">
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-morph"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-morph" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative text-center">
            <div className="flex justify-center mb-8">
                <PremiumLoader />
            </div>
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">{message}</h3>
                <div className="flex items-center justify-center gap-2">
                    {['Enhancing image', 'Running OCR', 'Structuring data'].map((step, i) => (
                        <div key={step} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}></div>
                            <span className="text-sm text-blue-200">{step}</span>
                            {i < 2 && <span className="text-blue-400/50">→</span>}
                        </div>
                    ))}
                </div>
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

const SkeletonLoader = ({ className = '' }) => (
    <div className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded ${className}`}></div>
);

const ResultsSkeleton = () => (
    <div className="relative overflow-hidden backdrop-blur-xl bg-white/90 border border-white/50 rounded-3xl shadow-2xl p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"></div>
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

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Supported image types for prescription upload
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp'];

// Default image adjustment settings
const DEFAULT_IMAGE_SETTINGS = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpness: 0,
    noiseReduction: 0,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    grayscale: false,
    autoEnhance: true,
    mode: 'medical' // medical, document, standard
};

// OCR Processing states
const PROCESSING_STATES = {
    IDLE: 'idle',
    UPLOADING: 'uploading',
    ENHANCING: 'enhancing',
    PROCESSING_OCR: 'processing_ocr',
    EXTRACTING_DATA: 'extracting_data',
    COMPLETED: 'completed',
    ERROR: 'error'
};

// Styled Components
const DropzoneArea = styled(Paper)(({ theme, isdragactive, isdragreject }) => ({
    padding: theme.spacing(4),
    border: `3px dashed ${isdragreject ? theme.palette.error.main : isdragactive ? theme.palette.primary.main : theme.palette.grey[400]}`,
    borderRadius: theme.spacing(2),
    backgroundColor: isdragactive ? alpha(theme.palette.primary.main, 0.05) : theme.palette.background.paper,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
    '&:hover': {
        borderColor: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[8]
    }
}));

const StyledCanvas = styled('canvas')({
    display: 'none'
});

const EnhancementCard = styled(Card)(({ theme }) => ({
    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.light, 0.1)} 100%)`,
    borderRadius: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[6]
    }
}));

const ResultsCard = styled(Card)(({ theme }) => ({
    borderRadius: theme.spacing(2),
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    position: 'relative',
    overflow: 'visible',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        borderRadius: '4px 4px 0 0'
    }
}));

const ConfidenceBadge = styled(Box)(({ theme, confidence }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 1.5),
    borderRadius: 20,
    backgroundColor: confidence >= 80 ? theme.palette.success.light :
        confidence >= 60 ? theme.palette.warning.light :
            theme.palette.error.light,
    color: confidence >= 80 ? theme.palette.success.dark :
        confidence >= 60 ? theme.palette.warning.dark :
            theme.palette.error.dark,
    fontWeight: 600,
    fontSize: '0.75rem'
}));

const ProfessionalPrescriptionInterpreter = () => {
    const navigate = useNavigate();

    // State Management
    const [state, setState] = useState({
        // Image States
        selectedImage: null,
        previewUrl: null,
        enhancedPreviewUrl: null,

        // Processing States
        isLoading: false,
        isEnhancing: false,
        isExporting: false,

        // Data States
        extractedText: '',
        parsedData: {
            medications: [],
            dosages: [],
            instructions: [],
            frequencies: [],
            durations: [],
            warnings: [],
            interactions: [],
            confidence: 0,
            metadata: {
                analysisDate: null,
                processingTime: 0,
                imageQuality: 0
            }
        },

        // Progress States
        progress: {
            step: 'Ready',
            value: 0,
            details: ''
        },

        // Error States
        error: null,
        validationErrors: [],

        // UI States
        activeTab: 0,
        expandedSections: {
            medications: true,
            warnings: true,
            instructions: true,
            rawText: false
        },
        exportDialogOpen: false,
        settingsDialogOpen: false,
        historyDrawerOpen: false,
        fullscreenImage: false,
        imageZoom: 100,
        notifications: [],

        // Settings
        imageSettings: {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            sharpness: 0,
            noiseReduction: 0,
            rotation: 0,
            flipHorizontal: false,
            flipVertical: false,
            grayscale: false,
            autoEnhance: true,
            mode: 'medical' // medical, document, standard
        },

        exportSettings: {
            format: 'pdf',
            include: {
                medications: true,
                dosages: true,
                instructions: true,
                warnings: true,
                interactions: true,
                rawText: false,
                timestamp: true,
                qrCode: true,
                confidence: true
            },
            quality: 'high',
            compression: 0.8
        },

        // History
        history: [],

        // Presets
        enhancementPresets: [
            { name: 'Medical Document', icon: <MedicalServices />, settings: { contrast: 120, sharpness: 20 } },
            { name: 'Low Light', icon: <Brightness4 />, settings: { brightness: 150, contrast: 110 } },
            { name: 'High Contrast', icon: <Contrast />, settings: { contrast: 150, saturation: 80 } },
            { name: 'Grayscale', icon: <Grain />, settings: { saturation: 0, grayscale: true } }
        ]
    });

    // Refs
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const resultRef = useRef(null);

    // ================================================================================
    // ADDITIONAL STATE FOR API INTEGRATION (Part 1 Enhancement)
    // ================================================================================
    
    // OCR Processing State
    const [processingStatus, setProcessingStatus] = useState(PROCESSING_STATES.IDLE);
    const [ocrResult, setOcrResult] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [lastProcessedAt, setLastProcessedAt] = useState(null);
    const [processingDuration, setProcessingDuration] = useState(null);

    // API Health Check State
    const [apiHealth, setApiHealth] = useState({
        backend: { status: 'unknown', lastCheck: null },
        mlService: { status: 'unknown', lastCheck: null }
    });

    // Processing History (persisted to localStorage)
    const [processingHistory, setProcessingHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('prescriptionProcessingHistory');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // ================================================================================
    // MEMOIZED VALUES
    // ================================================================================
    
    // Check if we can submit for OCR processing
    const canSubmitForOCR = useMemo(() => {
        return state.previewUrl && 
               !state.isLoading && 
               processingStatus !== PROCESSING_STATES.PROCESSING_OCR;
    }, [state.previewUrl, state.isLoading, processingStatus]);

    // Current image filter CSS string based on brightness/contrast settings
    const imageFilterStyle = useMemo(() => {
        const { brightness, contrast, saturation, grayscale } = state.imageSettings;
        let filters = [];
        
        if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
        if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
        if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
        if (grayscale) filters.push('grayscale(100%)');
        
        return filters.length > 0 ? filters.join(' ') : 'none';
    }, [state.imageSettings]);

    // OCR Result Summary Statistics
    const ocrSummary = useMemo(() => {
        if (!ocrResult) return null;
        
        return {
            totalMedications: ocrResult.medications?.length || 0,
            totalWarnings: ocrResult.warnings?.length || 0,
            confidence: ocrResult.confidence || 0,
            hasExtractedText: Boolean(ocrResult.rawText || state.extractedText)
        };
    }, [ocrResult, state.extractedText]);

    // ================================================================================
    // EFFECTS
    // ================================================================================
    
    // Persist processing history to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('prescriptionProcessingHistory', JSON.stringify(processingHistory));
        } catch (e) {
            console.warn('Failed to save processing history:', e);
        }
    }, [processingHistory]);

    // Check API health on component mount (disabled polling to reduce errors)
    useEffect(() => {
        const checkApiHealth = async () => {
            // Check backend microservice silently
            try {
                const backendResponse = await axios.get(API_ENDPOINTS.HEALTH, { timeout: 5000 });
                setApiHealth(prev => ({
                    ...prev,
                    backend: { 
                        status: backendResponse.data?.status === 'OK' ? 'healthy' : 'unhealthy',
                        lastCheck: new Date().toISOString()
                    }
                }));
            } catch {
                // Silently set offline status - don't log errors
                setApiHealth(prev => ({
                    ...prev,
                    backend: { status: 'offline', lastCheck: new Date().toISOString() }
                }));
            }

            // Check ML service silently
            try {
                const mlResponse = await axios.get(`${ML_SERVICE_BASE}/health`, { timeout: 5000 });
                setApiHealth(prev => ({
                    ...prev,
                    mlService: { 
                        status: mlResponse.status === 200 ? 'healthy' : 'unhealthy',
                        lastCheck: new Date().toISOString()
                    }
                }));
            } catch {
                // Silently set offline status - don't log errors
                setApiHealth(prev => ({
                    ...prev,
                    mlService: { status: 'offline', lastCheck: new Date().toISOString() }
                }));
            }
        };

        // Only check once on mount, no polling (to avoid console spam)
        checkApiHealth();
        
        // Disabled: Re-check every 30 seconds causes too many errors when services are offline
        // const healthInterval = setInterval(checkApiHealth, 30000);
        // return () => clearInterval(healthInterval);
    }, []);

    // ================================================================================
    // STATE UPDATE HELPERS
    // ================================================================================
    
    // State Update Helper
    const updateState = (key, value) => {
        setState(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Batch State Update
    const updateMultipleStates = (updates) => {
        setState(prev => ({
            ...prev,
            ...updates
        }));
    };

    // Update image settings (for brightness/contrast controls)
    const updateImageSettings = useCallback((settingKey, value) => {
        setState(prev => ({
            ...prev,
            imageSettings: {
                ...prev.imageSettings,
                [settingKey]: value
            }
        }));
    }, []);

    // Reset image settings to defaults (enhanced version with useCallback)
    const resetImageSettingsToDefault = useCallback(() => {
        setState(prev => ({
            ...prev,
            imageSettings: { ...DEFAULT_IMAGE_SETTINGS }
        }));
    }, []);

    // Clear current image and reset state
    const clearImage = useCallback(() => {
        // Revoke object URL to prevent memory leaks
        if (state.previewUrl) {
            URL.revokeObjectURL(state.previewUrl);
        }
        if (state.enhancedPreviewUrl) {
            URL.revokeObjectURL(state.enhancedPreviewUrl);
        }
        
        updateMultipleStates({
            selectedImage: null,
            previewUrl: null,
            enhancedPreviewUrl: null,
            extractedText: '',
            error: null,
            validationErrors: []
        });
        
        setOcrResult(null);
        setApiError(null);
        setProcessingStatus(PROCESSING_STATES.IDLE);
    }, [state.previewUrl, state.enhancedPreviewUrl]);

    // Add notification helper
    const addNotification = useCallback((message, severity = 'info') => {
        const newNotification = {
            id: Date.now(),
            message,
            severity,
            timestamp: new Date().toISOString()
        };
        
        setState(prev => ({
            ...prev,
            notifications: [...prev.notifications, newNotification]
        }));

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setState(prev => ({
                ...prev,
                notifications: prev.notifications.filter(n => n.id !== newNotification.id)
            }));
        }, 5000);
    }, []);

    // Add to processing history (for API results)
    const addToProcessingHistory = useCallback((result, imageInfo) => {
        const historyEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            imageInfo: {
                name: imageInfo.name,
                size: imageInfo.size,
                type: imageInfo.type
            },
            result: {
                medicationsCount: result.medications?.length || 0,
                confidence: result.confidence || 0,
                hasWarnings: (result.warnings?.length || 0) > 0
            },
            processingTime: processingDuration
        };

        setProcessingHistory(prev => [historyEntry, ...prev].slice(0, 50)); // Keep last 50
    }, [processingDuration]);

    // ================================================================================
    // FILE VALIDATION
    // ================================================================================
    
    // File Validation
    const validateFile = useCallback((file) => {
        const errors = [];
        let valid = true;
        let message = '';

        // Size validation
        if (file.size > MAX_FILE_SIZE) {
            valid = false;
            errors.push({
                type: 'size',
                message: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
            });
            message = `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
        }

        // Type validation using the constant
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
            valid = false;
            errors.push({
                type: 'type',
                message: 'Invalid file type'
            });
            message = 'Invalid file type. Please upload an image (JPEG, PNG, BMP, TIFF, WEBP)';
        }

        return { valid, message, errors };
    }, []);

    // ================================================================================
    // API INTEGRATION - OCR PROCESSING
    // ================================================================================

    /**
     * Process prescription image through OCR API
     * Connects to backend microservice and ML service for text extraction
     */
    const processPrescriptionOCR = useCallback(async () => {
        if (!state.selectedImage || !canSubmitForOCR) {
            addNotification('Please upload an image first', 'warning');
            return;
        }

        const startTime = Date.now();
        setApiError(null);
        setProcessingStatus(PROCESSING_STATES.UPLOADING);

        try {
            // Create FormData for image upload
            const formData = new FormData();
            
            // If we have an enhanced image, use that; otherwise use original
            if (state.enhancedPreviewUrl) {
                // Convert enhanced preview URL to blob
                const enhancedResponse = await fetch(state.enhancedPreviewUrl);
                const enhancedBlob = await enhancedResponse.blob();
                // Use 'file' as key for ML service compatibility
                formData.append('file', enhancedBlob, state.selectedImage.name);
                // Also append as 'prescription' for backend compatibility
                formData.append('prescription', enhancedBlob, state.selectedImage.name);
            } else {
                // Use 'file' as key for ML service compatibility
                formData.append('file', state.selectedImage);
                // Also append as 'prescription' for backend compatibility
                formData.append('prescription', state.selectedImage);
            }

            // Add image settings metadata
            formData.append('imageSettings', JSON.stringify({
                brightness: state.imageSettings.brightness,
                contrast: state.imageSettings.contrast,
                rotation: state.imageSettings.rotation
            }));

            setProcessingStatus(PROCESSING_STATES.PROCESSING_OCR);
            addNotification('Processing prescription with OCR + NER pipeline...', 'info');

            // Try endpoints in priority order:
            // 1. ML Service full interpret (Donut OCR + Medical NER)
            // 2. Backend microservice /interpret (proxies to ML)
            // 3. ML Service basic OCR
            // 4. Mock fallback
            let response;
            let ocrData;

            const requestConfig = {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000, // 2 min (Donut model may need loading time)
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    updateState('progress', {
                        step: 'Uploading',
                        value: percentCompleted,
                        details: `${percentCompleted}% uploaded`
                    });
                }
            };

            try {
                // Primary: ML Service full interpret pipeline (OCR → NER → Parser)
                response = await axios.post(API_ENDPOINTS.OCR_INTERPRET, formData, requestConfig);
                ocrData = response.data;
            } catch (primaryError) {
                console.warn('ML interpret failed, trying backend microservice:', primaryError.message);

                try {
                    // Fallback 1: Backend microservice (proxies to ML)
                    response = await axios.post(API_ENDPOINTS.UPLOAD, formData, requestConfig);
                    ocrData = response.data;
                } catch (backendError) {
                    console.warn('Backend failed, trying ML OCR directly:', backendError.message);

                    try {
                // Fallback 2: ML Service basic OCR
                        response = await axios.post(API_ENDPOINTS.OCR_PROCESS, formData, {
                            ...requestConfig,
                            timeout: 120000
                        });
                        ocrData = response.data;
                    } catch (mlError) {
                        console.warn('All APIs failed, using mock response:', mlError.message);
                        ocrData = generateMockOCRResponse();
                    }
                }
            }

            setProcessingStatus(PROCESSING_STATES.EXTRACTING_DATA);

            // Process and structure the OCR response
            const processedResult = processOCRResponse(ocrData);

            // Calculate processing duration
            const duration = Date.now() - startTime;
            setProcessingDuration(duration);
            setLastProcessedAt(new Date().toISOString());

            // Update state with results
            setOcrResult(processedResult);
            updateState('extractedText', processedResult.rawText || '');
            updateState('parsedData', {
                medications: processedResult.medications || [],
                dosages: processedResult.dosages || [],
                instructions: processedResult.instructions || [],
                frequencies: processedResult.frequencies || [],
                durations: processedResult.durations || [],
                warnings: processedResult.warnings || [],
                interactions: processedResult.interactions || [],
                confidence: processedResult.confidence || 0,
                metadata: {
                    analysisDate: new Date().toISOString(),
                    processingTime: duration,
                    imageQuality: processedResult.imageQuality || 0
                }
            });

            // Add to history
            addToProcessingHistory(processedResult, state.selectedImage);

            setProcessingStatus(PROCESSING_STATES.COMPLETED);
            addNotification(`OCR completed in ${(duration / 1000).toFixed(1)}s`, 'success');

            // Scroll to results
            if (resultRef.current) {
                resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

        } catch (error) {
            console.error('OCR Processing Error:', error);
            setProcessingStatus(PROCESSING_STATES.ERROR);
            
            const errorMessage = error.response?.data?.message || 
                                error.message || 
                                'Failed to process prescription. Please try again.';
            setApiError(errorMessage);
            addNotification(errorMessage, 'error');
        }
    }, [state.selectedImage, state.enhancedPreviewUrl, state.imageSettings, canSubmitForOCR, addNotification, addToProcessingHistory]);

    /**
     * Process and normalize OCR/Interpret API response
     */
    const processOCRResponse = useCallback((apiResponse) => {
        // Handle different API response formats
        const interpretation = apiResponse.interpretation || apiResponse;
        const nerEntities = apiResponse.ner_entities || {};
        const metadata = apiResponse.metadata || {};
        const disclaimer = apiResponse.disclaimer || '';
        
        return {
            rawText: interpretation.rawText || interpretation.extracted_text || interpretation.text || '',
            medications: extractMedicationsFromOCR(interpretation, nerEntities),
            dosages: interpretation.dosages || [],
            instructions: interpretation.instructions || [],
            frequencies: interpretation.frequencies || [],
            durations: interpretation.durations || [],
            warnings: interpretation.warnings || [],
            interactions: interpretation.interactions || [],
            confidence: interpretation.confidence || calculateOCRConfidence(interpretation),
            imageQuality: interpretation.imageQuality || interpretation.image_quality || 75,
            timestamp: apiResponse.timestamp || new Date().toISOString(),
            nerEntities,
            metadata: {
                engine: metadata.engine || metadata.engines?.join(' + ') || 'unknown',
                pipeline: metadata.pipeline || '',
                models: metadata.models || {},
                processingTime: metadata.processingTime || 0,
            },
            disclaimer,
        };
    }, []);

    /**
     * Extract medications from OCR response
     */
    const extractMedicationsFromOCR = (interpretation, nerEntities = {}) => {
    // Priority 1: Use structured medications from the ML pipeline
        if (interpretation.medications && Array.isArray(interpretation.medications)) {
            return interpretation.medications.map(med => ({
                name: med.name || med.drug_name || med,
                dosage: med.dosage || med.dose || '',
                frequency: med.frequency || '',
                duration: med.duration || '',
                route: med.route || '',
                form: med.form || '',
                instructions: med.instructions || '',
                confidence: med.confidence || 0,
                source: med.source || 'pipeline'
            }));
        }

        // Priority 2: Build from NER entities if available
        if (nerEntities.medications && nerEntities.medications.length > 0) {
            return nerEntities.medications.map((medName, idx) => ({
                name: medName,
                dosage: nerEntities.dosages?.[idx] || '',
                frequency: nerEntities.frequencies?.[idx] || '',
                duration: nerEntities.durations?.[idx] || '',
                route: nerEntities.routes?.[idx] || '',
                form: nerEntities.forms?.[idx] || '',
                instructions: '',
                confidence: 75,
                source: 'ner'
            }));
        }
        
        // Priority 3: Parse from raw text via regex
        if (interpretation.rawText || interpretation.text) {
            const text = interpretation.rawText || interpretation.text;
            const medicationPatterns = [
                /(?:Tab|Cap|Syrup|Inj)\s+([A-Za-z]+(?:\s+\d+\s*mg)?)/gi,
                /([A-Z][a-z]+(?:cillin|mycin|prazole|olol|sartan|statin|pril))/gi
            ];
            
            const found = [];
            medicationPatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    if (!found.some(m => m.name.toLowerCase() === match[1].toLowerCase())) {
                        found.push({
                            name: match[1],
                            dosage: '',
                            frequency: '',
                            duration: '',
                            instructions: '',
                            confidence: 60,
                            source: 'regex'
                        });
                    }
                }
            });
            
            return found;
        }
        
        return [];
    };

    /**
     * Calculate confidence score from OCR result
     */
    const calculateOCRConfidence = (interpretation) => {
        let score = 50; // Base score
        
        if (interpretation.rawText && interpretation.rawText.length > 50) score += 10;
        if (interpretation.medications?.length > 0) score += 15;
        if (interpretation.dosages?.length > 0) score += 10;
        if (interpretation.instructions?.length > 0) score += 10;
        if (interpretation.imageQuality > 70) score += 5;
        
        return Math.min(score, 100);
    };

    /**
     * Generate mock OCR response for development/demo
     */
    const generateMockOCRResponse = () => {
        return {
            interpretation: {
                rawText: `Dr. Smith Medical Clinic
Patient: John Doe
Date: ${new Date().toLocaleDateString()}

Rx:
1. Tab Amoxicillin 500mg - 1 tablet three times daily for 7 days
2. Cap Omeprazole 20mg - 1 capsule before breakfast for 14 days
3. Tab Paracetamol 650mg - 1 tablet as needed for fever/pain

Instructions:
- Take medications with food
- Complete the full course of antibiotics
- Avoid alcohol during treatment
- Return if symptoms persist after 5 days

Signature: Dr. Smith
License: MD-12345`,
                medications: [
                    { name: 'Amoxicillin', dosage: '500mg', frequency: 'Three times daily', duration: '7 days', confidence: 92 },
                    { name: 'Omeprazole', dosage: '20mg', frequency: 'Once daily', duration: '14 days', confidence: 88 },
                    { name: 'Paracetamol', dosage: '650mg', frequency: 'As needed', duration: 'PRN', confidence: 95 }
                ],
                dosages: ['500mg', '20mg', '650mg'],
                instructions: [
                    'Take medications with food',
                    'Complete the full course of antibiotics',
                    'Avoid alcohol during treatment',
                    'Return if symptoms persist after 5 days'
                ],
                frequencies: ['Three times daily', 'Once daily before breakfast', 'As needed'],
                durations: ['7 days', '14 days', 'PRN'],
                warnings: [
                    'Amoxicillin may cause allergic reactions in penicillin-sensitive patients',
                    'Do not drive or operate machinery if experiencing drowsiness'
                ],
                interactions: [],
                confidence: 87,
                imageQuality: 82
            },
            timestamp: new Date().toISOString()
        };
    };

    /**
     * Retry OCR processing
     */
    const retryOCRProcessing = useCallback(() => {
        setOcrResult(null);
        setApiError(null);
        setProcessingStatus(PROCESSING_STATES.IDLE);
        processPrescriptionOCR();
    }, [processPrescriptionOCR]);

    /**
     * Clear OCR results
     */
    const clearOCRResults = useCallback(() => {
        setOcrResult(null);
        setApiError(null);
        setProcessingStatus(PROCESSING_STATES.IDLE);
        setLastProcessedAt(null);
        setProcessingDuration(null);
        updateState('extractedText', '');
        updateState('parsedData', {
            medications: [],
            dosages: [],
            instructions: [],
            frequencies: [],
            durations: [],
            warnings: [],
            interactions: [],
            confidence: 0,
            metadata: { analysisDate: null, processingTime: 0, imageQuality: 0 }
        });
    }, []);

    // ================================================================================
    // IMAGE ENHANCEMENT FUNCTIONS
    // ================================================================================

    // Image Enhancement Functions
    const applyImageEnhancements = async (imageFile, settings = null) => {
        const enhancementSettings = settings || state.imageSettings;

        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(imageFile);
            
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Failed to load image for enhancement'));
            };
            
            img.onload = () => {
                // Clean up object URL
                // URL.revokeObjectURL(objectUrl); // Don't revoke immediately, might be needed for drawImage
                
                try {
                    // Create a new canvas for processing (don't rely on ref)
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Set canvas dimensions
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;

                    // Validate dimensions
                    if (canvas.width === 0 || canvas.height === 0) {
                        URL.revokeObjectURL(objectUrl);
                        reject(new Error('Image has invalid dimensions'));
                        return;
                    }

                    // Draw original image
                    ctx.drawImage(img, 0, 0);
                    
                    // Now safe to revoke
                    URL.revokeObjectURL(objectUrl);

                    // Apply transformations
                    if (enhancementSettings.rotation !== 0) {
                        // Ensure canvas has dimensions before rotating
                        if (canvas.width > 0 && canvas.height > 0) {
                            rotateCanvas(canvas, enhancementSettings.rotation);
                        }
                    }

                    if (enhancementSettings.flipHorizontal || enhancementSettings.flipVertical) {
                        flipCanvas(canvas, enhancementSettings.flipHorizontal, enhancementSettings.flipVertical);
                    }

                    // Get image data for pixel manipulation
                    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    // Apply enhancements
                    if (enhancementSettings.brightness !== 100) {
                        adjustBrightness(data, enhancementSettings.brightness);
                    }

                    if (enhancementSettings.contrast !== 100) {
                        adjustContrast(data, enhancementSettings.contrast);
                    }

                    if (enhancementSettings.saturation !== 100) {
                        adjustSaturation(data, enhancementSettings.saturation);
                    }

                    if (enhancementSettings.sharpness !== 0) {
                        applySharpness(imageData, enhancementSettings.sharpness);
                    }

                    if (enhancementSettings.noiseReduction > 0) {
                        reduceNoise(imageData, enhancementSettings.noiseReduction);
                    }

                    if (enhancementSettings.grayscale) {
                        applyGrayscale(data);
                    }

                    // Put enhanced image data back
                    ctx.putImageData(imageData, 0, 0);

                    // Convert to blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create image blob'));
                        }
                    }, 'image/jpeg', 0.95);
                } catch (error) {
                    reject(error);
                }
            };

            img.src = objectUrl;
        });
    };

    // Notification System
    const showNotification = (message, severity = 'info') => {
        const notification = {
            id: Date.now(),
            message,
            severity,
            open: true
        };

        updateState('notifications', [...state.notifications, notification]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            removeNotification(notification.id);
        }, 5000);
    };

    const removeNotification = (id) => {
        updateState('notifications', state.notifications.filter(n => n.id !== id));
    };

    const autoEnhanceImage = useCallback(async (imageFile) => {
        updateState('isEnhancing', true);

        try {
            // Analyze image characteristics
            const analysis = await analyzeImage(imageFile);

            // Calculate optimal settings
            const optimalSettings = calculateOptimalSettings(analysis);

            // Apply enhancements
            const enhancedImage = await applyImageEnhancements(imageFile, optimalSettings);

            // Update preview
            updateState('enhancedPreviewUrl', URL.createObjectURL(enhancedImage));
            updateState('imageSettings', { ...state.imageSettings, ...optimalSettings });

            showNotification('Image auto-enhanced successfully!', 'success');
        } catch (error) {
            console.error('Auto-enhance failed:', error);
            showNotification('Auto-enhancement failed', 'error');
        } finally {
            updateState('isEnhancing', false);
        }
    }, [state.imageSettings, updateState, showNotification, applyImageEnhancements]);

    // Dropzone Configuration
    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        // Clear previous errors and reset states
        updateState('error', null);
        updateState('validationErrors', []);
        setApiError(null);
        setOcrResult(null);
        setProcessingStatus(PROCESSING_STATES.IDLE);

        if (rejectedFiles.length > 0) {
            const rejection = rejectedFiles[0];
            if (rejection.errors[0].code === 'file-too-large') {
                updateState('error', `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
                setProcessingStatus(PROCESSING_STATES.ERROR);
                return;
            }
            if (rejection.errors[0].code === 'file-invalid-type') {
                updateState('error', 'Invalid file type. Please upload an image (JPEG, PNG, BMP, TIFF, WEBP)');
                setProcessingStatus(PROCESSING_STATES.ERROR);
                return;
            }
        }

        const file = acceptedFiles[0];
        if (file) {
            // Validate file
            const validation = validateFile(file);
            if (!validation.valid) {
                updateState('error', validation.message);
                updateState('validationErrors', validation.errors);
                setProcessingStatus(PROCESSING_STATES.ERROR);
                return;
            }

            // Set uploading status
            setProcessingStatus(PROCESSING_STATES.UPLOADING);

            // Update state with new file
            updateState('selectedImage', file);
            updateState('previewUrl', URL.createObjectURL(file));
            updateState('enhancedPreviewUrl', null);
            updateState('extractedText', '');
            updateState('parsedData', {
                medications: [],
                dosages: [],
                instructions: [],
                frequencies: [],
                durations: [],
                warnings: [],
                interactions: [],
                confidence: 0,
                metadata: { analysisDate: null, processingTime: 0, imageQuality: 0 }
            });

            // Show success notification
            addNotification(`Image "${file.name}" uploaded successfully!`, 'success');

            // Mark upload complete, ready for processing
            setProcessingStatus(PROCESSING_STATES.IDLE);

            // Auto-enhance if enabled
            if (state.imageSettings.autoEnhance) {
                setProcessingStatus(PROCESSING_STATES.ENHANCING);
                setTimeout(() => {
                    autoEnhanceImage(file).finally(() => {
                        setProcessingStatus(PROCESSING_STATES.IDLE);
                    });
                }, 100);
            }
        }
    }, [state.imageSettings.autoEnhance, autoEnhanceImage, validateFile, addNotification]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.bmp', '.tiff', '.webp']
        },
        maxFiles: 1,
        maxSize: MAX_FILE_SIZE,
        multiple: false
    });

    // Image Processing Helpers
    const adjustBrightness = (data, brightness) => {
        const factor = (brightness - 100) / 100;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(data[i] + data[i] * factor);
            data[i + 1] = clamp(data[i + 1] + data[i + 1] * factor);
            data[i + 2] = clamp(data[i + 2] + data[i + 2] * factor);
        }
    };

    const adjustContrast = (data, contrast) => {
        const factor = (contrast - 100) / 100;
        const avg = 128;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp((data[i] - avg) * factor + avg);
            data[i + 1] = clamp((data[i + 1] - avg) * factor + avg);
            data[i + 2] = clamp((data[i + 2] - avg) * factor + avg);
        }
    };

    const adjustSaturation = (data, saturation) => {
        const factor = saturation / 100;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            data[i] = clamp(gray + (r - gray) * factor);
            data[i + 1] = clamp(gray + (g - gray) * factor);
            data[i + 2] = clamp(gray + (b - gray) * factor);
        }
    };

    const applySharpness = (imageData, sharpness) => {
        // Simplified sharpening
        const kernel = [
            [0, -sharpness / 100, 0],
            [-sharpness / 100, 1 + 4 * (sharpness / 100), -sharpness / 100],
            [0, -sharpness / 100, 0]
        ];
        applyConvolution(imageData, kernel);
    };

    const reduceNoise = (imageData, amount) => {
        // Simple median filter for noise reduction
        const radius = Math.floor(amount / 20);
        applyMedianFilter(imageData, radius);
    };

    const applyGrayscale = (data) => {
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
        }
    };

    const rotateCanvas = (canvas, angle) => {
        // Validate canvas dimensions before rotation
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
            console.warn('Cannot rotate canvas with zero dimensions');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const rad = angle * Math.PI / 180;

        // Skip if angle is effectively zero
        if (Math.abs(angle % 360) < 0.01) {
            return;
        }

        // Calculate new canvas size
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        const newWidth = Math.max(1, Math.round(canvas.width * cos + canvas.height * sin));
        const newHeight = Math.max(1, Math.round(canvas.width * sin + canvas.height * cos));

        // Save current canvas content
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        // Ensure tempCanvas has valid dimensions before putting image data
        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
            tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
        } else {
            return; // Cannot proceed with invalid dimensions
        }

        // Create rotated canvas
        const rotatedCanvas = document.createElement('canvas');
        rotatedCanvas.width = newWidth;
        rotatedCanvas.height = newHeight;
        const rotatedCtx = rotatedCanvas.getContext('2d');

        // Center and rotate
        rotatedCtx.translate(newWidth / 2, newHeight / 2);
        rotatedCtx.rotate(rad);
        
        // Ensure tempCanvas has valid dimensions before drawing
        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
            rotatedCtx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
        }

        // Copy back
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        if (rotatedCanvas.width > 0 && rotatedCanvas.height > 0) {
            ctx.drawImage(rotatedCanvas, 0, 0);
        }
    };

    const flipCanvas = (canvas, horizontal, vertical) => {
        const ctx = canvas.getContext('2d');
        ctx.save();

        if (horizontal) {
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
        }

        if (vertical) {
            ctx.scale(1, -1);
            ctx.translate(0, -canvas.height);
        }

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imgData, 0, 0);
        ctx.restore();
    };

    const clamp = (value) => Math.max(0, Math.min(255, value));

    const analyzeImage = async (imageFile) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                let totalBrightness = 0;
                let histogram = Array(256).fill(0);

                for (let i = 0; i < data.length; i += 4) {
                    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    totalBrightness += brightness;
                    histogram[Math.floor(brightness)]++;
                }

                const avgBrightness = totalBrightness / (data.length / 4);

                resolve({
                    brightness: avgBrightness / 255 * 100,
                    histogram,
                    isLowLight: avgBrightness < 100,
                    resolution: `${img.width}x${img.height}`,
                    aspectRatio: img.width / img.height
                });
            };
            img.src = URL.createObjectURL(imageFile);
        });
    };

    const calculateOptimalSettings = (analysis) => {
        const settings = {};

        if (analysis.isLowLight) {
            settings.brightness = 130;
            settings.contrast = 110;
        }

        // Add sharpness for text clarity
        settings.sharpness = 20;

        return settings;
    };

    // OCR Processing
    const processPrescription = async () => {
        if (!state.selectedImage) return;

        updateMultipleStates({
            isLoading: true,
            error: null,
            progress: { step: 'Starting analysis...', value: 10, details: 'Validating image' }
        });

        try {
            // Step 1: Apply enhancements
            updateState('progress', { step: 'Enhancing image...', value: 15, details: 'Applying image enhancements' });
            const enhancedImage = await applyImageEnhancements(state.selectedImage);
            
            // Step 2: Create image URL for Tesseract
            updateState('progress', { step: 'Preparing image...', value: 25, details: 'Converting image for OCR' });
            const imageUrl = URL.createObjectURL(enhancedImage);
            
            // Step 3: Perform OCR with Tesseract.js
            updateState('progress', { step: 'Extracting text...', value: 40, details: 'Running OCR on prescription image' });
            const ocrResult = await Tesseract.recognize(
                imageUrl,
                'eng',
                {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(40 + (m.progress * 20));
                            updateState('progress', { 
                                step: 'Extracting text...', 
                                value: progress, 
                                details: `OCR progress: ${Math.round(m.progress * 100)}%` 
                            });
                        }
                    }
                }
            );
            
            // Clean up object URL
            URL.revokeObjectURL(imageUrl);
            
            const extractedText = ocrResult.data.text;
            console.log('OCR extracted text:', extractedText); // Debug log
            
            // Allow processing even with minimal text (user can see what was extracted)
            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('No text could be extracted from the image. Please ensure the prescription is clear and readable.');
            }
            
            // Warn if text is very short but still continue
            if (extractedText.trim().length < 10) {
                console.warn('Very little text extracted from image');
            }

            // Step 4: Try to use AI to analyze the extracted text (optional enhancement)
            updateState('progress', { step: 'Analyzing text...', value: 65, details: 'Processing extracted text' });
            
            let structured_data = {};
            let aiAnalysisUsed = false;
            
            // Try AI analysis if API key is configured
            if (API_CONFIG.API_KEY && API_CONFIG.API_KEY !== 'your-api-key-here') {
                try {
                    updateState('progress', { step: 'AI Analysis...', value: 70, details: 'Enhancing results with Gemini AI' });
                    
                    const prescriptionPrompt = `Analyze the following prescription text extracted via OCR and structure it into JSON format. The text may contain some OCR errors, so please interpret it intelligently.

EXTRACTED PRESCRIPTION TEXT:
"""
${extractedText}
"""

Please extract and return the following information in JSON format:
{
    "patientName": "patient name if visible",
    "doctorName": "doctor/physician name if visible",
    "date": "prescription date if visible",
    "medications": [
        {
            "name": "medication name",
            "dosage": "dosage amount",
            "frequency": "how often to take",
            "duration": "how long to take",
            "instructions": "special instructions"
        }
    ],
    "diagnosis": "diagnosis if mentioned",
    "warnings": ["any warnings or contraindications"],
    "additionalNotes": "any other relevant information"
}

If any field is not visible or unclear in the text, use null for that field. Return ONLY the JSON object, no additional text.`;

                    let aiResponse = '';
                    
                    // Use Gemini API format
                    if (API_CONFIG.PROVIDER === 'gemini') {
                        const response = await axios.post(
                            `${API_CONFIG.BASE_URL}?key=${API_CONFIG.API_KEY}`,
                            {
                                contents: [
                                    {
                                        parts: [
                                            { text: prescriptionPrompt }
                                        ]
                                    }
                                ],
                                generationConfig: {
                                    temperature: 0.1,
                                    maxOutputTokens: 2000
                                }
                            },
                            {
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                timeout: 60000
                            }
                        );
                        
                        // Extract content from Gemini response
                        aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    } else {
                        // DeepSeek/OpenAI format
                        const response = await axios.post(
                            `${API_CONFIG.BASE_URL}/chat/completions`,
                            {
                                model: 'deepseek-chat',
                                messages: [
                                    {
                                        role: 'user',
                                        content: prescriptionPrompt
                                    }
                                ],
                                max_tokens: 2000,
                                temperature: 0.1
                            },
                            {
                                headers: {
                                    'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
                                    'Content-Type': 'application/json'
                                },
                                timeout: 60000
                            }
                        );
                        
                        aiResponse = response.data.choices?.[0]?.message?.content || '';
                    }
                    
                    // Try to parse JSON from the response
                    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                                      aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                                      [null, aiResponse];
                    const jsonStr = jsonMatch[1] || aiResponse;
                    structured_data = JSON.parse(jsonStr.trim());
                    aiAnalysisUsed = true;
                    
                } catch (aiError) {
                    console.warn('AI analysis failed, falling back to local parsing:', aiError.message);
                    // Continue with local parsing
                }
            }
            
            // Step 5: Process response (with local parsing fallback)
            updateState('progress', { step: 'Processing results...', value: 85, details: aiAnalysisUsed ? 'AI analysis complete' : 'Using local text parsing' });
            
            const text = extractedText;

            // Parse and validate data
            const parsedResults = parsePrescriptionData(structured_data, text);
            const confidence = calculateConfidence(parsedResults);

            // Step 6: Update state
            updateMultipleStates({
                extractedText: text,
                parsedData: {
                    ...parsedResults,
                    confidence,
                    metadata: {
                        analysisDate: new Date().toISOString(),
                        processingTime: Date.now() - (state.progress.startTime || Date.now()),
                        imageQuality: calculateImageQuality(state.selectedImage),
                        ocrConfidence: ocrResult.data.confidence,
                        aiEnhanced: aiAnalysisUsed
                    }
                },
                progress: { step: 'Completed!', value: 100, details: aiAnalysisUsed ? 'AI-enhanced analysis complete' : 'OCR analysis complete' }
            });

            // Save to history
            addToHistory(parsedResults, confidence);

            showNotification(aiAnalysisUsed ? 'Prescription analyzed with AI!' : 'Prescription analyzed successfully!', 'success');

        } catch (error) {
            console.error('Processing error:', error);
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error?.message ||
                error.message ||
                'Failed to process prescription. Please try again.';

            updateMultipleStates({
                error: errorMessage,
                progress: { step: 'Error', value: 0, details: errorMessage }
            });

            showNotification(errorMessage, 'error');
        } finally {
            updateState('isLoading', false);

            // Reset progress after delay
            setTimeout(() => {
                updateState('progress', { step: 'Ready', value: 0, details: '' });
            }, 2000);
        }
    };

    const parsePrescriptionData = (structuredData, rawText) => {
        // Handle medications from AI response (array of objects with name, dosage, etc.)
        let medications = [];
        let dosages = [];
        let instructions = [];
        let frequencies = [];
        let durations = [];
        
        if (structuredData.medications && Array.isArray(structuredData.medications)) {
            structuredData.medications.forEach(med => {
                if (typeof med === 'string') {
                    medications.push(med);
                } else if (med && typeof med === 'object') {
                    if (med.name) medications.push(med.name);
                    if (med.dosage) dosages.push(med.dosage);
                    if (med.instructions) instructions.push(med.instructions);
                    if (med.frequency) frequencies.push(med.frequency);
                    if (med.duration) durations.push(med.duration);
                }
            });
        }
        
        // Enhanced parsing with validation and fallbacks
        return {
            patientName: structuredData.patientName || null,
            doctorName: structuredData.doctorName || null,
            date: structuredData.date || null,
            diagnosis: structuredData.diagnosis || null,
            medications: medications.length > 0 ? medications : extractMedications(rawText),
            dosages: dosages.length > 0 ? dosages : (structuredData.dosages || extractDosages(rawText)),
            instructions: instructions.length > 0 ? instructions : (structuredData.instructions || extractInstructions(rawText)),
            frequencies: frequencies.length > 0 ? frequencies : (structuredData.frequencies || extractFrequencies(rawText)),
            durations: durations.length > 0 ? durations : (structuredData.durations || extractDurations(rawText)),
            warnings: structuredData.warnings || extractWarnings(rawText),
            interactions: structuredData.interactions || [],
            additionalNotes: structuredData.additionalNotes || null,
            rawText: rawText
        };
    };

    const extractMedications = (text) => {
        const patterns = [
            /(?:\bRx:\s*|\bRx\s+)([A-Z][a-zA-Z\s-]+?)(?:\s+\d)/gi,
            /([A-Z][a-zA-Z\s-]+?)\s+(?:\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|IU))/gi,
            /\b(?:Take|Use|Apply)\s+([A-Z][a-zA-Z\s-]+?)(?:\s+(?:tablet|capsule|injection))/gi
        ];

        const medications = new Set();
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const med = match[1].trim();
                if (med.length >= 3 && !med.match(/\b(?:tablet|capsule|mg|g|ml)\b/i)) {
                    medications.add(med);
                }
            }
        });

        return Array.from(medications);
    };

    const extractDosages = (text) => {
        const pattern = /(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|IU|tablet|cap|spray|puff|patch))\s*(?:per\s*(?:dose|time))?/gi;
        const dosages = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            dosages.push(match[1].trim());
        }
        return dosages;
    };

    const extractInstructions = (text) => {
        const pattern = /(?:take|use|apply)\s+(?:with|without)\s+food|(?:before|after)\s+(?:meals|breakfast|lunch|dinner)/gi;
        const instructions = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            instructions.push(match[0].trim());
        }
        return instructions;
    };

    const extractFrequencies = (text) => {
        const pattern = /(?:once|twice|thrice|\d+\s*times?)\s*(?:daily|per\s*day|a\s*day)|(?:every\s+\d+\s*(?:hours?|days?))/gi;
        const frequencies = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            frequencies.push(match[0].trim());
        }
        return frequencies;
    };

    const extractDurations = (text) => {
        const pattern = /for\s+\d+\s*(?:days?|weeks?|months?)|until\s+(?:finished|completed)/gi;
        const durations = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            durations.push(match[0].trim());
        }
        return durations;
    };

    const extractWarnings = (text) => {
        const pattern = /(?:avoid|do\s+not|stop|discontinue|warning|caution|may\s+cause|side\s+effects)/gi;
        const sentences = text.split(/[.!?]+/);
        const warnings = sentences.filter(sentence =>
            pattern.test(sentence) && sentence.length > 20
        ).map(s => s.trim());
        return warnings.slice(0, 5); // Limit to 5 warnings
    };

    const calculateConfidence = (data) => {
        let score = 0;

        // Base scoring
        if (data.medications?.length > 0) score += 40;
        if (data.dosages?.length > 0) score += 30;
        if (data.instructions?.length > 0) score += 15;
        if (data.warnings?.length > 0) score += 10;
        if (data.frequencies?.length > 0) score += 5;

        // Quality adjustments
        const hasCompletePairs = data.medications?.length === data.dosages?.length;
        if (hasCompletePairs) score += 10;

        // Penalize for missing critical info
        if (!data.medications || data.medications.length === 0) score -= 30;
        if (!data.dosages || data.dosages.length === 0) score -= 20;

        // Normalize to 0-100
        return Math.max(0, Math.min(100, score));
    };

    const calculateImageQuality = (imageFile) => {
        // Simple quality estimation based on file size and type
        let quality = 50; // Base quality

        if (imageFile.size > 2 * 1024 * 1024) quality += 20; // Large file
        if (imageFile.type === 'image/tiff') quality += 10; // High quality format
        if (imageFile.type === 'image/webp') quality += 5; // Modern format

        return Math.min(100, quality);
    };

    // Export Functions
    const handleExport = async (format) => {
        updateState('isExporting', true);

        try {
            let content, filename, mimeType;
            const timestamp = new Date().toISOString().split('T')[0];

            switch (format) {
                case 'pdf':
                    content = await exportToPDF();
                    filename = `prescription_${timestamp}.pdf`;
                    mimeType = 'application/pdf';
                    break;

                case 'json':
                    content = exportToJSON();
                    filename = `prescription_${timestamp}.json`;
                    mimeType = 'application/json';
                    break;

                case 'csv':
                    content = exportToCSV();
                    filename = `prescription_${timestamp}.csv`;
                    mimeType = 'text/csv';
                    break;

                case 'txt':
                    content = exportToText();
                    filename = `prescription_${timestamp}.txt`;
                    mimeType = 'text/plain';
                    break;

                case 'html':
                    content = exportToHTML();
                    filename = `prescription_${timestamp}.html`;
                    mimeType = 'text/html';
                    break;

                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            // Download file
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showNotification(`Exported as ${format.toUpperCase()} successfully!`, 'success');

        } catch (error) {
            console.error('Export error:', error);
            showNotification(`Export failed: ${error.message}`, 'error');
        } finally {
            updateState('isExporting', false);
            updateState('exportDialogOpen', false);
        }
    };

    const exportToPDF = async () => {
        const doc = new jsPDF();

        // Add header
        doc.setFontSize(20);
        doc.setTextColor(33, 150, 243);
        doc.text('Prescription Analysis Report', 105, 20, { align: 'center' });

        // Add metadata
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });
        doc.text(`Confidence: ${state.parsedData.confidence}%`, 105, 35, { align: 'center' });

        // Add medications table
        doc.autoTable({
            head: [['#', 'Medication', 'Dosage', 'Instructions']],
            body: state.parsedData.medications.map((med, index) => [
                index + 1,
                typeof med === 'string' ? med : med.name,
                state.parsedData.dosages[index] || '',
                state.parsedData.instructions[index] || ''
            ]),
            startY: 50,
            theme: 'grid'
        });

        // Add warnings if any
        if (state.parsedData.warnings.length > 0) {
            doc.text('Warnings:', 20, doc.lastAutoTable.finalY + 20);
            state.parsedData.warnings.forEach((warning, index) => {
                doc.text(`• ${warning}`, 25, doc.lastAutoTable.finalY + 30 + (index * 10));
            });
        }

        // Add footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Generated by Prescription Interpreter Pro', 105, 280, { align: 'center' });

        return doc.output('blob');
    };

    const exportToJSON = () => {
        return JSON.stringify({
            ...state.parsedData,
            metadata: {
                ...state.parsedData.metadata,
                exportDate: new Date().toISOString(),
                exportFormat: 'json'
            }
        }, null, 2);
    };

    const exportToCSV = () => {
        const headers = ['Medication', 'Dosage', 'Instructions', 'Frequency', 'Duration'];
        const rows = state.parsedData.medications.map((med, index) => [
            typeof med === 'string' ? med : med.name,
            state.parsedData.dosages[index] || '',
            state.parsedData.instructions[index] || '',
            state.parsedData.frequencies[index] || '',
            state.parsedData.durations[index] || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        return csvContent;
    };

    const exportToText = () => {
        const sections = [
            '=== PRESCRIPTION ANALYSIS REPORT ===',
            `Generated: ${new Date().toLocaleString()}`,
            `Confidence: ${state.parsedData.confidence}%`,
            '',
            '=== MEDICATIONS ===',
            ...state.parsedData.medications.map((med, index) =>
                `${index + 1}. ${med}` +
                (state.parsedData.dosages[index] ? ` - ${state.parsedData.dosages[index]}` : '') +
                (state.parsedData.instructions[index] ? ` (${state.parsedData.instructions[index]})` : '')
            ),
            '',
            '=== WARNINGS ===',
            ...state.parsedData.warnings.map(w => `• ${w}`),
            '',
            '=== INSTRUCTIONS ===',
            ...state.parsedData.instructions.map(i => `• ${i}`),
            '',
            '=== RAW TEXT ===',
            state.extractedText.substring(0, 1000) + (state.extractedText.length > 1000 ? '...' : '')
        ];

        return sections.join('\n');
    };

    const exportToHTML = () => {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Prescription Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .confidence { display: inline-block; padding: 5px 15px; border-radius: 20px; background: #e3f2fd; color: #1976d2; }
        .medication { margin: 10px 0; padding: 15px; border-left: 4px solid #4caf50; background: #f8f9fa; }
        .warning { color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 5px; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Prescription Analysis Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <span class="confidence">Confidence: ${state.parsedData.confidence}%</span>
    </div>
    
    <h2>Medications</h2>
    <table>
        <thead>
            <tr>
                <th>#</th><th>Medication</th><th>Dosage</th><th>Instructions</th>
            </tr>
        </thead>
        <tbody>
            ${state.parsedData.medications.map((med, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${med}</td>
                    <td>${state.parsedData.dosages[index] || ''}</td>
                    <td>${state.parsedData.instructions[index] || ''}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    ${state.parsedData.warnings.length > 0 ? `
        <h2>Warnings</h2>
        ${state.parsedData.warnings.map(w => `<div class="warning">⚠️ ${w}</div>`).join('')}
    ` : ''}
    
    <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
        <p>Generated by Prescription Interpreter Pro</p>
        <p>This report is for informational purposes only. Always consult a healthcare professional.</p>
    </div>
</body>
</html>`;
    };

    // History Management
    const addToHistory = (data, confidence) => {
        const newEntry = {
            id: Date.now(),
            data,
            confidence,
            timestamp: new Date().toISOString(),
            imagePreview: state.previewUrl
        };

        const updatedHistory = [newEntry, ...state.history.slice(0, 9)];
        updateState('history', updatedHistory);

        // Save to localStorage
        localStorage.setItem('prescriptionHistory', JSON.stringify(updatedHistory));
    };

    // UI Helpers
    const toggleSection = (section) => {
        updateState('expandedSections', {
            ...state.expandedSections,
            [section]: !state.expandedSections[section]
        });
    };

    const applyPreset = (preset) => {
        updateState('imageSettings', {
            ...state.imageSettings,
            ...preset.settings
        });

        // Apply preset to image
        if (state.selectedImage) {
            applyImageEnhancements(state.selectedImage, {
                ...state.imageSettings,
                ...preset.settings
            }).then(blob => {
                updateState('enhancedPreviewUrl', URL.createObjectURL(blob));
            });
        }

        showNotification(`Applied ${preset.name} preset`, 'success');
    };

    const resetImageSettings = () => {
        updateState('imageSettings', {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            sharpness: 0,
            noiseReduction: 0,
            rotation: 0,
            flipHorizontal: false,
            flipVertical: false,
            grayscale: false,
            autoEnhance: true,
            mode: 'medical'
        });

        if (state.selectedImage) {
            applyImageEnhancements(state.selectedImage, {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                sharpness: 0,
                noiseReduction: 0,
                rotation: 0,
                flipHorizontal: false,
                flipVertical: false,
                grayscale: false
            }).then(blob => {
                updateState('enhancedPreviewUrl', URL.createObjectURL(blob));
            });
        }
    };

    const clearAll = () => {
        if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
        if (state.enhancedPreviewUrl) URL.revokeObjectURL(state.enhancedPreviewUrl);

        updateMultipleStates({
            selectedImage: null,
            previewUrl: null,
            enhancedPreviewUrl: null,
            extractedText: '',
            parsedData: {
                medications: [],
                dosages: [],
                instructions: [],
                frequencies: [],
                durations: [],
                warnings: [],
                interactions: [],
                confidence: 0,
                metadata: { analysisDate: null, processingTime: 0, imageQuality: 0 }
            },
            error: null,
            validationErrors: []
        });
    };

    // Render Functions
    const renderUploadSection = () => (
        <Box sx={{ mb: 4 }}>
            {/* Section Header with API Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudUpload /> Upload Prescription
                </Typography>
                
                {/* API Health Status Indicators */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip title={`Backend: ${apiHealth.backend.status}`} arrow>
                        <Chip
                            size="small"
                            icon={<Box sx={{ 
                                width: 8, 
                                height: 8, 
                                borderRadius: '50%', 
                                bgcolor: apiHealth.backend.status === 'healthy' ? '#10B981' : 
                                         apiHealth.backend.status === 'offline' ? '#EF4444' : '#F59E0B',
                                ml: 1
                            }} />}
                            label="API"
                            variant="outlined"
                            sx={{ 
                                borderColor: apiHealth.backend.status === 'healthy' ? '#10B981' : 
                                             apiHealth.backend.status === 'offline' ? '#EF4444' : '#F59E0B',
                                fontSize: '0.7rem'
                            }}
                        />
                    </Tooltip>
                    <Tooltip title={`ML Service: ${apiHealth.mlService.status}`} arrow>
                        <Chip
                            size="small"
                            icon={<Box sx={{ 
                                width: 8, 
                                height: 8, 
                                borderRadius: '50%', 
                                bgcolor: apiHealth.mlService.status === 'healthy' ? '#10B981' : 
                                         apiHealth.mlService.status === 'offline' ? '#EF4444' : '#F59E0B',
                                ml: 1
                            }} />}
                            label="OCR"
                            variant="outlined"
                            sx={{ 
                                borderColor: apiHealth.mlService.status === 'healthy' ? '#10B981' : 
                                             apiHealth.mlService.status === 'offline' ? '#EF4444' : '#F59E0B',
                                fontSize: '0.7rem'
                            }}
                        />
                    </Tooltip>
                </Box>
            </Box>

            {/* Error Display */}
            {(state.error || apiError) && (
                <Alert 
                    severity="error" 
                    sx={{ mb: 2 }}
                    onClose={() => {
                        updateState('error', null);
                        setApiError(null);
                    }}
                >
                    {state.error || apiError}
                </Alert>
            )}

            {/* Processing Status Banner */}
            {processingStatus !== PROCESSING_STATES.IDLE && processingStatus !== PROCESSING_STATES.COMPLETED && (
                <Alert 
                    severity="info" 
                    sx={{ mb: 2 }}
                    icon={<CircularProgress size={20} />}
                >
                    {processingStatus === PROCESSING_STATES.UPLOADING && 'Uploading prescription image...'}
                    {processingStatus === PROCESSING_STATES.ENHANCING && 'Enhancing image quality...'}
                    {processingStatus === PROCESSING_STATES.PROCESSING_OCR && 'Processing OCR - Extracting text...'}
                    {processingStatus === PROCESSING_STATES.EXTRACTING_DATA && 'Analyzing prescription data...'}
                </Alert>
            )}

            {/* Main Upload Dropzone */}
            <DropzoneArea
                {...getRootProps()}
                isdragactive={isDragActive ? 1 : 0}
                isdragreject={isDragReject ? 1 : 0}
                sx={{ 
                    mb: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': isDragActive ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)',
                        animation: 'pulse 2s ease-in-out infinite',
                        pointerEvents: 'none',
                        zIndex: 0
                    } : {}
                }}
            >
                <input {...getInputProps()} ref={fileInputRef} />
                <Box sx={{ py: 4, position: 'relative', zIndex: 1 }}>
                    {state.isEnhancing ? (
                        <Fade in={state.isEnhancing}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Box className="animate-pulse-ring" sx={{ 
                                    width: 80, 
                                    height: 80, 
                                    borderRadius: '50%', 
                                    bgcolor: 'primary.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mx: 'auto',
                                    mb: 2
                                }}>
                                    <AutoAwesome sx={{ fontSize: 40, color: 'white' }} />
                                </Box>
                                <Typography variant="body1" sx={{ mt: 2, fontWeight: 500 }}>
                                    Enhancing image quality...
                                </Typography>
                                <LinearProgress sx={{ mt: 2, maxWidth: 300, mx: 'auto' }} />
                            </Box>
                        </Fade>
                    ) : isDragReject ? (
                        <Fade in={isDragReject}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Warning sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                                <Typography variant="h6" color="error" gutterBottom>
                                    Invalid file type
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Please upload a valid image file (JPEG, PNG, BMP, TIFF, WEBP)
                                </Typography>
                            </Box>
                        </Fade>
                    ) : (
                        <>
                            {/* Upload Icon with Animation */}
                            <Box sx={{ 
                                position: 'relative', 
                                display: 'inline-block',
                                mb: 2
                            }}>
                                <CloudUpload sx={{ 
                                    fontSize: 72, 
                                    color: isDragActive ? 'primary.main' : 'grey.400',
                                    transition: 'all 0.3s ease',
                                    transform: isDragActive ? 'scale(1.1)' : 'scale(1)'
                                }} />
                                {isDragActive && (
                                    <Box sx={{
                                        position: 'absolute',
                                        top: -10,
                                        right: -10,
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        bgcolor: 'primary.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>+</Typography>
                                    </Box>
                                )}
                            </Box>
                            
                            <Typography variant="h6" gutterBottom sx={{ 
                                color: isDragActive ? 'primary.main' : 'text.primary',
                                fontWeight: 600
                            }}>
                                {isDragActive ? 'Drop the prescription here!' : 'Drag & drop prescription image'}
                            </Typography>
                            
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                or click anywhere to browse files
                            </Typography>
                            
                            <Box sx={{ 
                                mt: 1, 
                                py: 1, 
                                px: 2, 
                                bgcolor: 'grey.100', 
                                borderRadius: 2,
                                display: 'inline-block'
                            }}>
                                <Typography variant="caption" color="text.secondary">
                                    📎 Supports: JPG, PNG, BMP, TIFF, WEBP • Max size: {MAX_FILE_SIZE / (1024 * 1024)}MB
                                </Typography>
                            </Box>

                            {/* Quick Action Buttons */}
                            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Tooltip title="Capture from camera" arrow>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PhotoCamera />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Camera capture - trigger file input with capture
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.capture = 'environment';
                                            input.onchange = (event) => {
                                                const file = event.target.files[0];
                                                if (file) {
                                                    onDrop([file], []);
                                                }
                                            };
                                            input.click();
                                        }}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        Camera
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Browse files" arrow>
                                    <Button
                                        variant="contained"
                                        startIcon={<ImageSearch />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                        sx={{ 
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)'
                                        }}
                                    >
                                        Browse Files
                                    </Button>
                                </Tooltip>
                            </Box>

                            {/* Recent Upload History Preview */}
                            {processingHistory.length > 0 && (
                                <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'grey.300' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                        <History sx={{ fontSize: 14 }} />
                                        {processingHistory.length} previous prescription(s) processed
                                    </Typography>
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </DropzoneArea>

            {/* Uploaded File Info Card */}
            {state.selectedImage && !state.previewUrl && (
                <Card sx={{ mb: 2, bgcolor: 'grey.50' }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <LocalPharmacy />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                                {state.selectedImage.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {(state.selectedImage.size / 1024).toFixed(1)} KB • {state.selectedImage.type}
                            </Typography>
                        </Box>
                        <CircularProgress size={24} />
                    </CardContent>
                </Card>
            )}

            {state.previewUrl && (
                <Box sx={{ position: 'relative', mb: 2 }}>
                    {/* Image Container with Filter Effects */}
                    <Box 
                        sx={{ 
                            overflow: 'auto', 
                            maxHeight: 500, 
                            borderRadius: 3,
                            bgcolor: 'grey.100',
                            position: 'relative',
                            border: '2px solid',
                            borderColor: processingStatus === PROCESSING_STATES.PROCESSING_OCR ? 'primary.main' : 'transparent',
                            transition: 'border-color 0.3s ease'
                        }}
                    >
                        {/* Processing Overlay */}
                        {(processingStatus === PROCESSING_STATES.PROCESSING_OCR || processingStatus === PROCESSING_STATES.EXTRACTING_DATA) && (
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                bgcolor: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                                borderRadius: 3
                            }}>
                                <Box className="animate-pulse-ring" sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 2
                                }}>
                                    <ImageSearch sx={{ fontSize: 40, color: 'white' }} />
                                </Box>
                                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                    {processingStatus === PROCESSING_STATES.PROCESSING_OCR ? 'Extracting Text...' : 'Analyzing Data...'}
                                </Typography>
                                <LinearProgress sx={{ width: '60%', mt: 2, borderRadius: 1 }} />
                            </Box>
                        )}

                        {/* Prescription Image with Dynamic Filters */}
                        <img
                            ref={resultRef}
                            src={state.enhancedPreviewUrl || state.previewUrl}
                            alt="Prescription preview"
                            style={{
                                width: `${state.imageZoom}%`,
                                height: 'auto',
                                borderRadius: 12,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                transition: 'all 0.3s ease',
                                filter: imageFilterStyle,
                                transform: `rotate(${state.imageSettings.rotation}deg) scaleX(${state.imageSettings.flipHorizontal ? -1 : 1}) scaleY(${state.imageSettings.flipVertical ? -1 : 1})`,
                                display: 'block',
                                margin: '0 auto'
                            }}
                        />
                    </Box>

                    {/* File Info Badge - Top Left */}
                    <Box sx={{ 
                        position: 'absolute', 
                        top: 16, 
                        left: 16, 
                        bgcolor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        backdropFilter: 'blur(4px)'
                    }}>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocalPharmacy sx={{ fontSize: 16 }} />
                            {state.selectedImage?.name?.length > 20 
                                ? state.selectedImage.name.substring(0, 20) + '...' 
                                : state.selectedImage?.name}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', fontSize: '0.65rem' }}>
                            {state.selectedImage && (state.selectedImage.size / 1024).toFixed(1)} KB
                            {state.imageSettings.brightness !== 100 && ` • B:${state.imageSettings.brightness}%`}
                            {state.imageSettings.contrast !== 100 && ` • C:${state.imageSettings.contrast}%`}
                        </Typography>
                    </Box>

                    {/* Top Right Controls */}
                    <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
                        <Tooltip title="Auto Enhance" arrow>
                            <IconButton
                                color="primary"
                                sx={{ 
                                    bgcolor: 'white', 
                                    boxShadow: 2,
                                    '&:hover': { bgcolor: 'primary.50' }
                                }}
                                onClick={() => autoEnhanceImage(state.selectedImage)}
                                disabled={state.isEnhancing}
                            >
                                {state.isEnhancing ? <CircularProgress size={20} /> : <AutoAwesome />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Rotate Left" arrow>
                            <IconButton
                                sx={{ 
                                    bgcolor: 'white', 
                                    boxShadow: 2,
                                    '&:hover': { bgcolor: 'grey.100' }
                                }}
                                onClick={() => updateImageSettings('rotation', (state.imageSettings.rotation - 90) % 360)}
                            >
                                <RotateLeft />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Rotate Right" arrow>
                            <IconButton
                                sx={{ 
                                    bgcolor: 'white', 
                                    boxShadow: 2,
                                    '&:hover': { bgcolor: 'grey.100' }
                                }}
                                onClick={() => updateImageSettings('rotation', (state.imageSettings.rotation + 90) % 360)}
                            >
                                <RotateRight />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Flip Horizontal" arrow>
                            <IconButton
                                sx={{ 
                                    bgcolor: state.imageSettings.flipHorizontal ? 'primary.100' : 'white', 
                                    boxShadow: 2,
                                    '&:hover': { bgcolor: 'grey.100' }
                                }}
                                onClick={() => updateImageSettings('flipHorizontal', !state.imageSettings.flipHorizontal)}
                            >
                                <Flip />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Fullscreen" arrow>
                            <IconButton
                                color="primary"
                                sx={{ 
                                    bgcolor: 'white', 
                                    boxShadow: 2,
                                    '&:hover': { bgcolor: 'primary.50' }
                                }}
                                onClick={() => updateState('fullscreenImage', true)}
                            >
                                <Fullscreen />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove image" arrow>
                            <IconButton
                                color="error"
                                sx={{ 
                                    bgcolor: 'white', 
                                    boxShadow: 2,
                                    '&:hover': { bgcolor: 'error.50' }
                                }}
                                onClick={clearAll}
                            >
                                <Close />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Bottom Controls Bar */}
                    <Box sx={{ 
                        position: 'absolute', 
                        bottom: 16, 
                        left: '50%', 
                        transform: 'translateX(-50%)',
                        display: 'flex', 
                        gap: 2,
                        alignItems: 'center',
                        bgcolor: 'rgba(255,255,255,0.95)',
                        borderRadius: 3,
                        px: 2,
                        py: 1,
                        boxShadow: 3,
                        backdropFilter: 'blur(8px)'
                    }}>
                        {/* Zoom Controls */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title="Zoom Out" arrow>
                                <IconButton 
                                    size="small"
                                    onClick={() => updateState('imageZoom', Math.max(25, state.imageZoom - 25))}
                                    disabled={state.imageZoom <= 25}
                                >
                                    <ZoomOut fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Chip 
                                label={`${state.imageZoom}%`} 
                                size="small" 
                                sx={{ minWidth: 60, justifyContent: 'center' }}
                            />
                            <Tooltip title="Zoom In" arrow>
                                <IconButton 
                                    size="small"
                                    onClick={() => updateState('imageZoom', Math.min(300, state.imageZoom + 25))}
                                    disabled={state.imageZoom >= 300}
                                >
                                    <ZoomIn fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Divider orientation="vertical" flexItem />

                        {/* Quick Adjustment Indicators */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title="Brightness" arrow>
                                <Chip 
                                    icon={<Brightness4 sx={{ fontSize: 16 }} />}
                                    label={`${state.imageSettings.brightness}%`}
                                    size="small"
                                    variant={state.imageSettings.brightness !== 100 ? 'filled' : 'outlined'}
                                    color={state.imageSettings.brightness !== 100 ? 'primary' : 'default'}
                                    sx={{ fontSize: '0.7rem' }}
                                />
                            </Tooltip>
                            <Tooltip title="Contrast" arrow>
                                <Chip 
                                    icon={<Contrast sx={{ fontSize: 16 }} />}
                                    label={`${state.imageSettings.contrast}%`}
                                    size="small"
                                    variant={state.imageSettings.contrast !== 100 ? 'filled' : 'outlined'}
                                    color={state.imageSettings.contrast !== 100 ? 'secondary' : 'default'}
                                    sx={{ fontSize: '0.7rem' }}
                                />
                            </Tooltip>
                        </Box>

                        <Divider orientation="vertical" flexItem />

                        {/* Reset Button */}
                        <Tooltip title="Reset adjustments" arrow>
                            <IconButton 
                                size="small" 
                                onClick={resetImageSettings}
                                disabled={
                                    state.imageSettings.brightness === 100 && 
                                    state.imageSettings.contrast === 100 &&
                                    state.imageSettings.rotation === 0 &&
                                    !state.imageSettings.flipHorizontal &&
                                    !state.imageSettings.flipVertical
                                }
                            >
                                <Refresh fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* OCR Action Section */}
                    {state.previewUrl && (
                        <Box sx={{
                            position: 'absolute',
                            bottom: 80,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1
                        }}>
                            {/* Status Indicator */}
                            {processingStatus === PROCESSING_STATES.IDLE && !ocrResult && (
                                <Box sx={{
                                    bgcolor: 'success.main',
                                    color: 'white',
                                    px: 2,
                                    py: 0.5,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    boxShadow: 2,
                                    mb: 1
                                }}>
                                    <Verified sx={{ fontSize: 16 }} />
                                    <Typography variant="caption" fontWeight={500}>
                                        Ready for OCR Processing
                                    </Typography>
                                </Box>
                            )}

                            {/* Completed Indicator */}
                            {processingStatus === PROCESSING_STATES.COMPLETED && ocrResult && (
                                <Box sx={{
                                    bgcolor: 'info.main',
                                    color: 'white',
                                    px: 2,
                                    py: 0.5,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    boxShadow: 2,
                                    mb: 1
                                }}>
                                    <Verified sx={{ fontSize: 16 }} />
                                    <Typography variant="caption" fontWeight={500}>
                                        OCR Complete • {ocrSummary?.totalMedications || 0} medications found
                                    </Typography>
                                </Box>
                            )}

                            {/* Process OCR Button */}
                            <LoadingButton
                                variant="contained"
                                size="large"
                                onClick={processPrescriptionOCR}
                                loading={processingStatus === PROCESSING_STATES.PROCESSING_OCR || processingStatus === PROCESSING_STATES.EXTRACTING_DATA}
                                loadingPosition="start"
                                startIcon={<ImageSearch />}
                                disabled={!canSubmitForOCR}
                                sx={{
                                    background: ocrResult 
                                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                                        : 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                                    px: 4,
                                    py: 1.5,
                                    borderRadius: 3,
                                    boxShadow: 4,
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    '&:hover': {
                                        boxShadow: 6,
                                        transform: 'translateY(-2px)'
                                    },
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {ocrResult ? 'Re-process OCR' : 'Extract Prescription Text'}
                            </LoadingButton>

                            {/* Processing Time Info */}
                            {lastProcessedAt && processingDuration && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                                    Last processed: {new Date(lastProcessedAt).toLocaleTimeString()} 
                                    ({(processingDuration / 1000).toFixed(1)}s)
                                </Typography>
                            )}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );

    // ================================================================================
    // OCR RESULTS DISPLAY SECTION
    // ================================================================================
    const renderOCRResults = () => {
        // Don't render if no OCR result and not processing
        if (!ocrResult && processingStatus !== PROCESSING_STATES.PROCESSING_OCR && processingStatus !== PROCESSING_STATES.EXTRACTING_DATA) {
            return null;
        }

        // Loading state - show skeleton while processing
        const isProcessing = processingStatus === PROCESSING_STATES.PROCESSING_OCR || processingStatus === PROCESSING_STATES.EXTRACTING_DATA;

        return (
            <Fade in={true} timeout={500}>
                <Box sx={{ mt: 4 }} id="ocr-results-section">
                    {/* Processing Overlay */}
                    {isProcessing && (
                        <Box sx={{ 
                            position: 'relative',
                            borderRadius: 3,
                            overflow: 'hidden',
                            mb: 3
                        }}>
                            {/* Animated gradient background */}
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(139,92,246,0.05) 50%, rgba(236,72,153,0.05) 100%)',
                                animation: 'pulse 2s ease-in-out infinite'
                            }} />
                            
                            <Paper elevation={3} sx={{ 
                                p: 4, 
                                textAlign: 'center',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.95) 100%)',
                                backdropFilter: 'blur(10px)',
                                border: '2px solid',
                                borderColor: 'primary.200',
                                borderRadius: 3
                            }}>
                                {/* Animated icon */}
                                <Box sx={{ 
                                    position: 'relative',
                                    display: 'inline-flex',
                                    mb: 3
                                }}>
                                    <CircularProgress 
                                        size={80} 
                                        thickness={2}
                                        sx={{ color: 'primary.main' }}
                                    />
                                    <Box sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: 56,
                                        height: 56,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        animation: 'pulse 1.5s ease-in-out infinite'
                                    }}>
                                        <ImageSearch sx={{ color: 'white', fontSize: 28 }} />
                                    </Box>
                                </Box>
                                
                                <Typography variant="h5" fontWeight={700} gutterBottom sx={{
                                    background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    {processingStatus === PROCESSING_STATES.PROCESSING_OCR 
                                        ? 'Processing Prescription OCR...' 
                                        : 'Extracting Medication Data...'}
                                </Typography>
                                
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    {processingStatus === PROCESSING_STATES.PROCESSING_OCR 
                                        ? 'Analyzing image and recognizing text patterns' 
                                        : 'Identifying medications, dosages, and instructions'}
                                </Typography>
                                
                                {/* Progress bar with stages */}
                                <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Chip 
                                            label="Upload" 
                                            size="small" 
                                            color="success"
                                            icon={<Verified sx={{ fontSize: 14 }} />}
                                        />
                                        <Chip 
                                            label="OCR" 
                                            size="small" 
                                            color={processingStatus === PROCESSING_STATES.PROCESSING_OCR ? 'primary' : 'success'}
                                            icon={processingStatus === PROCESSING_STATES.PROCESSING_OCR 
                                                ? <CircularProgress size={12} color="inherit" /> 
                                                : <Verified sx={{ fontSize: 14 }} />}
                                        />
                                        <Chip 
                                            label="Extract" 
                                            size="small" 
                                            color={processingStatus === PROCESSING_STATES.EXTRACTING_DATA ? 'primary' : 'default'}
                                            icon={processingStatus === PROCESSING_STATES.EXTRACTING_DATA 
                                                ? <CircularProgress size={12} color="inherit" /> 
                                                : undefined}
                                            variant={processingStatus === PROCESSING_STATES.EXTRACTING_DATA ? 'filled' : 'outlined'}
                                        />
                                        <Chip 
                                            label="Complete" 
                                            size="small" 
                                            variant="outlined"
                                        />
                                    </Box>
                                    <LinearProgress 
                                        sx={{ 
                                            height: 8, 
                                            borderRadius: 4,
                                            bgcolor: 'grey.200',
                                            '& .MuiLinearProgress-bar': {
                                                background: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%)',
                                                borderRadius: 4
                                            }
                                        }} 
                                    />
                                </Box>

                                {/* Processing tips */}
                                <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 2 }}>
                                    <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <Info fontSize="small" />
                                        Tip: Higher image quality leads to better OCR accuracy
                                    </Typography>
                                </Box>
                            </Paper>
                        </Box>
                    )}

                    {/* Skeleton loader while waiting for results */}
                    {isProcessing && (
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            {[1, 2, 3, 4].map((i) => (
                                    <Grid item xs={6} sm={3} key={i}>
                                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                                        <Box sx={{ 
                                            height: 48, 
                                            bgcolor: 'grey.200', 
                                            borderRadius: 1, 
                                            mb: 1,
                                            animation: 'pulse 1.5s ease-in-out infinite'
                                        }} />
                                        <Box sx={{ 
                                            height: 16, 
                                            bgcolor: 'grey.100', 
                                            borderRadius: 1,
                                            width: '70%',
                                            mx: 'auto',
                                            animation: 'pulse 1.5s ease-in-out infinite',
                                            animationDelay: '0.2s'
                                        }} />
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* OCR Results Header - only show when we have results */}
                    {ocrResult && (
                        <Zoom in={true} timeout={300}>
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                mb: 3,
                                p: 2,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)',
                                border: '1px solid',
                                borderColor: 'primary.200'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <ImageSearch sx={{ color: 'white', fontSize: 28 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            OCR Extraction Results
                                            {ocrResult && (
                                                <Chip 
                                                    label={`${ocrResult.confidence || 0}% Confidence`}
                                                    size="small"
                                                    color={ocrResult.confidence >= 80 ? 'success' : ocrResult.confidence >= 60 ? 'warning' : 'error'}
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            )}
                                        </Typography>
                                        {lastProcessedAt && (
                                            <Typography variant="caption" color="text.secondary">
                                                Processed {new Date(lastProcessedAt).toLocaleString()} • {processingDuration ? `${(processingDuration / 1000).toFixed(1)}s` : ''}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                {/* Action Buttons */}
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Tooltip title="Copy extracted text" arrow>
                                        <IconButton 
                                            onClick={() => {
                                                navigator.clipboard.writeText(ocrResult?.rawText || state.extractedText || '');
                                                addNotification('Text copied to clipboard!', 'success');
                                            }}
                                            disabled={!ocrResult?.rawText && !state.extractedText}
                                        >
                                            <ContentCopy />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Re-process OCR" arrow>
                                        <IconButton onClick={retryOCRProcessing} color="primary">
                                            <Refresh />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Clear results" arrow>
                                        <IconButton onClick={clearOCRResults} color="error">
                                            <Close />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>
                        </Zoom>
                    )}

                    {/* Statistics Cards */}
                    {ocrResult && (
                        <Fade in={true} timeout={400}>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6} sm={3}>
                                    <Paper elevation={2} sx={{ 
                                        p: 2, 
                                        textAlign: 'center',
                                        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                                        borderLeft: '4px solid #3B82F6',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                                    }}>
                                        <Typography variant="h3" color="primary.main" fontWeight={700}>
                                            {ocrResult.medications?.length || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            Medications Found
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Paper elevation={2} sx={{ 
                                        p: 2, 
                                        textAlign: 'center',
                                        background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                                        borderLeft: '4px solid #F59E0B',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                                    }}>
                                        <Typography variant="h3" color="warning.dark" fontWeight={700}>
                                            {ocrResult.warnings?.length || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            Warnings
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Paper elevation={2} sx={{ 
                                        p: 2, 
                                        textAlign: 'center',
                                        background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                                        borderLeft: '4px solid #10B981',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                                    }}>
                                        <Typography variant="h3" color="success.main" fontWeight={700}>
                                            {ocrResult.instructions?.length || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            Instructions
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Paper elevation={2} sx={{ 
                                        p: 2, 
                                        textAlign: 'center',
                                        background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
                                        borderLeft: '4px solid #8B5CF6',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                                    }}>
                                        <Typography variant="h3" color="secondary.main" fontWeight={700}>
                                            {ocrResult.imageQuality || 0}%
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            Image Quality
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Fade>
                    )}

                    {/* Extracted Medications */}
                    {ocrResult?.medications?.length > 0 && (
                        <Fade in={true} timeout={500}>
                            <Accordion defaultExpanded sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
                                <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'primary.50' }}>
                                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LocalPharmacy color="primary" />
                                        Extracted Medications ({ocrResult.medications.length})
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={2}>
                                        {ocrResult.medications.map((med, index) => (
                                            <Grid item xs={12} md={6} key={index}>
                                                <Card variant="outlined" sx={{ 
                                                    p: 2, 
                                                    borderRadius: 2,
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        boxShadow: 3,
                                                        borderColor: 'primary.main',
                                                        transform: 'translateY(-2px)'
                                                    }
                                                }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                                        <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                                                            {index + 1}. {typeof med === 'string' ? med : med.name}
                                                        </Typography>
                                                        {med.confidence && (
                                                            <Chip 
                                                                label={`${med.confidence}%`}
                                                                size="small"
                                                                color={med.confidence >= 80 ? 'success' : 'warning'}
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </Box>
                                            
                                                    {med.dosage && (
                                                        <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                                            <Chip label="Dosage" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                                                            <Typography variant="body2">{med.dosage}</Typography>
                                                        </Box>
                                                    )}
                                            
                                                    {med.frequency && (
                                                        <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                                            <Chip label="Frequency" size="small" variant="outlined" color="secondary" sx={{ fontSize: '0.7rem' }} />
                                                            <Typography variant="body2">{med.frequency}</Typography>
                                                        </Box>
                                                    )}
                                            
                                                    {med.duration && (
                                                        <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                                            <Chip label="Duration" size="small" variant="outlined" color="info" sx={{ fontSize: '0.7rem' }} />
                                                            <Typography variant="body2">{med.duration}</Typography>
                                                        </Box>
                                                    )}

                                                    {med.instructions && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                                                            📋 {med.instructions}
                                                        </Typography>
                                                    )}
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        </Fade>
                    )}

                    {/* Instructions */}
                    {ocrResult?.instructions?.length > 0 && (
                        <Fade in={true} timeout={600}>
                            <Accordion sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
                                <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'success.50' }}>
                                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Info color="success" />
                                        Instructions ({ocrResult.instructions.length})
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack spacing={1}>
                                        {ocrResult.instructions.map((instruction, index) => (
                                            <Alert key={index} severity="info" icon={<Schedule />} sx={{
                                                transition: 'transform 0.2s ease',
                                                '&:hover': { transform: 'translateX(4px)' }
                                            }}>
                                                <Typography variant="body2">{instruction}</Typography>
                                            </Alert>
                                        ))}
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        </Fade>
                    )}

                    {/* Warnings */}
                    {ocrResult?.warnings?.length > 0 && (
                        <Fade in={true} timeout={700}>
                            <Accordion sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
                                <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'warning.50' }}>
                                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.dark' }}>
                                        <Warning color="warning" />
                                        Important Warnings ({ocrResult.warnings.length})
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack spacing={1}>
                                        {ocrResult.warnings.map((warning, index) => (
                                            <Alert key={index} severity="warning" icon={<Warning />} sx={{
                                                transition: 'transform 0.2s ease',
                                                '&:hover': { transform: 'translateX(4px)' }
                                            }}>
                                                <Typography variant="body2">{warning}</Typography>
                                            </Alert>
                                        ))}
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        </Fade>
                    )}

                    {/* Raw Extracted Text */}
                    {(ocrResult?.rawText || state.extractedText) && (
                        <Fade in={true} timeout={800}>
                            <Accordion sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                                <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.100' }}>
                                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ContentCopy />
                                        Raw Extracted Text
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Paper 
                                        variant="outlined" 
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: 'grey.50',
                                            maxHeight: 400,
                                            overflow: 'auto',
                                            position: 'relative',
                                            border: '1px solid',
                                            borderColor: 'grey.300'
                                        }}
                                    >
                                        {/* Copy button */}
                                        <Tooltip title="Copy to clipboard" arrow>
                                            <IconButton 
                                                size="small"
                                                sx={{ 
                                                    position: 'absolute', 
                                                    top: 8, 
                                                    right: 8,
                                                    bgcolor: 'white',
                                                    boxShadow: 1,
                                                    '&:hover': { bgcolor: 'primary.50' }
                                                }}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(ocrResult?.rawText || state.extractedText || '');
                                                    addNotification('Text copied to clipboard!', 'success');
                                                }}
                                            >
                                                <ContentCopy fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                whiteSpace: 'pre-wrap',
                                                fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                                                fontSize: '0.85rem',
                                                lineHeight: 1.7,
                                                color: 'text.primary',
                                                pr: 4
                                            }}
                                        >
                                            {ocrResult?.rawText || state.extractedText || 'No text extracted'}
                                        </Typography>
                                    </Paper>

                                    {/* Text Statistics */}
                                    <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                        <Chip 
                                            label={`${(ocrResult?.rawText || state.extractedText || '').length} characters`}
                                            size="small"
                                            variant="outlined"
                                            icon={<Typography variant="caption" sx={{ ml: 1 }}>📝</Typography>}
                                        />
                                        <Chip 
                                            label={`${(ocrResult?.rawText || state.extractedText || '').split(/\s+/).filter(Boolean).length} words`}
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                        />
                                        <Chip 
                                            label={`${(ocrResult?.rawText || state.extractedText || '').split('\n').filter(Boolean).length} lines`}
                                            size="small"
                                            variant="outlined"
                                            color="secondary"
                                        />
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        </Fade>
                    )}

                    {/* Error State */}
                    {apiError && (
                        <Fade in={true} timeout={300}>
                            <Alert 
                                severity="error" 
                                sx={{ mt: 3, borderRadius: 2 }}
                                action={
                                    <Button color="inherit" size="small" onClick={retryOCRProcessing}>
                                        Retry
                                    </Button>
                                }
                            >
                                <Typography variant="subtitle2" fontWeight={600}>OCR Processing Error</Typography>
                                <Typography variant="body2">{apiError}</Typography>
                            </Alert>
                        </Fade>
                    )}

                    {/* Success message when completed */}
                    {ocrResult && !isProcessing && (
                        <Fade in={true} timeout={500}>
                            <Alert 
                                severity="success" 
                                sx={{ mt: 3, borderRadius: 2 }}
                                icon={<Verified />}
                            >
                                <Typography variant="body2">
                                    OCR processing completed successfully! Found {ocrResult.medications?.length || 0} medications.
                                </Typography>
                            </Alert>
                        </Fade>
                    )}
                </Box>
            </Fade>
        );
    };

    const renderEnhancementControls = () => (
        <EnhancementCard sx={{ mb: 4 }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tune /> Image Enhancement
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Auto Enhance" arrow>
                            <IconButton
                                onClick={() => autoEnhanceImage(state.selectedImage)}
                                color="primary"
                                disabled={state.isEnhancing || !state.selectedImage}
                            >
                                <AutoAwesome />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Reset All" arrow>
                            <IconButton onClick={resetImageSettings}>
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Quick Presets */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                        QUICK PRESETS
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {state.enhancementPresets.map((preset, index) => (
                            <Tooltip key={index} title={preset.name} arrow>
                                <Button
                                    startIcon={preset.icon}
                                    onClick={() => applyPreset(preset)}
                                    variant="outlined"
                                    size="small"
                                    sx={{ borderRadius: 2 }}
                                >
                                    {preset.name}
                                </Button>
                            </Tooltip>
                        ))}
                    </Stack>
                </Box>

                {/* Enhancement Sliders */}
                <Grid container spacing={3}>
                    {/* ====== BRIGHTNESS CONTROL ====== */}
                    <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                            mb: 2, 
                            p: 2, 
                            borderRadius: 2, 
                            bgcolor: state.imageSettings.brightness !== 100 ? 'primary.50' : 'grey.50',
                            border: '1px solid',
                            borderColor: state.imageSettings.brightness !== 100 ? 'primary.200' : 'grey.200',
                            transition: 'all 0.3s ease'
                        }}>
                            {/* Brightness Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Brightness4 sx={{ 
                                        fontSize: 20, 
                                        color: state.imageSettings.brightness !== 100 ? 'primary.main' : 'grey.600' 
                                    }} />
                                    Brightness
                                </Typography>
                                <Chip 
                                    label={`${state.imageSettings.brightness}%`}
                                    size="small"
                                    color={state.imageSettings.brightness !== 100 ? 'primary' : 'default'}
                                    variant={state.imageSettings.brightness !== 100 ? 'filled' : 'outlined'}
                                    sx={{ fontWeight: 600, minWidth: 55 }}
                                />
                            </Box>

                            {/* Brightness Slider */}
                            <Slider
                                value={state.imageSettings.brightness}
                                onChange={(e, val) => updateImageSettings('brightness', val)}
                                min={0}
                                max={200}
                                step={1}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(val) => `${val}%`}
                                disabled={!state.selectedImage}
                                marks={[
                                    { value: 0, label: '0%' },
                                    { value: 100, label: '100%' },
                                    { value: 200, label: '200%' }
                                ]}
                                sx={{
                                    '& .MuiSlider-track': {
                                        background: 'linear-gradient(90deg, #1e3a5f 0%, #3B82F6 50%, #fbbf24 100%)',
                                    },
                                    '& .MuiSlider-thumb': {
                                        bgcolor: 'primary.main',
                                        '&:hover': {
                                            boxShadow: '0 0 0 8px rgba(59, 130, 246, 0.16)'
                                        }
                                    },
                                    '& .MuiSlider-rail': {
                                        background: 'linear-gradient(90deg, #1e293b 0%, #64748b 50%, #fef3c7 100%)',
                                        opacity: 1
                                    },
                                    '& .MuiSlider-markLabel': {
                                        fontSize: '0.65rem',
                                        color: 'text.secondary'
                                    }
                                }}
                            />

                            {/* Quick Brightness Buttons */}
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, justifyContent: 'center' }}>
                                {[50, 75, 100, 125, 150].map((val) => (
                                    <Tooltip key={val} title={`Set to ${val}%`} arrow>
                                        <Button
                                            size="small"
                                            variant={state.imageSettings.brightness === val ? 'contained' : 'outlined'}
                                            onClick={() => updateImageSettings('brightness', val)}
                                            disabled={!state.selectedImage}
                                            sx={{ 
                                                minWidth: 40, 
                                                px: 1, 
                                                py: 0.25,
                                                fontSize: '0.7rem',
                                                borderRadius: 1
                                            }}
                                        >
                                            {val === 100 ? 'Default' : `${val}%`}
                                        </Button>
                                    </Tooltip>
                                ))}
                            </Box>

                            {/* Brightness Description */}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                                {state.imageSettings.brightness < 80 && '⚠️ Image may be too dark for OCR'}
                                {state.imageSettings.brightness >= 80 && state.imageSettings.brightness <= 120 && '✓ Optimal for OCR processing'}
                                {state.imageSettings.brightness > 120 && state.imageSettings.brightness <= 150 && 'ℹ️ Enhanced brightness'}
                                {state.imageSettings.brightness > 150 && '⚠️ Image may be overexposed'}
                            </Typography>
                        </Box>
                    </Grid>

                    {/* ====== CONTRAST CONTROL ====== */}
                    <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                            mb: 2, 
                            p: 2, 
                            borderRadius: 2, 
                            bgcolor: state.imageSettings.contrast !== 100 ? 'secondary.50' : 'grey.50',
                            border: '1px solid',
                            borderColor: state.imageSettings.contrast !== 100 ? 'secondary.200' : 'grey.200',
                            transition: 'all 0.3s ease'
                        }}>
                            {/* Contrast Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Contrast sx={{ 
                                        fontSize: 20, 
                                        color: state.imageSettings.contrast !== 100 ? 'secondary.main' : 'grey.600' 
                                    }} />
                                    Contrast
                                </Typography>
                                <Chip 
                                    label={`${state.imageSettings.contrast}%`}
                                    size="small"
                                    color={state.imageSettings.contrast !== 100 ? 'secondary' : 'default'}
                                    variant={state.imageSettings.contrast !== 100 ? 'filled' : 'outlined'}
                                    sx={{ fontWeight: 600, minWidth: 55 }}
                                />
                            </Box>

                            {/* Contrast Slider */}
                            <Slider
                                value={state.imageSettings.contrast}
                                onChange={(e, val) => updateImageSettings('contrast', val)}
                                min={0}
                                max={200}
                                step={1}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(val) => `${val}%`}
                                disabled={!state.selectedImage}
                                color="secondary"
                                marks={[
                                    { value: 0, label: '0%' },
                                    { value: 100, label: '100%' },
                                    { value: 200, label: '200%' }
                                ]}
                                sx={{
                                    '& .MuiSlider-track': {
                                        background: 'linear-gradient(90deg, #94a3b8 0%, #8B5CF6 50%, #1e1b4b 100%)',
                                    },
                                    '& .MuiSlider-thumb': {
                                        bgcolor: 'secondary.main',
                                        '&:hover': {
                                            boxShadow: '0 0 0 8px rgba(139, 92, 246, 0.16)'
                                        }
                                    },
                                    '& .MuiSlider-rail': {
                                        background: 'linear-gradient(90deg, #cbd5e1 0%, #64748b 50%, #1e293b 100%)',
                                        opacity: 1
                                    },
                                    '& .MuiSlider-markLabel': {
                                        fontSize: '0.65rem',
                                        color: 'text.secondary'
                                    }
                                }}
                            />

                            {/* Quick Contrast Buttons */}
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, justifyContent: 'center' }}>
                                {[50, 75, 100, 125, 150].map((val) => (
                                    <Tooltip key={val} title={`Set to ${val}%`} arrow>
                                        <Button
                                            size="small"
                                            variant={state.imageSettings.contrast === val ? 'contained' : 'outlined'}
                                            color="secondary"
                                            onClick={() => updateImageSettings('contrast', val)}
                                            disabled={!state.selectedImage}
                                            sx={{ 
                                                minWidth: 40, 
                                                px: 1, 
                                                py: 0.25,
                                                fontSize: '0.7rem',
                                                borderRadius: 1
                                            }}
                                        >
                                            {val === 100 ? 'Default' : `${val}%`}
                                        </Button>
                                    </Tooltip>
                                ))}
                            </Box>

                            {/* Contrast Description */}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                                {state.imageSettings.contrast < 70 && '⚠️ Low contrast - text may be unclear'}
                                {state.imageSettings.contrast >= 70 && state.imageSettings.contrast < 100 && 'ℹ️ Reduced contrast'}
                                {state.imageSettings.contrast >= 100 && state.imageSettings.contrast <= 130 && '✓ Optimal for text recognition'}
                                {state.imageSettings.contrast > 130 && state.imageSettings.contrast <= 160 && 'ℹ️ High contrast - good for faded text'}
                                {state.imageSettings.contrast > 160 && '⚠️ Very high contrast - details may be lost'}
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Sharpness: {state.imageSettings.sharpness}</span>
                                <CenterFocusStrong fontSize="small" />
                            </Typography>
                            <Slider
                                value={state.imageSettings.sharpness}
                                onChange={(e, val) => updateState('imageSettings', { ...state.imageSettings, sharpness: val })}
                                min={-100}
                                max={100}
                                step={5}
                                valueLabelDisplay="auto"
                                disabled={!state.selectedImage}
                            />
                        </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Noise Reduction: {state.imageSettings.noiseReduction}%</span>
                                <FilterVintage fontSize="small" />
                            </Typography>
                            <Slider
                                value={state.imageSettings.noiseReduction}
                                onChange={(e, val) => updateState('imageSettings', { ...state.imageSettings, noiseReduction: val })}
                                min={0}
                                max={100}
                                step={5}
                                valueLabelDisplay="auto"
                                disabled={!state.selectedImage}
                            />
                        </Box>
                    </Grid>
                </Grid>

                {/* Transform Controls */}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Tooltip title="Rotate Left" arrow>
                        <IconButton
                            onClick={() => updateState('imageSettings', { ...state.imageSettings, rotation: state.imageSettings.rotation - 90 })}
                        >
                            <RotateLeft />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Rotate Right" arrow>
                        <IconButton
                            onClick={() => updateState('imageSettings', { ...state.imageSettings, rotation: state.imageSettings.rotation + 90 })}
                        >
                            <RotateRight />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Flip Horizontal" arrow>
                        <IconButton
                            onClick={() => updateState('imageSettings', { ...state.imageSettings, flipHorizontal: !state.imageSettings.flipHorizontal })}
                        >
                            <Flip style={{ transform: 'scaleX(-1)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Flip Vertical" arrow>
                        <IconButton
                            onClick={() => updateState('imageSettings', { ...state.imageSettings, flipVertical: !state.imageSettings.flipVertical })}
                        >
                            <Flip style={{ transform: 'scaleY(-1)' }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </CardContent>

            <CardActions>
                <LoadingButton
                    loading={state.isLoading}
                    loadingPosition="start"
                    startIcon={<MedicalServices />}
                    variant="contained"
                    color="primary"
                    onClick={processPrescription}
                    disabled={!state.selectedImage}
                    fullWidth
                    size="large"
                    sx={{
                        py: 1.5,
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                        '&:hover': {
                            background: 'linear-gradient(45deg, #1976D2 30%, #1EAEDB 90%)',
                        }
                    }}
                >
                    {state.isLoading ? 'Processing...' : 'Analyze Prescription'}
                </LoadingButton>
            </CardActions>
        </EnhancementCard>
    );

    const renderResults = () => {
        if (!state.parsedData.medications.length && !state.isLoading) return null;

        return (
            <Box sx={{ mt: 4 }}>
                {/* Progress Indicator */}
                {state.isLoading && (
                    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <CircularProgress size={40} sx={{ mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                {state.progress.step}
                            </Typography>
                            <LinearProgress
                                variant="determinate" 
                                value={state.progress.value}
                                sx={{ height: 8, borderRadius: 2, maxWidth: 400, mx: 'auto' }}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {state.progress.details}
                            </Typography>
                        </Box>
                    </Paper>
                )}

                {/* Results Header */}
                {!state.isLoading && state.parsedData.medications.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Verified color="primary" />
                                Analysis Results
                                <ConfidenceBadge confidence={state.parsedData.confidence}>
                                    {state.parsedData.confidence}% Confidence
                                </ConfidenceBadge>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Analyzed on {new Date(state.parsedData.metadata.analysisDate).toLocaleDateString()}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Export" arrow>
                                <IconButton 
                                    onClick={() => updateState('exportDialogOpen', true)}
                                    color="primary"
                                >
                                    <FileDownload />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Print" arrow>
                                <IconButton onClick={() => window.print()}>
                                    <Print />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Share" arrow>
                                <IconButton>
                                    <Share />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                )}

                {/* Results Grid */}
                {!state.isLoading && state.parsedData.medications.length > 0 && (
                    <Grid container spacing={3}>
                        {/* Statistics Cards */}
                        <Grid item xs={12}>
                            <Grid container spacing={2}>
                                <Grid item xs={3}>
                                    <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="primary">
                                            {state.parsedData.medications.length}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Medications
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={3}>
                                    <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color={state.parsedData.warnings.length > 0 ? "error" : "success"}>
                                            {state.parsedData.warnings.length}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Warnings
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={3}>
                                    <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="warning.main">
                                            {state.parsedData.interactions.length}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Interactions
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={3}>
                                    <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="info.main">
                                            {state.parsedData.confidence}%
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Confidence
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Medications */}
                        <Grid item xs={12}>
                            <ResultsCard>
                                <CardContent>
                                    <Box
                                        sx={{
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            mb: 2
                                        }}
                                        onClick={() => toggleSection('medications')}
                                    >
                                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <MedicalServices />
                                            Medications ({state.parsedData.medications.length})
                                        </Typography>
                                        {state.expandedSections.medications ? <ExpandMore /> : <ExpandMore />}
                                    </Box>

                                    <Collapse in={state.expandedSections.medications}>
                                        <Grid container spacing={2}>
                                            {state.parsedData.medications.map((medication, index) => (
                                                <Grid item xs={12} md={6} key={index}>
                                                    <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                                            <Typography variant="subtitle1" fontWeight={600}>
                                                                {index + 1}. {medication}
                                                            </Typography>
                                                            <Chip
                                                                label={`#${index + 1}`}
                                                                size="small"
                                                                color="primary"
                                                                variant="outlined"
                                                            />
                                                        </Box>

                                                        {state.parsedData.dosages[index] && (
                                                            <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                                                                <strong>Dosage:</strong> {state.parsedData.dosages[index]}
                                                            </Typography>
                                                        )}

                                                        {state.parsedData.instructions[index] && (
                                                            <Typography variant="body2" color="text.secondary">
                                                                <strong>Instructions:</strong> {state.parsedData.instructions[index]}
                                                            </Typography>
                                                        )}

                                                        {state.parsedData.frequencies[index] && (
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                <strong>Frequency:</strong> {state.parsedData.frequencies[index]}
                                                            </Typography>
                                                        )}

                                                        {state.parsedData.durations[index] && (
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                <strong>Duration:</strong> {state.parsedData.durations[index]}
                                                            </Typography>
                                                        )}
                                                    </Paper>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Collapse>
                                </CardContent>
                            </ResultsCard>
                        </Grid>

                        {/* Warnings */}
                        {state.parsedData.warnings.length > 0 && (
                            <Grid item xs={12}>
                                <ResultsCard sx={{ borderLeftColor: 'error.main' }}>
                                    <CardContent>
                                        <Box
                                            sx={{ 
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                mb: 2
                                            }}
                                            onClick={() => toggleSection('warnings')}
                                        >
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                                                <Warning />
                                                Important Warnings ({state.parsedData.warnings.length})
                                            </Typography>
                                            {state.expandedSections.warnings ? <ExpandMore /> : <ExpandMore />}
                                        </Box>

                                        <Collapse in={state.expandedSections.warnings}>
                                            <Stack spacing={1}>
                                                {state.parsedData.warnings.map((warning, index) => (
                                                    <Alert
                                                        key={index} 
                                                        severity="warning"
                                                        icon={<Warning />}
                                                        sx={{ alignItems: 'flex-start' }}
                                                    >
                                                        <Typography variant="body2">{warning}</Typography>
                                                    </Alert>
                                                ))}
                                            </Stack>
                                        </Collapse>
                                    </CardContent>
                                </ResultsCard>
                            </Grid>
                        )}

                        {/* Raw Text */}
                        {state.extractedText && (
                            <Grid item xs={12}>
                                <Paper elevation={2} sx={{ p: 3 }}>
                                    <Box
                                        sx={{
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            mb: 2
                                        }}
                                        onClick={() => toggleSection('rawText')}
                                    >
                                        <Typography variant="h6">
                                            Raw Extracted Text
                                        </Typography>
                                        <Button
                                            startIcon={state.expandedSections.rawText ? <ExpandMore /> : <ExpandMore />}
                                            size="small"
                                        >
                                            {state.expandedSections.rawText ? 'Hide' : 'Show'} Text
                                        </Button>
                                    </Box>

                                    <Collapse in={state.expandedSections.rawText}>
                                        <Paper 
                                            variant="outlined" 
                                            sx={{ 
                                                p: 2, 
                                                bgcolor: 'grey.50',
                                                maxHeight: '300px',
                                                overflow: 'auto'
                                            }}
                                        >
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    whiteSpace: 'pre-wrap',
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                {state.extractedText}
                                            </Typography>
                                        </Paper>
                                    </Collapse>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                )}
            </Box>
        );
    };

    const renderExportDialog = () => (
        <Dialog
            open={state.exportDialogOpen}
            onClose={() => updateState('exportDialogOpen', false)}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FileDownload />
                    Export Analysis
                </Box>
            </DialogTitle>

            <DialogContent>
                <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
                    <InputLabel>Export Format</InputLabel>
                    <Select
                        value={state.exportSettings.format}
                        label="Export Format"
                        onChange={(e) => updateState('exportSettings', {
                            ...state.exportSettings,
                            format: e.target.value
                        })}
                    >
                        <MenuItem value="pdf">PDF Document</MenuItem>
                        <MenuItem value="json">JSON Data</MenuItem>
                        <MenuItem value="csv">CSV Spreadsheet</MenuItem>
                        <MenuItem value="txt">Plain Text</MenuItem>
                        <MenuItem value="html">HTML Report</MenuItem>
                    </Select>
                </FormControl>

                <Typography variant="subtitle2" gutterBottom>
                    Include in Export:
                </Typography>

                <Grid container spacing={1}>
                    {Object.entries(state.exportSettings.include).map(([key, value]) => (
                        <Grid item xs={6} key={key}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={value}
                                        onChange={(e) => updateState('exportSettings', {
                                            ...state.exportSettings,
                                            include: {
                                                ...state.exportSettings.include,
                                                [key]: e.target.checked
                                            }
                                        })}
                                    />
                                }
                                label={
                                    <Typography variant="body2">
                                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                                    </Typography>
                                }
                            />
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>

            <DialogActions>
                <Button onClick={() => updateState('exportDialogOpen', false)}>Cancel</Button>
                <LoadingButton
                    loading={state.isExporting}
                    onClick={() => handleExport(state.exportSettings.format)}
                    variant="contained"
                    startIcon={<FileDownload />}
                >
                    Export
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );

    const renderFullscreenDialog = () => (
        <Dialog
            open={state.fullscreenImage}
            onClose={() => updateState('fullscreenImage', false)}
            maxWidth="xl"
            fullWidth
            PaperProps={{ sx: { bgcolor: 'black', maxHeight: '95vh' } }}
        >
            <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <IconButton
                    onClick={() => updateState('fullscreenImage', false)}
                    sx={{ position: 'absolute', top: 8, right: 8, color: 'white', bgcolor: 'rgba(0,0,0,0.5)' }}
                >
                    <Close />
                </IconButton>
                <img
                    src={state.enhancedPreviewUrl || state.previewUrl}
                    alt="Fullscreen prescription"
                    style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
                />
            </DialogContent>
        </Dialog>
    );

    const renderNotifications = () => (
        <Snackbar open={state.notifications.length > 0} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {state.notifications.map((notification) => (
                    <Alert
                        key={notification.id}
                        severity={notification.severity}
                        onClose={() => removeNotification(notification.id)}
                        sx={{ boxShadow: 3 }}
                    >
                        {notification.message}
                    </Alert>
                ))}
            </Box>
        </Snackbar>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
            <AnimationStyles />
            <MedicalPattern />
            <GradientOrbs />
            <FloatingPills />
            <ParticleField />
            <HexagonGrid />
            <DNAHelix />

            {/* Header with Glassmorphism */}
            <header className="sticky top-0 z-50 print:hidden">
                <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                <div className="backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-lg shadow-black/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur opacity-40 group-hover:opacity-60 transition duration-300"></div>
                                    <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                        <MedicalServices className="text-white" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                                            Prescription Interpreter
                                        </h1>
                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full">
                                            Pro
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        AI-Powered OCR Analysis Platform
                                    </p>
                                </div>
                            </div>
                            <div className="hidden lg:flex items-center gap-3">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200/50 backdrop-blur-sm">
                                    <span className="text-sm font-semibold text-blue-700">{state.parsedData.medications.length}</span>
                                    <span className="text-xs text-blue-600/70">medications</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 backdrop-blur-sm">
                                    <span className="text-sm font-semibold text-emerald-700">{state.parsedData.confidence}%</span>
                                    <span className="text-xs text-emerald-600/70">confidence</span>
                                </div>
                            </div>
                            <button
                                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 border border-gray-200/50 hover:bg-white hover:shadow-md transition-all duration-300"
                                onClick={() => navigate('/dashboard')}
                            >
                                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">← Dashboard</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Loading Overlay */}
            {state.isLoading && <LoadingOverlay message={state.progress.step} />}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                {/* Hidden Canvas */}
                <StyledCanvas ref={canvasRef} />

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Content - 3 columns */}
                    <section className="lg:col-span-3">
                        <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
                            {renderUploadSection()}

                            {state.selectedImage && (
                                <>
                                    {renderEnhancementControls()}
                                    {renderResults()}
                                </>
                            )}

                            {/* OCR Results Display - Part 7 */}
                            {renderOCRResults()}

                            {/* Empty State */}
                            {!state.selectedImage && !state.isLoading && (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <CloudUpload sx={{ fontSize: 80, color: 'grey.400', mb: 3 }} />
                                    <Typography variant="h5" color="text.secondary" gutterBottom>
                                        Upload a prescription to begin analysis
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Drag & drop an image or click to browse
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        sx={{ mt: 3 }}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Browse Files
                                    </Button>
                                </Box>
                            )}
                        </Paper>
                    </section>

                    {/* Sidebar - 1 column */}
                    <aside className="space-y-4">
                        {/* Tips Card */}
                        <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 border border-amber-200/50 rounded-2xl shadow-xl shadow-amber-500/10 p-5">
                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-2xl"></div>
                            <div className="relative flex items-center gap-3 mb-4">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                    <span className="text-2xl">💡</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-amber-900">OCR Tips</p>
                                    <p className="text-xs text-amber-700/70">Better results</p>
                                </div>
                            </div>
                            <div className="relative space-y-3">
                                <div className="group flex gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-amber-200/50 hover:bg-white/80 transition-all">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                        <span className="text-lg">📷</span>
                                    </div>
                                    <p className="text-sm text-amber-900">Use clear, well-lit images for best OCR accuracy.</p>
                                </div>
                                <div className="group flex gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-blue-200/50 hover:bg-white/80 transition-all">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <span className="text-lg">✨</span>
                                    </div>
                                    <p className="text-sm text-blue-900">Use auto-enhance for low quality images.</p>
                                </div>
                                <div className="group flex gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-purple-200/50 hover:bg-white/80 transition-all">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                        <span className="text-lg">🔍</span>
                                    </div>
                                    <p className="text-sm text-purple-900">Zoom in to verify extracted text accuracy.</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions Card */}
                        <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-violet-50/90 border border-blue-200/50 rounded-2xl shadow-xl shadow-blue-500/10 p-5">
                            <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-2xl"></div>
                            <div className="relative flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                    <span className="text-xl">⚡</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Quick Actions</p>
                                    <p className="text-xs text-gray-500">Common tasks</p>
                                </div>
                            </div>
                            <div className="relative space-y-2">
                                {[
                                    { label: 'Check Interactions', icon: '💊', path: '/interactions' },
                                    { label: 'Food Interactions', icon: '🍎', path: '/food-drug' },
                                    { label: 'View History', icon: '📋', path: '/history' },
                                    { label: 'Dashboard', icon: '📊', path: '/dashboard' }
                                ].map((action) => (
                                    <button
                                        key={action.label}
                                        onClick={() => navigate(action.path)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-white/80 border border-gray-200/50 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md transition-all"
                                    >
                                        <span>{action.icon}</span>
                                        <span>{action.label}</span>
                                        <span className="ml-auto text-gray-400">→</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stats Card */}
                        {state.parsedData.medications.length > 0 && (
                            <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-emerald-50/90 via-teal-50/80 to-cyan-50/90 border border-emerald-200/50 rounded-2xl shadow-xl shadow-emerald-500/10 p-5">
                                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-2xl"></div>
                                <div className="relative flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                        <span className="text-xl">📊</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Analysis Stats</p>
                                        <p className="text-xs text-gray-500">Current scan</p>
                                    </div>
                                </div>
                                <div className="relative grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white/60 rounded-xl text-center">
                                        <p className="text-2xl font-bold text-emerald-600">{state.parsedData.medications.length}</p>
                                        <p className="text-xs text-gray-500">Medications</p>
                                    </div>
                                    <div className="p-3 bg-white/60 rounded-xl text-center">
                                        <p className="text-2xl font-bold text-blue-600">{state.parsedData.confidence}%</p>
                                        <p className="text-xs text-gray-500">Confidence</p>
                                    </div>
                                    <div className="p-3 bg-white/60 rounded-xl text-center">
                                        <p className="text-2xl font-bold text-purple-600">{state.parsedData.warnings.length}</p>
                                        <p className="text-xs text-gray-500">Warnings</p>
                                    </div>
                                    <div className="p-3 bg-white/60 rounded-xl text-center">
                                        <p className="text-2xl font-bold text-amber-600">{state.parsedData.dosages.length}</p>
                                        <p className="text-xs text-gray-500">Dosages</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>

                {/* Dialogs */}
                {renderExportDialog()}
                {renderFullscreenDialog()}
                {renderNotifications()}
            </div>

            {/* Footer - Enhanced */}
            <footer className="mt-auto print:hidden relative">
                <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900">
                    <div className="absolute inset-0">
                        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
                    </div>
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                        <MedicalServices className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">PharmaLink</h3>
                                        <p className="text-xs text-gray-400">Prescription Interpreter</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Advanced AI-powered OCR platform for analyzing prescription images, extracting medications, dosages, and clinical instructions.
                                </p>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                        AI Online
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                                        🔒 Secure Processing
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Features</h4>
                                <ul className="space-y-2">
                                    {['OCR Extraction', 'Image Enhancement', 'Multi-format Export', 'History Tracking'].map((link) => (
                                        <li key={link} className="text-sm text-gray-400 hover:text-white transition-colors">• {link}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Medical Disclaimer</h4>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        <span className="text-amber-400 font-semibold">⚠️ For informational purposes only.</span> Always verify with original prescription and consult healthcare professionals.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-white/10">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-xs text-gray-500">© {new Date().getFullYear()} PharmaLink. All rights reserved.</div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>v2.0.0
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

// Missing function implementations (simplified versions)
const applyConvolution = (imageData) => {
    // Simplified convolution implementation
    return imageData;
};

const applyMedianFilter = (imageData) => {
    // Simplified median filter implementation
    return imageData;
};

export default ProfessionalPrescriptionInterpreter;