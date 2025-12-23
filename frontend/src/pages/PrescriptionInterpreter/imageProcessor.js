// Advanced image processing utilities
import * as tf from '@tensorflow/tfjs';

export const processImageData = async (imageFile, options = {}) => {
    // Load image to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = await loadImage(imageFile);
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Apply enhancements based on options
    if (options.enhanceText) {
        imageData = enhanceTextContrast(imageData);
    }
    
    if (options.removeNoise) {
        imageData = applyNoiseReduction(imageData);
    }
    
    if (options.normalizeContrast) {
        imageData = normalizeContrast(imageData);
    }
    
    if (options.deskew) {
        imageData = autoDeskew(imageData);
    }
    
    // Apply advanced filters using TensorFlow.js
    if (options.useAI) {
        imageData = await applyAIFilters(imageData);
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
    });
};

export const enhanceTextContrast = (imageData) => {
    // CLAHE (Contrast Limited Adaptive Histogram Equalization) implementation
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Convert to grayscale for text enhancement
    const grayData = new Uint8ClampedArray(width * height);
    
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        grayData[i / 4] = gray;
    }
    
    // Apply local contrast enhancement
    const blockSize = 8;
    const enhancedData = new Uint8ClampedArray(data.length);
    
    for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {
            // Process block
            const block = getBlock(grayData, x, y, blockSize, width, height);
            const enhancedBlock = enhanceBlock(block);
            
            // Apply to all channels
            for (let by = 0; by < blockSize && y + by < height; by++) {
                for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                    const idx = ((y + by) * width + (x + bx)) * 4;
                    const blockIdx = by * blockSize + bx;
                    
                    enhancedData[idx] = enhancedData[idx + 1] = enhancedData[idx + 2] = enhancedBlock[blockIdx];
                    enhancedData[idx + 3] = data[idx + 3]; // Preserve alpha
                }
            }
        }
    }
    
    imageData.data.set(enhancedData);
    return imageData;
};

export const applyAIFilters = async (imageData) => {
    // Load TensorFlow.js model for image enhancement
    const model = await tf.loadGraphModel('path/to/enhancement-model.json');
    
    // Convert imageData to tensor
    const tensor = tf.browser.fromPixels(imageData);
    const processed = tf.tidy(() => {
        // Normalize to [0, 1]
        const normalized = tensor.toFloat().div(255);
        
        // Add batch dimension
        const batched = normalized.expandDims(0);
        
        // Process with AI model
        const enhanced = model.predict(batched);
        
        // Remove batch dimension and convert back
        return enhanced.squeeze().mul(255).cast('int32');
    });
    
    // Convert back to imageData
    const enhancedData = await tf.browser.toPixels(processed);
    imageData.data.set(enhancedData);
    
    // Cleanup
    tensor.dispose();
    processed.dispose();
    
    return imageData;
};

export const autoDeskew = (imageData) => {
    // Hough Transform for skew detection
    const { width, height, data } = imageData;
    
    // Convert to binary for edge detection
    const edges = detectEdges(data, width, height);
    
    // Calculate skew angle using Hough transform
    const skewAngle = calculateSkewAngle(edges, width, height);
    
    // Rotate image to correct skew
    if (Math.abs(skewAngle) > 0.5) {
        return rotateImage(imageData, -skewAngle);
    }
    
    return imageData;
};

export const validateImage = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp'];
    
    const validation = {
        valid: true,
        message: '',
        warnings: []
    };
    
    if (file.size > maxSize) {
        validation.valid = false;
        validation.message = `File size exceeds ${maxSize / (1024 * 1024)}MB limit`;
    }
    
    if (!allowedTypes.includes(file.type)) {
        validation.valid = false;
        validation.message = 'Unsupported file format';
    }
    
    // Check image dimensions
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            if (img.width < 100 || img.height < 100) {
                validation.warnings.push('Image resolution is very low');
            }
            if (img.width > 4000 || img.height > 4000) {
                validation.warnings.push('Image resolution is very high');
            }
            resolve(validation);
        };
        img.src = URL.createObjectURL(file);
    });
};