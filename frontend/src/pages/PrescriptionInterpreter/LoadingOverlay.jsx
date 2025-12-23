import React from 'react';
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    flexDirection: 'column'
}));

const LoadingOverlay = ({ open, message }) => {
    return (
        <StyledBackdrop open={open}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            {message && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" align="center">
                        {message}
                    </Typography>
                </Box>
            )}
        </StyledBackdrop>
    );
};

export default LoadingOverlay;