import React, { useState } from 'react';
import {
    Paper,
    Typography,
    Box,
    Grid,
    Chip,
    IconButton,
    Button,
    Tabs,
    Tab,
    Divider,
    Badge,
    Avatar,
    Alert,
    Collapse
} from '@mui/material';
import {
    ExpandMore,
    ExpandLess,
    Share,
    Print,
    Download,
    Edit,
    AddAlert,
    Timeline,
    History,
    Compare,
    Verified,
    Warning,
    Error
} from '@mui/icons-material';
import MedicationCard from './MedicationCard';
import ExportMenu from './ExportMenu';
import WarningsPanel from './WarningsPanel';
import { styled } from '@mui/material/styles';

const ResultsContainer = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius * 2,
    background: theme.palette.background.paper,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #2196F3, #4CAF50)'
    }
}));

const StatCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2),
    textAlign: 'center',
    borderRadius: theme.shape.borderRadius,
    background: theme.palette.grey[50],
    border: `1px solid ${theme.palette.divider}`,
    transition: 'all 0.2s ease',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[2]
    }
}));

const AnalysisResults = ({ data, extractedText, onExport, onSave, onPrint }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [expandedSections, setExpandedSections] = useState({
        medications: true,
        warnings: true,
        rawText: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Calculate statistics
    const stats = {
        totalMedications: data.medications?.length || 0,
        highRisk: data.warnings?.filter(w => w.severity === 'high').length || 0,
        interactions: data.interactions?.length || 0,
        confidence: data.confidenceScore || 95
    };

    const tabs = [
        { label: 'Medications', icon: <MedicalServicesIcon /> },
        { label: 'Schedule', icon: <TimelineIcon /> },
        { label: 'Interactions', icon: <CompareArrowsIcon /> },
        { label: 'History', icon: <HistoryIcon /> }
    ];

    return (
        <ResultsContainer elevation={0}>
            {/* Header with Stats */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Verified color="primary" />
                        Analysis Results
                        {stats.confidence > 90 && (
                            <Chip 
                                label={`${stats.confidence}% Confidence`} 
                                color="success" 
                                size="small"
                                variant="outlined"
                            />
                        )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Analyzed on {new Date().toLocaleDateString()} • AI-Powered Detection
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <ExportMenu onExport={onExport} />
                    <Tooltip title="Share Results" arrow>
                        <IconButton>
                            <Share />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Print" arrow>
                        <IconButton onClick={onPrint}>
                            <Print />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Save to History" arrow>
                        <IconButton onClick={onSave} color="primary">
                            <History />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={3}>
                    <StatCard>
                        <Typography variant="h4" color="primary">
                            {stats.totalMedications}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Medications
                        </Typography>
                    </StatCard>
                </Grid>
                <Grid item xs={3}>
                    <StatCard>
                        <Typography variant="h4" color={stats.highRisk > 0 ? "error" : "success"}>
                            {stats.highRisk}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            High Risk
                        </Typography>
                    </StatCard>
                </Grid>
                <Grid item xs={3}>
                    <StatCard>
                        <Typography variant="h4" color="warning.main">
                            {stats.interactions}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Interactions
                        </Typography>
                    </StatCard>
                </Grid>
                <Grid item xs={3}>
                    <StatCard>
                        <Typography variant="h4" color="info.main">
                            {stats.confidence}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Confidence
                        </Typography>
                    </StatCard>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Tabs 
                value={activeTab} 
                onChange={(e, val) => setActiveTab(val)}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
            >
                {tabs.map((tab, index) => (
                    <Tab 
                        key={index} 
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {tab.icon}
                                {tab.label}
                            </Box>
                        } 
                    />
                ))}
            </Tabs>

            {/* Medications Section */}
            <Box sx={{ mb: 3 }}>
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
                        <MedicalServicesIcon />
                        Medications ({data.medications?.length || 0})
                    </Typography>
                    {expandedSections.medications ? <ExpandLess /> : <ExpandMore />}
                </Box>
                
                <Collapse in={expandedSections.medications}>
                    <Grid container spacing={2}>
                        {data.medications?.map((med, index) => (
                            <Grid item xs={12} key={index}>
                                <MedicationCard
                                    medication={med}
                                    dosage={data.dosages?.[index]}
                                    instructions={data.instructions?.[index]}
                                    warnings={data.warnings?.[index]}
                                    index={index}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </Collapse>
            </Box>

            {/* Warnings Panel */}
            {data.warnings && data.warnings.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <WarningsPanel warnings={data.warnings} />
                </Box>
            )}

            {/* Schedule Timeline */}
            {data.schedule && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Timeline />
                        Medication Schedule
                    </Typography>
                    {/* Timeline component here */}
                </Box>
            )}

            {/* Interactions */}
            {data.interactions && data.interactions.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CompareArrowsIcon />
                        Drug Interactions
                    </Typography>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {data.interactions.length} potential interaction(s) detected
                    </Alert>
                </Box>
            )}

            {/* Raw Text Toggle */}
            {extractedText && (
                <Box sx={{ mt: 3 }}>
                    <Button
                        fullWidth
                        startIcon={expandedSections.rawText ? <ExpandLess /> : <ExpandMore />}
                        onClick={() => toggleSection('rawText')}
                        variant="outlined"
                    >
                        {expandedSections.rawText ? 'Hide' : 'Show'} Raw Extracted Text
                    </Button>
                    
                    <Collapse in={expandedSections.rawText}>
                        <Paper 
                            variant="outlined" 
                            sx={{ 
                                p: 2, 
                                mt: 2,
                                maxHeight: '300px',
                                overflow: 'auto',
                                backgroundColor: 'grey.50'
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
                                {extractedText}
                            </Typography>
                        </Paper>
                    </Collapse>
                </Box>
            )}

            {/* Footer Actions */}
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                    This analysis is for informational purposes only. Consult a healthcare professional.
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddAlert />}
                    onClick={() => {/* Set reminders */}}
                >
                    Set Medication Reminders
                </Button>
            </Box>
        </ResultsContainer>
    );
};

export default AnalysisResults;