import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import config from '../config';
import stream from 'stream';
import type { Readable } from 'stream';

// Create memory storage instead of disk storage
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});

const uploadToCloudinary = async (file: Express.Multer.File): Promise<{ secure_url: string; public_id: string }> => {
    cloudinary.config({
        cloud_name: config.cloudinary.cloud_name,
        api_key: config.cloudinary.api_key,
        api_secret: config.cloudinary.api_secret
    });

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                public_id: `profile_${Date.now()}`,
                folder: 'travel-buddy/profiles',
                overwrite: true,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else if (result) {
                    resolve({
                        secure_url: result.secure_url,
                        public_id: result.public_id
                    });
                } else {
                    reject(new Error('Upload failed'));
                }
            }
        );

        // Create a readable stream from buffer
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);
        bufferStream.pipe(uploadStream);
    });
};

export const fileUploader = {
    upload,
    uploadToCloudinary
};