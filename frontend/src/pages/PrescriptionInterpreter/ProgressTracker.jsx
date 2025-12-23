import React from 'react';
import {
    Box,
    LinearProgress,
    Typography,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Paper
} from '@mui/material';
import {
    CloudUpload,
    EnhancePhoto,
    Analytics,
    Done
} from '@mui/icons-material';

const steps = [
    { label: 'Uploading', icon: <CloudUpload /> },
    { label: 'Enhancing', icon: <EnhancePhoto /> },
    { label: 'Analyzing', icon: <Analytics /> },
    { label: 'Complete', icon: <Done /> }
];

const ProgressTracker = ({ progress }) => {
    const activeStep = Math.floor(progress / 25);

    return (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
                Processing Prescription
            </Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, index) => (
                    <Step key={step.label}>
                        <StepLabel StepIconComponent={() => step.icon}>
                            {step.label}
                        </StepLabel>
                        <StepContent>
                            <Typography variant="body2" color="text.secondary">
                                {index === 0 && 'Uploading and validating image...'}
                                {index === 1 && 'Applying image enhancements...'}
                                {index === 2 && 'Analyzing prescription with AI...'}
                                {index === 3 && 'Processing complete!'}
                            </Typography>
                        </StepContent>
                    </Step>
                ))}
            </Stepper>
            <Box sx={{ mt: 2 }}>
                <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    {Math.round(progress)}% Complete
                </Typography>
            </Box>
        </Paper>
    );
};

export default ProgressTracker;