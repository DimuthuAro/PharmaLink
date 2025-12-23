import React, { useState } from 'react';
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    TextField,
    Checkbox,
    FormControlLabel,
    Box,
    Typography,
    Alert
} from '@mui/material';
import {
    FileDownload,
    PictureAsPdf,
    Description,
    InsertDriveFile,
    Code,
    TableChart,
    Image,
    CloudDownload,
    QrCode2,
    Share
} from '@mui/icons-material';
import { exportToPDF, exportToJSON, exportToCSV, generateQRCode } from '../../utils/exportFormats';
import { saveAs } from 'file-saver';

const ExportMenu = ({ data, onExport }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState('pdf');
    const [includeOptions, setIncludeOptions] = useState({
        medications: true,
        dosages: true,
        instructions: true,
        warnings: true,
        rawText: false,
        timestamp: true,
        qrCode: true
    });

    const formats = [
        { value: 'pdf', label: 'PDF Document', icon: <PictureAsPdf /> },
        { value: 'json', label: 'JSON Data', icon: <Code /> },
        { value: 'csv', label: 'CSV Spreadsheet', icon: <TableChart /> },
        { value: 'txt', label: 'Plain Text', icon: <Description /> },
        { value: 'html', label: 'HTML Report', icon: <InsertDriveFile /> },
        { value: 'image', label: 'Image Report', icon: <Image /> }
    ];

    const handleExport = async (format = exportFormat) => {
        try {
            let content, filename, type;
            
            switch (format) {
                case 'pdf':
                    const pdfBlob = await exportToPDF(data, includeOptions);
                    saveAs(pdfBlob, `prescription_${Date.now()}.pdf`);
                    break;
                case 'json':
                    const jsonData = exportToJSON(data, includeOptions);
                    saveAs(new Blob([jsonData], { type: 'application/json' }), `prescription_${Date.now()}.json`);
                    break;
                case 'csv':
                    const csvData = exportToCSV(data, includeOptions);
                    saveAs(new Blob([csvData], { type: 'text/csv' }), `prescription_${Date.now()}.csv`);
                    break;
                case 'txt':
                    const textData = exportToText(data, includeOptions);
                    saveAs(new Blob([textData], { type: 'text/plain' }), `prescription_${Date.now()}.txt`);
                    break;
                case 'html':
                    const htmlData = exportToHTML(data, includeOptions);
                    saveAs(new Blob([htmlData], { type: 'text/html' }), `prescription_${Date.now()}.html`);
                    break;
                case 'image':
                    const imageData = await exportToImage(data, includeOptions);
                    saveAs(imageData, `prescription_${Date.now()}.png`);
                    break;
            }

            setDialogOpen(false);
            setAnchorEl(null);
            
            // Show success notification
            onExport?.(format);
        } catch (err) {
            console.error('Export error:', err);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Prescription Analysis',
                    text: 'Check out this prescription analysis',
                    url: window.location.href
                });
            } catch (err) {
                console.error('Share failed:', err);
            }
        }
    };

    const generateQR = async () => {
        const qrData = await generateQRCode(JSON.stringify(data));
        saveAs(qrData, `prescription_qr_${Date.now()}.png`);
    };

    return (
        <>
            <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                color="primary"
                size="large"
                sx={{ position: 'relative' }}
            >
                <CloudDownload />
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{
                    sx: { width: 280 }
                }}
            >
                <MenuItem onClick={() => { setDialogOpen(true); setAnchorEl(null); }}>
                    <ListItemIcon>
                        <FileDownload fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Export Report" secondary="Customize export options" />
                </MenuItem>
                
                <MenuItem onClick={() => handleExport('pdf')}>
                    <ListItemIcon>
                        <PictureAsPdf fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Quick PDF" />
                </MenuItem>
                
                <MenuItem onClick={() => handleExport('json')}>
                    <ListItemIcon>
                        <Code fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="JSON Data" />
                </MenuItem>
                
                <MenuItem onClick={generateQR}>
                    <ListItemIcon>
                        <QrCode2 fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Generate QR Code" />
                </MenuItem>
                
                <MenuItem onClick={handleShare}>
                    <ListItemIcon>
                        <Share fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Share Results" />
                </MenuItem>
            </Menu>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FileDownload />
                        Export Options
                    </Box>
                </DialogTitle>
                
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
                        <InputLabel>Export Format</InputLabel>
                        <Select
                            value={exportFormat}
                            label="Export Format"
                            onChange={(e) => setExportFormat(e.target.value)}
                        >
                            {formats.map((format) => (
                                <MenuItem key={format.value} value={format.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {format.icon}
                                        {format.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Typography variant="subtitle2" gutterBottom>
                        Include in Export:
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {Object.entries(includeOptions).map(([key, value]) => (
                            <FormControlLabel
                                key={key}
                                control={
                                    <Checkbox
                                        checked={value}
                                        onChange={(e) => setIncludeOptions(prev => ({
                                            ...prev,
                                            [key]: e.target.checked
                                        }))}
                                    />
                                }
                                label={
                                    <Typography variant="body2">
                                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                                    </Typography>
                                }
                            />
                        ))}
                    </Box>

                    {exportFormat === 'pdf' && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            PDF export includes formatted layout with headers and footers.
                        </Alert>
                    )}
                </DialogContent>
                
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={() => handleExport()} 
                        variant="contained" 
                        startIcon={<FileDownload />}
                    >
                        Export
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ExportMenu;