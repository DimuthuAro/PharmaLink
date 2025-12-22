import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { 
    Box, 
    Button, 
    Container, 
    Paper, 
    Typography, 
    CircularProgress, 
    Alert, 
    Chip, 
    Grid,
    Slider,
    Stack,
    LinearProgress,
    Menu,
    MenuItem,
    IconButton
} from '@mui/material';
import { DEEPSEEK_API_KEY, DEEPSEEK_API_URL } from '../config/api.config';
import { LoadingButton } from '@mui/lab';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import WarningIcon from '@mui/icons-material/Warning';
import TuneIcon from '@mui/icons-material/Tune';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { styled } from '@mui/material/styles';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const StyledCanvas = styled('canvas')({
    display: 'none'
});

const PrescriptionInterpreter = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [parsedData, setParsedData] = useState({
        medications: [],
        dosages: [],
        instructions: [],
        warnings: []
    });
    const [ocrProgress, setOcrProgress] = useState({ status: '', progress: 0 });
    const [imageSettings, setImageSettings] = useState({
        brightness: 100,
        contrast: 100,
        grayscale: false
    });
    const [anchorEl, setAnchorEl] = useState(null);
    const canvasRef = React.useRef(null);

    // Menu handlers
    const handleExportClick = (event) => setAnchorEl(event.currentTarget);
    const handleExportClose = () => setAnchorEl(null);
    
    const handleExport = (format) => {
        handleExportClose();
        switch (format) {
            case 'json':
                exportToJson();
                break;
            case 'text':
                exportToText();
                break;
            case 'csv':
                exportToCsv();
                break;
        }
    };

    const exportToJson = () => {
        const dataStr = JSON.stringify(parsedData, null, 2);
        downloadFile(dataStr, 'prescription_data.json', 'application/json');
    };

    const exportToText = () => {
        const text = [
            'PRESCRIPTION DATA',
            '\nMEDICATIONS:',
            ...parsedData.medications.map(med => `- ${med}`),
            '\nDOSAGES:',
            ...parsedData.dosages.map(dose => `- ${dose}`),
            '\nINSTRUCTIONS:',
            ...parsedData.instructions.map(inst => `- ${inst}`),
            '\nWARNINGS:',
            ...parsedData.warnings.map(warn => `- ${warn}`)
        ].join('\n');
        downloadFile(text, 'prescription_data.txt', 'text/plain');
    };

    const exportToCsv = () => {
        const maxLength = Math.max(
            parsedData.medications.length,
            parsedData.dosages.length,
            parsedData.instructions.length,
            parsedData.warnings.length
        );
        const rows = [['Medication', 'Dosage', 'Instruction', 'Warning']];
        
        for (let i = 0; i < maxLength; i++) {
            rows.push([
                parsedData.medications[i] || '',
                parsedData.dosages[i] || '',
                parsedData.instructions[i] || '',
                parsedData.warnings[i] || ''
            ]);
        }
        
        const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        downloadFile(csv, 'prescription_data.csv', 'text/csv');
    };

    const downloadFile = (content, fileName, contentType) => {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                setError('File size exceeds 5MB limit');
                return;
            }
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setExtractedText('');
            setError(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png']
        },
        maxFiles: 1
    });

    const applyImageEnhancements = async (imageFile) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Draw original image
                ctx.drawImage(img, 0, 0);
                
                // Apply image enhancements
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                const brightness = (imageSettings.brightness - 100) * 2.55;
                const contrast = (imageSettings.contrast - 100) * 2.55;
                
                for (let i = 0; i < data.length; i += 4) {
                    // Apply brightness
                    data[i] = Math.min(255, Math.max(0, data[i] + brightness));
                    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
                    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
                    
                    // Apply contrast
                    if (contrast !== 0) {
                        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128));
                        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128));
                        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128));
                    }
                    
                    // Apply grayscale if enabled
                    if (imageSettings.grayscale) {
                        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        data[i] = data[i + 1] = data[i + 2] = avg;
                    }
                }
                
                ctx.putImageData(imageData, 0, 0);
                
                // Convert canvas to blob
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.95);
            };
            
            img.src = URL.createObjectURL(imageFile);
        });
    };

    const processImage = async () => {
        if (!selectedImage) return;

        // Log the selected image details
        console.log('Processing image:', {
            name: selectedImage.name,
            size: selectedImage.size,
            type: selectedImage.type
        });

        setIsLoading(true);
        setError(null);
        setOcrProgress({ status: 'Starting image analysis...', progress: 0 });
        
        try {
            // Apply image enhancements
            const enhancedImage = await applyImageEnhancements(selectedImage);
            
            // Convert the enhanced image to base64
            const reader = new FileReader();
            const base64Promise = new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(enhancedImage);
            });

            setOcrProgress({ status: 'Preparing image...', progress: 20 });
            const base64Image = await base64Promise;

            setOcrProgress({ status: 'Analyzing prescription...', progress: 40 });
            const response = await axios.post(`${DEEPSEEK_API_URL}/vision/analyze`, {
                image: base64Image,
                analysis_type: 'prescription',
                model: 'deepseek-vision-v1',
                settings: {
                    detailed_analysis: true,
                    extract_medications: true,
                    detect_warnings: true
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            setOcrProgress({ status: 'Processing results...', progress: 80 });

            // Extract text and structured data from API response
            const { text, structured_data } = response.data;
            setExtractedText(text);

            // Parse the API response into our data structure
            const parsedResults = {
                medications: structured_data.medications || [],
                dosages: structured_data.dosages || [],
                instructions: structured_data.instructions || [],
                warnings: structured_data.warnings || []
            };
            console.log('Parsed prescription data:', parsedResults);
            setParsedData(parsedResults);

            setOcrProgress({ status: 'Completed', progress: 100 });
        } catch (error) {
            console.error('Error processing image:', error);
            const errorMessage = error.response?.data?.message || 'Error processing image. Please try again.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <StyledCanvas ref={canvasRef} />
            <Typography variant="h4" component="h1" gutterBottom align="center">
                Prescription Interpreter
            </Typography>

            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    {error && (
                        <Alert severity="error" sx={{ width: '100%' }}>
                            {error}
                        </Alert>
                    )}

                    <Paper
                        {...getRootProps()}
                        sx={{
                            p: 3,
                            border: '2px dashed #ccc',
                            borderRadius: 2,
                            cursor: 'pointer',
                            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                            width: '100%',
                            textAlign: 'center'
                        }}
                    >
                        <input {...getInputProps()} />
                        <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            {isDragActive
                                ? 'Drop the prescription image here'
                                : 'Drag and drop a prescription image, or click to select'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Supports: JPG, JPEG, PNG (max 5MB)
                        </Typography>
                    </Paper>

                    {previewUrl && (
                        <Box sx={{ mt: 2, maxWidth: '100%' }}>
                            <img
                                src={previewUrl}
                                alt="Prescription preview"
                                style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
                            />
                        </Box>
                    )}

                    {selectedImage && (
                        <>
                            <Paper elevation={2} sx={{ p: 2, width: '100%' }}>
                                <Typography variant="h6" gutterBottom>
                                    Image Enhancement
                                </Typography>
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography gutterBottom>Brightness</Typography>
                                        <Slider
                                            value={imageSettings.brightness}
                                            min={0}
                                            max={200}
                                            onChange={(_, value) => setImageSettings(prev => ({
                                                ...prev,
                                                brightness: value
                                            }))}
                                            valueLabelDisplay="auto"
                                        />
                                    </Box>
                                    <Box>
                                        <Typography gutterBottom>Contrast</Typography>
                                        <Slider
                                            value={imageSettings.contrast}
                                            min={0}
                                            max={200}
                                            onChange={(_, value) => setImageSettings(prev => ({
                                                ...prev,
                                                contrast: value
                                            }))}
                                            valueLabelDisplay="auto"
                                        />
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        onClick={() => setImageSettings(prev => ({
                                            ...prev,
                                            grayscale: !prev.grayscale
                                        }))}
                                    >
                                        {imageSettings.grayscale ? 'Disable' : 'Enable'} Grayscale
                                    </Button>
                                </Stack>
                            </Paper>

                            <Box sx={{ width: '100%', mt: 2 }}>
                                <LoadingButton
                                    loading={isLoading}
                                    loadingPosition="start"
                                    startIcon={<MedicalServicesIcon />}
                                    variant="contained"
                                    color="primary"
                                    onClick={processImage}
                                    fullWidth
                                >
                                    Analyze Prescription
                                </LoadingButton>
                                
                                {isLoading && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            {ocrProgress.status}
                                        </Typography>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={ocrProgress.progress} 
                                            sx={{ height: 8, borderRadius: 2 }}
                                        />
                                    </Box>
                                )}
                            </Box>
                        </>
                    )}

                    {/* Results Section */}
                    {(isLoading || extractedText || parsedData.medications.length > 0) && (
                        <Grid container spacing={3} sx={{ mt: 2 }}>
                            {/* Loading State */}
                            {isLoading && (
                                <Grid item xs={12}>
                                    <Paper elevation={2} sx={{ p: 3 }}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <CircularProgress size={40} sx={{ mb: 2 }} />
                                            <Typography variant="h6" gutterBottom>
                                                {ocrProgress.status}
                                            </Typography>
                                            <LinearProgress 
                                                variant="determinate" 
                                                value={ocrProgress.progress} 
                                                sx={{ height: 8, borderRadius: 2, maxWidth: 400, mx: 'auto' }}
                                            />
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                {Math.round(ocrProgress.progress)}% Complete
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Grid>
                            )}

                            {/* Results Header with Export Options */}
                            {!isLoading && (parsedData.medications.length > 0 || extractedText) && (
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h5" component="h2">
                                            Analysis Results
                                        </Typography>
                                        <IconButton
                                            onClick={handleExportClick}
                                            color="primary"
                                            title="Export data"
                                        >
                                            <FileDownloadIcon />
                                        </IconButton>
                                        <Menu
                                            anchorEl={anchorEl}
                                            open={Boolean(anchorEl)}
                                            onClose={handleExportClose}
                                        >
                                            <MenuItem onClick={() => handleExport('json')}>Export as JSON</MenuItem>
                                            <MenuItem onClick={() => handleExport('text')}>Export as Text</MenuItem>
                                            <MenuItem onClick={() => handleExport('csv')}>Export as CSV</MenuItem>
                                        </Menu>
                                    </Box>
                                </Grid>
                            )}
                            <Grid item xs={12} md={6}>
                                <Paper elevation={2} sx={{ p: 2 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Medications
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {parsedData.medications.map((med, index) => (
                                            <Chip
                                                key={index}
                                                label={med}
                                                color="primary"
                                                variant="filled"
                                                sx={{ m: 0.5 }}
                                            />
                                        ))}
                                    </Box>
                                </Paper>
                            </Grid>

                            {/* Dosages Section */}
                            <Grid item xs={12} md={6}>
                                <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                                    <Typography variant="h6" gutterBottom>
                                        Dosages
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {parsedData.dosages.map((dosage, index) => (
                                            <Chip
                                                key={index}
                                                label={dosage}
                                                color="secondary"
                                                variant="filled"
                                                sx={{ m: 0.5 }}
                                            />
                                        ))}
                                    </Box>
                                </Paper>
                            </Grid>

                            {/* Instructions Section */}
                            <Grid item xs={12}>
                                <Paper elevation={2} sx={{ p: 3 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Instructions
                                    </Typography>
                                    <Box sx={{ pl: 2 }}>
                                        {parsedData.instructions.map((instruction, index) => (
                                            <Typography 
                                                key={index} 
                                                variant="body1" 
                                                paragraph 
                                                sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center',
                                                    '&:before': {
                                                        content: '"•"',
                                                        marginRight: 1
                                                    }
                                                }}
                                            >
                                                {instruction}
                                            </Typography>
                                        ))}
                                    </Box>
                                </Paper>
                            </Grid>

                            {/* Warnings Section */}
                            <Grid item xs={12}>
                                <Paper 
                                    elevation={3} 
                                    sx={{ 
                                        p: 3, 
                                        bgcolor: 'warning.light',
                                        border: '1px solid',
                                        borderColor: 'warning.main' 
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <WarningIcon sx={{ mr: 1, color: 'warning.dark' }} />
                                        <Typography variant="h6" color="warning.dark">
                                            Important Warnings
                                        </Typography>
                                    </Box>
                                    <Box sx={{ pl: 2 }}>
                                        {parsedData.warnings.map((warning, index) => (
                                            <Typography 
                                                key={index} 
                                                variant="body1" 
                                                color="warning.dark" 
                                                paragraph
                                                sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center',
                                                    '&:before': {
                                                        content: '"•"',
                                                        marginRight: 1
                                                    }
                                                }}
                                            >
                                                {warning}
                                            </Typography>
                                        ))}
                                    </Box>
                                </Paper>
                            </Grid>

                            {/* Raw Text Section */}
                            {extractedText && (
                                <Grid item xs={12}>
                                    <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Raw Extracted Text
                                        </Typography>
                                        <Paper 
                                            variant="outlined" 
                                            sx={{ 
                                                p: 2, 
                                                bgcolor: 'grey.50',
                                                maxHeight: '200px',
                                                overflow: 'auto'
                                            }}
                                        >
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    whiteSpace: 'pre-wrap',
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                {extractedText}
                                            </Typography>
                                        </Paper>
                                    </Paper>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </Box>
            </Paper>
        </Container>
    );
};

export default PrescriptionInterpreter;