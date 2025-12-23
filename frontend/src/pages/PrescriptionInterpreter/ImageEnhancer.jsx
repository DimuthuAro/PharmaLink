import React, { useState, useCallback, useEffect } from 'react';
import {
    Paper,
    Typography,
    Box,
    Slider,
    Switch,
    Button,
    ButtonGroup,
    ToggleButton,
    ToggleButtonGroup,
    IconButton,
    Tooltip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid
} from '@mui/material';
import {
    Tune,
    AutoAwesome,
    RotateLeft,
    RotateRight,
    Flip,
    CenterFocusStrong,
    ZoomIn,
    ZoomOut,
    Grain,
    Brightness4,
    Contrast,
    FilterVintage,
    ExpandMore
} from '@mui/icons-material';
import { useImageProcessing } from '../../hooks/useImageProcessing';
import { styled } from '@mui/material/styles';

const EnhancementCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius * 2,
    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
    border: `1px solid ${theme.palette.divider}`,
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[6]
    }
}));

const PreviewCanvas = styled('canvas')({
    width: '100%',
    height: '200px',
    borderRadius: '8px',
    border: '2px solid',
    borderColor: 'divider',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
});

const ImageEnhancer = ({ imageFile, onProcess, onEnhancementChange, disabled }) => {
    const [settings, setSettings] = useState({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        sharpness: 0,
        noiseReduction: 0,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        autoEnhance: true,
        mode: 'medical' // medical, document, standard
    });

    const { applyEnhancements, applyFilter, rotateImage, generatePreview } = useImageProcessing();
    const [preview, setPreview] = useState(null);
    const [presets] = useState([
        { name: 'Medical Document', icon: <MedicalServicesIcon />, settings: { contrast: 120, sharpness: 20 } },
        { name: 'Low Light', icon: <Brightness4 />, settings: { brightness: 150, contrast: 110 } },
        { name: 'High Contrast', icon: <Contrast />, settings: { contrast: 150, saturation: 80 } },
        { name: 'Grayscale', icon: <Grain />, settings: { saturation: 0 } }
    ]);

    // Generate live preview
    useEffect(() => {
        if (imageFile) {
            generateLivePreview();
        }
    }, [settings, imageFile]);

    const generateLivePreview = async () => {
        const previewUrl = await generatePreview(imageFile, settings);
        setPreview(previewUrl);
        onEnhancementChange?.(previewUrl);
    };

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const applyPreset = (preset) => {
        setSettings(prev => ({ ...prev, ...preset.settings }));
    };

    const handleAutoEnhance = async () => {
        // AI-powered auto enhancement
        const enhanced = await applyEnhancements(imageFile, 'auto');
        setPreview(URL.createObjectURL(enhanced));
    };

    const handleRotate = (degrees) => {
        const newRotation = (settings.rotation + degrees) % 360;
        handleSettingChange('rotation', newRotation);
    };

    const handleProcess = async () => {
        const enhancedImage = await applyEnhancements(imageFile, settings);
        onProcess(enhancedImage);
    };

    return (
        <EnhancementCard elevation={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tune /> Image Enhancement
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Auto Enhance" arrow>
                        <IconButton 
                            onClick={handleAutoEnhance}
                            color="primary"
                            disabled={disabled}
                        >
                            <AutoAwesome />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Reset All" arrow>
                        <IconButton 
                            onClick={() => setSettings({
                                brightness: 100,
                                contrast: 100,
                                saturation: 100,
                                sharpness: 0,
                                rotation: 0
                            })}
                        >
                            <RotateLeft />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Live Preview */}
            {preview && (
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                        Live Preview
                    </Typography>
                    <PreviewCanvas ref={(canvas) => {
                        if (canvas && preview) {
                            const ctx = canvas.getContext('2d');
                            const img = new Image();
                            img.onload = () => {
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            };
                            img.src = preview;
                        }
                    }} />
                </Box>
            )}

            {/* Quick Presets */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    QUICK PRESETS
                </Typography>
                <ButtonGroup fullWidth>
                    {presets.map((preset, index) => (
                        <Tooltip key={index} title={preset.name} arrow>
                            <Button
                                startIcon={preset.icon}
                                onClick={() => applyPreset(preset)}
                                variant="outlined"
                                size="small"
                            >
                                {preset.name.split(' ')[0]}
                            </Button>
                        </Tooltip>
                    ))}
                </ButtonGroup>
            </Box>

            {/* Enhancement Controls */}
            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">Advanced Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Brightness: {settings.brightness}%</span>
                                    <Brightness4 fontSize="small" />
                                </Typography>
                                <Slider
                                    value={settings.brightness}
                                    onChange={(e, val) => handleSettingChange('brightness', val)}
                                    min={0}
                                    max={200}
                                    step={1}
                                    valueLabelDisplay="auto"
                                    disabled={disabled}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Contrast: {settings.contrast}%</span>
                                    <Contrast fontSize="small" />
                                </Typography>
                                <Slider
                                    value={settings.contrast}
                                    onChange={(e, val) => handleSettingChange('contrast', val)}
                                    min={0}
                                    max={200}
                                    step={1}
                                    valueLabelDisplay="auto"
                                    disabled={disabled}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Sharpness: {settings.sharpness}</span>
                                    <CenterFocusStrong fontSize="small" />
                                </Typography>
                                <Slider
                                    value={settings.sharpness}
                                    onChange={(e, val) => handleSettingChange('sharpness', val)}
                                    min={-100}
                                    max={100}
                                    step={5}
                                    valueLabelDisplay="auto"
                                    disabled={disabled}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Noise Reduction: {settings.noiseReduction}%</span>
                                    <FilterVintage fontSize="small" />
                                </Typography>
                                <Slider
                                    value={settings.noiseReduction}
                                    onChange={(e, val) => handleSettingChange('noiseReduction', val)}
                                    min={0}
                                    max={100}
                                    step={5}
                                    valueLabelDisplay="auto"
                                    disabled={disabled}
                                />
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Transform Controls */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Tooltip title="Rotate Left" arrow>
                            <IconButton onClick={() => handleRotate(-90)}>
                                <RotateLeft />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Rotate Right" arrow>
                            <IconButton onClick={() => handleRotate(90)}>
                                <RotateRight />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Flip Horizontal" arrow>
                            <IconButton onClick={() => handleSettingChange('flipHorizontal', !settings.flipHorizontal)}>
                                <Flip style={{ transform: 'scaleX(-1)' }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Flip Vertical" arrow>
                            <IconButton onClick={() => handleSettingChange('flipVertical', !settings.flipVertical)}>
                                <Flip style={{ transform: 'scaleY(-1)' }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </AccordionDetails>
            </Accordion>

            {/* Mode Selection */}
            <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    PROCESSING MODE
                </Typography>
                <ToggleButtonGroup
                    value={settings.mode}
                    exclusive
                    onChange={(e, mode) => handleSettingChange('mode', mode)}
                    fullWidth
                    size="small"
                >
                    <ToggleButton value="medical">
                        <MedicalServicesIcon sx={{ mr: 1 }} /> Medical
                    </ToggleButton>
                    <ToggleButton value="document">
                        <DescriptionIcon sx={{ mr: 1 }} /> Document
                    </ToggleButton>
                    <ToggleButton value="standard">
                        <ImageIcon sx={{ mr: 1 }} /> Standard
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Action Button */}
            <Button
                variant="contained"
                color="primary"
                onClick={handleProcess}
                disabled={disabled}
                fullWidth
                size="large"
                startIcon={<MedicalServicesIcon />}
                sx={{ 
                    mt: 2,
                    py: 1.5,
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                    '&:hover': {
                        background: 'linear-gradient(45deg, #1976D2 30%, #1EAEDB 90%)',
                    }
                }}
            >
                {disabled ? 'Processing...' : 'Analyze Prescription'}
            </Button>

            {/* Auto-enhance toggle */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">
                    Auto-enhance on upload
                </Typography>
                <Switch
                    checked={settings.autoEnhance}
                    onChange={(e) => handleSettingChange('autoEnhance', e.target.checked)}
                    color="primary"
                />
            </Box>
        </EnhancementCard>
    );
};

export default ImageEnhancer;