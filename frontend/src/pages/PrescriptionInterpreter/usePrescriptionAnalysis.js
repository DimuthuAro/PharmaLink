import { useState, useCallback } from 'react';
import axios from 'axios';
import { useDebounce } from './useDebounce';
import { useLocalStorage } from './useLocalStorage';
import apiService from '../services/api.service';
import { validateImage, processImageData } from '../utils/imageProcessor';
import { parsePrescriptionData } from '../utils/prescriptionParser';

export const usePrescriptionAnalysis = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [progress, setProgress] = useState({ step: '', value: 0 });
    const [confidence, setConfidence] = useState(0);
    
    const { setItem, getItem } = useLocalStorage('prescriptionHistory');
    const debouncedUpdate = useDebounce((data) => setParsedData(data), 300);

    const updateProgress = useCallback((step, value) => {
        setProgress({ step, value });
    }, []);

    const processImage = async (imageFile) => {
        try {
            setIsLoading(true);
            setError(null);
            updateProgress('Validating image', 10);

            // Validate image
            const validation = validateImage(imageFile);
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            // Pre-process image
            updateProgress('Enhancing image', 20);
            const processedImage = await processImageData(imageFile, {
                enhanceText: true,
                removeNoise: true,
                normalizeContrast: true
            });

            // Convert to base64
            updateProgress('Preparing for analysis', 30);
            const base64Image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(processedImage);
            });

            // Call AI API
            updateProgress('Analyzing with AI', 50);
            const analysisResult = await apiService.analyzePrescription(base64Image, {
                detailed: true,
                extractStructured: true,
                detectInteractions: true,
                language: 'en'
            });

            // Process and validate results
            updateProgress('Processing results', 80);
            const parsedResult = parsePrescriptionData(analysisResult);
            
            // Calculate confidence score
            const confidenceScore = calculateConfidence(parsedResult);
            setConfidence(confidenceScore);

            // Update state
            setExtractedText(analysisResult.text || '');
            setParsedData({
                ...parsedResult,
                confidenceScore,
                timestamp: new Date().toISOString(),
                source: 'AI Analysis'
            });

            updateProgress('Completed', 100);

            // Save to history
            const history = getItem() || [];
            const newEntry = {
                id: Date.now(),
                data: parsedResult,
                timestamp: new Date().toISOString(),
                confidence: confidenceScore
            };
            setItem([newEntry, ...history.slice(0, 9)]); // Keep last 10

            return parsedResult;
        } catch (err) {
            console.error('Analysis error:', err);
            setError(err.response?.data?.message || err.message || 'Analysis failed');
            throw err;
        } finally {
            setTimeout(() => {
                setIsLoading(false);
                updateProgress('', 0);
            }, 500);
        }
    };

    const calculateConfidence = (data) => {
        let score = 80; // Base score
        
        if (data.medications?.length > 0) score += 10;
        if (data.dosages?.length > 0) score += 5;
        if (data.instructions?.length > 0) score += 5;
        
        // Deduct for missing critical info
        if (!data.medications || data.medications.length === 0) score -= 30;
        if (!data.dosages || data.dosages.length === 0) score -= 20;
        
        return Math.max(0, Math.min(100, score));
    };

    const resetAnalysis = () => {
        setParsedData(null);
        setExtractedText('');
        setError(null);
        setConfidence(0);
    };

    const getAnalysisStats = () => {
        if (!parsedData) return null;
        
        return {
            medicationCount: parsedData.medications?.length || 0,
            warningCount: parsedData.warnings?.length || 0,
            interactionCount: parsedData.interactions?.length || 0,
            confidence: confidence
        };
    };

    return {
        isLoading,
        error,
        parsedData,
        extractedText,
        progress,
        confidence,
        processImage,
        resetAnalysis,
        getAnalysisStats,
        saveToHistory: (data) => {
            const history = getItem() || [];
            setItem([data, ...history.slice(0, 9)]);
        }
    };
};