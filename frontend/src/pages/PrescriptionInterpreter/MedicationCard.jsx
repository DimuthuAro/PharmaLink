import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    IconButton,
    Collapse,
    Box,
    Chip,
    Avatar,
    Tooltip,
    Button,
    Stack
} from '@mui/material';
import {
    ExpandMore,
    ExpandLess,
    Warning,
    LocalHospital,
    Schedule,
    Info
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    borderRadius: theme.shape.borderRadius * 2,
    border: `1px solid ${theme.palette.divider}`,
    transition: 'all 0.3s ease',
    '&:hover': {
        borderColor: theme.palette.primary.main,
        boxShadow: theme.shadows[4]
    }
}));

const MedicationCard = ({ medication, dosage, instructions, warnings, index }) => {
    const [expanded, setExpanded] = useState(false);

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    return (
        <StyledCard elevation={0}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                            sx={{
                                bgcolor: 'primary.main',
                                width: 40,
                                height: 40
                            }}
                        >
                            <LocalHospital />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" component="div">
                                {medication}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {dosage}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={handleExpandClick}>
                        {expanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Box>

                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 2, pl: 6 }}>
                        {instructions && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Schedule sx={{ mr: 1, fontSize: 18 }} />
                                    Instructions
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {instructions}
                                </Typography>
                            </Box>
                        )}

                        {warnings && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Warning sx={{ mr: 1, fontSize: 18, color: 'warning.main' }} />
                                    Warnings
                                </Typography>
                                <Typography variant="body2" color="error.main">
                                    {warnings}
                                </Typography>
                            </Box>
                        )}

                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Info />}
                                onClick={() => {/* Add medication info modal */}}
                            >
                                More Info
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {/* Add to calendar */}}
                            >
                                Set Reminder
                            </Button>
                        </Stack>
                    </Box>
                </Collapse>
            </CardContent>
        </StyledCard>
    );
};

export default MedicationCard;