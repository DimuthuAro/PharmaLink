import React from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Chip,
    Divider,
    Tooltip
} from '@mui/material';
import {
    Close,
    History,
    MedicalServices,
    AccessTime
} from '@mui/icons-material';
import { format } from 'date-fns';

const HistoryPanel = ({ isOpen, onClose, history, onSelectAnalysis }) => {
    return (
        <Drawer
            anchor="left"
            open={isOpen}
            onClose={onClose}
            PaperProps={{
                sx: { width: 320 }
            }}
        >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <History />
                    Analysis History
                </Typography>
                <IconButton onClick={onClose}>
                    <Close />
                </IconButton>
            </Box>
            <Divider />
            <List sx={{ flex: 1, overflow: 'auto' }}>
                {history.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <History sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                            No history yet. Upload a prescription to get started.
                        </Typography>
                    </Box>
                ) : (
                    history.map((item) => (
                        <ListItem
                            key={item.id}
                            button
                            onClick={() => onSelectAnalysis(item.data)}
                            sx={{
                                mb: 1,
                                borderRadius: 1,
                                '&:hover': {
                                    backgroundColor: 'action.hover'
                                }
                            }}
                        >
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'primary.light' }}>
                                    <MedicalServices />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Typography variant="subtitle2" noWrap>
                                        {item.data.medications?.[0] || 'Untitled'}
                                    </Typography>
                                }
                                secondary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <AccessTime sx={{ fontSize: 14 }} />
                                        <Typography variant="caption" color="text.secondary">
                                            {format(new Date(item.timestamp), 'MMM d, h:mm a')}
                                        </Typography>
                                    </Box>
                                }
                            />
                            <Chip
                                label={`${item.confidence}%`}
                                size="small"
                                color={item.confidence > 90 ? 'success' : item.confidence > 70 ? 'warning' : 'error'}
                                variant="outlined"
                            />
                        </ListItem>
                    ))
                )}
            </List>
            <Divider />
            <Box sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                    {history.length} analyses stored locally
                </Typography>
            </Box>
        </Drawer>
    );
};

export default HistoryPanel;