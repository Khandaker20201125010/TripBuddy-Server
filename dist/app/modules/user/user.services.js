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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
const client_1 = require("@prisma/client");
const paginationHelper_1 = require("../../helper/paginationHelper");
const user_constant_1 = require("./user.constant");
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
const getAllUsers = (params, options) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(options);
    const { searchTerm } = params, filterData = __rest(params, ["searchTerm"]);
    const andConditions = [];
    if (searchTerm) {
        andConditions.push({
            OR: user_constant_1.userSearchableFields.map((field) => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive",
                },
            })),
        });
    }
    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map((key) => ({
                [key]: {
                    equals: filterData[key],
                },
            })),
        });
    }
    const whereConditions = andConditions.length > 0
        ? {
            AND: andConditions,
        }
        : {};
    const result = yield prisma_1.prisma.user.findMany({
        skip,
        take: limit,
        where: whereConditions,
        orderBy: {
            [sortBy]: sortOrder,
        },
    });
    const total = yield prisma_1.prisma.user.count({
        where: whereConditions,
    });
    return {
        meta: {
            page,
            limit,
            total,
        },
        data: result,
    };
});
const createAdmin = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const file = req.file;
    if (file) {
        const uploadToCloudinary = yield fileUploader_1.fileUploader.uploadToCloudinary(file);
        req.body.admin.profilePhoto = uploadToCloudinary === null || uploadToCloudinary === void 0 ? void 0 : uploadToCloudinary.secure_url;
    }
    const hashedPassword = yield bcryptjs_1.default.hash(req.body.password, 10);
    const userData = {
        name: req.body.admin.name,
        email: req.body.admin.email,
        password: hashedPassword,
        role: client_1.Role.ADMIN,
    };
    const result = yield prisma_1.prisma.$transaction((transactionClient) => __awaiter(void 0, void 0, void 0, function* () {
        yield transactionClient.user.create({
            data: userData,
        });
        const createdAdminData = yield transactionClient.admin.create({
            data: req.body.admin,
        });
        return createdAdminData;
    }));
    return result;
});
const getUserProfile = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.prisma.user.findUnique({
        where: { id },
        include: {
            travelPlans: true,
            reviewsGiven: true,
            reviewsReceived: true,
        },
    });
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    return user;
});
const updateUserProfile = (id, req) => __awaiter(void 0, void 0, void 0, function* () {
    const payload = req.body;
    // Handle new profile image
    if (req.file) {
        const upload = yield fileUploader_1.fileUploader.uploadToCloudinary(req.file);
        payload.profileImage = upload.secure_url;
        payload.profileImageFileName = upload.public_id;
    }
    return prisma_1.prisma.user.update({
        where: { id },
        data: payload,
    });
});
exports.UserService = {
    registerUser,
    getUserProfile,
    updateUserProfile,
    getAllUsers,
    createAdmin,
};
