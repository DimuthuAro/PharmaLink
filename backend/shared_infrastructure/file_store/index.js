const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../logger');

class FileStoreService {
    constructor() {
        this.uploadPath = process.env.FILE_UPLOAD_PATH || './uploads';
        this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB default
        this.init();
    }

    async init() {
        try {
            // Create upload directories if they don't exist
            const directories = [
                path.join(this.uploadPath, 'prescriptions'),
                path.join(this.uploadPath, 'drug_images'),
                path.join(this.uploadPath, 'reports'),
                path.join(this.uploadPath, 'temp')
            ];

            for (const dir of directories) {
                await fs.mkdir(dir, { recursive: true });
                logger.info(`Upload directory created: ${dir}`);
            }
        } catch (error) {
            logger.error('Error initializing file store:', error);
        }
    }

    // Storage configuration for different file types
    getStorage(subfolder = 'general') {
        return multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadDir = path.join(this.uploadPath, subfolder);
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                // Generate unique filename
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const extension = path.extname(file.originalname);
                const basename = path.basename(file.originalname, extension);
                cb(null, `${basename}-${uniqueSuffix}${extension}`);
            }
        });
    }

    // File filter for different file types
    getFileFilter(allowedTypes = []) {
        return (req, file, cb) => {
            if (allowedTypes.length === 0) {
                // Allow all files if no specific types specified
                cb(null, true);
                return;
            }

            const fileExtension = path.extname(file.originalname).toLowerCase();
            const mimeType = file.mimetype;

            const isAllowed = allowedTypes.some(type => {
                if (type.startsWith('.')) {
                    // File extension check
                    return fileExtension === type;
                } else if (type.includes('/')) {
                    // MIME type check
                    return mimeType === type || mimeType.startsWith(type);
                }
                return false;
            });

            if (isAllowed) {
                cb(null, true);
            } else {
                cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
            }
        };
    }

    // Create multer upload middleware
    createUploadMiddleware(options = {}) {
        const {
            subfolder = 'general',
            allowedTypes = [],
            maxFiles = 1,
            maxFileSize = this.maxFileSize
        } = options;

        return multer({
            storage: this.getStorage(subfolder),
            fileFilter: this.getFileFilter(allowedTypes),
            limits: {
                fileSize: maxFileSize,
                files: maxFiles
            }
        });
    }

    // Prescription image upload
    prescriptionUpload() {
        return this.createUploadMiddleware({
            subfolder: 'prescriptions',
            allowedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
            maxFiles: 5,
            maxFileSize: 5 * 1024 * 1024 // 5MB
        });
    }

    // Drug image upload
    drugImageUpload() {
        return this.createUploadMiddleware({
            subfolder: 'drug_images',
            allowedTypes: ['.jpg', '.jpeg', '.png'],
            maxFiles: 3,
            maxFileSize: 2 * 1024 * 1024 // 2MB
        });
    }

    // Report upload
    reportUpload() {
        return this.createUploadMiddleware({
            subfolder: 'reports',
            allowedTypes: ['.pdf', '.doc', '.docx', '.txt'],
            maxFiles: 1,
            maxFileSize: 10 * 1024 * 1024 // 10MB
        });
    }

    // Get file info
    async getFileInfo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            logger.error('Error getting file info:', error);
            throw error;
        }
    }

    // Delete file
    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
            logger.info(`File deleted: ${filePath}`);
            return true;
        } catch (error) {
            logger.error('Error deleting file:', error);
            throw error;
        }
    }

    // Move file
    async moveFile(sourcePath, destinationPath) {
        try {
            await fs.rename(sourcePath, destinationPath);
            logger.info(`File moved: ${sourcePath} -> ${destinationPath}`);
            return true;
        } catch (error) {
            logger.error('Error moving file:', error);
            throw error;
        }
    }

    // Copy file
    async copyFile(sourcePath, destinationPath) {
        try {
            await fs.copyFile(sourcePath, destinationPath);
            logger.info(`File copied: ${sourcePath} -> ${destinationPath}`);
            return true;
        } catch (error) {
            logger.error('Error copying file:', error);
            throw error;
        }
    }

    // List files in directory
    async listFiles(directoryPath) {
        try {
            const files = await fs.readdir(directoryPath);
            const fileInfos = await Promise.all(
                files.map(async (file) => {
                    const filePath = path.join(directoryPath, file);
                    const stats = await this.getFileInfo(filePath);
                    return {
                        name: file,
                        path: filePath,
                        ...stats
                    };
                })
            );
            return fileInfos;
        } catch (error) {
            logger.error('Error listing files:', error);
            throw error;
        }
    }

    // Clean up old files
    async cleanupOldFiles(directoryPath, maxAgeHours = 24) {
        try {
            const files = await this.listFiles(directoryPath);
            const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));

            let deletedCount = 0;
            for (const file of files) {
                if (file.created < cutoffTime) {
                    await this.deleteFile(file.path);
                    deletedCount++;
                }
            }

            logger.info(`Cleaned up ${deletedCount} old files from ${directoryPath}`);
            return deletedCount;
        } catch (error) {
            logger.error('Error cleaning up old files:', error);
            throw error;
        }
    }

    // Get upload URL for a file
    getFileUrl(filename, subfolder = 'general') {
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        return `${baseUrl}/uploads/${subfolder}/${filename}`;
    }
}

// Create singleton instance
const fileStoreService = new FileStoreService();

module.exports = fileStoreService;