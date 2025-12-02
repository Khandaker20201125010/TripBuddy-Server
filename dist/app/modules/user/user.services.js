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
exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = require("../../shared/prisma");
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const fileUploader_1 = require("../../helper/fileUploader");
const registerUser = (payload, req) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password } = payload;
    // Check email exists
    const existing = yield prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Email already exists");
    }
    let profileImageUrl = null;
    let profileImageFileName = null;
    // Handle file upload
    if (req.file) {
        const uploadResult = yield fileUploader_1.fileUploader.uploadToCloudinary(req.file);
        profileImageUrl = uploadResult.secure_url;
        profileImageFileName = uploadResult.public_id;
    }
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    const user = yield prisma_1.prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            profileImage: profileImageUrl,
            profileImageFileName: profileImageFileName,
        },
    });
    return user;
});
const getUserProfile = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.prisma.user.findUnique({
        where: { id },
        include: {
            travelPlans: true,
            reviewsReceived: true,
            reviewsGiven: true,
        },
    });
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    return user;
});
const updateUserProfile = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.prisma.user.update({
        where: { id },
        data: payload,
    });
});
exports.UserService = {
    registerUser,
    getUserProfile,
    updateUserProfile,
};
