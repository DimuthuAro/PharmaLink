import React, { useState } from 'react';
import { Container, Box, Alert, Snackbar } from '@mui/material';
import { usePrescriptionAnalysis } from '../../hooks/usePrescriptionAnalysis';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import ImageUploader from './ImageUploader';
import ImageEnhancer from './ImageEnhancer';
import AnalysisResults from './AnalysisResults';
import ProgressTracker from './ProgressTracker';
import HistoryPanel from '../layout/SidePanel';
import ErrorBoundary from '../common/ErrorBoundary';
import LoadingOverlay from '../common/LoadingOverlay';

const PrescriptionInterpreter = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
    
    const { 
        isLoading, 
        error, 
        parsedData, 
        extractedText, 
        progress,
        processImage,
        resetAnalysis,
        saveToHistory 
    } = usePrescriptionAnalysis();
    
    const { getItem, setItem } = useLocalStorage('prescriptionHistory');

    const handleImageSelect = (file) => {
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            resetAnalysis();
        }
    };

    const handleProcessImage = async (enhancedImage) => {
        try {
            const result = await processImage(enhancedImage || selectedImage);
            if (result) {
                saveToHistory(result);
                setNotification({
                    open: true,
                    message: 'Analysis completed successfully!',
                    severity: 'success'
                });
            }
        } catch (err) {
            setNotification({
                open: true,
                message: 'Analysis failed. Please try again.',
                severity: 'error'
            });
        }
    };

    const handleClearAll = () => {
        setSelectedImage(null);
        setPreviewUrl(null);
        resetAnalysis();
        URL.revokeObjectURL(previewUrl);
    };

    return (
        <ErrorBoundary>
            <Container maxWidth="xl" sx={{ py: 4, display: 'flex', gap: 3 }}>
                {/* Left Sidebar - History */}
                <HistoryPanel 
                    isOpen={showHistory}
                    onClose={() => setShowHistory(false)}
                    history={getItem() || []}
                    onSelectAnalysis={(analysis) => {
                        setParsedData(analysis);
                        setShowHistory(false);
                    }}
                />

                {/* Main Content */}
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                        <Box>
                            <Typography variant="h4" component="h1" gutterBottom>
                                <MedicalServicesIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
                                Prescription Interpreter Pro
                            </Typography>
                            <Typography variant="subtitle1" color="text.secondary">
                                Professional-grade prescription analysis with AI-powered OCR
                            </Typography>
                        </Box>
                        <ButtonGroup>
                            <Button 
                                startIcon={<HistoryIcon />}
                                onClick={() => setShowHistory(!showHistory)}
                                variant="outlined"
                            >
                                History
                            </Button>
                            <Button 
                                startIcon={<SettingsIcon />}
                                onClick={() => setShowSettings(true)}
                                variant="outlined"
                            >
                                Settings
                            </Button>
                        </ButtonGroup>
                    </Box>

                    {/* Main Grid */}
                    <Grid container spacing={3}>
                        {/* Upload & Preview Column */}
                        <Grid item xs={12} lg={6}>
                            <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                                <ImageUploader 
                                    onImageSelect={handleImageSelect}
                                    previewUrl={previewUrl}
                                    onClear={handleClearAll}
                                    maxSize={10 * 1024 * 1024}
                                    acceptedFormats={['image/jpeg', 'image/png', 'image/jpg', 'image/bmp', 'image/tiff']}
                                />
                                
                                {selectedImage && (
                                    <ImageEnhancer 
                                        imageFile={selectedImage}
                                        onProcess={handleProcessImage}
                                        onEnhancementChange={(enhancedImage) => {
                                            // Live preview updates
                                            setPreviewUrl(URL.createObjectURL(enhancedImage));
                                        }}
                                        disabled={isLoading}
                                    />
                                )}
                            </Paper>
                        </Grid>

                        {/* Results Column */}
                        <Grid item xs={12} lg={6}>
                            <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                                {isLoading && <ProgressTracker progress={progress} />}
                                
                                {error && (
                                    <Alert severity="error" sx={{ mb: 3 }}>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            Analysis Error
                                        </Typography>
                                        <Typography variant="body2">
                                            {error}
                                        </Typography>
                                    </Alert>
                                )}

                                {parsedData && !isLoading && (
                                    <AnalysisResults 
                                        data={parsedData}
                                        extractedText={extractedText}
                                        onExport={(format) => handleExport(format)}
                                        onSave={() => saveToHistory(parsedData)}
                                        onPrint={() => window.print()}
                                    />
                                )}

                                {!selectedImage && !isLoading && !parsedData && (
                                    <Box sx={{ textAlign: 'center', py: 8 }}>
                                        <CloudUploadIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            Upload a prescription to begin analysis
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Supports JPEG, PNG, BMP, TIFF up to 10MB
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Batch Processing Panel */}
                    {selectedImage && (
                        <BatchProcessingPanel 
                            onBatchProcess={(files) => handleBatchProcess(files)}
                            maxFiles={5}
                        />
                    )}
                </Box>

                {/* Notifications */}
                <Snackbar
                    open={notification.open}
                    autoHideDuration={6000}
                    onClose={() => setNotification({ ...notification, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert severity={notification.severity}>
                        {notification.message}
                    </Alert>
                </Snackbar>

                {/* Loading Overlay for expensive operations */}
                <LoadingOverlay 
                    open={isLoading && progress < 100}
                    message="Processing image with AI..."
                />
            </Container>
        </ErrorBoundary>
    );
};

export default PrescriptionInterpreter;