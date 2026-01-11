"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUploader = void 0;
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const config_1 = __importDefault(require("../config"));
const stream_1 = __importDefault(require("stream"));
// Create memory storage instead of disk storage
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});
const uploadToCloudinary = (file) => __awaiter(void 0, void 0, void 0, function* () {
    cloudinary_1.v2.config({
        cloud_name: config_1.default.cloudinary.cloud_name,
        api_key: config_1.default.cloudinary.api_key,
        api_secret: config_1.default.cloudinary.api_secret
    });
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            public_id: `profile_${Date.now()}`,
            folder: 'travel-buddy/profiles',
            overwrite: true,
        }, (error, result) => {
            if (error) {
                reject(error);
            }
            else if (result) {
                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id
                });
            }
            else {
                reject(new Error('Upload failed'));
            }
        });
        // Create a readable stream from buffer
        const bufferStream = new stream_1.default.PassThrough();
        bufferStream.end(file.buffer);
        bufferStream.pipe(uploadStream);
    });
});
const deleteFromCloudinary = (publicId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        cloudinary_1.v2.config({
            cloud_name: config_1.default.cloudinary.cloud_name,
            api_key: config_1.default.cloudinary.api_key,
            api_secret: config_1.default.cloudinary.api_secret
        });
        const result = yield cloudinary_1.v2.uploader.destroy(publicId);
        return result.result === 'ok';
    }
    catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
});
exports.fileUploader = {
    upload,
    uploadToCloudinary,
    deleteFromCloudinary
};
