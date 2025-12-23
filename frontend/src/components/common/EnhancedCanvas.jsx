import React, { useRef, useEffect, forwardRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const CanvasContainer = styled(Paper)(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius * 2,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    border: `2px solid ${theme.palette.divider}`,
    transition: 'all 0.3s ease',
    '&:hover': {
        borderColor: theme.palette.primary.main,
        boxShadow: theme.shadows[4]
    }
}));

const CanvasOverlay = styled(Box)({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1
});

const ControlPanel = styled(Paper)(({ theme }) => ({
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: theme.spacing(1, 2),
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
    zIndex: 2
}));

const EnhancedCanvas = forwardRef(({
    width = 800,
    height = 600,
    imageSrc,
    onImageLoad,
    onImageError,
    showControls = true,
    enableZoom = true,
    enablePan = true,
    showGrid = false,
    mode = 'view', // 'view', 'edit', 'annotate'
    annotations = [],
    onAnnotationAdd,
    onAnnotationRemove,
    className,
    ...props
}, ref) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const isDrawingRef = useRef(false);
    const scaleRef = useRef(1);
    const offsetRef = useRef({ x: 0, y: 0 });
    const startPosRef = useRef({ x: 0, y: 0 });

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (imageSrc) {
            loadImage(imageSrc);
        }

        // Setup event listeners
        if (enableZoom) {
            canvas.addEventListener('wheel', handleWheel);
        }

        if (enablePan) {
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('mouseup', handleMouseUp);
            canvas.addEventListener('mouseleave', handleMouseUp);
        }

        // Setup touch events for mobile
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseUp);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, [imageSrc, enableZoom, enablePan]);

    const loadImage = (src) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Calculate dimensions to fit canvas
            const scale = Math.min(
                canvas.width / img.width,
                canvas.height / img.height
            );
            
            scaleRef.current = scale;
            offsetRef.current = {
                x: (canvas.width - img.width * scale) / 2,
                y: (canvas.height - img.height * scale) / 2
            };

            drawImage(img);
            onImageLoad?.(img);
        };

        img.onerror = (error) => {
            console.error('Failed to load image:', error);
            onImageError?.(error);
            
            // Draw error message
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#999';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Failed to load image', canvas.width / 2, canvas.height / 2);
        };

        img.crossOrigin = 'anonymous';
        img.src = src;
    };

    const drawImage = (img) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Apply transformations
        ctx.save();
        ctx.translate(offsetRef.current.x, offsetRef.current.y);
        ctx.scale(scaleRef.current, scaleRef.current);
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Draw grid if enabled
        if (showGrid) {
            drawGrid(ctx, img.width, img.height);
        }
        
        // Draw annotations
        drawAnnotations(ctx);
        
        ctx.restore();
    };

    const drawGrid = (ctx, width, height) => {
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    };

    const drawAnnotations = (ctx) => {
        annotations.forEach((annotation, index) => {
            const { type, points, label, color = '#ff0000' } = annotation;
            
            ctx.strokeStyle = color;
            ctx.fillStyle = color + '20';
            ctx.lineWidth = 2;
            
            switch (type) {
                case 'rectangle':
                    const [x1, y1, x2, y2] = points;
                    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
                    break;
                    
                case 'polygon':
                    ctx.beginPath();
                    ctx.moveTo(points[0], points[1]);
                    for (let i = 2; i < points.length; i += 2) {
                        ctx.lineTo(points[i], points[i + 1]);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    ctx.fill();
                    break;
                    
                case 'text':
                    ctx.fillStyle = color;
                    ctx.font = '14px Arial';
                    ctx.fillText(label, points[0], points[1]);
                    break;
            }
            
            // Draw label
            if (label && type !== 'text') {
                ctx.fillStyle = color;
                ctx.font = '12px Arial';
                ctx.fillText(label, points[0], points[1] - 5);
            }
        });
    };

    // Event handlers
    const handleWheel = (e) => {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;
        
        // Calculate new scale
        const newScale = scaleRef.current * delta;
        scaleRef.current = Math.max(0.1, Math.min(5, newScale));
        
        // Adjust offset to zoom towards mouse position
        offsetRef.current.x = mouseX - (mouseX - offsetRef.current.x) * delta;
        offsetRef.current.y = mouseY - (mouseY - offsetRef.current.y) * delta;
        
        redraw();
    };

    const handleMouseDown = (e) => {
        isDrawingRef.current = true;
        startPosRef.current = { x: e.offsetX, y: e.offsetY };
        
        if (mode === 'annotate') {
            // Start new annotation
            const point = screenToCanvas(e.offsetX, e.offsetY);
            const annotation = {
                type: 'rectangle',
                points: [point.x, point.y, point.x, point.y],
                label: 'Annotation',
                color: '#ff0000'
            };
            onAnnotationAdd?.(annotation);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDrawingRef.current) return;
        
        if (mode === 'pan') {
            // Pan the image
            const dx = e.offsetX - startPosRef.current.x;
            const dy = e.offsetY - startPosRef.current.y;
            
            offsetRef.current.x += dx;
            offsetRef.current.y += dy;
            
            startPosRef.current = { x: e.offsetX, y: e.offsetY };
            redraw();
        } else if (mode === 'annotate' && annotations.length > 0) {
            // Update last annotation
            const lastAnnotation = annotations[annotations.length - 1];
            const point = screenToCanvas(e.offsetX, e.offsetY);
            
            if (lastAnnotation.type === 'rectangle') {
                lastAnnotation.points[2] = point.x;
                lastAnnotation.points[3] = point.y;
            }
            
            redraw();
        }
    };

    const handleMouseUp = () => {
        isDrawingRef.current = false;
    };

    const handleTouchStart = (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            handleMouseDown({ offsetX: e.touches[0].clientX, offsetY: e.touches[0].clientY });
        }
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            handleMouseMove({ offsetX: e.touches[0].clientX, offsetY: e.touches[0].clientY });
        }
    };

    const handleTouchEnd = () => {
        handleMouseUp();
    };

    const screenToCanvas = (screenX, screenY) => {
        return {
            x: (screenX - offsetRef.current.x) / scaleRef.current,
            y: (screenY - offsetRef.current.y) / scaleRef.current
        };
    };

    const canvasToScreen = (canvasX, canvasY) => {
        return {
            x: canvasX * scaleRef.current + offsetRef.current.x,
            y: canvasY * scaleRef.current + offsetRef.current.y
        };
    };

    const redraw = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => drawImage(img);
        img.src = imageSrc;
    };

    const resetView = () => {
        scaleRef.current = 1;
        offsetRef.current = { x: 0, y: 0 };
        redraw();
    };

    const zoomIn = () => {
        scaleRef.current = Math.min(5, scaleRef.current * 1.2);
        redraw();
    };

    const zoomOut = () => {
        scaleRef.current = Math.max(0.1, scaleRef.current * 0.8);
        redraw();
    };

    const fitToScreen = () => {
        const canvas = canvasRef.current;
        const img = new Image();
        
        img.onload = () => {
            const scale = Math.min(
                canvas.width / img.width,
                canvas.height / img.height
            );
            
            scaleRef.current = scale;
            offsetRef.current = {
                x: (canvas.width - img.width * scale) / 2,
                y: (canvas.height - img.height * scale) / 2
            };
            
            redraw();
        };
        
        img.src = imageSrc;
    };

    const getImageData = () => {
        const canvas = canvasRef.current;
        return canvas.toDataURL('image/jpeg', 0.95);
    };

    const applyFilter = (filter) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Apply filter
        switch (filter) {
            case 'grayscale':
                applyGrayscale(imageData);
                break;
            case 'invert':
                applyInvert(imageData);
                break;
            case 'sepia':
                applySepia(imageData);
                break;
            case 'enhance':
                applyEnhance(imageData);
                break;
        }
        
        ctx.putImageData(imageData, 0, 0);
    };

    const applyGrayscale = (imageData) => {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
        }
    };

    const applyInvert = (imageData) => {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
        }
    };

    const applySepia = (imageData) => {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
    };

    const applyEnhance = (imageData) => {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            // Increase contrast
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.2 + 128));
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.2 + 128));
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.2 + 128));
        }
    };

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
        resetView,
        zoomIn,
        zoomOut,
        fitToScreen,
        getImageData,
        applyFilter,
        canvas: canvasRef.current
    }));

    return (
        <CanvasContainer 
            ref={containerRef} 
            className={className}
            sx={{ width, height }}
            {...props}
        >
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{ 
                    display: 'block',
                    cursor: mode === 'pan' ? 'grab' : mode === 'annotate' ? 'crosshair' : 'default'
                }}
            />
            
            <CanvasOverlay>
                {showGrid && (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `
                            linear-gradient(rgba(0, 150, 255, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0, 150, 255, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                    }} />
                )}
                
                {annotations.length > 0 && (
                    <Box sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: 1,
                        borderRadius: 1,
                        fontSize: '12px'
                    }}>
                        {annotations.length} annotation(s)
                    </Box>
                )}
            </CanvasOverlay>
            
            {showControls && (
                <ControlPanel>
                    <IconButton 
                        size="small" 
                        onClick={zoomOut}
                        sx={{ color: 'white' }}
                        title="Zoom Out"
                    >
                        <ZoomOutIcon />
                    </IconButton>
                    
                    <Typography variant="caption" sx={{ color: 'white', minWidth: 60, textAlign: 'center' }}>
                        {Math.round(scaleRef.current * 100)}%
                    </Typography>
                    
                    <IconButton 
                        size="small" 
                        onClick={zoomIn}
                        sx={{ color: 'white' }}
                        title="Zoom In"
                    >
                        <ZoomInIcon />
                    </IconButton>
                    
                    <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)', mx: 1 }} />
                    
                    <IconButton 
                        size="small" 
                        onClick={fitToScreen}
                        sx={{ color: 'white' }}
                        title="Fit to Screen"
                    >
                        <FullscreenIcon />
                    </IconButton>
                    
                    <IconButton 
                        size="small" 
                        onClick={resetView}
                        sx={{ color: 'white' }}
                        title="Reset View"
                    >
                        <RestartAltIcon />
                    </IconButton>
                </ControlPanel>
            )}
        </CanvasContainer>
    );
});

EnhancedCanvas.displayName = 'EnhancedCanvas';

export default EnhancedCanvas;